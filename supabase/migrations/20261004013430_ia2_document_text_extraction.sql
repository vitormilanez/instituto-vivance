-- IA2-A: immutable, page-addressable text extraction for synthetic exam
-- documents. This migration does not enqueue uploads automatically and does
-- not enable any provider or real-data processing path.

alter table public.processing_jobs
  drop constraint processing_jobs_job_type_check,
  add constraint processing_jobs_job_type_check check (
    job_type in ('audio_transcription', 'clinical_draft', 'exam_text_extraction')
  );

create or replace function private.enqueue_processing_job(
  target_tenant uuid,
  target_patient uuid,
  target_job_type text,
  source_key text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  result uuid;
  existing public.processing_jobs;
  normalized_key uuid;
begin
  if not private.has_tenant_role(target_tenant, array['doctor', 'nurse'])
    or not private.has_care_access(target_tenant, target_patient) then
    raise exception 'Active clinical care access required' using errcode = '42501';
  end if;
  if target_job_type not in (
      'audio_transcription',
      'clinical_draft',
      'exam_text_extraction'
    )
    or source_key is null
    or char_length(btrim(source_key)) not between 1 and 160
    or source_key ~ '[[:cntrl:]]' then
    raise exception 'Valid processing job required' using errcode = '23514';
  end if;
  begin
    normalized_key := btrim(source_key)::uuid;
  exception when invalid_text_representation then
    raise exception 'Opaque processing source reference required'
      using errcode = '23514';
  end;

  insert into public.processing_jobs(
    tenant_id,
    patient_id,
    job_type,
    idempotency_key,
    created_by
  ) values (
    target_tenant,
    target_patient,
    target_job_type,
    normalized_key::text,
    auth.uid()
  ) on conflict (tenant_id, idempotency_key)
    do nothing
  returning id into result;
  if result is not null then
    return result;
  end if;

  select * into existing
    from public.processing_jobs
    where tenant_id = target_tenant
      and idempotency_key = normalized_key::text;
  if existing.patient_id is distinct from target_patient
    or existing.job_type is distinct from target_job_type then
    raise exception 'Idempotency key belongs to another processing job'
      using errcode = '23514';
  end if;
  return existing.id;
end;
$$;
revoke all on function private.enqueue_processing_job(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function private.enqueue_processing_job(uuid, uuid, text, text)
  to authenticated;

alter table public.patient_documents
  add constraint patient_documents_extraction_identity
  unique (tenant_id, id, patient_id);

-- The temporary database is shared with the published app. No authenticated
-- caller may persist extracted text for a document until an operator has
-- explicitly registered that particular synthetic fixture. This private
-- allowlist starts empty and is never writable through the Data API.
create table private.synthetic_exam_pilot_documents (
  tenant_id uuid not null,
  document_id uuid not null,
  patient_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (tenant_id, document_id),
  foreign key (tenant_id, document_id, patient_id)
    references public.patient_documents(tenant_id, id, patient_id)
);
alter table private.synthetic_exam_pilot_documents enable row level security;
revoke all on private.synthetic_exam_pilot_documents from public, anon, authenticated;

create table public.document_extraction_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  patient_id uuid not null,
  document_id uuid not null,
  processing_job_id uuid,
  source_content_sha256 text not null
    check (source_content_sha256 ~ '^[0-9a-f]{64}$'),
  extractor_name text not null check (
    char_length(btrim(extractor_name)) between 1 and 120
    and extractor_name !~ '[[:cntrl:]]'
  ),
  extractor_version text not null check (
    char_length(btrim(extractor_version)) between 1 and 120
    and extractor_version !~ '[[:cntrl:]]'
  ),
  status text not null
    check (status in ('extracted', 'requires_review', 'failed')),
  failure_code text check (
    failure_code is null
    or (
      char_length(failure_code) between 1 and 64
      and failure_code ~ '^[a-z0-9_]+$'
    )
  ),
  page_count integer not null check (page_count between 0 and 1000),
  extracted_page_count integer not null check (extracted_page_count >= 0),
  review_page_count integer not null check (review_page_count >= 0),
  failed_page_count integer not null check (failed_page_count >= 0),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default clock_timestamp(),
  unique (tenant_id, id, patient_id, document_id),
  constraint document_extraction_runs_identity unique (
    tenant_id,
    document_id,
    source_content_sha256,
    extractor_name,
    extractor_version
  ),
  foreign key (tenant_id, document_id, patient_id)
    references public.patient_documents(tenant_id, id, patient_id),
  foreign key (tenant_id, created_by)
    references public.memberships(tenant_id, user_id),
  foreign key (tenant_id, processing_job_id, patient_id)
    references public.processing_jobs(tenant_id, id, patient_id),
  check (
    extracted_page_count + review_page_count + failed_page_count = page_count
  ),
  check (
    (status = 'extracted'
      and page_count > 0
      and extracted_page_count = page_count
      and review_page_count = 0
      and failed_page_count = 0
      and failure_code is null)
    or (status = 'requires_review'
      and page_count > 0
      and review_page_count + failed_page_count > 0
      and failed_page_count < page_count
      and failure_code is null)
    or (status = 'failed' and (
      (page_count = 0
        and extracted_page_count = 0
        and review_page_count = 0
        and failed_page_count = 0
        and failure_code is not null)
      or (page_count > 0
        and failed_page_count = page_count
        and failure_code is null)
    ))
  )
);

create index document_extraction_runs_patient_recent
  on public.document_extraction_runs(
    tenant_id,
    patient_id,
    created_at desc,
    id desc
  );
create index document_extraction_runs_document_recent
  on public.document_extraction_runs(
    tenant_id,
    document_id,
    created_at desc,
    id desc
  );

create table public.document_extracted_pages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  patient_id uuid not null,
  document_id uuid not null,
  extraction_run_id uuid not null,
  page_number integer not null check (page_number between 1 and 1000),
  status text not null
    check (status in ('extracted', 'requires_review', 'failed')),
  extraction_method text not null
    check (extraction_method in ('embedded_text', 'ocr', 'mixed', 'none')),
  extracted_text text,
  text_sha256 text check (
    text_sha256 is null or text_sha256 ~ '^[0-9a-f]{64}$'
  ),
  possible_duplicate_of_page integer,
  failure_code text check (
    failure_code is null
    or (
      char_length(failure_code) between 1 and 64
      and failure_code ~ '^[a-z0-9_]+$'
    )
  ),
  created_at timestamptz not null default clock_timestamp(),
  unique (extraction_run_id, page_number),
  foreign key (tenant_id, extraction_run_id, patient_id, document_id)
    references public.document_extraction_runs(
      tenant_id,
      id,
      patient_id,
      document_id
    ),
  check (extracted_text is null or octet_length(extracted_text) between 1 and 1000000),
  check (
    (extracted_text is null and text_sha256 is null)
    or (extracted_text is not null and text_sha256 is not null)
  ),
  check (
    possible_duplicate_of_page is null
    or (possible_duplicate_of_page between 1 and page_number - 1
      and status = 'requires_review'
      and extracted_text is not null)
  ),
  check (
    (status = 'extracted'
      and extraction_method <> 'none'
      and extracted_text is not null
      and failure_code is null)
    or (status = 'requires_review' and failure_code is null)
    or (status = 'failed'
      and extraction_method = 'none'
      and extracted_text is null
      and text_sha256 is null
      and failure_code is not null)
  )
);

