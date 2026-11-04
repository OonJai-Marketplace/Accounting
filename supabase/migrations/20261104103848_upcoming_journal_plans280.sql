-- New plans only. No legacy schedules, journals or template contents are changed.
CREATE TABLE private.journal_plans280 (
 id uuid PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('recurring','amortization')),
 title text NOT NULL, memo text NOT NULL, definition jsonb NOT NULL,
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','stopped','complete')),
 auto_post boolean NOT NULL DEFAULT false CHECK(NOT auto_post OR kind='amortization'),
 approved_by uuid NOT NULL REFERENCES public.profiles(id), created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(), version integer NOT NULL DEFAULT 1,
 last_error text, CHECK(length(title) BETWEEN 1 AND 200), CHECK(length(memo) BETWEEN 1 AND 4000)
);
CREATE TABLE private.journal_plan_occurrences280 (
 plan_id uuid NOT NULL REFERENCES private.journal_plans280(id), occurrence_no integer NOT NULL,
 due_date date NOT NULL, coverage_month date NOT NULL, lines jsonb NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','posted','skipped')),
 journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE RESTRICT,
 posted_at timestamptz, posted_by uuid REFERENCES public.profiles(id),
 PRIMARY KEY(plan_id,occurrence_no), UNIQUE(plan_id,due_date)
);
CREATE INDEX journal_plans280_actor ON private.journal_plans280(approved_by);
CREATE INDEX journal_plans280_due ON private.journal_plan_occurrences280(due_date,plan_id) WHERE status='pending';
CREATE INDEX journal_plans280_entry ON private.journal_plan_occurrences280(journal_entry_id) WHERE journal_entry_id IS NOT NULL;
CREATE INDEX journal_plans280_posted_by ON private.journal_plan_occurrences280(posted_by) WHERE posted_by IS NOT NULL;
ALTER TABLE private.journal_plans280 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.journal_plan_occurrences280 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.journal_plans280,private.journal_plan_occurrences280 FROM PUBLIC,anon,authenticated;
CREATE SEQUENCE private.journal_plan_entry_seq280;
REVOKE ALL ON SEQUENCE private.journal_plan_entry_seq280 FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.require_plan280(p_action text DEFAULT 'view') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.schedule_admin91() OR NOT public.accounting_workspace_allowed123()
  OR NOT public.can_action113('transactions-recurring',p_action) THEN
  RAISE EXCEPTION 'Active administrator access to Upcoming is required' USING ERRCODE='42501';
 END IF;
END $$;

