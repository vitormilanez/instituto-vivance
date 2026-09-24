-- A direct message may cite up to ten independently authorized shared items.
-- The existing scalar columns and RPC remain available during rollout so an
-- already-open page can still send one reference while the new client ships.
create table public.care_message_references (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  message_id uuid not null,
  conversation_id uuid not null,
  patient_id uuid not null,
  doctor_id uuid not null,
  position smallint not null check (position between 0 and 9),
  reference_type text not null check (reference_type in ('document', 'care_plan')),
  reference_id uuid not null,
  primary key (tenant_id, message_id, position),
  unique (tenant_id, id),
  constraint care_message_references_unique_item
    unique (tenant_id, message_id, reference_type, reference_id),
  constraint care_message_references_message_fkey
    foreign key (tenant_id, message_id, conversation_id, patient_id, doctor_id)
    references public.care_messages(tenant_id, id, conversation_id, patient_id, doctor_id)
    on delete cascade
);
create index care_message_references_lookup
  on public.care_message_references(tenant_id, reference_type, reference_id);

alter table public.care_message_references enable row level security;
revoke all on public.care_message_references from public, anon, authenticated;
grant select on public.care_message_references to authenticated;
create policy care_message_references_read_direct
  on public.care_message_references
  for select to authenticated
  using (private.has_direct_message_access(tenant_id, patient_id, doctor_id));

insert into public.care_message_references(
  tenant_id,
  message_id,
  conversation_id,
  patient_id,
  doctor_id,
  position,
  reference_type,
  reference_id
)
select
  tenant_id,
  id,
  conversation_id,
  patient_id,
  doctor_id,
  0,
  reference_type,
  reference_id
from public.care_messages
where reference_type is not null and reference_id is not null;

-- Pages opened before this migration may still use the scalar RPC. Mirror
-- those writes so the new history path sees exactly one reference as well.
create function private.mirror_direct_message_scalar_reference() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.reference_type is not null and new.reference_id is not null then
    insert into public.care_message_references(
      tenant_id,
      message_id,
      conversation_id,
      patient_id,
      doctor_id,
      position,
      reference_type,
      reference_id
    ) values (
      new.tenant_id,
      new.id,
      new.conversation_id,
      new.patient_id,
      new.doctor_id,
      0,
      new.reference_type,
      new.reference_id
    );
  end if;
  return new;
end;
$$;
revoke all on function private.mirror_direct_message_scalar_reference()
  from public, anon, authenticated;
create trigger care_messages_scalar_reference_bridge after insert
  on public.care_messages for each row
  execute function private.mirror_direct_message_scalar_reference();

create trigger care_message_references_audit after insert
  on public.care_message_references for each row execute function private.audit_change();

create function private.send_direct_message_with_references(
  target_tenant uuid,
  target_patient uuid,
  target_doctor uuid,
  message_text text,
  request_key uuid,
  message_reference_types text[],
  message_reference_ids uuid[]
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
  normalized_types text[] := coalesce(message_reference_types, array[]::text[]);
  normalized_ids uuid[] := coalesce(message_reference_ids, array[]::uuid[]);
  existing public.care_messages;
  existing_types text[];
  existing_ids uuid[];
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

  if cardinality(normalized_types) <> cardinality(normalized_ids)
    or cardinality(normalized_types) > 10
    or exists (
      select 1
      from unnest(normalized_types, normalized_ids)
        as input(reference_type, reference_id)
      where input.reference_type not in ('document', 'care_plan')
        or input.reference_id is null
    )
    or (
      select count(*)
      from unnest(normalized_types, normalized_ids)
        as input(reference_type, reference_id)
    ) <> (
      select count(distinct (input.reference_type, input.reference_id))
      from unnest(normalized_types, normalized_ids)
        as input(reference_type, reference_id)
    ) then
    raise exception 'Up to ten unique message references required' using errcode = '23514';
  end if;

  if exists (
    select 1
    from unnest(normalized_types, normalized_ids)
      as input(reference_type, reference_id)
    where not private.direct_message_reference_is_eligible(
      target_tenant,
      target_patient,
      input.reference_type,
      input.reference_id
    )
  ) then
    raise exception 'Eligible shared message references required' using errcode = '42501';
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
    select
      coalesce(array_agg(reference.reference_type order by reference.position), array[]::text[]),
      coalesce(array_agg(reference.reference_id order by reference.position), array[]::uuid[])
    into existing_types, existing_ids
    from public.care_message_references reference
    where reference.tenant_id = existing.tenant_id
      and reference.message_id = existing.id;
    if existing.patient_id <> target_patient
      or existing.doctor_id <> target_doctor
      or existing.content <> normalized_content
      or existing_types is distinct from normalized_types
      or existing_ids is distinct from normalized_ids then
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
    null,
    null
  ) returning id into message;

  insert into public.care_message_references(
    tenant_id,
    message_id,
    conversation_id,
    patient_id,
    doctor_id,
    position,
    reference_type,
    reference_id
  )
  select
    target_tenant,
    message,
    conversation,
    target_patient,
    target_doctor,
    input.position - 1,
    input.reference_type,
    input.reference_id
  from unnest(normalized_types, normalized_ids) with ordinality
    as input(reference_type, reference_id, position);

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
revoke all on function private.send_direct_message_with_references(
  uuid, uuid, uuid, text, uuid, text[], uuid[]
) from public, anon, authenticated;
grant execute on function private.send_direct_message_with_references(
  uuid, uuid, uuid, text, uuid, text[], uuid[]
) to authenticated;

create function public.send_direct_message_with_references(
  target_tenant uuid,
  target_patient uuid,
  target_doctor uuid,
  message_text text,
  request_key uuid,
  message_reference_types text[] default array[]::text[],
  message_reference_ids uuid[] default array[]::uuid[]
) returns table (
  conversation_id uuid,
  message_id uuid,
  sent_at timestamptz
)
language sql security invoker set search_path = '' as $$
  select * from private.send_direct_message_with_references(
    target_tenant,
    target_patient,
    target_doctor,
    message_text,
    request_key,
    message_reference_types,
    message_reference_ids
  );
$$;
revoke all on function public.send_direct_message_with_references(
  uuid, uuid, uuid, text, uuid, text[], uuid[]
) from public, anon, authenticated;
grant execute on function public.send_direct_message_with_references(
  uuid, uuid, uuid, text, uuid, text[], uuid[]
) to authenticated;
