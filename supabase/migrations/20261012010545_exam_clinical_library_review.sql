-- Clinical sources are entered as drafts and activated explicitly by a doctor.
-- This migration never approves or seeds medical content.
alter table public.exam_clinical_library_versions
  add column created_at timestamptz not null default now(),
  add column created_by uuid references auth.users(id),
  add column client_request_id uuid;
create unique index exam_library_request_unique
  on public.exam_clinical_library_versions(tenant_id, created_by, client_request_id)
  where client_request_id is not null;

create table public.exam_clinical_library_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  source_id uuid not null references public.exam_clinical_library_versions(id),
  actor_id uuid not null references auth.users(id),
  decision text not null check (decision in ('created','approved','withdrawn')),
  note text not null,
  created_at timestamptz not null default now()
);
alter table public.exam_clinical_library_events enable row level security;
revoke all on public.exam_clinical_library_events from public, anon, authenticated;
grant select on public.exam_clinical_library_events to service_role;
create index exam_library_events_source_idx on public.exam_clinical_library_events(tenant_id,source_id,created_at);

create function public.get_exam_clinical_library(target_tenant uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.has_live_session()
    or not private.has_tenant_role(target_tenant,array['doctor']) then
    raise exception 'Active doctor required' using errcode='42501';
  end if;
  return coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at desc,s.id)
    from public.exam_clinical_library_versions s where s.tenant_id=target_tenant),'[]'::jsonb);
end;
$$;

