-- Immutable generation snapshots; only a live responsible doctor can request,
-- review or publish. Patients can read the separate published factual artifact.
create table public.exam_longitudinal_summaries (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id),
  patient_id uuid not null, requested_by uuid not null references auth.users(id), requested_session uuid not null,
  source_manifest jsonb not null, source_key text not null,
  status text not null default 'processing' check(status in ('processing','failed','draft','approved')),
  claims jsonb not null default '[]', comparisons jsonb not null default '[]', possibilities jsonb not null default '[]',
  lease_token uuid, lease_expires_at timestamptz, model text,
  input_tokens integer, output_tokens integer, removed_claims integer not null default 0,
  created_at timestamptz not null default now(), approved_at timestamptz, approved_by uuid,
  foreign key (tenant_id,patient_id) references public.patients(tenant_id,id),
  unique(tenant_id,patient_id,source_key)
);
create table public.exam_summary_reviews (
  id uuid primary key default gen_random_uuid(), summary_id uuid not null references public.exam_longitudinal_summaries(id),
  tenant_id uuid not null, patient_id uuid not null, reviewed_by uuid not null references auth.users(id),
  decision text not null check(decision in ('confirmed','rejected')), note text,
  created_at timestamptz not null default now()
);
create table public.exam_summary_publications (
  id uuid primary key default gen_random_uuid(), summary_id uuid not null unique references public.exam_longitudinal_summaries(id),
  tenant_id uuid not null, patient_id uuid not null, published_by uuid not null references auth.users(id),
  factual_claims jsonb not null, published_at timestamptz not null default now()
);
-- No seed recommendations: a clinical authority must curate these versions.
create table public.exam_clinical_library_versions (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id),
  source_title text not null, source_url text not null, source_version text not null,
  excerpt text not null, population text not null, exclusions text not null,
  applicability jsonb not null, approved_by uuid references auth.users(id),
  reviewed_at timestamptz, valid_until timestamptz,
  status text not null check(status in ('in_review','current','superseded')),
  check(status <> 'current' or (approved_by is not null and reviewed_at is not null and valid_until is not null))
);
alter table public.exam_longitudinal_summaries enable row level security;
alter table public.exam_summary_reviews enable row level security;
alter table public.exam_summary_publications enable row level security;
alter table public.exam_clinical_library_versions enable row level security;
revoke all on public.exam_longitudinal_summaries, public.exam_summary_reviews, public.exam_summary_publications, public.exam_clinical_library_versions from public,anon,authenticated;
grant select on public.exam_longitudinal_summaries, public.exam_summary_reviews, public.exam_summary_publications, public.exam_clinical_library_versions to authenticated;
create policy summary_doctor_read on public.exam_longitudinal_summaries for select to authenticated using(private.has_live_session() and private.has_tenant_role(tenant_id,array['doctor']) and private.has_care_access(tenant_id,patient_id));
create policy summary_review_read on public.exam_summary_reviews for select to authenticated using(private.has_live_session() and private.has_tenant_role(tenant_id,array['doctor']) and private.has_care_access(tenant_id,patient_id));
create policy summary_publication_read on public.exam_summary_publications for select to authenticated using(private.has_live_session() and (private.has_care_access(tenant_id,patient_id) or (private.has_tenant_role(tenant_id,array['patient']) and exists(select 1 from public.patient_accounts a where a.tenant_id=exam_summary_publications.tenant_id and a.patient_id=exam_summary_publications.patient_id and a.user_id=auth.uid()))));
create policy summary_library_read on public.exam_clinical_library_versions for select to authenticated using(private.has_live_session() and private.has_tenant_role(tenant_id,array['doctor']) and status='current' and valid_until > now());

