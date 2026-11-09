-- Annual locking changes future closing actions only. No historical period or journal is modified by installation.
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
 IF EXISTS(SELECT 1 FROM journal_entries e LEFT JOIN accounting_periods p ON p.period_month=date_trunc('month',e.transaction_date)::date WHERE e.transaction_date>=start_date AND e.transaction_date<end_date AND e.status::text='posted' AND coalesce(p.status::text,'open') NOT IN ('closed','locked')) THEN issues:=issues||jsonb_build_array('Close the months containing posted transactions');END IF;
 IF EXISTS(SELECT 1 FROM accounting_periods WHERE period_month>=start_date AND period_month<end_date AND status NOT IN ('closed','locked')) THEN issues:=issues||jsonb_build_array('Finish closing the open months in this year');END IF;
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
 -- Only the verified annual close changes closed months to locked. Previously locked records retain their dates.
 PERFORM set_config('app.annual_lock321',p_year::text,true);
 UPDATE public.accounting_periods SET status='locked',locked_at=now(),updated_by=actor,updated_at=now()
 WHERE period_month>=make_date(p_year,1,1) AND period_month<make_date(p_year+1,1,1) AND status='closed';
 INSERT INTO public.accounting_periods(period_month,status,closed_at,locked_at,updated_by)
 SELECT d,'locked',now(),now(),actor FROM (SELECT make_date(p_year,m,1) d FROM generate_series(1,12) m) months
 WHERE NOT EXISTS(SELECT 1 FROM public.accounting_periods p WHERE p.period_month=d);
 PERFORM set_config('app.annual_lock321','',true);
 INSERT INTO year_closings136(year,actor,balances,closing_entries,anchor_entry) VALUES(p_year,actor,checkup->'balances','[]',anchor);
 SELECT to_jsonb(y) INTO result FROM year_closings136 y WHERE year=p_year;
 RETURN jsonb_build_object('completed',true,'year',p_year,'record',result,'balances',checkup->'balances','closingEntries','[]'::jsonb);
END $$;
CREATE OR REPLACE FUNCTION public.guard_maintenance14324() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE checkup jsonb; approval jsonb; recon jsonb;
BEGIN
 IF NEW.status IN ('closed','locked') AND (TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status) THEN
  approval:=coalesce(nullif(current_setting('app.maintenance14324',true),'')::jsonb,'{}');
  IF approval->>'actor' IS DISTINCT FROM auth.uid()::text OR NOT(approval->'months' ? to_char(NEW.period_month,'YYYY-MM')) THEN RAISE EXCEPTION 'Run the closing review before finalizing a period';END IF;
  IF NEW.status='locked' AND current_setting('app.annual_lock321',true) IS DISTINCT FROM to_char(NEW.period_month,'YYYY') THEN RAISE EXCEPTION 'Closed months are locked together at year-end';END IF;
  LOCK TABLE private.reconciliation_settings305,private.reconciliation_records305,private.reconciliation_periods305 IN SHARE ROW EXCLUSIVE MODE;
  IF TG_OP='UPDATE' AND OLD.status='closed' AND NEW.status='locked' THEN
   -- December closing checks already covered the cumulative ledger. Recheck the account-specific evidence for this month.
   recon:=private.reconciliation_check305(NEW.period_month);
   IF recon->>'complete' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Required reconciliations changed for %: %',NEW.period_month,recon->'issues';END IF;
  ELSE
   checkup:=public.maintenance_preflight14324(NEW.period_month);
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(checkup->'issues') x WHERE x->>'severity'='block') THEN RAISE EXCEPTION 'Closing blocked: %',checkup->'issues';END IF;
   recon:=checkup->'reconciliation305';
  END IF;
  INSERT INTO private.reconciliation_periods305(month,requirements) VALUES(NEW.period_month,recon->'requirements') ON CONFLICT(month) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;

-- Return the figures from the same matching reconciliation used by the gate.
DO $details$
DECLARE body text; original text:=$old$'reportId',saved.report->>'id','fingerprint',saved.fingerprint$old$;
BEGIN
 body:=pg_get_functiondef('private.reconciliation_check305(date)'::regprocedure);
 IF position('ledgerAmount321' IN body)=0 THEN
  IF position(original IN body)=0 THEN RAISE EXCEPTION 'Unexpected reconciliation check definition';END IF;
  EXECUTE replace(body,original,original||$new$,
    'ledgerAmount321',(saved.report->>'closing')::numeric/100,'actualAmount321',saved.report->>'statement',
    'reference321',saved.report->>'statementReference'$new$);
 END IF;
END $details$;
