-- Bind care requests to the concrete patient response that can satisfy them.
-- A generic preparation request now opens (or reuses) the next appointment's
-- return preparation in the same transaction. Goal requests remember the
-- intake version visible when the doctor asked, so only a newer patient answer
-- completes the request.

alter table public.patient_care_requests
  add column preparation_id uuid,
  add column requested_intake_version integer,
  add foreign key (tenant_id, preparation_id)
    references public.return_preparation_requests(tenant_id, id);

-- Preserve already-open work only when it can be tied to a concrete current
-- response. Ambiguous historical pending rows become cancelled history rather
-- than a task that an unrelated future response could close.
update public.patient_care_requests care
set preparation_id = (
  select preparation.id
  from public.return_preparation_requests preparation
  join public.appointments appointment
    on appointment.tenant_id = preparation.tenant_id
   and appointment.id = preparation.appointment_id
  where preparation.tenant_id = care.tenant_id
    and preparation.patient_id = care.patient_id
    and preparation.doctor_id = care.doctor_id
    and preparation.status in ('requested', 'draft')
    and appointment.status = 'scheduled'
    and appointment.starts_at > clock_timestamp()
  order by appointment.starts_at, preparation.requested_at desc, preparation.id
  limit 1
)
where care.kind = 'preparation' and care.status = 'requested';

update public.patient_care_requests care
set requested_intake_version = intake.version
from public.patient_intake_contexts intake
where care.kind = 'goals'
  and care.status = 'requested'
  and intake.tenant_id = care.tenant_id
  and intake.patient_id = care.patient_id;

update public.patient_care_requests
set status = 'cancelled', cancelled_at = clock_timestamp()
where status = 'requested'
  and ((kind = 'preparation' and preparation_id is null)
    or (kind = 'goals' and requested_intake_version is null));

alter table public.patient_care_requests
  add check (
    status <> 'requested'
    or
    (kind = 'preparation' and preparation_id is not null
      and requested_intake_version is null)
    or (kind = 'goals' and preparation_id is null
      and requested_intake_version is not null)
    or (kind in ('exams', 'measurements') and preparation_id is null
      and requested_intake_version is null)
  );

create index patient_care_requests_preparation_fk
  on public.patient_care_requests(tenant_id, preparation_id)
  where preparation_id is not null;

