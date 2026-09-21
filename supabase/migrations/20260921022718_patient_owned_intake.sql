-- Patients can complete the same short intake after accepting an invitation.
-- Linked invitations reuse an existing patient and intake instead of creating
-- a duplicate directory record.

alter table public.patient_intake_contexts
  drop constraint patient_intake_contexts_source_check;
alter table public.patient_intake_contexts
  add constraint patient_intake_contexts_source_check
  check (source in ('staff_assisted', 'patient_reported'));

alter table public.patient_invitations
  add column target_patient_id uuid,
  add foreign key (tenant_id, target_patient_id)
    references public.patients(tenant_id, id),
  add check (
    target_patient_id is null
    or patient_id is null
    or patient_id = target_patient_id
  );
create unique index patient_invitations_one_pending_target
  on public.patient_invitations(tenant_id, target_patient_id)
  where status = 'pending' and target_patient_id is not null;

drop policy patient_intake_read_authorized on public.patient_intake_contexts;
create policy patient_intake_read_authorized on public.patient_intake_contexts
  for select to authenticated using (
    (
      private.has_care_access(tenant_id, patient_id)
      and (source = 'staff_assisted' or status = 'completed')
    )
    or (
      private.has_tenant_role(tenant_id, array['patient'])
      and exists (
        select 1 from public.patient_accounts account
        where account.tenant_id = patient_intake_contexts.tenant_id
          and account.patient_id = patient_intake_contexts.patient_id
          and account.user_id = (select auth.uid())
      )
    )
  );

drop policy patient_intake_versions_read_authorized
  on public.patient_intake_context_versions;
create policy patient_intake_versions_read_authorized
  on public.patient_intake_context_versions for select to authenticated using (
    (
      private.has_care_access(tenant_id, patient_id)
      and (source = 'staff_assisted' or status = 'completed')
    )
    or (
      private.has_tenant_role(tenant_id, array['patient'])
      and exists (
        select 1 from public.patient_accounts account
        where account.tenant_id = patient_intake_context_versions.tenant_id
          and account.patient_id = patient_intake_context_versions.patient_id
          and account.user_id = (select auth.uid())
      )
    )
  );

create policy patient_intake_update_own on public.patient_intake_contexts
  for update to authenticated
  using (
    private.has_tenant_role(tenant_id, array['patient'])
    and exists (
      select 1 from public.patient_accounts account
      where account.tenant_id = patient_intake_contexts.tenant_id
        and account.patient_id = patient_intake_contexts.patient_id
        and account.user_id = (select auth.uid())
    )
  )
  with check (
    private.has_tenant_role(tenant_id, array['patient'])
    and exists (
      select 1 from public.patient_accounts account
      where account.tenant_id = patient_intake_contexts.tenant_id
        and account.patient_id = patient_intake_contexts.patient_id
        and account.user_id = (select auth.uid())
    )
  );

create or replace function private.validate_patient_intake_context()
returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if (new.id, new.tenant_id, new.patient_id, new.questionnaire_version,
      new.created_at) is distinct from
     (old.id, old.tenant_id, old.patient_id, old.questionnaire_version,
      old.created_at) then
    raise exception 'Immutable patient intake identity' using errcode = '42501';
  end if;
  if new.expected_version is null or new.expected_version <> old.version then
    raise exception 'Stale patient intake version' using errcode = '40001';
  end if;
  if old.status = 'completed' and new.status = 'draft' then
    raise exception 'Completed patient intake cannot return to draft'
      using errcode = '23514';
  end if;
  new.reason_text := btrim(new.reason_text);
  new.expected_outcome := btrim(new.expected_outcome);
  new.first_priority := btrim(new.first_priority);
  new.recorded_by := auth.uid();
  if private.has_tenant_role(new.tenant_id, array['doctor'])
    and private.has_care_access(new.tenant_id, new.patient_id) then
    new.source := 'staff_assisted';
    select coalesce(nullif(btrim(membership.display_name), ''), 'Médico da equipe')
      into new.recorded_by_name
      from public.memberships membership
      where membership.tenant_id = new.tenant_id
        and membership.user_id = auth.uid()
        and membership.role = 'doctor'
        and membership.status = 'active';
  elsif private.has_tenant_role(new.tenant_id, array['patient'])
    and exists (
      select 1 from public.patient_accounts account
      where account.tenant_id = new.tenant_id
        and account.patient_id = new.patient_id
        and account.user_id = auth.uid()
    ) then
    new.source := 'patient_reported';
    select coalesce(nullif(btrim(membership.display_name), ''), 'Paciente')
      into new.recorded_by_name
      from public.memberships membership
      where membership.tenant_id = new.tenant_id
        and membership.user_id = auth.uid()
        and membership.role = 'patient'
        and membership.status = 'active';
  else
    raise exception 'Active intake author required' using errcode = '42501';
  end if;
  if new.recorded_by_name is null then
    raise exception 'Active intake author required' using errcode = '42501';
  end if;
  new.version := old.version + 1;
  new.expected_version := null;
  new.completed_at := case
    when new.status = 'completed' then clock_timestamp()
    else null
  end;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function private.validate_patient_intake_context()
  from public, anon, authenticated;

