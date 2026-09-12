-- Slice 7A.2: explicit report publication, withdrawal and audited PDF access.
-- Published snapshots never include internal source references or review notes.
create table public.care_report_publications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  report_id uuid not null,
  patient_id uuid not null,
  doctor_id uuid not null,
  source_version integer not null,
  patient_title text not null check (length(btrim(patient_title)) between 1 and 160),
  patient_summary text not null check (length(btrim(patient_summary)) between 1 and 12000),
  period_start date not null,
  period_end date not null,
  clinic_display_name text not null check (length(btrim(clinic_display_name)) between 1 and 240),
  patient_display_name text not null check (length(btrim(patient_display_name)) between 1 and 160),
  doctor_display_name text not null check (length(btrim(doctor_display_name)) between 1 and 160),
  approved_at timestamptz not null,
  published_by uuid not null,
  published_at timestamptz not null default clock_timestamp(),
  status text not null default 'published'
    check (status in ('published','superseded','withdrawn')),
  closed_at timestamptz,
  closed_by uuid,
  withdrawal_reason text,
  unique (tenant_id, id),
  unique (tenant_id, id, patient_id),
  foreign key (tenant_id, report_id)
    references public.care_reports(tenant_id, id),
  foreign key (tenant_id, report_id, source_version)
    references public.care_report_versions(tenant_id, report_id, version),
  foreign key (tenant_id, patient_id)
    references public.patients(tenant_id, id),
  foreign key (tenant_id, doctor_id)
    references public.memberships(tenant_id, user_id),
  foreign key (tenant_id, published_by)
    references public.memberships(tenant_id, user_id),
  foreign key (tenant_id, closed_by)
    references public.memberships(tenant_id, user_id),
  check (
    (status = 'published' and closed_at is null and closed_by is null
      and withdrawal_reason is null)
    or (status = 'superseded' and closed_at is not null and closed_by is not null
      and withdrawal_reason is null)
    or (status = 'withdrawn' and closed_at is not null and closed_by is not null
      and length(btrim(withdrawal_reason)) between 1 and 1000)
  )
);
create unique index care_report_one_publication
  on public.care_report_publications(tenant_id, report_id)
  where status = 'published';
create index care_report_publication_history
  on public.care_report_publications(tenant_id, report_id, published_at desc, id);
create index care_report_publication_patient
  on public.care_report_publications(tenant_id, patient_id, status, published_at desc, id);
create index care_report_publication_author
  on public.care_report_publications(tenant_id, doctor_id, published_at desc, id);
create index care_report_publication_source
  on public.care_report_publications(tenant_id, report_id, source_version);
create index care_report_publication_closed_by
  on public.care_report_publications(tenant_id, closed_by);

create table public.care_report_export_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  publication_id uuid not null,
  patient_id uuid not null,
  requested_by uuid not null,
  requested_at timestamptz not null default clock_timestamp(),
  unique (tenant_id, id),
  foreign key (tenant_id, publication_id, patient_id)
    references public.care_report_publications(tenant_id, id, patient_id),
  foreign key (tenant_id, patient_id)
    references public.patients(tenant_id, id),
  foreign key (tenant_id, requested_by)
    references public.memberships(tenant_id, user_id)
);
create index care_report_exports_publication
  on public.care_report_export_events(tenant_id, publication_id, requested_at desc);
create index care_report_exports_requester
  on public.care_report_export_events(tenant_id, requested_by, requested_at desc);

alter table public.care_report_publications enable row level security;
alter table public.care_report_export_events enable row level security;
revoke all on public.care_report_publications, public.care_report_export_events
  from public, anon, authenticated;
grant select on public.care_report_publications to authenticated;

create policy care_report_publication_author_read
  on public.care_report_publications for select to authenticated
  using (
    doctor_id = (select auth.uid())
    and private.has_tenant_role(tenant_id, array['doctor'])
    and private.has_care_access(tenant_id, patient_id)
  );
create policy care_report_publication_patient_read
  on public.care_report_publications for select to authenticated
  using (
    status = 'published'
    and private.has_tenant_role(tenant_id, array['patient'])
    and exists (
      select 1 from public.patient_accounts account
      where account.tenant_id = care_report_publications.tenant_id
        and account.patient_id = care_report_publications.patient_id
        and account.user_id = (select auth.uid())
    )
  );

create trigger care_report_publications_audit
  after insert or update on public.care_report_publications
  for each row execute function private.audit_change();
create trigger care_report_export_events_audit
  after insert on public.care_report_export_events
  for each row execute function private.audit_change();

