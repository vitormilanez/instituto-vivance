-- Keep application writes under RLS and column privileges. Private triggers
-- own concurrency, numbering, authorship and timestamps.

drop function public.update_encounter_draft(uuid,uuid,integer,text,text,text);

alter table public.encounters
  add column expected_version integer,
  add constraint encounters_expected_version_transient check (expected_version is null);
grant update (reason,evolution,status,expected_version) on public.encounters to authenticated;

create or replace function private.validate_encounter() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare a public.appointments;
begin
  if tg_op='INSERT' then
    select * into a from public.appointments where id=new.appointment_id and tenant_id=new.tenant_id for update;
    if not found or a.status<>'scheduled' or a.patient_id<>new.patient_id or a.doctor_id<>new.doctor_id
      or new.doctor_id is distinct from auth.uid() then
      raise exception 'Assigned scheduled appointment required' using errcode='42501';
    end if;
    new.version:=1; new.status:='draft'; new.finalized_at:=null; new.expected_version:=null;
    new.created_at:=clock_timestamp(); new.updated_at:=new.created_at;
  else
    if (new.id,new.tenant_id,new.appointment_id,new.patient_id,new.doctor_id,new.created_at) is distinct from
      (old.id,old.tenant_id,old.appointment_id,old.patient_id,old.doctor_id,old.created_at) then
      raise exception 'Immutable encounter identity' using errcode='42501';
    end if;
    if old.status='finalized' then
      raise exception 'Finalized encounter is immutable' using errcode='23514';
    end if;
    if new.expected_version is distinct from old.version then
      raise exception 'Stale encounter version' using errcode='40001';
    end if;
    new.expected_version:=null;
    new.version:=old.version+1; new.updated_at:=clock_timestamp();
    new.finalized_at:=case when new.status='finalized' then clock_timestamp() else null end;
  end if;
  return new;
end;
$$;

drop function public.append_encounter_addendum(uuid,uuid,integer,text,text);

grant insert (tenant_id,encounter_id,encounter_version,reason,content)
  on public.encounter_addenda to authenticated;
create policy encounter_addenda_insert_author on public.encounter_addenda for insert to authenticated
  with check (
    actor_user_id=(select auth.uid())
    and private.has_tenant_role(tenant_id,array['doctor'])
    and exists (
      select 1 from public.encounters e
      where e.tenant_id=encounter_addenda.tenant_id
        and e.id=encounter_addenda.encounter_id
        and e.doctor_id=(select auth.uid())
        and e.status='finalized'
        and e.version=encounter_addenda.encounter_version
        and private.has_care_access(e.tenant_id,e.patient_id)
    )
  );

create index encounter_addenda_actor_idx
  on public.encounter_addenda(tenant_id,actor_user_id);

create function private.prepare_encounter_addendum() returns trigger
language plpgsql security definer set search_path = '' as $$
declare current_record public.encounters;
begin
  select * into current_record from public.encounters
    where tenant_id=new.tenant_id and id=new.encounter_id for update;
  if not found
    or current_record.doctor_id is distinct from auth.uid()
    or not private.has_tenant_role(new.tenant_id,array['doctor'])
    or not private.has_care_access(new.tenant_id,current_record.patient_id) then
    raise exception 'Active author access required' using errcode='42501';
  end if;
  if current_record.status<>'finalized' then
    raise exception 'Finalized encounter required' using errcode='23514';
  end if;
  if current_record.version<>new.encounter_version then
    raise exception 'Stale encounter version' using errcode='40001';
  end if;

  select coalesce(max(addendum_number),0)+1 into new.addendum_number
    from public.encounter_addenda where encounter_id=current_record.id;
  new.actor_user_id:=auth.uid();
  new.created_at:=clock_timestamp();
  new.reason:=btrim(new.reason);
  new.content:=btrim(new.content);
  return new;
end;
$$;
revoke all on function private.prepare_encounter_addendum() from public,anon,authenticated;
create trigger encounter_addenda_prepare before insert on public.encounter_addenda
  for each row execute function private.prepare_encounter_addendum();
