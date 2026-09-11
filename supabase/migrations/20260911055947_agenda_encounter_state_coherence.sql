-- Slice 3D: one operational state machine for Agenda and Atendimento.
-- Clinical content remains in encounters; appointments expose only scheduling
-- metadata and an immutable snapshot of the registered doctor's name.

drop trigger if exists appointments_clinical_lock on public.appointments;
drop trigger if exists appointments_validate on public.appointments;
drop trigger if exists appointments_audit on public.appointments;
drop trigger if exists encounters_validate on public.encounters;
drop trigger if exists encounters_version on public.encounters;
drop trigger if exists encounters_audit on public.encounters;

alter table public.appointments
  drop constraint appointments_status_check,
  add column expected_version integer,
  add column doctor_display_name text,
  add column started_at timestamptz,
  add column completed_at timestamptz,
  add column cancelled_at timestamptz,
  add column no_show_at timestamptz;

-- Preserve the name that was registered when the appointment entered the new
-- state model. Future bookings require a non-empty registered name.
update public.appointments a
set doctor_display_name = case
  when nullif(btrim(m.display_name), '') is null
    or btrim(m.display_name) ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    then 'Nome profissional não cadastrado'
  else btrim(m.display_name)
end
from public.memberships m
where m.tenant_id = a.tenant_id and m.user_id = a.doctor_id;

update public.appointments
set doctor_display_name = 'Nome profissional não cadastrado'
where doctor_display_name is null;

-- Existing clinical records become coherent without changing their clinical
-- text. Incrementing the appointment version invalidates stale open screens.
update public.appointments a
set status = case when e.status = 'finalized' then 'completed' else 'in_progress' end,
    started_at = e.created_at,
    completed_at = e.finalized_at,
    version = a.version + 1,
    updated_at = greatest(a.updated_at, e.updated_at)
from public.encounters e
where e.appointment_id = a.id;

update public.appointments
set cancelled_at = updated_at
where status = 'cancelled' and cancelled_at is null;

alter table public.appointments
  alter column doctor_display_name set not null,
  add constraint appointments_status_check check (
    status in ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')
  ),
  add constraint appointments_expected_version_transient
    check (expected_version is null),
  add constraint appointments_doctor_display_name_check check (
    char_length(btrim(doctor_display_name)) between 2 and 120
  ),
  add constraint appointments_state_timestamps_check check (
    (status = 'scheduled'
      and started_at is null and completed_at is null
      and cancelled_at is null and no_show_at is null)
    or (status = 'in_progress'
      and started_at is not null and completed_at is null
      and cancelled_at is null and no_show_at is null)
    or (status = 'completed'
      and started_at is not null and completed_at is not null
      and completed_at >= started_at
      and cancelled_at is null and no_show_at is null)
    or (status = 'cancelled'
      and started_at is null and completed_at is null
      and cancelled_at is not null and no_show_at is null)
    or (status = 'no_show'
      and started_at is null and completed_at is null
      and cancelled_at is null and no_show_at is not null)
  ),
  add constraint appointments_tenant_id_id_key unique (tenant_id, id);

-- Keep clinical history independent from operational Agenda visibility. This
-- snapshot is readable only through encounter RLS and survives profile renames.
alter table public.encounters add column doctor_display_name text;
update public.encounters e
set doctor_display_name = a.doctor_display_name
from public.appointments a
where a.id = e.appointment_id and a.tenant_id = e.tenant_id;
alter table public.encounters
  alter column doctor_display_name set not null,
  add constraint encounters_doctor_display_name_check check (
    char_length(btrim(doctor_display_name)) between 2 and 120
  );

alter table public.appointments
  drop constraint appointments_tenant_id_doctor_id_tstzrange_excl,
  drop constraint appointments_tenant_id_patient_id_tstzrange_excl;

alter table public.appointments
  add constraint appointments_tenant_id_doctor_id_tstzrange_excl
    exclude using gist (
      tenant_id with =,
      doctor_id with =,
      tstzrange(starts_at, ends_at, '[)') with &&
    ) where (status in ('scheduled', 'in_progress', 'completed')),
  add constraint appointments_tenant_id_patient_id_tstzrange_excl
    exclude using gist (
      tenant_id with =,
      patient_id with =,
      tstzrange(starts_at, ends_at, '[)') with &&
    ) where (status in ('scheduled', 'in_progress', 'completed'));

revoke update (status) on public.appointments from authenticated;
grant update (
  patient_id, doctor_id, starts_at, ends_at, kind, expected_version
) on public.appointments to authenticated;

-- Patients no longer need to enumerate membership rows to resolve a doctor.
-- The appointment snapshot is visible only through appointment RLS.
drop policy if exists memberships_read_assigned_doctor on public.memberships;