create or replace function private.request_patient_care(
  target_tenant uuid,
  target_patient uuid,
  target_kind text,
  request_note text,
  request_key uuid,
  replace_pending boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  pending public.patient_care_requests;
  appointment_record public.appointments;
  preparation uuid;
  intake_version integer;
  created uuid;
  event_time timestamptz := clock_timestamp();
  normalized_note text := btrim(
    regexp_replace(coalesce(request_note, ''), '[[:space:]]+', ' ', 'g')
  );
  subject text;
begin
  if actor is null
    or request_key is null
    or not private.has_live_session()
    or not private.has_tenant_role(target_tenant, array['doctor'])
    or not private.has_care_access(target_tenant, target_patient)
  then
    raise exception 'Care request requires an active doctor link'
      using errcode = '42501';
  end if;
  if target_kind is null
    or target_kind not in ('preparation', 'exams', 'measurements', 'goals')
  then
    raise exception 'Unknown care request kind' using errcode = '23514';
  end if;
  if normalized_note is null
    or char_length(normalized_note) > 500
    or normalized_note ~ '[[:cntrl:]]'
  then
    raise exception 'Valid care request note required' using errcode = '23514';
  end if;

  select * into pending
  from public.patient_care_requests stored
  where stored.tenant_id = target_tenant
    and stored.doctor_id = actor
    and stored.client_request_id = request_key;
  if found then
    return pending.id;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      target_tenant::text || ':' || target_patient::text || ':' || target_kind,
      0
    )
  );

  -- Resolve the target while the transaction holds the same per-patient/type
  -- lock used for deduplication. If this fails, neither a care request nor a
  -- preparation/message is left behind.
  if target_kind = 'preparation' then
    select appointment.* into appointment_record
    from public.appointments appointment
    where appointment.tenant_id = target_tenant
      and appointment.patient_id = target_patient
      and appointment.doctor_id = actor
      and appointment.kind in ('consultation', 'return')
      and appointment.status = 'scheduled'
      and appointment.starts_at > event_time
      and exists (
        select 1 from public.patient_accounts account
        where account.tenant_id = appointment.tenant_id
          and account.patient_id = appointment.patient_id
      )
    order by appointment.starts_at, appointment.id
    limit 1
    for update of appointment;
    if not found then
      raise exception 'No eligible future appointment for preparation request'
        using errcode = '23514';
    end if;

    select request.id into preparation
    from public.return_preparation_requests request
    where request.tenant_id = target_tenant
      and request.appointment_id = appointment_record.id
      and request.status in ('requested', 'draft')
    order by request.requested_at desc, request.id desc
    limit 1;
    if preparation is null then
      preparation := private.request_return_preparation(
        target_tenant, appointment_record.id, request_key, null
      );
    end if;
  elsif target_kind = 'goals' then
    select intake.version into intake_version
    from public.patient_intake_contexts intake
    where intake.tenant_id = target_tenant
      and intake.patient_id = target_patient
    for share;
    if intake_version is null then
      raise exception 'Patient intake required for goals request'
        using errcode = '23514';
    end if;
  end if;

  select * into pending
  from public.patient_care_requests stored
  where stored.tenant_id = target_tenant
    and stored.patient_id = target_patient
    and stored.kind = target_kind
    and stored.status = 'requested';
  if found then
    if not replace_pending then
      return pending.id;
    end if;
    update public.patient_care_requests
      set status = 'cancelled', cancelled_at = event_time
      where id = pending.id;
  end if;

  insert into public.patient_care_requests(
    tenant_id, patient_id, doctor_id, kind, note, client_request_id,
    requested_at, preparation_id, requested_intake_version
  ) values (
    target_tenant, target_patient, actor, target_kind, normalized_note,
    request_key, event_time, preparation, intake_version
  ) returning id into created;

  subject := case target_kind
    when 'preparation' then 'o preenchimento da sua pré-consulta'
    when 'exams' then 'o envio de exames ou documentos'
    when 'measurements' then 'a atualização das suas medidas'
    else 'sua resposta sobre metas e expectativas'
  end;

  perform private.send_direct_message(
    target_tenant,
    target_patient,
    actor,
    'Solicito ' || subject || ' para preparar nossa próxima conversa.'
      || case when normalized_note = '' then '' else ' ' || normalized_note end,
    request_key,
    null,
    null
  );

  return created;
end;
$$;

-- Preparation completion is request-specific. A late submission for an older
-- preparation can no longer close a newer generic request.
create or replace function private.complete_patient_care_request()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_argv[0] = 'preparation' then
    if new.status = 'submitted' then
      update public.patient_care_requests
        set status = 'completed', completed_at = clock_timestamp()
      where tenant_id = new.tenant_id
        and patient_id = new.patient_id
        and kind = 'preparation'
        and preparation_id = new.id
        and status = 'requested';
    elsif new.status = 'cancelled' then
      update public.patient_care_requests
        set status = 'cancelled', cancelled_at = clock_timestamp()
      where tenant_id = new.tenant_id
        and patient_id = new.patient_id
        and kind = 'preparation'
        and preparation_id = new.id
        and status = 'requested';
    end if;
  elsif tg_argv[0] = 'goals' then
    update public.patient_care_requests
      set status = 'completed', completed_at = clock_timestamp()
    where tenant_id = new.tenant_id
      and patient_id = new.patient_id
      and kind = 'goals'
      and requested_intake_version < new.version
      and status = 'requested';
  else
    update public.patient_care_requests
      set status = 'completed', completed_at = clock_timestamp()
    where tenant_id = new.tenant_id
      and patient_id = new.patient_id
      and kind = tg_argv[0]
      and status = 'requested';
  end if;
  return null;
end;
$$;

drop trigger patient_care_requests_preparation_completed
  on public.return_preparation_requests;
create trigger patient_care_requests_preparation_completed
  after update on public.return_preparation_requests
  for each row
  when (
    new.status in ('submitted', 'cancelled')
    and old.status is distinct from new.status
  )
  execute function private.complete_patient_care_request('preparation');

drop trigger patient_care_requests_goals_completed
  on public.patient_intake_contexts;
create trigger patient_care_requests_goals_completed
  after update on public.patient_intake_contexts
  for each row
  when (new.status = 'completed' and new.version > old.version)
  execute function private.complete_patient_care_request('goals');
