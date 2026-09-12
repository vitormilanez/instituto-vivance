-- Slice 7A.1: manual, internal, versioned care reports. Publication is separate.
create table public.care_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  patient_id uuid not null,
  doctor_id uuid not null,
  doctor_display_name text not null,
  period_start date not null,
  period_end date not null,
  title text not null default '' check (length(title) <= 160),
  summary text not null default '' check (length(summary) <= 12000),
  consultation_points text not null default '' check (length(consultation_points) <= 6000),
  status text not null default 'draft' check (status in ('draft','in_review','approved')),
  version integer not null default 1 check (version > 0),
  approved_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (tenant_id, id),
  foreign key (tenant_id, patient_id) references public.patients(tenant_id, id),
  foreign key (tenant_id, doctor_id) references public.memberships(tenant_id, user_id),
  check (period_start <= period_end),
  check (
    status = 'draft'
    or (btrim(title) <> '' and btrim(summary) <> '' and btrim(consultation_points) <> '')
  )
);
create index care_reports_doctor_recent
  on public.care_reports(tenant_id, doctor_id, updated_at desc, id);
create index care_reports_patient_recent
  on public.care_reports(tenant_id, patient_id, updated_at desc, id);

create table public.care_report_sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  report_id uuid not null,
  patient_id uuid not null,
  source_type text not null check (source_type in ('check_in','document_review')),
  source_id uuid not null,
  source_label text not null check (length(btrim(source_label)) between 1 and 240),
  source_occurred_at timestamptz not null,
  included_by uuid not null,
  included_at timestamptz not null default clock_timestamp(),
  unique (tenant_id, id),
  unique (tenant_id, report_id, source_type, source_id),
  foreign key (tenant_id, report_id) references public.care_reports(tenant_id, id) on delete cascade,
  foreign key (tenant_id, patient_id) references public.patients(tenant_id, id),
  foreign key (tenant_id, included_by) references public.memberships(tenant_id, user_id)
);
create index care_report_sources_report
  on public.care_report_sources(tenant_id, report_id, source_occurred_at, id);

create table public.care_report_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  report_id uuid not null,
  version integer not null,
  status text not null,
  title text not null,
  summary text not null,
  consultation_points text not null,
  period_start date not null,
  period_end date not null,
  sources jsonb not null check (jsonb_typeof(sources) = 'array'),
  approved_at timestamptz,
  actor_user_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  unique (tenant_id, report_id, version),
  foreign key (tenant_id, report_id) references public.care_reports(tenant_id, id),
  foreign key (tenant_id, actor_user_id) references public.memberships(tenant_id, user_id)
);

alter table public.care_reports enable row level security;
alter table public.care_report_sources enable row level security;
alter table public.care_report_versions enable row level security;
revoke all on public.care_reports, public.care_report_sources, public.care_report_versions
  from public, anon, authenticated;
grant select on public.care_reports, public.care_report_sources, public.care_report_versions
  to authenticated;

create policy care_reports_clinical_read on public.care_reports
  for select to authenticated
  using (
    doctor_id = (select auth.uid())
    and private.has_tenant_role(tenant_id, array['doctor'])
    and private.has_care_access(tenant_id, patient_id)
  );
create policy care_report_sources_clinical_read on public.care_report_sources
  for select to authenticated
  using (
    exists (
      select 1 from public.care_reports report
      where report.tenant_id = care_report_sources.tenant_id
        and report.id = care_report_sources.report_id
    )
  );
create policy care_report_versions_clinical_read on public.care_report_versions
  for select to authenticated
  using (
    exists (
      select 1 from public.care_reports report
      where report.tenant_id = care_report_versions.tenant_id
        and report.id = care_report_versions.report_id
    )
  );

