-- Run as the database owner. All test records and sequence restarts roll back.
BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT updated_by::text FROM accounting_id_settings WHERE id=true),true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',(SELECT updated_by FROM accounting_id_settings WHERE id=true),'role','authenticated')::text,true);
-- Transactional RESTART isolates sequence consumption and restores it at ROLLBACK.
ALTER SEQUENCE public.journal_entry_number_seq RESTART WITH 1;
ALTER SEQUENCE public.scheduled_journal_number_seq RESTART WITH 3;
ALTER SEQUENCE public.fund_adjustment_request_seq RESTART WITH 1;
DO $$
DECLARE j record; lines jsonb; user_row record; before_no text; after_no text; settings_before jsonb; result boolean;
BEGIN
 IF public.preview_journal_number143114('2026-01-01','OJM',4)<>1 THEN RAISE EXCEPTION 'Preview did not start at one';END IF;
 IF private.format_entry_id143114('OJM','2027-01-01',10000,4)<>'OJM2710000' THEN RAISE EXCEPTION 'Year/overflow truncation';END IF;
 IF public.next_schedule_no91()<>'SCH260003' THEN RAISE EXCEPTION 'Schedule format';END IF;
 IF public.next_adjustment_no89()<>'ADJ260001' THEN RAISE EXCEPTION 'Adjustment format';END IF;
 SELECT jsonb_build_array(
  jsonb_build_object('account_id',(SELECT id FROM accounts WHERE code='1040'),'description','ID verification','currency_code','LAK','debit',1,'credit',0),
  jsonb_build_object('account_id',(SELECT id FROM accounts WHERE code='3010'),'description','ID verification','currency_code','LAK','debit',0,'credit',1)) INTO lines;
 SELECT * INTO j FROM public.post_manual_worker14228('2026-01-01','Rollback-only ID verification',lines,'OJM',4);
 IF j.entry_no<>'OJM260001' OR NOT EXISTS(SELECT 1 FROM journal_entries WHERE id=j.entry_id AND entry_no=j.entry_no) THEN RAISE EXCEPTION 'Posted ID mismatch';END IF;
 SELECT * INTO j FROM public.post_manual_worker14228('2026-01-01','Rollback-only second ID',lines,'OJM',4);
 IF j.entry_no<>'OJM260002' THEN RAISE EXCEPTION 'Posting counter did not advance';END IF;
 IF public.preview_journal_number143114('2026-01-01','OJM',4)<>3 THEN RAISE EXCEPTION 'Preview did not advance';END IF;
 FOR user_row IN SELECT * FROM user_permissions LOOP
  before_no:=public.preview_staff_entry143114(user_row.user_id,'2026-01-01');
  after_no:=public.preview_staff_entry143114(user_row.user_id,'2026-01-01');
  IF before_no<>user_row.entry_prefix||user_row.entry_initials||'260001' OR after_no<>before_no THEN RAISE EXCEPTION 'Sub-user preview changed sequence or lost prefix';END IF;
 END LOOP;
END $$;
SET LOCAL ROLE authenticated;
SELECT public.save_accounting_prefixes143114((SELECT to_jsonb(s) FROM accounting_id_settings s),
 (SELECT jsonb_agg(jsonb_build_object('user_id',user_id,'entry_prefix',entry_prefix,'entry_initials',entry_initials)) FROM user_permissions)) AS atomic_save_passed;
ROLLBACK;
