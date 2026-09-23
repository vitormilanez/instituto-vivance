-- Primeiro acesso e lembrete do check-in por notificação no celular (Web Push).
--
-- - patient_reminder_preferences: o horário que a própria pessoa escolheu e
--   se já passou pelas boas-vindas. Só ela lê e altera.
-- - patient_push_subscriptions: os aparelhos que autorizaram notificação.
--   Só o dono cadastra/remove; ninguém lê pela API.
-- - patient_reminder_deliveries: um envio por pessoa por dia, para nunca
--   lembrar duas vezes. Sem conteúdo clínico.
-- - claim_due_reminders: chamada pelo agendador com um segredo (guardado só
--   como hash). Devolve quem precisa ser lembrado agora e já registra o envio.
--   O lembrete não carrega dado de saúde: só "Seu check-in de hoje".

create table public.patient_reminder_preferences (
  id uuid not null default gen_random_uuid() unique,
  tenant_id uuid not null,
  user_id uuid not null,
  patient_id uuid not null,
  reminder_enabled boolean not null default false,
  reminder_time time not null default '09:00',
  onboarded_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (tenant_id, user_id),
  foreign key (tenant_id, patient_id) references public.patients(tenant_id, id),
  foreign key (tenant_id, user_id) references public.memberships(tenant_id, user_id),
  check (reminder_time between '06:00' and '21:45'
    and extract(minute from reminder_time) in (0, 15, 30, 45) and extract(second from reminder_time) = 0)
);
alter table public.patient_reminder_preferences enable row level security;
revoke all on public.patient_reminder_preferences from public, anon, authenticated;
grant select on public.patient_reminder_preferences to authenticated;
create policy patient_reminder_preferences_read_own on public.patient_reminder_preferences
  for select to authenticated
  using (user_id = (select auth.uid()) and private.has_tenant_role(tenant_id, array['patient']));
create trigger patient_reminder_preferences_audit
  after insert or update on public.patient_reminder_preferences
  for each row execute function private.audit_change();

create table public.patient_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid not null,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) between 20 and 200),
  auth_secret text not null check (char_length(auth_secret) between 8 and 100),
  created_at timestamptz not null default clock_timestamp(),
  foreign key (tenant_id, user_id) references public.memberships(tenant_id, user_id)
);
create index patient_push_subscriptions_user on public.patient_push_subscriptions(tenant_id, user_id);
alter table public.patient_push_subscriptions enable row level security;
revoke all on public.patient_push_subscriptions from public, anon, authenticated;

create table public.patient_reminder_deliveries (
  tenant_id uuid not null,
  user_id uuid not null,
  sent_on date not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (tenant_id, user_id, sent_on)
);
alter table public.patient_reminder_deliveries enable row level security;
revoke all on public.patient_reminder_deliveries from public, anon, authenticated;

-- Hash do segredo do agendador. Vazia = nenhum lembrete sai.
create table private.reminder_cron_secret (
  singleton boolean primary key default true check (singleton),
  secret_sha256 text not null check (secret_sha256 ~ '^[0-9a-f]{64}$')
);
revoke all on private.reminder_cron_secret from public, anon, authenticated;

