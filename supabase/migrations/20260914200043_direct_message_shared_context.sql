-- V4: optional shared context on an otherwise unchanged direct message.
-- Only source identifiers are retained. Labels and download/navigation targets
-- are resolved under the caller's current access when the history is loaded.
alter table public.care_messages
  add column reference_type text,
  add column reference_id uuid,
  add constraint care_messages_reference_shape check (
    (reference_type is null and reference_id is null)
    or (reference_type in ('document', 'care_plan') and reference_id is not null)
  );

create index care_messages_reference_lookup
  on public.care_messages(tenant_id, reference_type, reference_id)
  where reference_id is not null;

create function private.direct_message_reference_is_eligible(
  target_tenant uuid,
  target_patient uuid,
  target_reference_type text,
  target_reference_id uuid
) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when target_reference_type is null and target_reference_id is null then true
    when target_reference_type = 'document' and target_reference_id is not null then exists (
      select 1
      from public.patient_documents document
      where document.tenant_id = target_tenant
        and document.patient_id = target_patient
        and document.id = target_reference_id
        and document.status = 'available'
        and document.visibility = 'shared'
    )
    when target_reference_type = 'care_plan' and target_reference_id is not null then exists (
      select 1
      from public.care_plan_publications publication
      where publication.tenant_id = target_tenant
        and publication.patient_id = target_patient
        and publication.id = target_reference_id
        and publication.status = 'published'
    )
    else false
  end;
$$;
revoke all on function private.direct_message_reference_is_eligible(uuid, uuid, text, uuid)
  from public, anon, authenticated;

create function private.keep_direct_message_reference_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.reference_type, new.reference_id)
    is distinct from (old.reference_type, old.reference_id) then
    raise exception 'Direct message reference is immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.keep_direct_message_reference_immutable()
  from public, anon, authenticated;
create trigger care_messages_reference_immutable
  before update on public.care_messages
  for each row execute function private.keep_direct_message_reference_immutable();

drop function public.send_direct_message(uuid, uuid, uuid, text, uuid);
drop function private.send_direct_message(uuid, uuid, uuid, text, uuid);

create function private.send_direct_message(
  target_tenant uuid,
  target_patient uuid,
  target_doctor uuid,
  message_text text,
  request_key uuid,
  message_reference_type text,
  message_reference_id uuid
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
      or existing.content <> normalized_content
      or existing.reference_type is distinct from message_reference_type
      or existing.reference_id is distinct from message_reference_id then
      raise exception 'Request key already used for another message' using errcode = '23505';
    end if;
    return query select existing.conversation_id, existing.id, existing.sent_at;
    return;
  end if;

  if not private.direct_message_reference_is_eligible(
    target_tenant,
    target_patient,
    message_reference_type,
    message_reference_id
  ) then
    raise exception 'Eligible shared message reference required' using errcode = '42501';
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
    client_request_id,
    reference_type,
    reference_id
  ) values (
    target_tenant,
    conversation,
    target_patient,
    target_doctor,
    auth.uid(),
    normalized_content,
    event_time,
    request_key,
    message_reference_type,
    message_reference_id
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
revoke all on function private.send_direct_message(uuid, uuid, uuid, text, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function private.send_direct_message(uuid, uuid, uuid, text, uuid, text, uuid)
  to authenticated;

create function public.send_direct_message(
  target_tenant uuid,
  target_patient uuid,
  target_doctor uuid,
  message_text text,
  request_key uuid,
  message_reference_type text default null,
  message_reference_id uuid default null
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
    request_key,
    message_reference_type,
    message_reference_id
  );
$$;
revoke all on function public.send_direct_message(uuid, uuid, uuid, text, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.send_direct_message(uuid, uuid, uuid, text, uuid, text, uuid)
  to authenticated;
