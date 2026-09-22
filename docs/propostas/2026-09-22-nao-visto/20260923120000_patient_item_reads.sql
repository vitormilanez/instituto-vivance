-- Estado de "não visto" por profissional para o que o paciente enviou.
--
-- Uma linha por (profissional, item) quando ele abre o item pela primeira
-- vez. Ver é por pessoa: o médico abrir não marca como visto para a
-- enfermagem, e vice-versa. Nada aqui é clínico: é um cursor de leitura,
-- append-only, sem update nem delete — uma vez visto, continua visto.
--
-- Quem pode marcar e ler: só o próprio profissional, na própria clínica, e
-- só para paciente com quem tem vínculo de cuidado ativo (has_care_access).
-- O item precisa existir e ser visível ao chamador sob a RLS da tabela de
-- origem — por isso a marcação passa por uma função security invoker que lê
-- o item antes de gravar. Não dá para marcar um id inventado nem um item de
-- outro paciente.

create table public.patient_item_reads (
  tenant_id uuid not null,
  user_id uuid not null default auth.uid(),
  item_kind text not null
    check (item_kind in ('preparation','documents','messages','checkins','measurements')),
  item_id uuid not null,
  patient_id uuid not null,
  read_at timestamptz not null default clock_timestamp(),
  primary key (tenant_id, user_id, item_kind, item_id),
  foreign key (tenant_id, patient_id) references public.patients(tenant_id, id),
  foreign key (tenant_id, user_id) references public.memberships(tenant_id, user_id)
);
create index patient_item_reads_patient
  on public.patient_item_reads(tenant_id, user_id, patient_id);

alter table public.patient_item_reads enable row level security;
revoke all on public.patient_item_reads from public, anon, authenticated;
grant select on public.patient_item_reads to authenticated;
grant insert (tenant_id, item_kind, item_id, patient_id)
  on public.patient_item_reads to authenticated;

create policy patient_item_reads_own_read on public.patient_item_reads
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and private.has_care_access(tenant_id, patient_id)
  );

create policy patient_item_reads_own_insert on public.patient_item_reads
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.has_care_access(tenant_id, patient_id)
  );

-- Marca um item como visto pelo chamador. Idempotente: marcar de novo não
-- muda a data da primeira leitura. Falha fechada se o item não existir para
-- o chamador (RLS da tabela de origem) ou se não houver vínculo ativo.
create function public.mark_patient_item_read(
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
revoke all on function public.mark_patient_item_read(uuid, text, uuid) from public, anon;
grant execute on function public.mark_patient_item_read(uuid, text, uuid) to authenticated;
