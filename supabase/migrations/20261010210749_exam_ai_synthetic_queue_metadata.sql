-- Synthetic-only IA2 expansion. Registration is an operator action with a
-- service credential; no patient is enrolled by uploading a document.
create table private.exam_ai_test_patients (
  tenant_id uuid not null,
  patient_id uuid not null,
  registered_at timestamptz not null default clock_timestamp(),
  primary key (tenant_id, patient_id),
  foreign key (tenant_id, patient_id) references public.patients(tenant_id, id)
);
alter table private.exam_ai_test_patients enable row level security;
revoke all on private.exam_ai_test_patients from public, anon, authenticated;

create function public.register_exam_ai_test_patient(target_tenant uuid, target_patient uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  insert into private.exam_ai_test_patients(tenant_id, patient_id)
    values(target_tenant, target_patient) on conflict do nothing;
  return true;
end;
$$;
revoke all on function public.register_exam_ai_test_patient(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.register_exam_ai_test_patient(uuid, uuid)
  to service_role;

create function private.exam_ai_document_eligible(
  target_tenant uuid, target_document uuid, target_patient uuid
) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.patient_documents as document
    where document.tenant_id = target_tenant
      and document.id = target_document
      and document.patient_id = target_patient
      and document.status = 'available'
      and document.attached_to = 'documents'
      and document.category in ('exam', 'clinical_document')
      and document.content_type in ('application/pdf', 'image/jpeg', 'image/png')
      and (
        exists (select 1 from private.synthetic_exam_pilot_documents as pilot
          where pilot.tenant_id = target_tenant and pilot.patient_id = target_patient
            and pilot.document_id = target_document)
        or (
          exists (select 1 from private.exam_ai_test_patients as qa
            where qa.tenant_id = target_tenant and qa.patient_id = target_patient)
          and (
            document.visibility = 'shared'
            or exists (
              select 1 from public.patient_profile_context_submissions as submission
              where submission.tenant_id = target_tenant
                and submission.patient_id = target_patient
                and submission.section = 'exams'
                and submission.payload->>'status' = 'shared'
                and submission.payload->'documentIds' ? target_document::text
            )
          )
        )
      )
  );
$$;
revoke all on function private.exam_ai_document_eligible(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;

-- The existing worker requires a doctor creator with a live care relationship.
-- Choose one deterministically for patient uploads; no browser session is needed.
create function private.enqueue_eligible_exam_document(
  target_tenant uuid, target_document uuid, target_patient uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid; existing public.processing_jobs; doctor_id uuid;
begin
  if not private.exam_ai_document_eligible(target_tenant, target_document, target_patient) then
    return null;
  end if;
  select membership.user_id into doctor_id
    from public.memberships as membership
    join public.tenants as tenant on tenant.id = membership.tenant_id
    join public.care_relationships as care
      on care.tenant_id = membership.tenant_id
     and care.professional_id = membership.user_id
     and care.patient_id = target_patient
    where membership.tenant_id = target_tenant
      and membership.role = 'doctor' and membership.status = 'active'
      and tenant.status = 'active' and care.status = 'active'
    order by membership.user_id limit 1;
  if doctor_id is null then return null; end if;
  insert into public.processing_jobs(
    tenant_id, patient_id, job_type, idempotency_key, created_by
  ) values (
    target_tenant, target_patient, 'exam_text_extraction',
    target_document::text, doctor_id
  ) on conflict (tenant_id, idempotency_key) do nothing returning id into result;
  if result is not null then return result; end if;
  select * into existing from public.processing_jobs as job
    where job.tenant_id = target_tenant and job.idempotency_key = target_document::text;
  if existing.patient_id is distinct from target_patient
    or existing.job_type is distinct from 'exam_text_extraction' then
    raise exception 'Document key belongs to another job' using errcode = '23514';
  end if;
  return existing.id;
end;
$$;
revoke all on function private.enqueue_eligible_exam_document(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;

create function public.enqueue_exam_extraction(target_tenant uuid, target_document uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare document_row public.patient_documents; result uuid;
begin
  if auth.uid() is null or not private.has_live_session() then
    raise exception 'Active session required' using errcode = '42501';
  end if;
  select * into document_row from public.patient_documents as document
    where document.tenant_id = target_tenant and document.id = target_document;
  if not found or not private.exam_ai_document_eligible(
      target_tenant, target_document, document_row.patient_id)
    or not (
      (private.has_tenant_role(target_tenant, array['doctor'])
        and private.has_care_access(target_tenant, document_row.patient_id))
      or (private.has_tenant_role(target_tenant, array['patient'])
        and exists (select 1 from public.patient_accounts as account
          where account.tenant_id = target_tenant
            and account.patient_id = document_row.patient_id
            and account.user_id = auth.uid()))
    ) then
    raise exception 'Shared synthetic exam with active access required'
      using errcode = '42501';
  end if;
  result := private.enqueue_eligible_exam_document(
    target_tenant, target_document, document_row.patient_id);
  if result is null then
    raise exception 'Active linked doctor required' using errcode = '42501';
  end if;
  return result;
end;
$$;
revoke all on function public.enqueue_exam_extraction(uuid, uuid) from public, anon;
grant execute on function public.enqueue_exam_extraction(uuid, uuid) to authenticated;

create function private.auto_enqueue_exam_document() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.enqueue_eligible_exam_document(new.tenant_id, new.id, new.patient_id);
  return null;
end;
$$;
revoke all on function private.auto_enqueue_exam_document()
  from public, anon, authenticated, service_role;
create trigger patient_documents_exam_ai_available
  after update of status on public.patient_documents for each row
  when (new.status = 'available' and old.status is distinct from 'available'
    and new.attached_to = 'documents')
  execute function private.auto_enqueue_exam_document();

create function private.auto_enqueue_submitted_profile_exams() returns trigger
language plpgsql security definer set search_path = '' as $$
declare document_id uuid;
begin
  if new.section = 'exams' and new.payload->>'status' = 'shared' then
    for document_id in select value::uuid
      from jsonb_array_elements_text(new.payload->'documentIds') as entry(value)
    loop
      perform private.enqueue_eligible_exam_document(
        new.tenant_id, document_id, new.patient_id);
    end loop;
  end if;
  return null;
end;
$$;
revoke all on function private.auto_enqueue_submitted_profile_exams()
  from public, anon, authenticated, service_role;
create trigger patient_profile_exams_ai_submitted
  after insert on public.patient_profile_context_submissions for each row
  when (new.section = 'exams')
  execute function private.auto_enqueue_submitted_profile_exams();

alter table public.exam_result_items drop constraint exam_result_items_requires_review_reason_check;
alter table public.exam_result_items add constraint exam_result_items_requires_review_reason_check
  check (requires_review_reason in (
    'synthetic_pilot', 'ambiguous_value', 'ambiguous_unit',
    'ambiguous_reference', 'ambiguous_date', 'ambiguous_identity',
    'possible_duplicate', 'incomplete_source', 'ai_extraction', 'ambiguous_source'
  ));

alter table public.document_extracted_pages
  drop constraint document_extracted_pages_extraction_method_check,
  add constraint document_extracted_pages_extraction_method_check
    check (extraction_method in ('embedded_text', 'ocr', 'mixed', 'none', 'claude_vision'));

-- Supersede the old allowlist predicate while preserving all page/state/hash checks.
create or replace function private.persist_document_text_extraction_core(
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
  if not private.exam_ai_document_eligible(
    document_row.tenant_id, document_row.id, document_row.patient_id
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
      or page_method not in ('embedded_text', 'ocr', 'mixed', 'none', 'claude_vision')
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

-- Same immutable item contract, extended to registered synthetic QA patients.
create function public.persist_exam_result_items(
  target_run uuid,
  structured_extractor_name text,
  structured_extractor_version text,
  items jsonb
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  run_row public.document_extraction_runs;
  item jsonb;
  page_row public.document_extracted_pages;
  excerpt text;
  start_offset integer;
  end_offset integer;
  inserted_count integer := 0;
  item_inserted boolean;
  existing_hash text;
  input_hash text;
begin
  if auth.jwt()->>'role' is distinct from 'service_role'
    or items is null or jsonb_typeof(items) <> 'array'
    or jsonb_array_length(items) not between 1 and 1000
    or char_length(btrim(structured_extractor_name)) not between 1 and 120
    or char_length(btrim(structured_extractor_version)) not between 1 and 120 then
    raise exception 'Valid synthetic structured extraction required' using errcode = '23514';
  end if;
  select * into run_row from public.document_extraction_runs as run
    where run.id = target_run and run.status in ('extracted', 'requires_review');
  if not found or not private.exam_ai_document_eligible(
    run_row.tenant_id, run_row.document_id, run_row.patient_id
  ) then
    raise exception 'Synthetic extraction run required' using errcode = '42501';
  end if;
  if run_row.processing_job_id is not null and not exists (
    select 1 from public.processing_jobs job
    where job.id = run_row.processing_job_id
      and job.tenant_id = run_row.tenant_id and job.patient_id = run_row.patient_id
      and job.status = 'processing' and job.lease_expires_at > clock_timestamp()
  ) then
    raise exception 'Active claimed extraction job required' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(run_row.id::text, 0)
  );
  if (select count(*) from public.exam_result_items existing
      where existing.extraction_run_id = target_run) +
    (select count(*) from jsonb_array_elements(items) as incoming(value)
      where not exists (select 1 from public.exam_result_items existing
        where existing.extraction_run_id = target_run
          and existing.source_page_id = (incoming.value->>'source_page_id')::uuid
          and existing.item_index = (incoming.value->>'item_index')::integer)) > 1000 then
    raise exception 'Extraction run may contain at most 1000 items' using errcode = '23514';
  end if;

  for item in select value from jsonb_array_elements(items) loop
    if jsonb_typeof(item) <> 'object' or exists (
      select 1 from jsonb_object_keys(item) as key
      where key not in ('source_page_id','page_number','item_index','item_kind',
        'literal_name','literal_value','numeric_value','unit_text','reference_text',
        'issuer_flag','method_text','specimen_text','observed_on','narrative_text',
        'source_excerpt','source_start','source_end','extraction_confidence',
        'requires_review_reason')
    ) then
      raise exception 'Valid structured item object required' using errcode = '23514';
    end if;
    begin
      select * into page_row from public.document_extracted_pages as page
        where page.id = (item->>'source_page_id')::uuid
          and page.extraction_run_id = run_row.id
          and page.page_number = (item->>'page_number')::integer
          and page.extracted_text is not null;
      start_offset := (item->>'source_start')::integer;
      end_offset := (item->>'source_end')::integer;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Valid page provenance required' using errcode = '23514';
    end;
    excerpt := item->>'source_excerpt';
    input_hash := encode(sha256(convert_to(item::text, 'UTF8')), 'hex');
    if not found or start_offset < 0 or end_offset <= start_offset
      or excerpt is null or char_length(excerpt) <> end_offset - start_offset
      or substring(page_row.extracted_text from start_offset + 1 for end_offset - start_offset) <> excerpt then
      raise exception 'Exact source excerpt provenance required' using errcode = '23514';
    end if;

    insert into public.exam_result_items(
      tenant_id, patient_id, document_id, extraction_run_id, source_page_id,
      page_number, item_index, item_kind, literal_name, literal_value,
      numeric_value, unit_text, reference_text, issuer_flag, method_text,
      specimen_text, observed_on, narrative_text, source_excerpt,
      source_excerpt_sha256, source_start, source_end, extraction_confidence,
      requires_review_reason, extractor_name, extractor_version,
      structured_content_sha256
    ) values (
      run_row.tenant_id, run_row.patient_id, run_row.document_id, run_row.id,
      page_row.id, page_row.page_number, (item->>'item_index')::integer,
      item->>'item_kind', item->>'literal_name', item->>'literal_value',
      (item->>'numeric_value')::numeric, item->>'unit_text', item->>'reference_text',
      item->>'issuer_flag', item->>'method_text', item->>'specimen_text',
      (item->>'observed_on')::date, item->>'narrative_text', excerpt,
      encode(sha256(convert_to(excerpt, 'UTF8')), 'hex'), start_offset, end_offset,
      (item->>'extraction_confidence')::numeric, item->>'requires_review_reason',
      btrim(structured_extractor_name), btrim(structured_extractor_version), input_hash
    ) on conflict (extraction_run_id, source_page_id, item_index) do nothing;
    item_inserted := found;
    if item_inserted then
      inserted_count := inserted_count + 1;
    else
      select existing.structured_content_sha256 into existing_hash
        from public.exam_result_items as existing
        where existing.extraction_run_id = run_row.id
          and existing.source_page_id = page_row.id
          and existing.item_index = (item->>'item_index')::integer;
      if existing_hash is distinct from input_hash then
        raise exception 'Structured item identity already has different immutable content'
          using errcode = '23514';
      end if;
    end if;
  end loop;
  return inserted_count;
end;
$$;

revoke all on function public.persist_exam_result_items(uuid, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.persist_exam_result_items(uuid, text, text, jsonb)
  to service_role;

create table public.exam_document_metadata (
  extraction_run_id uuid primary key,
  tenant_id uuid not null,
  patient_id uuid not null,
  document_id uuid not null,
  document_type text not null check (char_length(btrim(document_type)) between 1 and 120),
  title text not null check (char_length(btrim(title)) between 1 and 240),
  issuer text check (issuer is null or char_length(btrim(issuer)) between 1 and 240),
  observed_on date,
  identity_text text check (identity_text is null or char_length(btrim(identity_text)) between 1 and 2000),
  summary jsonb not null check (jsonb_typeof(summary) = 'array' and jsonb_array_length(summary) <= 50),
  quality_notes jsonb not null check (jsonb_typeof(quality_notes) = 'array' and jsonb_array_length(quality_notes) <= 50),
  model text not null check (char_length(btrim(model)) between 1 and 160),
  prompt_version text not null check (char_length(btrim(prompt_version)) between 1 and 120),
  input_tokens integer check (input_tokens is null or input_tokens between 0 and 10000000),
  output_tokens integer check (output_tokens is null or output_tokens between 0 and 10000000),
  created_at timestamptz not null default clock_timestamp(),
  foreign key (tenant_id, extraction_run_id, patient_id, document_id)
    references public.document_extraction_runs(tenant_id, id, patient_id, document_id),
  check (octet_length(summary::text) <= 16000 and octet_length(quality_notes::text) <= 16000)
);

create function private.valid_exam_note_array(value jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(value) = 'array' and jsonb_array_length(value) <= 50
    and not exists (select 1 from jsonb_array_elements(value) as entry(item)
      where jsonb_typeof(entry.item) <> 'string'
        or char_length(btrim(entry.item #>> '{}')) not between 1 and 1000), false);
$$;
alter table public.exam_document_metadata
  add constraint exam_document_metadata_summary_valid
    check (private.valid_exam_note_array(summary)),
  add constraint exam_document_metadata_quality_notes_valid
    check (private.valid_exam_note_array(quality_notes));
alter table public.exam_document_metadata enable row level security;
revoke all on public.exam_document_metadata from public, anon, authenticated;
grant select on public.exam_document_metadata to authenticated;
create policy exam_document_metadata_staff_read on public.exam_document_metadata
  for select to authenticated using (
    private.has_tenant_role(tenant_id, array['doctor', 'nurse'])
    and private.has_care_access(tenant_id, patient_id)
  );
create trigger exam_document_metadata_immutable before update or delete
  on public.exam_document_metadata for each row
  execute function private.reject_document_extraction_mutation();

create function public.persist_exam_document_metadata(target_run uuid, metadata jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare run_row public.document_extraction_runs; existing public.exam_document_metadata;
begin
  if auth.jwt()->>'role' is distinct from 'service_role'
    or metadata is null or jsonb_typeof(metadata) <> 'object'
    or exists (select 1 from jsonb_object_keys(metadata) as key
      where key not in ('document_type','title','issuer','observed_on',
        'identity_text','summary','quality_notes','model','prompt_version',
        'input_tokens','output_tokens')) then
    raise exception 'Valid service metadata required' using errcode = '23514';
  end if;
  select * into run_row from public.document_extraction_runs as run
    where run.id = target_run and run.status in ('extracted', 'requires_review');
  if not found or not private.exam_ai_document_eligible(
    run_row.tenant_id, run_row.document_id, run_row.patient_id) then
    raise exception 'Synthetic extraction run required' using errcode = '42501';
  end if;
  if run_row.processing_job_id is not null and not exists (
    select 1 from public.processing_jobs job
    where job.id = run_row.processing_job_id
      and job.tenant_id = run_row.tenant_id and job.patient_id = run_row.patient_id
      and job.status = 'processing' and job.lease_expires_at > clock_timestamp()
  ) then
    raise exception 'Active claimed extraction job required' using errcode = '42501';
  end if;
  insert into public.exam_document_metadata(
    extraction_run_id, tenant_id, patient_id, document_id,
    document_type, title, issuer, observed_on, identity_text,
    summary, quality_notes, model, prompt_version, input_tokens, output_tokens
  ) values (
    run_row.id, run_row.tenant_id, run_row.patient_id, run_row.document_id,
    metadata->>'document_type', metadata->>'title', metadata->>'issuer',
    (metadata->>'observed_on')::date, metadata->>'identity_text',
    metadata->'summary', metadata->'quality_notes', metadata->>'model',
    metadata->>'prompt_version', (metadata->>'input_tokens')::integer,
    (metadata->>'output_tokens')::integer
  ) on conflict (extraction_run_id) do nothing;
  if found then return run_row.id; end if;
  select * into existing from public.exam_document_metadata as saved
    where saved.extraction_run_id = run_row.id;
  if (existing.document_type, existing.title, existing.issuer, existing.observed_on,
      existing.identity_text, existing.summary, existing.quality_notes,
      existing.model, existing.prompt_version, existing.input_tokens,
      existing.output_tokens) is distinct from
     (metadata->>'document_type', metadata->>'title', metadata->>'issuer',
      (metadata->>'observed_on')::date, metadata->>'identity_text',
      metadata->'summary', metadata->'quality_notes', metadata->>'model',
      metadata->>'prompt_version', (metadata->>'input_tokens')::integer,
      (metadata->>'output_tokens')::integer) then
    raise exception 'Metadata identity has different immutable content'
      using errcode = '23514';
  end if;
  return run_row.id;
end;
$$;
revoke all on function public.persist_exam_document_metadata(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.persist_exam_document_metadata(uuid, jsonb)
  to service_role;

-- A single statement commits items and metadata together. A worker retry can
-- observe metadata as the completion marker without risking partial items.
create function public.persist_exam_ai_extraction(
  target_run uuid,
  structured_extractor_name text,
  structured_extractor_version text,
  items jsonb,
  metadata jsonb
) returns integer language plpgsql security definer set search_path = '' as $$
declare inserted_count integer;
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  inserted_count := public.persist_exam_result_items(
    target_run, structured_extractor_name, structured_extractor_version, items);
  perform public.persist_exam_document_metadata(target_run, metadata);
  return inserted_count;
end;
$$;
revoke all on function public.persist_exam_ai_extraction(uuid, text, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.persist_exam_ai_extraction(uuid, text, text, jsonb, jsonb)
  to service_role;
