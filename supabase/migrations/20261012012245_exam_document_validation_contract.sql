-- Medical disposition of each document is independent from item transcription
-- reviews. Versions preserve the exact source state; corrections invalidate it.
create table public.exam_document_validations (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, patient_id uuid not null,
  document_id uuid not null, extraction_run_id uuid, source_hash text,
  version integer not null check(version>0), decision text not null check(decision in ('reviewed','excluded')),
  source_state jsonb not null, excluded_pages integer[] not null default '{}',
  note text, reviewed_by uuid not null references auth.users(id),
  reviewed_at timestamptz not null default clock_timestamp(), client_request_id uuid not null,
  unique(document_id,version), unique(document_id,client_request_id),
  foreign key(tenant_id,document_id,patient_id) references public.patient_documents(tenant_id,id,patient_id),
  foreign key(extraction_run_id) references public.document_extraction_runs(id),
  check(source_hash is null or source_hash ~ '^[0-9a-f]{64}$'),
  check(note is null or char_length(btrim(note)) between 10 and 2000),
  check(decision<>'excluded' or note is not null)
);
alter table public.exam_document_validations enable row level security;
revoke all on public.exam_document_validations from public,anon,authenticated;
grant select on public.exam_document_validations to authenticated;
create policy exam_document_validation_doctor_read on public.exam_document_validations for select to authenticated using(private.has_live_session() and private.has_tenant_role(tenant_id,array['doctor']) and private.has_care_access(tenant_id,patient_id));
create trigger exam_document_validation_immutable before update or delete on public.exam_document_validations for each row execute function private.reject_document_extraction_mutation();
create trigger exam_document_validation_audit after insert on public.exam_document_validations for each row execute function private.audit_change();

create function private.exam_document_validation_state(t uuid,d uuid) returns jsonb
language sql stable security definer set search_path='' as $$
with document as (select * from public.patient_documents where tenant_id=t and id=d and status='available' and attached_to='documents' and category in ('exam','clinical_document') and duplicate_of is null),
run as (select r.* from public.document_extraction_runs r join document x on x.id=r.document_id where r.tenant_id=t order by r.created_at desc,r.id desc limit 1),
items as (select i.id,v.id review_id,v.version review_version,v.decision from public.exam_result_items i join run r on r.id=i.extraction_run_id left join lateral(select v.* from public.exam_result_item_reviews v where v.tenant_id=t and v.item_id=i.id order by v.version desc limit 1)v on true)
select jsonb_build_object('documentId',x.id,'sourceHash',coalesce(x.content_sha256,(select source_content_sha256 from run)),
 'runId',(select id from run),'runStatus',(select status from run),'pageCount',(select page_count from run),
 'jobStatus',(select j.status from public.processing_jobs j where j.tenant_id=t and j.patient_id=x.patient_id and j.job_type='exam_text_extraction' and j.idempotency_key=x.id::text order by j.created_at desc,j.id desc limit 1),
 'pages',coalesce((select jsonb_agg(jsonb_build_object('page',p.page_number,'status',p.status) order by p.page_number) from public.document_extracted_pages p join run r on r.id=p.extraction_run_id),'[]'::jsonb),
 'unresolvedPages',coalesce((select jsonb_agg(n order by n) from run r cross join lateral generate_series(1,r.page_count)n where not exists(select 1 from public.document_extracted_pages p where p.extraction_run_id=r.id and p.page_number=n and p.status='extracted')),'[]'::jsonb),
 'itemReviews',coalesce((select jsonb_agg(to_jsonb(i) order by i.id) from items i),'[]'::jsonb),
 'pendingItems',(select count(*) from items where decision is null),
 'qualityNotes',coalesce((select m.quality_notes from public.exam_document_metadata m join run r on r.id=m.extraction_run_id),'[]'::jsonb)) from document x
$$;
revoke all on function private.exam_document_validation_state(uuid,uuid) from public,anon,authenticated,service_role;

