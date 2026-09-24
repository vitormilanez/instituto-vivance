-- O intestino passa a ser um relato próprio, sem reinterpretar as intensidades legadas em effects.bowel.
alter table public.patient_daily_check_ins
  add column bowel_status text check (bowel_status in ('good', 'regular', 'poor'));

create or replace function private.submit_daily_check_in(
  target_tenant uuid,
  request_key uuid,
  answers jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  own_patient uuid;
  today date := (clock_timestamp() at time zone 'America/Sao_Paulo')::date;
  allowed text[] := array['weight_kg', 'feeling', 'effects', 'no_effects', 'hunger', 'satiety',
    'energy', 'sleep', 'bowel_status', 'water_glasses', 'adherence', 'adherence_reason', 'application_on',
    'application_time', 'application_site', 'application_side', 'note'];
  application_allowed boolean;
  stored public.patient_daily_check_ins;
  result uuid;
  v_weight numeric;
  v_note text;
begin
  if request_key is null or answers is null or jsonb_typeof(answers) <> 'object'
    or not private.has_tenant_role(target_tenant, array['patient']) then
    raise exception 'Active patient access required' using errcode = '42501';
  end if;
  select account.patient_id into own_patient
  from public.patient_accounts account
  where account.tenant_id = target_tenant and account.user_id = auth.uid();
  if own_patient is null then
    raise exception 'Patient account required' using errcode = '42501';
  end if;
  if exists (select 1 from jsonb_object_keys(answers) key where key <> all(allowed)) then
    raise exception 'Unknown check-in answer' using errcode = '23514';
  end if;

  -- Idempotência estrita: a mesma chave devolve o mesmo relato.
  select * into stored from public.patient_daily_check_ins
  where tenant_id = target_tenant and actor_user_id = auth.uid() and client_request_id = request_key;
  if stored.id is not null then
    return stored.id;
  end if;

  select coalesce(settings.application_enabled, false) into application_allowed
  from (select 1) one
  left join public.patient_check_in_settings settings
    on settings.tenant_id = target_tenant and settings.patient_id = own_patient;
  if not application_allowed and (answers ? 'application_on' or answers ? 'application_time'
    or answers ? 'application_site' or answers ? 'application_side') then
    raise exception 'Application questions are not enabled' using errcode = '23514';
  end if;

  v_weight := nullif(answers->>'weight_kg', '')::numeric;
  v_note := nullif(answers->>'note', '');

  insert into public.patient_daily_check_ins(
    tenant_id, patient_id, actor_user_id, client_request_id, check_in_on,
    weight_kg, feeling, effects, no_effects, bowel_status, hunger, satiety, energy, sleep,
    water_glasses, adherence, adherence_reason, application_on, application_time,
    application_site, application_side, note
  ) values (
    target_tenant, own_patient, auth.uid(), request_key, today,
    v_weight,
    (answers->>'feeling')::smallint,
    coalesce(answers->'effects', '{}'::jsonb),
    coalesce((answers->>'no_effects')::boolean, false),
    answers->>'bowel_status',
    (answers->>'hunger')::smallint,
    (answers->>'satiety')::smallint,
    (answers->>'energy')::smallint,
    (answers->>'sleep')::smallint,
    (answers->>'water_glasses')::smallint,
    answers->>'adherence',
    answers->>'adherence_reason',
    (answers->>'application_on')::date,
    (answers->>'application_time')::time,
    answers->>'application_site',
    answers->>'application_side',
    v_note
  ) returning id into result;

  if v_weight is not null then
    insert into public.patient_measurements(
      tenant_id, patient_id, actor_user_id, metric, measure_label,
      measure_value, measure_unit, reported_on, client_request_id
    ) values (
      target_tenant, own_patient, auth.uid(), 'weight', 'Peso', v_weight, 'kg', today, request_key
    ) on conflict (tenant_id, patient_id, client_request_id, metric) do nothing;
  end if;
  return result;
end;
$$;
