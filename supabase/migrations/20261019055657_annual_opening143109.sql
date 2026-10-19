-- Explicit annual opening journals. No existing rows or historical checkpoints are changed.
BEGIN;
CREATE OR REPLACE FUNCTION public.annual_opening_status143109(p_year integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE entry uuid; lines jsonb:='[]'; closed boolean; archived boolean; BEGIN
 PERFORM public.require_admin136();
 IF NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Accounting workspace access required'; END IF;
 IF p_year IS NULL OR p_year NOT BETWEEN 1900 AND 2198 THEN RAISE EXCEPTION 'Invalid opening year'; END IF;
 SELECT e.id INTO entry FROM journal_entries e WHERE e.status='posted' AND extract(year FROM e.transaction_date)=p_year
 AND (e.reference='ANNUAL-OPENING-'||p_year OR e.memo IN ('Opening Balances','Annual opening balances '||p_year)) LIMIT 1;
 IF entry IS NOT NULL THEN SELECT jsonb_agg(jsonb_build_object('account_id',account_id,'debit',debit,'credit',credit,'fx_rate_lak',fx_rate_lak,'book_rate_lak',book_rate_lak) ORDER BY line_no) INTO lines FROM journal_lines WHERE journal_entry_id=entry; END IF;
 SELECT EXISTS(SELECT 1 FROM accounting_periods WHERE period_month=make_date(p_year,1,1) AND status<>'open') OR EXISTS(SELECT 1 FROM year_closings136 WHERE year=p_year) INTO closed;
 SELECT EXISTS(SELECT 1 FROM operation_receipts14228 r WHERE r.operation='journal' AND r.payload->0->>'p_memo'='Annual opening balances '||p_year AND NOT EXISTS(SELECT 1 FROM journal_entries e WHERE e.id=(r.result->0->>'entry_id')::uuid)) INTO archived;
 RETURN jsonb_build_object('available',entry IS NULL AND NOT closed AND NOT archived,'generation',(SELECT generation FROM opening_state14234 WHERE id),'entry_id',entry,'lines',coalesce(lines,'[]'),
 'reason',CASE WHEN entry IS NOT NULL THEN 'Opening balances are already saved for this year. Use a correcting journal for later adjustments.' WHEN archived THEN 'Opening balances for this year are archived. Restore its archive to review them.' WHEN closed THEN 'Reopen January before entering this year''s opening balances.' ELSE '' END);
END $$;
CREATE OR REPLACE FUNCTION public.post_annual_opening143109(p_year integer,p_generation uuid,p_request_key text,p_entries jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE s jsonb; r jsonb; l jsonb; rate numeric; receipt operation_receipts14228; BEGIN
 PERFORM public.require_admin136();
 IF NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Accounting workspace access required'; END IF;
 IF p_year IS NULL OR p_year NOT BETWEEN 1900 AND 2198 THEN RAISE EXCEPTION 'Invalid opening year'; END IF;
 LOCK TABLE journal_entries IN SHARE ROW EXCLUSIVE MODE;
 PERFORM 1 FROM opening_state14234 WHERE id FOR UPDATE;
 IF p_generation IS DISTINCT FROM (SELECT generation FROM opening_state14234 WHERE id) THEN RAISE EXCEPTION 'The ledger was reset. Reopen Annual Opening Balances.'; END IF;
 SELECT * INTO receipt FROM operation_receipts14228 WHERE actor_id=auth.uid() AND request_key=p_request_key;
 IF FOUND THEN
  IF receipt.operation<>'journal' OR receipt.payload IS DISTINCT FROM p_entries THEN RAISE EXCEPTION 'Posting reference already used for different data'; END IF;
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

-- Annual balance boundary; original access checks and historical records retained.
CREATE OR REPLACE FUNCTION public.journal_window14333(p_from date, p_to date, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE result jsonb; opening jsonb:='[]'; revision text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 IF p_from IS NULL OR p_to IS NULL OR p_from>p_to OR p_offset<0 THEN RAISE EXCEPTION 'Invalid journal period'; END IF;
 SELECT coalesce(jsonb_agg(row_to_json(r)),'[]') INTO result FROM (
 SELECT e.created_at,e.source,e.id AS "dbEntryId",coalesce(e.entry_no,e.id::text) AS id,
 coalesce(l.line_date,e.transaction_date) AS date,a.name AS account,a.id AS "accountId",a.code AS "accountCode",
 l.currency_code AS currency,coalesce(nullif(l.description,''),e.memo,'') AS memo,e.memo AS "generalMemo",
 (e.reference LIKE 'ANNUAL-OPENING-%' OR e.memo='Opening Balances') AS "annualOpening",l.debit,l.credit,l.fx_rate_lak,l.book_rate_lak,l.base_debit,l.base_credit,false AS archived
 FROM public.journal_entries e JOIN public.journal_lines l ON l.journal_entry_id=e.id
 LEFT JOIN public.accounts a ON a.id=l.account_id
 WHERE e.status='posted' AND coalesce(l.line_date,e.transaction_date) BETWEEN p_from AND p_to
 ORDER BY coalesce(l.line_date,e.transaction_date) DESC,e.id,l.line_no LIMIT 500 OFFSET p_offset
 ) r;
 IF p_offset=0 THEN
 SELECT coalesce(jsonb_agg(row_to_json(b)),'[]') INTO opening FROM (
 SELECT l.account_id AS "accountId",l.currency_code AS currency,sum(l.debit-l.credit) AS balance,CASE WHEN bool_or(l.base_debit IS NULL OR l.base_credit IS NULL) THEN NULL ELSE sum(l.base_debit-l.base_credit) END AS base_balance
 FROM public.journal_entries e JOIN public.journal_lines l ON l.journal_entry_id=e.id
 WHERE e.status='posted' AND coalesce(l.line_date,e.transaction_date)>=date_trunc('year',p_from)::date AND coalesce(l.line_date,e.transaction_date)<p_from
 GROUP BY l.account_id,l.currency_code HAVING sum(l.debit-l.credit)<>0 OR sum(l.base_debit-l.base_credit)<>0 OR bool_or(l.base_debit IS NULL OR l.base_credit IS NULL)
 ) b;
 END IF;
 SELECT md5(coalesce(sum(hashtextextended(concat_ws('|',e.id,e.entry_no,e.transaction_date,e.memo,e.status,e.updated_at,l.id,l.account_id,l.currency_code,l.debit,l.credit,l.line_date,l.description,l.fx_rate_lak,l.book_rate_lak),0)::numeric)::text,'0')) INTO revision
 FROM public.journal_entries e JOIN public.journal_lines l ON l.journal_entry_id=e.id WHERE e.status='posted' AND coalesce(l.line_date,e.transaction_date)<=p_to;
 RETURN jsonb_build_object('rows',result,'opening',opening,'revision',revision);
END $function$

;

-- Annual balance boundary; original access checks and historical records retained.
CREATE OR REPLACE FUNCTION public.year_preflight136(p_year integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE actor uuid:=public.require_admin136(); start_date date:=make_date(p_year,1,1);end_date date:=make_date(p_year+1,1,1);b jsonb;issues jsonb:='[]';warnings jsonb:='[]';n integer;BEGIN
 IF p_year NOT BETWEEN 1900 AND 2198 THEN RAISE EXCEPTION 'Invalid year';END IF;
 SELECT count(*) INTO n FROM journal_entries WHERE transaction_date>=start_date AND transaction_date<end_date AND status::text='posted';IF n=0 THEN issues:=issues||jsonb_build_array('No posted transactions in this year');END IF;
 IF EXISTS(SELECT 1 FROM year_closings136 WHERE year=p_year) THEN RETURN jsonb_build_object('year',p_year,'completed',true,'record',(SELECT to_jsonb(y) FROM year_closings136 y WHERE year=p_year));END IF;
 IF EXISTS(SELECT 1 FROM journal_entries e LEFT JOIN accounting_periods p ON p.period_month=date_trunc('month',e.transaction_date)::date WHERE e.transaction_date>=start_date AND e.transaction_date<end_date AND e.status::text='posted' AND p.status IS DISTINCT FROM 'locked') THEN issues:=issues||jsonb_build_array('Lock every month containing posted transactions');END IF;
 IF EXISTS(SELECT 1 FROM accounting_periods WHERE period_month>=start_date AND period_month<end_date AND status NOT IN ('closed','locked')) THEN issues:=issues||jsonb_build_array('Close or lock all existing period records in this year');END IF;
 IF EXISTS(SELECT 1 FROM book_sessions136 s JOIN accounting_periods p ON p.id=s.period_id WHERE s.status='editing' AND p.period_month>=start_date AND p.period_month<end_date) THEN issues:=issues||jsonb_build_array('Finish or cancel reopened books');END IF;
 IF EXISTS(SELECT 1 FROM entry_submissions WHERE transaction_date>=start_date AND transaction_date<end_date AND status::text IN ('pending','submitted')) OR EXISTS(SELECT 1 FROM staff_journals WHERE period_start>=start_date AND period_start<end_date AND status='submitted') THEN issues:=issues||jsonb_build_array('Resolve submitted entries awaiting approval');END IF;
 IF EXISTS(SELECT 1 FROM audit_reviews136 r JOIN accounting_periods p ON p.id=r.period_id WHERE p.period_month>=start_date AND p.period_month<end_date AND r.status='open') OR EXISTS(SELECT 1 FROM period_findings f JOIN accounting_periods p ON p.id=f.accounting_period_id WHERE p.period_month>=start_date AND p.period_month<end_date AND f.status NOT IN ('closed','corrected')) THEN issues:=issues||jsonb_build_array('Resolve outstanding review findings');END IF;
 IF EXISTS(SELECT 1 FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id WHERE e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)>=start_date AND coalesce(l.line_date,e.transaction_date)<end_date GROUP BY e.id,l.currency_code HAVING abs(sum(l.debit-l.credit))>0.005) THEN issues:=issues||jsonb_build_array('A posted transaction is unbalanced by currency');END IF;
 IF EXISTS(SELECT 1 FROM staff_journals WHERE period_start>=start_date AND period_start<end_date AND status IN ('draft','returned')) THEN warnings:=warnings||jsonb_build_array('Unsubmitted employee drafts are excluded from the ledger and carry-forward');END IF;
 IF EXISTS(SELECT 1 FROM payroll_runs WHERE period_start>=start_date AND period_start<end_date AND status='draft') THEN warnings:=warnings||jsonb_build_array('Draft payroll is excluded; confirm all actual payroll was posted');END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY code,currency),'[]') INTO b FROM (SELECT a.id account_id,a.code,a.name,CASE WHEN a.is_technical OR a.account_purpose<>'regular' THEN 'SYSTEM' ELSE a.account_type END type,l.currency_code currency,sum(l.debit-l.credit) balance,CASE WHEN bool_and(l.currency_code='LAK' OR (l.base_debit IS NOT NULL AND l.base_credit IS NOT NULL)) THEN sum(CASE WHEN l.currency_code='LAK' THEN l.debit-l.credit ELSE l.base_debit-l.base_credit END) END base_balance FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id JOIN accounts a ON a.id=l.account_id WHERE e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)>=start_date AND coalesce(l.line_date,e.transaction_date)<end_date GROUP BY a.id,a.code,a.name,a.account_type,l.currency_code HAVING sum(l.debit-l.credit)<>0 OR coalesce(sum(CASE WHEN l.currency_code='LAK' THEN l.debit-l.credit ELSE l.base_debit-l.base_credit END),0)<>0 OR NOT bool_and(l.currency_code='LAK' OR (l.base_debit IS NOT NULL AND l.base_credit IS NOT NULL))) x;
 -- Never invent missing rates or silently discard a residual LAK value.
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(b) x WHERE x->>'base_balance' IS NULL) THEN issues:=issues||jsonb_build_array('Complete missing saved LAK valuations before year-end closing');END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(b) x WHERE upper(x->>'type') IN ('REVENUE','INCOME','EXPENSE') AND x->>'currency'<>'LAK' AND ((x->>'balance')::numeric=0 OR (x->>'base_balance')::numeric/nullif((x->>'balance')::numeric,0)<=0)) THEN issues:=issues||jsonb_build_array('Reconcile foreign income/expense residual LAK values before closing');END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(b) x WHERE upper(x->>'type') IN ('REVENUE','INCOME','EXPENSE') AND x->>'currency'<>'LAK' GROUP BY x->>'currency' HAVING (sum((x->>'balance')::numeric)=0 AND sum((x->>'base_balance')::numeric)<>0) OR sum((x->>'balance')::numeric)*sum((x->>'base_balance')::numeric)<0) THEN issues:=issues||jsonb_build_array('Reconcile the foreign annual result and its LAK carrying value before closing');END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(b) x WHERE upper(x->>'type') IN ('REVENUE','INCOME','EXPENSE') AND NOT EXISTS(SELECT 1 FROM accounts a WHERE a.account_type='EQUITY' AND a.parent_code='3100' AND a.is_active AND a.is_posting AND a.currency_code=x->>'currency')) THEN issues:=issues||jsonb_build_array('An active retained-earnings account is missing for a currency');END IF;
 RETURN jsonb_build_object('year',p_year,'nextYear',p_year+1,'transactions',n,'blockers',issues,'warnings',warnings,'balances',b,'fingerprint',md5(b::text));END $function$