create function private.exam_summary_manifest(t uuid,p uuid) returns jsonb language sql stable security definer set search_path='' as $$
with documents as (
 select d.* from public.patient_documents d where d.tenant_id=t and d.patient_id=p and d.category in ('exam','clinical_document') and d.status='available' and d.attached_to='documents' and d.duplicate_of is null
), runs as (
 select distinct on (r.document_id) r.* from public.document_extraction_runs r join documents d on d.id=r.document_id
 order by r.document_id,r.created_at desc,r.id desc
), items as (
 select i.*,r.source_content_sha256 from public.exam_result_items i join runs r on r.id=i.extraction_run_id
), reviewed as (
 select i.*,v.id review_id,v.version review_version,v.decision,
 coalesce(c.corrected_data,'{}'::jsonb) correction
 from items i left join lateral (select * from public.exam_result_item_reviews v where v.item_id=i.id and v.tenant_id=t and v.patient_id=p order by version desc limit 1) v on true
 left join lateral (select corrected_data from public.exam_result_item_reviews c where c.item_id=i.id and c.tenant_id=t and c.patient_id=p and c.decision='corrected' order by version desc limit 1) c on true
)
select jsonb_build_object('version','exam-summary-v1','age',(select extract(year from age(current_date,birth_date))::integer from public.patients where tenant_id=t and id=p),'library',coalesce((select jsonb_agg(to_jsonb(l) order by l.id) from public.exam_clinical_library_versions l where l.tenant_id=t and l.status='current' and l.valid_until>now()),'[]'::jsonb),'facts',coalesce((select jsonb_agg(jsonb_build_object(
 'itemId',id,'reviewId',review_id,'reviewVersion',review_version,'documentId',document_id,
 'sourceHash',source_content_sha256,'page',page_number,'excerpt',source_excerpt,'name',literal_name,
 'value',case when correction ? case when item_kind='narrative' then 'narrative_text' else 'literal_value' end then correction->>case when item_kind='narrative' then 'narrative_text' else 'literal_value' end else coalesce(literal_value,narrative_text) end,
 'unit',case when correction ? 'unit_text' then correction->>'unit_text' else unit_text end,'method',method_text,'context',specimen_text,
 'reference',case when correction ? 'reference_text' then correction->>'reference_text' else reference_text end,
 'observedOn',case when correction ? 'observed_on' then correction->>'observed_on' else observed_on::text end
 ) order by id) from reviewed where decision in ('confirmed','corrected') and private.exam_ai_document_eligible(t,document_id,p)), '[]'::jsonb),
 'coverage',jsonb_build_object('documents',(select count(*) from documents),'pendingItems',(select count(*) from reviewed where decision is null),
 'unresolvedDocuments',(select count(*) from documents d where not exists(select 1 from runs r where r.document_id=d.id and r.page_count=r.extracted_page_count and r.status in ('extracted','requires_review')))))
$$;
revoke all on function private.exam_summary_manifest(uuid,uuid) from public,anon,authenticated,service_role;

