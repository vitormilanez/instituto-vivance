-- Physician authored supportive messages; no clinical automation or external delivery.
-- A narrow API avoids granting physicians access to patient memberships.
create function public.preview_doctor_outreach(target_tenant uuid)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare recipients jsonb;
begin
  if not private.has_tenant_role(target_tenant, array['doctor']) then
    raise exception 'Active doctor session required' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', eligible.id, 'displayName', eligible.display_name)
    order by eligible.display_name, eligible.id), '[]'::jsonb) into recipients from (
    select patient.id, patient.display_name
    from public.care_relationships relationship
    join public.patients patient on patient.tenant_id = relationship.tenant_id and patient.id = relationship.patient_id
    join public.patient_accounts account on account.tenant_id = patient.tenant_id and account.patient_id = patient.id
    join public.memberships member on member.tenant_id = account.tenant_id and member.user_id = account.user_id
    join auth.users recipient on recipient.id = account.user_id
    where relationship.tenant_id = target_tenant and relationship.professional_id = auth.uid()
      and relationship.status = 'active' and member.role = 'patient' and member.status = 'active'
      and recipient.email_confirmed_at is not null and recipient.deleted_at is null
      and (recipient.banned_until is null or recipient.banned_until <= now())
  ) eligible;
  -- A JSON collection avoids PostgREST row limits silently truncating "all".
  if jsonb_array_length(recipients) > 1000 then
    raise exception 'Outreach recipient limit exceeded' using errcode = 'P1000';
  end if;
  return recipients;
end;
$$;
revoke all on function public.preview_doctor_outreach(uuid) from public, anon;
grant execute on function public.preview_doctor_outreach(uuid) to authenticated;

create function public.send_doctor_outreach_message(
  target_tenant uuid, target_patient uuid, message_text text, request_key uuid
) returns table(conversation_id uuid, message_id uuid, sent_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  eligible_patient uuid;
begin
  if request_key is null or not private.has_tenant_role(target_tenant, array['doctor']) then
    raise exception 'Active doctor session and request key required' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('outreach:' || target_tenant::text || ':' || auth.uid()::text, 0));
  -- Revocation commits before these checks (and is rejected) or after this send.
  perform 1 from public.tenants tenant where tenant.id = target_tenant for share;
  perform 1 from public.memberships sender where sender.tenant_id = target_tenant and sender.user_id = auth.uid() for share;
  perform 1 from auth.users sender where sender.id = auth.uid() for share;
  perform 1 from auth.sessions session where session.user_id = auth.uid()
    and session.id = nullif(auth.jwt()->>'session_id', '')::uuid for share;
  select patient.id into eligible_patient
    from public.care_relationships relationship
    join public.patients patient on patient.tenant_id = relationship.tenant_id and patient.id = relationship.patient_id
    join public.patient_accounts account on account.tenant_id = patient.tenant_id and account.patient_id = patient.id
    join public.memberships member on member.tenant_id = account.tenant_id and member.user_id = account.user_id
    join auth.users recipient on recipient.id = account.user_id
    where relationship.tenant_id = target_tenant and relationship.professional_id = auth.uid()
      and patient.id = target_patient and relationship.status = 'active'
      and member.role = 'patient' and member.status = 'active'
      and recipient.email_confirmed_at is not null and recipient.deleted_at is null
      and (recipient.banned_until is null or recipient.banned_until <= now())
    for share of relationship, patient, account, member, recipient;
  if eligible_patient is null or not private.has_tenant_role(target_tenant, array['doctor']) then
    raise exception 'Active app access and care relationship required' using errcode = '42501';
  end if;
  -- Successful retries do not consume the allowance. The existing writer
  -- validates immutable content/recipient under its request-key lock.
  if not exists (select 1 from public.care_messages stored
    where stored.tenant_id = target_tenant and stored.sender_id = auth.uid() and stored.client_request_id = request_key)
    and (select count(*) from public.care_messages stored
    where stored.tenant_id = target_tenant and stored.sender_id = auth.uid()
      and stored.sent_at > clock_timestamp() - interval '1 minute') >= 60 then
    raise exception 'Outreach rate exceeded' using errcode = 'P0060';
  end if;
  return query select * from private.send_direct_message_with_references(
    target_tenant, target_patient, auth.uid(), message_text, request_key, array[]::text[], array[]::uuid[]
  );
end;
$$;
revoke all on function public.send_doctor_outreach_message(uuid, uuid, text, uuid) from public, anon;
grant execute on function public.send_doctor_outreach_message(uuid, uuid, text, uuid) to authenticated;
