-- Run only against the linked instituto-vivance-dev project
-- (oxuwrdjojsmgxoljqkuk) after checking its migration history. These
-- extensions enable the synthetic worker schedule; they do not schedule it.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