create index document_extracted_pages_document_page
  on public.document_extracted_pages(
    tenant_id,
    document_id,
    extraction_run_id,
    page_number
  );

alter table public.document_extraction_runs enable row level security;
alter table public.document_extracted_pages enable row level security;
revoke all on table public.document_extraction_runs,
  public.document_extracted_pages from public, anon, authenticated;
grant select on table public.document_extraction_runs,
  public.document_extracted_pages to authenticated;

create policy document_extraction_runs_staff_read
  on public.document_extraction_runs for select to authenticated
  using (
    private.has_tenant_role(tenant_id, array['doctor', 'nurse'])
    and private.has_care_access(tenant_id, patient_id)
  );
create policy document_extracted_pages_staff_read
  on public.document_extracted_pages for select to authenticated
  using (
    private.has_tenant_role(tenant_id, array['doctor', 'nurse'])
    and private.has_care_access(tenant_id, patient_id)
  );

create function private.reject_document_extraction_mutation() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'Document extraction records are immutable'
    using errcode = '42501';
end;
$$;
revoke all on function private.reject_document_extraction_mutation()
  from public, anon, authenticated;
create trigger document_extraction_runs_immutable
  before update or delete on public.document_extraction_runs
  for each row execute function private.reject_document_extraction_mutation();
create trigger document_extracted_pages_immutable
  before update or delete on public.document_extracted_pages
  for each row execute function private.reject_document_extraction_mutation();

create function public.persist_document_text_extraction(
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
  actor uuid := auth.uid();
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
  if actor is null
    or not private.has_live_session()
    or not private.has_tenant_role(target_tenant, array['doctor']) then
    raise exception 'Active doctor session required' using errcode = '42501';
  end if;

  select * into document_row
    from public.patient_documents as document
    where document.tenant_id = target_tenant
      and document.id = target_document
      and document.status = 'available'
      and document.attached_to = 'documents';
  if not found
    or not private.has_care_access(document_row.tenant_id, document_row.patient_id) then
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
    actor
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
revoke all on function public.persist_document_text_extraction(
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  uuid
) from public, anon;
grant execute on function public.persist_document_text_extraction(
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  uuid
) to authenticated;

comment on table public.document_extraction_runs is
  'Immutable IA2-A extraction provenance. Synthetic pilot only until Gate P.';
comment on table public.document_extracted_pages is
  'Immutable per-page extracted text. Never exposed to patient accounts.';
comment on function public.persist_document_text_extraction(
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  uuid
) is
  'Doctor-only atomic and idempotent persistence for one complete extraction.';