create function private.own_patient(target_tenant uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select account.patient_id from public.patient_accounts account
  where account.tenant_id = target_tenant and account.user_id = auth.uid()
    and private.has_tenant_role(target_tenant, array['patient']);
$$;
revoke all on function private.own_patient(uuid) from public, anon, authenticated;
grant execute on function private.own_patient(uuid) to authenticated;

-- Salva a escolha da pessoa (boas-vindas ou Meu cuidado).
create function public.save_reminder_preference(
  target_tenant uuid,
  enabled boolean,
  at_time time
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  patient uuid := private.own_patient(target_tenant);
begin
  if patient is null then
    raise exception 'Patient account required' using errcode = '42501';
  end if;
  if enabled is null or at_time is null then
    raise exception 'Invalid reminder preference' using errcode = '23514';
  end if;
  insert into public.patient_reminder_preferences(tenant_id, user_id, patient_id, reminder_enabled, reminder_time, onboarded_at)
  values (target_tenant, auth.uid(), patient, enabled, at_time, clock_timestamp())
  on conflict (tenant_id, user_id) do update
    set reminder_enabled = excluded.reminder_enabled,
        reminder_time = excluded.reminder_time,
        onboarded_at = coalesce(public.patient_reminder_preferences.onboarded_at, excluded.onboarded_at),
        updated_at = clock_timestamp();
end;
$$;
revoke all on function public.save_reminder_preference(uuid, boolean, time) from public, anon;
grant execute on function public.save_reminder_preference(uuid, boolean, time) to authenticated;

create function public.save_push_subscription(
  target_tenant uuid,
  push_endpoint text,
  push_p256dh text,
  push_auth text
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if private.own_patient(target_tenant) is null then
    raise exception 'Patient account required' using errcode = '42501';
  end if;
  insert into public.patient_push_subscriptions(tenant_id, user_id, endpoint, p256dh, auth_secret)
  values (target_tenant, auth.uid(), push_endpoint, push_p256dh, push_auth)
  on conflict (endpoint) do update
    set tenant_id = excluded.tenant_id,
        user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth_secret = excluded.auth_secret;
end;
$$;
revoke all on function public.save_push_subscription(uuid, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(uuid, text, text, text) to authenticated;

create function public.delete_push_subscription(push_endpoint text) returns void
language sql security definer set search_path = '' as $$
  delete from public.patient_push_subscriptions
  where endpoint = push_endpoint and user_id = auth.uid();
$$;
revoke all on function public.delete_push_subscription(text) from public, anon;
grant execute on function public.delete_push_subscription(text) to authenticated;

-- Quem lembrar agora: lembrete ligado, horário já passou hoje (Brasília) há
-- menos de 2 horas, check-in esperando (diário, ou a cada 3 dias) e nenhum
-- lembrete enviado hoje. Registra o envio na mesma transação.
create function public.claim_due_reminders(cron_secret text)
returns table (tenant_id uuid, endpoint text, p256dh text, auth_secret text)
language plpgsql security definer set search_path = '' as $$
declare
  now_local timestamp := clock_timestamp() at time zone 'America/Sao_Paulo';
  today date := now_local::date;
begin
  if cron_secret is null or not exists (
    select 1 from private.reminder_cron_secret s
    where s.secret_sha256 = encode(sha256(convert_to(cron_secret, 'UTF8')), 'hex')
  ) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
  with due as (
    select pref.tenant_id, pref.user_id
    from public.patient_reminder_preferences pref
    join public.memberships m
      on m.tenant_id = pref.tenant_id and m.user_id = pref.user_id and m.role = 'patient' and m.status = 'active'
    left join public.patient_check_in_settings settings
      on settings.tenant_id = pref.tenant_id and settings.patient_id = pref.patient_id
    where pref.reminder_enabled
      and now_local::time >= pref.reminder_time
      and now_local::time < pref.reminder_time + interval '2 hours'
      and not exists (
        select 1 from public.patient_reminder_deliveries d
        where d.tenant_id = pref.tenant_id and d.user_id = pref.user_id and d.sent_on = today)
      and not exists (
        select 1 from public.patient_daily_check_ins c
        where c.tenant_id = pref.tenant_id and c.patient_id = pref.patient_id
          and c.check_in_on > today - coalesce(settings.frequency_days, 1))
  ), marked as (
    insert into public.patient_reminder_deliveries(tenant_id, user_id, sent_on)
    select due.tenant_id, due.user_id, today from due
    on conflict do nothing
    returning patient_reminder_deliveries.tenant_id, patient_reminder_deliveries.user_id
  )
  select sub.tenant_id, sub.endpoint, sub.p256dh, sub.auth_secret
  from marked
  join public.patient_push_subscriptions sub
    on sub.tenant_id = marked.tenant_id and sub.user_id = marked.user_id;
end;
$$;
revoke all on function public.claim_due_reminders(text) from public, authenticated;
grant execute on function public.claim_due_reminders(text) to anon;

-- Aparelho que o serviço de push diz não existir mais (404/410) sai da lista.
create function public.drop_push_subscription(cron_secret text, push_endpoint text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if cron_secret is null or not exists (
    select 1 from private.reminder_cron_secret s
    where s.secret_sha256 = encode(sha256(convert_to(cron_secret, 'UTF8')), 'hex')
  ) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  delete from public.patient_push_subscriptions where endpoint = push_endpoint;
end;
$$;
revoke all on function public.drop_push_subscription(text, text) from public, authenticated;
grant execute on function public.drop_push_subscription(text, text) to anon;
