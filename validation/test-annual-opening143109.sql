-- Run after the candidate function definitions, in the SAME transaction, then ROLLBACK.
-- Transactional RESTART locks the sequence and rolls back to its original state.
ALTER SEQUENCE public.journal_entry_number_seq RESTART WITH 900000000;
DO $$
DECLARE actor uuid; a uuid; b uuid; generation uuid; payload jsonb; result jsonb; retry jsonb; window_data jsonb; value numeric; denied boolean;
BEGIN
 SELECT id INTO actor FROM public.profiles WHERE role='admin' AND status='active' LIMIT 1;
 PERFORM set_config('request.jwt.claim.sub',actor::text,true);
 PERFORM set_config('request.jwt.claim.role','authenticated',true);
 SELECT id INTO a FROM public.accounts WHERE code='1011';
 SELECT id INTO b FROM public.accounts WHERE code='1041';
 SELECT (public.annual_opening_status143109(2026)->>'generation')::uuid INTO generation;
 payload=jsonb_build_array(jsonb_build_object('p_transaction_date','2025-01-01','p_memo','Annual opening balances 2025','p_prefix','TEST','p_lines',jsonb_build_array(jsonb_build_object('account_id',a,'currency_code','USD','debit',100,'credit',0,'book_rate_lak',20000,'fx_rate_lak',20000),jsonb_build_object('account_id',b,'currency_code','USD','debit',0,'credit',100,'book_rate_lak',20000,'fx_rate_lak',20000))));
 PERFORM public.post_annual_opening143109(2025,generation,'test-annual-2025-143109',payload);
 payload=jsonb_build_array(jsonb_build_object('p_transaction_date','2026-01-01','p_memo','Annual opening balances 2026','p_prefix','TEST','p_lines',jsonb_build_array(jsonb_build_object('account_id',a,'currency_code','USD','debit',200,'credit',0,'book_rate_lak',22000,'fx_rate_lak',22000),jsonb_build_object('account_id',b,'currency_code','USD','debit',0,'credit',200,'book_rate_lak',22000,'fx_rate_lak',22000))));
 result=public.post_annual_opening143109(2026,generation,'test-annual-2026-143109',payload);
 retry=public.post_annual_opening143109(2026,generation,'test-annual-2026-143109',payload);
 IF retry IS DISTINCT FROM result THEN RAISE EXCEPTION 'Idempotent retry failed'; END IF;
 denied=false;BEGIN PERFORM public.post_annual_opening143109(2026,generation,'test-duplicate-2026-143109',payload);EXCEPTION WHEN OTHERS THEN denied=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'Duplicate year accepted'; END IF;
 window_data=public.journal_window14333('2026-01-01','2026-12-31',0);
 IF window_data->'opening'<>'[]'::jsonb THEN RAISE EXCEPTION 'Prior year was carried forward'; END IF;
 SELECT sum((v->>'debit')::numeric-(v->>'credit')::numeric) INTO value FROM jsonb_array_elements(window_data->'rows') v WHERE v->>'accountId'=a::text;
 IF value<>200 THEN RAISE EXCEPTION 'Annual balance doubled: %',value; END IF;
 SELECT sum((v->>'base_debit')::numeric-(v->>'base_credit')::numeric) INTO value FROM jsonb_array_elements(window_data->'rows') v WHERE v->>'accountId'=a::text;
 IF value<>4400000 THEN RAISE EXCEPTION 'Saved carrying value incorrect: %',value; END IF;
 window_data=public.journal_window14333('2025-01-01','2025-12-31',0);
 SELECT sum((v->>'debit')::numeric) INTO value FROM jsonb_array_elements(window_data->'rows') v WHERE v->>'accountId'=a::text;
 IF value<>100 THEN RAISE EXCEPTION 'Historical year changed'; END IF;
 SELECT (v->>'balance')::numeric INTO value FROM jsonb_array_elements(public.year_preflight136(2026)->'balances') v WHERE v->>'account_id'=a::text;
 IF value<>200 THEN RAISE EXCEPTION 'Year-end double counting: %',value; END IF;
 PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 denied=false;BEGIN PERFORM public.annual_opening_status143109(2026);EXCEPTION WHEN OTHERS THEN denied=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'Non-admin could access annual openings'; END IF;
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
