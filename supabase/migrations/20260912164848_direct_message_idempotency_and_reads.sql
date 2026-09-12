-- Slice 5B.1: retry-safe direct messages and participant-owned read cursors.
alter table public.care_messages add column client_request_id uuid;
update public.care_messages set client_request_id = id where client_request_id is null;
alter table public.care_messages alter column client_request_id set not null;
alter table public.care_messages
  add constraint care_messages_sender_request_key
  unique (tenant_id, sender_id, client_request_id);
alter table public.care_messages
  add constraint care_messages_read_cursor_key
  unique (tenant_id, id, conversation_id, patient_id, doctor_id);

alter table public.care_conversations add column last_sender_id uuid;
update public.care_conversations conversation
set last_sender_id = (
  select message.sender_id
  from public.care_messages message
  where message.tenant_id = conversation.tenant_id
    and message.conversation_id = conversation.id
  order by message.sent_at desc, message.id desc
  limit 1
);
alter table public.care_conversations
  add constraint care_conversations_tenant_id_last_sender_id_fkey
  foreign key (tenant_id, last_sender_id)
  references public.memberships(tenant_id, user_id);

create table public.care_conversation_reads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  conversation_id uuid not null,
  patient_id uuid not null,
  doctor_id uuid not null,
  reader_id uuid not null,
  last_read_message_id uuid not null,
  last_read_sent_at timestamptz not null,
  last_read_at timestamptz not null,
  updated_at timestamptz not null default clock_timestamp(),
  unique (tenant_id, id),
  unique (tenant_id, conversation_id, reader_id),
  foreign key (tenant_id, conversation_id, patient_id, doctor_id)
    references public.care_conversations(tenant_id, id, patient_id, doctor_id),
  foreign key (tenant_id, reader_id)
    references public.memberships(tenant_id, user_id),
  foreign key (
    tenant_id,
    last_read_message_id,
    conversation_id,
    patient_id,
    doctor_id
  ) references public.care_messages(
    tenant_id,
    id,
    conversation_id,
    patient_id,
    doctor_id
  )
);
create index care_conversation_reads_reader
  on public.care_conversation_reads(tenant_id, reader_id, updated_at desc);

alter table public.care_conversation_reads enable row level security;
revoke all on public.care_conversation_reads from public, anon, authenticated;
grant select on public.care_conversation_reads to authenticated;
create policy care_conversation_reads_own on public.care_conversation_reads
  for select to authenticated
  using (
    reader_id = (select auth.uid())
    and private.has_direct_message_access(tenant_id, patient_id, doctor_id)
  );

drop function public.send_direct_message(uuid, uuid, uuid, text);
drop function private.send_direct_message(uuid, uuid, uuid, text);

create function private.send_direct_message(
  target_tenant uuid,
  target_patient uuid,
  target_doctor uuid,
  message_text text,
  request_key uuid
) returns table (
  conversation_id uuid,
  message_id uuid,
  sent_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
declare
  conversation uuid;
  message uuid;
  recipient uuid;
  target_path text;
  event_time timestamptz := clock_timestamp();
  normalized_content text := btrim(regexp_replace(message_text, '[[:space:]]+', ' ', 'g'));
  existing public.care_messages;
begin
  if request_key is null or not private.has_direct_message_access(
    target_tenant,
    target_patient,
    target_doctor
  ) then
    raise exception 'Direct message access and request key required' using errcode = '42501';
  end if;

  if normalized_content is null
    or char_length(normalized_content) not between 1 and 4000
    or normalized_content ~ '[[:cntrl:]]' then
    raise exception 'Valid direct message text required' using errcode = '23514';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      target_tenant::text || ':' || auth.uid()::text || ':' || request_key::text,
      0
    )
  );

  select * into existing
  from public.care_messages stored
  where stored.tenant_id = target_tenant
    and stored.sender_id = auth.uid()
    and stored.client_request_id = request_key;
  if found then
    if existing.patient_id <> target_patient
      or existing.doctor_id <> target_doctor
      or existing.content <> normalized_content then
      raise exception 'Request key already used for another message' using errcode = '23505';
    end if;
    return query select existing.conversation_id, existing.id, existing.sent_at;
    return;
  end if;

  insert into public.care_conversations(
    tenant_id,
    patient_id,
    doctor_id,
    last_message_at,
    last_sender_id
  ) values (
    target_tenant,
    target_patient,
    target_doctor,
    event_time,
    auth.uid()
  ) on conflict (tenant_id, patient_id, doctor_id)
    do update set
      last_message_at = excluded.last_message_at,
      last_sender_id = excluded.last_sender_id
  returning id into conversation;

  insert into public.care_messages(
    tenant_id,
    conversation_id,
    patient_id,
    doctor_id,
    sender_id,
    content,
    sent_at,
    client_request_id
  ) values (
    target_tenant,
    conversation,
    target_patient,
    target_doctor,
    auth.uid(),
    normalized_content,
    event_time,
    request_key
  ) returning id into message;

  if auth.uid() = target_doctor then
    select account.user_id into recipient
    from public.patient_accounts account
    where account.tenant_id = target_tenant
      and account.patient_id = target_patient;
    target_path := '/clinicas/' || target_tenant::text
      || '/meu-cuidado/conversas?medico=' || target_doctor::text;
  else
    recipient := target_doctor;
    target_path := '/clinicas/' || target_tenant::text
      || '/mensagens?paciente=' || target_patient::text;
  end if;

  perform private.queue_in_app_notification(
    target_tenant,
    recipient,
    'message',
    'message:' || message::text,
    target_path
  );

  return query select conversation, message, event_time;
