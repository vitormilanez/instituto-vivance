-- Slice 5B: direct, asynchronous patient-doctor messages (remote ledger aligned).
-- This is not a clinical triage or emergency channel. A conversation exists
-- only for one active patient account and one actively linked doctor. There
-- are no team recipients, attachments, delivery promises, edits or deletes.
create table public.care_conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  patient_id uuid not null,
  doctor_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  last_message_at timestamptz not null default clock_timestamp(),
  unique (tenant_id, patient_id, doctor_id),
  unique (tenant_id, id, patient_id, doctor_id),
  foreign key (tenant_id, patient_id)
    references public.patients(tenant_id, id),
  foreign key (tenant_id, doctor_id)
    references public.memberships(tenant_id, user_id)
);
create index care_conversations_doctor_recent
  on public.care_conversations(tenant_id, doctor_id, last_message_at desc, id);
create index care_conversations_patient_recent
  on public.care_conversations(tenant_id, patient_id, last_message_at desc, id);

create table public.care_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  conversation_id uuid not null,
  patient_id uuid not null,
  doctor_id uuid not null,
  sender_id uuid not null,
  content text not null check (char_length(btrim(content)) between 1 and 4000),
  sent_at timestamptz not null default clock_timestamp(),
  unique (tenant_id, id),
  foreign key (tenant_id, conversation_id, patient_id, doctor_id)
    references public.care_conversations(tenant_id, id, patient_id, doctor_id),
  foreign key (tenant_id, patient_id)
    references public.patients(tenant_id, id),
  foreign key (tenant_id, doctor_id)
    references public.memberships(tenant_id, user_id),
  foreign key (tenant_id, sender_id)
    references public.memberships(tenant_id, user_id)
);
create index care_messages_direct_history
  on public.care_messages(tenant_id, conversation_id, sent_at desc, id desc);

alter table public.care_conversations enable row level security;
alter table public.care_messages enable row level security;
revoke all on public.care_conversations, public.care_messages
  from public, anon, authenticated;
grant select on public.care_conversations, public.care_messages to authenticated;

-- This helper derives the patient identity from the live authenticated session.
-- It is used to reveal only active doctors to their own linked patient, without
-- granting broad care-team directory access to patient accounts.
create function private.patient_message_doctor_access(
  target_tenant uuid,
  target_doctor uuid
) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and private.has_tenant_role(target_tenant, array['patient'])
    and exists (
      select 1
      from public.patient_accounts account
      join public.care_relationships relationship
        on relationship.tenant_id = account.tenant_id
       and relationship.patient_id = account.patient_id
      join public.memberships doctor
        on doctor.tenant_id = relationship.tenant_id
       and doctor.user_id = relationship.professional_id
      where account.tenant_id = target_tenant
        and account.user_id = auth.uid()
        and relationship.professional_id = target_doctor
        and relationship.status = 'active'
        and doctor.role = 'doctor'
        and doctor.status = 'active'
    );
$$;
revoke all on function private.patient_message_doctor_access(uuid, uuid)
  from public, anon;
grant execute on function private.patient_message_doctor_access(uuid, uuid)
  to authenticated;

-- Same boundary as above, but tied to an explicit conversation pair so a
-- patient cannot select another patient's conversation by guessing identifiers.
create function private.patient_message_pair_access(
  target_tenant uuid,
  target_patient uuid,
  target_doctor uuid
) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and private.has_tenant_role(target_tenant, array['patient'])
    and exists (
      select 1
      from public.patient_accounts account
      join public.care_relationships relationship
        on relationship.tenant_id = account.tenant_id
       and relationship.patient_id = account.patient_id
      join public.memberships doctor
        on doctor.tenant_id = relationship.tenant_id
       and doctor.user_id = relationship.professional_id
      where account.tenant_id = target_tenant
        and account.patient_id = target_patient
        and account.user_id = auth.uid()
        and relationship.professional_id = target_doctor
        and relationship.status = 'active'
        and doctor.role = 'doctor'
        and doctor.status = 'active'
    );
$$;
revoke all on function private.patient_message_pair_access(uuid, uuid, uuid)
  from public, anon;
