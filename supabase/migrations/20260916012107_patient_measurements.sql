-- Patient-author-reported measurements. Each submission is append-only so the
-- longitudinal view preserves its source and date instead of overwriting history.
create table public.patient_measurements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  patient_id uuid not null,
  actor_user_id uuid not null,
  metric text not null check (metric in ('weight', 'height', 'waist')),
  measure_label text not null,
  measure_value numeric not null check (
    measure_value <> 'NaN'::numeric
    and measure_value > 0
    and (
      (metric = 'weight' and measure_value <= 500)
      or (metric = 'height' and measure_value <= 300)
      or (metric = 'waist' and measure_value <= 400)
    )
  ),
  measure_unit text not null,
  reported_on date not null check (reported_on <= current_date),
  client_request_id uuid not null,
  submitted_at timestamptz not null default clock_timestamp(),
  unique (tenant_id, id),
  unique (tenant_id, patient_id, client_request_id, metric),
  foreign key (tenant_id, patient_id) references public.patients(tenant_id, id),
  foreign key (tenant_id, actor_user_id) references public.memberships(tenant_id, user_id),
  check (
    (metric = 'weight' and measure_label = 'Peso' and measure_unit = 'kg')
    or (metric = 'height' and measure_label = 'Altura' and measure_unit = 'cm')
    or (metric = 'waist' and measure_label = 'Circunferência abdominal' and measure_unit = 'cm')
  )
);

create index patient_measurements_patient_history
  on public.patient_measurements (tenant_id, patient_id, reported_on desc, submitted_at desc, id);
create index patient_measurements_actor
  on public.patient_measurements (tenant_id, actor_user_id);

alter table public.patient_measurements enable row level security;
revoke all on public.patient_measurements from public, anon, authenticated;
grant select on public.patient_measurements to authenticated;
create policy patient_measurements_read_staff on public.patient_measurements
  for select to authenticated
  using (private.has_care_access(tenant_id, patient_id));
create policy patient_measurements_read_own on public.patient_measurements
  for select to authenticated
  using (
    actor_user_id = (select auth.uid())
    and private.has_tenant_role(tenant_id, array['patient'])
    and exists (
      select 1 from public.patient_accounts account
      where account.tenant_id = patient_measurements.tenant_id
        and account.patient_id = patient_measurements.patient_id
        and account.user_id = (select auth.uid())
    )
  );

create trigger patient_measurements_audit
  after insert on public.patient_measurements
  for each row execute function private.audit_change();

create function private.submit_patient_measurements(
  target_tenant uuid,
  weight_kg numeric,
  height_cm numeric,
  waist_cm numeric,
  measured_on date,
  request_id uuid,
  confirmed boolean
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  own_patient uuid;
  inserted_count integer;
begin
  if confirmed is distinct from true
    or not private.has_tenant_role(target_tenant, array['patient']) then
    raise exception 'Patient confirmation required' using errcode = '42501';
  end if;
  select account.patient_id into own_patient
  from public.patient_accounts account
  where account.tenant_id = target_tenant and account.user_id = auth.uid();
  if own_patient is null then
    raise exception 'Patient account required' using errcode = '42501';
  end if;
  if measured_on is null or measured_on > current_date or request_id is null
    or (weight_kg is null and height_cm is null and waist_cm is null) then
    raise exception 'At least one valid current measure is required' using errcode = '23514';
  end if;
  if (weight_kg is not null and (weight_kg = 'NaN'::numeric or weight_kg <= 0 or weight_kg > 500))
    or (height_cm is not null and (height_cm = 'NaN'::numeric or height_cm <= 0 or height_cm > 300))
    or (waist_cm is not null and (waist_cm = 'NaN'::numeric or waist_cm <= 0 or waist_cm > 400)) then
    raise exception 'Measure outside supported range' using errcode = '23514';
  end if;

  insert into public.patient_measurements(
    tenant_id, patient_id, actor_user_id, metric, measure_label,
    measure_value, measure_unit, reported_on, client_request_id
  )
  select target_tenant, own_patient, auth.uid(), item.metric, item.label,
    item.value, item.unit, measured_on, request_id
  from (values
    ('weight'::text, 'Peso'::text, weight_kg, 'kg'::text),
    ('height'::text, 'Altura'::text, height_cm, 'cm'::text),
    ('waist'::text, 'Circunferência abdominal'::text, waist_cm, 'cm'::text)
  ) as item(metric, label, value, unit)
  where item.value is not null
  on conflict (tenant_id, patient_id, client_request_id, metric) do nothing;
  get diagnostics inserted_count = row_count;

  if inserted_count = 0 then
    select count(*)::integer into inserted_count
    from public.patient_measurements
    where tenant_id = target_tenant and patient_id = own_patient
      and client_request_id = request_id;
  end if;
  return inserted_count;
end;
$$;

revoke all on function private.submit_patient_measurements(uuid, numeric, numeric, numeric, date, uuid, boolean)
  from public, anon, authenticated;
grant execute on function private.submit_patient_measurements(uuid, numeric, numeric, numeric, date, uuid, boolean)
  to authenticated;

create function public.submit_patient_measurements(
  target_tenant uuid,
  weight_kg numeric,
  height_cm numeric,
  waist_cm numeric,
  measured_on date,
  request_id uuid,
  confirmed boolean
) returns integer
language sql security invoker set search_path = '' as $$
  select private.submit_patient_measurements(
    target_tenant, weight_kg, height_cm, waist_cm, measured_on, request_id, confirmed
  );
$$;
revoke all on function public.submit_patient_measurements(uuid, numeric, numeric, numeric, date, uuid, boolean)
  from public, anon;
grant execute on function public.submit_patient_measurements(uuid, numeric, numeric, numeric, date, uuid, boolean)
  to authenticated;
