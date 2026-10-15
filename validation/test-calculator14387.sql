-- All fixtures roll back. No sequence allocation or historic entry changes.
BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.profiles WHERE role='admin' AND status='active' LIMIT 1),true);
SELECT set_config('request.jwt.claims',json_build_object('sub',current_setting('request.jwt.claim.sub'),'role','authenticated')::text,true);
CREATE TEMP TABLE phase3_results(check_name text,passed boolean);
DO $$
#variable_conflict use_variable
DECLARE id uuid:=gen_random_uuid(); a uuid; b uuid; lines jsonb; original jsonb; revised jsonb; r jsonb; again jsonb; w jsonb; legacy jsonb;
 meta jsonb:='{"type":"Transfer","role":"received","mode":"manual","rateMode":"manual"}'; request text:='phase3-'||gen_random_uuid(); seq bigint; test_date date;
BEGIN
 SELECT last_value INTO seq FROM public.journal_entry_number_seq;
 SELECT period_month+14 INTO test_date FROM public.accounting_periods WHERE status='open' ORDER BY period_month DESC LIMIT 1;
 IF test_date IS NULL THEN RAISE EXCEPTION 'No open test period'; END IF;
 SELECT x[1],x[2] INTO a,b FROM (SELECT array_agg(ac.id ORDER BY ac.code) x FROM public.accounts ac WHERE is_active AND is_posting AND currency_code='THB') q;
 lines:=jsonb_build_array(jsonb_build_object('account_id',a,'description','Phase 3 fixture','currency_code','THB','debit',10,'credit',0,'fx_rate_lak',650,'book_rate_lak',640,'calculation14387',meta),jsonb_build_object('account_id',b,'description','Phase 3 fixture','currency_code','THB','debit',0,'credit',10,'fx_rate_lak',650,'book_rate_lak',640,'calculation14387',jsonb_set(meta,'{role}','"paid"')));
 INSERT INTO public.journal_entries(id,entry_no,transaction_date,memo,status,source,posted_by,posted_at) VALUES(id,'TEST-'||id,test_date,'Phase 3 fixture','posted','manual',auth.uid(),now());
 INSERT INTO public.journal_lines(journal_entry_id,line_no,account_id,line_date,description,currency_code,debit,credit,fx_rate_lak,book_rate_lak,calculation14387)
 SELECT id,x.n,(l->>'account_id')::uuid,test_date,l->>'description','THB',(l->>'debit')::numeric,(l->>'credit')::numeric,650,640,l->'calculation14387' FROM jsonb_array_elements(lines) WITH ORDINALITY AS x(l,n);
 original:=public.journal_shape14385(test_date,'Phase 3 fixture',lines);
 IF original->'lines'->0->'calculation14387' IS DISTINCT FROM meta THEN RAISE EXCEPTION 'Shape lost metadata'; END IF;
 revised:=jsonb_set(original,'{lines,0,calculation14387,mode}','"auto"');
 r:=public.change_journal14385(request,id,'revise','Verify calculator metadata',original,revised);
 again:=public.change_journal14385(request,id,'revise','Verify calculator metadata',original,revised);
 IF r IS DISTINCT FROM again OR (SELECT count(*) FROM public.audit_log WHERE record_id=id::text AND action='UPDATE')<>1 THEN RAISE EXCEPTION 'Retry duplicated change'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.journal_lines WHERE journal_entry_id=id AND line_no=1 AND calculation14387->>'mode'='auto' AND fx_rate_lak=650 AND book_rate_lak=640 AND base_debit=6400) THEN RAISE EXCEPTION 'Saved metadata or amounts changed'; END IF;
 w:=public.journal_window14333(test_date,test_date,0);
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(w->'rows') q WHERE q->>'dbEntryId'=id::text AND q->'calculation14387'->>'mode'='auto') THEN RAISE EXCEPTION 'Window omitted metadata'; END IF;
 INSERT INTO phase3_results VALUES('metadata survives protected edit, retry, audit and journal window with rates/amounts intact',true);
 BEGIN
 UPDATE public.journal_lines SET calculation14387='{"type":null,"role":"paid","mode":"auto","rateMode":"auto"}' WHERE journal_entry_id=id;
 RAISE EXCEPTION 'Invalid metadata accepted';
 EXCEPTION WHEN check_violation THEN INSERT INTO phase3_results VALUES('invalid/null metadata fields rejected',true); END;
 legacy:=public.journal_shape14385(test_date,'Legacy',jsonb_build_array((lines->0)-'calculation14387'));
 IF legacy->'lines'->0 ? 'calculation14387' THEN RAISE EXCEPTION 'Legacy shape changed'; END IF;
 IF position('calculation14387' IN pg_get_functiondef('public.post_manual_worker14228(date,text,jsonb,text,integer)'::regprocedure))=0 THEN RAISE EXCEPTION 'Posting worker missing metadata'; END IF;
 IF (SELECT last_value FROM public.journal_entry_number_seq)<>seq THEN RAISE EXCEPTION 'Test consumed journal number'; END IF;
 INSERT INTO phase3_results VALUES('legacy entries compatible; posting worker includes metadata; sequence unchanged',true);
 SET CONSTRAINTS ALL IMMEDIATE;
END $$;
SELECT * FROM phase3_results;
ROLLBACK;
