-- Covers the membership foreign key used by processing job authorship.
create index processing_jobs_created_by_fk
  on public.processing_jobs(tenant_id, created_by);