create function private.publish_care_report(
  target_tenant uuid,
  target_report uuid,
  read_version integer,
  previous_publication uuid,
  public_title text,
  public_summary text,
  confirmed boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  report_row public.care_reports;
  version_row public.care_report_versions;
  current_publication uuid;
  patient_name text;
  clinic_name text;
  result uuid;
begin
  if confirmed is distinct from true
    or not private.has_tenant_role(target_tenant, array['doctor']) then
    raise exception 'Doctor confirmation required' using errcode = '42501';
  end if;
  if public_title is null or length(btrim(public_title)) not between 1 and 160
    or public_summary is null or length(btrim(public_summary)) not between 1 and 12000 then
    raise exception 'Patient report content required' using errcode = '23514';
  end if;
  select * into report_row from public.care_reports report
  where report.tenant_id = target_tenant and report.id = target_report
  for update;
  if not found or report_row.doctor_id <> auth.uid()
    or not private.has_care_access(target_tenant, report_row.patient_id) then
    raise exception 'Active report author access required' using errcode = '42501';
  end if;
  select publication.id into current_publication
  from public.care_report_publications publication
  where publication.tenant_id = target_tenant
    and publication.report_id = target_report
    and publication.status = 'published';
  if report_row.version <> read_version
    or report_row.status <> 'approved'
    or current_publication is distinct from previous_publication then
    raise exception 'Publication context changed' using errcode = '23514';
  end if;
  select * into version_row from public.care_report_versions version
  where version.tenant_id = target_tenant
    and version.report_id = target_report
    and version.version = read_version
    and version.status = 'approved';
  if not found or version_row.approved_at is null then
    raise exception 'Approved snapshot required' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.care_report_publications publication
    where publication.id = current_publication
      and publication.source_version = version_row.version
  ) then
    raise exception 'This report version is already published' using errcode = '23514';
  end if;
  select patient.display_name into patient_name from public.patients patient
  where patient.tenant_id = target_tenant and patient.id = report_row.patient_id;
  select tenant.name into clinic_name from public.tenants tenant
  where tenant.id = target_tenant and tenant.status = 'active';
  if patient_name is null or clinic_name is null then
    raise exception 'Publication identity unavailable' using errcode = '42501';
  end if;
  update public.care_report_publications set
    status = 'superseded', closed_at = clock_timestamp(), closed_by = auth.uid()
  where id = current_publication;
  insert into public.care_report_publications(
    tenant_id, report_id, patient_id, doctor_id, source_version,
    patient_title, patient_summary, period_start, period_end,
    clinic_display_name, patient_display_name, doctor_display_name,
    approved_at, published_by
  ) values (
    target_tenant, target_report, report_row.patient_id, report_row.doctor_id,
    version_row.version, btrim(public_title), btrim(public_summary),
    version_row.period_start, version_row.period_end, clinic_name, patient_name,
    report_row.doctor_display_name, version_row.approved_at, auth.uid()
  ) returning id into result;
  return result;
end;
$$;

create function private.withdraw_care_report(
  target_tenant uuid,
  target_report uuid,
  target_publication uuid,
  reason text,
  confirmed boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare report_row public.care_reports; result uuid;
begin
  if confirmed is distinct from true
    or not private.has_tenant_role(target_tenant, array['doctor']) then
    raise exception 'Doctor confirmation required' using errcode = '42501';
  end if;
  if reason is null or length(btrim(reason)) not between 1 and 1000 then
    raise exception 'Withdrawal reason required' using errcode = '23514';
  end if;
  select * into report_row from public.care_reports report
  where report.tenant_id = target_tenant and report.id = target_report
  for update;
  if not found or report_row.doctor_id <> auth.uid()
    or not private.has_care_access(target_tenant, report_row.patient_id) then
    raise exception 'Active report author access required' using errcode = '42501';
  end if;
  update public.care_report_publications set
    status = 'withdrawn', closed_at = clock_timestamp(), closed_by = auth.uid(),
    withdrawal_reason = btrim(reason)
  where tenant_id = target_tenant and report_id = target_report
    and id = target_publication and status = 'published'
  returning id into result;
  if result is null then
    raise exception 'Publication context changed' using errcode = '23514';
  end if;
  return result;
end;
$$;

create function private.reopen_care_report(
  target_tenant uuid,
  target_report uuid,
  read_version integer,
  confirmed boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare report_row public.care_reports; canonical_sources jsonb;
begin
  if confirmed is distinct from true
    or not private.has_tenant_role(target_tenant, array['doctor']) then
    raise exception 'Doctor confirmation required' using errcode = '42501';
  end if;
  select * into report_row from public.care_reports report
  where report.tenant_id = target_tenant and report.id = target_report
  for update;
  if not found or report_row.doctor_id <> auth.uid()
    or not private.has_care_access(target_tenant, report_row.patient_id) then
    raise exception 'Active report author access required' using errcode = '42501';
  end if;
  if report_row.status <> 'approved' or report_row.version <> read_version then
    raise exception 'Approved current report required' using errcode = '23514';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'type', source.source_type, 'id', source.source_id,
    'label', source.source_label, 'occurred_at', source.source_occurred_at
  ) order by source.source_occurred_at, source.id), '[]'::jsonb)
  into canonical_sources
  from public.care_report_sources source
  where source.tenant_id = target_tenant and source.report_id = target_report;
  update public.care_reports set
    status = 'draft', version = version + 1, approved_at = null,
    updated_at = clock_timestamp()
  where tenant_id = target_tenant and id = target_report;
  insert into public.care_report_versions(
    tenant_id, report_id, version, status, title, summary,
    consultation_points, period_start, period_end, sources, actor_user_id
  ) values (
    target_tenant, target_report, report_row.version + 1, 'draft',
    report_row.title, report_row.summary, report_row.consultation_points,
    report_row.period_start, report_row.period_end, canonical_sources, auth.uid()
  );
  return target_report;
