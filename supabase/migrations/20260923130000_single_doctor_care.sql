-- MVP: uma clínica, um médico. Enquanto a clínica tiver exatamente UM médico
-- ativo, todo paciente dela tem vínculo de cuidado ativo com esse médico, sem
-- etapa de aceite. Quando a clínica tiver mais de um médico, nada aqui age e
-- o fluxo de atribuição e aceite volta a valer como antes.
--
-- O que muda:
-- 1. Paciente novo (ficha criada pela equipe ou pelo aceite de convite) ganha
--    o vínculo ativo com o médico único ao fim da transação.
-- 2. Vínculo atribuído ao médico único vira ativo na hora.
-- 3. Os pacientes que já existem recebem o mesmo tratamento (backfill).
-- Vínculo revogado continua revogado: revogar é decisão explícita.

create function private.sole_active_doctor(target_tenant uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select case when count(*) = 1 then (array_agg(m.user_id))[1] end
  from public.memberships m
  join public.tenants t on t.id = m.tenant_id
  where m.tenant_id = target_tenant
    and m.role = 'doctor'
    and m.status = 'active'
    and t.status = 'active';
$$;
revoke all on function private.sole_active_doctor(uuid) from public, anon, authenticated;

-- 2. Atribuído ao médico único: ativo na hora. Roda depois da validação
-- normal (o administrador continua só podendo atribuir), e a ativação é feita
-- pelo sistema, fora do papel `authenticated`.
create function private.activate_sole_doctor_care() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'assigned'
    and new.professional_id = private.sole_active_doctor(new.tenant_id) then
    update public.care_relationships
      set status = 'active'
      where id = new.id and status = 'assigned';
  end if;
  return null;
end;
$$;
revoke all on function private.activate_sole_doctor_care() from public, anon, authenticated;
create trigger care_relationships_sole_doctor_active
  after insert or update of status on public.care_relationships
  for each row execute function private.activate_sole_doctor_care();

-- 1. Paciente novo: vínculo ativo com o médico único. Adiado para o fim da
-- transação para não colidir com os fluxos que já criam o vínculo logo depois
-- de criar o paciente (ficha pelo médico, aceite de convite).
create function private.ensure_sole_doctor_care() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  doctor uuid := private.sole_active_doctor(new.tenant_id);
begin
  if doctor is not null then
    insert into public.care_relationships(
      tenant_id, patient_id, professional_id, status, created_by
    ) values (new.tenant_id, new.id, doctor, 'active', doctor)
    on conflict (tenant_id, patient_id, professional_id) do nothing;
  end if;
  return null;
end;
$$;
revoke all on function private.ensure_sole_doctor_care() from public, anon, authenticated;
create constraint trigger patients_sole_doctor_care
  after insert on public.patients
  deferrable initially deferred
  for each row execute function private.ensure_sole_doctor_care();

-- 3. Backfill dos pacientes existentes.
update public.care_relationships r
  set status = 'active'
  where r.status = 'assigned'
    and r.professional_id = private.sole_active_doctor(r.tenant_id);

insert into public.care_relationships(
  tenant_id, patient_id, professional_id, status, created_by
)
select p.tenant_id, p.id, d.doctor, 'active', d.doctor
from public.patients p
cross join lateral (select private.sole_active_doctor(p.tenant_id) as doctor) d
where d.doctor is not null
on conflict (tenant_id, patient_id, professional_id) do nothing;
