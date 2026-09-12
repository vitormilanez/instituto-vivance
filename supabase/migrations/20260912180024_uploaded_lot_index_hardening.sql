-- Index the foreign-key paths introduced by the uploaded manual-care lot.
create index care_conversations_last_sender_fk
  on public.care_conversations(tenant_id, last_sender_id);
create index care_conversation_reads_conversation_fk
  on public.care_conversation_reads(tenant_id, conversation_id, patient_id, doctor_id);
create index care_conversation_reads_message_fk
  on public.care_conversation_reads(
    tenant_id, last_read_message_id, conversation_id, patient_id, doctor_id
  );

create index patient_invitations_doctor_fk
  on public.patient_invitations(tenant_id, doctor_id);
create index patient_invitations_patient_fk
  on public.patient_invitations(tenant_id, patient_id);
create index patient_onboarding_photo_fk
  on public.patient_onboarding(tenant_id, photo_document_id);
create index patient_onboarding_submissions_photo_fk
  on public.patient_onboarding_submissions(tenant_id, photo_document_id);
create index patient_onboarding_submissions_user_fk
  on public.patient_onboarding_submissions(tenant_id, user_id);

create index patient_document_reviews_document_fk
  on public.patient_document_reviews(tenant_id, document_id, patient_id);
create index patient_document_reviews_reviewer_fk
  on public.patient_document_reviews(tenant_id, reviewer_id);

create index care_report_sources_patient_fk
  on public.care_report_sources(tenant_id, patient_id);
create index care_report_sources_included_by_fk
  on public.care_report_sources(tenant_id, included_by);
create index care_report_versions_actor_fk
  on public.care_report_versions(tenant_id, actor_user_id);
create index care_report_publications_published_by_fk
  on public.care_report_publications(tenant_id, published_by);
create index care_report_exports_patient_fk
  on public.care_report_export_events(tenant_id, patient_id);
create index care_report_exports_publication_patient_fk
  on public.care_report_export_events(tenant_id, publication_id, patient_id);

-- Keep the existing patient document rule while allowing one-time identity lookup.
drop policy patient_documents_patient_read_shared on public.patient_documents;
create policy patient_documents_patient_read_shared on public.patient_documents
  for select to authenticated
  using (
    status = 'available'
    and visibility = 'shared'
    and private.has_tenant_role(tenant_id, array['patient'])
    and exists (
      select 1 from public.patient_accounts account
      where account.tenant_id = patient_documents.tenant_id
        and account.patient_id = patient_documents.patient_id
        and account.user_id = (select auth.uid())
    )
  );
