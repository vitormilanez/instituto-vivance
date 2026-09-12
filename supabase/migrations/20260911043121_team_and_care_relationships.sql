-- Slice 3C: operational team invitations and explicit care responsibility.
-- Operational administrators can manage metadata, but clinical tables keep
-- requiring an active, explicitly accepted care relationship.

alter table public.memberships drop constraint memberships_status_check;
alter table public.memberships
  add column version integer not null default 1 check (version > 0),
  add column expected_version integer,
  add column accepted_at timestamptz;
update public.memberships
  set accepted_at = created_at
  where status in ('active', 'suspended');
alter table public.memberships
  add constraint memberships_status_check
    check (status in ('invited', 'active', 'suspended')),
  add constraint memberships_acceptance_check
    check (
      (status = 'invited' and accepted_at is null)
      or (status = 'active' and accepted_at is not null)
      or status = 'suspended'
    );

-- Pending invitations are visible only to the invited identity. They confer no
-- tenant role and therefore no operational or clinical access.
create function private.has_pending_membership(target_tenant uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and private.has_live_session() and exists (
    select 1
    from public.memberships m
    join public.tenants t on t.id = m.tenant_id
    where m.tenant_id = target_tenant
      and m.user_id = auth.uid()
      and m.status = 'invited'
      and t.status = 'active'
  );
$$;
revoke all on function private.has_pending_membership(uuid) from public, anon;
grant execute on function private.has_pending_membership(uuid) to authenticated;

grant insert (tenant_id, user_id, role, status, display_name)
  on public.memberships to authenticated;
grant update (display_name, status, expected_version)
  on public.memberships to authenticated;

-- Reading one's own access metadata must not recursively depend on the same
-- membership row. Tenant access still requires the separate tenant policy and
-- every operational/clinical table still calls has_tenant_role.
drop policy memberships_read_self on public.memberships;
create policy memberships_read_self on public.memberships for select to authenticated
  using (
    user_id = (select auth.uid())
    and status = 'active'
    and private.has_live_session()
  );
create policy tenants_read_invited on public.tenants for select to authenticated
  using (private.has_pending_membership(id));
create policy memberships_read_invited_self on public.memberships for select to authenticated
  using (user_id = (select auth.uid()) and status = 'invited'
    and private.has_pending_membership(tenant_id));
create policy memberships_read_admin_team on public.memberships for select to authenticated
  using (private.has_tenant_role(tenant_id, array['admin']));
create policy memberships_admin_invite on public.memberships for insert to authenticated
  with check (
    private.has_tenant_role(tenant_id, array['admin'])
    and user_id <> (select auth.uid())
    and role in ('doctor', 'nurse')
    and status = 'invited'
  );
create policy memberships_admin_manage on public.memberships for update to authenticated
  using (
    private.has_tenant_role(tenant_id, array['admin'])
    and user_id <> (select auth.uid())
    and role in ('doctor', 'nurse')
  )
  with check (
    private.has_tenant_role(tenant_id, array['admin'])
    and user_id <> (select auth.uid())
    and role in ('doctor', 'nurse')
  );
create policy memberships_accept_invite on public.memberships for update to authenticated
  using (
    user_id = (select auth.uid())
    and status = 'invited'
    and private.has_pending_membership(tenant_id)
  )
  with check (
    user_id = (select auth.uid())
    and status = 'active'
    and role in ('doctor', 'nurse')
  );

create function private.validate_membership_management() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  actor_is_admin boolean;
begin
  -- Migrations and isolated test setup run as the table owner. All application
  -- requests run as `authenticated` and take the strict path below.
  if current_user <> 'authenticated' then
    if tg_op = 'INSERT' then
      new.version := 1;
      new.expected_version := null;
      if new.status = 'active' and new.accepted_at is null then
        new.accepted_at := new.created_at;
      end if;
    else
      new.version := old.version + 1;
      new.expected_version := null;
      if new.status = 'active' and new.accepted_at is null then
        new.accepted_at := clock_timestamp();
      end if;
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    if not private.has_live_session()
      or not private.has_tenant_role(new.tenant_id, array['admin'])
      or new.user_id = auth.uid()
      or new.role not in ('doctor', 'nurse')
      or new.status <> 'invited' then
      raise exception 'Administrator invitation required' using errcode = '42501';
    end if;
    new.display_name := nullif(btrim(new.display_name), '');
    if new.display_name is null
      or char_length(new.display_name) < 2
      or char_length(new.display_name) > 120 then
      raise exception 'Invalid team member name' using errcode = '23514';
    end if;
    new.created_at := clock_timestamp();
    new.accepted_at := null;
    new.version := 1;
    new.expected_version := null;
    return new;
  end if;

  if (new.tenant_id, new.user_id, new.role, new.created_at) is distinct from
    (old.tenant_id, old.user_id, old.role, old.created_at) then
    raise exception 'Immutable membership identity' using errcode = '42501';
  end if;
  if new.expected_version is null or new.expected_version <> old.version then
    raise exception 'Stale membership version' using errcode = '40001';
  end if;
  if new.display_name is distinct from old.display_name then
    new.display_name := nullif(btrim(new.display_name), '');
    if new.display_name is null
      or char_length(new.display_name) < 2
      or char_length(new.display_name) > 120 then
      raise exception 'Invalid team member name' using errcode = '23514';
    end if;
  end if;

  actor_is_admin := private.has_tenant_role(old.tenant_id, array['admin']);
  if auth.uid() = old.user_id then
    if old.status <> 'invited' or new.status <> 'active'
      or new.display_name is distinct from old.display_name then
      raise exception 'Only invitation acceptance is allowed' using errcode = '42501';
    end if;
    new.accepted_at := clock_timestamp();
  elsif actor_is_admin and old.role in ('doctor', 'nurse') then
    if new.status = old.status and new.display_name is not distinct from old.display_name then
      raise exception 'No membership change' using errcode = '23514';
    end if;
    if new.status <> old.status and not (
      (old.status = 'active' and new.status = 'suspended')
      or (old.status = 'suspended' and old.accepted_at is not null and new.status = 'active')
      or (old.status = 'invited' and new.status = 'suspended')
      or (old.status = 'suspended' and old.accepted_at is null and new.status = 'invited')
    ) then
      raise exception 'Invalid membership transition' using errcode = '23514';
    end if;
    if new.status = 'invited' then new.accepted_at := null; end if;
  else
    raise exception 'Membership management denied' using errcode = '42501';
  end if;

  new.version := old.version + 1;
  new.expected_version := null;
  return new;
end;
$$;
revoke all on function private.validate_membership_management()
  from public, anon, authenticated;
create trigger memberships_validate_management
  before insert or update on public.memberships
  for each row execute function private.validate_membership_management();

alter table public.care_relationships drop constraint care_relationships_status_check;
alter table public.care_relationships
  add column version integer not null default 1 check (version > 0),
  add column expected_version integer,
  add column accepted_at timestamptz,
  add column revoked_at timestamptz,
  add column updated_at timestamptz not null default now();
update public.care_relationships
  set accepted_at = created_at,
      updated_at = created_at
  where status = 'active';
update public.care_relationships
  set revoked_at = created_at,
      updated_at = created_at
  where status = 'revoked';
alter table public.care_relationships
  alter column status set default 'assigned',
  add constraint care_relationships_status_check
    check (status in ('assigned', 'active', 'revoked')),
  add constraint care_relationships_state_check
    check (
      (status = 'assigned' and accepted_at is null and revoked_at is null)
      or (status = 'active' and accepted_at is not null and revoked_at is null)
      or (status = 'revoked' and revoked_at is not null)
    );

create index care_relationships_patient_idx
  on public.care_relationships(tenant_id, patient_id, status, professional_id);

grant insert (tenant_id, patient_id, professional_id, status)
  on public.care_relationships to authenticated;
grant update (status, expected_version)
  on public.care_relationships to authenticated;

drop policy care_read_self on public.care_relationships;
drop policy care_accept_assigned on public.care_relationships;
create policy care_read_professional on public.care_relationships for select to authenticated
  using (
    professional_id = (select auth.uid())
    and private.has_tenant_role(tenant_id, array['doctor', 'nurse'])
  );
create policy care_read_admin on public.care_relationships for select to authenticated
  using (private.has_tenant_role(tenant_id, array['admin']));
create policy care_assign_admin on public.care_relationships for insert to authenticated
  with check (
    status = 'assigned'
    and created_by = (select auth.uid())
    and private.has_tenant_role(tenant_id, array['admin'])
  );
create policy care_accept_scheduled on public.care_relationships for insert to authenticated
  with check (
    status = 'active'
    and professional_id = (select auth.uid())
    and created_by = (select auth.uid())
    and private.has_tenant_role(tenant_id, array['doctor'])
    and exists (
      select 1 from public.appointments a
      where a.tenant_id = care_relationships.tenant_id
        and a.patient_id = care_relationships.patient_id
        and a.doctor_id = (select auth.uid())
        and a.status = 'scheduled'
    )
  );
create policy care_accept_professional on public.care_relationships for update to authenticated
  using (
    status = 'assigned'
    and professional_id = (select auth.uid())
    and private.has_tenant_role(tenant_id, array['doctor', 'nurse'])
  )
  with check (
    status = 'active'
    and professional_id = (select auth.uid())
    and private.has_tenant_role(tenant_id, array['doctor', 'nurse'])
  );
create policy care_manage_admin on public.care_relationships for update to authenticated
  using (private.has_tenant_role(tenant_id, array['admin']))
  with check (
    status in ('assigned', 'revoked')
    and private.has_tenant_role(tenant_id, array['admin'])
  );

create function private.validate_care_relationship_management() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  actor_is_admin boolean;
  actor_is_professional boolean;
begin
  if tg_op = 'INSERT' then
    if not exists (
      select 1 from public.memberships m
      where m.tenant_id = new.tenant_id
        and m.user_id = new.professional_id
        and m.role in ('doctor', 'nurse')
        and m.status = 'active'
    ) then
      raise exception 'Active care professional required' using errcode = '23514';
    end if;

    if current_user = 'authenticated' then
      actor_is_admin := private.has_tenant_role(new.tenant_id, array['admin']);
      actor_is_professional := new.professional_id = auth.uid()
        and private.has_tenant_role(new.tenant_id, array['doctor']);
      if actor_is_admin then
        if new.status <> 'assigned' then
          raise exception 'Administrator can only assign pending care'
            using errcode = '42501';
        end if;
      elsif actor_is_professional and new.status = 'active' and exists (
        select 1 from public.appointments a
        where a.tenant_id = new.tenant_id
          and a.patient_id = new.patient_id
          and a.doctor_id = auth.uid()
          and a.status = 'scheduled'
      ) then
        new.status := 'active';
      else
        raise exception 'Care assignment denied' using errcode = '42501';
      end if;
      new.created_by := auth.uid();
    end if;

    new.version := 1;
    new.expected_version := null;
    new.created_at := clock_timestamp();
    new.updated_at := new.created_at;
    if new.status = 'active' then
      new.accepted_at := new.created_at;
      new.revoked_at := null;
    elsif new.status = 'assigned' then
      new.accepted_at := null;
      new.revoked_at := null;
    else
      new.revoked_at := new.created_at;
    end if;
    return new;
  end if;

  if (new.id, new.tenant_id, new.patient_id, new.professional_id,
      new.created_by, new.created_at) is distinct from
     (old.id, old.tenant_id, old.patient_id, old.professional_id,
      old.created_by, old.created_at) then
    raise exception 'Immutable care relationship identity' using errcode = '42501';
  end if;

  if current_user = 'authenticated' then
    if new.expected_version is null or new.expected_version <> old.version then
      raise exception 'Stale care relationship version' using errcode = '40001';
    end if;
    actor_is_admin := private.has_tenant_role(old.tenant_id, array['admin']);
    actor_is_professional := old.professional_id = auth.uid()
      and private.has_tenant_role(old.tenant_id, array['doctor', 'nurse']);
    if actor_is_admin then
      if not (
        (old.status in ('assigned', 'active') and new.status = 'revoked')
        or (old.status = 'revoked' and new.status = 'assigned')
      ) then
        raise exception 'Invalid care administration transition' using errcode = '23514';
      end if;
    elsif actor_is_professional then
      if old.status <> 'assigned' or new.status <> 'active' then
        raise exception 'Only care acceptance is allowed' using errcode = '42501';
      end if;
    else
      raise exception 'Care relationship management denied' using errcode = '42501';
    end if;
  end if;

  if new.status = old.status then
    raise exception 'No care relationship change' using errcode = '23514';
  end if;
  new.version := old.version + 1;
  new.expected_version := null;
  new.updated_at := clock_timestamp();
  if new.status = 'assigned' then
    new.accepted_at := null;
    new.revoked_at := null;
  elsif new.status = 'active' then
    new.accepted_at := new.updated_at;
    new.revoked_at := null;
  else
    new.revoked_at := new.updated_at;
  end if;
  return new;
end;
$$;
revoke all on function private.validate_care_relationship_management()
  from public, anon, authenticated;
create trigger care_relationships_validate_management
  before insert or update on public.care_relationships
  for each row execute function private.validate_care_relationship_management();

-- Accepts an assigned relationship through the existing explicit start action,
-- but never revives a revoked relationship.
create or replace function public.start_encounter(
  target_tenant uuid,
  target_appointment uuid,
  accept_care boolean
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  a public.appointments;
  relationship public.care_relationships;
  result uuid;
begin
  if accept_care is distinct from true
    or not private.has_tenant_role(target_tenant, array['doctor']) then
    raise exception 'Explicit doctor acceptance required' using errcode = '42501';
  end if;
  select * into a
    from public.appointments
    where id = target_appointment and tenant_id = target_tenant
    for update;
  if not found or a.doctor_id is distinct from auth.uid() or a.status <> 'scheduled' then
    raise exception 'Assigned scheduled appointment required' using errcode = '42501';
  end if;

  insert into public.care_relationships(
    tenant_id, patient_id, professional_id, status
  ) values (target_tenant, a.patient_id, auth.uid(), 'active')
  on conflict (tenant_id, patient_id, professional_id) do nothing;

  select * into relationship
    from public.care_relationships
    where tenant_id = target_tenant
      and patient_id = a.patient_id
      and professional_id = auth.uid();
  if not found then
    raise exception 'Care relationship unavailable' using errcode = '42501';
  elsif relationship.status = 'assigned' then
    update public.care_relationships
      set status = 'active', expected_version = relationship.version
      where id = relationship.id;
  elsif relationship.status <> 'active' then
    raise exception 'Revoked care relationship cannot be reactivated here' using errcode = '42501';
  end if;

  if not private.has_care_access(target_tenant, a.patient_id) then
    raise exception 'Active care relationship required' using errcode = '42501';
  end if;
  select id into result from public.encounters where appointment_id = a.id;
  if result is not null then return result; end if;
  insert into public.encounters(tenant_id, appointment_id, patient_id, doctor_id)
    values(target_tenant, a.id, a.patient_id, auth.uid())
    returning id into result;
  return result;
end;
$$;
revoke all on function public.start_encounter(uuid, uuid, boolean) from public, anon;
grant execute on function public.start_encounter(uuid, uuid, boolean) to authenticated;