;

-- Annual balance boundary; original access checks and historical records retained.
CREATE OR REPLACE FUNCTION public.close_year136(p_year integer, p_confirmation text, p_fingerprint text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE actor uuid:=public.require_admin136();checkup jsonb;cur text;r record;retained uuid;net numeric;base_net numeric;carrying_rate numeric;entry uuid;ids jsonb:='[]';seq integer;prefix text;digits integer;numbering bigint;number_attempts integer;anchor uuid;result jsonb;BEGIN
 IF p_confirmation IS DISTINCT FROM 'CLOSE YEAR '||p_year THEN RAISE EXCEPTION 'Confirmation must be CLOSE YEAR %',p_year;END IF;
 PERFORM pg_advisory_xact_lock(136,p_year);LOCK TABLE accounting_periods,journal_entries,journal_lines,staff_journals,entry_submissions IN SHARE ROW EXCLUSIVE MODE;
 checkup:=public.year_preflight136(p_year);IF coalesce((checkup->>'completed')::boolean,false) THEN RETURN checkup;END IF;
 IF jsonb_array_length(checkup->'blockers')>0 THEN RAISE EXCEPTION 'Year-end checks failed: %',checkup->'blockers';END IF;
 IF p_fingerprint IS DISTINCT FROM checkup->>'fingerprint' THEN RAISE EXCEPTION 'Balances changed; run the year-end checks again';END IF;
 SELECT id INTO anchor FROM journal_entries WHERE extract(year FROM transaction_date)=p_year AND status::text='posted' ORDER BY transaction_date LIMIT 1;
 SELECT journal_prefix,journal_digits INTO prefix,digits FROM accounting_id_settings WHERE id=true;prefix:=coalesce(nullif(prefix,''),'JRN');digits:=greatest(3,least(9,coalesce(digits,6)));
 INSERT INTO accounting_operations136 VALUES(pg_backend_pid(),txid_current(),actor);
 -- Authorised system closing only. Locked user records stay immutable.
 UPDATE accounting_periods SET status='open' WHERE period_month=make_date(p_year,12,1);
 INSERT INTO accounting_periods(period_month,status,updated_by) VALUES(make_date(p_year,12,1),'open',actor) ON CONFLICT(period_month) DO NOTHING;
 FOR cur IN SELECT DISTINCT value->>'currency' FROM jsonb_array_elements(checkup->'balances') WHERE upper(value->>'type') IN ('REVENUE','INCOME','EXPENSE') LOOP
  SELECT id INTO retained FROM accounts WHERE parent_code='3100' AND account_type='EQUITY' AND currency_code=cur AND is_posting AND is_active ORDER BY code LIMIT 1;
  number_attempts:=0;
  LOOP
   number_attempts:=number_attempts+1;
   IF number_attempts>1000 THEN RAISE EXCEPTION 'Unable to allocate a unique journal number'; END IF;
   numbering:=nextval('public.journal_entry_number_seq');
   EXIT WHEN NOT EXISTS(SELECT 1 FROM journal_entries WHERE entry_no=prefix||'-'||lpad(numbering::text,greatest(digits,length(numbering::text)),'0'));
  END LOOP;
  INSERT INTO journal_entries(entry_no,transaction_date,memo,reference,status,source,posted_by,posted_at,accounting_period_id)
  VALUES(prefix||'-'||lpad(numbering::text,greatest(digits,length(numbering::text)),'0'),make_date(p_year,12,31),'Year-end closing '||p_year||' · '||cur,'YEAR-CLOSE-'||p_year||'-'||cur,'posted','system',actor,now(),(SELECT id FROM accounting_periods WHERE period_month=make_date(p_year,12,1))) RETURNING id INTO entry;
  seq:=0;net:=0;base_net:=0;
  FOR r IN SELECT value FROM jsonb_array_elements(checkup->'balances') WHERE value->>'currency'=cur AND upper(value->>'type') IN ('REVENUE','INCOME','EXPENSE') AND (value->>'balance')::numeric<>0 LOOP
   seq:=seq+1;net:=net+(r.value->>'balance')::numeric;base_net:=base_net+(r.value->>'base_balance')::numeric;carrying_rate:=CASE WHEN cur='LAK' THEN 1 ELSE (r.value->>'base_balance')::numeric/nullif((r.value->>'balance')::numeric,0) END;
   INSERT INTO journal_lines(journal_entry_id,line_no,account_id,currency_code,debit,credit,line_date,description,book_rate_lak) VALUES(entry,seq,(r.value->>'account_id')::uuid,cur,greatest(0,-(r.value->>'balance')::numeric),greatest(0,(r.value->>'balance')::numeric),make_date(p_year,12,31),'Close income/expense balance',carrying_rate);
  END LOOP;
  IF net<>0 THEN INSERT INTO journal_lines(journal_entry_id,line_no,account_id,currency_code,debit,credit,line_date,description,book_rate_lak) VALUES(entry,seq+1,retained,cur,greatest(net,0),greatest(-net,0),make_date(p_year,12,31),'Transfer annual result to retained earnings',CASE WHEN cur='LAK' THEN 1 ELSE base_net/net END);END IF;
  ids:=ids||jsonb_build_array(entry);
 END LOOP;
 IF EXISTS(SELECT 1 FROM journal_lines WHERE journal_entry_id IN (SELECT value::uuid FROM jsonb_array_elements_text(ids)) GROUP BY journal_entry_id HAVING sum(base_debit-base_credit)<>0) THEN RAISE EXCEPTION 'Closing LAK values did not balance; reconcile carrying values before closing';END IF;
 -- Empty months are finalized too, preventing later backdated entries into the completed year.
 INSERT INTO accounting_periods(period_month,status,closed_at,locked_at,updated_by) SELECT make_date(p_year,m,1),'locked',now(),now(),actor FROM generate_series(1,12) m ON CONFLICT(period_month) DO UPDATE SET status='locked',locked_at=now(),updated_by=actor,updated_at=now();
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY code,currency),'[]') INTO result FROM (SELECT a.id account_id,a.code,a.name,CASE WHEN a.is_technical OR a.account_purpose<>'regular' THEN 'SYSTEM' ELSE a.account_type END type,l.currency_code currency,sum(l.debit-l.credit) balance,CASE WHEN bool_and(l.currency_code='LAK' OR (l.base_debit IS NOT NULL AND l.base_credit IS NOT NULL)) THEN sum(CASE WHEN l.currency_code='LAK' THEN l.debit-l.credit ELSE l.base_debit-l.base_credit END) END base_balance FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id JOIN accounts a ON a.id=l.account_id WHERE e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)>=make_date(p_year,1,1) AND coalesce(l.line_date,e.transaction_date)<make_date(p_year+1,1,1) GROUP BY a.id,a.code,a.name,a.account_type,l.currency_code HAVING sum(l.debit-l.credit)<>0 OR coalesce(sum(CASE WHEN l.currency_code='LAK' THEN l.debit-l.credit ELSE l.base_debit-l.base_credit END),0)<>0 OR NOT bool_and(l.currency_code='LAK' OR (l.base_debit IS NOT NULL AND l.base_credit IS NOT NULL))) x;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(result) x WHERE upper(x->>'type') IN ('REVENUE','INCOME','EXPENSE') AND ((x->>'balance')::numeric<>0 OR coalesce((x->>'base_balance')::numeric,1)<>0)) THEN RAISE EXCEPTION 'Income or expense balance did not close';END IF;
 INSERT INTO year_closings136(year,actor,balances,closing_entries,anchor_entry) VALUES(p_year,actor,result,ids,anchor);
 INSERT INTO accounting_periods(period_month,status,updated_by) VALUES(make_date(p_year+1,1,1),'open',actor) ON CONFLICT(period_month) DO NOTHING;
 DELETE FROM accounting_operations136 WHERE backend=pg_backend_pid() AND transaction_id=txid_current();
 RETURN jsonb_build_object('completed',true,'year',p_year,'nextYear',p_year+1,'balances',result,'closingEntries',ids);