end;
$$;
revoke all on function private.send_direct_message(uuid, uuid, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function private.send_direct_message(uuid, uuid, uuid, text, uuid)
  to authenticated;

create function public.send_direct_message(
  target_tenant uuid,
  target_patient uuid,
  target_doctor uuid,
  message_text text,
  request_key uuid
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
    message_text,
    request_key
  );
$$;
revoke all on function public.send_direct_message(uuid, uuid, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.send_direct_message(uuid, uuid, uuid, text, uuid)
  to authenticated;

create function private.mark_direct_messages_read(
  target_tenant uuid,
  target_patient uuid,
  target_doctor uuid,
  target_message uuid
) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  selected public.care_messages;
begin
  if not private.has_direct_message_access(
    target_tenant,
    target_patient,
    target_doctor
  ) then
    raise exception 'Direct message access required' using errcode = '42501';
  end if;
  select * into selected
  from public.care_messages message
  where message.tenant_id = target_tenant
    and message.id = target_message
    and message.patient_id = target_patient
    and message.doctor_id = target_doctor;
  if not found then
    raise exception 'Message does not belong to this conversation' using errcode = '42501';
  end if;

  insert into public.care_conversation_reads(
    tenant_id,
    conversation_id,
    patient_id,
    doctor_id,
    reader_id,
    last_read_message_id,
    last_read_sent_at,
    last_read_at
  ) values (
    target_tenant,
    selected.conversation_id,
    target_patient,
    target_doctor,
    auth.uid(),
    selected.id,
    selected.sent_at,
    clock_timestamp()
  ) on conflict (tenant_id, conversation_id, reader_id)
    do update set
      last_read_message_id = excluded.last_read_message_id,
      last_read_sent_at = excluded.last_read_sent_at,
      last_read_at = clock_timestamp(),
      updated_at = clock_timestamp()
    where (
      care_conversation_reads.last_read_sent_at,
      care_conversation_reads.last_read_message_id
    ) < (excluded.last_read_sent_at, excluded.last_read_message_id);
  return clock_timestamp();
end;
$$;
revoke all on function private.mark_direct_messages_read(uuid, uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.mark_direct_messages_read(uuid, uuid, uuid, uuid)
  to authenticated;

create function public.mark_direct_messages_read(
  target_tenant uuid,
  target_patient uuid,
  target_doctor uuid,
  target_message uuid
) returns timestamptz
language sql security invoker set search_path = '' as $$
  select private.mark_direct_messages_read(
    target_tenant,
    target_patient,
    target_doctor,
    target_message
  );
$$;
revoke all on function public.mark_direct_messages_read(uuid, uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.mark_direct_messages_read(uuid, uuid, uuid, uuid)
  to authenticated;

create trigger care_conversation_reads_audit after insert or update
  on public.care_conversation_reads for each row execute function private.audit_change();
