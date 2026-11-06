-- Required monthly reconciliations. Reports never post or change ledger entries.
BEGIN;
CREATE TABLE private.reconciliation_settings305 (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), revision integer NOT NULL DEFAULT 0,
 preferences jsonb, updated_by uuid, updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO private.reconciliation_settings305(singleton) VALUES(true);
CREATE TABLE private.reconciliation_records305 (
 record_id text PRIMARY KEY, owner_id uuid NOT NULL, account_id uuid NOT NULL REFERENCES public.accounts(id),
 period_from date NOT NULL, period_to date NOT NULL, method text NOT NULL CHECK(method IN('bank','cash','balance')),
 basis text NOT NULL CHECK(basis IN('receipt','posting')), fingerprint text NOT NULL,
 report jsonb NOT NULL, saved_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reconciliation_match305 ON private.reconciliation_records305(account_id,period_from,period_to,method,saved_at DESC);
CREATE TABLE private.reconciliation_periods305(month date PRIMARY KEY, requirements jsonb NOT NULL);
ALTER TABLE private.reconciliation_settings305 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.reconciliation_records305 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.reconciliation_periods305 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.reconciliation_settings305,private.reconciliation_records305,private.reconciliation_periods305 FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.reconciliation_admin305() RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND status='active') OR NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Active accounting administrator required'; END IF;
END $$;

CREATE FUNCTION public.reconciliation_preferences305(p_preferences jsonb DEFAULT NULL,p_revision integer DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s private.reconciliation_settings305;
BEGIN
 PERFORM private.reconciliation_admin305();
 SELECT * INTO s FROM private.reconciliation_settings305 WHERE singleton FOR UPDATE;
 IF p_preferences IS NOT NULL THEN
  IF p_revision IS DISTINCT FROM s.revision THEN RAISE EXCEPTION 'Reconciliation list changed on another device. Reopen the account list.'; END IF;
  IF jsonb_typeof(p_preferences)<>'object' OR octet_length(p_preferences::text)>100000 THEN RAISE EXCEPTION 'Invalid reconciliation list'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_each(p_preferences) e WHERE e.key<>'__excluded305' AND e.value#>>'{}' NOT IN('bank','cash','balance')) OR (p_preferences ? '__excluded305' AND jsonb_typeof(p_preferences->'__excluded305')<>'array') THEN RAISE EXCEPTION 'Invalid reconciliation method'; END IF;
  UPDATE private.reconciliation_settings305 SET preferences=p_preferences,revision=revision+1,updated_by=auth.uid(),updated_at=now() WHERE singleton RETURNING * INTO s;
 END IF;
 RETURN jsonb_build_object('preferences',s.preferences,'revision',s.revision);
END $$;

CREATE FUNCTION private.reconciliation_requirements305(p_month date) RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT coalesce((SELECT requirements FROM private.reconciliation_periods305 WHERE month=p_month),
 (SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'code',a.code,'name',a.name,'currency',a.currency_code,'method',coalesce(s.preferences->>(a.id::text||'|'||a.currency_code),CASE WHEN a.account_type='ASSET' AND a.name~*'\m(BCEL|bank)\M' THEN 'bank' WHEN a.account_type='ASSET' AND a.name~*'(cash on hand|petty cash|cashier float|^cash$)' THEN 'cash' ELSE 'balance' END)) ORDER BY a.code),'[]')
 FROM public.accounts a CROSS JOIN private.reconciliation_settings305 s
 WHERE a.is_posting AND NOT a.is_technical AND a.currency_code<>'NA'
 AND (a.code IN('1040','1041','1010','1011','1012','1030','1020','9051') OR s.preferences ? (a.id::text||'|'||a.currency_code))
 AND NOT coalesce(s.preferences->'__excluded305','[]') ? (a.id::text||'|'||a.currency_code)))
$$;

