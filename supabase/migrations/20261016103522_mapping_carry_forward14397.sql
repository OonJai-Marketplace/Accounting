-- Mapping balances are carried as System, never closed as operating profit.
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
 IF EXISTS(SELECT 1 FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id WHERE e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)<end_date GROUP BY e.id,l.currency_code HAVING abs(sum(l.debit-l.credit))>0.005) THEN issues:=issues||jsonb_build_array('A posted transaction is unbalanced by currency');END IF;
 IF EXISTS(SELECT 1 FROM staff_journals WHERE period_start>=start_date AND period_start<end_date AND status IN ('draft','returned')) THEN warnings:=warnings||jsonb_build_array('Unsubmitted employee drafts are excluded from the ledger and carry-forward');END IF;
 IF EXISTS(SELECT 1 FROM payroll_runs WHERE period_start>=start_date AND period_start<end_date AND status='draft') THEN warnings:=warnings||jsonb_build_array('Draft payroll is excluded; confirm all actual payroll was posted');END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY code,currency),'[]') INTO b FROM (SELECT a.id account_id,a.code,a.name,CASE WHEN a.is_technical OR a.account_purpose<>'regular' THEN 'SYSTEM' ELSE a.account_type END type,l.currency_code currency,sum(l.debit-l.credit) balance,CASE WHEN bool_and(l.currency_code='LAK' OR (l.base_debit IS NOT NULL AND l.base_credit IS NOT NULL)) THEN sum(CASE WHEN l.currency_code='LAK' THEN l.debit-l.credit ELSE l.base_debit-l.base_credit END) END base_balance FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id JOIN accounts a ON a.id=l.account_id WHERE e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)<end_date GROUP BY a.id,a.code,a.name,a.account_type,l.currency_code HAVING sum(l.debit-l.credit)<>0) x;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(b) x WHERE upper(x->>'type') IN ('REVENUE','INCOME','EXPENSE') AND NOT EXISTS(SELECT 1 FROM accounts a WHERE a.account_type='EQUITY' AND a.parent_code='3100' AND a.is_active AND a.is_posting AND a.currency_code=x->>'currency')) THEN issues:=issues||jsonb_build_array('An active retained-earnings account is missing for a currency');END IF;
 RETURN jsonb_build_object('year',p_year,'nextYear',p_year+1,'transactions',n,'blockers',issues,'warnings',warnings,'balances',b,'fingerprint',md5(b::text));END $function$;

CREATE OR REPLACE FUNCTION public.close_year136(p_year integer, p_confirmation text, p_fingerprint text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE actor uuid:=public.require_admin136();checkup jsonb;cur text;r record;retained uuid;net numeric;entry uuid;ids jsonb:='[]';seq integer;prefix text;digits integer;numbering bigint;number_attempts integer;anchor uuid;result jsonb;BEGIN
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
  seq:=0;net:=0;
  FOR r IN SELECT value FROM jsonb_array_elements(checkup->'balances') WHERE value->>'currency'=cur AND upper(value->>'type') IN ('REVENUE','INCOME','EXPENSE') LOOP
   seq:=seq+1;net:=net+(r.value->>'balance')::numeric;
   INSERT INTO journal_lines(journal_entry_id,line_no,account_id,currency_code,debit,credit,line_date,description) VALUES(entry,seq,(r.value->>'account_id')::uuid,cur,greatest(0,-(r.value->>'balance')::numeric),greatest(0,(r.value->>'balance')::numeric),make_date(p_year,12,31),'Close income/expense balance');
  END LOOP;
  IF net<>0 THEN INSERT INTO journal_lines(journal_entry_id,line_no,account_id,currency_code,debit,credit,line_date,description) VALUES(entry,seq+1,retained,cur,greatest(net,0),greatest(-net,0),make_date(p_year,12,31),'Transfer annual result to retained earnings');END IF;
  ids:=ids||jsonb_build_array(entry);
 END LOOP;
 -- Empty months are finalized too, preventing later backdated entries into the completed year.
 INSERT INTO accounting_periods(period_month,status,closed_at,locked_at,updated_by) SELECT make_date(p_year,m,1),'locked',now(),now(),actor FROM generate_series(1,12) m ON CONFLICT(period_month) DO UPDATE SET status='locked',locked_at=now(),updated_by=actor,updated_at=now();
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY code,currency),'[]') INTO result FROM (SELECT a.id account_id,a.code,a.name,CASE WHEN a.is_technical OR a.account_purpose<>'regular' THEN 'SYSTEM' ELSE a.account_type END type,l.currency_code currency,sum(l.debit-l.credit) balance,CASE WHEN bool_and(l.currency_code='LAK' OR (l.base_debit IS NOT NULL AND l.base_credit IS NOT NULL)) THEN sum(CASE WHEN l.currency_code='LAK' THEN l.debit-l.credit ELSE l.base_debit-l.base_credit END) END base_balance FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id JOIN accounts a ON a.id=l.account_id WHERE e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)<make_date(p_year+1,1,1) GROUP BY a.id,a.code,a.name,a.account_type,l.currency_code HAVING sum(l.debit-l.credit)<>0) x;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(result) x WHERE upper(x->>'type') IN ('REVENUE','INCOME','EXPENSE')) THEN RAISE EXCEPTION 'Income or expense balance did not close';END IF;
 INSERT INTO year_closings136(year,actor,balances,closing_entries,anchor_entry) VALUES(p_year,actor,result,ids,anchor);
 INSERT INTO accounting_periods(period_month,status,updated_by) VALUES(make_date(p_year+1,1,1),'open',actor) ON CONFLICT(period_month) DO NOTHING;
 DELETE FROM accounting_operations136 WHERE backend=pg_backend_pid() AND transaction_id=txid_current();
 RETURN jsonb_build_object('completed',true,'year',p_year,'nextYear',p_year+1,'balances',result,'closingEntries',ids);
END $function$;
