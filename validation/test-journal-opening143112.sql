-- Execute candidate definitions and these tests in one transaction, then ROLLBACK.
ALTER SEQUENCE public.journal_entry_number_seq RESTART WITH 900000000;
DO $$
DECLARE actor uuid; a uuid; b uuid; generation uuid; payload jsonb; result jsonb; checkup jsonb; denied boolean; n bigint; snap jsonb;
BEGIN
 SELECT id INTO actor FROM profiles WHERE role='admin' AND status='active' LIMIT 1;
 PERFORM set_config('request.jwt.claim.sub',actor::text,true);
 PERFORM set_config('request.jwt.claim.role','authenticated',true);
 SELECT id INTO a FROM accounts WHERE code='1011';SELECT id INTO b FROM accounts WHERE code='1041';
 SELECT (public.annual_opening_status143109(2025)->>'generation')::uuid INTO generation;
 payload=jsonb_build_array(jsonb_build_object('p_transaction_date','2025-01-01','p_memo','Annual opening balances 2025','p_prefix','TEST','p_lines',jsonb_build_array(jsonb_build_object('account_id',a,'currency_code','USD','debit',100,'credit',0,'book_rate_lak',20000,'fx_rate_lak',20000),jsonb_build_object('account_id',b,'currency_code','USD','debit',0,'credit',100,'book_rate_lak',20000,'fx_rate_lak',20000))));
 IF (public.annual_opening_status143109(2025)->>'available')::boolean THEN RAISE EXCEPTION 'Opening unlocked before prior year closed';END IF;
 denied=false;BEGIN PERFORM public.post_annual_opening143109(2025,generation,'test-143112-before-close',payload);EXCEPTION WHEN OTHERS THEN denied=true;END;IF NOT denied THEN RAISE EXCEPTION 'Server accepted opening before closure';END IF;
 PERFORM set_config('app.maintenance14324',jsonb_build_object('actor',actor,'months',(SELECT jsonb_agg(to_char(d,'YYYY-MM')) FROM generate_series('2024-01-01'::date,'2025-12-01'::date,'1 month'::interval) d))::text,true);
 SELECT count(*) INTO n FROM journal_entries;
 checkup=public.year_preflight136(2024);PERFORM public.close_year136(2024,'CLOSE YEAR 2024',checkup->>'fingerprint');
 IF (SELECT count(*) FROM journal_entries)<>n THEN RAISE EXCEPTION 'Empty closure created a journal';END IF;
 IF (SELECT count(*) FROM accounting_periods WHERE extract(year FROM period_month)=2024 AND status='locked')<>12 THEN RAISE EXCEPTION 'Year not fully locked';END IF;
 result=public.post_annual_opening143109(2025,generation,'test-143112-opening',payload);
 IF public.post_annual_opening143109(2025,generation,'test-143112-opening',payload) IS DISTINCT FROM result THEN RAISE EXCEPTION 'Idempotent retry failed';END IF;
 IF (public.annual_opening_status143109(2025)->>'available')::boolean THEN RAISE EXCEPTION 'Duplicate opening enabled';END IF;
 checkup=public.year_preflight136(2025);IF jsonb_array_length(checkup->'blockers')=0 THEN RAISE EXCEPTION 'Unlocked month not blocked';END IF;
 -- Explicitly lock fixture periods using the existing internal-operation mechanism, within this rollback only.
 INSERT INTO accounting_operations136 VALUES(pg_backend_pid(),txid_current(),actor);
 UPDATE accounting_periods SET status='locked',locked_at=now() WHERE period_month='2025-01-01';
 DELETE FROM accounting_operations136 WHERE backend=pg_backend_pid() AND transaction_id=txid_current();
 checkup=public.year_preflight136(2025);SELECT count(*) INTO n FROM journal_entries;
 denied=false;BEGIN PERFORM public.close_year136(2025,'CLOSE YEAR 2025','stale');EXCEPTION WHEN OTHERS THEN denied=true;END;IF NOT denied THEN RAISE EXCEPTION 'Stale report accepted';END IF;
 PERFORM public.close_year136(2025,'CLOSE YEAR 2025',checkup->>'fingerprint');
 SELECT balances INTO snap FROM year_closings136 WHERE year=2025;
 IF snap IS DISTINCT FROM checkup->'balances' THEN RAISE EXCEPTION 'Report changed balances';END IF;
 IF (SELECT count(*) FROM journal_entries)<>n OR EXISTS(SELECT 1 FROM journal_entries WHERE transaction_date>='2026-01-01') THEN RAISE EXCEPTION 'Closure generated entries';END IF;
 IF public.journal_window14333('2026-01-01','2026-12-31',0)->'opening'<>'[]'::jsonb THEN RAISE EXCEPTION 'Balances automatically carried forward';END IF;
 IF NOT (public.annual_opening_status143109(2026)->>'available')::boolean THEN RAISE EXCEPTION 'New opening not enabled';END IF;
 payload=jsonb_set(jsonb_set(payload,'{0,p_transaction_date}','"2026-01-01"'),'{0,p_memo}','"Annual opening balances 2026"');
 payload=jsonb_set(payload,'{0,p_lines,0,book_rate_lak}','22000');
 denied=false;BEGIN PERFORM public.post_annual_opening143109(2026,generation,'test-143112-bad-rate',payload);EXCEPTION WHEN OTHERS THEN denied=true;END;IF NOT denied THEN RAISE EXCEPTION 'Unbalanced LAK allowed';END IF;
 payload=jsonb_set(payload,'{0,p_lines,1,book_rate_lak}','22000');
 PERFORM public.post_annual_opening143109(2026,generation,'test-143112-new-year',payload);
 IF (SELECT balances FROM year_closings136 WHERE year=2025) IS DISTINCT FROM snap THEN RAISE EXCEPTION 'Historical report changed';END IF;
 PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 denied=false;BEGIN PERFORM public.annual_opening_status143109(2026);EXCEPTION WHEN OTHERS THEN denied=true;END;IF NOT denied THEN RAISE EXCEPTION 'Non-admin allowed';END IF;
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