-- Server validation applies again at posting, including active accounts and rates.
CREATE FUNCTION private.validate_plan_lines280(p_lines jsonb,p_kind text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l jsonb;a public.accounts;d numeric;c numeric;r numeric;asset jsonb;expense jsonb;actual jsonb;offset_line jsonb;
 asset_a public.accounts;expense_a public.accounts;actual_a public.accounts;offset_a public.accounts;
BEGIN
 IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines) NOT BETWEEN 2 AND 100 THEN RAISE EXCEPTION 'Use 2 to 100 balanced journal lines';END IF;
 FOR l IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
  SELECT * INTO a FROM public.accounts WHERE id=(l->>'account_id')::uuid AND is_active AND is_posting;
  IF NOT FOUND OR a.currency_code IS DISTINCT FROM l->>'currency_code' THEN RAISE EXCEPTION 'An account is unavailable or its currency changed';END IF;
  d=(l->>'debit')::numeric;c=(l->>'credit')::numeric;r=(l->>'book_rate_lak')::numeric;
  IF d IS NULL OR c IS NULL OR d<0 OR c<0 OR d+c<=0 OR d*c<>0 OR d+c>9000000000000 OR round(d,2)<>d OR round(c,2)<>c
   OR d::text IN ('NaN','Infinity','-Infinity') OR c::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Every line needs one positive amount with at most two decimals';END IF;
  IF r IS NULL OR r<=0 OR r>1000000000 OR r::text IN ('NaN','Infinity','-Infinity')
   OR nullif(l->>'fx_rate_lak','')::numeric IS NULL OR (l->>'fx_rate_lak')::numeric<=0 OR (l->>'fx_rate_lak')::numeric>1000000000
   OR (l->>'fx_rate_lak')::numeric::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Positive recorded rates are required';END IF;
  IF r<>round(r,10) OR (l->>'fx_rate_lak')::numeric<>round((l->>'fx_rate_lak')::numeric,10) THEN RAISE EXCEPTION 'Rates support up to 10 decimal places';END IF;
  IF a.currency_code='LAK' AND (r<>1 OR (l->>'fx_rate_lak')::numeric<>1) THEN RAISE EXCEPTION 'LAK uses rate 1';END IF;
  IF length(coalesce(l->>'description',''))>4000 THEN RAISE EXCEPTION 'Line memo is too long';END IF;
  IF p_kind='amortization' THEN
   IF a.code ~ '^10[0-9]{2}$' OR a.code='5419' THEN RAISE EXCEPTION 'An amortization cannot repeat cash payment or create exchange gain/loss';END IF;
   IF r<>(l->>'fx_rate_lak')::numeric THEN RAISE EXCEPTION 'Amortization must use the recorded historical rate';END IF;
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_lines) x GROUP BY x->>'currency_code' HAVING sum((x->>'debit')::numeric-(x->>'credit')::numeric)<>0) THEN RAISE EXCEPTION 'Each currency must balance';END IF;
 IF (SELECT sum(round((x->>'debit')::numeric*(x->>'book_rate_lak')::numeric,2)-round((x->>'credit')::numeric*(x->>'book_rate_lak')::numeric,2)) FROM jsonb_array_elements(p_lines) x)<>0 THEN RAISE EXCEPTION 'Recorded LAK values must balance';END IF;
 IF p_kind<>'amortization' THEN RETURN;END IF;
 IF (SELECT count(*) FROM jsonb_array_elements(p_lines) x JOIN public.accounts ac ON ac.id=(x->>'account_id')::uuid WHERE ac.code ~ '^13[0-9]{2}$' AND ac.account_type='ASSET' AND (x->>'credit')::numeric>0)<>1 THEN RAISE EXCEPTION 'Use one prepaid asset credit per plan';END IF;
 SELECT x INTO asset FROM jsonb_array_elements(p_lines) x JOIN public.accounts ac ON ac.id=(x->>'account_id')::uuid WHERE ac.code ~ '^13[0-9]{2}$' AND ac.account_type='ASSET' AND (x->>'credit')::numeric>0;
 SELECT * INTO asset_a FROM public.accounts WHERE id=(asset->>'account_id')::uuid;
 IF (SELECT count(*) FROM jsonb_array_elements(p_lines) x WHERE x->>'currency_code'=asset_a.currency_code)<>2 THEN RAISE EXCEPTION 'Use one expense and one prepaid asset in the prepaid currency';END IF;
 SELECT x INTO expense FROM jsonb_array_elements(p_lines) x WHERE x->>'currency_code'=asset_a.currency_code AND (x->>'debit')::numeric>0;
 SELECT * INTO expense_a FROM public.accounts WHERE id=(expense->>'account_id')::uuid;
 IF asset_a.currency_code='LAK' THEN
  IF jsonb_array_length(p_lines)<>2 OR expense_a.account_type<>'EXPENSE' OR expense_a.is_technical THEN RAISE EXCEPTION 'Choose a regular expense debit and prepaid asset credit';END IF;
 ELSE
  IF jsonb_array_length(p_lines)<>4 OR NOT expense_a.is_technical OR expense_a.code !~ '^92[0-9]{2}$' OR (asset->>'book_rate_lak')::numeric IS DISTINCT FROM (expense->>'book_rate_lak')::numeric THEN RAISE EXCEPTION 'Foreign amortization needs its expense mapping and the same historical rate';END IF;
  SELECT x INTO actual FROM jsonb_array_elements(p_lines) x WHERE x->>'currency_code'='LAK' AND (x->>'debit')::numeric>0;
  SELECT x INTO offset_line FROM jsonb_array_elements(p_lines) x WHERE x->>'currency_code'='LAK' AND (x->>'credit')::numeric>0;
  SELECT * INTO actual_a FROM public.accounts WHERE id=(actual->>'account_id')::uuid;
  SELECT * INTO offset_a FROM public.accounts WHERE id=(offset_line->>'account_id')::uuid;
  IF actual IS NULL OR offset_line IS NULL OR actual_a.account_type<>'EXPENSE' OR actual_a.is_technical OR offset_a.code<>'9290'
    OR abs((actual->>'debit')::numeric-round((asset->>'credit')::numeric*(asset->>'book_rate_lak')::numeric,2))>0.01 THEN RAISE EXCEPTION 'The LAK expense and mapping must match the historical prepaid value';END IF;
  IF expense_a.code IN ('9201','9202','9211','9212','9222','9231','9232','9233','9234','9241','9242') AND actual_a.code IS DISTINCT FROM (CASE expense_a.code WHEN '9201' THEN '5010' WHEN '9202' THEN '5010' WHEN '9211' THEN '5111' WHEN '9212' THEN '5111' WHEN '9222' THEN '5119' WHEN '9231' THEN '5311' WHEN '9232' THEN '5311' WHEN '9233' THEN '5315' WHEN '9234' THEN '5315' ELSE '5414' END) THEN RAISE EXCEPTION 'Wrong LAK counterpart for this expense mapping';END IF;
 END IF;
