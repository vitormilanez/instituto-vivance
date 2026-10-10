-- Private, immutable provider responses for resumable synthetic IA2 batches.
-- Grounding and final item/metadata persistence remain a separate step.
-- Literal labels and values may contain line layout from the saved PDF text.
alter table public.exam_result_items
  drop constraint exam_result_items_literal_name_check,
  add constraint exam_result_items_literal_name_check check (
    char_length(literal_name) between 1 and 240
    and char_length(btrim(regexp_replace(literal_name, '[[:space:]]+', ' ', 'g'))) > 0
    and translate(literal_name, chr(9) || chr(10) || chr(13), '') !~ '[[:cntrl:]]'
  ),
  drop constraint exam_result_items_literal_value_check,
  add constraint exam_result_items_literal_value_check check (
    literal_value is null or (
      char_length(literal_value) between 1 and 500
      and char_length(btrim(regexp_replace(literal_value, '[[:space:]]+', ' ', 'g'))) > 0
      and translate(literal_value, chr(9) || chr(10) || chr(13), '') !~ '[[:cntrl:]]'
    )
  );

create table public.exam_extraction_batch_checkpoints (
  extraction_run_id uuid not null references public.document_extraction_runs(id),
  prompt_version text not null check (
    char_length(btrim(prompt_version)) between 1 and 120
    and prompt_version !~ '[[:cntrl:]]'
  ),
  batch_key text not null check (batch_key ~ '^[0-9a-f]{64}$'),
  page_numbers jsonb not null check (
    jsonb_typeof(page_numbers) = 'array'
    and jsonb_array_length(page_numbers) between 1 and 5
  ),
  result jsonb not null check (
    jsonb_typeof(result) = 'object'
    and octet_length(result::text) <= 1000000
  ),
  created_at timestamptz not null default clock_timestamp(),
  primary key (extraction_run_id, prompt_version, batch_key)
);

alter table public.exam_extraction_batch_checkpoints enable row level security;
revoke all on public.exam_extraction_batch_checkpoints
  from public, anon, authenticated, service_role;
grant select on public.exam_extraction_batch_checkpoints to service_role;
create trigger exam_extraction_batch_checkpoints_immutable
  before update or delete on public.exam_extraction_batch_checkpoints
  for each row execute function private.reject_document_extraction_mutation();

