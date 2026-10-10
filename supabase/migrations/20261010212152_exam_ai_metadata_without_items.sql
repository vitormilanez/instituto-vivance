-- A grounded extraction may contain no result items while still providing
-- extractive document context and quality notes for clinician review.
-- Keep the combined write atomic and retain the metadata RPC's eligibility
-- and live-lease checks for the empty-array case.
create or replace function public.persist_exam_ai_extraction(
  target_run uuid,
  structured_extractor_name text,
  structured_extractor_version text,
  items jsonb,
  metadata jsonb
) returns integer language plpgsql security definer set search_path = '' as $$
declare inserted_count integer := 0;
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  if items is null or jsonb_typeof(items) <> 'array'
    or jsonb_array_length(items) > 1000 then
    raise exception 'Valid structured item array required' using errcode = '23514';
  end if;
  if jsonb_array_length(items) > 0 then
    inserted_count := public.persist_exam_result_items(
      target_run, structured_extractor_name, structured_extractor_version, items);
  end if;
  perform public.persist_exam_document_metadata(target_run, metadata);
  return inserted_count;
end;
$$;
revoke all on function public.persist_exam_ai_extraction(uuid, text, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.persist_exam_ai_extraction(uuid, text, text, jsonb, jsonb)
  to service_role;
