-- Keep privileged Supabase credentials out of the web app. The Preview worker
-- runs under the doctor's live session and may touch only that doctor's own
-- queued, allowlisted synthetic document.
create function private.authorized_synthetic_exam_job(
  target_tenant uuid,
  target_document uuid
) returns public.processing_jobs
language plpgsql security definer set search_path = '' as $$
declare
  result public.processing_jobs;
begin
  if auth.uid() is null or not private.has_live_session()
    or not private.has_tenant_role(target_tenant, array['doctor']) then
    raise exception 'Active doctor session required' using errcode = '42501';
  end if;
  select job.* into result
    from public.processing_jobs as job
    join public.patient_documents as document
      on document.tenant_id = job.tenant_id
     and document.patient_id = job.patient_id
     and document.id = target_document
    join private.synthetic_exam_pilot_documents as pilot
      on pilot.tenant_id = job.tenant_id
     and pilot.patient_id = job.patient_id
     and pilot.document_id = document.id
    where job.tenant_id = target_tenant
      and job.idempotency_key = target_document::text
      and job.job_type = 'exam_text_extraction'
      and job.created_by = auth.uid()
      and document.status = 'available'
      and document.attached_to = 'documents'
      and document.content_type = 'application/pdf'
    for update of job;
  if not found or not private.has_care_access(target_tenant, result.patient_id) then
    raise exception 'Active doctor care for a queued synthetic PDF required'
      using errcode = '42501';
  end if;
  return result;
end;
$$;
revoke all on function private.authorized_synthetic_exam_job(uuid, uuid)
  from public, anon, authenticated, service_role;

create function public.claim_doctor_exam_text_extraction_job(
  target_tenant uuid,
  target_document uuid
) returns table (job_id uuid, tenant_id uuid, patient_id uuid,
  document_id uuid, attempt_count integer, max_attempts integer,
  lease_token uuid)
language plpgsql security definer set search_path = '' as $$
declare
  current_job public.processing_jobs;
begin
  current_job := private.authorized_synthetic_exam_job(target_tenant, target_document);
  if current_job.status = 'processing'
    and current_job.lease_expires_at <= clock_timestamp() then
    update public.processing_jobs as job
      set status = case when job.attempt_count >= job.max_attempts then 'failed' else 'pending' end,
          lease_token = null, lease_expires_at = null,
          available_at = case when job.attempt_count >= job.max_attempts then job.available_at else clock_timestamp() end,
          failed_at = case when job.attempt_count >= job.max_attempts then clock_timestamp() else null end,
          completed_at = null, last_error_code = 'timeout', updated_at = clock_timestamp()
      where job.id = current_job.id;
  end if;
  return query
  update public.processing_jobs as job
    set status = 'processing', attempt_count = job.attempt_count + 1,
        last_started_at = clock_timestamp(), lease_token = gen_random_uuid(),
        lease_expires_at = clock_timestamp() + interval '5 minutes',
        completed_at = null, failed_at = null, last_error_code = null,
        updated_at = clock_timestamp()
    where job.id = current_job.id and job.status = 'pending'
      and job.available_at <= clock_timestamp()
    returning job.id, job.tenant_id, job.patient_id,
      job.idempotency_key::uuid, job.attempt_count, job.max_attempts,
      job.lease_token;
end;
$$;

create function public.persist_doctor_exam_text_extraction(
  target_job uuid, target_lease uuid, target_tenant uuid, target_document uuid,
  source_content_sha256 text, extractor_name text, extractor_version text,
  pages jsonb, failure_code text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  current_job public.processing_jobs;
begin
  current_job := private.authorized_synthetic_exam_job(target_tenant, target_document);
  if current_job.id is distinct from target_job
    or current_job.status <> 'processing'
    or current_job.lease_token is distinct from target_lease
    or current_job.lease_expires_at <= clock_timestamp() then
    raise exception 'Active exam extraction lease required' using errcode = '42501';
  end if;
  return private.persist_document_text_extraction_core(
    auth.uid(), target_tenant, target_document, source_content_sha256,
    extractor_name, extractor_version, pages, failure_code, target_job
  );
end;
$$;

create function public.complete_doctor_exam_text_extraction_job(
  target_tenant uuid, target_document uuid, target_job uuid, target_lease uuid
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  current_job public.processing_jobs;
begin
  current_job := private.authorized_synthetic_exam_job(target_tenant, target_document);
  if current_job.id is distinct from target_job then
    raise exception 'Matching exam job required' using errcode = '42501';
  end if;
  return private.complete_processing_job(target_job, target_lease);
end;
$$;

create function public.fail_doctor_exam_text_extraction_job(
  target_tenant uuid, target_document uuid, target_job uuid, target_lease uuid,
  failure_code text
) returns table (status text, available_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  current_job public.processing_jobs;
  response jsonb;
begin
  current_job := private.authorized_synthetic_exam_job(target_tenant, target_document);
  if current_job.id is distinct from target_job then
    raise exception 'Matching exam job required' using errcode = '42501';
  end if;
  response := private.fail_processing_job(target_job, target_lease, failure_code);
  return query select response->>'status', (response->>'available_at')::timestamptz;
end;
$$;

revoke all on function public.claim_doctor_exam_text_extraction_job(uuid, uuid),
  public.persist_doctor_exam_text_extraction(uuid, uuid, uuid, uuid, text, text, text, jsonb, text),
  public.complete_doctor_exam_text_extraction_job(uuid, uuid, uuid, uuid),
  public.fail_doctor_exam_text_extraction_job(uuid, uuid, uuid, uuid, text)
  from public, anon, service_role;
grant execute on function public.claim_doctor_exam_text_extraction_job(uuid, uuid),
  public.persist_doctor_exam_text_extraction(uuid, uuid, uuid, uuid, text, text, text, jsonb, text),
  public.complete_doctor_exam_text_extraction_job(uuid, uuid, uuid, uuid),
  public.fail_doctor_exam_text_extraction_job(uuid, uuid, uuid, uuid, text)
  to authenticated;