END $function$

;

-- Annual balance boundary; original access checks and historical records retained.
CREATE OR REPLACE FUNCTION public.assigned_ledger14281(p_owner uuid, p_account uuid DEFAULT NULL::uuid, p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE ids uuid[]; opening numeric; closing numeric; rows jsonb; account_list jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.accounting_workspace_allowed123() OR NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND status='active') OR NOT EXISTS(SELECT 1 FROM profiles WHERE id=p_owner AND status='active') OR NOT (auth.uid()=p_owner OR (EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin' AND status='active') AND public.can_workspace113(p_owner))) THEN RAISE EXCEPTION 'This ledger is not accessible' USING ERRCODE='42501'; END IF;
 SELECT ledger_account_ids14281 INTO ids FROM user_permissions WHERE user_id=p_owner;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'code',code,'name',name,'currency',currency_code) ORDER BY code),'[]') INTO account_list FROM accounts WHERE id=ANY(coalesce(ids,'{}')) AND is_posting;
 IF p_account IS NULL THEN RETURN jsonb_build_object('accounts',account_list); END IF;
 IF NOT coalesce(p_account=ANY(ids),false) THEN RAISE EXCEPTION 'Ledger account not assigned' USING ERRCODE='42501'; END IF;
 IF p_from IS NULL OR p_to IS NULL OR p_to<p_from OR p_to>p_from+366 OR p_offset IS NULL OR p_offset<0 THEN RAISE EXCEPTION 'Choose a valid monthly or quarterly period'; END IF;
 SELECT coalesce(sum(l.debit-l.credit),0) INTO opening FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id WHERE l.account_id=p_account AND e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)>=date_trunc('year',p_from)::date AND coalesce(l.line_date,e.transaction_date)<p_from;
 SELECT opening+coalesce(sum(l.debit-l.credit),0) INTO closing FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id WHERE l.account_id=p_account AND e.status::text='posted' AND coalesce(l.line_date,e.transaction_date) BETWEEN p_from AND p_to;
 WITH running AS (
 SELECT l.id,coalesce(l.line_date,e.transaction_date) AS date,e.entry_no AS reference,e.memo AS general_description,coalesce(nullif(l.description,''),e.memo,'') AS description,l.debit,l.credit,
 opening+sum(l.debit-l.credit) OVER(ORDER BY coalesce(l.line_date,e.transaction_date),e.created_at,e.id,l.line_no,l.id) AS balance,
 row_number() OVER(ORDER BY coalesce(l.line_date,e.transaction_date),e.created_at,e.id,l.line_no,l.id) AS ordinal
 FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id
 WHERE l.account_id=p_account AND e.status::text='posted' AND coalesce(l.line_date,e.transaction_date) BETWEEN p_from AND p_to
 ), page AS (SELECT * FROM running ORDER BY ordinal LIMIT 500 OFFSET p_offset)
 SELECT coalesce(jsonb_agg(to_jsonb(page) ORDER BY ordinal),'[]') INTO rows FROM page;
 RETURN jsonb_build_object('accounts',account_list,'opening',opening,'closing',closing,'rows',rows);
