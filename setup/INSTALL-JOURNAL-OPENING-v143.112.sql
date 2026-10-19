-- Report-only year closure and manually posted annual journal openings. No existing financial rows changed.
BEGIN;
ALTER TABLE public.year_closings136 ALTER COLUMN anchor_entry DROP NOT NULL;
CREATE OR REPLACE FUNCTION public.year_preflight136(p_year integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE actor uuid:=public.require_admin136(); start_date date:=make_date(p_year,1,1);end_date date:=make_date(p_year+1,1,1);b jsonb;issues jsonb:='[]';warnings jsonb:='[]';n integer;BEGIN
 IF p_year IS NULL OR p_year NOT BETWEEN 1900 AND 2198 THEN RAISE EXCEPTION 'Invalid year';END IF;
 IF make_date(p_year+1,1,1)>(statement_timestamp() AT TIME ZONE 'Asia/Vientiane')::date THEN issues:=issues||jsonb_build_array('Wait until the year has ended before closing it');END IF;
 SELECT count(*) INTO n FROM journal_entries WHERE transaction_date>=start_date AND transaction_date<end_date AND status::text='posted';IF n=0 THEN warnings:=warnings||jsonb_build_array('This year has no posted transactions. Closing saves an empty report and locks the year.');END IF;
 IF EXISTS(SELECT 1 FROM year_closings136 WHERE year=p_year) THEN RETURN jsonb_build_object('year',p_year,'completed',true,'record',(SELECT to_jsonb(y) FROM year_closings136 y WHERE year=p_year));END IF;
 IF EXISTS(SELECT 1 FROM journal_entries e LEFT JOIN accounting_periods p ON p.period_month=date_trunc('month',e.transaction_date)::date WHERE e.transaction_date>=start_date AND e.transaction_date<end_date AND e.status::text='posted' AND p.status IS DISTINCT FROM 'locked') THEN issues:=issues||jsonb_build_array('Lock every month containing posted transactions');END IF;
 IF EXISTS(SELECT 1 FROM accounting_periods WHERE period_month>=start_date AND period_month<end_date AND status <> 'locked') THEN issues:=issues||jsonb_build_array('Lock all existing period records in this year');END IF;
 IF EXISTS(SELECT 1 FROM book_sessions136 s JOIN accounting_periods p ON p.id=s.period_id WHERE s.status='editing' AND p.period_month>=start_date AND p.period_month<end_date) THEN issues:=issues||jsonb_build_array('Finish or cancel reopened books');END IF;
 IF EXISTS(SELECT 1 FROM entry_submissions WHERE transaction_date>=start_date AND transaction_date<end_date AND status::text IN ('pending','submitted')) OR EXISTS(SELECT 1 FROM staff_journals WHERE period_start>=start_date AND period_start<end_date AND status='submitted') THEN issues:=issues||jsonb_build_array('Resolve submitted entries awaiting approval');END IF;
 IF EXISTS(SELECT 1 FROM audit_reviews136 r JOIN accounting_periods p ON p.id=r.period_id WHERE p.period_month>=start_date AND p.period_month<end_date AND r.status='open') OR EXISTS(SELECT 1 FROM period_findings f JOIN accounting_periods p ON p.id=f.accounting_period_id WHERE p.period_month>=start_date AND p.period_month<end_date AND f.status NOT IN ('closed','corrected')) THEN issues:=issues||jsonb_build_array('Resolve outstanding review findings');END IF;
 IF EXISTS(SELECT 1 FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id WHERE e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)>=start_date AND coalesce(l.line_date,e.transaction_date)<end_date GROUP BY e.id,l.currency_code HAVING abs(sum(l.debit-l.credit))>0.005) THEN issues:=issues||jsonb_build_array('A posted transaction is unbalanced by currency');END IF;
 IF EXISTS(SELECT 1 FROM staff_journals WHERE period_start>=start_date AND period_start<end_date AND status IN ('draft','returned')) THEN warnings:=warnings||jsonb_build_array('Unsubmitted employee drafts are excluded from the year-end report');END IF;
 IF EXISTS(SELECT 1 FROM payroll_runs WHERE period_start>=start_date AND period_start<end_date AND status='draft') THEN warnings:=warnings||jsonb_build_array('Draft payroll is excluded; confirm all actual payroll was posted');END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY code,currency),'[]') INTO b FROM (SELECT a.id account_id,a.code,a.name,CASE WHEN a.is_technical OR a.account_purpose<>'regular' THEN 'SYSTEM' ELSE a.account_type END type,l.currency_code currency,sum(l.debit-l.credit) balance,CASE WHEN bool_and(l.currency_code='LAK' OR (l.base_debit IS NOT NULL AND l.base_credit IS NOT NULL)) THEN sum(CASE WHEN l.currency_code='LAK' THEN l.debit-l.credit ELSE l.base_debit-l.base_credit END) END base_balance FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id JOIN accounts a ON a.id=l.account_id WHERE e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)>=start_date AND coalesce(l.line_date,e.transaction_date)<end_date GROUP BY a.id,a.code,a.name,a.account_type,l.currency_code HAVING sum(l.debit-l.credit)<>0 OR coalesce(sum(CASE WHEN l.currency_code='LAK' THEN l.debit-l.credit ELSE l.base_debit-l.base_credit END),0)<>0 OR NOT bool_and(l.currency_code='LAK' OR (l.base_debit IS NOT NULL AND l.base_credit IS NOT NULL))) x;
 -- Never invent missing rates or silently discard a residual LAK value.
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(b) x WHERE x->>'base_balance' IS NULL) THEN issues:=issues||jsonb_build_array('Complete missing saved LAK valuations before year-end closing');END IF;
 RETURN jsonb_build_object('year',p_year,'nextYear',p_year+1,'transactions',n,'blockers',issues,'warnings',warnings,'balances',b,'fingerprint',md5(b::text));END $function$

