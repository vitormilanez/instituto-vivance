-- Resume only the responsible doctor's eligible synthetic exam job. The job
-- audit trigger records each actual transition; text, runs and checkpoints
-- remain immutable and are reused by the worker on the next claim.
create function public.resume_exam_extraction(
  target_tenant uuid, target_document uuid
) returns table (job_id uuid, status text, resumed boolean)
language plpgsql security definer set search_path = '' as $$
declare
  current_job public.processing_jobs;
  patient uuid;
begin
  if target_tenant is null or target_document is null
    or auth.uid() is null or not private.has_live_session()
    or not private.has_tenant_role(target_tenant, array['doctor']) then
    raise exception 'Active doctor session required' using errcode = '42501';
  end if;

  select document.patient_id into patient
    from public.patient_documents as document
    where document.tenant_id = target_tenant
      and document.id = target_document
      and document.status = 'available'
      and document.attached_to = 'documents';
  if not found or not private.has_care_access(target_tenant, patient)
    or not private.exam_ai_document_eligible(target_tenant, target_document, patient) then
    raise exception 'Active doctor care for an eligible exam required'
      using errcode = '42501';
  end if;

  select * into current_job from public.processing_jobs as job
    where job.tenant_id = target_tenant
      and job.patient_id = patient
      and job.job_type = 'exam_text_extraction'
      and job.idempotency_key = target_document::text
    for update;
  if not found then
    raise exception 'Exam extraction job not found' using errcode = 'P0002';
  end if;
  -- Existing worker persistence still requires the creator's live care link.
  -- A reassignment needs a separate, auditable ownership transfer contract.
  if current_job.created_by is distinct from auth.uid() then
    raise exception 'The doctor who started this exam must resume it'
      using errcode = '40001';
  end if;
  if current_job.status = 'completed' then
    raise exception 'Completed exam extraction cannot be resumed'
      using errcode = '40001';
  end if;

  if current_job.status = 'failed'
    or (current_job.status = 'processing'
      and current_job.lease_expires_at <= clock_timestamp()) then
    update public.processing_jobs as job
      set status = 'pending', attempt_count = 0,
          available_at = clock_timestamp(),
          lease_token = null, lease_expires_at = null,
          completed_at = null, failed_at = null, last_error_code = null
      where job.id = current_job.id;
    return query select current_job.id, 'pending'::text, true;
  else
    return query select current_job.id, current_job.status, false;
  end if;
end;
$$;
revoke all on function public.resume_exam_extraction(uuid, uuid)
  from public, anon, service_role;
grant execute on function public.resume_exam_extraction(uuid, uuid)
  to authenticated;

-- A voluntary pause releases the current service lease and refunds exactly
-- the claim that opened it. Real failures still use the bounded failure path.
create function public.continue_exam_text_extraction_job(
  target_job uuid, target_lease uuid
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  current_job public.processing_jobs;
begin
  if auth.jwt()->>'role' is distinct from 'service_role'
    or target_job is null or target_lease is null then
    raise exception 'Active service lease required' using errcode = '42501';
  end if;
  select * into current_job from public.processing_jobs as job
    where job.id = target_job
      and job.job_type = 'exam_text_extraction'
    for update;
  if not found or current_job.status <> 'processing'
    or current_job.lease_token is distinct from target_lease
    or current_job.lease_expires_at <= clock_timestamp() then
    raise exception 'Active exam extraction lease required'
      using errcode = '42501';
  end if;
  update public.processing_jobs as job
    set status = 'pending',
        attempt_count = greatest(job.attempt_count - 1, 0),
        available_at = clock_timestamp(),
        lease_token = null, lease_expires_at = null,
        completed_at = null, failed_at = null, last_error_code = null
    where job.id = current_job.id;
  return true;
end;
$$;
revoke all on function public.continue_exam_text_extraction_job(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.continue_exam_text_extraction_job(uuid, uuid)
  to service_role;

comment on function public.resume_exam_extraction(uuid, uuid) is
  'Responsible doctor resumes a failed or expired eligible exam job in place; audited state change preserves source and run history.';
comment on function public.continue_exam_text_extraction_job(uuid, uuid) is
  'Service worker voluntarily releases an active exam lease and refunds its claim attempt for continuation.';

-- The old item/metadata writers checked only that some lease was active. An
-- expired worker could therefore write under a newer worker's lease. Keep
-- their implementation as owner-only helpers and expose one fenced entrypoint.
create function public.persist_queued_exam_ai_extraction(
  target_run uuid,
  target_job uuid,
  target_lease uuid,
  structured_extractor_name text,
  structured_extractor_version text,
  items jsonb,
  metadata jsonb
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  current_job public.processing_jobs;
  run_row public.document_extraction_runs;
begin
  if auth.jwt()->>'role' is distinct from 'service_role'
    or target_run is null or target_job is null or target_lease is null then
    raise exception 'Active service lease required' using errcode = '42501';
  end if;

  -- This row lock serializes final writes with resume/continuation/completion.
  select * into current_job from public.processing_jobs as job
    where job.id = target_job and job.job_type = 'exam_text_extraction'
    for update;
  if not found or current_job.status <> 'processing'
    or current_job.lease_token is distinct from target_lease
    or current_job.lease_expires_at <= clock_timestamp() then
    raise exception 'Active exam extraction lease required'
      using errcode = '42501';
  end if;

  select * into run_row from public.document_extraction_runs as run
    where run.id = target_run
      and run.processing_job_id = current_job.id
      and run.tenant_id = current_job.tenant_id
      and run.patient_id = current_job.patient_id
      and run.document_id::text = current_job.idempotency_key
      and run.status in ('extracted', 'requires_review');
  if not found or not private.exam_ai_document_eligible(
    run_row.tenant_id, run_row.document_id, run_row.patient_id
  ) then
    raise exception 'Matching eligible exam run required' using errcode = '42501';
  end if;

  if metadata is null then
    -- The deterministic synthetic fixture has no Claude metadata bundle.
    if structured_extractor_name is distinct from 'vivance-synthetic-fixture'
      or structured_extractor_version is distinct from '1'
      or not exists (
        select 1 from private.synthetic_exam_pilot_documents as pilot
        where pilot.tenant_id = run_row.tenant_id
          and pilot.patient_id = run_row.patient_id
          and pilot.document_id = run_row.document_id
      ) then
      raise exception 'Pilot fixture contract required' using errcode = '42501';
    end if;
    return public.persist_synthetic_exam_result_items(
      target_run, structured_extractor_name, structured_extractor_version, items
    );
  end if;
  return public.persist_exam_ai_extraction(
    target_run, structured_extractor_name, structured_extractor_version,
    items, metadata
  );
end;
$$;

revoke all on function public.persist_queued_exam_ai_extraction(
  uuid, uuid, uuid, text, text, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.persist_queued_exam_ai_extraction(
  uuid, uuid, uuid, text, text, jsonb, jsonb
) to service_role;

-- No direct service caller may bypass the lease token check above.
revoke execute on function public.persist_exam_ai_extraction(uuid, text, text, jsonb, jsonb),
  public.persist_exam_result_items(uuid, text, text, jsonb),
  public.persist_exam_document_metadata(uuid, jsonb),
  public.persist_synthetic_exam_result_items(uuid, text, text, jsonb)
  from service_role;

comment on function public.persist_queued_exam_ai_extraction(
  uuid, uuid, uuid, text, text, jsonb, jsonb
) is 'Service-only final exam write fenced by the active job lease token; null metadata is restricted to deterministic pilot fixtures.';