END $$;

CREATE FUNCTION private.save_journal_plan280(p_id uuid,p_definition jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE kind text=p_definition->>'kind';v_start date=(p_definition->>'start')::date;v_end date=(p_definition->>'end')::date;
 freq text=p_definition->>'frequency';posting text=p_definition->>'posting_day';basis text=p_definition->>'amount_basis';allocation text=p_definition->>'allocation';
 dates date[]='{}';weights integer[]='{}';months date[]='{}';d date;m date;i integer;n integer;w integer;used integer=0;total integer=0;
 l jsonb;ls jsonb;amount numeric;credit numeric;debit numeric;before numeric;after numeric;foreign_source jsonb;lak_amount numeric;
 source_journal public.journal_entries;prepaid_id uuid;previous private.journal_plans280;mode boolean=coalesce((p_definition->>'auto_post')::boolean,false);
BEGIN
 PERFORM private.require_plan280('edit');
 IF p_id IS NULL OR kind NOT IN ('recurring','amortization') OR kind IS NULL OR v_start IS NULL OR v_end IS NULL OR v_end<v_start OR v_start<'2000-01-01' OR v_end>'2100-12-31'
  OR nullif(btrim(p_definition->>'title'),'') IS NULL OR nullif(btrim(p_definition->>'memo'),'') IS NULL THEN RAISE EXCEPTION 'Complete the name, description and schedule dates';END IF;
 IF mode AND (kind<>'amortization' OR NOT public.can_action113('journal','post')) THEN RAISE EXCEPTION 'Only an approved amortization may post automatically';END IF;
 IF kind='amortization' AND (posting IS NULL OR posting NOT IN ('first','last') OR basis IS NULL OR basis NOT IN ('monthly','total') OR allocation IS NULL OR allocation NOT IN ('equal','daily') OR allocation='daily' AND basis<>'total') THEN RAISE EXCEPTION 'Choose a valid amortization basis and posting day';END IF;
 IF kind='recurring' AND (freq IS NULL OR freq NOT IN ('once','weekly','monthly','quarterly','yearly')) THEN RAISE EXCEPTION 'Choose a recurrence frequency';END IF;
 IF coalesce((p_definition->>'reminder_days')::numeric,0) NOT BETWEEN 0 AND 90 OR coalesce((p_definition->>'reminder_days')::numeric,0)<>trunc(coalesce((p_definition->>'reminder_days')::numeric,0)) THEN RAISE EXCEPTION 'Use 0 to 90 whole reminder days';END IF;
 PERFORM private.validate_plan_lines280(p_definition->'lines',kind);
 -- Serializes immutable client UUID retries before checking the prior definition.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,280));
 SELECT * INTO previous FROM private.journal_plans280 WHERE id=p_id;
 IF FOUND THEN
  IF previous.definition IS DISTINCT FROM p_definition OR previous.approved_by<>auth.uid() THEN RAISE EXCEPTION 'This save reference already belongs to a different plan';END IF;
  RETURN jsonb_build_object('id',p_id,'saved',true,'retry',true);
 END IF;
 IF kind='amortization' THEN
  SELECT (x->>'account_id')::uuid INTO prepaid_id FROM jsonb_array_elements(p_definition->'lines') x JOIN public.accounts ac ON ac.id=(x->>'account_id')::uuid WHERE ac.code ~ '^13[0-9]{2}$' AND (x->>'credit')::numeric>0;
  IF EXISTS(SELECT 1 FROM public.scheduled_journals s WHERE NOT s.is_sample AND s.status='active' AND s.credit_account_id=prepaid_id AND s.next_due<=v_end AND coalesce(s.end_date,v_end)>=v_start) THEN RAISE EXCEPTION 'An existing prepaid schedule overlaps these dates. Reconcile its posted entries and pause the old schedule before saving its replacement';END IF;
  SELECT * INTO source_journal FROM public.journal_entries e WHERE e.status='posted' AND (e.id::text=p_definition->>'source_entry_id' OR e.entry_no=p_definition->>'source_entry_id');
  IF source_journal.id IS NOT NULL AND EXISTS(SELECT 1 FROM public.journal_lines l WHERE l.journal_entry_id=source_journal.id AND l.account_id=prepaid_id AND l.credit>0) AND v_start<=(date_trunc('month',source_journal.transaction_date)+interval '1 month - 1 day')::date THEN RAISE EXCEPTION 'The source release is already posted. Start the new plan after its month';END IF;
 END IF;
 FOR i IN 0..599 LOOP
  IF kind='amortization' THEN
   m=(date_trunc('month',v_start)+i*interval '1 month')::date;EXIT WHEN m>date_trunc('month',v_end)::date;
   d=CASE WHEN posting='first' THEN m ELSE (m+interval '1 month - 1 day')::date END;
   w=CASE WHEN allocation='daily' THEN least(v_end,(m+interval '1 month - 1 day')::date)-greatest(v_start,m)+1 ELSE 1 END;
  ELSE
   d=CASE freq WHEN 'once' THEN v_start WHEN 'weekly' THEN v_start+7*i ELSE (v_start+i*CASE freq WHEN 'quarterly' THEN interval '3 months' WHEN 'yearly' THEN interval '1 year' ELSE interval '1 month' END)::date END;
   EXIT WHEN d>v_end OR (freq='once' AND i>0);m=date_trunc('month',d)::date;w=1;
  END IF;
  IF i=599 THEN RAISE EXCEPTION 'Use fewer than 600 occurrences';END IF;
  dates=array_append(dates,d);weights=array_append(weights,w);months=array_append(months,m);total=total+w;
 END LOOP;
 n=cardinality(dates);IF n<1 THEN RAISE EXCEPTION 'The plan has no posting dates';END IF;
 INSERT INTO private.journal_plans280(id,kind,title,memo,definition,auto_post,approved_by) VALUES(p_id,kind,btrim(p_definition->>'title'),btrim(p_definition->>'memo'),p_definition,mode,auth.uid());
 IF kind='amortization' THEN SELECT x INTO foreign_source FROM jsonb_array_elements(p_definition->'lines') x WHERE x->>'currency_code'<>'LAK' AND (x->>'credit')::numeric>0;END IF;
 FOR i IN 1..n LOOP
  before=used;used=used+weights[i];after=used;ls='[]'::jsonb;
  IF foreign_source IS NOT NULL THEN
   amount=(foreign_source->>'credit')::numeric;
   lak_amount=CASE WHEN basis='total' THEN round(round(amount*after/total,2)*(foreign_source->>'book_rate_lak')::numeric,2)-round(round(amount*before/total,2)*(foreign_source->>'book_rate_lak')::numeric,2)
     ELSE round(amount*i*(foreign_source->>'book_rate_lak')::numeric,2)-round(amount*(i-1)*(foreign_source->>'book_rate_lak')::numeric,2) END;
  END IF;
  FOR l IN SELECT value FROM jsonb_array_elements(p_definition->'lines') LOOP
   debit=(l->>'debit')::numeric;credit=(l->>'credit')::numeric;
   IF kind='amortization' AND basis='total' THEN debit=round(debit*after/total,2)-round(debit*before/total,2);credit=round(credit*after/total,2)-round(credit*before/total,2);END IF;
   IF foreign_source IS NOT NULL AND l->>'currency_code'='LAK' THEN
    IF (l->>'debit')::numeric>0 THEN debit=lak_amount;ELSE credit=lak_amount;END IF;
   END IF;
   IF foreign_source IS NOT NULL AND l->>'currency_code'<>'LAK' AND round((debit+credit)*(l->>'book_rate_lak')::numeric,2)<>lak_amount THEN
    IF debit+credit<=0 OR round((debit+credit)*round(lak_amount/(debit+credit),10),2)<>lak_amount THEN RAISE EXCEPTION 'This allocation cannot preserve its historical cents at the supported rate precision';END IF;
    l=l||jsonb_build_object('book_rate_lak',round(lak_amount/(debit+credit),10),'fx_rate_lak',round(lak_amount/(debit+credit),10));
   END IF;
   ls=ls||jsonb_build_array(l||jsonb_build_object('debit',debit,'credit',credit));
  END LOOP;
  PERFORM private.validate_plan_lines280(ls,kind);
  INSERT INTO private.journal_plan_occurrences280(plan_id,occurrence_no,due_date,coverage_month,lines) VALUES(p_id,i,dates[i],months[i],ls);
 END LOOP;
 INSERT INTO public.audit_log(table_name,record_id,action,new_data,reason,actor_id) VALUES('journal_plans280',p_id::text,'CREATE',p_definition,CASE WHEN mode THEN 'Approved automatic prepaid releases' ELSE 'Prepared journal plan; each occurrence requires approval' END,auth.uid());
 IF mode THEN PERFORM private.process_journal_plans280();END IF;
 RETURN jsonb_build_object('id',p_id,'saved',true,'occurrences',n);
