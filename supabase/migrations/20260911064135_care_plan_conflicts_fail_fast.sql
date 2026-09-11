-- An obsolete expected_version is a domain conflict, not a retryable serialization failure.
-- Keep all existing authorization and immutable-history checks unchanged.
create or replace function private.validate_care_plan() returns trigger
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
      raise exception 'Stale plan version' using errcode='23514';
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
