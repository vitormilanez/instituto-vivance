-- The received-items inbox must distinguish the patient's own uploads from
-- staff-assisted records. The existing self-only policy returns no account
-- mapping to a doctor, silently hiding patient documents and messages there.
-- Only the professional with an active care relationship may read this mapping.
create policy patient_accounts_read_active_professional
on public.patient_accounts
for select to authenticated
using (
  private.has_care_access(tenant_id, patient_id)
);
