-- Operational unavailability for the existing Agenda. Blocks contain no
-- patient or clinical data and are never visible to patients.
create table public.agenda_blocks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  doctor_id uuid not null,
  doctor_display_name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  version integer not null default 1,
  expected_version integer,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  cancelled_at timestamptz,
  foreign key (tenant_id, doctor_id)
    references public.memberships(tenant_id, user_id),
  constraint agenda_blocks_tenant_id_id_key unique (tenant_id, id),
  constraint agenda_blocks_time_check check (
    isfinite(starts_at) and isfinite(ends_at)
    and ends_at >= starts_at + interval '5 minutes'
    and ends_at <= starts_at + interval '8 hours'
  ),
  constraint agenda_blocks_doctor_name_check check (
    char_length(btrim(doctor_display_name)) between 2 and 120
  ),
  constraint agenda_blocks_expected_version_transient check (expected_version is null),
  constraint agenda_blocks_state_check check (
    (status = 'active' and cancelled_at is null)
    or (status = 'cancelled' and cancelled_at is not null)
  ),
  constraint agenda_blocks_no_active_overlap exclude using gist (
    tenant_id with =,
    doctor_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'active')
);

create index agenda_blocks_tenant_range_idx
  on public.agenda_blocks(tenant_id, starts_at, ends_at, id)
  where status = 'active';
create index agenda_blocks_doctor_range_idx
  on public.agenda_blocks(tenant_id, doctor_id, starts_at, id);

alter table public.agenda_blocks enable row level security;
revoke all on public.agenda_blocks from public, anon, authenticated;
grant select on public.agenda_blocks to authenticated;
grant insert (tenant_id, doctor_id, starts_at, ends_at)
  on public.agenda_blocks to authenticated;
grant update (status, expected_version) on public.agenda_blocks to authenticated;

create policy agenda_blocks_read_staff on public.agenda_blocks
  for select to authenticated using (
    private.has_tenant_role(tenant_id, array['admin', 'doctor', 'nurse'])
  );
create policy agenda_blocks_insert_staff on public.agenda_blocks
  for insert to authenticated with check (
    created_by = (select auth.uid())
    and (
      private.has_tenant_role(tenant_id, array['admin', 'nurse'])
      or (
        doctor_id = (select auth.uid())
        and private.has_tenant_role(tenant_id, array['doctor'])
      )
    )
  );
create policy agenda_blocks_cancel_staff on public.agenda_blocks
  for update to authenticated
  using (
    private.has_tenant_role(tenant_id, array['admin', 'nurse'])
    or (
      doctor_id = (select auth.uid())
      and private.has_tenant_role(tenant_id, array['doctor'])
    )
  )
  with check (
    private.has_tenant_role(tenant_id, array['admin', 'nurse'])
    or (
      doctor_id = (select auth.uid())
      and private.has_tenant_role(tenant_id, array['doctor'])
    )
  );

create function private.validate_agenda_block() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  registered_name text;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'active' then
      raise exception 'New agenda block must be active' using errcode = '23514';
    end if;
    select nullif(btrim(m.display_name), '') into registered_name
      from public.memberships m
      where m.tenant_id = new.tenant_id
        and m.user_id = new.doctor_id
        and m.role = 'doctor'
        and m.status = 'active';
    if registered_name is null
      or registered_name ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception 'Registered doctor name required' using errcode = '23514';
    end if;
    new.doctor_display_name := registered_name;
    new.version := 1;
    new.expected_version := null;
    new.cancelled_at := null;
  else
    if (new.id, new.tenant_id, new.doctor_id, new.doctor_display_name,
        new.starts_at, new.ends_at, new.created_by, new.created_at) is distinct from
       (old.id, old.tenant_id, old.doctor_id, old.doctor_display_name,
        old.starts_at, old.ends_at, old.created_by, old.created_at) then
      raise exception 'Immutable agenda block' using errcode = '42501';
    end if;
    if new.expected_version is distinct from old.version then
      raise exception 'Stale agenda block version' using errcode = '40001';
    end if;
    if old.status <> 'active' or new.status <> 'cancelled' then
      raise exception 'Invalid agenda block transition' using errcode = '23514';
    end if;
    new.version := old.version + 1;
    new.expected_version := null;
    new.updated_at := clock_timestamp();
    new.cancelled_at := clock_timestamp();
  end if;

  if new.status = 'active' then
    if new.starts_at <= clock_timestamp() then
      raise exception 'Agenda block must be in the future' using errcode = '23514';
    end if;
    -- Both writers take this exact transaction lock before checking the other
    -- table. Exclusion constraints alone cannot express cross-table conflicts.
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        new.tenant_id::text || ':' || new.doctor_id::text,
        20261015
      )
    );
    if exists (
      select 1 from public.appointments a
      where a.tenant_id = new.tenant_id
        and a.doctor_id = new.doctor_id
        and a.status in ('scheduled', 'in_progress')
        and tstzrange(a.starts_at, a.ends_at, '[)')
          && tstzrange(new.starts_at, new.ends_at, '[)')
    ) then
      raise exception 'Agenda block overlaps active appointment'
        using errcode = '23P01';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.validate_agenda_block()
  from public, anon, authenticated;

create function private.prevent_appointment_in_agenda_block() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.status in ('scheduled', 'in_progress') then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        new.tenant_id::text || ':' || new.doctor_id::text,
        20261015
      )
    );
    if exists (
      select 1 from public.agenda_blocks b
      where b.tenant_id = new.tenant_id
        and b.doctor_id = new.doctor_id
        and b.status = 'active'
        and tstzrange(b.starts_at, b.ends_at, '[)')
          && tstzrange(new.starts_at, new.ends_at, '[)')
    ) then
      raise exception 'Appointment overlaps active agenda block'
        using errcode = '23P01';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.prevent_appointment_in_agenda_block()
  from public, anon, authenticated;

create trigger agenda_blocks_validate
  before insert or update on public.agenda_blocks
  for each row execute function private.validate_agenda_block();
create trigger agenda_blocks_audit
  after insert or update on public.agenda_blocks
  for each row execute function private.audit_change();
create trigger appointments_agenda_block_conflict
  before insert or update on public.appointments
  for each row execute function private.prevent_appointment_in_agenda_block();