END $function$

;

-- Annual balance boundary; original access checks and historical records retained.
CREATE OR REPLACE FUNCTION public.fund_balances136(p_owner uuid, p_month date DEFAULT NULL::date)
 RETURNS TABLE(account_id uuid, name text, currency text, opening numeric, received numeric, used numeric, handover numeric, closing numeric, draft_in numeric, draft_out numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE actor uuid:=auth.uid();BEGIN
 IF NOT public.can_workspace113(p_owner) THEN RAISE EXCEPTION 'Current workspace access required';END IF;
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=actor AND status='active') THEN RAISE EXCEPTION 'Active account required';END IF;
 RETURN QUERY SELECT a.id,a.name,a.currency_code,
 coalesce(sum(l.debit-l.credit) FILTER(WHERE p_month IS NOT NULL AND coalesce(l.line_date,e.transaction_date)<p_month),0),
 coalesce(sum(l.debit) FILTER(WHERE p_month IS NULL OR coalesce(l.line_date,e.transaction_date)>=p_month),0),
 coalesce(sum(l.credit) FILTER(WHERE p_month IS NULL OR coalesce(l.line_date,e.transaction_date)>=p_month),0),0::numeric,
 coalesce(sum(l.debit-l.credit),0),
 coalesce((SELECT sum(s.amount) FROM staff_journal_lines s JOIN staff_journals j ON j.id=s.staff_journal_id JOIN accounts counterpart ON counterpart.id=s.account_id WHERE j.owner_id=p_owner AND j.status IN ('draft','returned','submitted') AND s.journal_entry_id IS NULL AND s.fund_account_id=a.id AND s.direction='in' AND counterpart.account_type<>'ASSET' AND (p_month IS NULL OR date_trunc('month',s.transaction_date)::date=p_month)),0),
 coalesce((SELECT sum(s.amount) FROM staff_journal_lines s JOIN staff_journals j ON j.id=s.staff_journal_id WHERE j.owner_id=p_owner AND j.status IN ('draft','returned','submitted') AND s.journal_entry_id IS NULL AND s.fund_account_id=a.id AND s.direction='out' AND (p_month IS NULL OR date_trunc('month',s.transaction_date)::date=p_month)),0)
 FROM accounts a JOIN user_permissions up ON up.user_id=p_owner AND a.id::text IN(SELECT jsonb_array_elements_text(coalesce(to_jsonb(up)->'assigned_fund_account_ids','[]')))
 LEFT JOIN journal_lines l ON l.account_id=a.id AND EXISTS(SELECT 1 FROM journal_entries h WHERE h.id=l.journal_entry_id AND h.status::text='posted' AND coalesce(l.line_date,h.transaction_date)>=date_trunc('year',coalesce(p_month,current_date))::date AND (p_month IS NULL OR coalesce(l.line_date,h.transaction_date)<(p_month+interval '1 month')::date))
 LEFT JOIN journal_entries e ON e.id=l.journal_entry_id GROUP BY a.id,a.name,a.currency_code ORDER BY a.code;