END $$;

CREATE FUNCTION private.list_journal_plans280() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM private.require_plan280();
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(p)||jsonb_build_object('occurrences',coalesce((SELECT jsonb_agg(to_jsonb(o)||jsonb_build_object('entry_no',e.entry_no,'entry_status',e.status) ORDER BY o.occurrence_no) FROM private.journal_plan_occurrences280 o LEFT JOIN public.journal_entries e ON e.id=o.journal_entry_id WHERE o.plan_id=p.id),'[]'::jsonb)) ORDER BY p.created_at DESC) FROM private.journal_plans280 p),'[]'::jsonb);
END $$;

CREATE FUNCTION private.post_journal_plan280(p_id uuid,p_occurrence integer,p_expected_date date,p_lines jsonb DEFAULT NULL,p_memo text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p private.journal_plans280;o private.journal_plan_occurrences280;ls jsonb;l jsonb;entry uuid;v_entry_no text;v_sequence text;memo text;stat text;posted_memo text;
 a uuid;need numeric;balance numeric;book_need numeric;book_balance numeric;rate numeric;line_no integer=0;attempt integer=0;period date;missing_book boolean;
BEGIN
 PERFORM private.require_plan280('post');IF NOT public.can_action113('journal','post') THEN RAISE EXCEPTION 'Journal posting permission required';END IF;
 SELECT * INTO p FROM private.journal_plans280 WHERE id=p_id FOR UPDATE;
 SELECT * INTO o FROM private.journal_plan_occurrences280 WHERE plan_id=p_id AND occurrence_no=p_occurrence FOR UPDATE;
 IF p.id IS NULL OR o.plan_id IS NULL THEN RAISE EXCEPTION 'Plan occurrence unavailable';END IF;
 IF o.status='posted' THEN
  SELECT e.entry_no,e.status,e.memo INTO v_entry_no,stat,posted_memo FROM public.journal_entries e WHERE e.id=o.journal_entry_id;
  IF stat IS DISTINCT FROM 'posted' THEN RAISE EXCEPTION 'This occurrence was voided and cannot be posted again';END IF;
  IF p_lines IS NOT NULL AND p_lines IS DISTINCT FROM o.lines OR p_memo IS NOT NULL AND btrim(p_memo) IS DISTINCT FROM posted_memo THEN RAISE EXCEPTION 'This occurrence was already posted with different fields. Open its existing journal instead of posting again';END IF;
  RETURN jsonb_build_object('entry_no',v_entry_no,'entry_id',o.journal_entry_id,'retry',true);
 END IF;
 IF p.status<>'active' OR o.status<>'pending' OR o.due_date IS DISTINCT FROM p_expected_date THEN RAISE EXCEPTION 'Plan changed; refresh the prepared journal';END IF;
 IF o.due_date>(now() AT TIME ZONE 'Asia/Vientiane')::date THEN RAISE EXCEPTION 'This occurrence is not due yet';END IF;
 IF EXISTS(SELECT 1 FROM private.journal_plan_occurrences280 x WHERE x.plan_id=p_id AND x.occurrence_no<o.occurrence_no AND x.status='pending') THEN RAISE EXCEPTION 'Review the earlier occurrence first';END IF;
 IF p.kind='amortization' AND EXISTS(SELECT 1 FROM private.journal_plan_occurrences280 x JOIN public.journal_entries e ON e.id=x.journal_entry_id WHERE x.plan_id=p_id AND x.status='posted' AND e.status<>'posted') THEN RAISE EXCEPTION 'A previous release was voided. Review the plan before posting further amortization';END IF;
 ls=coalesce(p_lines,o.lines);memo=coalesce(nullif(btrim(p_memo),''),p.memo);
 IF p.kind='amortization' AND (ls IS DISTINCT FROM o.lines OR memo IS DISTINCT FROM p.memo) THEN RAISE EXCEPTION 'The approved amortization is fixed; stop it and create a reviewed replacement to change future amounts';END IF;
 PERFORM private.validate_plan_lines280(ls,p.kind);
 period=date_trunc('month',o.due_date)::date;
 PERFORM pg_advisory_xact_lock(hashtextextended(period::text,280));
 SELECT status INTO stat FROM public.accounting_periods WHERE period_month=period FOR SHARE;
 IF coalesce(stat,'open')<>'open' OR EXISTS(SELECT 1 FROM public.year_closings136 WHERE year=extract(year FROM period)::integer) THEN RAISE EXCEPTION 'The posting period or year is closed';END IF;
 IF p.kind='amortization' AND p.definition->>'posting_day'='first' AND NOT EXISTS(SELECT 1 FROM public.accounting_periods WHERE period_month=(period-interval '1 month')::date AND status IN ('closed','locked')) THEN RAISE EXCEPTION 'Waiting for the previous month to close';END IF;
 IF p.kind='amortization' THEN
  SELECT (x->>'account_id')::uuid,(x->>'credit')::numeric,(x->>'book_rate_lak')::numeric INTO a,need,rate FROM jsonb_array_elements(ls) x JOIN public.accounts ac ON ac.id=(x->>'account_id')::uuid WHERE ac.code ~ '^13[0-9]{2}$' AND (x->>'credit')::numeric>0;
  PERFORM pg_advisory_xact_lock(hashtextextended(a::text,280));
  -- Each year has its own posted opening balance. Do not double-count prior years.
  SELECT coalesce(sum(l.debit-l.credit),0),sum(CASE WHEN l.currency_code='LAK' THEN l.debit-l.credit ELSE coalesce(l.base_debit,CASE WHEN l.debit=0 THEN 0 ELSE round(l.debit*coalesce(l.book_rate_lak,l.fx_rate_lak),2) END)-coalesce(l.base_credit,CASE WHEN l.credit=0 THEN 0 ELSE round(l.credit*coalesce(l.book_rate_lak,l.fx_rate_lak),2) END) END),bool_or(l.currency_code<>'LAK' AND coalesce(l.book_rate_lak,l.fx_rate_lak,0)<=0)
   INTO balance,book_balance,missing_book FROM public.journal_lines l JOIN public.journal_entries e ON e.id=l.journal_entry_id
   WHERE l.account_id=a AND e.status='posted' AND e.voided_at IS NULL AND coalesce(l.line_date,e.transaction_date) BETWEEN date_trunc('year',o.due_date)::date AND o.due_date;
  book_need=round(need*rate,2);
  IF missing_book OR balance<need OR book_balance IS NULL OR book_balance+0.01<book_need THEN RAISE EXCEPTION 'Recorded prepaid balance does not cover this release. Check the original payment, prior releases and annual opening balance';END IF;
  IF balance=need AND abs(book_balance-book_need)>0.01 THEN RAISE EXCEPTION 'The final release does not match the remaining historical value. Review the source lot';END IF;
 END IF;
 LOOP
  attempt=attempt+1;IF attempt>1000 THEN RAISE EXCEPTION 'Unable to allocate a separate plan entry ID';END IF;
  v_sequence=nextval('private.journal_plan_entry_seq280')::text;
  v_entry_no=(CASE WHEN p.kind='amortization' THEN 'AMO' ELSE 'REC' END)||to_char(o.due_date,'YY')||'-'||lpad(v_sequence,greatest(6,length(v_sequence)),'0');
  EXIT WHEN NOT EXISTS(SELECT 1 FROM public.journal_entries e WHERE e.entry_no=v_entry_no) AND NOT EXISTS(SELECT 1 FROM public.audit_log a WHERE a.table_name='journal_entries' AND (a.new_data->>'entry_no'=v_entry_no OR a.old_data->>'entry_no'=v_entry_no));
 END LOOP;
 INSERT INTO public.journal_entries(entry_no,transaction_date,memo,reference,status,source,posted_by,posted_at)
  VALUES(v_entry_no,o.due_date,memo,'PLAN280:'||p_id||':'||p_occurrence,'posted','recurring',auth.uid(),now()) RETURNING id INTO entry;
 FOR l IN SELECT value FROM jsonb_array_elements(ls) LOOP
  line_no=line_no+1;
  INSERT INTO public.journal_lines(journal_entry_id,line_no,account_id,description,currency_code,debit,credit,line_date,fx_rate_lak,book_rate_lak)
  VALUES(entry,line_no,(l->>'account_id')::uuid,coalesce(l->>'description',''),l->>'currency_code',(l->>'debit')::numeric,(l->>'credit')::numeric,o.due_date,(l->>'fx_rate_lak')::numeric,(l->>'book_rate_lak')::numeric);
 END LOOP;
 PERFORM public.check_ledger_entry14228(entry);
 UPDATE private.journal_plan_occurrences280 SET status='posted',journal_entry_id=entry,posted_at=now(),posted_by=auth.uid(),lines=ls WHERE plan_id=p_id AND occurrence_no=p_occurrence;
 UPDATE private.journal_plans280 SET last_error=NULL,updated_at=now(),version=version+1,status=CASE WHEN EXISTS(SELECT 1 FROM private.journal_plan_occurrences280 WHERE plan_id=p_id AND status='pending') THEN 'active' ELSE 'complete' END WHERE id=p_id;
 INSERT INTO public.audit_log(table_name,record_id,action,new_data,reason,actor_id) VALUES('journal_entries',entry::text,'PLAN_POST',jsonb_build_object('entry_no',v_entry_no,'plan_id',p_id,'occurrence',p_occurrence,'accounting_date',o.due_date,'automatic',current_setting('app.plan_auto280',true)='on'),'Approved plan occurrence',auth.uid());
 RETURN jsonb_build_object('entry_no',v_entry_no,'entry_id',entry,'date',o.due_date);
END $$;

CREATE FUNCTION private.journal_plan_action280(p_id uuid,p_version integer,p_action text,p_occurrence integer DEFAULT NULL,p_date date DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p private.journal_plans280;
BEGIN
 PERFORM private.require_plan280('edit');SELECT * INTO p FROM private.journal_plans280 WHERE id=p_id FOR UPDATE;
 IF p.id IS NULL OR p.version IS DISTINCT FROM p_version THEN RAISE EXCEPTION 'Plan changed. Refresh and try again';END IF;
 IF p_action IN ('pause','resume','stop') THEN
  IF p.status IN ('stopped','complete') THEN RAISE EXCEPTION 'This plan has ended';END IF;
  UPDATE private.journal_plans280 SET status=CASE p_action WHEN 'pause' THEN 'paused' WHEN 'resume' THEN 'active' ELSE 'stopped' END,last_error=NULL,version=version+1,updated_at=now() WHERE id=p_id;
 ELSIF p_action IN ('skip','reschedule') AND p.kind='recurring' THEN
  IF NOT EXISTS(SELECT 1 FROM private.journal_plan_occurrences280 WHERE plan_id=p_id AND occurrence_no=p_occurrence AND status='pending') THEN RAISE EXCEPTION 'Only a pending occurrence can change';END IF;
  IF p_action='reschedule' THEN
   IF p_date IS NULL OR p_date<'2000-01-01' OR p_date>'2100-12-31' OR EXISTS(SELECT 1 FROM public.accounting_periods WHERE period_month=date_trunc('month',p_date)::date AND status<>'open') OR EXISTS(SELECT 1 FROM public.year_closings136 WHERE year=extract(year FROM p_date)::integer) THEN RAISE EXCEPTION 'Choose a date in an open period';END IF;
   UPDATE private.journal_plan_occurrences280 SET due_date=p_date,coverage_month=date_trunc('month',p_date)::date WHERE plan_id=p_id AND occurrence_no=p_occurrence;
  ELSE UPDATE private.journal_plan_occurrences280 SET status='skipped' WHERE plan_id=p_id AND occurrence_no=p_occurrence;END IF;
  UPDATE private.journal_plans280 SET version=version+1,updated_at=now(),status=CASE WHEN NOT EXISTS(SELECT 1 FROM private.journal_plan_occurrences280 WHERE plan_id=p_id AND status='pending') THEN 'complete' ELSE status END WHERE id=p_id;
 ELSE RAISE EXCEPTION 'Unsupported plan action';END IF;
 INSERT INTO public.audit_log(table_name,record_id,action,new_data,reason,actor_id) VALUES('journal_plans280',p_id::text,upper(p_action),jsonb_build_object('occurrence',p_occurrence,'date',p_date), 'Plan action',auth.uid());
END $$;

-- Only postgres can run the worker. It impersonates the still-authorized approving
-- administrator solely for the approved plan and restores the caller identity.
CREATE FUNCTION private.process_journal_plans280() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p record;o record;count_posted integer=0;old_sub text=current_setting('request.jwt.claim.sub',true);old_claims text=current_setting('request.jwt.claims',true);old_auto text=current_setting('app.plan_auto280',true);
BEGIN
 IF NOT pg_try_advisory_xact_lock(143280,1) THEN RETURN 0;END IF;
 FOR p IN SELECT id,approved_by FROM private.journal_plans280 WHERE kind='amortization' AND auto_post AND status='active' ORDER BY created_at LIMIT 100 LOOP
  PERFORM set_config('request.jwt.claim.sub',p.approved_by::text,true);PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p.approved_by,'role','authenticated')::text,true);PERFORM set_config('app.plan_auto280','on',true);
  FOR o IN SELECT occurrence_no,due_date FROM private.journal_plan_occurrences280 WHERE plan_id=p.id AND status='pending' AND due_date<=(now() AT TIME ZONE 'Asia/Vientiane')::date ORDER BY occurrence_no LIMIT 24 LOOP
   BEGIN
    PERFORM private.post_journal_plan280(p.id,o.occurrence_no,o.due_date);count_posted=count_posted+1;
   EXCEPTION WHEN OTHERS THEN
    UPDATE private.journal_plans280 SET last_error=left(SQLERRM,800),updated_at=now() WHERE id=p.id;EXIT;
   END;
  END LOOP;
 END LOOP;
 PERFORM set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);PERFORM set_config('request.jwt.claims',coalesce(old_claims,''),true);PERFORM set_config('app.plan_auto280',coalesce(old_auto,''),true);
 RETURN count_posted;