create table public.appointment_status_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  appointment_id uuid not null,
  from_status text not null check (
    from_status in ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')
  ),
  to_status text not null check (
    to_status in ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')
  ),
  actor_user_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  foreign key (tenant_id, appointment_id)
    references public.appointments(tenant_id, id),
  foreign key (tenant_id, actor_user_id)
    references public.memberships(tenant_id, user_id),
  check (from_status <> to_status)
);
create index appointment_status_events_page_idx
  on public.appointment_status_events(tenant_id, appointment_id, created_at, id);
alter table public.appointment_status_events enable row level security;
revoke all on public.appointment_status_events from public, anon, authenticated;
grant select on public.appointment_status_events to authenticated;
create policy appointment_status_events_read on public.appointment_status_events
  for select to authenticated using (
    private.has_tenant_role(
      appointment_status_events.tenant_id,
      array['admin', 'doctor', 'nurse']
    )
    and
    exists (
      select 1 from public.appointments a
      where a.tenant_id = appointment_status_events.tenant_id
        and a.id = appointment_status_events.appointment_id
    )
  );

create or replace function private.validate_appointment() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  registered_name text;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'scheduled' then
      raise exception 'New appointment must be scheduled' using errcode = '23514';
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
    new.started_at := null;
    new.completed_at := null;
    new.cancelled_at := null;
    new.no_show_at := null;
  else
    if (new.id, new.tenant_id, new.created_by, new.created_at) is distinct from
       (old.id, old.tenant_id, old.created_by, old.created_at) then
      raise exception 'Immutable appointment identity' using errcode = '42501';
    end if;
    if new.expected_version is distinct from old.version then
      raise exception 'Stale appointment version' using errcode = '40001';
    end if;

    new.started_at := old.started_at;
    new.completed_at := old.completed_at;
    new.cancelled_at := old.cancelled_at;
    new.no_show_at := old.no_show_at;

    if new.doctor_id is distinct from old.doctor_id then
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
    elsif new.doctor_display_name is distinct from old.doctor_display_name then
      raise exception 'Immutable doctor name snapshot' using errcode = '42501';
    end if;

    if new.status = old.status then
      if old.status <> 'scheduled' then
        raise exception 'Started or closed appointment is immutable'
          using errcode = '23514';
      end if;
    else
      if current_user = 'authenticated' then
        raise exception 'Protected appointment transition' using errcode = '42501';
      end if;
      if (new.patient_id, new.doctor_id, new.starts_at, new.ends_at, new.kind)
          is distinct from
         (old.patient_id, old.doctor_id, old.starts_at, old.ends_at, old.kind) then
        raise exception 'Transition separately from rescheduling'
          using errcode = '23514';
      end if;
      if old.status = 'scheduled' and new.status = 'in_progress' then
        new.started_at := clock_timestamp();
      elsif old.status = 'in_progress' and new.status = 'completed' then
        new.completed_at := clock_timestamp();
      elsif old.status = 'scheduled' and new.status = 'cancelled' then
        new.cancelled_at := clock_timestamp();
      elsif old.status = 'scheduled' and new.status = 'no_show' then
        new.no_show_at := clock_timestamp();
      else
        raise exception 'Invalid appointment transition' using errcode = '23514';
      end if;
    end if;

    new.version := old.version + 1;
    new.expected_version := null;
    new.updated_at := clock_timestamp();
  end if;

  if new.status = 'scheduled' then
    if new.starts_at <= now() then
      raise exception 'Appointment must be in the future' using errcode = '23514';
    end if;
    if not exists (
      select 1 from public.memberships m
      where m.tenant_id = new.tenant_id
        and m.user_id = new.doctor_id
        and m.role = 'doctor'
        and m.status = 'active'
        and nullif(btrim(m.display_name), '') is not null
        and btrim(m.display_name) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ) then
      raise exception 'Active named doctor required' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.validate_appointment()
  from public, anon, authenticated;

create or replace function private.lock_started_appointment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from public.encounters e where e.appointment_id = old.id
  ) then
    if old.status = 'in_progress'
      and new.status = 'completed'
      and exists (
        select 1 from public.encounters e
        where e.appointment_id = old.id
          and e.tenant_id = old.tenant_id
          and e.patient_id = old.patient_id
          and e.doctor_id = old.doctor_id
          and e.status = 'finalized'
      ) then
      return new;
    end if;
    raise exception 'Appointment already has an encounter' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.lock_started_appointment()
  from public, anon, authenticated;

