-- IA2-B: reviewable structured exam items for the synthetic pilot.
-- Items preserve literal source data and page provenance. Human decisions are
-- append-only and remain separate from extraction output.

alter table public.document_extracted_pages
  add constraint document_extracted_pages_item_source
  unique (id, extraction_run_id, page_number);

create table public.exam_result_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  patient_id uuid not null,
  document_id uuid not null,
  extraction_run_id uuid not null,
  source_page_id uuid not null,
  page_number integer not null check (page_number between 1 and 1000),
  item_index integer not null check (item_index between 1 and 10000),
  item_kind text not null check (item_kind in ('laboratory', 'narrative')),
  literal_name text not null check (
    char_length(btrim(literal_name)) between 1 and 240
    and literal_name !~ '[[:cntrl:]]'
  ),
  literal_value text check (
    literal_value is null or (
      char_length(btrim(literal_value)) between 1 and 500
      and literal_value !~ '[[:cntrl:]]'
    )
  ),
  numeric_value numeric,
  unit_text text check (
    unit_text is null or char_length(btrim(unit_text)) between 1 and 120
  ),
  reference_text text check (
    reference_text is null or char_length(btrim(reference_text)) between 1 and 1000
  ),
  issuer_flag text check (
    issuer_flag is null or issuer_flag in ('low', 'high', 'abnormal', 'normal', 'other')
  ),
  method_text text check (
    method_text is null or char_length(btrim(method_text)) between 1 and 500
  ),
  specimen_text text check (
    specimen_text is null or char_length(btrim(specimen_text)) between 1 and 240
  ),
  observed_on date,
  narrative_text text check (
    narrative_text is null or char_length(btrim(narrative_text)) between 1 and 12000
  ),
  source_excerpt text not null check (
    char_length(source_excerpt) between 1 and 12000
  ),
  source_excerpt_sha256 text not null check (
    source_excerpt_sha256 ~ '^[0-9a-f]{64}$'
  ),
  source_start integer not null check (source_start >= 0),
  source_end integer not null check (source_end > source_start),
  extraction_confidence numeric check (
    extraction_confidence is null or extraction_confidence between 0 and 1
  ),
  requires_review_reason text not null check (
    requires_review_reason in (
      'synthetic_pilot', 'ambiguous_value', 'ambiguous_unit',
      'ambiguous_reference', 'ambiguous_date', 'ambiguous_identity',
      'possible_duplicate', 'incomplete_source'
    )
  ),
  extractor_name text not null check (
    char_length(btrim(extractor_name)) between 1 and 120
  ),
  extractor_version text not null check (
    char_length(btrim(extractor_version)) between 1 and 120
  ),
  structured_content_sha256 text not null check (
    structured_content_sha256 ~ '^[0-9a-f]{64}$'
  ),
  created_at timestamptz not null default clock_timestamp(),
  unique (extraction_run_id, source_page_id, item_index),
  unique (tenant_id, id, patient_id),
  foreign key (tenant_id, extraction_run_id, patient_id, document_id)
    references public.document_extraction_runs(tenant_id, id, patient_id, document_id),
  foreign key (source_page_id, extraction_run_id, page_number)
    references public.document_extracted_pages(id, extraction_run_id, page_number),
  check (source_end - source_start = char_length(source_excerpt)),
  check (
    (item_kind = 'laboratory' and literal_value is not null and narrative_text is null)
    or (item_kind = 'narrative' and narrative_text is not null and numeric_value is null
      and unit_text is null and reference_text is null and issuer_flag is null)
  )
);

create index exam_result_items_patient_recent
  on public.exam_result_items(tenant_id, patient_id, observed_on desc nulls last, created_at desc);
create index exam_result_items_document_page
  on public.exam_result_items(tenant_id, document_id, page_number, item_index);

create table public.exam_result_item_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  patient_id uuid not null,
  item_id uuid not null,
  review_request_id uuid not null,
  version integer not null check (version > 0),
  decision text not null check (decision in ('confirmed', 'corrected', 'rejected')),
  corrected_data jsonb,
  note text check (note is null or char_length(btrim(note)) between 1 and 2000),
  reviewed_by uuid not null default auth.uid(),
  reviewed_at timestamptz not null default clock_timestamp(),
  unique (item_id, review_request_id),
  unique (item_id, version),
  foreign key (tenant_id, item_id, patient_id)
    references public.exam_result_items(tenant_id, id, patient_id),
  foreign key (tenant_id, reviewed_by)
    references public.memberships(tenant_id, user_id),
  check (
    (decision = 'corrected' and corrected_data is not null
      and jsonb_typeof(corrected_data) = 'object'
      and octet_length(corrected_data::text) between 2 and 16000)
    or (decision <> 'corrected' and corrected_data is null)
  ),
  check (decision <> 'rejected' or note is not null)
);

