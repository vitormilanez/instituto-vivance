-- A professional may remove an invitation from their recent-history view
-- without deleting the invitation, patient, Auth identity or care records.
-- Pending invitations are revoked atomically before they are hidden.

alter table public.patient_invitations
  add column archived_at timestamptz,
  add column archived_by uuid,
  add constraint patient_invitations_archive_consistent
    check ((archived_at is null) = (archived_by is null));

create index patient_invitations_visible_actor_list
  on public.patient_invitations(tenant_id, invited_by, status, created_at desc)
  where archived_at is null;

create or replace function public.list_clinic_patient_invitations(target_tenant uuid)
returns table(
  id uuid, display_name text, channel text, status text, doctor_id uuid,
  delivery_status text, expires_at timestamptz, created_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select invitation.id, invitation.display_name, invitation.channel,
    case when invitation.status = 'pending' and invitation.expires_at <= clock_timestamp()
      then 'expired' else invitation.status end,
    invitation.doctor_id, invitation.delivery_status,
    invitation.expires_at, invitation.created_at
  from public.patient_invitations invitation
  where invitation.tenant_id = target_tenant
    and invitation.archived_at is null
    and (
      private.has_tenant_role(target_tenant, array['admin'])
      or (private.has_tenant_role(target_tenant, array['doctor'])
        and invitation.invited_by = auth.uid())
    )
  order by invitation.created_at desc, invitation.id
  limit 500;
$$;
revoke all on function public.list_clinic_patient_invitations(uuid) from public, anon;
grant execute on function public.list_clinic_patient_invitations(uuid) to authenticated;

create function public.archive_patient_invitation(
  target_tenant uuid,
  target_invitation uuid,
  explicit_confirm boolean
)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare invitation public.patient_invitations;
begin
  if explicit_confirm is distinct from true or not private.has_live_session() then
    raise exception 'Explicit invitation archive confirmation required' using errcode = '42501';
  end if;

  select * into invitation from public.patient_invitations
    where tenant_id = target_tenant and id = target_invitation for update;
  if not found then return false; end if;

  if not (
    private.has_tenant_role(target_tenant, array['admin'])
    or (private.has_tenant_role(target_tenant, array['doctor'])
      and invitation.invited_by = auth.uid())
  ) then
    raise exception 'Invitation archive denied' using errcode = '42501';
  end if;

  if invitation.archived_at is not null then return true; end if;

  update public.patient_invitations set
    status = case when status = 'pending' then 'revoked' else status end,
    token_hash = case when status = 'pending' then null else token_hash end,
    archived_at = clock_timestamp(),
    archived_by = auth.uid(),
    version = version + 1,
    updated_at = clock_timestamp()
  where id = invitation.id;

  return true;
end;
$$;
revoke all on function public.archive_patient_invitation(uuid, uuid, boolean) from public, anon;
grant execute on function public.archive_patient_invitation(uuid, uuid, boolean) to authenticated;

comment on function public.archive_patient_invitation(uuid, uuid, boolean) is
  'Hides one invitation from the authorized clinic history. Pending invitations are revoked first; patient and account records are never deleted.';
