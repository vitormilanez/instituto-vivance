-- Covers the direct-history query and every message foreign key (remote ledger aligned). The initial
-- history index is replaced because its conversation-first order cannot cover
-- a patient-doctor history lookup or the composite conversation foreign key.
drop index public.care_messages_direct_history;
create index care_messages_pair_history
  on public.care_messages(
    tenant_id,
    patient_id,
    doctor_id,
    sent_at desc,
    id desc
  );
create index care_messages_conversation_pair_fk
  on public.care_messages(
    tenant_id,
    conversation_id,
    patient_id,
    doctor_id
  );
create index care_messages_doctor_fk
  on public.care_messages(tenant_id, doctor_id);
create index care_messages_sender_fk
  on public.care_messages(tenant_id, sender_id);