create function public.get_exam_summary(target_tenant uuid,target_patient uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare m jsonb; s public.exam_longitudinal_summaries;
begin
 if not private.has_live_session() or not private.has_tenant_role(target_tenant,array['doctor']) or not private.has_care_access(target_tenant,target_patient) then raise exception 'Active doctor care required' using errcode='42501'; end if;
 m:=private.exam_summary_manifest(target_tenant,target_patient);
 select * into s from public.exam_longitudinal_summaries where tenant_id=target_tenant and patient_id=target_patient order by created_at desc,id desc limit 1;
 return jsonb_build_object('manifest',m,'summary',case when s.id is not null then to_jsonb(s)-'lease_token'-'requested_session' else null end,'stale',s.id is not null and s.source_manifest<>m,'leaseExpired',s.status='processing' and s.lease_expires_at<=now(),'clinicalLibraryAvailable',jsonb_array_length(m->'library')>0,'published',exists(select 1 from public.exam_summary_publications where summary_id=s.id));
end $$;

create function public.begin_exam_summary(target_tenant uuid,target_patient uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare m jsonb; k text; s public.exam_longitudinal_summaries; token uuid:=gen_random_uuid();
begin
 if not private.has_live_session() or not private.has_tenant_role(target_tenant,array['doctor']) or not private.has_care_access(target_tenant,target_patient) then raise exception 'Active doctor care required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(target_tenant::text||target_patient::text,0));
 m:=private.exam_summary_manifest(target_tenant,target_patient);
 if jsonb_array_length(m->'facts')=0 then raise exception 'Review facts first' using errcode='23514'; end if;
 k:=md5(m::text);
 select * into s from public.exam_longitudinal_summaries where tenant_id=target_tenant and patient_id=target_patient and source_key=k for update;
 if found and (s.status in ('draft','approved') or (s.status='processing' and s.lease_expires_at>now())) then return jsonb_build_object('cached',true,'summaryId',s.id,'status',s.status); end if;
 if s.id is null then
 insert into public.exam_longitudinal_summaries(tenant_id,patient_id,requested_by,requested_session,source_manifest,source_key,lease_token,lease_expires_at) values(target_tenant,target_patient,auth.uid(),(auth.jwt()->>'session_id')::uuid,m,k,token,now()+interval '120 seconds') returning * into s;
 else update public.exam_longitudinal_summaries set status='processing',requested_by=auth.uid(),requested_session=(auth.jwt()->>'session_id')::uuid,lease_token=token,lease_expires_at=now()+interval '120 seconds' where id=s.id returning * into s; end if;
 return jsonb_build_object('cached',false,'summaryId',s.id,'leaseToken',token,'manifest',m);
end $$;

create function public.finish_exam_summary(target_summary uuid,target_lease uuid,verified_claims jsonb,verified_comparisons jsonb,verified_possibilities jsonb,provider_model text,usage_input integer,usage_output integer,removed integer) returns boolean language plpgsql security definer set search_path='' as $$
declare s public.exam_longitudinal_summaries;
begin
 if auth.jwt()->>'role' is distinct from 'service_role' then raise exception 'Service required' using errcode='42501'; end if;
 select * into s from public.exam_longitudinal_summaries where id=target_summary for update;
 if not found or s.status<>'processing' or s.lease_token is distinct from target_lease or s.lease_expires_at<=now() then raise exception 'Lease invalid' using errcode='40001'; end if;
 if not exists(select 1 from auth.sessions a join auth.users u on u.id=a.user_id where a.id=s.requested_session and a.user_id=s.requested_by and (a.not_after is null or a.not_after>now()) and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())) then raise exception 'Session revoked' using errcode='42501'; end if;
 if not exists(select 1 from public.memberships where tenant_id=s.tenant_id and user_id=s.requested_by and role='doctor' and status='active') or not exists(select 1 from public.care_relationships where tenant_id=s.tenant_id and patient_id=s.patient_id and professional_id=s.requested_by and status='active') or s.source_manifest<>private.exam_summary_manifest(s.tenant_id,s.patient_id) then raise exception 'Access or sources changed' using errcode='42501'; end if;
 update public.exam_longitudinal_summaries set status=case when verified_claims is null then 'failed' else 'draft' end, claims=coalesce(verified_claims,'[]'),comparisons=coalesce(verified_comparisons,'[]'),possibilities=coalesce(verified_possibilities,'[]'),model=provider_model,input_tokens=usage_input,output_tokens=usage_output,removed_claims=coalesce(removed,0),lease_token=null,lease_expires_at=null where id=s.id;
 return true;
end $$;

create function public.review_exam_summary(target_tenant uuid,target_patient uuid,target_summary uuid,action text,review_note text default null) returns boolean language plpgsql security definer set search_path='' as $$
declare s public.exam_longitudinal_summaries;
begin
 if not private.has_live_session() or not private.has_tenant_role(target_tenant,array['doctor']) or not private.has_care_access(target_tenant,target_patient) then raise exception 'Active doctor care required' using errcode='42501'; end if;
 select * into s from public.exam_longitudinal_summaries where id=target_summary and tenant_id=target_tenant and patient_id=target_patient for update;
 if not found or s.source_manifest<>private.exam_summary_manifest(target_tenant,target_patient) then raise exception 'Sources changed; generate again' using errcode='40001'; end if;
 if action='approve' and s.status='draft' then
 insert into public.exam_summary_reviews(summary_id,tenant_id,patient_id,reviewed_by,decision,note) values(s.id,target_tenant,target_patient,auth.uid(),'confirmed',left(review_note,2000));
 update public.exam_longitudinal_summaries set status='approved',approved_by=auth.uid(),approved_at=now() where id=s.id;
 elsif action='reject' and s.status='draft' then
 insert into public.exam_summary_reviews(summary_id,tenant_id,patient_id,reviewed_by,decision,note) values(s.id,target_tenant,target_patient,auth.uid(),'rejected',left(review_note,2000));
 update public.exam_longitudinal_summaries set status='failed' where id=s.id;
 elsif action='publish' and s.status='approved' then
 insert into public.exam_summary_publications(summary_id,tenant_id,patient_id,published_by,factual_claims) values(s.id,target_tenant,target_patient,auth.uid(),s.claims) on conflict(summary_id) do nothing;
 else raise exception 'Invalid transition' using errcode='40001'; end if;
 return true;
end $$;
revoke all on function public.get_exam_summary(uuid,uuid), public.begin_exam_summary(uuid,uuid),public.review_exam_summary(uuid,uuid,uuid,text,text) from public,anon,service_role;
grant execute on function public.get_exam_summary(uuid,uuid), public.begin_exam_summary(uuid,uuid),public.review_exam_summary(uuid,uuid,uuid,text,text) to authenticated;
revoke all on function public.finish_exam_summary(uuid,uuid,jsonb,jsonb,jsonb,text,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.finish_exam_summary(uuid,uuid,jsonb,jsonb,jsonb,text,integer,integer,integer) to service_role;
create trigger exam_summary_audit after insert or update on public.exam_longitudinal_summaries for each row execute function private.audit_change();
create trigger exam_summary_reviews_audit after insert on public.exam_summary_reviews for each row execute function private.audit_change();
create trigger exam_summary_publications_audit after insert on public.exam_summary_publications for each row execute function private.audit_change();
