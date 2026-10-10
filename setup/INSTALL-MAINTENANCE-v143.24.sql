-- Read-only inspection and atomic closing review. No financial records are reset.
-- Install after v143.22 (also required after a fresh v143.22 database installation).
BEGIN;
CREATE OR REPLACE FUNCTION public.maintenance_preflight14324(p_month date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE last_day date; issues jsonb; balances jsonb; trial jsonb; pending jsonb; fingerprint text;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND status='active') OR NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Active accounting administrator required';END IF;
 IF p_month IS NULL OR p_month<>date_trunc('month',p_month)::date THEN RAISE EXCEPTION 'Choose a valid accounting month';END IF;
 last_day=(p_month+interval '1 month')::date;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.code,x.currency),'[]') INTO balances FROM (
  SELECT a.id,a.code,a.name,a.account_type,a.account_purpose,a.currency_code currency,
   coalesce(sum(l.debit) FILTER(WHERE e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)<last_day),0) debit,
   coalesce(sum(l.credit) FILTER(WHERE e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)<last_day),0) credit,
   coalesce(sum(l.debit-l.credit) FILTER(WHERE e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)<last_day),0) balance,
   (a.account_type='ASSET' AND (a.name~*'(cash|bank|petty)' OR a.code~'^10[01]')) cash_candidate
  FROM public.accounts a LEFT JOIN public.journal_lines l ON l.account_id=a.id LEFT JOIN public.journal_entries e ON e.id=l.journal_entry_id
  WHERE a.is_posting GROUP BY a.id
 ) x;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.currency),'[]') INTO trial FROM (
  SELECT l.currency_code currency,sum(l.debit) debit,sum(l.credit) credit,sum(l.debit-l.credit) difference
  FROM public.journal_lines l JOIN public.journal_entries e ON e.id=l.journal_entry_id
  WHERE e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)<last_day GROUP BY l.currency_code
 ) x;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.severity,x.id),'[]') INTO issues FROM (
  SELECT 'block'::text severity,'entry:'||e.id id,'Unbalanced journal' title,e.entry_no||' / '||l.currency_code||': difference '||sum(l.debit-l.credit)::text detail
  FROM public.journal_entries e JOIN public.journal_lines l ON l.journal_entry_id=e.id WHERE e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)<last_day GROUP BY e.id,l.currency_code HAVING abs(sum(l.debit-l.credit))>0.005
  UNION ALL SELECT 'block','trial:'||(x->>'currency'),'Trial balance does not balance',x::text FROM jsonb_array_elements(trial) x WHERE abs((x->>'difference')::numeric)>0.005
  UNION ALL SELECT 'block','empty:'||e.id,'Posted entry has fewer than two lines',e.entry_no FROM public.journal_entries e WHERE e.status::text='posted' AND e.transaction_date<last_day AND (SELECT count(*) FROM public.journal_lines l WHERE l.journal_entry_id=e.id)<2
  UNION ALL SELECT 'block','number:'||entry_no,'Duplicate Entry ID',entry_no FROM public.journal_entries GROUP BY entry_no HAVING count(*)>1
  UNION ALL SELECT 'block','missing-id:'||id,'Missing Entry ID',id::text FROM public.journal_entries WHERE btrim(coalesce(entry_no,''))=''
  UNION ALL SELECT 'block','line:'||l.id,'Invalid journal line',l.id::text||': missing parent/account, currency mismatch, invalid amount or non-posting account' FROM public.journal_lines l LEFT JOIN public.journal_entries e ON e.id=l.journal_entry_id LEFT JOIN public.accounts a ON a.id=l.account_id WHERE e.id IS NULL OR a.id IS NULL OR (e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)<last_day AND (l.currency_code<>a.currency_code OR NOT a.is_posting OR l.debit<0 OR l.credit<0 OR (l.debit>0 AND l.credit>0) OR (l.debit=0 AND l.credit=0) OR l.debit::text IN('NaN','Infinity','-Infinity') OR l.credit::text IN('NaN','Infinity','-Infinity')))
  UNION ALL SELECT 'block','line-date:'||l.id,'Journal line is in a different posting month',e.entry_no||' / '||l.id FROM public.journal_lines l JOIN public.journal_entries e ON e.id=l.journal_entry_id WHERE e.status::text='posted' AND e.transaction_date<last_day AND date_trunc('month',coalesce(l.line_date,e.transaction_date))<>date_trunc('month',e.transaction_date)
  UNION ALL SELECT 'block','finding:'||f.id,'Unresolved period finding',f.description FROM public.period_findings f JOIN public.accounting_periods p ON p.id=f.accounting_period_id WHERE p.period_month<=p_month AND f.status NOT IN('closed','corrected')
  UNION ALL SELECT 'block','review:'||f.id,'Unresolved audit review',f.description FROM public.audit_reviews136 f JOIN public.accounting_periods p ON p.id=f.period_id WHERE p.period_month<=p_month AND f.status='open'
  UNION ALL SELECT 'warning','draft:'||e.id,'Unposted journal',e.entry_no||' ('||e.status::text||') is excluded from the ledger' FROM public.journal_entries e WHERE e.transaction_date<last_day AND e.status::text NOT IN('posted','void','voided','cancelled')
  UNION ALL SELECT 'warning','submission:'||id,'Unposted entry submission','Submission '||submission_no||' dated '||transaction_date||' is excluded from the ledger' FROM public.entry_submissions WHERE transaction_date<last_day AND status::text IN('pending','submitted') AND journal_entry_id IS NULL
  UNION ALL SELECT 'warning','payroll:'||id,'Draft payroll','Payroll '||id||' for '||period_start||' has not been finalized' FROM public.payroll_runs WHERE period_start<last_day AND status='draft'
  UNION ALL SELECT 'warning','memo:'||id,'Missing entry description',entry_no FROM public.journal_entries WHERE status::text='posted' AND transaction_date<last_day AND btrim(coalesce(memo,''))=''
  UNION ALL SELECT 'warning','clearing:'||(x->>'id'),'Uncleared control account',(x->>'code')||' '||(x->>'name')||': '||(x->>'balance')||' '||(x->>'currency') FROM jsonb_array_elements(balances) x WHERE x->>'account_purpose' IN('clearing','suspense','settlement') AND abs((x->>'balance')::numeric)>0.005
  UNION ALL SELECT 'warning','report:'||j.id,'Deferred staff report',coalesce(u.full_name,u.email,'Former user')||' / '||j.id||': '||count(*)||' unposted line(s) through the selected month' FROM public.staff_journals j JOIN public.staff_journal_lines l ON l.staff_journal_id=j.id LEFT JOIN public.profiles u ON u.id=j.owner_id WHERE l.transaction_date<last_day AND l.journal_entry_id IS NULL AND j.status IN('draft','returned','submitted') GROUP BY j.id,u.full_name,u.email
 ) x;
 pending=public.period_pending14317(p_month);
 -- Include source rows, not just aggregate balances: equal-value edits invalidate review.
 SELECT md5(jsonb_build_object('month',p_month,'issues',issues,'balances',balances,'pending',pending,
  'entries',(SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.id),'[]') FROM public.journal_entries e WHERE e.transaction_date<last_day),
  'lines',(SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.id),'[]') FROM public.journal_lines l JOIN public.journal_entries e ON e.id=l.journal_entry_id WHERE e.transaction_date<last_day),
  'staff',(SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.id),'[]') FROM public.staff_journal_lines l WHERE l.transaction_date<last_day),
  'payroll',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.id),'[]') FROM public.payroll_runs r WHERE r.period_start<last_day),
  'sessions',(SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.id),'[]') FROM public.book_sessions136 s JOIN public.accounting_periods p ON p.id=s.period_id WHERE p.period_month<=p_month AND s.status='editing'))::text) INTO fingerprint;
 RETURN jsonb_build_object('version',14324,'month',p_month,'checkedAt',statement_timestamp(),'issues',issues,'balances',balances,'trial',trial,'pending',pending,'fingerprint',fingerprint);
