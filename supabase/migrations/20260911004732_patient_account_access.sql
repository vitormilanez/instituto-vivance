-- Patient login is an explicit, administrator-provisioned link to one record.
-- Filename aligned to the remote migration ledger after application.
-- Composite foreign keys prevent linking identities or records across tenants.
create table public.patient_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid not null,
  patient_id uuid not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id),
  unique (tenant_id, patient_id),
  foreign key (tenant_id, user_id) references public.memberships(tenant_id, user_id) on delete cascade,
  foreign key (tenant_id, patient_id) references public.patients(tenant_id, id)
);
alter table public.patient_accounts enable row level security;
revoke all on public.patient_accounts from public, anon, authenticated;
grant select on public.patient_accounts to authenticated;

create policy patient_accounts_read_self on public.patient_accounts
  for select to authenticated
  using (user_id = (select auth.uid())
    and private.has_tenant_role(tenant_id, array['patient']));

create policy patients_read_own_profile on public.patients
  for select to authenticated
  using (exists (
    select 1 from public.patient_accounts account
    where account.patient_id = patients.id
      and account.tenant_id = patients.tenant_id
      and account.user_id = (select auth.uid())
  ));

create trigger patient_accounts_audit after insert or update on public.patient_accounts
  for each row execute function private.audit_change();
