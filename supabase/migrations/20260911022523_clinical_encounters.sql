-- Manual clinical records, explicitly accepted care links and immutable versions.
-- No automatic clinical access from administrative membership or scheduling.
create table public.care_relationships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  patient_id uuid not null,
  professional_id uuid not null,
  status text not null default 'active' check (status in ('active','revoked')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (tenant_id,patient_id,professional_id),
  foreign key (tenant_id,patient_id) references public.patients(tenant_id,id),
  foreign key (tenant_id,professional_id) references public.memberships(tenant_id,user_id)
);
create index care_relationships_professional_idx on public.care_relationships(tenant_id,professional_id,patient_id);
alter table public.care_relationships enable row level security;
revoke all on public.care_relationships from public,anon,authenticated;
grant select on public.care_relationships to authenticated;
grant insert (tenant_id,patient_id,professional_id) on public.care_relationships to authenticated;

-- Private boolean lookup avoids recursive RLS; caller identity is never an argument.
create function private.has_care_access(t uuid,p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_tenant_role(t,array['doctor','nurse']) and exists (
    select 1 from public.care_relationships r where r.tenant_id=t and r.patient_id=p
      and r.professional_id=auth.uid() and r.status='active');
$$;
revoke all on function private.has_care_access(uuid,uuid) from public,anon;
grant execute on function private.has_care_access(uuid,uuid) to authenticated;
create policy care_read_self on public.care_relationships for select to authenticated
  using (professional_id=(select auth.uid()) and private.has_tenant_role(tenant_id,array['doctor','nurse']));
create policy care_accept_assigned on public.care_relationships for insert to authenticated
  with check (professional_id=(select auth.uid()) and created_by=(select auth.uid())
    and status='active' and private.has_tenant_role(tenant_id,array['doctor'])
    and exists (select 1 from public.appointments a where a.tenant_id=care_relationships.tenant_id
      and a.patient_id=care_relationships.patient_id and a.doctor_id=(select auth.uid()) and a.status='scheduled'));
create trigger care_relationships_audit after insert or update on public.care_relationships
  for each row execute function private.audit_change();

create table public.encounters (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  appointment_id uuid not null unique references public.appointments(id),
  patient_id uuid not null,
  doctor_id uuid not null,
  status text not null default 'draft' check (status in ('draft','finalized')),
  reason text not null default '' check (char_length(reason)<=2000),
  evolution text not null default '' check (char_length(evolution)<=10000),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finalized_at timestamptz,
  unique (tenant_id,id),
  foreign key (tenant_id,patient_id) references public.patients(tenant_id,id),
  foreign key (tenant_id,doctor_id) references public.memberships(tenant_id,user_id),
  check ((status='draft' and finalized_at is null) or
    (status='finalized' and finalized_at is not null and char_length(btrim(reason))>0 and char_length(btrim(evolution))>0))
);
create index encounters_patient_idx on public.encounters(tenant_id,patient_id,created_at desc,id);
create index encounters_doctor_idx on public.encounters(tenant_id,doctor_id,updated_at desc,id);
alter table public.encounters enable row level security;
revoke all on public.encounters from public,anon,authenticated;
grant select on public.encounters to authenticated;
grant insert (tenant_id,appointment_id,patient_id,doctor_id) on public.encounters to authenticated;
grant update (reason,evolution,status) on public.encounters to authenticated;
create policy encounters_read_care on public.encounters for select to authenticated
  using (private.has_care_access(tenant_id,patient_id));
create policy encounters_insert_author on public.encounters for insert to authenticated
  with check (doctor_id=(select auth.uid()) and private.has_tenant_role(tenant_id,array['doctor'])
    and private.has_care_access(tenant_id,patient_id));
create policy encounters_update_author on public.encounters for update to authenticated
  using (doctor_id=(select auth.uid()) and private.has_tenant_role(tenant_id,array['doctor'])
    and private.has_care_access(tenant_id,patient_id))
  with check (doctor_id=(select auth.uid()) and private.has_tenant_role(tenant_id,array['doctor'])
    and private.has_care_access(tenant_id,patient_id));

create table public.encounter_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  encounter_id uuid not null,
  version integer not null,
  status text not null,
  reason text not null,
  evolution text not null,
  actor_user_id uuid not null,
  created_at timestamptz not null default now(),
  unique(encounter_id,version),
  foreign key (tenant_id,encounter_id) references public.encounters(tenant_id,id)
);
create index encounter_versions_tenant_idx on public.encounter_versions(tenant_id,encounter_id,version);
alter table public.encounter_versions enable row level security;
revoke all on public.encounter_versions from public,anon,authenticated;
grant select on public.encounter_versions to authenticated;
create policy encounter_versions_read_care on public.encounter_versions for select to authenticated
  using (exists(select 1 from public.encounters e where e.tenant_id=encounter_versions.tenant_id and e.id=encounter_versions.encounter_id));