grant execute on function private.patient_message_pair_access(uuid, uuid, uuid)
  to authenticated;

create function private.has_direct_message_access(
  target_tenant uuid,
  target_patient uuid,
  target_doctor uuid
) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and private.has_live_session()
    and (
      (
        target_doctor = auth.uid()
        and private.has_tenant_role(target_tenant, array['doctor'])
        and exists (
          select 1
          from public.care_relationships relationship
          where relationship.tenant_id = target_tenant
            and relationship.patient_id = target_patient
            and relationship.professional_id = target_doctor
            and relationship.status = 'active'
        )
      )
      or private.patient_message_pair_access(
        target_tenant,
        target_patient,
        target_doctor
      )
    );
$$;
revoke all on function private.has_direct_message_access(uuid, uuid, uuid)
  from public, anon;
grant execute on function private.has_direct_message_access(uuid, uuid, uuid)
  to authenticated;

-- A patient may identify only doctors with whom they have an active direct
-- messaging link. This policy is intentionally narrower than team access.
create policy memberships_read_patient_message_doctors on public.memberships
  for select to authenticated
  using (private.patient_message_doctor_access(tenant_id, user_id));

create policy care_conversations_read_direct on public.care_conversations
  for select to authenticated
  using (private.has_direct_message_access(tenant_id, patient_id, doctor_id));
create policy care_messages_read_direct on public.care_messages
  for select to authenticated
  using (private.has_direct_message_access(tenant_id, patient_id, doctor_id));

-- Conversation state is append-only from the application's perspective.
-- The one public RPC is a narrow wrapper around the verified private write.
create function private.send_direct_message(
  target_tenant uuid,
  target_patient uuid,
  target_doctor uuid,
  message_text text
) returns table (
  conversation_id uuid,
  message_id uuid,
  sent_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
declare
  conversation uuid;
  message uuid;
  event_time timestamptz := clock_timestamp();
  normalized_content text := btrim(regexp_replace(message_text, '[[:space:]]+', ' ', 'g'));
begin
  if not private.has_direct_message_access(
    target_tenant,
    target_patient,
    target_doctor
  ) then
    raise exception 'Direct message access required' using errcode = '42501';
  end if;

  if normalized_content is null
    or char_length(normalized_content) not between 1 and 4000
    or normalized_content ~ '[[:cntrl:]]' then
    raise exception 'Valid direct message text required' using errcode = '23514';
  end if;

  insert into public.care_conversations(
    tenant_id,
    patient_id,
    doctor_id,
    last_message_at
  ) values (
    target_tenant,
    target_patient,
    target_doctor,
    event_time
  )
  on conflict (tenant_id, patient_id, doctor_id)
    do update set last_message_at = excluded.last_message_at
  returning id into conversation;

  insert into public.care_messages(
    tenant_id,
    conversation_id,
    patient_id,
    doctor_id,
    sender_id,
    content,
    sent_at
  ) values (
    target_tenant,
    conversation,
    target_patient,
    target_doctor,
    auth.uid(),
    normalized_content,
    event_time
  ) returning id into message;

  return query select conversation, message, event_time;
end;
$$;
revoke all on function private.send_direct_message(uuid, uuid, uuid, text)
  from public, anon;
grant execute on function private.send_direct_message(uuid, uuid, uuid, text)
  to authenticated;

create function public.send_direct_message(
  target_tenant uuid,
  target_patient uuid,
  target_doctor uuid,
  message_text text
) returns table (
  conversation_id uuid,
  message_id uuid,
  sent_at timestamptz
)
language sql security invoker set search_path = '' as $$
  select * from private.send_direct_message(
    target_tenant,
    target_patient,
    target_doctor,
    message_text
  );
$$;
revoke all on function public.send_direct_message(uuid, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.send_direct_message(uuid, uuid, uuid, text)
  to authenticated;

-- The audit ledger records only the event and changed field names. It never
-- copies the message content into the operational administrator's history.
create trigger care_conversations_audit after insert or update
  on public.care_conversations for each row execute function private.audit_change();
create trigger care_messages_audit after insert
  on public.care_messages for each row execute function private.audit_change();
