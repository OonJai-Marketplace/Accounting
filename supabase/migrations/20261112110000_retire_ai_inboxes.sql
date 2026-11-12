-- Retire workbook-driven posting and HR approval. Existing ledger and workforce records stay intact.
select cron.unschedule(jobid) from cron.job where jobname = 'google-inbox143150';
drop function if exists public.approve_drive_journal_batch143160(text,jsonb);
drop function if exists public.approve_drive_journal143128(text,text,jsonb);
drop function if exists public.drive_journal_receipt143128(text,text);
drop function if exists public.set_drive_draft_disposition143160(text,text,text);
drop function if exists public.drive_draft_dispositions143160(text);
drop function if exists public.hr_inbox_apply143168(text,jsonb,jsonb,jsonb);
drop function if exists public.hr_inbox_save143168(text,jsonb,text);
drop function if exists public.hr_inbox_baseline143168();
drop function if exists public.google_poll_key143150();
