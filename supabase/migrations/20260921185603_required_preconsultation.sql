-- A pre-consultation belongs to the next scheduled appointment. The patient
-- starts it explicitly from Hoje; drafts remain private and may be incomplete,
-- while immutable submissions must answer the whole versioned questionnaire.

create function private.required_preconsultation_questions()
returns jsonb
language sql immutable security invoker set search_path = '' as $$
  select '[
    {"id":"goal","label":"Qual é o principal assunto que você quer conversar nesta consulta? O que gostaria de conseguir com esse encontro?"},
    {"id":"changes","label":"Desde a última consulta — ou nas últimas semanas, se esta for a primeira — o que mudou na sua saúde ou no seu bem-estar?"},
    {"id":"routine","label":"Como estão seu sono, alimentação, atividade física e disposição? Qual desses pontos mais precisa de atenção para você?"},
    {"id":"treatment","label":"Quais medicamentos, suplementos ou orientações você está seguindo? Teve alguma dificuldade ou percebeu algo que gostaria de relatar?"},
    {"id":"questions","label":"Quais dúvidas ou preocupações você não quer deixar de conversar com o médico? Qual delas deve vir primeiro?"}
  ]'::jsonb;
$$;
revoke all on function private.required_preconsultation_questions()
  from public, anon, authenticated;

create function private.complete_return_preparation_answers(
  questionnaire integer,
  supplied jsonb
) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.valid_return_preparation_answers(questionnaire, supplied)
    and exists (
      select 1
      from public.return_preparation_questionnaires q
      where q.version = questionnaire
        and not exists (
          select 1
          from jsonb_array_elements(q.questions) item
          where not (supplied ? (item ->> 'id'))
        )
    );
$$;
revoke all on function private.complete_return_preparation_answers(integer, jsonb)
  from public, anon, authenticated;

create function private.enforce_complete_return_preparation_submission()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not private.complete_return_preparation_answers(new.questionnaire_version, new.answers) then
    raise exception 'All pre-consultation questions require a non-empty answer'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_complete_return_preparation_submission()
  from public, anon, authenticated;
create trigger return_preparation_submissions_require_all_answers
  before insert on public.return_preparation_submissions
  for each row execute function private.enforce_complete_return_preparation_submission();

create function private.start_required_preconsultation(target_tenant uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  appointment_record public.appointments;
  patient_user uuid;
  questionnaire_version_value integer;
  request_number_value integer;
  questions jsonb := private.required_preconsultation_questions();
  result uuid;
begin
  if not private.has_tenant_role(target_tenant, array['patient']) then
    raise exception 'Active patient access required' using errcode = '42501';
  end if;

  select a.* into appointment_record
  from public.appointments a
  join public.patient_accounts pa
    on pa.tenant_id = a.tenant_id and pa.patient_id = a.patient_id
  where a.tenant_id = target_tenant
    and pa.user_id = auth.uid()
    and a.status = 'scheduled'
    and a.starts_at > clock_timestamp()
    and exists (
      select 1
      from public.care_relationships cr
      join public.memberships m
        on m.tenant_id = cr.tenant_id and m.user_id = cr.professional_id
      where cr.tenant_id = a.tenant_id
        and cr.patient_id = a.patient_id
        and cr.professional_id = a.doctor_id
        and cr.status = 'active'
        and m.role = 'doctor'
        and m.status = 'active'
    )
  order by a.starts_at, a.id
  limit 1
  for update of a;

  if not found then
    raise exception 'No eligible future appointment found' using errcode = '23514';
  end if;

  select id into result
  from public.return_preparation_requests
  where tenant_id = target_tenant
    and appointment_id = appointment_record.id
    and status <> 'cancelled'
  order by requested_at desc, id desc
  limit 1;
  if result is not null then
    return result;
  end if;

  select user_id into patient_user
  from public.patient_accounts
  where tenant_id = target_tenant and patient_id = appointment_record.patient_id;
  if patient_user is null then
    raise exception 'Patient account required' using errcode = '42501';
  end if;

  insert into public.return_preparation_questionnaires(
    tenant_id, doctor_id, title, questions
  ) values (
    target_tenant, appointment_record.doctor_id, 'Pré-consulta obrigatória', questions
  ) returning version into questionnaire_version_value;

  select coalesce(max(request_number), 0) + 1 into request_number_value
  from public.return_preparation_requests
  where tenant_id = target_tenant and appointment_id = appointment_record.id;

  insert into public.return_preparation_requests(
    tenant_id, appointment_id, patient_id, doctor_id, questionnaire_version,
    request_number, requested_by, client_request_id, supplied_questions
  ) values (
    target_tenant, appointment_record.id, appointment_record.patient_id,
    appointment_record.doctor_id, questionnaire_version_value,
    request_number_value, appointment_record.doctor_id, gen_random_uuid(), questions
  ) returning id into result;

  perform private.queue_in_app_notification(
    target_tenant,
    patient_user,
    'return_preparation_requested',
    'return-preparation-requested:' || result,
    '/clinicas/' || target_tenant || '/meu-cuidado/hoje'
  );
  return result;
end;
$$;
revoke all on function private.start_required_preconsultation(uuid)
  from public, anon, authenticated;
grant execute on function private.start_required_preconsultation(uuid)
  to authenticated;

create function public.start_required_preconsultation(target_tenant uuid)
returns uuid
language sql security invoker set search_path = '' as $$
  select private.start_required_preconsultation(target_tenant);
$$;
revoke all on function public.start_required_preconsultation(uuid)
  from public, anon, authenticated;
grant execute on function public.start_required_preconsultation(uuid)
  to authenticated;