-- Financial fingerprint excludes descriptions, row UUIDs and unrelated accounts.
-- Replacing a journal with the same dated account movements keeps its reconciliation.
CREATE FUNCTION private.reconciliation_snapshot305(p_account uuid,p_from date,p_to date,p_basis text,p_session uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE a public.accounts; ops jsonb='[]'; item record; baseline date; effective date; opening numeric=0; debit numeric=0; credit numeric=0; dr numeric; cr numeric; lines jsonb='[]'; movements jsonb='[]'; result jsonb;
BEGIN
 SELECT * INTO a FROM public.accounts WHERE id=p_account AND is_posting AND NOT is_technical;
 IF a.id IS NULL OR p_from IS NULL OR p_to IS NULL OR p_to<p_from OR p_basis NOT IN('posting','receipt') THEN RAISE EXCEPTION 'Invalid reconciliation account or period'; END IF;
 IF p_session IS NOT NULL THEN
  SELECT s.operations INTO ops FROM public.book_sessions136 s JOIN public.accounting_periods p ON p.id=s.period_id WHERE s.id=p_session AND s.owner_id=auth.uid() AND s.status='editing' AND p.period_month=date_trunc('month',p_to)::date;
  IF ops IS NULL THEN RAISE EXCEPTION 'Correction session is no longer available'; END IF;
 END IF;
 WITH operations AS (SELECT value op,ordinality n FROM jsonb_array_elements(ops) WITH ORDINALITY), latest AS (
 SELECT DISTINCT ON(coalesce(op->'payload'->>'p_entry_id',op->>'id')) op,n FROM operations ORDER BY coalesce(op->'payload'->>'p_entry_id',op->>'id'),n DESC), source AS (
 SELECT e.id::text entry_id,e.entry_no,coalesce(l.line_date,e.transaction_date) posting_date,coalesce(nullif(l.description,''),e.memo,'') memo,coalesce(e.memo,'') general_memo,coalesce(e.reference,'') reference,l.debit,l.credit
 FROM public.journal_lines l JOIN public.journal_entries e ON e.id=l.journal_entry_id WHERE l.account_id=p_account AND l.currency_code=a.currency_code AND e.status='posted' AND NOT EXISTS(SELECT 1 FROM latest o WHERE o.op->'payload'->>'p_entry_id'=e.id::text)
 UNION ALL SELECT coalesce(o.op->'payload'->>'p_entry_id','preview:'||(o.op->>'id')),coalesce(e.entry_no,'Pending correction'),coalesce(nullif(l->>'line_date','')::date,(o.op->'payload'->>'p_transaction_date')::date),coalesce(l->>'description',o.op->'payload'->>'p_memo',''),coalesce(o.op->'payload'->>'p_memo',''),coalesce(e.reference,''),coalesce((l->>'debit')::numeric,0),coalesce((l->>'credit')::numeric,0)
 FROM latest o CROSS JOIN LATERAL jsonb_array_elements(o.op->'payload'->'p_lines') l LEFT JOIN public.journal_entries e ON e.id::text=o.op->'payload'->>'p_entry_id'
 WHERE o.op->>'kind' IN('post','revise') AND l->>'account_id'=p_account::text AND coalesce(l->>'currency_code',a.currency_code)=a.currency_code)
 SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.posting_date,s.entry_no,s.debit,s.credit),'[]') INTO movements FROM source s;
 SELECT max((x->>'posting_date')::date) INTO baseline FROM jsonb_array_elements(movements) x WHERE (x->>'reference' LIKE 'ANNUAL-OPENING-%' OR x->>'general_memo' LIKE 'Annual opening balances %' OR x->>'general_memo'='Opening Balances') AND (x->>'posting_date')::date<=p_from;
 FOR item IN SELECT *,reference LIKE 'ANNUAL-OPENING-%' OR general_memo LIKE 'Annual opening balances %' OR general_memo='Opening Balances' annual FROM jsonb_to_recordset(movements) AS x(entry_id text,entry_no text,posting_date date,memo text,general_memo text,reference text,debit numeric,credit numeric) LOOP
  dr=round(item.debit*100);cr=round(item.credit*100);effective=item.posting_date;
  IF p_basis='posting' AND date_trunc('year',p_from)=date_trunc('year',p_to) THEN
   IF effective>p_to OR effective<date_trunc('year',p_to)::date THEN CONTINUE; END IF;
   IF item.annual OR effective<p_from THEN opening=opening+dr-cr;CONTINUE;END IF;
  ELSE
   IF item.annual THEN IF item.posting_date=baseline THEN opening=opening+dr-cr;END IF;CONTINUE; END IF;
   IF p_basis='receipt' THEN SELECT coalesce((array_agg(m[1]))[count(*)::integer],item.posting_date::text)::date INTO effective FROM regexp_matches(item.memo,'\[Receipt date: ([0-9]{4}-[0-9]{2}-[0-9]{2})\]','g') m; END IF;
   IF baseline IS NOT NULL AND item.posting_date<baseline THEN IF effective<baseline THEN CONTINUE;END IF;opening=opening-dr+cr;END IF;
   IF effective>p_to THEN CONTINUE; END IF;
   IF effective<p_from THEN opening=opening+dr-cr;CONTINUE;END IF;
  END IF;
  debit=debit+dr;credit=credit+cr;
  lines=lines||jsonb_build_array(jsonb_build_object('id',item.entry_no,'dbEntryId',item.entry_id,'date',effective,'postingDate',item.posting_date,'memo',item.memo,'generalMemo',item.general_memo,'currency',a.currency_code,'debit',dr/100,'credit',cr/100,'dr',dr,'cr',cr));
 END LOOP;
 SELECT coalesce(jsonb_agg(x ORDER BY x->>'date',x->>'id'),'[]') INTO lines FROM jsonb_array_elements(lines) x;
 result=jsonb_build_object('opening',opening,'debit',debit,'credit',credit,'closing',opening+debit-credit,'lines',lines,'dateBasis',p_basis,'session',p_session);
 SELECT coalesce(jsonb_agg(jsonb_build_array(x->>'date',x->>'postingDate',(x->>'dr')::numeric,(x->>'cr')::numeric) ORDER BY x->>'date',x->>'postingDate',(x->>'dr')::numeric,(x->>'cr')::numeric),'[]') INTO movements FROM jsonb_array_elements(lines) x;
 RETURN result||jsonb_build_object('fingerprint',md5(jsonb_build_array(p_account,p_from,p_to,p_basis,a.currency_code,opening,debit,credit,movements)::text));
