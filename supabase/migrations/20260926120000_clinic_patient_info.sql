-- O que a clínica mostra a todo paciente: telefone (com horário) e a lista de
-- sinais de alerta aprovada pelo médico.
--
-- - Telefone: a equipe (admin ou médico) cadastra; aparece em "Sinais de
--   alerta" e em "Consultas" ("para marcar ou alterar um horário").
-- - Sinais de alerta: texto clínico. Só um médico da clínica grava a lista, e
--   gravar é aprovar: fica registrado quem aprovou (nome no momento) e em que
--   dia. Lista vazia = sem aprovação, e a tela volta a mostrar "em revisão".
-- - Leitura: qualquer membro ativo da clínica, inclusive o paciente. Escrita só
--   pelas funções abaixo; o histórico fica na trilha de auditoria.

create table public.clinic_patient_info (
  id uuid not null default gen_random_uuid() unique,
  tenant_id uuid primary key references public.tenants(id),
  phone_display text check (phone_display is null or char_length(btrim(phone_display)) between 8 and 30),
  phone_tel text check (phone_tel is null or phone_tel ~ '^\+?[0-9]{8,15}$'),
  phone_hours text check (phone_hours is null or char_length(btrim(phone_hours)) between 3 and 80),
  alert_signs text[] not null default '{}' check (cardinality(alert_signs) <= 12),
  alert_approved_by uuid,
  alert_approved_name text check (alert_approved_name is null or char_length(alert_approved_name) between 2 and 160),
  alert_approved_on date,
  updated_by uuid not null,
  updated_at timestamptz not null default clock_timestamp(),
  check ((phone_display is null) = (phone_tel is null)),
  check (phone_hours is null or phone_tel is not null),
  check (
    (cardinality(alert_signs) = 0 and alert_approved_by is null and alert_approved_name is null and alert_approved_on is null)
    or (cardinality(alert_signs) > 0 and alert_approved_by is not null and alert_approved_name is not null and alert_approved_on is not null)
  )
);
alter table public.clinic_patient_info enable row level security;
revoke all on public.clinic_patient_info from public, anon, authenticated;
grant select on public.clinic_patient_info to authenticated;
create policy clinic_patient_info_read on public.clinic_patient_info
  for select to authenticated
  using (private.has_tenant_role(tenant_id, array['admin','doctor','nurse','patient']));
create trigger clinic_patient_info_audit
  after insert or update on public.clinic_patient_info
  for each row execute function private.audit_change();

create function private.valid_alert_signs(signs text[]) returns boolean
language sql immutable set search_path = '' as $$
  select signs is not null and cardinality(signs) <= 12 and not exists (
    select 1 from unnest(signs) sign
    where sign is null or char_length(btrim(sign)) not between 3 and 200
  );
$$;
revoke all on function private.valid_alert_signs(text[]) from public, anon, authenticated;
grant execute on function private.valid_alert_signs(text[]) to authenticated;

-- Telefone e horário da clínica. Tudo nulo apaga o telefone.
create function private.save_clinic_phone(
  target_tenant uuid,
  display text,
  tel text,
  hours text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  clean_display text := nullif(btrim(display), '');
  clean_tel text := nullif(regexp_replace(coalesce(tel, ''), '[^0-9+]', '', 'g'), '');
  clean_hours text := nullif(btrim(hours), '');
begin
  if not private.has_tenant_role(target_tenant, array['admin','doctor']) then
    raise exception 'Clinic staff required' using errcode = '42501';
  end if;
  if (clean_display is null) <> (clean_tel is null) or (clean_hours is not null and clean_tel is null) then
    raise exception 'Invalid clinic phone' using errcode = '23514';
  end if;
  insert into public.clinic_patient_info(tenant_id, phone_display, phone_tel, phone_hours, updated_by)
  values (target_tenant, clean_display, clean_tel, clean_hours, auth.uid())
  on conflict (tenant_id) do update
    set phone_display = excluded.phone_display,
        phone_tel = excluded.phone_tel,
        phone_hours = excluded.phone_hours,
        updated_by = excluded.updated_by,
        updated_at = clock_timestamp();
end;
$$;
revoke all on function private.save_clinic_phone(uuid, text, text, text) from public, anon, authenticated;
grant execute on function private.save_clinic_phone(uuid, text, text, text) to authenticated;

create function public.save_clinic_phone(target_tenant uuid, display text, tel text, hours text) returns void
language sql security invoker set search_path = '' as $$
  select private.save_clinic_phone(target_tenant, display, tel, hours);
$$;
revoke all on function public.save_clinic_phone(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.save_clinic_phone(uuid, text, text, text) to authenticated;

-- Grava e aprova a lista de sinais de alerta. Só médico. Lista vazia retira a
-- aprovação.
create function private.approve_alert_signs(target_tenant uuid, signs text[]) returns void
language plpgsql security definer set search_path = '' as $$
declare
  clean text[];
  approver text;
begin
  if not private.has_tenant_role(target_tenant, array['doctor']) then
    raise exception 'Doctor required' using errcode = '42501';
  end if;
  if not private.valid_alert_signs(signs) then
    raise exception 'Invalid alert signs' using errcode = '23514';
  end if;
  select coalesce(array_agg(btrim(sign) order by ord), '{}') into clean
    from unnest(signs) with ordinality as item(sign, ord);
  select m.display_name into approver from public.memberships m
    where m.tenant_id = target_tenant and m.user_id = auth.uid();
  if cardinality(clean) > 0 and (approver is null or char_length(btrim(approver)) < 2) then
    raise exception 'Doctor name required' using errcode = '23514';
  end if;
  insert into public.clinic_patient_info(tenant_id, alert_signs, alert_approved_by, alert_approved_name, alert_approved_on, updated_by)
  values (
    target_tenant, clean,
    case when cardinality(clean) > 0 then auth.uid() end,
    case when cardinality(clean) > 0 then btrim(approver) end,
    case when cardinality(clean) > 0 then (clock_timestamp() at time zone 'America/Sao_Paulo')::date end,
    auth.uid()
  )
  on conflict (tenant_id) do update
    set alert_signs = excluded.alert_signs,
        alert_approved_by = excluded.alert_approved_by,
        alert_approved_name = excluded.alert_approved_name,
        alert_approved_on = excluded.alert_approved_on,
        updated_by = excluded.updated_by,
        updated_at = clock_timestamp();
end;
$$;
revoke all on function private.approve_alert_signs(uuid, text[]) from public, anon, authenticated;
grant execute on function private.approve_alert_signs(uuid, text[]) to authenticated;

create function public.approve_alert_signs(target_tenant uuid, signs text[]) returns void
language sql security invoker set search_path = '' as $$
  select private.approve_alert_signs(target_tenant, signs);
$$;
revoke all on function public.approve_alert_signs(uuid, text[]) from public, anon, authenticated;
grant execute on function public.approve_alert_signs(uuid, text[]) to authenticated;
