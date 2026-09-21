-- A short, staff-assisted intake that exists before the first appointment.
-- It records the patient's own words and keeps every saved version.
create table public.patient_intake_contexts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  patient_id uuid not null,
  questionnaire_version text not null default 'vivance-acolhimento-v1'
    check (questionnaire_version = 'vivance-acolhimento-v1'),
  status text not null default 'draft' check (status in ('draft', 'completed')),
  reason_text text not null default '' check (char_length(reason_text) <= 2000),
  expected_outcome text not null default '' check (char_length(expected_outcome) <= 2000),
  first_priority text not null default '' check (char_length(first_priority) <= 2000),
  source text not null default 'staff_assisted'
    check (source = 'staff_assisted'),
  recorded_by uuid not null,
  recorded_by_name text not null
    check (char_length(btrim(recorded_by_name)) between 2 and 160),
  version integer not null default 1 check (version > 0),
  expected_version integer,
  completed_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (tenant_id, patient_id),
  unique (tenant_id, id),
  foreign key (tenant_id, patient_id)
    references public.patients(tenant_id, id),
  foreign key (tenant_id, recorded_by)
    references public.memberships(tenant_id, user_id),
  check (
    (status = 'draft' and completed_at is null)
    or (
      status = 'completed' and completed_at is not null
      and char_length(btrim(reason_text)) > 0
      and char_length(btrim(expected_outcome)) > 0
      and char_length(btrim(first_priority)) > 0
    )
  )
);

create table public.patient_intake_context_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  intake_id uuid not null,
  patient_id uuid not null,
  questionnaire_version text not null,
  status text not null,
  reason_text text not null,
  expected_outcome text not null,
  first_priority text not null,
  source text not null,
  recorded_by uuid not null,
  recorded_by_name text not null,
  version integer not null,
  completed_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  unique (tenant_id, intake_id, version),
  foreign key (tenant_id, intake_id)
    references public.patient_intake_contexts(tenant_id, id),
  foreign key (tenant_id, patient_id)
    references public.patients(tenant_id, id),
  foreign key (tenant_id, recorded_by)
    references public.memberships(tenant_id, user_id)
);

create index patient_intake_context_versions_patient
  on public.patient_intake_context_versions(tenant_id, patient_id, version desc);

alter table public.patient_intake_contexts enable row level security;
alter table public.patient_intake_context_versions enable row level security;
revoke all on public.patient_intake_contexts,
  public.patient_intake_context_versions from public, anon, authenticated;
grant select on public.patient_intake_contexts,
  public.patient_intake_context_versions to authenticated;
grant update (
  status, reason_text, expected_outcome, first_priority, expected_version
) on public.patient_intake_contexts to authenticated;

create policy patient_intake_read_care on public.patient_intake_contexts
  for select to authenticated using (
    private.has_care_access(tenant_id, patient_id)
  );
create policy patient_intake_read_own on public.patient_intake_contexts
  for select to authenticated using (
    private.has_tenant_role(tenant_id, array['patient'])
    and exists (
      select 1 from public.patient_accounts account
      where account.tenant_id = patient_intake_contexts.tenant_id
        and account.patient_id = patient_intake_contexts.patient_id
        and account.user_id = (select auth.uid())
    )
  );
create policy patient_intake_update_doctor on public.patient_intake_contexts
  for update to authenticated
  using (
    private.has_tenant_role(tenant_id, array['doctor'])
    and private.has_care_access(tenant_id, patient_id)
  )
  with check (
    private.has_tenant_role(tenant_id, array['doctor'])
    and private.has_care_access(tenant_id, patient_id)
  );
create policy patient_intake_versions_read_care
  on public.patient_intake_context_versions for select to authenticated using (
    private.has_care_access(tenant_id, patient_id)
  );
create policy patient_intake_versions_read_own
  on public.patient_intake_context_versions for select to authenticated using (
    private.has_tenant_role(tenant_id, array['patient'])
    and exists (
      select 1 from public.patient_accounts account
      where account.tenant_id = patient_intake_context_versions.tenant_id
        and account.patient_id = patient_intake_context_versions.patient_id
        and account.user_id = (select auth.uid())
    )
  );