END $$;

CREATE OR REPLACE FUNCTION public.maintenance_snapshot14324() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE pack jsonb; name text; items jsonb;
BEGIN
 pack=public.audit_snapshot14232(); -- Existing active-admin and workspace checks.
 FOREACH name IN ARRAY ARRAY['journal_sources14253','vouchers14299','voucher_versions14299','payroll_settings','hr_calendar_events14306'] LOOP
  IF to_regclass(format('public.%I',name)) IS NOT NULL THEN
   EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text),''[]''::jsonb) FROM public.%I r',name) INTO items;
   pack=jsonb_set(pack,ARRAY['tables',name],items);
  END IF;
 END LOOP;
 RETURN pack||jsonb_build_object('maintenanceVersion',14324,'copiedAt14324',statement_timestamp());
END $$;

CREATE OR REPLACE FUNCTION public.guard_maintenance14324() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE checkup jsonb; approval jsonb;
BEGIN
 IF NEW.status IN('closed','locked') AND (TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status) THEN
  approval=coalesce(nullif(current_setting('app.maintenance14324',true),'')::jsonb,'{}');
  IF approval->>'actor' IS DISTINCT FROM auth.uid()::text OR NOT (approval->'months' ? to_char(NEW.period_month,'YYYY-MM')) THEN RAISE EXCEPTION 'Run Maintenance & Audit closing checks before closing or locking';END IF;
  checkup=public.maintenance_preflight14324(NEW.period_month);
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(checkup->'issues') AS item(value) WHERE item.value->>'severity'='block') THEN RAISE EXCEPTION 'Closing blocked: %',checkup->'issues';END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_maintenance14324 ON public.accounting_periods;
CREATE TRIGGER guard_maintenance14324 BEFORE INSERT OR UPDATE OF status ON public.accounting_periods FOR EACH ROW EXECUTE FUNCTION public.guard_maintenance14324();