create function private.validate_patient_invitation_target()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op <> 'INSERT' then
    if new.target_patient_id is distinct from old.target_patient_id then
      raise exception 'Immutable invitation target' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.target_patient_id is null then return new; end if;
  if new.invited_by <> new.doctor_id
    or not exists (
      select 1 from public.memberships doctor
      where doctor.tenant_id = new.tenant_id
        and doctor.user_id = new.doctor_id
        and doctor.role = 'doctor' and doctor.status = 'active'
    )
    or not exists (
      select 1 from public.care_relationships relationship
      where relationship.tenant_id = new.tenant_id
        and relationship.patient_id = new.target_patient_id
        and relationship.professional_id = new.doctor_id
        and relationship.status = 'active'
    )
    or not exists (
      select 1 from public.patient_intake_contexts intake
      where intake.tenant_id = new.tenant_id
        and intake.patient_id = new.target_patient_id
    )
    or exists (
      select 1 from public.patient_accounts account
      where account.tenant_id = new.tenant_id
        and account.patient_id = new.target_patient_id
    ) then
    raise exception 'Linked patient invitation unavailable'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_patient_invitation_target()
  from public, anon, authenticated;
create trigger patient_invitation_target_validate
  before insert or update on public.patient_invitations
  for each row execute function private.validate_patient_invitation_target();

create function public.patient_intake_invitation_available(
  target_tenant uuid, target_patient uuid
) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_live_session()
    and private.has_tenant_role(target_tenant, array['doctor'])
    and private.has_care_access(target_tenant, target_patient)
    and exists (
      select 1 from public.patient_intake_contexts intake
      where intake.tenant_id = target_tenant
        and intake.patient_id = target_patient
    )
    and not exists (
      select 1 from public.patient_accounts account
      where account.tenant_id = target_tenant
        and account.patient_id = target_patient
    )
    and not exists (
      select 1 from public.patient_invitations invitation
      where invitation.tenant_id = target_tenant
        and invitation.target_patient_id = target_patient
        and invitation.status = 'pending'
    );
$$;
revoke all on function public.patient_intake_invitation_available(uuid, uuid)
  from public, anon;
grant execute on function public.patient_intake_invitation_available(uuid, uuid)
  to authenticated;

create or replace function public.accept_patient_invitation(
  target_invitation uuid, explicit_accept boolean
)
returns table(
  invitation_id uuid, tenant_id uuid, patient_id uuid,
  onboarding_version integer
)
language plpgsql security definer set search_path = '' as $$
declare
  invitation public.patient_invitations;
  account auth.users;
  new_patient uuid;
  relationship_status text;