;
CREATE OR REPLACE FUNCTION public.close_year136(p_year integer,p_confirmation text,p_fingerprint text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=public.require_admin136(); checkup jsonb; anchor uuid; result jsonb;
BEGIN
 IF NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Accounting workspace access required'; END IF;
 IF p_year IS NULL OR p_year NOT BETWEEN 1900 AND 2198 THEN RAISE EXCEPTION 'Invalid year';END IF;
 IF p_confirmation IS DISTINCT FROM 'CLOSE YEAR '||p_year THEN RAISE EXCEPTION 'Confirmation must be CLOSE YEAR %',p_year;END IF;
 PERFORM pg_advisory_xact_lock(136,p_year);
 LOCK TABLE accounting_periods,accounts,journal_entries,journal_lines,staff_journals,entry_submissions,period_findings,audit_reviews136,book_sessions136 IN SHARE ROW EXCLUSIVE MODE;
 checkup=public.year_preflight136(p_year);
 IF coalesce((checkup->>'completed')::boolean,false) THEN RETURN checkup;END IF;
 IF jsonb_array_length(checkup->'blockers')>0 THEN RAISE EXCEPTION 'Year-end checks failed: %',checkup->'blockers';END IF;
 IF p_fingerprint IS DISTINCT FROM checkup->>'fingerprint' THEN RAISE EXCEPTION 'Balances changed; run the year-end checks again';END IF;
 SELECT id INTO anchor FROM journal_entries WHERE extract(year FROM transaction_date)=p_year AND status='posted' ORDER BY transaction_date,id LIMIT 1;
 -- Existing locked months stay unchanged. Explicitly finalize empty months too.
 INSERT INTO accounting_periods(period_month,status,closed_at,locked_at,updated_by)
 SELECT make_date(p_year,m,1),'locked',now(),now(),actor FROM generate_series(1,12) m ON CONFLICT(period_month) DO NOTHING;
 INSERT INTO year_closings136(year,actor,balances,closing_entries,anchor_entry) VALUES(p_year,actor,checkup->'balances','[]',anchor);
 SELECT to_jsonb(y) INTO result FROM year_closings136 y WHERE year=p_year;
 RETURN jsonb_build_object('completed',true,'year',p_year,'record',result,'balances',checkup->'balances','closingEntries','[]'::jsonb);
END $$;
CREATE OR REPLACE FUNCTION public.annual_opening_status143109(p_year integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE entry uuid; lines jsonb:='[]'; closed boolean; archived boolean; prior_closed boolean; BEGIN
 PERFORM public.require_admin136();
 IF NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Accounting workspace access required'; END IF;
 IF p_year IS NULL OR p_year NOT BETWEEN 1900 AND 2198 THEN RAISE EXCEPTION 'Invalid opening year'; END IF;
 SELECT e.id INTO entry FROM journal_entries e WHERE e.status='posted' AND extract(year FROM e.transaction_date)=p_year
 AND (e.reference='ANNUAL-OPENING-'||p_year OR e.memo IN ('Opening Balances','Annual opening balances '||p_year)) LIMIT 1;
 IF entry IS NOT NULL THEN SELECT jsonb_agg(jsonb_build_object('account_id',account_id,'debit',debit,'credit',credit,'fx_rate_lak',fx_rate_lak,'book_rate_lak',book_rate_lak) ORDER BY line_no) INTO lines FROM journal_lines WHERE journal_entry_id=entry; END IF;
 SELECT EXISTS(SELECT 1 FROM accounting_periods WHERE period_month=make_date(p_year,1,1) AND status<>'open') OR EXISTS(SELECT 1 FROM year_closings136 WHERE year=p_year) INTO closed;
 SELECT EXISTS(SELECT 1 FROM operation_receipts14228 r WHERE r.operation='journal' AND r.payload->0->>'p_memo'='Annual opening balances '||p_year AND NOT EXISTS(SELECT 1 FROM journal_entries e WHERE e.id=(r.result->0->>'entry_id')::uuid)) INTO archived;
 SELECT EXISTS(SELECT 1 FROM year_closings136 WHERE year=p_year-1) INTO prior_closed;
 RETURN jsonb_build_object('available',entry IS NULL AND NOT closed AND NOT archived AND prior_closed,'previous_year_closed',prior_closed,'generation',(SELECT generation FROM opening_state14234 WHERE id),'entry_id',entry,'lines',coalesce(lines,'[]'),
 'reason',CASE WHEN entry IS NOT NULL THEN 'Opening balances are already saved for this year. Use a correcting journal for later adjustments.' WHEN archived THEN 'Opening balances for this year are archived. Restore its archive to review them.' WHEN closed THEN 'January or this year is closed. Opening balances cannot be posted.' WHEN NOT prior_closed THEN 'Close year '||(p_year-1)||' in Closing before posting these opening balances.' ELSE '' END);
END $$;
CREATE OR REPLACE FUNCTION public.post_annual_opening143109(p_year integer,p_generation uuid,p_request_key text,p_entries jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE s jsonb; r jsonb; l jsonb; rate numeric; receipt operation_receipts14228; BEGIN
 PERFORM public.require_admin136();
 IF NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Accounting workspace access required'; END IF;
 IF p_year IS NULL OR p_year NOT BETWEEN 1900 AND 2198 THEN RAISE EXCEPTION 'Invalid opening year'; END IF;
 LOCK TABLE journal_entries IN SHARE ROW EXCLUSIVE MODE;
 PERFORM 1 FROM opening_state14234 WHERE id FOR UPDATE;
 IF p_generation IS DISTINCT FROM (SELECT generation FROM opening_state14234 WHERE id) THEN RAISE EXCEPTION 'The ledger was reset. Return to Journal Entry Options and review the opening balances.'; END IF;
 SELECT * INTO receipt FROM operation_receipts14228 WHERE actor_id=auth.uid() AND request_key=p_request_key;
 IF FOUND THEN
  IF receipt.operation<>'journal' OR receipt.payload IS DISTINCT FROM p_entries THEN RAISE EXCEPTION 'Posting reference already used for different data'; END IF;
  IF NOT EXISTS(SELECT 1 FROM journal_entries WHERE id=(receipt.result->0->>'entry_id')::uuid AND reference='ANNUAL-OPENING-'||p_year AND status='posted') THEN RAISE EXCEPTION 'This opening reference is archived or belongs to another operation. Review History.'; END IF;
  RETURN receipt.result;
 END IF;
 s=public.annual_opening_status143109(p_year);
 IF NOT (s->>'available')::boolean THEN RAISE EXCEPTION '%',s->>'reason'; END IF;
 IF jsonb_typeof(p_entries) IS DISTINCT FROM 'array' OR jsonb_array_length(p_entries)<>1 OR p_entries->0->>'p_memo' IS DISTINCT FROM 'Annual opening balances '||p_year OR (p_entries->0->>'p_transaction_date')::date IS DISTINCT FROM make_date(p_year,1,1) THEN RAISE EXCEPTION 'Provide one opening journal dated 1 January of the selected year'; END IF;
 FOR l IN SELECT value FROM jsonb_array_elements(p_entries->0->'p_lines') LOOP
  rate=CASE WHEN l->>'currency_code'='LAK' THEN 1 ELSE nullif(l->>'book_rate_lak','')::numeric END;
  IF rate IS NULL OR rate<=0 OR rate::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Every foreign opening balance needs a positive LAK carrying rate'; END IF;
  IF EXISTS(SELECT 1 FROM accounts WHERE id=(l->>'account_id')::uuid AND upper(account_type) IN ('REVENUE','INCOME','EXPENSE') AND NOT is_technical AND account_purpose='regular') THEN RAISE EXCEPTION 'Annual opening balances use balance-sheet and system accounts, not income or expense'; END IF;
 END LOOP;
 IF (SELECT sum(round(coalesce((x->>'debit')::numeric,0)*CASE WHEN x->>'currency_code'='LAK' THEN 1 ELSE (x->>'book_rate_lak')::numeric END,2)-round(coalesce((x->>'credit')::numeric,0)*CASE WHEN x->>'currency_code'='LAK' THEN 1 ELSE (x->>'book_rate_lak')::numeric END,2)) FROM jsonb_array_elements(p_entries->0->'p_lines') x)<>0 THEN RAISE EXCEPTION 'Opening LAK equivalents must balance'; END IF;
 r=public.post_journal_batch14228(p_request_key,p_entries);
 UPDATE journal_entries SET reference='ANNUAL-OPENING-'||p_year WHERE id=(r->0->>'entry_id')::uuid;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.annual_opening_status143109(integer),public.post_annual_opening143109(integer,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.annual_opening_status143109(integer),public.post_annual_opening143109(integer,uuid,text,jsonb) TO authenticated;


REVOKE ALL ON FUNCTION public.close_year136(integer,text,text),public.year_preflight136(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.close_year136(integer,text,text),public.year_preflight136(integer) TO authenticated;
COMMIT;
