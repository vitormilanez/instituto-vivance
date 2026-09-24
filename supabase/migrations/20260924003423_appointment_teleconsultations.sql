-- Delivery configuration is separate from scheduling so an appointment can be
-- created successfully before a Meet link exists. No row means in-person.
create table public.appointment_teleconsultations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  appointment_id uuid not null,
  delivery_mode text not null check (delivery_mode in ('in_person', 'video')),
  provider text check (provider in ('google_meet')),
  join_url text,
  version integer not null default 1,
  expected_version integer,
  created_by uuid not null default auth.uid(),
  updated_by uuid not null default auth.uid(),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (tenant_id, appointment_id),
  foreign key (tenant_id, appointment_id)
    references public.appointments(tenant_id, id),
  foreign key (tenant_id, created_by)
    references public.memberships(tenant_id, user_id),
  foreign key (tenant_id, updated_by)
    references public.memberships(tenant_id, user_id),
  check (version >= 1),
  check (expected_version is null),
  check (
    (delivery_mode = 'in_person' and provider is null and join_url is null)
    or
    (delivery_mode = 'video'
      and provider is not null
      and provider = 'google_meet'
      and join_url is not null
      and join_url ~ '^https://meet[.]google[.]com/[a-z]{3}-[a-z]{4}-[a-z]{3}$')
  )
);

create index appointment_teleconsultations_created_by_idx
  on public.appointment_teleconsultations(tenant_id, created_by);
create index appointment_teleconsultations_updated_by_idx
  on public.appointment_teleconsultations(tenant_id, updated_by);

alter table public.appointment_teleconsultations enable row level security;
revoke all on public.appointment_teleconsultations
  from public, anon, authenticated;
grant select on public.appointment_teleconsultations to authenticated;
grant insert (tenant_id, appointment_id, delivery_mode, provider, join_url)
  on public.appointment_teleconsultations to authenticated;
grant update (delivery_mode, provider, join_url, expected_version)
  on public.appointment_teleconsultations to authenticated;

-- Staff visibility follows the current appointment assignment. Reassignment
-- removes the previous doctor's access immediately.
create policy appointment_teleconsultations_read_staff
  on public.appointment_teleconsultations for select to authenticated
  using (
    exists (
      select 1
      from public.appointments appointment
      where appointment.tenant_id = appointment_teleconsultations.tenant_id
        and appointment.id = appointment_teleconsultations.appointment_id
        and (
          private.has_tenant_role(
            appointment.tenant_id,
            array['admin', 'nurse']
          )
          or (
            appointment.doctor_id = (select auth.uid())
            and private.has_tenant_role(appointment.tenant_id, array['doctor'])
          )
        )
    )
  );

-- Patients only receive an upcoming or active call for their own linked
-- record. Closed and missed appointments never expose a stale meeting link.
create policy appointment_teleconsultations_read_patient
  on public.appointment_teleconsultations for select to authenticated
  using (
    exists (
      select 1
      from public.appointments appointment
      join public.patient_accounts account
        on account.tenant_id = appointment.tenant_id
       and account.patient_id = appointment.patient_id
      where appointment.tenant_id = appointment_teleconsultations.tenant_id
        and appointment.id = appointment_teleconsultations.appointment_id
        and appointment.status in ('scheduled', 'in_progress')
        and account.user_id = (select auth.uid())
        and private.has_tenant_role(appointment.tenant_id, array['patient'])
    )
  );

create policy appointment_teleconsultations_insert_staff
  on public.appointment_teleconsultations for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and updated_by = (select auth.uid())
    and exists (
      select 1
      from public.appointments appointment
      where appointment.tenant_id = appointment_teleconsultations.tenant_id
        and appointment.id = appointment_teleconsultations.appointment_id
        and appointment.status = 'scheduled'
        and (
          private.has_tenant_role(
            appointment.tenant_id,
            array['admin', 'nurse']
          )
          or (
            appointment.doctor_id = (select auth.uid())
            and private.has_tenant_role(appointment.tenant_id, array['doctor'])
          )
        )
    )
  );

create policy appointment_teleconsultations_update_staff
  on public.appointment_teleconsultations for update to authenticated
  using (
    exists (
      select 1
      from public.appointments appointment
      where appointment.tenant_id = appointment_teleconsultations.tenant_id
        and appointment.id = appointment_teleconsultations.appointment_id
        and appointment.status = 'scheduled'
        and (
          private.has_tenant_role(
            appointment.tenant_id,
            array['admin', 'nurse']
          )
          or (
            appointment.doctor_id = (select auth.uid())
            and private.has_tenant_role(appointment.tenant_id, array['doctor'])
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.appointments appointment
      where appointment.tenant_id = appointment_teleconsultations.tenant_id
        and appointment.id = appointment_teleconsultations.appointment_id
        and appointment.status = 'scheduled'
        and (
          private.has_tenant_role(
            appointment.tenant_id,
            array['admin', 'nurse']
          )
          or (
            appointment.doctor_id = (select auth.uid())
            and private.has_tenant_role(appointment.tenant_id, array['doctor'])
          )
        )
    )
  );

create function private.validate_appointment_teleconsultation()
returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  appointment_status text;
begin
  select appointment.status into appointment_status
  from public.appointments appointment
  where appointment.tenant_id = new.tenant_id
    and appointment.id = new.appointment_id
  for update;

  if appointment_status is distinct from 'scheduled' then
    raise exception 'Only scheduled appointments can be configured'
      using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    new.version := 1;
    new.expected_version := null;
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.created_at := clock_timestamp();
    new.updated_at := new.created_at;
  else
    if (new.id, new.tenant_id, new.appointment_id, new.created_by, new.created_at)
        is distinct from
       (old.id, old.tenant_id, old.appointment_id, old.created_by, old.created_at) then
      raise exception 'Immutable teleconsultation identity'
        using errcode = '42501';
    end if;
    if new.expected_version is distinct from old.version then
      raise exception 'Stale teleconsultation version' using errcode = '40001';
    end if;
    new.version := old.version + 1;
    new.expected_version := null;
    new.updated_by := auth.uid();
    new.updated_at := clock_timestamp();
  end if;
  return new;
end;
$$;
revoke all on function private.validate_appointment_teleconsultation()
  from public, anon, authenticated;

create trigger appointment_teleconsultations_validate
  before insert or update on public.appointment_teleconsultations
  for each row execute function private.validate_appointment_teleconsultation();
create trigger appointment_teleconsultations_audit
  after insert or update on public.appointment_teleconsultations
  for each row execute function private.audit_change();
