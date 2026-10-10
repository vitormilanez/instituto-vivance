-- IA2 synthetic pilot: bind a queued job to one allowlisted document and
-- process only exam extraction jobs. No automatic upload enqueue or real-data path.

create function private.persist_document_text_extraction_core(
  target_actor uuid,
  target_tenant uuid,
  target_document uuid,
  source_content_sha256 text,
  extractor_name text,
  extractor_version text,
  pages jsonb,
  failure_code text default null,
  target_processing_job uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  document_row public.patient_documents;
  job_row public.processing_jobs;
  page jsonb;
  normalized_pages jsonb := '[]'::jsonb;
  stored_pages jsonb;
  normalized_source_hash text := lower(btrim(source_content_sha256));
  normalized_extractor_name text := btrim(extractor_name);
  normalized_extractor_version text := btrim(extractor_version);
  normalized_failure_code text := btrim(failure_code);
  page_status text;
  page_method text;
  page_text text;
  page_text_hash text;
  page_possible_duplicate integer;
  page_failure_code text;
  page_number_value integer;
  page_count_value integer;
  extracted_count integer := 0;
  review_count integer := 0;
  failed_count integer := 0;
  run_status text;
  result uuid;
  existing public.document_extraction_runs;
begin
  select * into document_row
    from public.patient_documents as document
    where document.tenant_id = target_tenant
      and document.id = target_document
      and document.status = 'available'
      and document.attached_to = 'documents';
  if not found then
    raise exception 'Available document with active care access required'
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from private.synthetic_exam_pilot_documents as pilot
    where pilot.tenant_id = document_row.tenant_id
      and pilot.document_id = document_row.id
      and pilot.patient_id = document_row.patient_id
  ) then
    raise exception 'Only registered synthetic pilot documents can be extracted'
      using errcode = '42501';
  end if;

  if normalized_source_hash is null
    or normalized_source_hash !~ '^[0-9a-f]{64}$'
    or normalized_extractor_name is null
    or char_length(normalized_extractor_name) not between 1 and 120
    or normalized_extractor_name ~ '[[:cntrl:]]'
    or normalized_extractor_version is null
    or char_length(normalized_extractor_version) not between 1 and 120
    or normalized_extractor_version ~ '[[:cntrl:]]'
    or pages is null
    or jsonb_typeof(pages) <> 'array'
    or jsonb_array_length(pages) not between 0 and 1000
    or (normalized_failure_code is not null and (
      char_length(normalized_failure_code) not between 1 and 64
      or normalized_failure_code !~ '^[a-z0-9_]+$'
    )) then
    raise exception 'Valid extraction provenance and pages required'
      using errcode = '23514';
  end if;

  if target_processing_job is not null then
    select * into job_row
      from public.processing_jobs as job
      where job.tenant_id = target_tenant
        and job.id = target_processing_job
        and job.patient_id = document_row.patient_id
        and job.job_type = 'exam_text_extraction';
    if not found then
      raise exception 'Matching exam extraction job required'
        using errcode = '23514';
    end if;
  end if;

  page_count_value := jsonb_array_length(pages);
  if (page_count_value = 0 and normalized_failure_code is null)
    or (page_count_value > 0 and normalized_failure_code is not null) then
    raise exception 'Run failure requires zero pages and a controlled failure code'
      using errcode = '23514';
  end if;

  for page in select value from jsonb_array_elements(pages)
  loop
    if jsonb_typeof(page) <> 'object'
      or exists (
        select 1
        from jsonb_object_keys(page) as input_key
        where input_key not in (
          'page_number',
          'status',
          'extraction_method',
          'extracted_text',
          'text_sha256',
          'possible_duplicate_of_page',
          'failure_code'
        )
      ) then
      raise exception 'Valid extraction page object required'
        using errcode = '23514';
    end if;

    begin
      page_number_value := (page->>'page_number')::integer;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Valid extraction page number required'
        using errcode = '23514';
    end;
    page_status := page->>'status';
    page_method := page->>'extraction_method';
    page_text := page->>'extracted_text';
    page_text_hash := lower(page->>'text_sha256');
    begin
      page_possible_duplicate := (page->>'possible_duplicate_of_page')::integer;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Valid possible duplicate page required'
        using errcode = '23514';
    end;
    page_failure_code := page->>'failure_code';

    if page_number_value is null
      or page_number_value not between 1 and page_count_value
      or page_status is null
      or page_status not in ('extracted', 'requires_review', 'failed')
      or page_method is null
      or page_method not in ('embedded_text', 'ocr', 'mixed', 'none')
      or (page_text is not null and octet_length(page_text) not between 1 and 1000000)
      or ((page_text is null) <> (page_text_hash is null))
      or (page_text_hash is not null and (
        page_text_hash !~ '^[0-9a-f]{64}$'
        or page_text_hash <> encode(sha256(convert_to(page_text, 'UTF8')), 'hex')
      ))
      or (page_failure_code is not null and (
        char_length(page_failure_code) not between 1 and 64
        or page_failure_code !~ '^[a-z0-9_]+$'
      ))
      or (page_possible_duplicate is not null and (
        page_possible_duplicate not between 1 and page_number_value - 1
        or page_status <> 'requires_review'
        or page_text is null
      ))
      or (page_status = 'extracted' and (
        page_method = 'none'
        or page_text is null
        or page_failure_code is not null
      ))
      or (page_status = 'requires_review' and page_failure_code is not null)
      or (page_status = 'failed' and (
        page_method <> 'none'
        or page_text is not null
        or page_text_hash is not null
        or page_failure_code is null
      )) then
      raise exception 'Invalid extraction page state' using errcode = '23514';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(normalized_pages) as recorded(value)
      where (recorded.value->>'page_number')::integer = page_number_value
    ) then
      raise exception 'Duplicate extraction page number' using errcode = '23514';
    end if;

    normalized_pages := normalized_pages || jsonb_build_array(jsonb_build_object(
      'page_number', page_number_value,
      'status', page_status,
      'extraction_method', page_method,
      'extracted_text', page_text,
      'text_sha256', page_text_hash,
      'possible_duplicate_of_page', page_possible_duplicate,
      'failure_code', page_failure_code
    ));
    extracted_count := extracted_count + (page_status = 'extracted')::integer;
    review_count := review_count + (page_status = 'requires_review')::integer;
    failed_count := failed_count + (page_status = 'failed')::integer;
  end loop;

  select coalesce(
      jsonb_agg(value order by (value->>'page_number')::integer),
      '[]'::jsonb
    )
    into normalized_pages
    from jsonb_array_elements(normalized_pages);

  run_status := case
    when page_count_value = 0 then 'failed'
    when failed_count = page_count_value then 'failed'
    when review_count + failed_count > 0 then 'requires_review'
    else 'extracted'
  end;

  insert into public.document_extraction_runs(
    tenant_id,
    patient_id,
    document_id,
    processing_job_id,
    source_content_sha256,
    extractor_name,
    extractor_version,
    status,
    failure_code,
    page_count,
    extracted_page_count,
    review_page_count,
    failed_page_count,
    created_by
  ) values (
    document_row.tenant_id,
    document_row.patient_id,
    document_row.id,
    target_processing_job,
    normalized_source_hash,
    normalized_extractor_name,
    normalized_extractor_version,
    run_status,
    normalized_failure_code,
    page_count_value,
    extracted_count,
    review_count,
    failed_count,
    target_actor
  ) on conflict on constraint document_extraction_runs_identity do nothing
  returning id into result;

  if result is null then
    select * into existing
      from public.document_extraction_runs as run
      where run.tenant_id = document_row.tenant_id
        and run.document_id = document_row.id
        and run.source_content_sha256 = normalized_source_hash
        and run.extractor_name = normalized_extractor_name
        and run.extractor_version = normalized_extractor_version
      for update;
    select coalesce(jsonb_agg(
        jsonb_build_object(
          'page_number', stored.page_number,
          'status', stored.status,
          'extraction_method', stored.extraction_method,
          'extracted_text', stored.extracted_text,
          'text_sha256', stored.text_sha256,
          'possible_duplicate_of_page', stored.possible_duplicate_of_page,
          'failure_code', stored.failure_code
        ) order by stored.page_number
      ), '[]'::jsonb) into stored_pages
      from public.document_extracted_pages as stored
      where stored.extraction_run_id = existing.id;
    if existing.patient_id is distinct from document_row.patient_id
      or existing.processing_job_id is distinct from target_processing_job
      or existing.status is distinct from run_status
      or existing.failure_code is distinct from normalized_failure_code
      or existing.page_count is distinct from page_count_value
      or existing.extracted_page_count is distinct from extracted_count
      or existing.review_page_count is distinct from review_count
      or existing.failed_page_count is distinct from failed_count
      or stored_pages is distinct from normalized_pages then
      raise exception 'Extraction identity already has different immutable content'
        using errcode = '23514';
    end if;
    return existing.id;
  end if;

  insert into public.document_extracted_pages(
    tenant_id,
    patient_id,
    document_id,
    extraction_run_id,
    page_number,
    status,
    extraction_method,
    extracted_text,
    text_sha256,
    possible_duplicate_of_page,
    failure_code
  )
  select
    document_row.tenant_id,
    document_row.patient_id,
    document_row.id,
    result,
    (input.value->>'page_number')::integer,
    input.value->>'status',
    input.value->>'extraction_method',
    input.value->>'extracted_text',
    input.value->>'text_sha256',
    (input.value->>'possible_duplicate_of_page')::integer,
    input.value->>'failure_code'
  from jsonb_array_elements(normalized_pages) as input(value);

  return result;
