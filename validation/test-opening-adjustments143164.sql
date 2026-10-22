-- Run after the candidate definitions inside a transaction; all fixtures roll back.
ALTER SEQUENCE public.journal_entry_number_seq RESTART WITH 900000000;
DO $test$
DECLARE actor uuid; bank uuid; equity uuid; expense uuid; generation uuid; p jsonb; r jsonb; first_result jsonb; denied boolean; n integer; checkup jsonb; review jsonb; check_item jsonb;
BEGIN
 SELECT id INTO actor FROM public.profiles WHERE role='admin' AND status='active' ORDER BY created_at LIMIT 1;
 PERFORM set_config('request.jwt.claim.sub',actor::text,true);PERFORM set_config('request.jwt.claim.role','authenticated',true);
 SELECT id INTO bank FROM public.accounts WHERE code='1040';SELECT id INTO equity FROM public.accounts WHERE code='3200';
 SELECT id INTO expense FROM public.accounts WHERE upper(account_type)='EXPENSE' AND currency_code='LAK' AND is_posting AND is_active AND NOT is_technical AND account_purpose='regular' LIMIT 1;
 generation:=(public.annual_opening_status143109(2025)->>'generation')::uuid;
 IF NOT (public.annual_opening_status143109(2025)->>'available')::boolean THEN RAISE EXCEPTION 'Prior year incorrectly required';END IF;
 p:=jsonb_build_array(jsonb_build_object('p_transaction_date','2025-01-01','p_memo','Annual opening balances 2025','p_prefix','TESTOPEN','p_lines',jsonb_build_array(jsonb_build_object('account_id',bank,'currency_code','LAK','debit',100,'credit',0,'book_rate_lak',1,'fx_rate_lak',1),jsonb_build_object('account_id',equity,'currency_code','LAK','debit',0,'credit',100,'book_rate_lak',1,'fx_rate_lak',1))));
 first_result:=public.post_annual_opening143109(2025,generation,'test-opening143164-initial',p);
 IF public.post_annual_opening143109(2025,generation,'test-opening143164-initial',p) IS DISTINCT FROM first_result THEN RAISE EXCEPTION 'Retry changed receipt'; END IF;
 IF NOT (public.annual_opening_status143109(2025)->>'available')::boolean THEN RAISE EXCEPTION 'Button closed after initial opening'; END IF;
 r:=public.post_annual_opening143109(2025,generation,'test-opening143164-additional',p);
 IF r=first_result THEN RAISE EXCEPTION 'Explicit additional opening reused first entry'; END IF;
 IF (SELECT count(*) FROM journal_entries WHERE reference='ANNUAL-OPENING-2025' AND source='manual')<>2 THEN RAISE EXCEPTION 'Initial openings missing or duplicated'; END IF;
 p:=jsonb_set(jsonb_set(p,'{0,p_transaction_date}','"2025-05-12"'),'{0,p_memo}','"Opening balance adjustment 2025 — Late discovery"');
 p:=jsonb_set(jsonb_set(p,'{0,p_lines,0,description}','"Opening balance adjustment — Bank"'),'{0,p_lines,1,description}','"Opening balance adjustment — Equity"');
 r:=public.post_annual_opening143109(2025,generation,'test-opening143164-late',p);
 IF NOT EXISTS(SELECT 1 FROM journal_entries WHERE id=(r->0->>'entry_id')::uuid AND reference='OPENING-ADJUSTMENT-2025' AND transaction_date='2025-05-12') THEN RAISE EXCEPTION 'Late opening was backdated or misclassified';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(public.journal_window14333('2025-05-01','2025-05-31',0)->'rows') x WHERE x->>'dbEntryId'=r->0->>'entry_id' AND (x->>'annualOpening')::boolean) THEN RAISE EXCEPTION 'Late opening treated as initial opening';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(public.journal_window14333('2025-01-01','2025-01-31',0)->'rows') x WHERE x->>'dbEntryId'=r->0->>'entry_id') THEN RAISE EXCEPTION 'Late entry leaked into January';END IF;
 IF public.post_annual_opening143109(2025,generation,'test-opening143164-late',p) IS DISTINCT FROM r THEN RAISE EXCEPTION 'Late retry changed receipt';END IF;
 denied:=false;BEGIN PERFORM public.post_annual_opening143109(2025,generation,'test-opening143164-late',jsonb_set(p,'{0,p_lines,0,debit}','101'));EXCEPTION WHEN OTHERS THEN denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'Changed retry accepted';END IF;
 denied:=false;BEGIN PERFORM public.post_annual_opening143109(2026,generation,'test-opening143164-year-mismatch',p);EXCEPTION WHEN OTHERS THEN denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'Year mismatch accepted';END IF;
 denied:=false;BEGIN PERFORM public.post_annual_opening143109(2025,gen_random_uuid(),'test-opening143164-reset',p);EXCEPTION WHEN OTHERS THEN denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'Stale reset accepted';END IF;
 denied:=false;BEGIN PERFORM public.post_annual_opening143109(2025,generation,'test-opening143164-receipt',jsonb_set(p,'{0,p_lines,0,description}','"Opening balance adjustment — [Receipt date: 2025-01-01]"'));EXCEPTION WHEN OTHERS THEN denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'Receipt date override accepted';END IF;
 denied:=false;BEGIN PERFORM public.post_annual_opening143109(2025,generation,'test-opening143164-unbalanced',jsonb_set(p,'{0,p_lines,0,debit}','101'));EXCEPTION WHEN OTHERS THEN denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'Unbalanced entry accepted';END IF;
 IF expense IS NOT NULL THEN
  denied:=false;BEGIN PERFORM public.post_annual_opening143109(2025,generation,'test-opening143164-expense',jsonb_set(p,'{0,p_lines,0,account_id}',to_jsonb(expense)));EXCEPTION WHEN OTHERS THEN denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'Expense accepted as opening';END IF;
 END IF;
 checkup:=public.maintenance_preflight14324('2025-01-01');
 review:=jsonb_build_object('coverageConfirmed',true,'acknowledgments','{}'::jsonb,'reconciliations','{}'::jsonb);
 FOR check_item IN SELECT value FROM jsonb_array_elements(checkup->'issues') WHERE value->>'severity'='warning' LOOP
  review:=jsonb_set(review,ARRAY['acknowledgments',check_item->>'id'],jsonb_build_object('acknowledged',true,'reason','Isolated rollback fixture'));
 END LOOP;
 FOR check_item IN SELECT value FROM jsonb_array_elements(checkup->'balances') WHERE (value->>'cash_candidate')::boolean LOOP
  review:=jsonb_set(review,ARRAY['reconciliations',check_item->>'id'],jsonb_build_object('actual',trunc((check_item->>'balance')::numeric)::text,'acknowledged',true,'reason','Isolated rollback fixture'));
 END LOOP;
 PERFORM public.maintenance_finish14324('2025-01-01','period',checkup->>'fingerprint',review,'closed');
 p:=jsonb_set(p,'{0,p_transaction_date}','"2025-06-12"');
 PERFORM public.post_annual_opening143109(2025,generation,'test-opening143164-after-jan-close',p);
 checkup:=public.maintenance_preflight14324('2025-06-01');
 review:=jsonb_build_object('coverageConfirmed',true,'acknowledgments','{}'::jsonb,'reconciliations','{}'::jsonb);
 FOR check_item IN SELECT value FROM jsonb_array_elements(checkup->'issues') WHERE value->>'severity'='warning' LOOP
  review:=jsonb_set(review,ARRAY['acknowledgments',check_item->>'id'],jsonb_build_object('acknowledged',true,'reason','Isolated rollback fixture'));
 END LOOP;
 FOR check_item IN SELECT value FROM jsonb_array_elements(checkup->'balances') WHERE (value->>'cash_candidate')::boolean LOOP
  review:=jsonb_set(review,ARRAY['reconciliations',check_item->>'id'],jsonb_build_object('actual',trunc((check_item->>'balance')::numeric)::text,'acknowledged',true,'reason','Isolated rollback fixture'));
 END LOOP;
 PERFORM public.maintenance_finish14324('2025-06-01','period',checkup->>'fingerprint',review,'closed');
 denied:=false;BEGIN PERFORM public.post_annual_opening143109(2025,generation,'test-opening143164-closed-date',p);EXCEPTION WHEN OTHERS THEN denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'Closed date accepted';END IF;
 p:=jsonb_set(jsonb_set(p,'{0,p_transaction_date}','"2026-01-01"'),'{0,p_memo}','"Annual opening balances 2026"');
 r:=public.post_annual_opening143109(2026,generation,'test-opening143164-next-year',p);
 IF NOT EXISTS(SELECT 1 FROM journal_entries WHERE id=(r->0->>'entry_id')::uuid AND reference='ANNUAL-OPENING-2026') THEN RAISE EXCEPTION 'Next year opening lost classification';END IF;
 PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 denied:=false;BEGIN PERFORM public.annual_opening_status143109(2026);EXCEPTION WHEN OTHERS THEN denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'Non-admin status accepted';END IF;
 denied:=false;BEGIN PERFORM public.post_annual_opening143109(2026,generation,'test-opening143164-non-admin',p);EXCEPTION WHEN OTHERS THEN denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'Non-admin posting accepted';END IF;
 PERFORM set_config('request.jwt.claim.sub',actor::text,true);
END $test$;
SET CONSTRAINTS ALL IMMEDIATE;
SELECT 'PASS: initial and repeated openings, late adjustment, next year, no January restatement, immutable retry, closed-date guard, role guard, balanced posting and reset generation' AS result;
