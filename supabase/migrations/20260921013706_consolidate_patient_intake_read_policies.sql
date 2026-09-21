-- Keep one permissive SELECT policy per table. The authorization semantics are
-- unchanged: an active care professional or the linked patient may read.
drop policy patient_intake_read_care on public.patient_intake_contexts;
drop policy patient_intake_read_own on public.patient_intake_contexts;
create policy patient_intake_read_authorized on public.patient_intake_contexts
  for select to authenticated using (
    private.has_care_access(tenant_id, patient_id)
    or (
      private.has_tenant_role(tenant_id, array['patient'])
      and exists (
        select 1 from public.patient_accounts account
        where account.tenant_id = patient_intake_contexts.tenant_id
          and account.patient_id = patient_intake_contexts.patient_id
          and account.user_id = (select auth.uid())
      )
    )
  );

drop policy patient_intake_versions_read_care
  on public.patient_intake_context_versions;
drop policy patient_intake_versions_read_own
  on public.patient_intake_context_versions;
create policy patient_intake_versions_read_authorized
  on public.patient_intake_context_versions for select to authenticated using (
    private.has_care_access(tenant_id, patient_id)
    or (
      private.has_tenant_role(tenant_id, array['patient'])
      and exists (
        select 1 from public.patient_accounts account
        where account.tenant_id = patient_intake_context_versions.tenant_id
          and account.patient_id = patient_intake_context_versions.patient_id
          and account.user_id = (select auth.uid())
      )
    )
  );
