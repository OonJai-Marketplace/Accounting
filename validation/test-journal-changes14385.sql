-- Run as a transaction and roll back every fixture. No journal-number allocation.
BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.profiles WHERE role='admin' AND status='active' LIMIT 1),true);
SELECT set_config('request.jwt.claims',json_build_object('sub',current_setting('request.jwt.claim.sub'),'role','authenticated')::text,true);
CREATE TEMP TABLE phase1_results(check_name text,passed boolean);
DO $$
#variable_conflict use_variable
DECLARE id uuid:=gen_random_uuid(); a uuid; b uuid; lines jsonb; original jsonb; revised jsonb; r jsonb; again jsonb;
 request text:='phase1-edit-'||gen_random_uuid(); void_request text:='phase1-void-'||gen_random_uuid(); n bigint; seq bigint; test_date date; original_actor text; staff_actor text; batch jsonb; closed_date date;
BEGIN
 SELECT last_value INTO seq FROM public.journal_entry_number_seq;
 SELECT period_month+14 INTO test_date FROM public.accounting_periods WHERE status='open' ORDER BY period_month DESC LIMIT 1;
 IF test_date IS NULL THEN RAISE EXCEPTION 'No open period for rollback-only verification';END IF;
 SELECT x[1],x[2] INTO a,b FROM (SELECT array_agg(ac.id ORDER BY ac.code) x FROM public.accounts ac WHERE is_active AND is_posting AND currency_code='THB') q;
 IF b IS NULL THEN RAISE EXCEPTION 'Two THB posting accounts required';END IF;
 lines:=jsonb_build_array(jsonb_build_object('account_id',a,'description','Phase 1 rollback test','currency_code','THB','debit',10,'credit',0,'fx_rate_lak',650,'book_rate_lak',640),jsonb_build_object('account_id',b,'description','Phase 1 rollback test','currency_code','THB','debit',0,'credit',10,'fx_rate_lak',650,'book_rate_lak',NULL));
 INSERT INTO public.journal_entries(id,entry_no,transaction_date,memo,status,source,posted_by,posted_at) VALUES(id,'TEST-'||id,test_date,'Phase 1 rollback test','posted','manual',auth.uid(),now());
 INSERT INTO public.journal_lines(journal_entry_id,line_no,account_id,line_date,description,currency_code,debit,credit,fx_rate_lak,book_rate_lak)
 SELECT id,x.n,(l->>'account_id')::uuid,test_date,l->>'description','THB',(l->>'debit')::numeric,(l->>'credit')::numeric,650,(l->>'book_rate_lak')::numeric FROM jsonb_array_elements(lines) WITH ORDINALITY AS x(l,n);
 SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED;
 original:=public.journal_shape14385(test_date,'Phase 1 rollback test',lines);
 revised:=jsonb_set(jsonb_set(jsonb_set(original,'{memo}','"Phase 1 revised test"'),'{lines,0,fx_rate_lak}','675'),'{lines,1,fx_rate_lak}','675');
 revised:=jsonb_set(revised,'{lines,0,book_rate_lak}','660');
 r:=public.change_journal14385(request,id,'revise','Testing lost response',original,revised);
 again:=public.change_journal14385(request,id,'revise','Testing lost response',original,revised);
 IF r IS DISTINCT FROM again THEN RAISE EXCEPTION 'Retry receipt mismatch';END IF;
 SELECT count(*) INTO n FROM public.audit_log WHERE record_id=id::text AND action='UPDATE';
 IF n<>1 THEN RAISE EXCEPTION 'Repeated edit audit: %',n;END IF;
 IF EXISTS(SELECT 1 FROM public.journal_lines WHERE journal_entry_id=id AND (fx_rate_lak<>675 OR base_debit IS DISTINCT FROM debit*coalesce(book_rate_lak,675) OR base_credit IS DISTINCT FROM credit*coalesce(book_rate_lak,675))) THEN RAISE EXCEPTION 'Exchange rate or base value lost';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.audit_log WHERE record_id=id::text AND action='UPDATE' AND (old_data->'lines'->0->>'fx_rate_lak')::numeric=650 AND (new_data->'lines'->0->>'fx_rate_lak')::numeric=675 AND (new_data->'lines'->0->>'book_rate_lak')::numeric=660) THEN RAISE EXCEPTION 'Audit rates missing';END IF;
 INSERT INTO phase1_results VALUES('edit retry applies once and preserves transaction/carrying rates, base amounts and audit history',true);
 SELECT period_month+14 INTO closed_date FROM public.accounting_periods WHERE status IN ('closed','locked') LIMIT 1;
 IF closed_date IS NOT NULL THEN
 BEGIN
 PERFORM public.change_journal14385('closed-'||gen_random_uuid(),id,'revise','Closed period check',revised,jsonb_set(revised,'{date}',to_jsonb(closed_date)));
 RAISE EXCEPTION 'Closed period accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'Period % must be open before synchronization' THEN RAISE;END IF;INSERT INTO phase1_results VALUES('closed destination period denied',true);END;
 END IF;
 IF public.journal_change_receipt14385(request)->'result' IS DISTINCT FROM r THEN RAISE EXCEPTION 'Read receipt mismatch';END IF;
 original_actor:=auth.uid()::text;
 SELECT p.id::text INTO staff_actor FROM public.profiles p WHERE p.role<>'admin' AND p.status='active' LIMIT 1;
 IF staff_actor IS NOT NULL THEN
  PERFORM set_config('request.jwt.claim.sub',staff_actor,true);
  BEGIN
   PERFORM public.change_journal14385('unauthorized-'||gen_random_uuid(),id,'void','Must deny',revised,NULL);
   RAISE EXCEPTION 'Unauthorized void accepted';
  EXCEPTION WHEN insufficient_privilege THEN INSERT INTO phase1_results VALUES('non-admin void denied',true);END;
  PERFORM set_config('request.jwt.claim.sub',original_actor,true);
 END IF;
 batch:=jsonb_build_array(jsonb_build_object('p_transaction_date',test_date,'p_memo','Phase 1 rollback test','p_lines',lines,'p_prefix','TEST','p_digits',4));
 INSERT INTO public.operation_receipts14228(actor_id,request_key,operation,payload,result) VALUES(auth.uid(),'post-retry-'||id,'journal',batch,jsonb_build_array(jsonb_build_object('entry_id',id,'entry_no','TEST-'||id)));
 IF public.post_journal_batch14228('post-retry-'||id,batch)->0->>'entry_id'<>id::text THEN RAISE EXCEPTION 'Posting receipt replay mismatch';END IF;
 INSERT INTO phase1_results VALUES('original posting retry reuses receipt without allocating a number',true);
 BEGIN
  PERFORM public.change_journal14385('stale-'||gen_random_uuid(),id,'revise','Stale device',original,revised);
  RAISE EXCEPTION 'Stale edit was accepted';
 EXCEPTION WHEN serialization_failure THEN INSERT INTO phase1_results VALUES('concurrent stale edit rejected',true);END;
 BEGIN
  PERFORM public.change_journal14385(request,id,'revise','Changed payload',original,revised);
  RAISE EXCEPTION 'Reused key was accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='Reused key was accepted' THEN RAISE;END IF;INSERT INTO phase1_results VALUES('same key with different payload rejected',true);END;
 r:=public.change_journal14385(void_request,id,'void','Testing lost void response',revised,NULL);
 again:=public.change_journal14385(void_request,id,'void','Testing lost void response',revised,NULL);
 IF r IS DISTINCT FROM again THEN RAISE EXCEPTION 'Void receipt mismatch';END IF;
 SELECT count(*) INTO n FROM public.audit_log WHERE record_id=id::text AND action='VOID';IF n<>1 THEN RAISE EXCEPTION 'Repeated void audit: %',n;END IF;
 IF (SELECT last_value FROM public.journal_entry_number_seq)<>seq THEN RAISE EXCEPTION 'Test consumed a journal number';END IF;
 INSERT INTO phase1_results VALUES('void retry applies once; journal sequence untouched',true);
 SET CONSTRAINTS ALL IMMEDIATE;
END $$;
SELECT * FROM phase1_results;
ROLLBACK;
