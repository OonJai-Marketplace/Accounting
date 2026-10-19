BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.profiles WHERE role='admin' AND status='active' LIMIT 1),true);
SELECT set_config('request.jwt.claims',json_build_object('sub',current_setting('request.jwt.claim.sub'),'role','authenticated')::text,true);
DO $$
DECLARE older uuid:=gen_random_uuid(); latest uuid:=gen_random_uuid(); a uuid; d date; lines jsonb; n text; oldn text; posted record; before_seq bigint;
BEGIN
 SELECT last_value INTO before_seq FROM public.journal_entry_number_seq;
 SELECT period_month+8 INTO d FROM public.accounting_periods WHERE status='open' ORDER BY period_month DESC LIMIT 1;
 SELECT id INTO a FROM public.accounts WHERE is_active AND is_posting AND currency_code='LAK' LIMIT 1;
 n:=private.format_entry_id143114('TESTID',d,888002,6);oldn:=private.format_entry_id143114('TESTID',d,888001,6);
 lines:=jsonb_build_array(jsonb_build_object('account_id',a,'description','Rollback test','currency_code','LAK','debit',100,'credit',0),jsonb_build_object('account_id',a,'description','Rollback test','currency_code','LAK','debit',0,'credit',100));
 INSERT INTO public.journal_entries(id,entry_no,transaction_date,memo,status,source,posted_by,posted_at,created_at) VALUES
 (older,oldn,d,'Rollback older','posted','manual',auth.uid(),now(),now()+interval '1 minute'),(latest,n,d,'Rollback latest','posted','manual',auth.uid(),now(),now()+interval '2 minutes');
 INSERT INTO public.journal_lines(journal_entry_id,line_no,account_id,line_date,description,currency_code,debit,credit)
 SELECT eid,ord,a,d,'Rollback test','LAK',(l->>'debit')::numeric,(l->>'credit')::numeric FROM (VALUES(older),(latest)) e(eid) CROSS JOIN jsonb_array_elements(lines) WITH ORDINALITY x(l,ord);
 PERFORM public.void_journal_entry(older,'Rollback older test');
 DELETE FROM public.audit_log WHERE table_name='journal_entries' AND record_id=older::text;
 IF EXISTS(SELECT 1 FROM private.reusable_journal_ids143120 WHERE entry_no=oldn) THEN RAISE EXCEPTION 'Older ID incorrectly released';END IF;
 PERFORM public.void_journal_entry(latest,'Rollback latest test');
 INSERT INTO public.audit_log(table_name,record_id,action,reason,actor_id) VALUES('journal_entries',latest::text,'POST','Retain until final deletion test',auth.uid());
 DELETE FROM public.audit_log WHERE table_name='journal_entries' AND record_id=latest::text AND action='VOID';
 IF EXISTS(SELECT 1 FROM private.reusable_journal_ids143120 WHERE entry_no=n) THEN RAISE EXCEPTION 'ID released while audit remains';END IF;
 DELETE FROM public.audit_log WHERE table_name='journal_entries' AND record_id=latest::text;
 IF EXISTS(SELECT 1 FROM public.journal_entries WHERE id=latest) OR NOT EXISTS(SELECT 1 FROM private.reusable_journal_ids143120 WHERE entry_no=n) THEN RAISE EXCEPTION 'Final audit deletion did not release latest';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.record_deletions108 WHERE record_id=latest) THEN RAISE EXCEPTION 'Deletion archive lost';END IF;
 IF public.preview_journal_number143114(d,'TESTID',6)<>888002 THEN RAISE EXCEPTION 'Preview mismatch';END IF;
 SELECT * INTO posted FROM public.post_manual_worker14228(d,'Rollback replacement',lines,'TESTID',6);
 IF posted.entry_no<>n OR posted.entry_id=latest THEN RAISE EXCEPTION 'Reuse must keep display ID and issue a fresh internal UUID';END IF;
 IF EXISTS(SELECT 1 FROM private.reusable_journal_ids143120 WHERE entry_no=n) THEN RAISE EXCEPTION 'Claimed ID still available';END IF;
 IF public.preview_journal_number143114(d,'TESTID',6)=888002 THEN RAISE EXCEPTION 'Used ID offered again';END IF;
 IF (SELECT last_value FROM public.journal_entry_number_seq)<>before_seq THEN RAISE EXCEPTION 'Reuse consumed sequence';END IF;
 SET CONSTRAINTS ALL IMMEDIATE;
END $$;
SELECT 'PASS: older ID protected, audit-retained ID protected, final deletion releases latest, archive kept, preview matches, replacement UUID distinct, no sequence reset' result;
ROLLBACK;
