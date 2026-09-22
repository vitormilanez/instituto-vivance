-- Solicitação de informação ao paciente: uma pendência operacional por
-- (paciente, tipo), criada pelo médico, entregue como mensagem na conversa que
-- já existe entre os dois e concluída quando o paciente preenche o que foi
-- pedido. É pendência operacional, nunca risco, urgência ou conduta: nada aqui
-- cancela, bloqueia ou remarca consulta, e nada classifica gravidade.
--
-- Escopo por paciente, não por consulta: exames, medidas, metas e check-ins não
-- têm vínculo com um atendimento, então a deduplicação é (paciente, tipo) e não
-- inventa coluna de consulta.

create table public.patient_care_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  patient_id uuid not null,
  -- Autor do pedido. Só médico com vínculo ativo cria solicitação.
  doctor_id uuid not null,
  kind text not null check (
    kind in ('preparation', 'exams', 'measurements', 'goals')
  ),
  status text not null default 'requested' check (
    status in ('requested', 'completed', 'cancelled')
  ),
  -- Bilhete curto do médico, somado à frase padrão do tipo na mensagem.
  note text not null default '' check (char_length(note) <= 500),
  -- Chave idempotente do cliente: o mesmo clique não cria duas solicitações.
  client_request_id uuid not null,
  requested_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  unique (tenant_id, id),
  unique (tenant_id, doctor_id, client_request_id),
  foreign key (tenant_id, patient_id)
    references public.patients(tenant_id, id),
  foreign key (tenant_id, doctor_id)
    references public.memberships(tenant_id, user_id),
  check (
    (status = 'requested' and completed_at is null and cancelled_at is null)
    or (status = 'completed' and completed_at is not null and cancelled_at is null)
    or (status = 'cancelled' and completed_at is null and cancelled_at is not null)
  )
);
-- Uma pendência por paciente e tipo: o segundo clique não abre outra lacuna.
create unique index patient_care_requests_one_pending
  on public.patient_care_requests(tenant_id, patient_id, kind)
  where status = 'requested';
create index patient_care_requests_patient_recent
  on public.patient_care_requests(tenant_id, patient_id, requested_at desc, id desc);
create index patient_care_requests_doctor_recent
  on public.patient_care_requests(tenant_id, doctor_id, requested_at desc, id desc);

alter table public.patient_care_requests enable row level security;
revoke all on public.patient_care_requests from public, anon, authenticated;
grant select on public.patient_care_requests to authenticated;

-- A equipe lê o que pediu a quem está sob seu cuidado ativo.
create policy patient_care_requests_staff_read on public.patient_care_requests
  for select to authenticated
  using (private.has_care_access(tenant_id, patient_id));
-- O paciente lê o que foi pedido a ele.
create policy patient_care_requests_patient_read on public.patient_care_requests
  for select to authenticated
  using (
    private.has_tenant_role(tenant_id, array['patient'])
    and exists (
      select 1
      from public.patient_accounts account
      where account.tenant_id = patient_care_requests.tenant_id
        and account.patient_id = patient_care_requests.patient_id
        and account.user_id = auth.uid()
    )
  );

create trigger patient_care_requests_audit
  after insert or update on public.patient_care_requests
  for each row execute function private.audit_change();

-- Escrita só por RPC: o registro nasce com autor, data e chave idempotente.
create function private.request_patient_care(
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

  -- Mesma chave, mesmo pedido: devolve o que já existe em vez de duplicar.
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

  select * into pending
  from public.patient_care_requests stored
  where stored.tenant_id = target_tenant
    and stored.patient_id = target_patient
    and stored.kind = target_kind
    and stored.status = 'requested';
  if found then
    -- Já existe pendência do mesmo tipo. Só um reenvio explícito a substitui —
    -- e a anterior fica no histórico como cancelada, nunca apagada.
    if not replace_pending then
      return pending.id;
    end if;
    update public.patient_care_requests
      set status = 'cancelled', cancelled_at = event_time
      where id = pending.id;
  end if;

  insert into public.patient_care_requests(
    tenant_id,
    patient_id,
    doctor_id,
    kind,
    note,
    client_request_id,
    requested_at
  ) values (
    target_tenant,
    target_patient,
    actor,
    target_kind,
    normalized_note,
    request_key,
    event_time
  ) returning id into created;

  subject := case target_kind
    when 'preparation' then 'o preenchimento da sua pré-consulta'
    when 'exams' then 'o envio de exames ou documentos'
    when 'measurements' then 'a atualização das suas medidas'
    else 'sua resposta sobre metas e expectativas'
  end;

  -- A entrega é a conversa que já existe: mesma chave idempotente, mesmo aviso
  -- no app, e o paciente abre o fluxo a partir da mensagem.
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
revoke all on function private.request_patient_care(uuid, uuid, text, text, uuid, boolean)
  from public, anon, authenticated;
grant execute on function private.request_patient_care(uuid, uuid, text, text, uuid, boolean)
  to authenticated;

create function public.request_patient_care(
  target_tenant uuid,
  target_patient uuid,
  target_kind text,
  request_note text,
  request_key uuid,
  replace_pending boolean default false
) returns uuid
language sql security invoker set search_path = '' as $$
  select private.request_patient_care(
    target_tenant,
    target_patient,
    target_kind,
    request_note,
    request_key,
    replace_pending
  );
$$;
revoke all on function public.request_patient_care(uuid, uuid, text, text, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.request_patient_care(uuid, uuid, text, text, uuid, boolean)
  to authenticated;

-- Concluir é consequência do que o paciente registrou, não de um clique do
-- médico: cada fonte fecha a pendência do próprio tipo e o histórico permanece.
create function private.complete_patient_care_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.patient_care_requests
    set status = 'completed',
        completed_at = clock_timestamp()
  where tenant_id = new.tenant_id
    and patient_id = new.patient_id
    and kind = tg_argv[0]
    and status = 'requested';
  return null;
end;
$$;
revoke all on function private.complete_patient_care_request()
  from public, anon, authenticated;

create trigger patient_care_requests_preparation_completed
  after update on public.return_preparation_requests
  for each row
  when (new.status = 'submitted' and old.status is distinct from 'submitted')
  execute function private.complete_patient_care_request('preparation');

create trigger patient_care_requests_exams_completed
  after update on public.patient_documents
  for each row
  when (
    new.status = 'available'
    and old.status is distinct from 'available'
    and new.category = 'exam'
  )
  execute function private.complete_patient_care_request('exams');

create trigger patient_care_requests_measurements_completed
  after insert on public.patient_measurements
  for each row
  execute function private.complete_patient_care_request('measurements');

create trigger patient_care_requests_goals_completed
  after update on public.patient_intake_contexts
  for each row
  when (new.status = 'completed' and old.status is distinct from 'completed')
  execute function private.complete_patient_care_request('goals');
