BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.profiles WHERE role='admin' AND status='active' LIMIT 1),true);
SELECT set_config('request.jwt.claims',json_build_object('sub',current_setting('request.jwt.claim.sub'),'role','authenticated')::text,true);
DO $$
DECLARE eid uuid:=gen_random_uuid(); a uuid; lines jsonb; original jsonb; revised jsonb; test_date date; before_seq bigint; result jsonb;
BEGIN
 SELECT last_value INTO before_seq FROM public.journal_entry_number_seq;
 SELECT period_month+8 INTO test_date FROM public.accounting_periods WHERE status='open' ORDER BY period_month DESC LIMIT 1;
 SELECT id INTO a FROM public.accounts WHERE is_active AND is_posting AND currency_code='LAK' LIMIT 1;
 lines:=jsonb_build_array(jsonb_build_object('account_id',a,'description','Rollback verification','currency_code','LAK','debit',100,'credit',0,'line_date',test_date),jsonb_build_object('account_id',a,'description','Rollback verification','currency_code','LAK','debit',0,'credit',100,'line_date',test_date+7));
 PERFORM public.validate_journal14228(test_date,'Rollback grouped journal',lines);
 INSERT INTO public.journal_entries(id,entry_no,transaction_date,memo,status,source,posted_by,posted_at) VALUES(eid,'TEST-'||eid,test_date,'Rollback grouped journal','posted','manual',auth.uid(),now());
 INSERT INTO public.journal_lines(journal_entry_id,line_no,account_id,line_date,description,currency_code,debit,credit) SELECT eid,n,a,(l->>'line_date')::date,l->>'description','LAK',(l->>'debit')::numeric,(l->>'credit')::numeric FROM jsonb_array_elements(lines) WITH ORDINALITY x(l,n);
 SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED;
 original:=public.journal_shape14385(test_date,'Rollback grouped journal',lines);
 IF original->'lines'->1->>'line_date' IS DISTINCT FROM (test_date+7)::text THEN RAISE EXCEPTION 'Shape lost line date';END IF;
 revised:=jsonb_set(original,'{memo}','"Rollback revised group"');
 result:=public.change_journal14385('group-date-'||eid,eid,'revise','Rollback test',original,revised);
 IF (SELECT count(DISTINCT line_date) FROM public.journal_lines WHERE journal_entry_id=eid)<>2 THEN RAISE EXCEPTION 'Revision lost original dates';END IF;
 BEGIN
 PERFORM public.change_journal14385('stale-date-'||eid,eid,'revise','Rollback test',jsonb_set(revised,'{lines,1,line_date}',to_jsonb(test_date+6)),revised);
 RAISE EXCEPTION 'Stale dates accepted';
 EXCEPTION WHEN serialization_failure THEN NULL;END;
 BEGIN
 PERFORM public.validate_journal14228(test_date,'Invalid cross month',jsonb_set(lines,'{1,line_date}',to_jsonb((date_trunc('month',test_date)+interval '1 month')::date)));
 RAISE EXCEPTION 'Cross-month entry accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'All journal dates must be in the same accounting month' THEN RAISE;END IF;END;
 IF (SELECT last_value FROM public.journal_entry_number_seq)<>before_seq THEN RAISE EXCEPTION 'Test consumed an entry ID';END IF;
 SET CONSTRAINTS ALL IMMEDIATE;
END $$;
SELECT 'PASS: one header, distinct dates, revision, stale-date conflict, cross-month rejection, unchanged sequence' result;
ROLLBACK;
