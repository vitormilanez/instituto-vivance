-- Keep immutable extracted facts and append-only reviews. The new RPC stores a
-- cumulative correction snapshot so omitted fields retain earlier corrections.
alter table public.exam_result_item_reviews add column request_corrections jsonb;

-- Keep the existing six-argument function callable until the web deployment
-- has moved to the versioned contract.
create function public.review_exam_result_item_versioned(
  target_tenant uuid,
  target_item uuid,
  target_review_request uuid,
  decision text,
  corrected_data jsonb,
  note text,
  expected_version integer
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  item_row public.exam_result_items;
  existing_review public.exam_result_item_reviews;
  last_version integer;
  previous_corrections jsonb;
  next_corrections jsonb;
  field text;
  field_value text;
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
  if target_review_request is null or expected_version is null or expected_version < 0
    or decision not in ('confirmed', 'corrected', 'rejected')
    or (note is not null and (char_length(btrim(note)) not between 1 and 2000
      or pg_catalog.translate(note, pg_catalog.chr(10) || pg_catalog.chr(13) || pg_catalog.chr(9), '') ~ '[[:cntrl:]]'))
    or (decision = 'rejected' and nullif(btrim(note), '') is null)
    or (decision <> 'corrected' and corrected_data is not null) then
    raise exception 'Valid versioned review required' using errcode = '23514';
  end if;
  if decision = 'corrected' then
    if corrected_data is null or jsonb_typeof(corrected_data) <> 'object'
      or corrected_data = '{}'::jsonb
      or exists (
        select 1 from jsonb_object_keys(corrected_data) as key
        where key not in ('literal_value','narrative_text','unit_text',
          'reference_text','observed_on')
          or (item_row.item_kind = 'narrative'
            and key in ('literal_value','unit_text','reference_text'))
          or (item_row.item_kind = 'laboratory' and key = 'narrative_text')
      ) then
      raise exception 'Valid structured field corrections required' using errcode = '23514';
    end if;
    for field, field_value in select key, value from jsonb_each_text(corrected_data) loop
      if jsonb_typeof(corrected_data->field) not in ('string', 'null') then
        raise exception 'Corrected fields must be text or null' using errcode = '23514';
      end if;
      if (field_value is null and field in ('literal_value','narrative_text'))
        or (field_value is not null and (
          char_length(btrim(field_value)) < 1
          or (case when field in ('narrative_text', 'reference_text')
            then pg_catalog.translate(field_value, pg_catalog.chr(10) || pg_catalog.chr(13) || pg_catalog.chr(9), '') ~ '[[:cntrl:]]'
            else field_value ~ '[[:cntrl:]]' end)
          or char_length(field_value) > case field
            when 'literal_value' then 500
            when 'narrative_text' then 12000
            when 'unit_text' then 120
            when 'reference_text' then 1000
            else 10 end)) then
        raise exception 'Invalid corrected field value' using errcode = '23514';
      end if;
      if field = 'observed_on' and field_value is not null then
        if field_value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          or pg_catalog.to_char(pg_catalog.to_date(field_value, 'YYYY-MM-DD'), 'YYYY-MM-DD') <> field_value then
          raise exception 'Valid calendar date required' using errcode = '23514';
        end if;
      end if;
    end loop;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(item_row.id::text, 0)
  );
  select coalesce(max(review.version), 0) into last_version
    from public.exam_result_item_reviews as review where review.item_id = item_row.id;
  select review.corrected_data into previous_corrections
    from public.exam_result_item_reviews as review
    where review.item_id = item_row.id and review.decision = 'corrected'
    order by review.version desc limit 1;
  next_corrections := case when decision = 'corrected'
    then coalesce(previous_corrections, '{}'::jsonb) || corrected_data
    else null end;
  select review.* into existing_review
    from public.exam_result_item_reviews as review
    where review.item_id = item_row.id
      and review.review_request_id = target_review_request;
  if found then
    if existing_review.decision is distinct from decision
      or existing_review.note is distinct from nullif(btrim(note), '')
      or existing_review.reviewed_by is distinct from auth.uid()
      or (coalesce(existing_review.request_corrections, existing_review.corrected_data)
        is distinct from corrected_data) then
      raise exception 'Review request already has different immutable content'
        using errcode = '23514';
    end if;
    return existing_review.id;
  end if;
  if last_version <> expected_version then
    raise exception 'Review version changed' using errcode = '40001';
  end if;
  insert into public.exam_result_item_reviews(
    tenant_id, patient_id, item_id, review_request_id, version,
    decision, corrected_data, request_corrections, note, reviewed_by
  ) values (
    target_tenant, item_row.patient_id, item_row.id, target_review_request,
    last_version + 1, decision, next_corrections, corrected_data,
    nullif(btrim(note), ''), auth.uid()
  ) returning id into result;
  return result;
end;
$$;

revoke all on function public.review_exam_result_item_versioned(uuid, uuid, uuid, text, jsonb, text, integer)
  from public, anon;
grant execute on function public.review_exam_result_item_versioned(uuid, uuid, uuid, text, jsonb, text, integer)
  to authenticated;
