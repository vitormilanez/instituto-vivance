-- Operational scheduling only: no diagnoses, notes or automatic care relationships.
create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
set search_path = public, extensions;

alter table public.memberships add column display_name text;
-- Use existing account information, not invented practitioner identities.
update public.memberships m set display_name = u.email
  from auth.users u where u.id = m.user_id and m.role = 'doctor';
create policy memberships_read_doctors_staff on public.memberships for select to authenticated
  using (role = 'doctor' and status = 'active'
    and private.has_tenant_role(tenant_id, array['admin','doctor','nurse']));

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  patient_id uuid not null,
  doctor_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  kind text not null default 'consultation' check (kind in ('consultation','return')),
  status text not null default 'scheduled' check (status in ('scheduled','cancelled')),
  version integer not null default 1,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, patient_id) references public.patients(tenant_id,id),
  foreign key (tenant_id, doctor_id) references public.memberships(tenant_id,user_id),
  check (isfinite(starts_at) and isfinite(ends_at)
    and ends_at >= starts_at + interval '5 minutes'
    and ends_at <= starts_at + interval '8 hours'),
  -- Half-open intervals allow adjacent visits, but never concurrent bookings.
  exclude using gist (tenant_id with =, doctor_id with =, tstzrange(starts_at,ends_at,'[)') with &&)
    where (status = 'scheduled'),
  exclude using gist (tenant_id with =, patient_id with =, tstzrange(starts_at,ends_at,'[)') with &&)
    where (status = 'scheduled')
);
create index appointments_tenant_start_idx on public.appointments(tenant_id,starts_at,id);
create index appointments_patient_idx on public.appointments(tenant_id,patient_id,starts_at);
create index appointments_doctor_idx on public.appointments(tenant_id,doctor_id,starts_at);
alter table public.appointments enable row level security;
revoke all on public.appointments from public, anon, authenticated;
grant select on public.appointments to authenticated;
grant insert (tenant_id,patient_id,doctor_id,starts_at,ends_at,kind) on public.appointments to authenticated;
grant update (patient_id,doctor_id,starts_at,ends_at,kind,status) on public.appointments to authenticated;

create policy appointments_read_staff on public.appointments for select to authenticated
  using (private.has_tenant_role(tenant_id,array['admin','nurse'])
    or (doctor_id = (select auth.uid()) and private.has_tenant_role(tenant_id,array['doctor'])));
create policy appointments_read_patient on public.appointments for select to authenticated
  using (exists (select 1 from public.patient_accounts a
    where a.tenant_id = appointments.tenant_id and a.patient_id = appointments.patient_id
      and a.user_id = (select auth.uid())));
create policy appointments_insert on public.appointments for insert to authenticated
  with check (created_by = (select auth.uid()) and
    (private.has_tenant_role(tenant_id,array['admin','nurse'])
      or (doctor_id = (select auth.uid()) and private.has_tenant_role(tenant_id,array['doctor']))));
create policy appointments_update on public.appointments for update to authenticated
  using (private.has_tenant_role(tenant_id,array['admin','nurse'])
    or (doctor_id = (select auth.uid()) and private.has_tenant_role(tenant_id,array['doctor'])))
  with check (private.has_tenant_role(tenant_id,array['admin','nurse'])
    or (doctor_id = (select auth.uid()) and private.has_tenant_role(tenant_id,array['doctor'])));

-- A patient can resolve only the practitioner attached to their own appointment.
-- Appointment RLS does not query memberships (it uses the private role lookup).
create policy memberships_read_assigned_doctor on public.memberships for select to authenticated
  using (private.has_tenant_role(tenant_id,array['patient']) and exists (
    select 1 from public.appointments a where a.tenant_id = memberships.tenant_id
      and a.doctor_id = memberships.user_id));

create function private.validate_appointment() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.id <> old.id or new.tenant_id <> old.tenant_id or new.created_by <> old.created_by
      or new.created_at <> old.created_at then
      raise exception 'Immutable appointment identity' using errcode = '42501';
    end if;
    if old.status = 'cancelled' then
      raise exception 'Cancelled appointment is immutable' using errcode = '23514';
    end if;
    if new.status = 'cancelled' and
      (new.patient_id,new.doctor_id,new.starts_at,new.ends_at,new.kind) is distinct from
      (old.patient_id,old.doctor_id,old.starts_at,old.ends_at,old.kind) then
      raise exception 'Cancel separately from rescheduling' using errcode = '23514';
    end if;
    new.version := old.version + 1;
    new.updated_at := clock_timestamp();
  end if;
  if new.status = 'scheduled' then
    if new.starts_at <= now() then
      raise exception 'Appointment must be in the future' using errcode = '23514';
    end if;
    -- Live role check also blocks suspended and wrong-role practitioner assignments.
    if not exists (select 1 from public.memberships m where m.tenant_id = new.tenant_id
      and m.user_id = new.doctor_id and m.role = 'doctor' and m.status = 'active') then
      raise exception 'Active doctor required' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.validate_appointment() from public, anon, authenticated;
create trigger appointments_validate before insert or update on public.appointments
  for each row execute function private.validate_appointment();
create trigger appointments_audit after insert or update on public.appointments
  for each row execute function private.audit_change();
reset search_path;