begin
  if explicit_accept is distinct from true or not private.has_live_session() then
    raise exception 'Explicit verified acceptance required' using errcode = '42501';
  end if;
  select * into account from auth.users where id = auth.uid();
  if not found or account.email_confirmed_at is null then
    raise exception 'Verified email required' using errcode = '42501';
  end if;
  select * into invitation from public.patient_invitations
    where id = target_invitation for update;
  if not found or invitation.status <> 'pending'
    or invitation.expires_at <= clock_timestamp()
    or invitation.recipient_email is null
    or lower(invitation.recipient_email) is distinct from lower(account.email)
    or not exists (
      select 1 from public.tenants tenant
      where tenant.id = invitation.tenant_id and tenant.status = 'active'
    )
    or not exists (
      select 1 from public.memberships inviter
      where inviter.tenant_id = invitation.tenant_id
        and inviter.user_id = invitation.invited_by
        and inviter.role in ('admin', 'doctor') and inviter.status = 'active'
    )
    or not exists (
      select 1 from public.memberships doctor
      where doctor.tenant_id = invitation.tenant_id
        and doctor.user_id = invitation.doctor_id
        and doctor.role = 'doctor' and doctor.status = 'active'
    ) then
    raise exception 'Invitation unavailable' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.patient_accounts existing
    where existing.tenant_id = invitation.tenant_id
      and existing.user_id = auth.uid()
  ) or exists (
    select 1 from public.memberships existing
    where existing.tenant_id = invitation.tenant_id
      and existing.user_id = auth.uid()
  ) then
    raise exception 'Existing clinical identity cannot be overwritten'
      using errcode = '23505';
  end if;
  if invitation.target_patient_id is null then
    insert into public.patients(tenant_id, display_name, created_by)
      values(invitation.tenant_id, invitation.display_name, invitation.invited_by)
      returning id into new_patient;
  else
    new_patient := invitation.target_patient_id;
    if not exists (
      select 1 from public.patients patient
      where patient.tenant_id = invitation.tenant_id
        and patient.id = new_patient
    ) or not exists (
      select 1 from public.care_relationships relationship
      where relationship.tenant_id = invitation.tenant_id
        and relationship.patient_id = new_patient
        and relationship.professional_id = invitation.doctor_id
        and relationship.status = 'active'
    ) or not exists (
      select 1 from public.patient_intake_contexts intake
      where intake.tenant_id = invitation.tenant_id
        and intake.patient_id = new_patient
    ) or exists (
      select 1 from public.patient_accounts existing
      where existing.tenant_id = invitation.tenant_id
        and existing.patient_id = new_patient
    ) then
      raise exception 'Linked patient unavailable' using errcode = '23514';
    end if;
  end if;
  insert into public.memberships(
    tenant_id, user_id, role, status, display_name
  ) values(
    invitation.tenant_id, auth.uid(), 'patient', 'active',
    invitation.display_name
  );
  insert into public.patient_accounts(tenant_id, user_id, patient_id)
    values(invitation.tenant_id, auth.uid(), new_patient);
  if invitation.target_patient_id is null then
    relationship_status := case
      when invitation.invited_by = invitation.doctor_id then 'active'
      else 'assigned'
    end;
    insert into public.care_relationships(
      tenant_id, patient_id, professional_id, status, created_by
    ) values(
      invitation.tenant_id, new_patient, invitation.doctor_id,
      relationship_status, invitation.invited_by
    );
  end if;
  insert into public.patient_onboarding(tenant_id, patient_id, user_id)
    values(invitation.tenant_id, new_patient, auth.uid());
  if invitation.target_patient_id is null then
    insert into public.patient_intake_contexts(
      tenant_id, patient_id, source, recorded_by, recorded_by_name
    ) values(
      invitation.tenant_id, new_patient, 'patient_reported', auth.uid(),
      invitation.display_name
    );
  end if;
  update public.patient_invitations set
    status = 'accepted', accepted_at = clock_timestamp(),
    accepted_by = auth.uid(), patient_id = new_patient,
    updated_at = clock_timestamp()
  where id = invitation.id;
  return query select invitation.id, invitation.tenant_id, new_patient, 1;
end;
$$;
revoke all on function public.accept_patient_invitation(uuid, boolean)
  from public, anon;
grant execute on function public.accept_patient_invitation(uuid, boolean)
  to authenticated;
