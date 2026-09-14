-- Cover every V2 foreign key in its declared column order. Some shorter
-- unique indexes already make the lookups selective, but these indexes also
-- support PostgreSQL's parent update/delete checks without residual filters.
create index return_preparation_requests_questionnaire_fk
  on public.return_preparation_requests(questionnaire_version);

create index return_preparation_drafts_request_patient_fk
  on public.return_preparation_drafts(tenant_id,request_id,patient_id);

create index return_preparation_submissions_request_patient_doctor_fk
  on public.return_preparation_submissions(tenant_id,request_id,patient_id,doctor_id);

create index return_preparation_reviews_request_patient_doctor_fk
  on public.return_preparation_reviews(tenant_id,request_id,patient_id,doctor_id);