alter table public.exam_result_items enable row level security;
alter table public.exam_result_item_reviews enable row level security;
revoke all on public.exam_result_items, public.exam_result_item_reviews
  from public, anon, authenticated;
grant select on public.exam_result_items, public.exam_result_item_reviews to authenticated;

create policy exam_result_items_staff_read on public.exam_result_items
  for select to authenticated using (
    private.has_tenant_role(tenant_id, array['doctor', 'nurse'])
    and private.has_care_access(tenant_id, patient_id)
  );
create policy exam_result_item_reviews_staff_read on public.exam_result_item_reviews
  for select to authenticated using (
    private.has_tenant_role(tenant_id, array['doctor', 'nurse'])
    and private.has_care_access(tenant_id, patient_id)
  );

create trigger exam_result_items_immutable before update or delete
  on public.exam_result_items for each row
  execute function private.reject_document_extraction_mutation();
create trigger exam_result_item_reviews_immutable before update or delete
  on public.exam_result_item_reviews for each row
  execute function private.reject_document_extraction_mutation();

create function public.persist_synthetic_exam_result_items(
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
  if not found or not exists (
    select 1 from private.synthetic_exam_pilot_documents as pilot
    where pilot.tenant_id = run_row.tenant_id
      and pilot.document_id = run_row.document_id
      and pilot.patient_id = run_row.patient_id
  ) then
    raise exception 'Synthetic extraction run required' using errcode = '42501';
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

create function public.review_exam_result_item(
  target_tenant uuid,
  target_item uuid,
  target_review_request uuid,
  decision text,
  corrected_data jsonb default null,
  note text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  item_row public.exam_result_items;
  existing_review public.exam_result_item_reviews;
  result uuid;
begin
  if auth.uid() is null or not private.has_live_session()
    or not private.has_tenant_role(target_tenant, array['doctor']) then
    raise exception 'Active doctor session required' using errcode = '42501';
  end if;
  select * into item_row from public.exam_result_items as item
    where item.tenant_id = target_tenant and item.id = target_item;
  if not found or not private.has_care_access(target_tenant, item_row.patient_id) then
    raise exception 'Structured exam item with active care required' using errcode = '42501';
  end if;
  if decision = 'corrected' and (
    corrected_data is null or jsonb_typeof(corrected_data) <> 'object'
    or exists (
      select 1 from jsonb_object_keys(corrected_data) as key
      where key not in ('literal_name','literal_value','numeric_value','unit_text',
        'reference_text','issuer_flag','method_text','specimen_text','observed_on',
        'narrative_text')
    )
  ) then
    raise exception 'Corrections may only replace literal structured fields'
      using errcode = '23514';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(item_row.id::text, 0)
  );
  select review.* into existing_review
    from public.exam_result_item_reviews as review
    where review.item_id = item_row.id
      and review.review_request_id = target_review_request;
  if found then
    if existing_review.decision is distinct from decision
      or existing_review.corrected_data is distinct from corrected_data
      or existing_review.note is distinct from nullif(btrim(note), '')
      or existing_review.reviewed_by is distinct from auth.uid() then
      raise exception 'Review request already has different immutable content'
        using errcode = '23514';
    end if;
    return existing_review.id;
  end if;
  insert into public.exam_result_item_reviews(
    tenant_id, patient_id, item_id, review_request_id, version,
    decision, corrected_data, note, reviewed_by
  ) values (
    target_tenant, item_row.patient_id, item_row.id, target_review_request,
    coalesce((select max(review.version) + 1 from public.exam_result_item_reviews as review
      where review.item_id = item_row.id), 1),
    decision, corrected_data, nullif(btrim(note), ''), auth.uid()
  )
  returning id into result;
  return result;
end;
$$;

revoke all on function public.persist_synthetic_exam_result_items(uuid, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.persist_synthetic_exam_result_items(uuid, text, text, jsonb)
  to service_role;
revoke all on function public.review_exam_result_item(uuid, uuid, uuid, text, jsonb, text)
  from public, anon;
grant execute on function public.review_exam_result_item(uuid, uuid, uuid, text, jsonb, text)
  to authenticated;

comment on table public.exam_result_items is
  'Immutable synthetic IA2 extraction items with exact document/page/text provenance.';
comment on table public.exam_result_item_reviews is
  'Append-only doctor decisions; confirmation does not publish an item to a patient.';
