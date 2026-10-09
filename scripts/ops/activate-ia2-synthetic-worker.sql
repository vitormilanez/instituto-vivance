-- Run only after confirming the target is instituto-vivance-dev
-- (oxuwrdjojsmgxoljqkuk), deploying exam-text-worker, enabling pg_cron and
-- pg_net, and storing matching secrets in Supabase Vault and Edge Functions.
-- This file contains no credentials. Re-running it replaces the named job.

begin;

do $activate$
declare
  worker_url text;
  worker_secret text;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron')
    or not exists (select 1 from pg_extension where extname = 'pg_net') then
    raise exception 'Enable pg_cron and pg_net in the confirmed synthetic project first';
  end if;

  select decrypted_secret into worker_url
    from vault.decrypted_secrets
    where name = 'vivance_ia2_worker_url';
  select decrypted_secret into worker_secret
    from vault.decrypted_secrets
    where name = 'vivance_ia2_worker_cron_secret';

  if worker_url is distinct from 'https://oxuwrdjojsmgxoljqkuk.supabase.co'
    or worker_secret is null or length(worker_secret) < 32 then
    raise exception 'Expected dev URL and a configured worker secret in Vault';
  end if;

  perform cron.schedule(
    'vivance-ia2-exam-text-worker-synthetic',
    '* * * * *',
    $job$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets
                  where name = 'vivance_ia2_worker_url')
               || '/functions/v1/exam-text-worker',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' ||
            (select decrypted_secret from vault.decrypted_secrets
              where name = 'vivance_ia2_worker_cron_secret')
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 10000
      );
    $job$
  );
end;
$activate$;

commit;
