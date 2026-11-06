-- Open-book reconciliation workspace and version-checked edits. No financial postings.
BEGIN;
CREATE TABLE private.reconciliation_versions306 (
 record_id text NOT NULL, saved_at timestamptz NOT NULL, report jsonb NOT NULL,
 changed_by uuid NOT NULL, changed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(record_id,saved_at)
);
ALTER TABLE private.reconciliation_versions306 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.reconciliation_versions306 FROM PUBLIC,anon,authenticated;
CREATE FUNCTION private.reconciliation_open306(p_from date,p_to date,p_correction boolean DEFAULT false) RETURNS void LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE d date;
BEGIN
 IF p_from IS NULL OR p_to IS NULL OR p_to<p_from THEN RAISE EXCEPTION 'Choose a valid reconciliation period';END IF;
 FOR d IN SELECT generate_series(date_trunc('month',p_from),date_trunc('month',p_to),interval '1 month')::date LOOP
  IF EXISTS(SELECT 1 FROM public.accounting_periods WHERE period_month=d AND status<>'open') AND NOT(p_correction AND private.reconciliation_session305(d) IS NOT NULL) THEN RAISE EXCEPTION 'This book is closed or locked. Saved reconciliations are available in Reports.';END IF;
 END LOOP;
END $$;
CREATE FUNCTION public.reconciliation_workspace306(p_month date DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE months jsonb; chosen date; today_month date=date_trunc('month',now() AT TIME ZONE 'Asia/Vientiane')::date;
BEGIN
 PERFORM private.reconciliation_admin305();
 SELECT coalesce(jsonb_agg(jsonb_build_object('month',to_char(p.period_month,'YYYY-MM'),'status',CASE WHEN p.status='open' THEN 'open' ELSE 'reopened' END) ORDER BY p.period_month),'[]') INTO months FROM public.accounting_periods p
 WHERE p.period_month<=today_month AND (p.status='open' OR private.reconciliation_session305(p.period_month) IS NOT NULL);
 IF jsonb_array_length(months)=0 AND NOT EXISTS(SELECT 1 FROM public.accounting_periods WHERE period_month=today_month AND status<>'open') THEN months=jsonb_build_array(jsonb_build_object('month',to_char(today_month,'YYYY-MM'),'status','open'));END IF;
 chosen=CASE WHEN p_month IS NULL THEN ((months->0->>'month')||'-01')::date WHEN EXISTS(SELECT 1 FROM jsonb_array_elements(months) m WHERE m->>'month'=to_char(p_month,'YYYY-MM')) THEN date_trunc('month',p_month)::date ELSE NULL END;
 RETURN jsonb_build_object('months',months,'month',to_char(chosen,'YYYY-MM'),'progress',CASE WHEN chosen IS NOT NULL THEN private.reconciliation_check305(chosen) ELSE NULL END);
END $$;
CREATE FUNCTION public.reconciliation_edit306(p_record text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE r private.reconciliation_records305;
BEGIN
 PERFORM private.reconciliation_admin305();SELECT * INTO r FROM private.reconciliation_records305 WHERE record_id=p_record AND owner_id=auth.uid();
 IF r.record_id IS NULL THEN RAISE EXCEPTION 'Saved reconciliation not found';END IF;
 PERFORM private.reconciliation_open306(r.period_from,r.period_to);
 RETURN r.report||jsonb_build_object('recordId',r.record_id,'editing306',true,'editVersion306',r.saved_at,'status','draft');
END $$;
CREATE OR REPLACE FUNCTION public.reconciliation_save305(p_report jsonb,p_fingerprint text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a uuid; f date; t date; snap jsonb; r jsonb=p_report; difference numeric; outstanding numeric; statement numeric; rid text;
BEGIN
 PERFORM private.reconciliation_admin305();
 a=(r->'account'->>'id')::uuid;f=(r->>'from')::date;t=(r->>'to')::date;rid=coalesce(r->>'recordId',r->>'id');
 LOCK TABLE public.accounting_periods,public.accounts,public.journal_entries,public.journal_lines,public.book_sessions136 IN SHARE MODE;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(a::text||f::text||t::text,306));
 PERFORM private.reconciliation_open306(f,t,true);
 IF r->>'method'<>'bank' AND r->>'dateBasis'<>'posting' THEN RAISE EXCEPTION 'Cash and supporting balances use posting dates';END IF;
 IF r->>'owner' IS DISTINCT FROM auth.uid()::text OR length(rid)<3 OR r->>'method' NOT IN('cash','bank','balance') OR r->>'status' NOT IN('saved','reconciled') THEN RAISE EXCEPTION 'Invalid saved reconciliation'; END IF;
 -- Same lock order as closing. A journal edit cannot race the verification.
 LOCK TABLE public.accounts,public.journal_entries,public.journal_lines,public.book_sessions136 IN SHARE MODE;
 snap=private.reconciliation_snapshot305(a,f,t,r->>'dateBasis',private.reconciliation_session305(date_trunc('month',t)::date));
 IF p_fingerprint IS DISTINCT FROM snap->>'fingerprint' OR EXISTS(SELECT 1 FROM unnest(ARRAY['opening','debit','credit','closing']) k WHERE (r->>k)::numeric IS DISTINCT FROM (snap->>k)::numeric) THEN RAISE EXCEPTION 'This account changed. Reopen its reconciliation and review the updated figures.'; END IF;
 IF coalesce(r->>'statement','') !~ '^-?[0-9]+([.][0-9]{1,2})?$' THEN RAISE EXCEPTION 'Enter the actual counted or statement balance';END IF;
 statement=round((r->>'statement')::numeric*100);
 SELECT coalesce(sum(round((x->>'amount')::numeric*100)),0) INTO outstanding FROM jsonb_array_elements(coalesce(r->'findings','[]')) x WHERE x->>'kind'='outstanding';
 difference=(snap->>'closing')::numeric-statement-outstanding;
 IF difference<>0 AND (r->>'differenceConfirmed' IS DISTINCT FROM 'true' OR length(btrim(coalesce(r->>'notes','')))<3) THEN RAISE EXCEPTION 'Confirm and explain the reconciliation difference';END IF;
 IF r->>'method'='bank' AND (coalesce(r->>'statementOpening117','')='' OR coalesce(r->>'statementDebit117','')='' OR coalesce(r->>'statementCredit117','')='' OR round(100*((r->>'statementOpening117')::numeric+CASE WHEN r->>'statementReverse117'='false' THEN (r->>'statementDebit117')::numeric-(r->>'statementCredit117')::numeric ELSE (r->>'statementCredit117')::numeric-(r->>'statementDebit117')::numeric END))<>statement) THEN RAISE EXCEPTION 'Bank statement figures do not agree'; END IF;
 r=r||jsonb_build_object('id','REC-'||to_char(t,'YYMM')||'-'||(SELECT code FROM public.accounts WHERE id=a),'cloudConfirmed305',true,'cloudFingerprint305',snap->>'fingerprint','status',CASE WHEN difference=0 THEN 'reconciled' ELSE 'saved' END);
 IF EXISTS(SELECT 1 FROM private.reconciliation_records305 WHERE record_id=rid AND (owner_id<>auth.uid() OR account_id<>a OR fingerprint<>p_fingerprint OR (report-ARRAY['updatedAt','completedAt']) IS DISTINCT FROM (r-ARRAY['updatedAt','completedAt']))) THEN RAISE EXCEPTION 'This saved reconciliation already exists. Start a new reconciliation for changed figures.';END IF;
 IF EXISTS(SELECT 1 FROM private.reconciliation_records305 WHERE account_id=a AND period_from=f AND period_to=t AND method=r->>'method' AND fingerprint=p_fingerprint AND record_id<>rid) THEN RAISE EXCEPTION 'This account is already reconciled for the month. Edit the saved reconciliation instead.';END IF;
 INSERT INTO private.reconciliation_records305(record_id,owner_id,account_id,period_from,period_to,method,basis,fingerprint,report) VALUES(rid,auth.uid(),a,f,t,r->>'method',r->>'dateBasis',p_fingerprint,r) ON CONFLICT(record_id) DO NOTHING;
 RETURN (SELECT report FROM private.reconciliation_records305 WHERE record_id=rid);
END $$;
CREATE FUNCTION public.reconciliation_update306(p_report jsonb,p_fingerprint text,p_expected timestamptz) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a uuid; f date; t date; snap jsonb; r jsonb=p_report; difference numeric; outstanding numeric; statement numeric; rid text; previous private.reconciliation_records305;
BEGIN
 PERFORM private.reconciliation_admin305();
 a=(r->'account'->>'id')::uuid;f=(r->>'from')::date;t=(r->>'to')::date;rid=coalesce(r->>'recordId',r->>'id');
 LOCK TABLE public.accounting_periods,public.accounts,public.journal_entries,public.journal_lines,public.book_sessions136 IN SHARE MODE;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(a::text||f::text||t::text,306));
 SELECT * INTO previous FROM private.reconciliation_records305 WHERE record_id=rid AND owner_id=auth.uid() FOR UPDATE;
 IF previous.record_id IS NULL THEN RAISE EXCEPTION 'Saved reconciliation not found';END IF;
 IF previous.saved_at IS DISTINCT FROM p_expected THEN
  IF previous.fingerprint=p_fingerprint AND (previous.report-ARRAY['updatedAt','completedAt','editing306','editVersion306'])=(r-ARRAY['updatedAt','completedAt','editing306','editVersion306']) THEN RETURN previous.report;END IF;
  RAISE EXCEPTION 'This reconciliation changed. Reopen it before editing.';
 END IF;
 IF previous.account_id<>a OR previous.period_from<>f OR previous.period_to<>t OR previous.method<>r->>'method' OR previous.basis<>r->>'dateBasis' THEN RAISE EXCEPTION 'The saved account, method and period cannot be changed';END IF;
 PERFORM private.reconciliation_open306(f,t);
 r=r-ARRAY['editing306','editVersion306'];
 IF r->>'method'<>'bank' AND r->>'dateBasis'<>'posting' THEN RAISE EXCEPTION 'Cash and supporting balances use posting dates';END IF;
 IF r->>'owner' IS DISTINCT FROM auth.uid()::text OR length(rid)<3 OR r->>'method' NOT IN('cash','bank','balance') OR r->>'status' NOT IN('saved','reconciled') THEN RAISE EXCEPTION 'Invalid saved reconciliation'; END IF;
 -- Same lock order as closing. A journal edit cannot race the verification.
 LOCK TABLE public.accounts,public.journal_entries,public.journal_lines,public.book_sessions136 IN SHARE MODE;
 snap=private.reconciliation_snapshot305(a,f,t,r->>'dateBasis',private.reconciliation_session305(date_trunc('month',t)::date));
 IF p_fingerprint IS DISTINCT FROM snap->>'fingerprint' OR EXISTS(SELECT 1 FROM unnest(ARRAY['opening','debit','credit','closing']) k WHERE (r->>k)::numeric IS DISTINCT FROM (snap->>k)::numeric) THEN RAISE EXCEPTION 'This account changed. Reopen its reconciliation and review the updated figures.'; END IF;
 IF coalesce(r->>'statement','') !~ '^-?[0-9]+([.][0-9]{1,2})?$' THEN RAISE EXCEPTION 'Enter the actual counted or statement balance';END IF;
 statement=round((r->>'statement')::numeric*100);
 SELECT coalesce(sum(round((x->>'amount')::numeric*100)),0) INTO outstanding FROM jsonb_array_elements(coalesce(r->'findings','[]')) x WHERE x->>'kind'='outstanding';
 difference=(snap->>'closing')::numeric-statement-outstanding;
 IF difference<>0 AND (r->>'differenceConfirmed' IS DISTINCT FROM 'true' OR length(btrim(coalesce(r->>'notes','')))<3) THEN RAISE EXCEPTION 'Confirm and explain the reconciliation difference';END IF;
 IF r->>'method'='bank' AND (coalesce(r->>'statementOpening117','')='' OR coalesce(r->>'statementDebit117','')='' OR coalesce(r->>'statementCredit117','')='' OR round(100*((r->>'statementOpening117')::numeric+CASE WHEN r->>'statementReverse117'='false' THEN (r->>'statementDebit117')::numeric-(r->>'statementCredit117')::numeric ELSE (r->>'statementCredit117')::numeric-(r->>'statementDebit117')::numeric END))<>statement) THEN RAISE EXCEPTION 'Bank statement figures do not agree'; END IF;
 r=r||jsonb_build_object('id','REC-'||to_char(t,'YYMM')||'-'||(SELECT code FROM public.accounts WHERE id=a),'cloudConfirmed305',true,'cloudFingerprint305',snap->>'fingerprint','status',CASE WHEN difference=0 THEN 'reconciled' ELSE 'saved' END);
 INSERT INTO private.reconciliation_versions306(record_id,saved_at,report,changed_by) VALUES(rid,previous.saved_at,previous.report,auth.uid());
 UPDATE private.reconciliation_records305 SET fingerprint=p_fingerprint,report=r,saved_at=clock_timestamp() WHERE record_id=rid;
 RETURN (SELECT report FROM private.reconciliation_records305 WHERE record_id=rid);
END $$;
REVOKE ALL ON FUNCTION private.reconciliation_open306(date,date,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reconciliation_workspace306(date),public.reconciliation_edit306(text),public.reconciliation_update306(jsonb,text,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reconciliation_workspace306(date),public.reconciliation_edit306(text),public.reconciliation_update306(jsonb,text,timestamptz) TO authenticated;
COMMIT;