create function private.record_appointment_status_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    if auth.uid() is null or not private.has_live_session() then
      raise exception 'Active actor required' using errcode = '42501';
    end if;
    insert into public.appointment_status_events(
      tenant_id, appointment_id, from_status, to_status, actor_user_id
    ) values (
      new.tenant_id, new.id, old.status, new.status, auth.uid()
    );
  end if;
  return new;
end;
$$;
revoke all on function private.record_appointment_status_event()
  from public, anon, authenticated;

create trigger appointments_clinical_lock before update on public.appointments
  for each row execute function private.lock_started_appointment();
create trigger appointments_validate before insert or update on public.appointments
  for each row execute function private.validate_appointment();
create trigger appointments_audit after insert or update on public.appointments
  for each row execute function private.audit_change();
create trigger appointments_status_history after update on public.appointments
  for each row execute function private.record_appointment_status_event();

create function public.transition_appointment(
  target_tenant uuid,
  target_appointment uuid,
  read_version integer,
  target_status text
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  current_record public.appointments;
  saved_version integer;
begin
  if target_status not in ('cancelled', 'no_show')
    or read_version is null or read_version < 1 then
    raise exception 'Invalid appointment transition' using errcode = '22023';
  end if;
  select * into current_record
    from public.appointments
    where tenant_id = target_tenant and id = target_appointment
    for update;
  if not found or not (
    private.has_tenant_role(target_tenant, array['admin', 'nurse'])
    or (
      current_record.doctor_id = auth.uid()
      and private.has_tenant_role(target_tenant, array['doctor'])
    )
  ) then
    raise exception 'Appointment management denied' using errcode = '42501';
  end if;
  if current_record.version <> read_version then
    raise exception 'Stale appointment version' using errcode = '40001';
  end if;
  if current_record.status <> 'scheduled' then
    raise exception 'Only scheduled appointments can be closed operationally'
      using errcode = '23514';
  end if;
  if target_status = 'no_show' and current_record.starts_at > clock_timestamp() then
    raise exception 'No-show can be recorded only after the appointment starts'
      using errcode = '23514';
  end if;
  update public.appointments
    set status = target_status, expected_version = current_record.version
    where id = current_record.id
    returning version into saved_version;
  return saved_version;
end;
$$;
revoke all on function public.transition_appointment(uuid, uuid, integer, text)
  from public, anon, authenticated;
grant execute on function public.transition_appointment(uuid, uuid, integer, text)
  to authenticated;

-- Invoker identity and access are checked explicitly before the function uses
-- owner rights to perform the protected scheduled -> in_progress transition.
drop function public.start_encounter(uuid, uuid, boolean);
create function public.start_encounter(
  target_tenant uuid,
  target_appointment uuid,
  accept_care boolean,
  read_version integer
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  a public.appointments;
  relationship public.care_relationships;
  result uuid;
begin
  if accept_care is distinct from true
    or read_version is null or read_version < 1
    or not private.has_tenant_role(target_tenant, array['doctor']) then
    raise exception 'Explicit doctor acceptance required' using errcode = '42501';
  end if;
  select * into a
    from public.appointments
    where id = target_appointment and tenant_id = target_tenant
    for update;
  if not found or a.doctor_id is distinct from auth.uid() then
    raise exception 'Assigned appointment required' using errcode = '42501';
  end if;

  if a.status in ('in_progress', 'completed') then
    select e.id into result
      from public.encounters e
      where e.appointment_id = a.id
        and e.tenant_id = target_tenant
        and e.doctor_id = auth.uid();
    if result is null or not private.has_care_access(target_tenant, a.patient_id) then
      raise exception 'Active encounter access required' using errcode = '42501';
    end if;
    return result;
  elsif a.status <> 'scheduled' then
    raise exception 'Scheduled appointment required' using errcode = '23514';
  end if;
  if a.version <> read_version then
    raise exception 'Stale appointment version' using errcode = '40001';
  end if;

  insert into public.care_relationships(
    tenant_id, patient_id, professional_id, status
  ) values (target_tenant, a.patient_id, auth.uid(), 'active')
  on conflict (tenant_id, patient_id, professional_id) do nothing;

  select * into relationship
    from public.care_relationships
    where tenant_id = target_tenant
      and patient_id = a.patient_id
      and professional_id = auth.uid()
    for update;
  if not found then
    raise exception 'Care relationship unavailable' using errcode = '42501';
  elsif relationship.status = 'assigned' then
    update public.care_relationships
      set status = 'active', expected_version = relationship.version
      where id = relationship.id;
  elsif relationship.status <> 'active' then
    raise exception 'Revoked care relationship cannot be reactivated here'
      using errcode = '42501';
  end if;

  if not private.has_care_access(target_tenant, a.patient_id) then
    raise exception 'Active care relationship required' using errcode = '42501';
  end if;
  update public.appointments
    set status = 'in_progress', expected_version = a.version
    where id = a.id;
  insert into public.encounters(
    tenant_id, appointment_id, patient_id, doctor_id
  ) values (
    target_tenant, a.id, a.patient_id, auth.uid()
  ) returning id into result;
  return result;
end;
$$;
revoke all on function public.start_encounter(uuid, uuid, boolean, integer)
  from public, anon, authenticated;
grant execute on function public.start_encounter(uuid, uuid, boolean, integer)
  to authenticated;

create or replace function private.validate_encounter() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare a public.appointments;
begin
  if tg_op = 'INSERT' then
    select * into a from public.appointments
      where id = new.appointment_id and tenant_id = new.tenant_id
      for update;
    if not found or a.status <> 'in_progress'
      or a.patient_id <> new.patient_id or a.doctor_id <> new.doctor_id
      or new.doctor_id is distinct from auth.uid() then
      raise exception 'Assigned appointment in progress required'
        using errcode = '42501';
    end if;
    new.doctor_display_name := a.doctor_display_name;
    new.version := 1;
    new.status := 'draft';
    new.finalized_at := null;
    new.expected_version := null;
    new.created_at := clock_timestamp();
    new.updated_at := new.created_at;
  else
    if (new.id, new.tenant_id, new.appointment_id, new.patient_id,
        new.doctor_id, new.doctor_display_name, new.created_at) is distinct from
       (old.id, old.tenant_id, old.appointment_id, old.patient_id,
        old.doctor_id, old.doctor_display_name, old.created_at) then
      raise exception 'Immutable encounter identity' using errcode = '42501';
    end if;
    if old.status = 'finalized' then
      raise exception 'Finalized encounter is immutable' using errcode = '23514';
    end if;
    if new.expected_version is distinct from old.version then
      raise exception 'Stale encounter version' using errcode = '40001';
    end if;
    new.expected_version := null;
    new.version := old.version + 1;
    new.updated_at := clock_timestamp();
    new.finalized_at := case
      when new.status = 'finalized' then clock_timestamp()
      else null
    end;
  end if;
  return new;
end;
$$;

create trigger encounters_validate before insert or update on public.encounters
  for each row execute function private.validate_encounter();
create trigger encounters_version after insert or update on public.encounters
  for each row execute function private.record_encounter_version();
create trigger encounters_audit after insert or update on public.encounters
  for each row execute function private.audit_change();

create function private.complete_appointment_from_encounter() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  updated_appointment uuid;
begin
  if old.status = 'draft' and new.status = 'finalized' then
    update public.appointments
      set status = 'completed', expected_version = version
      where tenant_id = new.tenant_id
        and id = new.appointment_id
        and patient_id = new.patient_id
        and doctor_id = new.doctor_id
        and status = 'in_progress'
      returning id into updated_appointment;
    if updated_appointment is null then
      raise exception 'Appointment is not in progress' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.complete_appointment_from_encounter()
  from public, anon, authenticated;
create trigger encounters_sync_appointment after update on public.encounters
  for each row execute function private.complete_appointment_from_encounter();

-- RLS is evaluated as the caller because this function is security invoker.
-- Cursor ordering is deterministic and the page size is clamped in the DB.
create index encounters_page_idx
  on public.encounters(tenant_id, created_at desc, id desc);
create function public.list_encounters_page(
  target_tenant uuid,
  search_text text default '',
  before_created_at timestamptz default null,
  before_id uuid default null,
  page_limit integer default 20
) returns table (
  id uuid,
  patient_id uuid,
  doctor_id uuid,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  patient_display_name text,
  doctor_display_name text
)
language sql stable security invoker set search_path = '' as $$
  select
    e.id,
    e.patient_id,
    e.doctor_id,
    e.status,
    e.created_at,
    e.updated_at,
    p.display_name,
    e.doctor_display_name
  from public.encounters e
  join public.patients p
    on p.tenant_id = e.tenant_id and p.id = e.patient_id
  where e.tenant_id = target_tenant
    and (
      btrim(left(coalesce(search_text, ''), 80)) = ''
      or strpos(
        lower(p.display_name),
        lower(btrim(left(coalesce(search_text, ''), 80)))
      ) > 0
    )
    and (
      before_created_at is null
      or (e.created_at, e.id) < (before_created_at, before_id)
    )
  order by e.created_at desc, e.id desc
  limit least(greatest(coalesce(page_limit, 20), 1), 51);
$$;
revoke all on function public.list_encounters_page(
  uuid, text, timestamptz, uuid, integer
) from public, anon;
grant execute on function public.list_encounters_page(
  uuid, text, timestamptz, uuid, integer
) to authenticated;
