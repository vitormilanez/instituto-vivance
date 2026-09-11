create index care_check_ins_requester
  on public.care_check_ins (tenant_id, requested_by);

create index care_check_in_submissions_check_in
  on public.care_check_in_submissions (tenant_id, check_in_id, patient_id);

create index care_check_in_submissions_actor
  on public.care_check_in_submissions (tenant_id, actor_user_id);

create index care_check_in_reviews_check_in
  on public.care_check_in_reviews (tenant_id, check_in_id, patient_id);

create index care_check_in_reviews_reviewer
  on public.care_check_in_reviews (tenant_id, reviewer_id);