END $$;

CREATE FUNCTION private.reconciliation_session305(p_month date) RETURNS uuid LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT s.id FROM public.book_sessions136 s JOIN public.accounting_periods p ON p.id=s.period_id WHERE s.owner_id=auth.uid() AND s.status='editing' AND p.period_month=p_month AND coalesce(current_setting('app.reconciliation305.committing',true),'')<>'true' ORDER BY s.created_at DESC LIMIT 1
$$;
CREATE FUNCTION public.reconciliation_snapshot305(p_account uuid,p_from date,p_to date,p_basis text DEFAULT 'posting') RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN PERFORM private.reconciliation_admin305();RETURN private.reconciliation_snapshot305(p_account,p_from,p_to,p_basis,private.reconciliation_session305(date_trunc('month',p_to)::date));END $$;

CREATE FUNCTION public.reconciliation_save305(p_report jsonb,p_fingerprint text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a uuid; f date; t date; snap jsonb; r jsonb=p_report; difference numeric; outstanding numeric; statement numeric; rid text;
BEGIN
 PERFORM private.reconciliation_admin305();
 a=(r->'account'->>'id')::uuid;f=(r->>'from')::date;t=(r->>'to')::date;rid=coalesce(r->>'recordId',r->>'id');
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
 INSERT INTO private.reconciliation_records305(record_id,owner_id,account_id,period_from,period_to,method,basis,fingerprint,report) VALUES(rid,auth.uid(),a,f,t,r->>'method',r->>'dateBasis',p_fingerprint,r) ON CONFLICT(record_id) DO NOTHING;
 RETURN (SELECT report FROM private.reconciliation_records305 WHERE record_id=rid);
END $$;
CREATE FUNCTION public.reconciliation_records305() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN PERFORM private.reconciliation_admin305();RETURN (SELECT coalesce(jsonb_agg(report ORDER BY saved_at DESC),'[]') FROM private.reconciliation_records305 WHERE owner_id=auth.uid());END $$;

CREATE FUNCTION private.reconciliation_check305(p_month date) RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE required jsonb; a jsonb; snap jsonb; saved private.reconciliation_records305; items jsonb='[]'; issues jsonb='[]'; basis text; v_method text; sid uuid;
BEGIN
 required=private.reconciliation_requirements305(p_month);sid=private.reconciliation_session305(p_month);
 FOR a IN SELECT value FROM jsonb_array_elements(required) LOOP
  v_method=a->>'method';basis=CASE WHEN v_method='bank' THEN 'receipt' ELSE 'posting' END;
  -- Either bank date basis is allowed, but saved basis must still match the current ledger.
  saved=NULL;
  FOR saved IN SELECT * FROM private.reconciliation_records305 WHERE account_id=(a->>'id')::uuid AND period_from=p_month AND period_to=(p_month+interval '1 month - 1 day')::date AND reconciliation_records305.method=v_method ORDER BY saved_at DESC LOOP
   snap=private.reconciliation_snapshot305(saved.account_id,p_month,saved.period_to,saved.basis,sid);
   EXIT WHEN saved.fingerprint=snap->>'fingerprint';
  END LOOP;
  IF saved.record_id IS NULL OR saved.fingerprint IS DISTINCT FROM snap->>'fingerprint' THEN
   items=items||jsonb_build_array(a||jsonb_build_object('complete',false,'state',CASE WHEN saved.record_id IS NULL THEN 'Not reconciled' ELSE 'Account changed — reconcile again' END));
   issues=issues||jsonb_build_array(jsonb_build_object('severity','block','id','reconciliation:'||(a->>'id'),'title','Required reconciliation incomplete','detail',(a->>'code')||' '||(a->>'name')||' — '||CASE WHEN saved.record_id IS NULL THEN 'not reconciled for '||to_char(p_month,'YYYY-MM') ELSE 'account movements changed since the saved reconciliation' END));
  ELSE
   items=items||jsonb_build_array(a||jsonb_build_object('complete',true,'state','Saved','reportId',saved.report->>'id','fingerprint',saved.fingerprint));
  END IF;
 END LOOP;
 RETURN jsonb_build_object('version',305,'requirements',required,'items',items,'issues',issues,'complete',jsonb_array_length(issues)=0);
END $$;

-- Keep all existing journal, payroll, foreign exchange and schedule checks.
CREATE OR REPLACE FUNCTION public.maintenance_preflight14324(p_month date) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE base jsonb;extra jsonb;reconciliation jsonb;
BEGIN
 base=private.maintenance_base281(p_month);extra=private.extended_check281(p_month);reconciliation=private.reconciliation_check305(p_month);
 RETURN base||jsonb_build_object('issues',(base->'issues')||(extra->'issues')||(reconciliation->'issues'),'entry_checks',extra->'entry_checks','coverage',extra->'coverage','reconciliation305',reconciliation,'fingerprint',md5((base->>'fingerprint')||':'||(extra->>'fingerprint')||':'||reconciliation::text));
END $$;

CREATE OR REPLACE FUNCTION public.guard_maintenance14324() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE checkup jsonb;approval jsonb;
BEGIN
 IF NEW.status IN('closed','locked') AND (TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status) THEN
  approval=coalesce(nullif(current_setting('app.maintenance14324',true),'')::jsonb,'{}');
  IF approval->>'actor' IS DISTINCT FROM auth.uid()::text OR NOT(approval->'months' ? to_char(NEW.period_month,'YYYY-MM')) THEN RAISE EXCEPTION 'Run Maintenance & Audit closing checks before closing or locking';END IF;
  LOCK TABLE private.reconciliation_settings305,private.reconciliation_records305,private.reconciliation_periods305 IN SHARE ROW EXCLUSIVE MODE;
  checkup=public.maintenance_preflight14324(NEW.period_month);
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(checkup->'issues') x WHERE x->>'severity'='block') THEN RAISE EXCEPTION 'Closing blocked: %',checkup->'issues';END IF;
  INSERT INTO private.reconciliation_periods305(month,requirements) VALUES(NEW.period_month,checkup->'reconciliation305'->'requirements') ON CONFLICT(month) DO NOTHING;
 END IF;RETURN NEW;
