-- Check-in diário do paciente: como está reagindo ao tratamento, em toques.
--
-- Cada envio é um relato do próprio paciente, append-only e idempotente pela
-- chave do pedido. Nada aqui interpreta as respostas: não há nota, risco nem
-- classificação. O médico com vínculo ativo lê; ninguém mais.
--
-- O peso informado no check-in também vira uma medida (patient_measurements,
-- mesma chave), para aparecer na Evolução junto com os outros pesos.

create table public.patient_check_in_settings (
  -- Identificador próprio para a trilha de auditoria.
  id uuid not null default gen_random_uuid() unique,
  tenant_id uuid not null,
  patient_id uuid not null,
  -- 1 = todo dia, 3 = a cada 3 dias.
  frequency_days smallint not null default 1 check (frequency_days in (1, 3)),
  -- Pergunta sobre a aplicação (dia, hora, local) só quando o médico ativa.
  application_enabled boolean not null default false,
  updated_by uuid not null,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (tenant_id, patient_id),
  foreign key (tenant_id, patient_id) references public.patients(tenant_id, id),
  foreign key (tenant_id, updated_by) references public.memberships(tenant_id, user_id)
);

alter table public.patient_check_in_settings enable row level security;
revoke all on public.patient_check_in_settings from public, anon, authenticated;
grant select on public.patient_check_in_settings to authenticated;
create policy patient_check_in_settings_read_staff on public.patient_check_in_settings
  for select to authenticated
  using (private.has_care_access(tenant_id, patient_id));
create policy patient_check_in_settings_read_own on public.patient_check_in_settings
  for select to authenticated
  using (
    private.has_tenant_role(tenant_id, array['patient'])
    and exists (
      select 1 from public.patient_accounts account
      where account.tenant_id = patient_check_in_settings.tenant_id
        and account.patient_id = patient_check_in_settings.patient_id
        and account.user_id = (select auth.uid())
    )
  );
create trigger patient_check_in_settings_audit
  after insert or update on public.patient_check_in_settings
  for each row execute function private.audit_change();

create table public.patient_daily_check_ins (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  patient_id uuid not null,
  actor_user_id uuid not null,
  client_request_id uuid not null,
  -- Dia do relato no horário de Brasília.
  check_in_on date not null,
  submitted_at timestamptz not null default clock_timestamp(),
  weight_kg numeric check (weight_kg is null or (weight_kg <> 'NaN'::numeric and weight_kg > 0 and weight_kg <= 500)),
  feeling smallint check (feeling between 1 and 5),
  -- Efeitos marcados e a intensidade de cada um. no_effects = "Nenhum hoje".
  effects jsonb not null default '{}'::jsonb,
  no_effects boolean not null default false,
  hunger smallint check (hunger between 1 and 5),
  satiety smallint check (satiety between 1 and 5),
  energy smallint check (energy between 1 and 5),
  sleep smallint check (sleep between 1 and 5),
  water_glasses smallint check (water_glasses between 0 and 30),
  adherence text check (adherence in ('yes', 'partial', 'no')),
  adherence_reason text check (adherence_reason in ('forgot', 'side_effect', 'no_medication', 'other')),
  application_on date,
  application_time time,
  application_site text check (application_site in ('abdomen', 'thigh', 'arm')),
  application_side text check (application_side in ('left', 'right')),
  note text check (note is null or (char_length(note) between 1 and 2000 and note !~ '^[[:space:]]*$')),
  unique (tenant_id, id),
  unique (tenant_id, actor_user_id, client_request_id),
  foreign key (tenant_id, patient_id) references public.patients(tenant_id, id),
  foreign key (tenant_id, actor_user_id) references public.memberships(tenant_id, user_id),
  check (not (no_effects and effects <> '{}'::jsonb)),
  check (adherence_reason is null or adherence in ('partial', 'no')),
  check (application_on is null or application_on <= check_in_on)
);

create index patient_daily_check_ins_history
  on public.patient_daily_check_ins (tenant_id, patient_id, check_in_on desc, submitted_at desc);
create index patient_daily_check_ins_actor
  on public.patient_daily_check_ins (tenant_id, actor_user_id);

alter table public.patient_daily_check_ins enable row level security;
revoke all on public.patient_daily_check_ins from public, anon, authenticated;
grant select on public.patient_daily_check_ins to authenticated;
create policy patient_daily_check_ins_read_staff on public.patient_daily_check_ins
  for select to authenticated
  using (private.has_care_access(tenant_id, patient_id));
create policy patient_daily_check_ins_read_own on public.patient_daily_check_ins
  for select to authenticated
  using (
    actor_user_id = (select auth.uid())
    and private.has_tenant_role(tenant_id, array['patient'])
    and exists (
      select 1 from public.patient_accounts account
      where account.tenant_id = patient_daily_check_ins.tenant_id
        and account.patient_id = patient_daily_check_ins.patient_id
        and account.user_id = (select auth.uid())
    )
  );
create trigger patient_daily_check_ins_audit
  after insert on public.patient_daily_check_ins
  for each row execute function private.audit_change();

