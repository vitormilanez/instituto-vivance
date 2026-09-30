-- A human-curated label is separate from the original upload filename.
-- No client receives UPDATE on patient_documents; existing row policies
-- continue to determine who can read this title.
alter table public.patient_documents
  add column display_title text
  constraint patient_documents_display_title_length
  check (display_title is null or length(btrim(display_title)) between 1 and 160);

comment on column public.patient_documents.display_title is
  'Optional human-verified document title; original_filename remains unchanged.';