END $$;
-- Existing closing function is replaced below with only obsolete count-entry checks removed.

CREATE OR REPLACE FUNCTION public.maintenance_finish14324(p_month date, p_kind text, p_fingerprint text, p_review jsonb, p_status text DEFAULT 'closed'::text, p_session uuid DEFAULT NULL::uuid, p_year integer DEFAULT NULL::integer, p_confirmation text DEFAULT NULL::text, p_year_fingerprint text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE checkup jsonb; x jsonb; answer jsonb; actual numeric; months jsonb; acks jsonb='{}'; d date; m integer; result jsonb; book_month date;
BEGIN
 IF p_kind NOT IN('period','session','year') THEN RAISE EXCEPTION 'Invalid closing action';END IF;
 IF p_kind<>'session' AND EXISTS(SELECT 1 FROM public.book_sessions136 s JOIN public.accounting_periods p ON p.id=s.period_id WHERE s.status='editing' AND (p.period_month=p_month OR (p_kind='year' AND extract(year FROM p.period_month)=p_year))) THEN RAISE EXCEPTION 'Finish or cancel the active book correction session before closing or locking';END IF;
 IF p_kind='year' AND (p_year IS NULL OR p_month IS DISTINCT FROM make_date(p_year,12,1)) THEN RAISE EXCEPTION 'Choose the December year-end review';END IF;
 -- Stable source and acknowledgments through commit; no write can slip between review and close.
 LOCK TABLE private.journal_plans280,private.journal_plan_occurrences280,public.scheduled_journals,public.scheduled_journal_occurrences,public.recurring_transactions IN SHARE ROW EXCLUSIVE MODE;
 LOCK TABLE public.accounting_periods,public.accounts,public.journal_entries,public.journal_lines,public.staff_journals,public.staff_journal_lines,public.payroll_runs,public.entry_submissions,public.period_findings,public.audit_reviews136,public.book_sessions136 IN SHARE ROW EXCLUSIVE MODE;
 LOCK TABLE private.reconciliation_settings305,private.reconciliation_records305,private.reconciliation_periods305 IN SHARE ROW EXCLUSIVE MODE;
 checkup=public.maintenance_preflight14324(p_month);
 IF p_fingerprint IS DISTINCT FROM checkup->>'fingerprint' THEN RAISE EXCEPTION 'Records changed. Run the closing checks and review again.';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(checkup->'issues') AS item(value) WHERE item.value->>'severity'='block') THEN RAISE EXCEPTION 'Closing is blocked by integrity errors';END IF;
 IF p_review->>'coverageConfirmed' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Confirm that every cash and bank account is included in reconciliation';END IF;
 FOR x IN SELECT value FROM jsonb_array_elements(checkup->'issues') WHERE value->>'severity'='warning' LOOP
  answer=p_review->'acknowledgments'->(x->>'id');
  IF answer->>'acknowledged' IS DISTINCT FROM 'true' OR length(btrim(coalesce(answer->>'reason','')))<3 THEN RAISE EXCEPTION 'Acknowledge and explain: %',x->>'title';END IF;
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
  PERFORM set_config('app.reconciliation305.committing','true',true);
  result=public.finish_book_session136(p_session,false);
  -- Replace provisional entry labels with the committed ledger IDs, retaining the count and ID.
  UPDATE private.reconciliation_records305 r SET report=r.report||jsonb_build_object('correctionApplied305',true,'lines',private.reconciliation_snapshot305(r.account_id,r.period_from,r.period_to,r.basis)->'lines')
   WHERE r.report->>'correctionSession305'=p_session::text AND r.fingerprint=private.reconciliation_snapshot305(r.account_id,r.period_from,r.period_to,r.basis)->>'fingerprint';
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(public.maintenance_preflight14324(p_month)->'issues') i WHERE i->>'severity'='block') THEN RAISE EXCEPTION 'Post-correction integrity check failed. Review the staged journal calculations.';END IF;
 ELSE result=public.close_year14317(p_year,p_confirmation,p_year_fingerprint,acks);
 END IF;
 INSERT INTO public.audit_log(table_name,record_id,action,new_data,reason,actor_id) VALUES('accounting_periods',to_char(p_month,'YYYY-MM'),'MAINTENANCE_CLOSE',jsonb_build_object('kind',p_kind,'check',checkup,'review',p_review),'Closing checks and individual reconciliation acknowledgments',auth.uid());
 RETURN result;
END $function$
;
REVOKE ALL ON FUNCTION private.reconciliation_admin305(),private.reconciliation_requirements305(date),private.reconciliation_snapshot305(uuid,date,date,text,uuid),private.reconciliation_session305(date),private.reconciliation_check305(date) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reconciliation_preferences305(jsonb,integer),public.reconciliation_snapshot305(uuid,date,date,text),public.reconciliation_save305(jsonb,text),public.reconciliation_records305() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reconciliation_preferences305(jsonb,integer),public.reconciliation_snapshot305(uuid,date,date,text),public.reconciliation_save305(jsonb,text),public.reconciliation_records305() TO authenticated;
COMMIT;

