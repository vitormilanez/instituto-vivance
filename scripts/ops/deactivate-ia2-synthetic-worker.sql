-- Stop autonomous IA2 processing in the confirmed synthetic project.
select cron.unschedule(jobid)
from cron.job
where jobname = 'vivance-ia2-exam-text-worker-synthetic';
