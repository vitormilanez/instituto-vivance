-- An active consultation can recover a missing Meet link from its own draft.
-- Keep the existing scheduled-appointment policies unchanged. Only the
-- assigned doctor may configure an in-progress appointment with a live draft;
-- completed, cancelled, missed and reassigned appointments stay immutable.
create policy appointment_teleconsultations_insert_active_doctor
  on public.appointment_teleconsultations for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and updated_by = (select auth.uid())
    and exists (
      select 1 from public.appointments appointment
      where appointment.tenant_id = appointment_teleconsultations.tenant_id
        and appointment.id = appointment_teleconsultations.appointment_id
        and appointment.status = 'in_progress'
        and appointment.doctor_id = (select auth.uid())
        and private.has_tenant_role(appointment.tenant_id, array['doctor'])
        and exists (
          select 1 from public.encounters encounter
          where encounter.tenant_id = appointment.tenant_id
            and encounter.appointment_id = appointment.id
            and encounter.doctor_id = (select auth.uid())
            and encounter.status = 'draft'
        )
    )
  );

create policy appointment_teleconsultations_update_active_doctor
  on public.appointment_teleconsultations for update to authenticated
  using (
    exists (
      select 1 from public.appointments appointment
      where appointment.tenant_id = appointment_teleconsultations.tenant_id
        and appointment.id = appointment_teleconsultations.appointment_id
        and appointment.status = 'in_progress'
        and appointment.doctor_id = (select auth.uid())
        and private.has_tenant_role(appointment.tenant_id, array['doctor'])
        and exists (
          select 1 from public.encounters encounter
          where encounter.tenant_id = appointment.tenant_id
            and encounter.appointment_id = appointment.id
            and encounter.doctor_id = (select auth.uid())
            and encounter.status = 'draft'
        )
    )
  )
  with check (
    exists (
      select 1 from public.appointments appointment
      where appointment.tenant_id = appointment_teleconsultations.tenant_id
        and appointment.id = appointment_teleconsultations.appointment_id
        and appointment.status = 'in_progress'
        and appointment.doctor_id = (select auth.uid())
        and private.has_tenant_role(appointment.tenant_id, array['doctor'])
        and exists (
          select 1 from public.encounters encounter
          where encounter.tenant_id = appointment.tenant_id
            and encounter.appointment_id = appointment.id
            and encounter.doctor_id = (select auth.uid())
            and encounter.status = 'draft'
        )
    )
  );

create or replace function private.validate_appointment_teleconsultation()
returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  appointment_status text;
  appointment_doctor uuid;
begin
  select appointment.status, appointment.doctor_id
    into appointment_status, appointment_doctor
  from public.appointments appointment
  where appointment.tenant_id = new.tenant_id
    and appointment.id = new.appointment_id
  for update;

  if appointment_status is distinct from 'scheduled'
    and not (
      appointment_status = 'in_progress'
      and appointment_doctor = auth.uid()
      and private.has_tenant_role(new.tenant_id, array['doctor'])
      and exists (
        select 1 from public.encounters encounter
        where encounter.tenant_id = new.tenant_id
          and encounter.appointment_id = new.appointment_id
          and encounter.doctor_id = auth.uid()
          and encounter.status = 'draft'
      )
    ) then
    raise exception 'Only scheduled appointments or an active doctor encounter can be configured'
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