create function private.create_care_report(
  target_tenant uuid,
  target_patient uuid,
  report_period_start date,
  report_period_end date
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid; doctor_name text;
begin
  if report_period_start is null or report_period_end is null
    or report_period_start > report_period_end
    or report_period_end - report_period_start > 366 then
    raise exception 'Valid report period required' using errcode = '23514';
  end if;
  if not private.has_tenant_role(target_tenant, array['doctor'])
    or not private.has_care_access(target_tenant, target_patient) then
    raise exception 'Active doctor relationship required' using errcode = '42501';
  end if;
  select membership.display_name into doctor_name
  from public.memberships membership
  where membership.tenant_id = target_tenant
    and membership.user_id = auth.uid()
    and membership.role = 'doctor'
    and membership.status = 'active';
  insert into public.care_reports(
    tenant_id, patient_id, doctor_id, doctor_display_name, period_start, period_end
  ) values (
    target_tenant, target_patient, auth.uid(), coalesce(doctor_name, 'Médico responsável'),
    report_period_start, report_period_end
  ) returning id into result;
  insert into public.care_report_versions(
    tenant_id, report_id, version, status, title, summary, consultation_points,
    period_start, period_end, sources, actor_user_id
  ) values (
    target_tenant, result, 1, 'draft', '', '', '', report_period_start,
    report_period_end, '[]'::jsonb, auth.uid()
  );
  return result;
end;
$$;
revoke all on function private.create_care_report(uuid, uuid, date, date)
  from public, anon, authenticated;
grant execute on function private.create_care_report(uuid, uuid, date, date)
  to authenticated;

create function public.create_care_report(
  target_tenant uuid,
  target_patient uuid,
  report_period_start date,
  report_period_end date
) returns uuid
language sql security invoker set search_path = '' as $$
  select private.create_care_report(
    target_tenant, target_patient, report_period_start, report_period_end
  );
$$;
revoke all on function public.create_care_report(uuid, uuid, date, date)
  from public, anon, authenticated;
grant execute on function public.create_care_report(uuid, uuid, date, date)
  to authenticated;

create function private.save_care_report(
  target_tenant uuid,
  target_report uuid,
  read_version integer,
  report_title text,
  report_summary text,
  report_consultation_points text,
  report_status text,
  source_refs jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  current_report public.care_reports;
  source_ref jsonb;
  source_uuid uuid;
  source_kind text;
  source_label text;
  source_time timestamptz;
  canonical_sources jsonb := '[]'::jsonb;
  selected_count integer := 0;
begin
  select * into current_report
  from public.care_reports report
  where report.tenant_id = target_tenant and report.id = target_report
  for update;
  if not found
    or current_report.doctor_id <> auth.uid()
    or not private.has_tenant_role(target_tenant, array['doctor'])
    or not private.has_care_access(target_tenant, current_report.patient_id) then
    raise exception 'Active report author access required' using errcode = '42501';
  end if;
  if read_version is distinct from current_report.version then
    raise exception 'Stale report version' using errcode = '40001';
  end if;
  if report_title is null or length(report_title) > 160
    or report_summary is null or length(report_summary) > 12000
    or report_consultation_points is null or length(report_consultation_points) > 6000
    or report_status not in ('draft','in_review') then
    raise exception 'Invalid report content' using errcode = '23514';
  end if;
  if not (
    (current_report.status = 'draft' and report_status in ('draft','in_review'))
    or (current_report.status = 'in_review' and report_status = 'draft')
  ) then
    raise exception 'Invalid report transition' using errcode = '23514';
  end if;
  if report_status <> 'draft' and (
    btrim(report_title) = '' or btrim(report_summary) = ''
    or btrim(report_consultation_points) = ''
  ) then
    raise exception 'Complete report required for review' using errcode = '23514';
  end if;

  if source_refs is null or jsonb_typeof(source_refs) <> 'array'
    or jsonb_array_length(source_refs) > 20 then
    raise exception 'Valid report sources required' using errcode = '23514';
  end if;
    delete from public.care_report_sources source
    where source.tenant_id = target_tenant and source.report_id = target_report;

    for source_ref in select value from jsonb_array_elements(source_refs)
    loop
      if jsonb_typeof(source_ref) <> 'object'
        or (select count(*) from jsonb_object_keys(source_ref)) <> 2
        or not (source_ref ? 'type' and source_ref ? 'id') then
        raise exception 'Invalid report source reference' using errcode = '23514';
      end if;
      source_kind := source_ref->>'type';
      begin source_uuid := (source_ref->>'id')::uuid;
      exception when invalid_text_representation then
        raise exception 'Invalid report source id' using errcode = '23514';
      end;
      source_label := null; source_time := null;
      if source_kind = 'check_in' then
        select 'Relato enviado pela pessoa', submission.submitted_at
        into source_label, source_time
        from public.care_check_in_submissions submission
        where submission.tenant_id = target_tenant
          and submission.patient_id = current_report.patient_id
          and submission.id = source_uuid;
      elsif source_kind = 'document_review' then
        select 'Documento com revisão médica', review.reviewed_at
        into source_label, source_time
        from public.patient_document_reviews review
        join public.patient_documents document
          on document.tenant_id = review.tenant_id
         and document.id = review.document_id
         and document.patient_id = review.patient_id
        where review.tenant_id = target_tenant
          and review.patient_id = current_report.patient_id
          and review.id = source_uuid;
      else
        raise exception 'Unsupported report source' using errcode = '23514';
      end if;
      if source_time is null
        or source_time::date < current_report.period_start
        or source_time::date > current_report.period_end then
        raise exception 'Source unavailable for report period' using errcode = '42501';
      end if;
      insert into public.care_report_sources(
        tenant_id, report_id, patient_id, source_type, source_id,
        source_label, source_occurred_at, included_by
      ) values (
        target_tenant, target_report, current_report.patient_id, source_kind,
        source_uuid, source_label, source_time, auth.uid()
      );
      selected_count := selected_count + 1;
    end loop;
    if report_status = 'in_review' and selected_count = 0 then
      raise exception 'At least one source required for review' using errcode = '23514';
    end if;

  update public.care_reports set
    title = btrim(report_title),
    summary = btrim(report_summary),
    consultation_points = btrim(report_consultation_points),
    status = report_status,
    version = current_report.version + 1,
    approved_at = null,
    updated_at = clock_timestamp()
  where tenant_id = target_tenant and id = target_report;

  select coalesce(jsonb_agg(jsonb_build_object(
    'type', source.source_type,
    'id', source.source_id,
    'label', source.source_label,
    'occurred_at', source.source_occurred_at
  ) order by source.source_occurred_at, source.id), '[]'::jsonb)
  into canonical_sources
  from public.care_report_sources source
  where source.tenant_id = target_tenant and source.report_id = target_report;

  insert into public.care_report_versions(
    tenant_id, report_id, version, status, title, summary, consultation_points,
    period_start, period_end, sources, approved_at, actor_user_id
  ) values (
    target_tenant, target_report, current_report.version + 1, report_status,
    btrim(report_title), btrim(report_summary), btrim(report_consultation_points),
    current_report.period_start, current_report.period_end, canonical_sources,
    null,
    auth.uid()
  );
  return target_report;
end;
$$;
revoke all on function private.save_care_report(uuid, uuid, integer, text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function private.save_care_report(uuid, uuid, integer, text, text, text, text, jsonb)
  to authenticated;

create function public.save_care_report(
  target_tenant uuid,
  target_report uuid,
  read_version integer,
  report_title text,
  report_summary text,
  report_consultation_points text,
  report_status text,
  source_refs jsonb
) returns uuid
language sql security invoker set search_path = '' as $$
  select private.save_care_report(
    target_tenant, target_report, read_version, report_title, report_summary,
    report_consultation_points, report_status, source_refs
  );
$$;
revoke all on function public.save_care_report(uuid, uuid, integer, text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_care_report(uuid, uuid, integer, text, text, text, text, jsonb)
  to authenticated;

create function private.approve_care_report(
  target_tenant uuid,
  target_report uuid,
  read_version integer,
  confirmed boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare current_report public.care_reports; canonical_sources jsonb;
begin
  select * into current_report from public.care_reports report
  where report.tenant_id = target_tenant and report.id = target_report
  for update;
  if not found then
    raise exception 'Report unavailable' using errcode = '42501';
  end if;
  if confirmed is distinct from true
    or current_report.doctor_id <> auth.uid()
    or current_report.status <> 'in_review'
    or current_report.version <> read_version
    or not private.has_tenant_role(target_tenant, array['doctor'])
    or not private.has_care_access(target_tenant, current_report.patient_id) then
    raise exception 'Confirmed current report review required' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'type', source.source_type, 'id', source.source_id,
    'label', source.source_label, 'occurred_at', source.source_occurred_at
  ) order by source.source_occurred_at, source.id), '[]'::jsonb)
  into canonical_sources
  from public.care_report_sources source
  where source.tenant_id = target_tenant and source.report_id = target_report;
  if jsonb_array_length(canonical_sources) = 0 then
    raise exception 'Report source required' using errcode = '23514';
  end if;
  update public.care_reports set status = 'approved', version = version + 1,
    approved_at = clock_timestamp(), updated_at = clock_timestamp()
  where tenant_id = target_tenant and id = target_report;
  insert into public.care_report_versions(
    tenant_id, report_id, version, status, title, summary, consultation_points,
    period_start, period_end, sources, approved_at, actor_user_id
  ) values (
    target_tenant, target_report, current_report.version + 1, 'approved',
    current_report.title, current_report.summary, current_report.consultation_points,
    current_report.period_start, current_report.period_end, canonical_sources,
    clock_timestamp(), auth.uid()
  );
  return target_report;
end;
$$;
revoke all on function private.approve_care_report(uuid, uuid, integer, boolean)
  from public, anon, authenticated;
grant execute on function private.approve_care_report(uuid, uuid, integer, boolean)
  to authenticated;

create function public.approve_care_report(
  target_tenant uuid, target_report uuid, read_version integer, confirmed boolean
) returns uuid
language sql security invoker set search_path = '' as $$
  select private.approve_care_report(target_tenant, target_report, read_version, confirmed);
$$;
revoke all on function public.approve_care_report(uuid, uuid, integer, boolean)
  from public, anon, authenticated;
grant execute on function public.approve_care_report(uuid, uuid, integer, boolean)
  to authenticated;

create trigger care_reports_audit after insert or update on public.care_reports
  for each row execute function private.audit_change();
create trigger care_report_sources_audit after insert on public.care_report_sources
  for each row execute function private.audit_change();
