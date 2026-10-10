-- C3: a request for exams is completed only by the document explicitly sent
-- in response to that request. An unrelated upload must remain independent.

alter table public.patient_care_requests
  add constraint patient_care_requests_tenant_id_id_patient_id_key
  unique (tenant_id, id, patient_id);

alter table public.patient_documents
  add column care_request_id uuid,
  add constraint patient_documents_care_request_fkey
    foreign key (tenant_id, care_request_id, patient_id)
    references public.patient_care_requests(tenant_id, id, patient_id);

create index patient_documents_care_request
  on public.patient_documents(tenant_id, care_request_id, created_at, id)
  where care_request_id is not null;

alter table public.patient_care_requests
  add column response_document_id uuid,
  add column response_actor_id uuid,
  add constraint patient_care_requests_response_document_fkey
    foreign key (tenant_id, response_document_id, patient_id)
    references public.patient_documents(tenant_id, id, patient_id),
  add constraint patient_care_requests_response_actor_fkey
    foreign key (tenant_id, response_actor_id)
    references public.memberships(tenant_id, user_id),
  add constraint patient_care_requests_exam_response_shape check (
    (response_document_id is null and response_actor_id is null)
    or (
      kind = 'exams'
      and status = 'completed'
      and response_document_id is not null
      and response_actor_id is not null
    )
  );

-- The existing eight-argument RPC remains available for ordinary uploads.
-- The explicit overload is the only path that binds an upload to a request.
create function private.reserve_patient_document(
  target_tenant uuid,
  target_patient uuid,
  target_uploader uuid,
  input_filename text,
  input_content_type text,
  input_byte_size bigint,
  input_category text,
  input_visibility text,
  target_care_request uuid
) returns table(document_id uuid, storage_path text)
language plpgsql security definer set search_path = '' as $$
declare
  requested public.patient_care_requests;
  reserved record;
begin
  if target_care_request is null then
    return query
      select * from private.reserve_patient_document(
        target_tenant,
        target_patient,
        target_uploader,
        input_filename,
        input_content_type,
        input_byte_size,
        input_category,
        input_visibility
      );
    return;
  end if;

  if input_category <> 'exam' or input_visibility <> 'shared' then
    raise exception 'Care request response must be a shared exam document'
      using errcode = '23514';
  end if;

  select care.* into requested
  from public.patient_care_requests care
  where care.tenant_id = target_tenant
    and care.id = target_care_request
    and care.patient_id = target_patient
    and care.kind = 'exams'
    and care.status = 'requested'
  for update;

  if not found then
    raise exception 'Requested exam care request required'
      using errcode = '23514';
  end if;

  -- The original reservation function establishes that target_uploader is
  -- either this patient or an active doctor/nurse with a care relationship.
  -- Keeping uploaded_by records whether this was patient-reported or assisted.
  select * into reserved
  from private.reserve_patient_document(
    target_tenant,
    target_patient,
    target_uploader,
    input_filename,
    input_content_type,
    input_byte_size,
    input_category,
    input_visibility
  );

  update public.patient_documents
  set care_request_id = target_care_request
  where tenant_id = target_tenant
    and id = reserved.document_id
    and patient_id = target_patient
    and uploaded_by = target_uploader;

  return query select reserved.document_id, reserved.storage_path;
end;
$$;
revoke all on function private.reserve_patient_document(
  uuid, uuid, uuid, text, text, bigint, text, text, uuid
) from public, anon, authenticated;
grant execute on function private.reserve_patient_document(
  uuid, uuid, uuid, text, text, bigint, text, text, uuid
) to service_role;

create function public.reserve_patient_document(
  target_tenant uuid,
  target_patient uuid,
  target_uploader uuid,
  input_filename text,
  input_content_type text,
  input_byte_size bigint,
  input_category text,
  input_visibility text,
  target_care_request uuid
) returns table(document_id uuid, storage_path text)
language sql security invoker set search_path = '' as $$
  select * from private.reserve_patient_document(
    target_tenant,
    target_patient,
    target_uploader,
    input_filename,
    input_content_type,
    input_byte_size,
    input_category,
    input_visibility,
    target_care_request
  );
$$;
revoke all on function public.reserve_patient_document(
  uuid, uuid, uuid, text, text, bigint, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.reserve_patient_document(
  uuid, uuid, uuid, text, text, bigint, text, text, uuid
) to service_role;

-- Replace the generic exam trigger. Availability without an explicit request
-- reference has no effect; a stale, replaced or cancelled request aborts the
-- completion instead of silently attaching the document to another request.
drop trigger patient_care_requests_exams_completed on public.patient_documents;

create function private.complete_exam_care_request_response() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  changed integer;
begin
  if new.care_request_id is null then
    return null;
  end if;

  update public.patient_care_requests care
  set status = 'completed',
      completed_at = clock_timestamp(),
      response_document_id = new.id,
      response_actor_id = new.uploaded_by
  where care.tenant_id = new.tenant_id
    and care.id = new.care_request_id
    and care.patient_id = new.patient_id
    and care.kind = 'exams'
    and care.status = 'requested';

  get diagnostics changed = row_count;
  if changed <> 1 then
    raise exception 'Referenced exam care request is no longer pending'
      using errcode = '23514';
  end if;
  return null;
end;
$$;
revoke all on function private.complete_exam_care_request_response()
  from public, anon, authenticated;

create trigger patient_care_requests_exams_completed
  after update on public.patient_documents
  for each row
  when (
    new.status = 'available'
    and old.status is distinct from 'available'
    and new.category = 'exam'
    and new.attached_to = 'documents'
    and new.care_request_id is not null
  )
  execute function private.complete_exam_care_request_response();

-- Patient-safe projection: it reveals only whether a human review exists.
-- Review decision, note and reviewer remain clinician-internal.
create function public.get_own_patient_document_status(
  target_tenant uuid,
  target_document uuid
) returns table(document_id uuid, operational_status text)
language plpgsql stable security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  owned_document uuid;
begin
  if actor is null
    or not private.has_live_session()
    or not private.has_tenant_role(target_tenant, array['patient'])
  then
    raise exception 'Active patient access required' using errcode = '42501';
  end if;

  select document.id into owned_document
  from public.patient_documents document
  join public.patient_accounts account
    on account.tenant_id = document.tenant_id
   and account.patient_id = document.patient_id
   and account.user_id = actor
  where document.tenant_id = target_tenant
    and document.id = target_document
    and document.status = 'available'
    and document.visibility = 'shared'
    and document.attached_to = 'documents';

  if owned_document is null then
    raise exception 'Available patient document required' using errcode = '42501';
  end if;

  return query
  select owned_document,
    case when exists (
      select 1
      from public.patient_document_reviews review
      where review.tenant_id = target_tenant
        and review.document_id = owned_document
    ) then 'review_recorded'::text else 'received'::text end;
end;
$$;
revoke all on function public.get_own_patient_document_status(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.get_own_patient_document_status(uuid, uuid)
  to authenticated;
