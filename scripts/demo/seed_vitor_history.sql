-- C2: histórico retrospectivo e inteiramente fictício para demonstrar a
-- jornada do paciente Vitor. Executar somente no projeto de testes
-- oxuwrdjojsmgxoljqkuk, usando --linked --project-ref explícitos.
--
-- Não altera fatos já registrados, agendamentos, documentos, medidas,
-- prescrições, condutas ou registros assinados pelo médico. As datas de
-- referência são históricas; submitted_at/created_at registram a carga real.
-- Chaves de solicitação determinísticas tornam a carga repetível.

BEGIN;
SELECT pg_advisory_xact_lock(20260929, 3);

DO $guard$
BEGIN
  IF (SELECT count(*) FROM auth.users) <> 2
     OR (SELECT count(*) FROM public.patients) <> 1
     OR NOT EXISTS (
       SELECT 1 FROM auth.users u
       JOIN public.memberships m ON m.user_id = u.id
       WHERE u.id = '70c8879e-5aae-453c-a437-1286e16e2b24'
         AND u.email = 'vitor.milanezz@gmail.com'
         AND m.tenant_id = '61846445-8d30-4f68-b166-82d08c198cd0'
         AND m.role = 'patient' AND m.status = 'active'
     )
     OR NOT EXISTS (
       SELECT 1 FROM auth.users u
       JOIN public.memberships m ON m.user_id = u.id
       WHERE u.id = '5fa1330b-a7d3-4843-8e4a-57ef3533062e'
         AND u.email = 'guilhe.martins@gmail.com'
         AND m.tenant_id = '61846445-8d30-4f68-b166-82d08c198cd0'
         AND m.role = 'doctor' AND m.status = 'active'
     )
     OR NOT EXISTS (
       SELECT 1 FROM public.patient_accounts
       WHERE tenant_id = '61846445-8d30-4f68-b166-82d08c198cd0'
         AND patient_id = 'd4791c89-cfe7-438b-9686-32523dd29c15'
         AND user_id = '70c8879e-5aae-453c-a437-1286e16e2b24'
     )
  THEN RAISE EXCEPTION 'Unexpected project or account inventory; seed aborted';
  END IF;
END $guard$;