create function public.get_exam_document_validation(target_tenant uuid,target_document uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p uuid; state jsonb; v public.exam_document_validations;
begin
 select patient_id into p from public.patient_documents where tenant_id=target_tenant and id=target_document and status='available' and attached_to='documents';
 if p is null or not private.has_live_session() or not private.has_tenant_role(target_tenant,array['doctor']) or not private.has_care_access(target_tenant,p) then raise exception 'Active responsible doctor required' using errcode='42501'; end if;
 state:=private.exam_document_validation_state(target_tenant,target_document);
 if state is null then raise exception 'Exam document required' using errcode='23514'; end if;
 select * into v from public.exam_document_validations where tenant_id=target_tenant and document_id=target_document order by version desc limit 1;
 return jsonb_build_object('sourceState',state,'validation',case when v.id is not null then to_jsonb(v) else null end,'stale',v.id is not null and v.decision='reviewed' and v.source_state<>state,'version',coalesce(v.version,0));
end $$;

create function public.review_exam_document_validation(target_tenant uuid,target_document uuid,target_request uuid,expected_version integer,validation_decision text,validation_note text,excluded_page_numbers integer[] default '{}') returns uuid
language plpgsql security definer set search_path='' as $$
declare p uuid; state jsonb; v public.exam_document_validations; result uuid;
begin
 select patient_id into p from public.patient_documents where tenant_id=target_tenant and id=target_document and status='available' and attached_to='documents' for update;
 if p is null or not private.has_live_session() or not private.has_tenant_role(target_tenant,array['doctor']) or not private.has_care_access(target_tenant,p) then raise exception 'Active responsible doctor required' using errcode='42501'; end if;
 if target_request is null or expected_version is null or expected_version<0 or validation_decision not in ('reviewed','excluded') or validation_decision is null then raise exception 'Validation input required' using errcode='22023'; end if;
 select id into result from public.exam_document_validations where document_id=target_document and client_request_id=target_request;
 if found then return result; end if;
 select * into v from public.exam_document_validations where tenant_id=target_tenant and document_id=target_document order by version desc limit 1;
 if coalesce(v.version,0)<>expected_version then raise exception 'Validation version changed' using errcode='40001'; end if;
 state:=private.exam_document_validation_state(target_tenant,target_document);
 if state is null then raise exception 'Exam document required' using errcode='23514'; end if;
 if validation_note is not null and char_length(btrim(validation_note)) not between 10 and 2000 then raise exception 'Explain validation in 10-2000 characters' using errcode='22023'; end if;
 if validation_decision='excluded' or jsonb_array_length(state->'qualityNotes')>0 or jsonb_array_length(state->'unresolvedPages')>0 or cardinality(coalesce(excluded_page_numbers,'{}'))>0 then
  if validation_note is null then raise exception 'Coverage or exclusion requires justification' using errcode='23514'; end if;
 end if;
 if exists(select 1 from unnest(coalesce(excluded_page_numbers,'{}'))n where n is null or n<1 or n>coalesce((state->>'pageCount')::integer,0)) then raise exception 'Invalid excluded page' using errcode='22023'; end if;
 if validation_decision='reviewed' then
  if state->>'runId' is null or state->>'runStatus' not in ('extracted','requires_review') or state->>'jobStatus' in ('pending','processing') or (state->>'pendingItems')::integer>0 then raise exception 'Finish extraction and review all items first' using errcode='23514'; end if;
  if exists(select 1 from jsonb_array_elements_text(state->'unresolvedPages')n(value) where not (n.value::integer=any(coalesce(excluded_page_numbers,'{}')))) then raise exception 'Resolve or explicitly exclude every unresolved page' using errcode='23514'; end if;
 end if;
 insert into public.exam_document_validations(tenant_id,patient_id,document_id,extraction_run_id,source_hash,version,decision,source_state,excluded_pages,note,reviewed_by,client_request_id)
 values(target_tenant,p,target_document,(state->>'runId')::uuid,state->>'sourceHash',expected_version+1,validation_decision,state,coalesce(excluded_page_numbers,'{}'),nullif(btrim(validation_note),''),auth.uid(),target_request) returning id into result;
 return result;
end $$;
revoke all on function public.get_exam_document_validation(uuid,uuid),public.review_exam_document_validation(uuid,uuid,uuid,integer,text,text,integer[]) from public,anon,service_role;
grant execute on function public.get_exam_document_validation(uuid,uuid),public.review_exam_document_validation(uuid,uuid,uuid,integer,text,text,integer[]) to authenticated;

-- Preserve the existing facts/library contract while adding medical source
-- coverage. Partial factual drafts are allowed and clearly marked incomplete.
alter function private.exam_summary_manifest(uuid,uuid) rename to exam_summary_manifest_before_document_validation;
create function private.exam_summary_manifest(t uuid,p uuid) returns jsonb
language sql stable security definer set search_path='' as $$
with original as (select private.exam_summary_manifest_before_document_validation(t,p) m),
documents as(select d.id,private.exam_document_validation_state(t,d.id) state from public.patient_documents d where d.tenant_id=t and d.patient_id=p and d.status='available' and d.attached_to='documents' and d.category in ('exam','clinical_document') and d.duplicate_of is null),
validations as(select d.*,v.id validation_id,v.version,v.decision,v.source_state,v.excluded_pages from documents d left join lateral(select * from public.exam_document_validations v where v.tenant_id=t and v.document_id=d.id order by version desc limit 1)v on true),
states as(select *,case when decision='excluded' then 'excluded' when source_state=state then decision else null end effective_decision from validations)
select m||jsonb_build_object('version','exam-summary-v2-document-validation',
 'documentValidations',coalesce((select jsonb_agg(jsonb_build_object('documentId',id,'validationId',validation_id,'version',version,'decision',effective_decision,'stale',validation_id is not null and decision='reviewed' and source_state<>state,'sourceState',state,'excludedPages',excluded_pages) order by id) from states),'[]'::jsonb),
 'facts',coalesce((select jsonb_agg(f order by f->>'itemId') from jsonb_array_elements(m->'facts')f where not exists(select 1 from states s where s.id=(f->>'documentId')::uuid and (s.effective_decision='excluded' or (s.decision='reviewed' and (f->>'page')::integer=any(s.excluded_pages))))),'[]'::jsonb),
 'coverage',(m->'coverage')||jsonb_build_object('pendingItems',coalesce((select sum((state->>'pendingItems')::integer) from states where effective_decision is null),0),'unresolvedDocuments',(select count(*) from states where effective_decision is null),'reviewedDocuments',(select count(*) from states where effective_decision='reviewed'),'excludedDocuments',(select count(*) from states where effective_decision='excluded'),'complete',not exists(select 1 from states where effective_decision is null))) from original
$$;
revoke all on function private.exam_summary_manifest(uuid,uuid),private.exam_summary_manifest_before_document_validation(uuid,uuid) from public,anon,authenticated,service_role;