create function public.create_exam_clinical_source(
  target_tenant uuid, target_request uuid, source_data jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare source_id uuid; rules jsonb;
begin
  if auth.uid() is null or not private.has_live_session()
    or not private.has_tenant_role(target_tenant,array['doctor']) then
    raise exception 'Active doctor required' using errcode='42501';
  end if;
  if target_request is null or jsonb_typeof(source_data) is distinct from 'object' then
    raise exception 'Source required' using errcode='22023';
  end if;
  select id into source_id from public.exam_clinical_library_versions
    where tenant_id=target_tenant and created_by=auth.uid() and client_request_id=target_request;
  if found then return source_id; end if;
  rules := source_data->'applicability';
  if jsonb_typeof(rules) is distinct from 'object'
    or jsonb_typeof(rules->'analytes') is distinct from 'array'
    or jsonb_typeof(rules->'units') is distinct from 'array'
    or jsonb_typeof(rules->'referencePositions') is distinct from 'array'
    or jsonb_typeof(rules->'requiredContext') is distinct from 'array' then
    raise exception 'Explicit applicability required' using errcode='22023';
  end if;
  if jsonb_array_length(rules->'analytes') < 1 or jsonb_array_length(rules->'analytes') > 30
    or jsonb_array_length(rules->'units') < 1 or jsonb_array_length(rules->'units') > 20
    or jsonb_array_length(rules->'referencePositions') < 1
    or jsonb_array_length(rules->'referencePositions') > 3
    or exists(select 1 from jsonb_array_elements_text(rules->'referencePositions') r(value)
      where value not in ('above','below','within')) then
    raise exception 'Invalid applicability' using errcode='22023';
  end if;
  if exists(select 1 from jsonb_array_elements(rules->'analytes') r(value)
      where jsonb_typeof(value)<>'string' or char_length(btrim(value#>>'{}')) not between 1 and 200)
    or exists(select 1 from jsonb_array_elements(rules->'units') r(value)
      where jsonb_typeof(value)<>'string' or char_length(btrim(value#>>'{}')) not between 1 and 200)
    or exists(select 1 from jsonb_array_elements(rules->'requiredContext') r(value)
      where jsonb_typeof(value)<>'string' or char_length(btrim(value#>>'{}')) not between 1 and 200)
    or (rules ? 'minAge' and (jsonb_typeof(rules->'minAge')<>'number'
      or (rules->>'minAge')::numeric not between 0 and 130
      or trunc((rules->>'minAge')::numeric)<>(rules->>'minAge')::numeric))
    or (rules ? 'maxAge' and (jsonb_typeof(rules->'maxAge')<>'number'
      or (rules->>'maxAge')::numeric not between 0 and 130
      or trunc((rules->>'maxAge')::numeric)<>(rules->>'maxAge')::numeric))
    or (rules ? 'minAge' and rules ? 'maxAge' and (rules->>'minAge')::numeric > (rules->>'maxAge')::numeric)
    or jsonb_array_length(rules->'requiredContext') > 30
    or exists(select 1 from jsonb_object_keys(rules) k(value)
      where value not in ('analytes','units','referencePositions','requiredContext','minAge','maxAge')) then
    raise exception 'Invalid source population or context' using errcode='22023';
  end if;
  if nullif(btrim(source_data->>'title'),'') is null
    or char_length(source_data->>'title') > 200
    or nullif(btrim(source_data->>'version'),'') is null
    or char_length(source_data->>'version') > 100
    or char_length(btrim(coalesce(source_data->>'excerpt',''))) not between 20 and 6000
    or char_length(btrim(coalesce(source_data->>'population',''))) not between 3 and 1000
    or char_length(btrim(coalesce(source_data->>'exclusions',''))) not between 3 and 1000
    or char_length(coalesce(source_data->>'url','')) > 1500
    or coalesce(source_data->>'url','') !~ '^https://[^[:space:]]+$' then
    raise exception 'Incomplete source' using errcode='22023';
  end if;
  insert into public.exam_clinical_library_versions(
    tenant_id,source_title,source_url,source_version,excerpt,population,exclusions,
    applicability,status,valid_until,created_by,client_request_id
  ) values(
    target_tenant,btrim(source_data->>'title'),source_data->>'url',btrim(source_data->>'version'),
    btrim(source_data->>'excerpt'),btrim(source_data->>'population'),btrim(source_data->>'exclusions'),
    rules,'in_review',nullif(source_data->>'validUntil','')::date,auth.uid(),target_request
  ) on conflict (tenant_id,created_by,client_request_id) where client_request_id is not null
    do nothing returning id into source_id;
  if source_id is null then
    select id into source_id from public.exam_clinical_library_versions
      where tenant_id=target_tenant and created_by=auth.uid() and client_request_id=target_request;
    return source_id;
  end if;
  insert into public.exam_clinical_library_events(tenant_id,source_id,actor_id,decision,note)
    values(target_tenant,source_id,auth.uid(),'created','Fonte cadastrada para revisão');
  return source_id;
end;
$$;

create function public.review_exam_clinical_source(
  target_tenant uuid,target_source uuid,target_status text,review_note text
) returns boolean language plpgsql security definer set search_path = '' as $$
declare source_row public.exam_clinical_library_versions;
begin
  if auth.uid() is null or not private.has_live_session()
    or not private.has_tenant_role(target_tenant,array['doctor']) then
    raise exception 'Active doctor required' using errcode='42501';
  end if;
  if target_status not in ('current','superseded') or char_length(btrim(coalesce(review_note,''))) not between 10 and 1000 then
    raise exception 'Review and justification required' using errcode='22023';
  end if;
  select * into source_row from public.exam_clinical_library_versions
    where tenant_id=target_tenant and id=target_source for update;
  if not found then raise exception 'Source not available' using errcode='42501'; end if;
  if source_row.status=target_status then return false; end if;
  if target_status='current' and (source_row.status <> 'in_review'
    or source_row.valid_until is null or source_row.valid_until <= now()) then
    raise exception 'Source is withdrawn or expired; create a new version' using errcode='40001';
  end if;
  update public.exam_clinical_library_versions set status=target_status,
    approved_by=case when target_status='current' then auth.uid() else approved_by end,
    reviewed_at=now() where tenant_id=target_tenant and id=target_source;
  insert into public.exam_clinical_library_events(tenant_id,source_id,actor_id,decision,note)
    values(target_tenant,target_source,auth.uid(),
      case when target_status='current' then 'approved' else 'withdrawn' end,btrim(review_note));
  return true;
end;
$$;

revoke all on function public.get_exam_clinical_library(uuid),
 public.create_exam_clinical_source(uuid,uuid,jsonb),
 public.review_exam_clinical_source(uuid,uuid,text,text) from public,anon,service_role;
grant execute on function public.get_exam_clinical_library(uuid),
 public.create_exam_clinical_source(uuid,uuid,jsonb),
 public.review_exam_clinical_source(uuid,uuid,text,text) to authenticated;

create function public.get_published_exam_summaries(target_tenant uuid,target_patient uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.has_live_session()
    or not private.has_tenant_role(target_tenant,array['patient'])
    or not exists(select 1 from public.patient_accounts where tenant_id=target_tenant
      and patient_id=target_patient and user_id=auth.uid()) then
    raise exception 'Active patient required' using errcode='42501';
  end if;
  return coalesce((select jsonb_agg(to_jsonb(p) order by p.published_at desc) from (
    select id,published_at,factual_claims from public.exam_summary_publications
      where tenant_id=target_tenant and patient_id=target_patient
      order by published_at desc,id desc limit 20
  ) p),'[]'::jsonb);
end;
$$;
revoke all on function public.get_published_exam_summaries(uuid,uuid) from public,anon,service_role;
grant execute on function public.get_published_exam_summaries(uuid,uuid) to authenticated;
