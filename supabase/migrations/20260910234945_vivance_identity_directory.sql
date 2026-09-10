-- Slice 1: identity and demographic directory. No clinical records or seed data.
-- Filename aligned with the version returned by the remote migration ledger.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

create table public.memberships (
  tenant_id uuid not null references public.tenants(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'doctor', 'nurse', 'patient')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
create index memberships_user_idx on public.memberships(user_id, tenant_id);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 160),
  birth_date date check (birth_date >= date '1900-01-01' and birth_date <= current_date),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id)
);
create index patients_tenant_name_idx on public.patients(tenant_id, display_name, id);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  actor_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  changed_fields text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_tenant_created_idx on public.audit_events(tenant_id, created_at desc, id);

-- Deliberately privileged private lookup of managed Auth state. JWT validity
-- alone is insufficient after logout/deletion. No caller-supplied identity.
create function private.has_live_session() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from auth.sessions s join auth.users u on u.id = s.user_id
    where s.id = nullif(auth.jwt()->>'session_id', '')::uuid
      and s.user_id = auth.uid()
      and (s.not_after is null or s.not_after > now())
      and u.deleted_at is null
      and (u.banned_until is null or u.banned_until <= now())
  );
$$;
revoke all on function private.has_live_session() from public, anon;
grant execute on function private.has_live_session() to authenticated;

-- Avoids recursive membership/tenant RLS. Returns only a boolean for the
-- authenticated actor, using live database roles, never user_metadata.
create function private.has_tenant_role(target_tenant uuid, allowed_roles text[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and private.has_live_session() and exists (
    select 1 from public.memberships m join public.tenants t on t.id = m.tenant_id
    where m.tenant_id = target_tenant and m.user_id = auth.uid()
      and m.status = 'active' and t.status = 'active' and m.role = any(allowed_roles)
  );
$$;
revoke all on function private.has_tenant_role(uuid, text[]) from public, anon;
grant execute on function private.has_tenant_role(uuid, text[]) to authenticated;

alter table public.tenants enable row level security;
alter table public.memberships enable row level security;
alter table public.patients enable row level security;
alter table public.audit_events enable row level security;

revoke all on public.tenants, public.memberships, public.patients, public.audit_events from public, anon, authenticated;
grant select on public.tenants, public.memberships, public.patients, public.audit_events to authenticated;
grant insert (tenant_id, display_name, birth_date) on public.patients to authenticated;
grant update (display_name, birth_date) on public.patients to authenticated;

create policy tenants_read on public.tenants for select to authenticated
  using (private.has_tenant_role(id, array['admin','doctor','nurse','patient']));
create policy memberships_read_self on public.memberships for select to authenticated
  using (user_id = (select auth.uid()) and status = 'active'
    and private.has_tenant_role(tenant_id, array['admin','doctor','nurse','patient']));

-- Directory authorization only. Future clinical tables MUST require an active
-- care relationship as well; an operational admin is not a clinical role.
create policy patients_read_directory on public.patients for select to authenticated
  using (private.has_tenant_role(tenant_id, array['admin','doctor','nurse']));
create policy patients_insert_directory on public.patients for insert to authenticated
  with check (created_by = (select auth.uid())
    and private.has_tenant_role(tenant_id, array['admin','doctor','nurse']));
create policy patients_update_directory on public.patients for update to authenticated
  using (private.has_tenant_role(tenant_id, array['admin','doctor','nurse']))
  with check (private.has_tenant_role(tenant_id, array['admin','doctor','nurse']));
create policy audit_read_admin on public.audit_events for select to authenticated
  using (private.has_tenant_role(tenant_id, array['admin']));

create function private.touch_patient() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.tenant_id <> old.tenant_id or new.id <> old.id or new.created_by <> old.created_by then
    raise exception 'Immutable patient identity' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.touch_patient() from public, anon, authenticated;
create trigger patients_touch before update on public.patients for each row execute function private.touch_patient();

-- Only a trigger can append audit entries. Privilege is needed because end users
-- intentionally have no INSERT/UPDATE/DELETE rights on the audit table.
-- Payload excludes names, dates of birth, credentials and clinical content.
create function private.audit_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  row_new jsonb := to_jsonb(new);
  row_old jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  event_tenant uuid;
  event_entity uuid;
  fields text[];
begin
  if auth.uid() is not null and not private.has_live_session() then
    raise exception 'Inactive session' using errcode = '42501';
  end if;
  event_tenant := case when tg_table_name = 'tenants' then (row_new->>'id')::uuid else (row_new->>'tenant_id')::uuid end;
  event_entity := case when tg_table_name = 'memberships' then (row_new->>'user_id')::uuid else (row_new->>'id')::uuid end;
  select coalesce(array_agg(key order by key), '{}'::text[]) into fields
    from jsonb_each(row_new) where row_old->key is distinct from value and key <> 'updated_at';
  insert into public.audit_events (tenant_id, actor_user_id, action, entity_type, entity_id, changed_fields)
    values (event_tenant, auth.uid(), lower(tg_op), tg_table_name, event_entity, fields);
  return new;
end;
$$;
revoke all on function private.audit_change() from public, anon, authenticated;
create trigger tenants_audit after insert or update on public.tenants for each row execute function private.audit_change();
create trigger memberships_audit after insert or update on public.memberships for each row execute function private.audit_change();
create trigger patients_audit after insert or update on public.patients for each row execute function private.audit_change();
