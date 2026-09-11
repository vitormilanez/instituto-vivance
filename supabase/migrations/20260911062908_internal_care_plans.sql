-- Slice 4A: private medical plans. Approval is NOT publication.
create table public.care_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  patient_id uuid not null,
  encounter_id uuid,
  doctor_id uuid not null default auth.uid(),
  doctor_display_name text not null default '',
  title text not null default '' check (length(title) <= 160),
  goals text not null default '' check (length(goals) <= 4000),
  actions text not null default '' check (length(actions) <= 8000),
  frequency text not null default '' check (length(frequency) <= 2000),
  period text not null default '' check (length(period) <= 2000),
  review_on date,
  status text not null default 'draft' check (status in ('draft','in_review','approved')),
  revision integer not null default 1,
  version integer not null default 1,
  expected_version integer,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,id),
  foreign key (tenant_id,patient_id) references public.patients(tenant_id,id),
  foreign key (tenant_id,encounter_id) references public.encounters(tenant_id,id),
  foreign key (tenant_id,doctor_id) references public.memberships(tenant_id,user_id),
  check (status = 'draft' or (btrim(title) <> '' and btrim(goals) <> ''
    and btrim(actions) <> '' and btrim(frequency) <> '' and btrim(period) <> '' and review_on is not null))
);
create index care_plans_patient_idx on public.care_plans(tenant_id,patient_id,created_at desc,id);
create index care_plans_doctor_idx on public.care_plans(tenant_id,doctor_id);
create index care_plans_encounter_idx on public.care_plans(tenant_id,encounter_id);
alter table public.care_plans enable row level security;
revoke all on public.care_plans from public,anon,authenticated;
grant select on public.care_plans to authenticated;
grant insert (tenant_id,patient_id,encounter_id) on public.care_plans to authenticated;
grant update (title,goals,actions,frequency,period,review_on,status,expected_version) on public.care_plans to authenticated;
create policy care_plans_read on public.care_plans for select to authenticated
  using (private.has_care_access(tenant_id,patient_id));
create policy care_plans_create on public.care_plans for insert to authenticated
  with check (doctor_id = (select auth.uid()) and private.has_tenant_role(tenant_id,array['doctor'])
    and private.has_care_access(tenant_id,patient_id));
create policy care_plans_edit on public.care_plans for update to authenticated
  using (doctor_id = (select auth.uid()) and private.has_tenant_role(tenant_id,array['doctor'])
    and private.has_care_access(tenant_id,patient_id))
  with check (doctor_id = (select auth.uid()) and private.has_tenant_role(tenant_id,array['doctor'])
    and private.has_care_access(tenant_id,patient_id));

-- Each save/state transition has an immutable snapshot, including approved revisions.
create table public.care_plan_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  plan_id uuid not null,
  version integer not null,
  revision integer not null,
  status text not null,
  title text not null,
  goals text not null,
  actions text not null,
  frequency text not null,
  period text not null,
  review_on date,
  approved_at timestamptz,
  actor_user_id uuid not null,
  created_at timestamptz not null default now(),
  unique (tenant_id,plan_id,version),
  foreign key (tenant_id,plan_id) references public.care_plans(tenant_id,id),
  foreign key (tenant_id,actor_user_id) references public.memberships(tenant_id,user_id)
);
create index care_plan_versions_actor_idx on public.care_plan_versions(tenant_id,actor_user_id);
alter table public.care_plan_versions enable row level security;
revoke all on public.care_plan_versions from public,anon,authenticated;
grant select on public.care_plan_versions to authenticated;
create policy care_plan_versions_read on public.care_plan_versions for select to authenticated
  using (exists (select 1 from public.care_plans p where p.tenant_id=care_plan_versions.tenant_id and p.id=care_plan_versions.plan_id));

create function private.validate_care_plan() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare same_content boolean;
begin
  if not private.has_tenant_role(new.tenant_id,array['doctor'])
    or not private.has_care_access(new.tenant_id,new.patient_id)
    or new.doctor_id is distinct from auth.uid() then
    raise exception 'Active author care access required' using errcode='42501';
  end if;
  if tg_op='INSERT' then
    if new.encounter_id is not null and not exists (
      select 1 from public.encounters e where e.tenant_id=new.tenant_id
        and e.id=new.encounter_id and e.patient_id=new.patient_id
    ) then raise exception 'Encounter does not belong to patient' using errcode='23514'; end if;
    select display_name into new.doctor_display_name from public.memberships
      where tenant_id=new.tenant_id and user_id=auth.uid();
    new.status := 'draft'; new.revision := 1; new.version := 1;
    new.approved_at := null; new.created_at := clock_timestamp();
  else
    if (new.id,new.tenant_id,new.patient_id,new.encounter_id,new.doctor_id,new.doctor_display_name,new.created_at)
      is distinct from (old.id,old.tenant_id,old.patient_id,old.encounter_id,old.doctor_id,old.doctor_display_name,old.created_at) then
      raise exception 'Immutable plan identity' using errcode='42501';
    end if;
    if new.expected_version is distinct from old.version then
      raise exception 'Stale plan version' using errcode='40001';
    end if;
    same_content := (new.title,new.goals,new.actions,new.frequency,new.period,new.review_on)
      is not distinct from (old.title,old.goals,old.actions,old.frequency,old.period,old.review_on);
    if not ((old.status='draft' and new.status in ('draft','in_review'))
      or (old.status='in_review' and new.status in ('draft','approved') and same_content)
      or (old.status='approved' and new.status='draft' and same_content)) then
      raise exception 'Review required; approved revision is immutable' using errcode='23514';
    end if;
    new.revision := old.revision + case when old.status='approved' then 1 else 0 end;
    new.version := old.version + 1;
    new.approved_at := case when new.status='approved' then clock_timestamp() else null end;
  end if;
  new.expected_version := null;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function private.validate_care_plan() from public,anon,authenticated;
create trigger care_plans_validate before insert or update on public.care_plans
  for each row execute function private.validate_care_plan();

create function private.record_care_plan_version() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_live_session() then raise exception 'Inactive session' using errcode='42501'; end if;
  insert into public.care_plan_versions(tenant_id,plan_id,version,revision,status,title,goals,actions,frequency,period,review_on,approved_at,actor_user_id)
    values(new.tenant_id,new.id,new.version,new.revision,new.status,new.title,new.goals,new.actions,new.frequency,new.period,new.review_on,new.approved_at,auth.uid());
  return new;
end;
$$;
revoke all on function private.record_care_plan_version() from public,anon,authenticated;
create trigger care_plans_version after insert or update on public.care_plans
  for each row execute function private.record_care_plan_version();
create trigger care_plans_audit after insert or update on public.care_plans
  for each row execute function private.audit_change();