WITH days(check_in_on, feeling, hunger, satiety, energy, sleep, water_glasses, note) AS (
  VALUES
    ('2026-09-08'::date, 3, 3, 3, 3, 3, 5, 'DEMONSTRAÇÃO — registro retrospectivo fictício: organizei os horários da rotina.'),
    ('2026-09-09'::date, 4, 3, 4, 4, 4, 6, 'DEMONSTRAÇÃO — registro retrospectivo fictício: dia estável e refeições planejadas.'),
    ('2026-09-10'::date, 3, 4, 3, 3, 3, 5, 'DEMONSTRAÇÃO — registro retrospectivo fictício: tive um dia mais corrido.'),
    ('2026-09-11'::date, 4, 3, 4, 4, 4, 7, 'DEMONSTRAÇÃO — registro retrospectivo fictício: consegui manter pausas durante o dia.'),
    ('2026-09-12'::date, 3, 3, 3, 3, 3, 6, 'DEMONSTRAÇÃO — registro retrospectivo fictício: caminhei no fim da tarde.'),
    ('2026-09-13'::date, 3, 4, 3, 3, 3, 5, 'DEMONSTRAÇÃO — registro retrospectivo fictício: horários diferentes no domingo.'),
    ('2026-09-14'::date, 4, 3, 4, 4, 4, 7, 'DEMONSTRAÇÃO — registro retrospectivo fictício: voltei ao ritmo da semana.'),
    ('2026-09-15'::date, 3, 3, 3, 3, 3, 6, 'DEMONSTRAÇÃO — registro retrospectivo fictício: acompanhei sono e hidratação.'),
    ('2026-09-16'::date, 4, 2, 4, 4, 4, 7, 'DEMONSTRAÇÃO — registro retrospectivo fictício: manhã tranquila e caminhada leve.'),
    ('2026-09-17'::date, 3, 4, 3, 3, 2, 5, 'DEMONSTRAÇÃO — registro retrospectivo fictício: dormi menos do que o habitual.'),
    ('2026-09-18'::date, 4, 3, 4, 4, 4, 7, 'DEMONSTRAÇÃO — registro retrospectivo fictício: anotei dúvidas para conversar na consulta.'),
    ('2026-09-19'::date, 3, 3, 3, 3, 3, 5, 'DEMONSTRAÇÃO — registro retrospectivo fictício: comecei a organizar a rotina da semana.'),
    ('2026-09-20'::date, 4, 3, 4, 4, 3, 6, 'DEMONSTRAÇÃO — registro retrospectivo fictício: refeições em horários regulares.'),
    ('2026-09-21'::date, 3, 4, 3, 3, 2, 5, 'DEMONSTRAÇÃO — registro retrospectivo fictício: dormi menos e anotei perguntas para a consulta.'),
    ('2026-09-22'::date, 4, 3, 4, 4, 4, 7, 'DEMONSTRAÇÃO — registro retrospectivo fictício: organizei meus documentos antes do atendimento.'),
    ('2026-09-25'::date, 3, 3, 3, 3, 3, 6, 'DEMONSTRAÇÃO — registro retrospectivo fictício: retomei os registros da rotina.'),
    ('2026-09-26'::date, 4, 2, 4, 4, 4, 7, 'DEMONSTRAÇÃO — registro retrospectivo fictício: fiz uma caminhada leve e mantive a hidratação.'),
    ('2026-09-27'::date, 3, 4, 3, 3, 3, 5, 'DEMONSTRAÇÃO — registro retrospectivo fictício: horários diferentes no fim de semana.'),
    ('2026-09-28'::date, 4, 3, 4, 4, 4, 8, 'DEMONSTRAÇÃO — registro retrospectivo fictício: preparei dúvidas para o próximo encontro.')
)
INSERT INTO public.patient_daily_check_ins (
  tenant_id, patient_id, actor_user_id, client_request_id,
  check_in_on, feeling, hunger, satiety, energy, sleep, water_glasses, note
)
SELECT
  '61846445-8d30-4f68-b166-82d08c198cd0'::uuid,
  'd4791c89-cfe7-438b-9686-32523dd29c15'::uuid,
  '70c8879e-5aae-453c-a437-1286e16e2b24'::uuid,
  md5('vivance-c2-vitor-history:check-in:' || d.check_in_on::text)::uuid,
  d.check_in_on, d.feeling, d.hunger, d.satiety, d.energy, d.sleep,
  d.water_glasses, d.note
FROM days d
WHERE NOT EXISTS (
  SELECT 1 FROM public.patient_daily_check_ins existing
  WHERE existing.tenant_id = '61846445-8d30-4f68-b166-82d08c198cd0'
    AND existing.patient_id = 'd4791c89-cfe7-438b-9686-32523dd29c15'
    AND existing.check_in_on = d.check_in_on
)
ON CONFLICT (tenant_id, actor_user_id, client_request_id) DO NOTHING;

