-- Slice 5C: private in-app notices. These are intentionally generic: they
-- indicate that an update exists but never contain a message, plan detail,
-- patient name or other clinical information.
create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid not null,
  in_app_enabled boolean not null default true,
  updated_at timestamptz not null default clock_timestamp(),
  unique (tenant_id, user_id),
  foreign key (tenant_id, user_id)
    references public.memberships(tenant_id, user_id)
);

create table public.in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  recipient_user_id uuid not null,
  kind text not null check (kind in ('message', 'plan_published')),
  event_key text not null check (char_length(event_key) between 1 and 180),
  target_path text not null check (target_path like '/clinicas/%'),
  created_at timestamptz not null default clock_timestamp(),
  read_at timestamptz,
  unique (tenant_id, recipient_user_id, event_key),
  foreign key (tenant_id, recipient_user_id)
    references public.memberships(tenant_id, user_id)
);
create index in_app_notifications_recipient_recent
  on public.in_app_notifications(
    tenant_id, recipient_user_id, created_at desc, id desc
  );
create index in_app_notifications_recipient_unread
  on public.in_app_notifications(
    tenant_id, recipient_user_id, created_at desc, id desc
  ) where read_at is null;

alter table public.notification_preferences enable row level security;
alter table public.in_app_notifications enable row level security;
revoke all on public.notification_preferences, public.in_app_notifications
  from public, anon, authenticated;
grant select on public.notification_preferences, public.in_app_notifications
  to authenticated;

create policy notification_preferences_read_own
  on public.notification_preferences for select to authenticated
  using (
    user_id = (select auth.uid())
    and private.has_tenant_role(
      tenant_id,
      array['admin', 'doctor', 'nurse', 'patient']
    )
  );
create policy in_app_notifications_read_own
  on public.in_app_notifications for select to authenticated
  using (
    recipient_user_id = (select auth.uid())
    and private.has_tenant_role(
      tenant_id,
      array['admin', 'doctor', 'nurse', 'patient']
    )
  );