CREATE OR REPLACE FUNCTION public.maintenance_finish14324(p_month date,p_kind text,p_fingerprint text,p_review jsonb,p_status text DEFAULT 'closed',p_session uuid DEFAULT NULL,p_year integer DEFAULT NULL,p_confirmation text DEFAULT NULL,p_year_fingerprint text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE checkup jsonb; x jsonb; answer jsonb; actual numeric; months jsonb; acks jsonb='{}'; d date; m integer; result jsonb; book_month date;
BEGIN
 IF p_kind NOT IN('period','session','year') THEN RAISE EXCEPTION 'Invalid closing action';END IF;
 IF p_kind='year' AND (p_year IS NULL OR p_month IS DISTINCT FROM make_date(p_year,12,1)) THEN RAISE EXCEPTION 'Choose the December year-end review';END IF;
 -- Stable source and acknowledgments through commit; no write can slip between review and close.
 LOCK TABLE public.accounting_periods,public.accounts,public.journal_entries,public.journal_lines,public.staff_journals,public.staff_journal_lines,public.payroll_runs,public.entry_submissions,public.period_findings,public.audit_reviews136,public.book_sessions136 IN SHARE ROW EXCLUSIVE MODE;
 checkup=public.maintenance_preflight14324(p_month);
 IF p_fingerprint IS DISTINCT FROM checkup->>'fingerprint' THEN RAISE EXCEPTION 'Records changed. Run the closing checks and review again.';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(checkup->'issues') AS item(value) WHERE item.value->>'severity'='block') THEN RAISE EXCEPTION 'Closing is blocked by integrity errors';END IF;
 IF p_review->>'coverageConfirmed' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Confirm that every cash and bank account is included in reconciliation';END IF;
 FOR x IN SELECT value FROM jsonb_array_elements(checkup->'issues') WHERE value->>'severity'='warning' LOOP
  answer=p_review->'acknowledgments'->(x->>'id');
  IF answer->>'acknowledged' IS DISTINCT FROM 'true' OR length(btrim(coalesce(answer->>'reason','')))<3 THEN RAISE EXCEPTION 'Acknowledge and explain: %',x->>'title';END IF;
 END LOOP;
 FOR x IN SELECT value FROM jsonb_array_elements(checkup->'balances') WHERE (value->>'cash_candidate')::boolean OR p_review->'reconciliations' ? (value->>'id') LOOP
  answer=p_review->'reconciliations'->(x->>'id');
  IF answer->>'actual' IS NULL OR answer->>'actual' !~ '^-?[0-9]+(\.[0-9]{1,2})?$' THEN RAISE EXCEPTION 'Enter a numeric actual balance for %',x->>'name';END IF;
  actual=(answer->>'actual')::numeric;
  IF p_kind<>'session' AND abs(actual-(x->>'balance')::numeric)>0.005 AND (answer->>'acknowledged' IS DISTINCT FROM 'true' OR length(btrim(coalesce(answer->>'reason','')))<3) THEN RAISE EXCEPTION 'Explain and acknowledge the balance difference for %',x->>'name';END IF;
 END LOOP;
 months=jsonb_build_array(to_char(p_month,'YYYY-MM'));
 IF p_kind='year' THEN
  months='[]';FOR m IN 1..12 LOOP
   d=make_date(p_year,m,1);months=months||jsonb_build_array(to_char(d,'YYYY-MM'));x=public.period_pending14317(d);
   acks=acks||jsonb_build_object(to_char(d,'YYYY-MM'),jsonb_build_object('revision',x->>'revision','acknowledged',true));
  END LOOP;
 END IF;
 PERFORM set_config('app.maintenance14324',jsonb_build_object('actor',auth.uid(),'months',months)::text,true);
 IF p_kind='period' THEN
  result=public.set_period_status14317(p_month,p_status,checkup->'pending'->>'revision',true);
 ELSIF p_kind='session' THEN
  SELECT p.period_month INTO book_month FROM public.book_sessions136 s JOIN public.accounting_periods p ON p.id=s.period_id WHERE s.id=p_session AND s.owner_id=auth.uid() AND s.status='editing';
  IF book_month IS DISTINCT FROM p_month THEN RAISE EXCEPTION 'Correction session month changed or session is unavailable';END IF;
  PERFORM public.ack_period14317(p_month,checkup->'pending'->>'revision',true);
  result=public.finish_book_session136(p_session,false);
  -- Reconcile against the committed correction, not the old pre-correction book.
  FOR x IN SELECT value FROM jsonb_array_elements(public.maintenance_preflight14324(p_month)->'balances') WHERE (value->>'cash_candidate')::boolean OR p_review->'reconciliations' ? (value->>'id') LOOP
   answer=p_review->'reconciliations'->(x->>'id');
   IF answer->>'expectedBalance' IS NULL OR (answer->>'expectedBalance')::numeric IS DISTINCT FROM (x->>'balance')::numeric THEN RAISE EXCEPTION 'Projected correction balances differ. Review the staged changes again.';END IF;
   IF abs((answer->>'actual')::numeric-(x->>'balance')::numeric)>0.005 AND (answer->>'acknowledged' IS DISTINCT FROM 'true' OR length(btrim(coalesce(answer->>'reason','')))<3) THEN RAISE EXCEPTION 'Explain and acknowledge the corrected balance difference for %',x->>'name';END IF;
  END LOOP;
 ELSE result=public.close_year14317(p_year,p_confirmation,p_year_fingerprint,acks);
 END IF;
 INSERT INTO public.audit_log(table_name,record_id,action,new_data,reason,actor_id) VALUES('accounting_periods',to_char(p_month,'YYYY-MM'),'MAINTENANCE_CLOSE',jsonb_build_object('kind',p_kind,'check',checkup,'review',p_review),'Closing checks and individual reconciliation acknowledgments',auth.uid());
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.guard_maintenance14324() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.maintenance_preflight14324(date),public.maintenance_snapshot14324(),public.maintenance_finish14324(date,text,text,jsonb,text,uuid,integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.maintenance_preflight14324(date),public.maintenance_snapshot14324(),public.maintenance_finish14324(date,text,text,jsonb,text,uuid,integer,text,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
