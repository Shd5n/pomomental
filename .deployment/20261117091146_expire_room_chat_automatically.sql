begin;
create extension if not exists pg_cron;
select cron.schedule('pomomental-expire-room-chat','* * * * *','select pm_private.expire_room_chat();');
select cron.schedule('pomomental-clean-chat-job-history','17 3 * * *',
  $$delete from cron.job_run_details where jobid in (select jobid from cron.job where jobname in ('pomomental-expire-room-chat','pomomental-clean-chat-job-history')) and end_time < now()-interval '7 days';$$);
select pm_private.expire_room_chat();
commit;