-- Private producers can enqueue only a generic allowlisted event. The target
-- remains an internal, tenant-scoped path and the recipient must still be an
-- active member. A disabled preference suppresses a notice without deleting
-- historical read state.
create function private.queue_in_app_notification(
  target_tenant uuid,
  target_recipient uuid,
  notice_kind text,
  source_event_key text,
  internal_path text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if notice_kind not in ('message', 'plan_published')
    or source_event_key is null
    or char_length(source_event_key) not between 1 and 180
    or internal_path not like '/clinicas/' || target_tenant::text || '/%' then
    raise exception 'Valid internal notification required' using errcode = '23514';
  end if;

  if target_recipient is null or target_recipient = auth.uid() then
    return null;
  end if;

  if not exists (
    select 1
    from public.memberships membership
    join public.tenants tenant on tenant.id = membership.tenant_id
    where membership.tenant_id = target_tenant
      and membership.user_id = target_recipient
      and membership.status = 'active'
      and tenant.status = 'active'
  ) then
    return null;
  end if;

  if exists (
    select 1
    from public.notification_preferences preference
    where preference.tenant_id = target_tenant
      and preference.user_id = target_recipient
      and preference.in_app_enabled = false
  ) then
    return null;
  end if;

  insert into public.in_app_notifications(
    tenant_id,
    recipient_user_id,
    kind,
    event_key,
    target_path
  ) values (
    target_tenant,
    target_recipient,
    notice_kind,
    source_event_key,
    internal_path
  ) on conflict (tenant_id, recipient_user_id, event_key)
    do nothing
  returning id into result;
  return result;
end;
$$;
revoke all on function private.queue_in_app_notification(uuid, uuid, text, text, text)
  from public, anon, authenticated;

create function private.mark_in_app_notification_read(
  target_tenant uuid,
  target_notification uuid
) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare result timestamptz;
begin
  if not private.has_tenant_role(
    target_tenant,
    array['admin', 'doctor', 'nurse', 'patient']
  ) then
    raise exception 'Notification access required' using errcode = '42501';
  end if;

  update public.in_app_notifications
    set read_at = coalesce(read_at, clock_timestamp())
    where tenant_id = target_tenant
      and id = target_notification
      and recipient_user_id = auth.uid()
    returning read_at into result;
  if result is null then
    raise exception 'Notification not available' using errcode = '42501';
  end if;
  return result;
end;
$$;

create function private.set_in_app_notification_preference(
  target_tenant uuid,
  enabled boolean
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare result boolean;
begin
  if enabled is null or not private.has_tenant_role(
    target_tenant,
    array['admin', 'doctor', 'nurse', 'patient']
  ) then
    raise exception 'Notification preference access required' using errcode = '42501';
  end if;

  insert into public.notification_preferences(
    tenant_id,
    user_id,
    in_app_enabled,
    updated_at
  ) values (
    target_tenant,
    auth.uid(),
    enabled,
    clock_timestamp()
  ) on conflict (tenant_id, user_id)
    do update set
      in_app_enabled = excluded.in_app_enabled,
      updated_at = excluded.updated_at
  returning in_app_enabled into result;
  return result;
end;
$$;

revoke all on function private.mark_in_app_notification_read(uuid, uuid),
  private.set_in_app_notification_preference(uuid, boolean)
  from public, anon, authenticated;
grant execute on function private.mark_in_app_notification_read(uuid, uuid),
  private.set_in_app_notification_preference(uuid, boolean)
  to authenticated;

create function public.mark_in_app_notification_read(
  target_tenant uuid,
  target_notification uuid
) returns timestamptz
language sql security invoker set search_path = '' as $$
  select private.mark_in_app_notification_read(
    target_tenant,
    target_notification
  );
$$;
create function public.set_in_app_notification_preference(
  target_tenant uuid,
  enabled boolean
) returns boolean
language sql security invoker set search_path = '' as $$
  select private.set_in_app_notification_preference(target_tenant, enabled);
$$;
revoke all on function public.mark_in_app_notification_read(uuid, uuid),
  public.set_in_app_notification_preference(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.mark_in_app_notification_read(uuid, uuid),
  public.set_in_app_notification_preference(uuid, boolean)
  to authenticated;

create trigger notification_preferences_audit after insert or update
  on public.notification_preferences for each row execute function private.audit_change();
create trigger in_app_notifications_audit after insert or update
  on public.in_app_notifications for each row execute function private.audit_change();

-- A direct message queues one generic notification for its counterparty. The
-- body is kept only in care_messages; it never crosses into the notice table.
create or replace function private.send_direct_message(
  target_tenant uuid,
  target_patient uuid,
  target_doctor uuid,
  message_text text
) returns table (
  conversation_id uuid,
  message_id uuid,
  sent_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
declare
  conversation uuid;
  message uuid;
  recipient uuid;
  target_path text;
  event_time timestamptz := clock_timestamp();
  normalized_content text := btrim(regexp_replace(message_text, '[[:space:]]+', ' ', 'g'));
begin
  if not private.has_direct_message_access(
    target_tenant,
    target_patient,
    target_doctor
  ) then
    raise exception 'Direct message access required' using errcode = '42501';
  end if;

  if normalized_content is null
    or char_length(normalized_content) not between 1 and 4000
    or normalized_content ~ '[[:cntrl:]]' then
    raise exception 'Valid direct message text required' using errcode = '23514';
  end if;

  insert into public.care_conversations(
    tenant_id,
    patient_id,
    doctor_id,
    last_message_at
  ) values (
    target_tenant,
    target_patient,
    target_doctor,
    event_time
  ) on conflict (tenant_id, patient_id, doctor_id)
    do update set last_message_at = excluded.last_message_at
  returning id into conversation;

  insert into public.care_messages(
    tenant_id,
    conversation_id,
    patient_id,
    doctor_id,
    sender_id,
    content,
    sent_at
  ) values (
    target_tenant,
    conversation,
    target_patient,
    target_doctor,
    auth.uid(),
    normalized_content,
    event_time
  ) returning id into message;

  if auth.uid() = target_doctor then
    select account.user_id into recipient
      from public.patient_accounts account
      where account.tenant_id = target_tenant
        and account.patient_id = target_patient;
    target_path := '/clinicas/' || target_tenant::text
      || '/meu-cuidado/conversas?medico=' || target_doctor::text;
  else
    recipient := target_doctor;
    target_path := '/clinicas/' || target_tenant::text
      || '/mensagens?paciente=' || target_patient::text;
  end if;

  perform private.queue_in_app_notification(
    target_tenant,
    recipient,
    'message',
    'message:' || message::text,
    target_path
  );

  return query select conversation, message, event_time;
end;
$$;
revoke all on function private.send_direct_message(uuid, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function private.send_direct_message(uuid, uuid, uuid, text)
  to authenticated;

-- Publishing an approved snapshot also produces only a generic notice. The
-- publication itself remains the sole source for patient-visible guidance.
create or replace function private.publish_care_plan(
  t uuid,
  plan uuid,
  read_version integer,
  previous_publication uuid,
  confirmed boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  p public.care_plans;
  v public.care_plan_versions;
  current_id uuid;
  result uuid;
  patient_user uuid;
begin
  if not private.has_tenant_role(t,array['doctor']) or confirmed is distinct from true then
    raise exception 'Doctor confirmation required' using errcode='42501';
  end if;
  select * into p from public.care_plans where tenant_id=t and id=plan for update;
  if not found or p.doctor_id is distinct from auth.uid() or not private.has_care_access(t,p.patient_id) then
    raise exception 'Active author care access required' using errcode='42501';
  end if;
  select id into current_id from public.care_plan_publications where tenant_id=t and plan_id=plan and status='published';
  if p.version is distinct from read_version or p.status<>'approved' or current_id is distinct from previous_publication then
    raise exception 'Publication context changed; reload before confirming' using errcode='23514';
  end if;
  select * into v from public.care_plan_versions where tenant_id=t and plan_id=plan and version=read_version and status='approved';
  if not found or v.approved_at is null then raise exception 'Approved snapshot required' using errcode='23514'; end if;
  if exists(select 1 from public.care_plan_publications where id=current_id and source_version=v.version) then
    raise exception 'This version is already published' using errcode='23514'; end if;
  update public.care_plan_publications set status='superseded',closed_at=clock_timestamp(),closed_by=auth.uid() where id=current_id;
  insert into public.care_plan_publications(tenant_id,plan_id,patient_id,source_version,revision,title,goals,actions,frequency,period,review_on,doctor_display_name,approved_at,published_by)
    values(t,plan,p.patient_id,v.version,v.revision,v.title,v.goals,v.actions,v.frequency,v.period,v.review_on,p.doctor_display_name,v.approved_at,auth.uid()) returning id into result;

  select account.user_id into patient_user
    from public.patient_accounts account
    where account.tenant_id = t
      and account.patient_id = p.patient_id;
  perform private.queue_in_app_notification(
    t,
    patient_user,
    'plan_published',
    'plan-publication:' || result::text,
    '/clinicas/' || t::text || '/meu-cuidado/plano'
  );
  return result;
end;
$$;
revoke all on function private.publish_care_plan(uuid, uuid, integer, uuid, boolean)
  from public, anon, authenticated;
grant execute on function private.publish_care_plan(uuid, uuid, integer, uuid, boolean)
  to authenticated;