EXCEPTION WHEN OTHERS THEN
 PERFORM set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);PERFORM set_config('request.jwt.claims',coalesce(old_claims,''),true);PERFORM set_config('app.plan_auto280',coalesce(old_auto,''),true);RAISE;
END $$;
CREATE FUNCTION private.period_plans280() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.status IN ('open','closed','locked') AND (TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status) THEN PERFORM private.process_journal_plans280();END IF;RETURN NEW;
END $$;
CREATE TRIGGER upcoming_plans280 AFTER INSERT OR UPDATE OF status ON public.accounting_periods FOR EACH ROW EXECUTE FUNCTION private.period_plans280();

CREATE FUNCTION private.pending_amortization_guard280() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.status IN ('closed','locked') AND (TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status)
  AND EXISTS(SELECT 1 FROM private.journal_plan_occurrences280 o JOIN private.journal_plans280 p ON p.id=o.plan_id
   WHERE p.kind='amortization' AND p.status='active' AND o.status='pending' AND o.coverage_month=NEW.period_month) THEN
  RAISE EXCEPTION 'Review the pending amortization in Upcoming before closing this month. Post the due release, or pause/stop the plan if it should not apply';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pending_amortization280 BEFORE INSERT OR UPDATE OF status ON public.accounting_periods FOR EACH ROW EXECUTE FUNCTION private.pending_amortization_guard280();

