-- Append-only corrections for finalized clinical records and database-owned
-- optimistic concurrency for encounter drafts.

-- Draft writes now have to declare the version they read inside the database
-- operation. Removing the table grant prevents a direct Data API update from
-- bypassing the optimistic lock enforced by the RPC below.
revoke update (reason,evolution,status) on public.encounters from authenticated;

create function public.update_encounter_draft(
  target_tenant uuid,
  target_encounter uuid,
  expected_version integer,
  next_reason text,
  next_evolution text,
  next_status text
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  current_record public.encounters;
  saved_version integer;
begin
  if expected_version is null or expected_version < 1
    or next_reason is null or char_length(next_reason) > 2000
    or next_evolution is null or char_length(next_evolution) > 10000
    or next_reason ~ E'[\\x01-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]'
    or next_evolution ~ E'[\\x01-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]'
    or next_status not in ('draft','finalized') then
    raise exception 'Invalid encounter update' using errcode='22023';
  end if;
  if next_status='finalized'
    and (char_length(btrim(next_reason))=0 or char_length(btrim(next_evolution))=0) then
    raise exception 'Clinical text required' using errcode='23514';
  end if;

  select * into current_record from public.encounters
    where tenant_id=target_tenant and id=target_encounter for update;
  if not found
    or current_record.doctor_id is distinct from auth.uid()
    or not private.has_tenant_role(target_tenant,array['doctor'])
    or not private.has_care_access(target_tenant,current_record.patient_id) then
    raise exception 'Active author access required' using errcode='42501';
  end if;
  if current_record.status<>'draft' then
    raise exception 'Finalized encounter is immutable' using errcode='23514';
  end if;
  if current_record.version<>expected_version then
    raise exception 'Stale encounter version' using errcode='40001';
  end if;

  update public.encounters set
    reason=btrim(next_reason),
    evolution=btrim(next_evolution),
    status=next_status
  where id=current_record.id
  returning version into saved_version;
  return saved_version;
end;
$$;
revoke all on function public.update_encounter_draft(uuid,uuid,integer,text,text,text) from public,anon,authenticated;
grant execute on function public.update_encounter_draft(uuid,uuid,integer,text,text,text) to authenticated;

create table public.encounter_addenda (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  encounter_id uuid not null,
  encounter_version integer not null check (encounter_version > 0),
  addendum_number integer not null check (addendum_number > 0),
  reason text not null check (
    char_length(btrim(reason)) between 1 and 1000
    and reason !~ E'[\\x01-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]'
  ),
  content text not null check (
    char_length(btrim(content)) between 1 and 10000
    and content !~ E'[\\x01-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]'
  ),
  actor_user_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  unique (encounter_id,addendum_number),
  constraint encounter_addenda_tenant_id_encounter_id_fkey
    foreign key (tenant_id,encounter_id) references public.encounters(tenant_id,id),
  constraint encounter_addenda_tenant_id_actor_user_id_fkey
    foreign key (tenant_id,actor_user_id) references public.memberships(tenant_id,user_id)
);
create index encounter_addenda_tenant_encounter_idx
  on public.encounter_addenda(tenant_id,encounter_id,addendum_number desc);
alter table public.encounter_addenda enable row level security;
revoke all on public.encounter_addenda from public,anon,authenticated;
grant select on public.encounter_addenda to authenticated;
create policy encounter_addenda_read_care on public.encounter_addenda for select to authenticated
  using (exists (
    select 1 from public.encounters e
    where e.tenant_id=encounter_addenda.tenant_id
      and e.id=encounter_addenda.encounter_id
  ));

create function private.keep_encounter_addendum_immutable() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'Encounter addenda are immutable' using errcode='23514';
end;
$$;
revoke all on function private.keep_encounter_addendum_immutable() from public,anon,authenticated;
create trigger encounter_addenda_immutable before update or delete on public.encounter_addenda
  for each row execute function private.keep_encounter_addendum_immutable();

create trigger encounter_addenda_audit after insert on public.encounter_addenda
  for each row execute function private.audit_change();

-- The encounter row lock serializes numbering without changing the immutable
-- final record. Authorship, timestamp and source version are server-owned.
create function public.append_encounter_addendum(
  target_tenant uuid,
  target_encounter uuid,
  expected_encounter_version integer,
  addendum_reason text,
  addendum_content text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  current_record public.encounters;
  next_number integer;
  new_id uuid;
begin
  if expected_encounter_version is null or expected_encounter_version < 1
    or addendum_reason is null
    or char_length(btrim(addendum_reason)) not between 1 and 1000
    or addendum_content is null
    or char_length(btrim(addendum_content)) not between 1 and 10000
    or addendum_reason ~ E'[\\x01-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]'
    or addendum_content ~ E'[\\x01-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]' then
    raise exception 'Invalid encounter addendum' using errcode='22023';
  end if;

  select * into current_record from public.encounters
    where tenant_id=target_tenant and id=target_encounter for update;
  if not found
    or current_record.doctor_id is distinct from auth.uid()
    or not private.has_tenant_role(target_tenant,array['doctor'])
    or not private.has_care_access(target_tenant,current_record.patient_id) then
    raise exception 'Active author access required' using errcode='42501';
  end if;
  if current_record.status<>'finalized' then
    raise exception 'Finalized encounter required' using errcode='23514';
  end if;
  if current_record.version<>expected_encounter_version then
    raise exception 'Stale encounter version' using errcode='40001';
  end if;

  select coalesce(max(addendum_number),0)+1 into next_number
    from public.encounter_addenda where encounter_id=current_record.id;
  insert into public.encounter_addenda(
    tenant_id,encounter_id,encounter_version,addendum_number,reason,content,actor_user_id
  ) values (
    current_record.tenant_id,current_record.id,current_record.version,next_number,
    btrim(addendum_reason),btrim(addendum_content),auth.uid()
  ) returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.append_encounter_addendum(uuid,uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.append_encounter_addendum(uuid,uuid,integer,text,text) to authenticated;