-- Efeitos aceitos e intensidades. Qualquer outra chave ou valor é recusado.
create function private.valid_check_in_effects(value jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(value) = 'object'
    and not exists (
      select 1 from jsonb_each_text(value) item
      where item.key not in ('nausea', 'queasy', 'bowel', 'heartburn', 'headache', 'tiredness')
        or item.value not in ('mild', 'moderate', 'strong')
    );
$$;
alter table public.patient_daily_check_ins
  add constraint patient_daily_check_ins_effects_valid check (private.valid_check_in_effects(effects));

create function private.submit_daily_check_in(
  target_tenant uuid,
  request_key uuid,
  answers jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  own_patient uuid;
  today date := (clock_timestamp() at time zone 'America/Sao_Paulo')::date;
  allowed text[] := array['weight_kg', 'feeling', 'effects', 'no_effects', 'hunger', 'satiety',
    'energy', 'sleep', 'water_glasses', 'adherence', 'adherence_reason', 'application_on',
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
    weight_kg, feeling, effects, no_effects, hunger, satiety, energy, sleep,
    water_glasses, adherence, adherence_reason, application_on, application_time,
    application_site, application_side, note
  ) values (
    target_tenant, own_patient, auth.uid(), request_key, today,
    v_weight,
    (answers->>'feeling')::smallint,
    coalesce(answers->'effects', '{}'::jsonb),
    coalesce((answers->>'no_effects')::boolean, false),
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
revoke all on function private.submit_daily_check_in(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function private.submit_daily_check_in(uuid, uuid, jsonb) to authenticated;

create function public.submit_daily_check_in(
  target_tenant uuid,
  request_key uuid,
  answers jsonb
) returns uuid
language sql security invoker set search_path = '' as $$
  select private.submit_daily_check_in(target_tenant, request_key, answers);
$$;
revoke all on function public.submit_daily_check_in(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.submit_daily_check_in(uuid, uuid, jsonb) to authenticated;

-- O médico com vínculo ativo escolhe a frequência e se pergunta sobre a
-- aplicação. Enfermagem lê, mas não muda.
create function private.set_check_in_settings(
  target_tenant uuid,
  target_patient uuid,
  frequency smallint,
  application boolean
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_tenant_role(target_tenant, array['doctor'])
    or not private.has_care_access(target_tenant, target_patient) then
    raise exception 'Active care relationship required' using errcode = '42501';
  end if;
  if frequency not in (1, 3) or application is null then
    raise exception 'Invalid check-in settings' using errcode = '23514';
  end if;
  insert into public.patient_check_in_settings(tenant_id, patient_id, frequency_days, application_enabled, updated_by)
  values (target_tenant, target_patient, frequency, application, auth.uid())
  on conflict (tenant_id, patient_id) do update
    set frequency_days = excluded.frequency_days,
        application_enabled = excluded.application_enabled,
        updated_by = excluded.updated_by,
        updated_at = clock_timestamp();
end;
$$;
revoke all on function private.set_check_in_settings(uuid, uuid, smallint, boolean) from public, anon, authenticated;
grant execute on function private.set_check_in_settings(uuid, uuid, smallint, boolean) to authenticated;

create function public.set_check_in_settings(
  target_tenant uuid,
  target_patient uuid,
  frequency smallint,
  application boolean
) returns void
language sql security invoker set search_path = '' as $$
  select private.set_check_in_settings(target_tenant, target_patient, frequency, application);
$$;
revoke all on function public.set_check_in_settings(uuid, uuid, smallint, boolean) from public, anon, authenticated;
grant execute on function public.set_check_in_settings(uuid, uuid, smallint, boolean) to authenticated;

-- "Não visto" também para o check-in diário, na Home do médico.
alter table public.patient_item_reads
  drop constraint if exists patient_item_reads_item_kind_check;
alter table public.patient_item_reads
  add constraint patient_item_reads_item_kind_check
  check (item_kind in ('preparation','documents','messages','checkins','daily_checkins','measurements'));

create or replace function public.mark_patient_item_read(
  target_tenant uuid,
  target_kind text,
  target_item uuid
) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  owner uuid;
begin
  if target_kind = 'preparation' then
    select patient_id into owner from public.return_preparation_requests
      where tenant_id = target_tenant and id = target_item;
  elsif target_kind = 'documents' then
    select patient_id into owner from public.patient_documents
      where tenant_id = target_tenant and id = target_item and status = 'available';
  elsif target_kind = 'messages' then
    select patient_id into owner from public.care_messages
      where tenant_id = target_tenant and id = target_item;
  elsif target_kind = 'checkins' then
    select patient_id into owner from public.care_check_ins
      where tenant_id = target_tenant and id = target_item;
  elsif target_kind = 'daily_checkins' then
    select patient_id into owner from public.patient_daily_check_ins
      where tenant_id = target_tenant and id = target_item;
  elsif target_kind = 'measurements' then
    select patient_id into owner from public.patient_measurements
      where tenant_id = target_tenant and id = target_item;
  else
    raise exception 'Unknown item kind' using errcode = '22023';
  end if;
  if owner is null or not private.has_care_access(target_tenant, owner) then
    raise exception 'Item unavailable' using errcode = '42501';
  end if;
  insert into public.patient_item_reads(tenant_id, item_kind, item_id, patient_id)
    values (target_tenant, target_kind, target_item, owner)
    on conflict (tenant_id, user_id, item_kind, item_id) do nothing;
end;
$$;