WITH meals(eaten_at, meal_type, description) AS (
  VALUES
    ('2026-09-19 12:30:00-03'::timestamptz, 'lunch', 'DEMONSTRAÇÃO — refeição fictícia: arroz, feijão, legumes e frango.'),
    ('2026-09-20 19:40:00-03'::timestamptz, 'dinner', 'DEMONSTRAÇÃO — refeição fictícia: sopa de legumes e torradas.'),
    ('2026-09-21 08:10:00-03'::timestamptz, 'breakfast', 'DEMONSTRAÇÃO — refeição fictícia: banana, iogurte e aveia.'),
    ('2026-09-22 13:00:00-03'::timestamptz, 'lunch', 'DEMONSTRAÇÃO — refeição fictícia: arroz, feijão, carne e salada.'),
    ('2026-09-23 19:35:00-03'::timestamptz, 'dinner', 'DEMONSTRAÇÃO — refeição fictícia: omelete, pão e tomate.'),
    ('2026-09-24 12:45:00-03'::timestamptz, 'lunch', 'DEMONSTRAÇÃO — refeição fictícia: peixe, batata e legumes.'),
    ('2026-09-25 08:15:00-03'::timestamptz, 'breakfast', 'DEMONSTRAÇÃO — refeição fictícia: pão integral, queijo branco, fruta e café.'),
    ('2026-09-25 12:40:00-03'::timestamptz, 'lunch', 'DEMONSTRAÇÃO — refeição fictícia: arroz, feijão, frango e salada.'),
    ('2026-09-25 19:30:00-03'::timestamptz, 'dinner', 'DEMONSTRAÇÃO — refeição fictícia: sopa de legumes e ovo.'),
    ('2026-09-26 08:35:00-03'::timestamptz, 'breakfast', 'DEMONSTRAÇÃO — refeição fictícia: iogurte natural, banana e aveia.'),
    ('2026-09-26 13:10:00-03'::timestamptz, 'lunch', 'DEMONSTRAÇÃO — refeição fictícia: peixe, arroz e legumes.'),
    ('2026-09-26 20:05:00-03'::timestamptz, 'dinner', 'DEMONSTRAÇÃO — refeição fictícia: sanduíche caseiro e salada.'),
    ('2026-09-27 09:00:00-03'::timestamptz, 'breakfast', 'DEMONSTRAÇÃO — refeição fictícia: ovos, fruta e café.'),
    ('2026-09-27 13:25:00-03'::timestamptz, 'lunch', 'DEMONSTRAÇÃO — refeição fictícia: macarrão com molho de tomate, frango e salada.'),
    ('2026-09-27 19:45:00-03'::timestamptz, 'dinner', 'DEMONSTRAÇÃO — refeição fictícia: legumes assados e arroz.'),
    ('2026-09-28 08:20:00-03'::timestamptz, 'breakfast', 'DEMONSTRAÇÃO — refeição fictícia: fruta, pão e café.'),
    ('2026-09-28 12:50:00-03'::timestamptz, 'lunch', 'DEMONSTRAÇÃO — refeição fictícia: arroz, feijão, carne e salada.'),
    ('2026-09-28 19:20:00-03'::timestamptz, 'dinner', 'DEMONSTRAÇÃO — refeição fictícia: omelete e salada.')
)
INSERT INTO public.patient_meal_logs (
  tenant_id, patient_id, actor_user_id, meal_type, eaten_at,
  description, client_request_id
)
SELECT
  '61846445-8d30-4f68-b166-82d08c198cd0'::uuid,
  'd4791c89-cfe7-438b-9686-32523dd29c15'::uuid,
  '70c8879e-5aae-453c-a437-1286e16e2b24'::uuid,
  m.meal_type, m.eaten_at, m.description,
  md5('vivance-c2-vitor-history:meal:' || m.eaten_at::text || ':' || m.meal_type)::uuid
FROM meals m
ON CONFLICT (tenant_id, actor_user_id, client_request_id) DO NOTHING;

DO $verify$
BEGIN
  IF (SELECT count(*) FROM public.patient_daily_check_ins
      WHERE patient_id='d4791c89-cfe7-438b-9686-32523dd29c15'
        AND note LIKE 'DEMONSTRAÇÃO — registro retrospectivo fictício:%') <> 19
     OR (SELECT count(*) FROM public.patient_meal_logs
         WHERE patient_id='d4791c89-cfe7-438b-9686-32523dd29c15'
           AND description LIKE 'DEMONSTRAÇÃO — refeição fictícia:%') <> 18
     OR (SELECT count(*) FROM auth.users) <> 2
     OR (SELECT count(*) FROM public.patients) <> 1
  THEN RAISE EXCEPTION 'Seed verification failed'; END IF;
END $verify$;

COMMIT;
