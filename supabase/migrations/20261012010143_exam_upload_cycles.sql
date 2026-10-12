-- IA2.a. Capacity is serialized on the patient row. Content identity is
-- attested by the privileged Edge function, never by a client supplied hash.
create table public.exam_upload_cycles (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null,
  patient_id uuid not null, sequence integer not null, version integer not null default 1,
  opened_at timestamptz not null default clock_timestamp(), closed_at timestamptz,
  granted_by uuid, reason text, idempotency_key uuid,
  unique(tenant_id,patient_id,sequence), unique(tenant_id,id),
  unique(tenant_id,patient_id,idempotency_key),
  foreign key(tenant_id,patient_id) references public.patients(tenant_id,id)
);
create unique index exam_upload_cycles_one_open on public.exam_upload_cycles(tenant_id,patient_id) where closed_at is null;
create table public.exam_upload_capacity_requests (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, patient_id uuid not null,
  requested_by uuid not null, requested_at timestamptz not null default clock_timestamp(), resolved_at timestamptz,
  foreign key(tenant_id,patient_id) references public.patients(tenant_id,id)
);
create unique index exam_upload_capacity_one_pending on public.exam_upload_capacity_requests(tenant_id,patient_id) where resolved_at is null;
alter table public.patient_documents
  add column content_sha256 text check(content_sha256 ~ '^[0-9a-f]{64}$'),
  add column upload_cycle_id uuid,
  add column reservation_expires_at timestamptz,
  add column duplicate_of uuid,
  add column verification_only boolean not null default false,
  add foreign key(tenant_id,upload_cycle_id) references public.exam_upload_cycles(tenant_id,id),
  add foreign key(tenant_id,duplicate_of,patient_id) references public.patient_documents(tenant_id,id,patient_id);
create unique index patient_documents_content_identity on public.patient_documents(tenant_id,patient_id,content_sha256)
  where status='available' and duplicate_of is null and attached_to='documents';
alter table public.patient_documents drop constraint patient_documents_attached_to_check;
alter table public.patient_documents add constraint patient_documents_attached_to_check check(attached_to in ('documents','meal_log','profile_photo'));
create table public.exam_processing_authorizations (
  id uuid not null default gen_random_uuid() unique,
  tenant_id uuid not null, patient_id uuid not null, document_id uuid not null,
  authorized_by uuid not null, authorized_at timestamptz not null default clock_timestamp(),
  revoked_at timestamptz, internal_allowed boolean not null default false, primary key(tenant_id,document_id),
  foreign key(tenant_id,document_id,patient_id) references public.patient_documents(tenant_id,id,patient_id)
);
-- Existing work retains its original responsible doctor and source; new
-- receipts are deliberately not enrolled or processed by this migration.
insert into public.exam_processing_authorizations(tenant_id,patient_id,document_id,authorized_by)
select j.tenant_id,j.patient_id,d.id,j.created_by from public.processing_jobs j
join public.patient_documents d on d.tenant_id=j.tenant_id and d.id::text=j.idempotency_key
where j.job_type='exam_text_extraction' on conflict do nothing;

alter table public.exam_upload_cycles enable row level security;
alter table public.exam_upload_capacity_requests enable row level security;
alter table public.exam_processing_authorizations enable row level security;
revoke all on public.exam_upload_cycles,public.exam_upload_capacity_requests,public.exam_processing_authorizations from public,anon,authenticated;
create trigger exam_upload_cycles_audit after insert or update on public.exam_upload_cycles for each row execute function private.audit_change();
create trigger exam_upload_capacity_requests_audit after insert or update on public.exam_upload_capacity_requests for each row execute function private.audit_change();
create trigger exam_processing_authorizations_audit after insert or update on public.exam_processing_authorizations for each row execute function private.audit_change();

create function private.exam_quota_access(t uuid,p uuid) returns boolean language sql stable security definer set search_path='' as $$
select private.has_live_session() and (
  (private.has_tenant_role(t,array['doctor','nurse']) and private.has_care_access(t,p))
  or (private.has_tenant_role(t,array['patient']) and exists(select 1 from public.patient_accounts a where a.tenant_id=t and a.patient_id=p and a.user_id=auth.uid()))
);
$$;
revoke all on function private.exam_quota_access(uuid,uuid) from public,anon,authenticated,service_role;

