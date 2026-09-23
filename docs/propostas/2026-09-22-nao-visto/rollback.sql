-- Desfaz 20260923120000_patient_item_reads.sql. Apaga apenas os cursores de
-- leitura; nenhum dado clínico ou do paciente é afetado.
drop function if exists public.mark_patient_item_read(uuid, text, uuid);
drop table if exists public.patient_item_reads;