END $function$

;

-- Annual balance boundary; original access checks and historical records retained.
CREATE OR REPLACE FUNCTION public._fund_summary113(p_owner uuid, p_month date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare result jsonb;start_date date;end_date date;
begin

 start_date:=date_trunc('month',p_month)::date;end_date:=(start_date+interval '1 month')::date;
 with assigned as (
 select a.id,a.name,coalesce(to_jsonb(a)->>'currency_code',to_jsonb(a)->>'currency','LAK') currency
 from public.accounts a join public.user_permissions u on u.user_id=p_owner
 where coalesce(to_jsonb(u)->'assigned_fund_account_ids','[]') ? a.id::text
 ),ledger as (
 select a.id,a.name,a.currency,
 coalesce(sum(l.debit-l.credit) filter(where start_date is not null and coalesce(l.line_date,j.transaction_date)<start_date),0) opening,
 coalesce(sum(l.debit) filter(where start_date is null or coalesce(l.line_date,j.transaction_date)>=start_date),0) received,
 coalesce(sum(l.credit) filter(where start_date is null or coalesce(l.line_date,j.transaction_date)>=start_date),0) outflow,
 coalesce(sum(l.debit-l.credit),0) closing
 from assigned a left join (public.journal_lines l join public.journal_entries j on j.id=l.journal_entry_id and j.status='posted') on l.account_id=a.id and coalesce(l.line_date,j.transaction_date)>=date_trunc('year',coalesce(p_month,current_date))::date and (end_date is null or coalesce(l.line_date,j.transaction_date)<end_date)
 group by a.id,a.name,a.currency
 ),drafts as (
 select l.fund_account_id,coalesce(sum(l.amount) filter(where l.direction='in'),0) draft_in,coalesce(sum(l.amount) filter(where l.direction<>'in'),0) draft_out
 from public.staff_journal_lines l join public.staff_journals j on j.id=l.staff_journal_id where j.owner_id=p_owner and j.status in ('draft','returned','submitted','approved_pending_post') and (start_date is null or l.transaction_date>=start_date and l.transaction_date<end_date) group by l.fund_account_id
 ),handovers as (
 select l.fund_account_id,sum(l.amount) amount from public.staff_journal_lines l join public.staff_journals s on s.id=l.staff_journal_id
 where s.owner_id=p_owner and s.status='posted' and to_jsonb(l)->>'entry_kind'='handover'
 and (start_date is null or l.transaction_date>=start_date and l.transaction_date<end_date)
 and exists(select 1 from public.journal_entries j where j.status='posted' and j.id::text in (to_jsonb(s)->>'posted_journal_entry_id',to_jsonb(s)->>'journal_entry_id',to_jsonb(l)->>'journal_entry_id',to_jsonb(l)->>'posted_journal_entry_id')) group by l.fund_account_id
 )
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from (
 select g.*,least(greatest(coalesce(h.amount,0),0),g.outflow) handover,g.outflow-least(greatest(coalesce(h.amount,0),0),g.outflow) used,coalesce(d.draft_in,0) draft_in,coalesce(d.draft_out,0) draft_out from ledger g left join drafts d on d.fund_account_id=g.id left join handovers h on h.fund_account_id=g.id
 ) x;
 return result;
end $function$

;

-- Annual balance boundary; original access checks and historical records retained.
CREATE OR REPLACE FUNCTION public.capture_report_funds14254()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE period date; balances jsonb;
BEGIN
 period := (NEW.snapshot->'journal'->>'period_start')::date;
 IF period IS NULL THEN RAISE EXCEPTION 'Report period is required'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO balances FROM (
  SELECT a.id account_id,a.name,a.currency_code currency,
   coalesce(sum(l.debit-l.credit) FILTER(WHERE coalesce(l.line_date,e.transaction_date)<period),0) opening,
   coalesce(sum(l.debit) FILTER(WHERE coalesce(l.line_date,e.transaction_date)>=period),0) received,
   coalesce(sum(l.credit) FILTER(WHERE coalesce(l.line_date,e.transaction_date)>=period),0) used,
   0::numeric handover,coalesce(sum(l.debit-l.credit),0) closing
  FROM public.accounts a
  LEFT JOIN public.journal_lines l ON l.account_id=a.id AND EXISTS(
   SELECT 1 FROM public.journal_entries h WHERE h.id=l.journal_entry_id AND h.status::text='posted' AND coalesce(l.line_date,h.transaction_date)>=date_trunc('year',period)::date
   AND coalesce(l.line_date,h.transaction_date)<(period+interval '1 month')::date)
  LEFT JOIN public.journal_entries e ON e.id=l.journal_entry_id
  WHERE a.id IN (SELECT s.fund_account_id FROM public.staff_journal_lines s WHERE s.staff_journal_id=NEW.journal_id)
   OR a.id::text IN (SELECT jsonb_array_elements_text(coalesce(to_jsonb(up)->'assigned_fund_account_ids','[]'::jsonb))
     FROM public.user_permissions up WHERE up.user_id=NEW.owner_id)
  GROUP BY a.id,a.name,a.currency_code,a.code ORDER BY a.code
 ) t;
 NEW.snapshot := NEW.snapshot || jsonb_build_object(
  'fund_snapshot14254',coalesce(balances,'[]'::jsonb),
  'fund_snapshot_at14254',now());
 RETURN NEW;
END $function$

;

-- Annual balance boundary; original access checks and historical records retained.
CREATE OR REPLACE FUNCTION public.submission_context14345(p_journal uuid, p_as_of date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE j public.staff_journals; day date; today date=(statement_timestamp() AT TIME ZONE 'Asia/Vientiane')::date; funds jsonb; fingerprint text;
BEGIN
 SELECT * INTO j FROM public.staff_journals WHERE id=p_journal;
 IF auth.uid() IS NULL OR NOT FOUND OR NOT public.can_workspace113(j.owner_id) OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND status='active')
  OR NOT public.can_action113(CASE WHEN j.owner_id=auth.uid() THEN 'sub-users-workspace' ELSE 'user-entry-review' END,'edit') THEN RAISE EXCEPTION 'Workspace submission access required';END IF;
 IF j.status NOT IN ('draft','returned') THEN RAISE EXCEPTION 'This report is no longer available for submission';END IF;
 day=coalesce(p_as_of,least(today,j.period_end));
 IF day<j.period_start OR day>j.period_end OR day>today OR EXISTS(SELECT 1 FROM public.staff_journal_lines WHERE staff_journal_id=j.id AND transaction_date>day) THEN RAISE EXCEPTION 'Choose a reconciliation date covering every report entry, within the reporting period and no later than today';END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(f) ORDER BY f.code),'[]') INTO funds FROM (
  SELECT a.id account_id,a.code,a.name,a.currency_code currency,a.account_type,
   coalesce((SELECT sum(l.debit-l.credit) FROM public.journal_lines l JOIN public.journal_entries e ON e.id=l.journal_entry_id WHERE l.account_id=a.id AND e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)>=date_trunc('year',day)::date AND coalesce(l.line_date,e.transaction_date)<=day),0) posted,
   coalesce((SELECT sum(CASE WHEN s.direction='out' THEN -s.amount ELSE s.amount END) FROM public.staff_journal_lines s JOIN public.staff_journals h ON h.id=s.staff_journal_id JOIN public.accounts counterpart ON counterpart.id=s.account_id WHERE h.owner_id=j.owner_id AND h.status IN ('draft','returned','submitted') AND s.journal_entry_id IS NULL AND s.fund_account_id=a.id AND s.transaction_date<=day AND (s.direction='out' OR counterpart.account_type<>'ASSET')),0) unposted
  FROM public.accounts a JOIN public.user_permissions up ON up.user_id=j.owner_id AND a.id::text IN (SELECT jsonb_array_elements_text(coalesce(to_jsonb(up)->'assigned_fund_account_ids','[]')))
  WHERE a.is_posting AND a.account_type='ASSET'
 ) f;
 -- Fingerprint includes source details, so equal-amount edits also invalidate review.
 SELECT md5(jsonb_build_object('journal',to_jsonb(j)-'reconciliation14345','date',day,'funds',funds,
  'lines',(SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.id),'[]') FROM public.staff_journal_lines s JOIN public.staff_journals h ON h.id=s.staff_journal_id WHERE h.owner_id=j.owner_id AND s.transaction_date<=day AND (h.status IN ('draft','returned','submitted') OR h.id=j.id)))::text) INTO fingerprint;
 RETURN jsonb_build_object('journal',j.id,'owner',j.owner_id,'asOf',day,'fingerprint',fingerprint,'funds',funds,'responsible',(SELECT full_name FROM public.profiles WHERE id=j.owner_id));