create function private.validate_encounter() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare a public.appointments;
begin
  if tg_op='INSERT' then
    select * into a from public.appointments where id=new.appointment_id and tenant_id=new.tenant_id for update;
    if not found or a.status<>'scheduled' or a.patient_id<>new.patient_id or a.doctor_id<>new.doctor_id
      or new.doctor_id is distinct from auth.uid() then
      raise exception 'Assigned scheduled appointment required' using errcode='42501';
    end if;
    new.version:=1; new.status:='draft'; new.finalized_at:=null;
    new.created_at:=clock_timestamp(); new.updated_at:=new.created_at;
  else
    if (new.id,new.tenant_id,new.appointment_id,new.patient_id,new.doctor_id,new.created_at) is distinct from
      (old.id,old.tenant_id,old.appointment_id,old.patient_id,old.doctor_id,old.created_at) then
      raise exception 'Immutable encounter identity' using errcode='42501';
    end if;
    if old.status='finalized' then
      raise exception 'Finalized encounter is immutable' using errcode='23514';
    end if;
    new.version:=old.version+1; new.updated_at:=clock_timestamp();
    new.finalized_at:=case when new.status='finalized' then clock_timestamp() else null end;
  end if;
  return new;
end;
$$;
revoke all on function private.validate_encounter() from public,anon,authenticated;
create trigger encounters_validate before insert or update on public.encounters for each row execute function private.validate_encounter();

-- Snapshots and metadata-only operational audit commit in the same transaction.
create function private.record_encounter_version() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_live_session() then raise exception 'Inactive session' using errcode='42501'; end if;
  insert into public.encounter_versions(tenant_id,encounter_id,version,status,reason,evolution,actor_user_id)
    values(new.tenant_id,new.id,new.version,new.status,new.reason,new.evolution,auth.uid());
  return new;
end;
$$;
revoke all on function private.record_encounter_version() from public,anon,authenticated;
create trigger encounters_version after insert or update on public.encounters for each row execute function private.record_encounter_version();
create trigger encounters_audit after insert or update on public.encounters for each row execute function private.audit_change();

-- Serializes start against schedule edits. An operational actor cannot change
-- patient/practitioner/time or cancel an appointment after clinical work started.
create function private.lock_started_appointment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.encounters e where e.appointment_id=old.id) then
    raise exception 'Appointment already has an encounter' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.lock_started_appointment() from public,anon,authenticated;
create trigger appointments_clinical_lock before update on public.appointments for each row execute function private.lock_started_appointment();

-- Explicit start, not GET/render. Invoker rights preserve table RLS throughout.
create function public.start_encounter(target_tenant uuid,target_appointment uuid,accept_care boolean) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare a public.appointments; result uuid;
begin
  if accept_care is distinct from true or not private.has_tenant_role(target_tenant,array['doctor']) then
    raise exception 'Explicit doctor acceptance required' using errcode='42501';
  end if;
  select * into a from public.appointments where id=target_appointment and tenant_id=target_tenant for update;
  if not found or a.doctor_id is distinct from auth.uid() or a.status<>'scheduled' then
    raise exception 'Assigned scheduled appointment required' using errcode='42501';
  end if;
  if not exists(select 1 from public.care_relationships r where r.tenant_id=target_tenant and r.patient_id=a.patient_id and r.professional_id=auth.uid()) then
    insert into public.care_relationships(tenant_id,patient_id,professional_id) values(target_tenant,a.patient_id,auth.uid());
  end if;
  if not private.has_care_access(target_tenant,a.patient_id) then
    raise exception 'Active care relationship required' using errcode='42501';
  end if;
  select id into result from public.encounters where appointment_id=a.id;
  if result is not null then return result; end if;
  insert into public.encounters(tenant_id,appointment_id,patient_id,doctor_id)
    values(target_tenant,a.id,a.patient_id,auth.uid()) returning id into result;
  return result;
end;
$$;
revoke all on function public.start_encounter(uuid,uuid,boolean) from public,anon;
grant execute on function public.start_encounter(uuid,uuid,boolean) to authenticated;