create function private.validate_patient_intake_context() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if (new.id, new.tenant_id, new.patient_id, new.questionnaire_version,
      new.source, new.created_at) is distinct from
     (old.id, old.tenant_id, old.patient_id, old.questionnaire_version,
      old.source, old.created_at) then
    raise exception 'Immutable patient intake identity' using errcode = '42501';
  end if;
  if new.expected_version is null or new.expected_version <> old.version then
    raise exception 'Stale patient intake version' using errcode = '40001';
  end if;
  new.reason_text := btrim(new.reason_text);
  new.expected_outcome := btrim(new.expected_outcome);
  new.first_priority := btrim(new.first_priority);
  new.recorded_by := auth.uid();
  select coalesce(nullif(btrim(membership.display_name), ''), 'Médico da equipe')
    into new.recorded_by_name
    from public.memberships membership
    where membership.tenant_id = new.tenant_id
      and membership.user_id = auth.uid()
      and membership.role = 'doctor'
      and membership.status = 'active';
  if new.recorded_by_name is null then
    raise exception 'Active doctor identity required' using errcode = '42501';
  end if;
  new.version := old.version + 1;
  new.expected_version := null;
  new.completed_at := case
    when new.status = 'completed' then clock_timestamp()
    else null
  end;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function private.validate_patient_intake_context()
  from public, anon, authenticated;
create trigger patient_intake_context_validate
  before update on public.patient_intake_contexts
  for each row execute function private.validate_patient_intake_context();

create function private.snapshot_patient_intake_context() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.patient_intake_context_versions(
    tenant_id, intake_id, patient_id, questionnaire_version, status,
    reason_text, expected_outcome, first_priority, source, recorded_by,
    recorded_by_name, version, completed_at
  ) values (
    new.tenant_id, new.id, new.patient_id, new.questionnaire_version,
    new.status, new.reason_text, new.expected_outcome, new.first_priority,
    new.source, new.recorded_by, new.recorded_by_name, new.version,
    new.completed_at
  );
  return new;
end;
$$;
revoke all on function private.snapshot_patient_intake_context()
  from public, anon, authenticated;
create trigger patient_intake_context_snapshot
  after insert or update on public.patient_intake_contexts
  for each row execute function private.snapshot_patient_intake_context();

create trigger patient_intake_context_audit
  after insert or update on public.patient_intake_contexts
  for each row execute function private.audit_change();

-- Creating the directory entry is the doctor's explicit acceptance of care.
-- The operation is atomic so the new record never exists without its intake.
create function public.create_patient_for_care(
  target_tenant uuid,
  supplied_name text,
  supplied_birth_date date,
  begin_intake boolean
) returns table(
  id uuid,
  display_name text,
  birth_date date,
  created_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
declare
  created_patient public.patients;
  actor_name text;
begin
  if begin_intake is distinct from true
    or not private.has_live_session()
    or not private.has_tenant_role(target_tenant, array['doctor']) then
    raise exception 'Explicit doctor acceptance required' using errcode = '42501';
  end if;
  select coalesce(nullif(btrim(membership.display_name), ''), 'Médico da equipe')
    into actor_name
    from public.memberships membership
    where membership.tenant_id = target_tenant
      and membership.user_id = auth.uid()
      and membership.role = 'doctor'
      and membership.status = 'active';
  if actor_name is null then
    raise exception 'Active doctor identity required' using errcode = '42501';
  end if;
  if supplied_name is null
    or char_length(btrim(supplied_name)) not between 2 and 160
    or supplied_birth_date < date '1900-01-01'
    or supplied_birth_date > current_date then
    raise exception 'Invalid patient details' using errcode = '23514';
  end if;

  insert into public.patients(tenant_id, display_name, birth_date, created_by)
    values(target_tenant, regexp_replace(btrim(supplied_name), '[[:space:]]+', ' ', 'g'),
      supplied_birth_date, auth.uid())
    returning * into created_patient;

  insert into public.care_relationships(
    tenant_id, patient_id, professional_id, status, created_by
  ) values (
    target_tenant, created_patient.id, auth.uid(), 'active', auth.uid()
  );

  insert into public.patient_intake_contexts(
    tenant_id, patient_id, recorded_by, recorded_by_name
  ) values (
    target_tenant, created_patient.id, auth.uid(), actor_name
  );

  return query select created_patient.id, created_patient.display_name,
    created_patient.birth_date, created_patient.created_at;
end;
$$;
revoke all on function public.create_patient_for_care(uuid, text, date, boolean)
  from public, anon;
grant execute on function public.create_patient_for_care(uuid, text, date, boolean)
  to authenticated;