END $function$

;

-- Annual balance boundary; original access checks and historical records retained.
CREATE OR REPLACE FUNCTION public.branch_home14229()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE people jsonb;balances jsonb; reports jsonb;
BEGIN
 IF NOT public.can_action113('sub-users-home14229','view') THEN RAISE EXCEPTION 'Main Home permission required';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'full_name',p.full_name,'email',p.email,
 'can_open',public.can_workspace113(p.id),'user_permissions',jsonb_build_object('job_title',u.job_title,'department14229',u.department14229,
 'manager_id',u.manager_id,'assigned_fund_account_ids',u.assigned_fund_account_ids))), '[]') INTO people
 FROM profiles p JOIN user_permissions u ON u.user_id=p.id WHERE p.status='active' AND (p.role<>'admin' OR p.id=auth.uid())
 AND public.in_branch14229(p.id);
 SELECT coalesce(jsonb_object_agg(owner,rows),'{}') INTO balances FROM (
 SELECT u.user_id::text owner,jsonb_agg(jsonb_build_object('account_id',a.id,'name',a.name,'currency',a.currency_code,
 'opening',0,'received',coalesce(s.dr,0),'used',coalesce(s.cr,0),'handover',0,'closing',coalesce(s.dr,0)-coalesce(s.cr,0))) rows
 FROM user_permissions u JOIN profiles p ON p.id=u.user_id AND p.status='active'
 JOIN accounts a ON a.id=ANY(u.assigned_fund_account_ids)
 LEFT JOIN LATERAL (SELECT sum(l.debit) dr,sum(l.credit) cr FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id WHERE l.account_id=a.id AND e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)>=date_trunc('year',current_date)::date) s ON true
 WHERE public.in_branch14229(u.user_id) GROUP BY u.user_id) q;
 SELECT coalesce(jsonb_agg(to_jsonb(j)||jsonb_build_object('review_route14229',to_jsonb(r))),'[]') INTO reports
 FROM staff_journals j LEFT JOIN review_routes14229 r ON r.journal_id=j.id
 WHERE public.in_branch14229(j.owner_id) AND public.can_action113('user-entry-review','view') AND public.journal_visible14229(j.id);
 RETURN jsonb_build_object('users',people,'balances',balances,'reports',reports);
END $function$

;
COMMIT;