end;
$$;

create function private.authorize_care_report_export(
  target_tenant uuid,
  target_publication uuid
) returns setof public.care_report_publications
language plpgsql security definer set search_path = '' as $$
declare publication_row public.care_report_publications; allowed boolean := false;
begin
  select * into publication_row from public.care_report_publications publication
  where publication.tenant_id = target_tenant and publication.id = target_publication
  for share;
  if not found then
    raise exception 'Report publication unavailable' using errcode = '42501';
  end if;
  if publication_row.doctor_id = auth.uid()
    and private.has_tenant_role(target_tenant, array['doctor'])
    and private.has_care_access(target_tenant, publication_row.patient_id) then
    allowed := true;
  elsif publication_row.status = 'published'
    and private.has_tenant_role(target_tenant, array['patient'])
    and exists (
      select 1 from public.patient_accounts account
      where account.tenant_id = target_tenant
        and account.patient_id = publication_row.patient_id
        and account.user_id = auth.uid()
    ) then
    allowed := true;
  end if;
  if not allowed then
    raise exception 'Report export unavailable' using errcode = '42501';
  end if;
  insert into public.care_report_export_events(
    tenant_id, publication_id, patient_id, requested_by
  ) values (
    target_tenant, target_publication, publication_row.patient_id, auth.uid()
  );
  return next publication_row;
end;
$$;

revoke all on function private.publish_care_report(uuid, uuid, integer, uuid, text, text, boolean),
  private.withdraw_care_report(uuid, uuid, uuid, text, boolean),
  private.reopen_care_report(uuid, uuid, integer, boolean),
  private.authorize_care_report_export(uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.publish_care_report(uuid, uuid, integer, uuid, text, text, boolean),
  private.withdraw_care_report(uuid, uuid, uuid, text, boolean),
  private.reopen_care_report(uuid, uuid, integer, boolean),
  private.authorize_care_report_export(uuid, uuid)
  to authenticated;

create function public.publish_care_report(
  target_tenant uuid, target_report uuid, read_version integer,
  previous_publication uuid, public_title text, public_summary text,
  confirmed boolean
) returns uuid
language sql security invoker set search_path = '' as $$
  select private.publish_care_report(
    target_tenant, target_report, read_version, previous_publication,
    public_title, public_summary, confirmed
  );
$$;
create function public.withdraw_care_report(
  target_tenant uuid, target_report uuid, target_publication uuid,
  reason text, confirmed boolean
) returns uuid
language sql security invoker set search_path = '' as $$
  select private.withdraw_care_report(
    target_tenant, target_report, target_publication, reason, confirmed
  );
$$;
create function public.reopen_care_report(
  target_tenant uuid, target_report uuid, read_version integer, confirmed boolean
) returns uuid
language sql security invoker set search_path = '' as $$
  select private.reopen_care_report(
    target_tenant, target_report, read_version, confirmed
  );
$$;
create function public.authorize_care_report_export(
  target_tenant uuid, target_publication uuid
) returns setof public.care_report_publications
language sql security invoker set search_path = '' as $$
  select * from private.authorize_care_report_export(
    target_tenant, target_publication
  );
$$;
revoke all on function public.publish_care_report(uuid, uuid, integer, uuid, text, text, boolean),
  public.withdraw_care_report(uuid, uuid, uuid, text, boolean),
  public.reopen_care_report(uuid, uuid, integer, boolean),
  public.authorize_care_report_export(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.publish_care_report(uuid, uuid, integer, uuid, text, text, boolean),
  public.withdraw_care_report(uuid, uuid, uuid, text, boolean),
  public.reopen_care_report(uuid, uuid, integer, boolean),
  public.authorize_care_report_export(uuid, uuid)
  to authenticated;