create function public.save_exam_extraction_batch_checkpoint(
  target_run uuid,
  target_job uuid,
  target_lease uuid,
  p_prompt_version text,
  p_batch_key text,
  p_page_numbers jsonb,
  p_result jsonb
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  run_row public.document_extraction_runs;
  page_number_value integer;
  previous_number integer := 0;
  page_entry jsonb;
  page_numbers_seen integer := 0;
  existing public.exam_extraction_batch_checkpoints;
begin
  if auth.jwt()->>'role' is distinct from 'service_role'
    or target_run is null or target_job is null or target_lease is null then
    raise exception 'Active service lease required' using errcode = '42501';
  end if;
  if p_prompt_version is null or char_length(btrim(p_prompt_version)) not between 1 and 120
    or p_prompt_version ~ '[[:cntrl:]]'
    or p_batch_key is null or p_batch_key !~ '^[0-9a-f]{64}$' then
    raise exception 'Valid batch identity required' using errcode = '23514';
  end if;
  if p_page_numbers is null or jsonb_typeof(p_page_numbers) <> 'array'
    or jsonb_array_length(p_page_numbers) not between 1 and 5 then
    raise exception 'One to five source pages required' using errcode = '23514';
  end if;
  if p_result is null or jsonb_typeof(p_result) <> 'object'
    or octet_length(p_result::text) > 1000000 then
    raise exception 'Bounded Claude result required' using errcode = '23514';
  end if;
  if jsonb_typeof(p_result->'pages') is distinct from 'array'
    or jsonb_array_length(p_result->'pages') <> jsonb_array_length(p_page_numbers)
    or jsonb_typeof(p_result->'metadata') is distinct from 'object'
    or exists (select 1 from jsonb_object_keys(p_result) as key
      where key not in ('pages', 'metadata')) then
    raise exception 'Complete batch result required' using errcode = '23514';
  end if;

  select * into run_row from public.document_extraction_runs as run
    where run.id = target_run and run.status in ('extracted', 'requires_review')
      and run.processing_job_id = target_job;
  if not found or not private.exam_ai_document_eligible(
    run_row.tenant_id, run_row.document_id, run_row.patient_id
  ) or not exists (
    select 1 from public.processing_jobs as job
    where job.id = target_job and job.tenant_id = run_row.tenant_id
      and job.patient_id = run_row.patient_id
      and job.job_type = 'exam_text_extraction'
      and job.idempotency_key = run_row.document_id::text
      and job.status = 'processing' and job.lease_token = target_lease
      and job.lease_expires_at > clock_timestamp()
  ) then
    raise exception 'Eligible run with active matching lease required'
      using errcode = '42501';
  end if;

  for page_entry in select value from jsonb_array_elements(p_page_numbers) loop
    if jsonb_typeof(page_entry) <> 'number'
      or page_entry::text !~ '^[0-9]{1,4}$' then
      raise exception 'Integer source page numbers required' using errcode = '23514';
    end if;
    page_number_value := (page_entry::text)::integer;
    if page_number_value <= previous_number or page_number_value > run_row.page_count
      or not exists (select 1 from public.document_extracted_pages as page
        where page.extraction_run_id = target_run
          and page.page_number = page_number_value) then
      raise exception 'Ordered distinct run pages required' using errcode = '23514';
    end if;
    previous_number := page_number_value;
    page_numbers_seen := page_numbers_seen + 1;
  end loop;

  for page_entry in select value from jsonb_array_elements(p_result->'pages') loop
    if jsonb_typeof(page_entry) <> 'object'
      or jsonb_typeof(page_entry->'page_number') is distinct from 'number'
      or (page_entry->'page_number')::text !~ '^[0-9]{1,4}$'
      or jsonb_typeof(page_entry->'items') is distinct from 'array'
      or jsonb_array_length(page_entry->'items') > 100
      or not (page_entry ? 'source_text')
      or jsonb_typeof(page_entry->'source_text') not in ('null', 'string')
      or (jsonb_typeof(page_entry->'source_text') = 'string'
        and char_length(page_entry->>'source_text') > 80000)
      or exists (select 1 from jsonb_object_keys(page_entry) as key
        where key not in ('page_number', 'source_text', 'items')) then
      raise exception 'Valid bounded page result required' using errcode = '23514';
    end if;
    page_number_value := (page_entry->>'page_number')::integer;
    if not p_page_numbers @> jsonb_build_array(page_number_value)
      or exists (select 1 from jsonb_array_elements(page_entry->'items') as item(value)
        where jsonb_typeof(item.value) <> 'object') then
      raise exception 'Result pages and items must match the source batch'
        using errcode = '23514';
    end if;
  end loop;
  if (select count(distinct (page->>'page_number')::integer)
      from jsonb_array_elements(p_result->'pages') as page) <> page_numbers_seen then
    raise exception 'Each source page requires exactly one result'
      using errcode = '23514';
  end if;

  insert into public.exam_extraction_batch_checkpoints(
    extraction_run_id, prompt_version, batch_key, page_numbers, result
  ) values (target_run, p_prompt_version, p_batch_key, p_page_numbers, p_result)
  on conflict on constraint exam_extraction_batch_checkpoints_pkey do nothing;
  if found then return true; end if;
  select * into existing from public.exam_extraction_batch_checkpoints as checkpoint
    where checkpoint.extraction_run_id = target_run
      and checkpoint.prompt_version = p_prompt_version
      and checkpoint.batch_key = p_batch_key for update;
  if existing.page_numbers is distinct from p_page_numbers
    or existing.result is distinct from p_result then
    raise exception 'Batch identity already has different immutable content'
      using errcode = '23514';
  end if;
  return true;
end;
$$;

revoke all on function public.save_exam_extraction_batch_checkpoint(
  uuid, uuid, uuid, text, text, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.save_exam_extraction_batch_checkpoint(
  uuid, uuid, uuid, text, text, jsonb, jsonb
) to service_role;