end;
$$;

revoke all on function private.persist_document_text_extraction_core(
  uuid, uuid, uuid, text, text, text, jsonb, text, uuid
) from public, anon, authenticated, service_role;

-- Preserve the existing doctor RPC contract while centralizing page validation.
create or replace function public.persist_document_text_extraction(
  target_tenant uuid,
  target_document uuid,
  source_content_sha256 text,
  extractor_name text,
  extractor_version text,
  pages jsonb,
  failure_code text default null,
  target_processing_job uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  target_patient uuid;
begin
  if auth.uid() is null
    or not private.has_live_session()
    or not private.has_tenant_role(target_tenant, array['doctor']) then
    raise exception 'Active doctor session required' using errcode = '42501';
  end if;
  select document.patient_id into target_patient
    from public.patient_documents as document
    where document.tenant_id = target_tenant
      and document.id = target_document
      and document.status = 'available'
      and document.attached_to = 'documents';
  if not found or not private.has_care_access(target_tenant, target_patient) then
    raise exception 'Available document with active care access required'
      using errcode = '42501';
  end if;
  return private.persist_document_text_extraction_core(
    auth.uid(), target_tenant, target_document, source_content_sha256,
    extractor_name, extractor_version, pages, failure_code, target_processing_job
  );
end;
$$;
revoke all on function public.persist_document_text_extraction(
  uuid, uuid, text, text, text, jsonb, text, uuid
) from public, anon;
grant execute on function public.persist_document_text_extraction(
  uuid, uuid, text, text, text, jsonb, text, uuid
) to authenticated;

-- The producer checks the live doctor relationship and the operator-managed
-- private allowlist before creating an opaque document-keyed job.
create function public.enqueue_synthetic_exam_text_extraction(
  target_tenant uuid,
  target_document uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  target_patient uuid;
begin
  if auth.uid() is null
    or not private.has_live_session()
    or not private.has_tenant_role(target_tenant, array['doctor']) then
    raise exception 'Active doctor session required' using errcode = '42501';
  end if;
  select document.patient_id into target_patient
    from public.patient_documents as document
    where document.tenant_id = target_tenant
      and document.id = target_document
      and document.status = 'available'
      and document.attached_to = 'documents'
      and document.content_type = 'application/pdf';
  if not found or not private.has_care_access(target_tenant, target_patient)
    or not exists (
      select 1 from private.synthetic_exam_pilot_documents as pilot
      where pilot.tenant_id = target_tenant
        and pilot.document_id = target_document
        and pilot.patient_id = target_patient
    ) then
    raise exception 'Allowlisted synthetic PDF with active doctor care required'
      using errcode = '42501';
  end if;
  return private.enqueue_processing_job(
    target_tenant, target_patient, 'exam_text_extraction', target_document::text
  );
end;
$$;
revoke all on function public.enqueue_synthetic_exam_text_extraction(uuid, uuid)
  from public, anon;
grant execute on function public.enqueue_synthetic_exam_text_extraction(uuid, uuid)
  to authenticated;

-- Generic claims can pick unrelated future work. This claim is limited to the
-- exam job type and keeps the same short lease and bounded retry contract.
create function public.claim_next_exam_text_extraction_job()
returns table (
  job_id uuid,
  tenant_id uuid,
  patient_id uuid,
  document_id uuid,
  attempt_count integer,
  max_attempts integer,
  lease_token uuid
)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  perform private.recover_expired_processing_jobs();
  return query
  with candidate as (
    select job.id
      from public.processing_jobs as job
      where job.job_type = 'exam_text_extraction'
        and job.status = 'pending'
        and job.available_at <= clock_timestamp()
      order by job.available_at, job.created_at, job.id
      for update skip locked
      limit 1
  )
  update public.processing_jobs as job
    set status = 'processing',
        attempt_count = job.attempt_count + 1,
        last_started_at = clock_timestamp(),
        lease_token = gen_random_uuid(),
        lease_expires_at = clock_timestamp() + interval '5 minutes',
        completed_at = null,
        failed_at = null,
        last_error_code = null,
        updated_at = clock_timestamp()
    from candidate
    where job.id = candidate.id and job.status = 'pending'
  returning job.id, job.tenant_id, job.patient_id,
    job.idempotency_key::uuid, job.attempt_count, job.max_attempts,
    job.lease_token;
end;
$$;
revoke all on function public.claim_next_exam_text_extraction_job()
  from public, anon, authenticated;
grant execute on function public.claim_next_exam_text_extraction_job()
  to service_role;

-- A service worker may persist only while holding the current lease. The
-- doctor who queued it must still have active clinic membership and care.
create function public.persist_queued_document_text_extraction(
  target_job uuid,
  target_lease uuid,
  target_tenant uuid,
  target_document uuid,
  source_content_sha256 text,
  extractor_name text,
  extractor_version text,
  pages jsonb,
  failure_code text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  job_row public.processing_jobs;
  target_patient uuid;
begin
  if auth.jwt()->>'role' is distinct from 'service_role'
    or target_job is null or target_lease is null then
    raise exception 'Active service lease required' using errcode = '42501';
  end if;
  select * into job_row from public.processing_jobs as job
    where job.id = target_job
      and job.tenant_id = target_tenant
      and job.job_type = 'exam_text_extraction'
      and job.idempotency_key = target_document::text
      and job.status = 'processing'
      and job.lease_token = target_lease
      and job.lease_expires_at > clock_timestamp()
    for update;
  if not found then
    raise exception 'Active exam extraction lease required'
      using errcode = '42501';
  end if;
  select document.patient_id into target_patient
    from public.patient_documents as document
    where document.tenant_id = target_tenant
      and document.id = target_document
      and document.patient_id = job_row.patient_id
      and document.status = 'available'
      and document.attached_to = 'documents';
  if not found or not exists (
    select 1 from public.memberships as membership
      join public.tenants as tenant on tenant.id = membership.tenant_id
      join public.care_relationships as care
        on care.tenant_id = membership.tenant_id
       and care.professional_id = membership.user_id
       and care.patient_id = target_patient
    where membership.tenant_id = target_tenant
      and membership.user_id = job_row.created_by
      and membership.role = 'doctor'
      and membership.status = 'active'
      and tenant.status = 'active'
      and care.status = 'active'
  ) then
    raise exception 'Active doctor care required for queued extraction'
      using errcode = '42501';
  end if;
  return private.persist_document_text_extraction_core(
    job_row.created_by, target_tenant, target_document, source_content_sha256,
    extractor_name, extractor_version, pages, failure_code, target_job
  );
end;
$$;
revoke all on function public.persist_queued_document_text_extraction(
  uuid, uuid, uuid, uuid, text, text, text, jsonb, text
) from public, anon, authenticated;
grant execute on function public.persist_queued_document_text_extraction(
  uuid, uuid, uuid, uuid, text, text, text, jsonb, text
) to service_role;

comment on function public.enqueue_synthetic_exam_text_extraction(uuid, uuid) is
  'Doctor-only producer for an operator-allowlisted synthetic PDF.';
comment on function public.claim_next_exam_text_extraction_job() is
  'Service-role-only claim of one exam extraction job with a five-minute lease.';
comment on function public.persist_queued_document_text_extraction(
  uuid, uuid, uuid, uuid, text, text, text, jsonb, text
) is
  'Service-role-only persistence for the active exam job lease and care relationship.';