CREATE FUNCTION public.save_journal_plan280(p_id uuid,p_definition jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.save_journal_plan280(p_id,p_definition) $$;
CREATE FUNCTION public.list_journal_plans280() RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.list_journal_plans280() $$;
CREATE FUNCTION public.post_journal_plan280(p_id uuid,p_occurrence integer,p_expected_date date,p_lines jsonb DEFAULT NULL,p_memo text DEFAULT NULL) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.post_journal_plan280(p_id,p_occurrence,p_expected_date,p_lines,p_memo) $$;
CREATE FUNCTION public.journal_plan_action280(p_id uuid,p_version integer,p_action text,p_occurrence integer DEFAULT NULL,p_date date DEFAULT NULL) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.journal_plan_action280(p_id,p_version,p_action,p_occurrence,p_date) $$;
REVOKE ALL ON FUNCTION private.require_plan280(text),private.validate_plan_lines280(jsonb,text),private.process_journal_plans280(),private.period_plans280(),private.pending_amortization_guard280() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION private.save_journal_plan280(uuid,jsonb),private.list_journal_plans280(),private.post_journal_plan280(uuid,integer,date,jsonb,text),private.journal_plan_action280(uuid,integer,text,integer,date) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.save_journal_plan280(uuid,jsonb),public.list_journal_plans280(),public.post_journal_plan280(uuid,integer,date,jsonb,text),public.journal_plan_action280(uuid,integer,text,integer,date) FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.save_journal_plan280(uuid,jsonb),private.list_journal_plans280(),private.post_journal_plan280(uuid,integer,date,jsonb,text),private.journal_plan_action280(uuid,integer,text,integer,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_journal_plan280(uuid,jsonb),public.list_journal_plans280(),public.post_journal_plan280(uuid,integer,date,jsonb,text),public.journal_plan_action280(uuid,integer,text,integer,date) TO authenticated;

-- Daily 00:10 in Laos. Period close/open also triggers the same idempotent worker.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
  PERFORM cron.schedule('approved-amortization280','10 17 * * *','SELECT private.process_journal_plans280()');
 END IF;
END $$;