create function private.ensure_exam_upload_cycle(t uuid,p uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare cycle uuid;
begin
  perform 1 from public.patients where tenant_id=t and id=p for update;
  if not found then raise exception 'Patient required' using errcode='42501'; end if;
  select id into cycle from public.exam_upload_cycles where tenant_id=t and patient_id=p and closed_at is null;
  if cycle is null then
    insert into public.exam_upload_cycles(tenant_id,patient_id,sequence) values(t,p,1) returning id into cycle;
  end if;
  return cycle;
end;
$$;
revoke all on function private.ensure_exam_upload_cycle(uuid,uuid) from public,anon,authenticated,service_role;

create function public.get_exam_upload_quota(target_tenant uuid,target_patient uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare cycle uuid; received integer; reserved integer; v integer;
begin
  if not private.exam_quota_access(target_tenant,target_patient) then raise exception 'Active exam access required' using errcode='42501'; end if;
  cycle:=private.ensure_exam_upload_cycle(target_tenant,target_patient);
  select version into v from public.exam_upload_cycles where id=cycle;
  select count(*) filter(where status='available'),count(*) filter(where status='reserved' and not verification_only and reservation_expires_at>clock_timestamp()) into received,reserved
  from public.patient_documents where upload_cycle_id=cycle and duplicate_of is null;
  return jsonb_build_object('cycle_id',cycle,'version',v,'received',received,'reserved',reserved,'remaining',greatest(0,15-received-reserved),
    'request_pending',exists(select 1 from public.exam_upload_capacity_requests where tenant_id=target_tenant and patient_id=target_patient and resolved_at is null),
    'eligible',exists(select 1 from private.exam_ai_test_patients where tenant_id=target_tenant and patient_id=target_patient));
end;
$$;
revoke all on function public.get_exam_upload_quota(uuid,uuid) from public,anon;
grant execute on function public.get_exam_upload_quota(uuid,uuid) to authenticated;

create function private.reserve_exam_capacity() returns trigger language plpgsql security definer set search_path='' as $$
declare cycle uuid; used integer; checks integer; check_bytes bigint;
begin
  if current_setting('vivance.photo_purpose',true) in ('meal_log','profile_photo') then
    new.attached_to:=current_setting('vivance.photo_purpose',true);
    new.reservation_expires_at:=clock_timestamp()+interval '10 minutes';
  end if;
  if new.status<>'reserved' or new.attached_to<>'documents' then return new; end if;
  cycle:=private.ensure_exam_upload_cycle(new.tenant_id,new.patient_id);
  select count(*) into used from public.patient_documents d where d.upload_cycle_id=cycle and d.duplicate_of is null
    and (d.status='available' or (d.status='reserved' and not d.verification_only and d.reservation_expires_at>clock_timestamp()));
  new.upload_cycle_id:=cycle;
  new.reservation_expires_at:=clock_timestamp()+interval '10 minutes';
  if used>=15 then
    select count(*),coalesce(sum(byte_size),0) into checks,check_bytes from public.patient_documents
    where tenant_id=new.tenant_id and patient_id=new.patient_id and status='reserved' and verification_only and reservation_expires_at>clock_timestamp();
    if checks>=2 or check_bytes+new.byte_size>10485760 then raise exception 'EXAM_QUOTA_FULL' using errcode='P0015'; end if;
    new.verification_only:=true;
  end if;
  return new;
end;
$$;
revoke all on function private.reserve_exam_capacity() from public,anon,authenticated,service_role;
create trigger patient_documents_reserve_capacity before insert on public.patient_documents for each row execute function private.reserve_exam_capacity();

-- Dedicated photo receipts remain outside the examination surface and cannot
-- be used for processing or to attach a PDF under another category.
create function public.reserve_context_photo(target_tenant uuid,target_patient uuid,target_uploader uuid,input_filename text,input_content_type text,input_byte_size bigint,input_visibility text,input_purpose text)
returns table(document_id uuid,storage_path text) language plpgsql security definer set search_path='' as $$
begin
  if auth.jwt()->>'role' is distinct from 'service_role' or input_purpose not in ('meal_log','profile_photo')
    or input_content_type not in ('image/jpeg','image/png')
    or not exists(select 1 from public.memberships m join public.patient_accounts a on a.tenant_id=m.tenant_id and a.user_id=m.user_id
      where m.tenant_id=target_tenant and m.user_id=target_uploader and m.status='active' and m.role='patient' and a.patient_id=target_patient)
    then raise exception 'Patient context photo required' using errcode='42501'; end if;
  perform set_config('vivance.photo_purpose',input_purpose,true);
  return query select * from private.reserve_patient_document(target_tenant,target_patient,target_uploader,input_filename,input_content_type,input_byte_size,'clinical_document',input_visibility);
  perform set_config('vivance.photo_purpose','',true);
end;
$$;
revoke all on function public.reserve_context_photo(uuid,uuid,uuid,text,text,bigint,text,text) from public,anon,authenticated;
grant execute on function public.reserve_context_photo(uuid,uuid,uuid,text,text,bigint,text,text) to service_role;

-- The old completion signature cannot be used to bypass server attestation.
create or replace function private.complete_patient_document(target_tenant uuid,target_document uuid,target_actor uuid) returns uuid
language plpgsql security definer set search_path='' as $$ begin raise exception 'Verified content hash required' using errcode='23514'; end; $$;
create function public.complete_verified_patient_document(target_tenant uuid,target_document uuid,target_actor uuid,verified_sha256 text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.patient_documents; canonical uuid; used integer;
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then raise exception 'Service required' using errcode='42501'; end if;
  select * into d from public.patient_documents where tenant_id=target_tenant and id=target_document;
  if not found or d.uploaded_by<>target_actor or not private.document_actor_has_access(d.tenant_id,d.patient_id,target_actor,d.visibility) then raise exception 'Active reservation required' using errcode='42501'; end if;
  perform 1 from public.patients where tenant_id=d.tenant_id and id=d.patient_id for update;
  select * into d from public.patient_documents where id=target_document for update;
  if d.duplicate_of is not null then return jsonb_build_object('id',d.id,'canonicalId',d.duplicate_of,'duplicate',true); end if;
  if d.status='available' then return jsonb_build_object('id',d.id,'duplicate',false); end if;
  if d.status<>'reserved' or d.reservation_expires_at<=clock_timestamp() then raise exception 'Reservation expired' using errcode='23514'; end if;
  if verified_sha256 is null or verified_sha256 !~ '^[0-9a-f]{64}$' or not exists(select 1 from storage.objects where bucket_id='vivance-documents' and name=d.storage_path) then raise exception 'Verified upload required' using errcode='23514'; end if;
  if d.attached_to<>'documents' then
    update public.patient_documents set content_sha256=verified_sha256,status='available',available_at=clock_timestamp() where id=d.id;
    return jsonb_build_object('id',d.id,'duplicate',false);
  end if;
  select id into canonical from public.patient_documents where tenant_id=d.tenant_id and patient_id=d.patient_id and content_sha256=verified_sha256 and status='available' and duplicate_of is null and attached_to='documents';
  if canonical is not null then
    -- Preserve this actor's receipt and original. The existing care-response
    -- trigger attaches this alias; worker eligibility excludes duplicate_of.
    update public.patient_documents set content_sha256=verified_sha256,duplicate_of=canonical,status='available',available_at=clock_timestamp() where id=d.id;
    return jsonb_build_object('id',d.id,'canonicalId',canonical,'duplicate',true);
  end if;
  select count(*) into used from public.patient_documents where upload_cycle_id=d.upload_cycle_id and status='available' and duplicate_of is null;
  if used>=15 then
    update public.patient_documents set status='rejected',rejected_at=clock_timestamp(),content_sha256=verified_sha256 where id=d.id;
    return jsonb_build_object('quota_full',true);
  end if;
  -- The hash exists before the availability trigger can enqueue anything.
  update public.patient_documents set content_sha256=verified_sha256,status='available',available_at=clock_timestamp() where id=d.id;
  if exists(select 1 from public.exam_upload_cycles c where c.id=d.upload_cycle_id and c.granted_by is not null and c.closed_at is null) then
    insert into public.exam_processing_authorizations(tenant_id,patient_id,document_id,authorized_by)
      select d.tenant_id,d.patient_id,d.id,c.granted_by from public.exam_upload_cycles c where c.id=d.upload_cycle_id on conflict do nothing;
    perform private.enqueue_eligible_exam_document(d.tenant_id,d.id,d.patient_id);
  end if;
  return jsonb_build_object('id',d.id,'duplicate',false);
end;
$$;
revoke all on function public.complete_verified_patient_document(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.complete_verified_patient_document(uuid,uuid,uuid,text) to service_role;

create function public.request_exam_upload_capacity(target_tenant uuid,target_patient uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  if not private.exam_quota_access(target_tenant,target_patient) or not private.has_tenant_role(target_tenant,array['patient']) then raise exception 'Patient access required' using errcode='42501'; end if;
  perform 1 from public.patients where tenant_id=target_tenant and id=target_patient for update;
  select id into result from public.exam_upload_capacity_requests where tenant_id=target_tenant and patient_id=target_patient and resolved_at is null;
  if result is null then insert into public.exam_upload_capacity_requests(tenant_id,patient_id,requested_by) values(target_tenant,target_patient,auth.uid()) returning id into result; end if;
  return result;
end;
$$;
revoke all on function public.request_exam_upload_capacity(uuid,uuid) from public,anon;
grant execute on function public.request_exam_upload_capacity(uuid,uuid) to authenticated;

create function public.grant_exam_upload_cycle(target_tenant uuid,target_patient uuid,expected_cycle uuid,input_reason text,input_idempotency_key uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare c public.exam_upload_cycles; result uuid;
begin
  if not private.exam_quota_access(target_tenant,target_patient) or not private.has_tenant_role(target_tenant,array['doctor']) then raise exception 'Responsible doctor required' using errcode='42501'; end if;
  if input_reason is null or length(btrim(input_reason)) not between 3 and 1000 or input_idempotency_key is null then raise exception 'Reason and request key required' using errcode='23514'; end if;
  perform 1 from public.patients where tenant_id=target_tenant and id=target_patient for update;
  select id into result from public.exam_upload_cycles where tenant_id=target_tenant and patient_id=target_patient and idempotency_key=input_idempotency_key;
  if result is not null then return result; end if;
  select * into c from public.exam_upload_cycles where tenant_id=target_tenant and patient_id=target_patient and closed_at is null for update;
  if c.id is distinct from expected_cycle then raise exception 'Cycle changed' using errcode='23514'; end if;
  -- Explicit closure also permits a justified grant before capacity is exhausted.
  update public.exam_upload_cycles set closed_at=clock_timestamp(),version=version+1 where id=c.id;
  update public.patient_documents set status='rejected',rejected_at=clock_timestamp() where upload_cycle_id=c.id and status='reserved';
  insert into public.exam_upload_cycles(tenant_id,patient_id,sequence,granted_by,reason,idempotency_key) values(target_tenant,target_patient,c.sequence+1,auth.uid(),btrim(input_reason),input_idempotency_key) returning id into result;
  update public.exam_upload_capacity_requests set resolved_at=clock_timestamp() where tenant_id=target_tenant and patient_id=target_patient and resolved_at is null;
  return result;
end;
$$;
revoke all on function public.grant_exam_upload_cycle(uuid,uuid,uuid,text,uuid) from public,anon;
grant execute on function public.grant_exam_upload_cycle(uuid,uuid,uuid,text,uuid) to authenticated;

alter function private.exam_ai_document_eligible(uuid,uuid,uuid) rename to synthetic_exam_document_eligible;
create function private.exam_ai_document_eligible(target_tenant uuid,target_document uuid,target_patient uuid) returns boolean
language sql stable security definer set search_path='' as $$
select (private.synthetic_exam_document_eligible(target_tenant,target_document,target_patient)
 or (exists(select 1 from private.exam_ai_test_patients q where q.tenant_id=target_tenant and q.patient_id=target_patient)
  and exists(select 1 from public.exam_processing_authorizations a where a.tenant_id=target_tenant and a.document_id=target_document and a.internal_allowed)))
and exists(select 1 from public.exam_processing_authorizations a
 join public.memberships m on m.tenant_id=a.tenant_id and m.user_id=a.authorized_by and m.role='doctor' and m.status='active'
 join public.tenants t on t.id=m.tenant_id and t.status='active'
 join public.care_relationships c on c.tenant_id=a.tenant_id and c.patient_id=a.patient_id and c.professional_id=a.authorized_by and c.status='active'
 where a.tenant_id=target_tenant and a.patient_id=target_patient and a.document_id=target_document and a.revoked_at is null)
and exists(select 1 from public.patient_documents d where d.id=target_document and d.tenant_id=target_tenant and d.patient_id=target_patient and d.duplicate_of is null and d.status='available' and d.attached_to='documents');
$$;
revoke all on function private.exam_ai_document_eligible(uuid,uuid,uuid) from public,anon,authenticated,service_role;

-- Attest bytes of legacy receipts before the doctor can authorize the batch.
create function public.attest_existing_exam_document(target_tenant uuid,target_document uuid,target_actor uuid,verified_sha256 text) returns uuid
language plpgsql security definer set search_path='' as $$
declare d public.patient_documents; canonical uuid; cycle uuid; used integer;
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then raise exception 'Service required' using errcode='42501'; end if;
  select * into d from public.patient_documents where tenant_id=target_tenant and id=target_document and status='available' and attached_to='documents';
  if not found or not private.document_actor_has_access(d.tenant_id,d.patient_id,target_actor,d.visibility) or not exists(select 1 from public.memberships where tenant_id=target_tenant and user_id=target_actor and role='doctor' and status='active') then raise exception 'Responsible doctor required' using errcode='42501'; end if;
  if verified_sha256 is null or verified_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'Verified hash required' using errcode='23514'; end if;
  cycle:=private.ensure_exam_upload_cycle(d.tenant_id,d.patient_id);
  select id into canonical from public.patient_documents where tenant_id=d.tenant_id and patient_id=d.patient_id and content_sha256=verified_sha256 and status='available' and duplicate_of is null and attached_to='documents' and id<>d.id;
  if canonical is not null then
    update public.patient_documents set duplicate_of=canonical,content_sha256=verified_sha256 where id=d.id;
    return canonical;
  end if;
  if d.upload_cycle_id is null then
    select count(*) into used from public.patient_documents where upload_cycle_id=cycle and status='available' and duplicate_of is null;
    if used>=15 then raise exception 'EXAM_QUOTA_FULL' using errcode='P0015'; end if;
  end if;
  update public.patient_documents set content_sha256=verified_sha256,upload_cycle_id=coalesce(upload_cycle_id,cycle) where id=d.id;
  return d.id;
end;
$$;
revoke all on function public.attest_existing_exam_document(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.attest_existing_exam_document(uuid,uuid,uuid,text) to service_role;

create function public.authorize_exam_documents(target_tenant uuid,target_patient uuid,document_ids uuid[]) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.patient_documents; result jsonb:='[]'::jsonb; job uuid; n integer;
begin
  if not private.exam_quota_access(target_tenant,target_patient) or not private.has_tenant_role(target_tenant,array['doctor']) then raise exception 'Responsible doctor required' using errcode='42501'; end if;
  n:=cardinality(document_ids);
  if n is null or n not between 1 and 15 or (select count(distinct x) from unnest(document_ids) x)<>n then raise exception 'Select up to fifteen distinct documents' using errcode='23514'; end if;
  perform 1 from public.patients where tenant_id=target_tenant and id=target_patient for update;
  update public.exam_upload_cycles set granted_by=coalesce(granted_by,auth.uid()),reason=coalesce(reason,'Synthetic receiving explicitly enabled by responsible doctor'),version=version+1
    where tenant_id=target_tenant and patient_id=target_patient and closed_at is null;
  for d in select * from public.patient_documents where tenant_id=target_tenant and patient_id=target_patient and id=any(document_ids) order by id loop
    if d.status<>'available' or d.duplicate_of is not null or d.content_sha256 is null or d.upload_cycle_id is null or not exists(select 1 from private.exam_ai_test_patients q where q.tenant_id=target_tenant and q.patient_id=target_patient) then raise exception 'Verified eligible synthetic document required' using errcode='42501'; end if;
    insert into public.exam_processing_authorizations(tenant_id,patient_id,document_id,authorized_by,internal_allowed) values(target_tenant,target_patient,d.id,auth.uid(),true) on conflict(tenant_id,document_id) do nothing;
    job:=private.enqueue_eligible_exam_document(target_tenant,d.id,target_patient);
    result:=result||jsonb_build_array(jsonb_build_object('document_id',d.id,'job_id',job));
  end loop;
  if jsonb_array_length(result)<>n then raise exception 'Document scope mismatch' using errcode='42501'; end if;
  return result;
end;
$$;
revoke all on function public.authorize_exam_documents(uuid,uuid,uuid[]) from public,anon;
grant execute on function public.authorize_exam_documents(uuid,uuid,uuid[]) to authenticated;

-- A meal cannot consume an examination and remove it from quota accounting.
create or replace function private.record_patient_meal(
  target_tenant uuid,
  request_key uuid,
  type_text text,
  happened_at timestamptz,
  note_text text,
  photo_document uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  target_patient uuid;
  stored public.patient_meal_logs;
  result uuid;
begin
  if request_key is null or not private.has_tenant_role(target_tenant, array['patient']) then
    raise exception 'Active patient access required' using errcode = '42501';
  end if;
  if type_text not in ('breakfast','lunch','dinner','snack','other')
    or happened_at is null or happened_at > clock_timestamp() + interval '15 minutes'
    or (note_text is null and photo_document is null)
    or (note_text is not null and (char_length(note_text) not between 1 and 2000
      or note_text ~ '^[[:space:]]*$')) then
    raise exception 'Valid meal details required' using errcode = '23514';
  end if;
  select patient_id into target_patient
  from public.patient_accounts
  where tenant_id = target_tenant and user_id = auth.uid();
  if target_patient is null then
    raise exception 'Patient account required' using errcode = '42501';
  end if;

  select * into stored from public.patient_meal_logs
  where tenant_id = target_tenant and actor_user_id = auth.uid()
    and client_request_id = request_key;
  if stored.id is not null then
    if stored.meal_type = type_text
      and stored.eaten_at = happened_at
      and stored.description is not distinct from note_text
      and stored.photo_document_id is not distinct from photo_document then
      return stored.id;
    end if;
    raise exception 'Request key already used with different content'
      using errcode = '23505', detail = 'meal_request_key_reused';
  end if;

  if photo_document is not null then
    if not exists (
      select 1 from public.patient_documents document
      where document.tenant_id = target_tenant
        and document.id = photo_document
        and document.patient_id = target_patient
        and document.uploaded_by = auth.uid()
        and document.status = 'available'
        and document.content_type in ('image/jpeg','image/png')
        and document.category = 'clinical_document'
        and document.attached_to = 'meal_log'
    ) then
      raise exception 'Available meal photo required' using errcode = '23514';
    end if;
    update public.patient_documents set attached_to = 'meal_log'
    where tenant_id = target_tenant and id = photo_document;
  end if;

  insert into public.patient_meal_logs(
    tenant_id, patient_id, actor_user_id, meal_type, eaten_at, description,
    client_request_id, photo_document_id
  ) values (
    target_tenant, target_patient, auth.uid(), type_text, happened_at, note_text,
    request_key, photo_document
  ) returning id into result;
  return result;
end;
$$;

