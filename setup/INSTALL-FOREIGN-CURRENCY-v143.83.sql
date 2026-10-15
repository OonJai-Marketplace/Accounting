-- Explicit rates and immutable original/base amounts; existing rates are never guessed.
ALTER TABLE public.journal_lines ADD COLUMN IF NOT EXISTS fx_rate_lak numeric(24,10), ADD COLUMN IF NOT EXISTS book_rate_lak numeric(24,10);
ALTER TABLE public.journal_lines ADD COLUMN IF NOT EXISTS base_debit numeric GENERATED ALWAYS AS (CASE WHEN currency_code='LAK' THEN debit ELSE round(debit*coalesce(book_rate_lak,fx_rate_lak),2) END) STORED, ADD COLUMN IF NOT EXISTS base_credit numeric GENERATED ALWAYS AS (CASE WHEN currency_code='LAK' THEN credit ELSE round(credit*coalesce(book_rate_lak,fx_rate_lak),2) END) STORED;
ALTER TABLE public.journal_lines ADD CONSTRAINT journal_fx_positive14383 CHECK ((fx_rate_lak IS NULL OR fx_rate_lak>0 AND fx_rate_lak<1000000000000) AND (book_rate_lak IS NULL OR book_rate_lak>0 AND book_rate_lak<1000000000000));
ALTER TABLE public.staff_journal_lines ADD COLUMN IF NOT EXISTS fx_rate_lak numeric(24,10);
ALTER TABLE public.staff_journal_lines ADD CONSTRAINT staff_fx_positive14383 CHECK (fx_rate_lak IS NULL OR fx_rate_lak>0 AND fx_rate_lak<1000000000000);


CREATE OR REPLACE FUNCTION public.post_manual_worker14228(p_transaction_date date, p_memo text, p_lines jsonb, p_prefix text DEFAULT 'OJM'::text, p_digits integer DEFAULT 6)
 RETURNS TABLE(entry_id uuid, entry_no text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_entry_id uuid;
  v_entry_no text;
  v_prefix text;
  v_digits integer;
  v_line jsonb;
  v_line_no integer := 0;
  v_attempt integer := 0;
  v_debit numeric(20,2);
  v_credit numeric(20,2);
begin
  if not public.has_user_permission('post') then
    raise exception 'Direct journal posting permission required';
  end if;
  if p_transaction_date is null or nullif(trim(p_memo),'') is null then
    raise exception 'Transaction date and memo are required';
  end if;
  if p_lines is null or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)<2 then
    raise exception 'At least two journal lines are required';
  end if;

  PERFORM public.validate_journal14228(p_transaction_date,p_memo,p_lines);
  v_prefix := upper(regexp_replace(coalesce(nullif(trim(p_prefix),''),'OJM'),'[^A-Za-z0-9]','','g'));
  
  v_prefix := left(coalesce(nullif(v_prefix,''),'OJM'),8);
  v_digits := greatest(3,least(9,coalesce(p_digits,6)));

  -- Sequence allocation and collision retry also skip headers left by older,
  -- non-atomic posting attempts.
  loop
    v_attempt := v_attempt + 1;
    if v_attempt>1000 then raise exception 'Unable to allocate a unique journal number'; end if;
    v_entry_no := v_prefix||'-'||(SELECT lpad(n.value,greatest(v_digits,length(n.value)),'0') FROM (SELECT nextval('public.journal_entry_number_seq')::text AS value) n);
    begin
      insert into public.journal_entries(entry_no,transaction_date,memo,status,source,posted_by,posted_at)
      values(v_entry_no,p_transaction_date,trim(p_memo),'posted','manual',auth.uid(),now())
      returning id into v_entry_id;
      exit;
    exception when unique_violation then
      null;
    end;
  end loop;

  for v_line in select value from jsonb_array_elements(p_lines) loop
    v_line_no := v_line_no + 1;
    if nullif(v_line->>'account_id','') is null then
      raise exception 'Line % has no account ID',v_line_no;
    end if;
    v_debit := coalesce((v_line->>'debit')::numeric,0);
    v_credit := coalesce((v_line->>'credit')::numeric,0);
    if not ((v_debit>0 and v_credit=0) or (v_credit>0 and v_debit=0)) then
      raise exception 'Line % must contain either a debit or a credit',v_line_no;
    end if;
    insert into public.journal_lines(
      journal_entry_id,line_no,account_id,description,currency_code,debit,credit,line_date,fx_rate_lak,book_rate_lak
    ) values(
      v_entry_id,v_line_no,(v_line->>'account_id')::uuid,
      coalesce(v_line->>'description',p_memo),v_line->>'currency_code',
      v_debit,v_credit,p_transaction_date,nullif(v_line->>'fx_rate_lak','')::numeric,nullif(v_line->>'book_rate_lak','')::numeric
    );
  end loop;

  insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id)
  values('journal_entries',v_entry_id::text,'POST',jsonb_build_object('entry_no',v_entry_no,'line_count',v_line_no),'Atomic manual journal posting',auth.uid());

  return query select v_entry_id,v_entry_no;
end $function$
;

CREATE OR REPLACE FUNCTION public.post_report_worker14349(p_transaction_date date, p_memo text, p_lines jsonb, p_prefix text DEFAULT 'OJM'::text, p_digits integer DEFAULT 6)
 RETURNS TABLE(entry_id uuid, entry_no text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_entry_id uuid;
  v_entry_no text;
  v_prefix text;
  v_digits integer;
  v_line jsonb;
  v_line_no integer := 0;
  v_attempt integer := 0;
  v_debit numeric(20,2);
  v_credit numeric(20,2);
begin
  if not public.has_user_permission('post') then
    raise exception 'Direct journal posting permission required';
  end if;
  if p_transaction_date is null or nullif(trim(p_memo),'') is null then
    raise exception 'Transaction date and memo are required';
  end if;
  if p_lines is null or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)<2 then
    raise exception 'At least two journal lines are required';
  end if;

  PERFORM public.validate_journal14228(p_transaction_date,p_memo,(SELECT jsonb_agg(x-'line_date') FROM jsonb_array_elements(p_lines) x));
  v_prefix := upper(regexp_replace(coalesce(nullif(trim(p_prefix),''),'OJM'),'[^A-Za-z0-9]','','g'));
  
  v_prefix := left(coalesce(nullif(v_prefix,''),'OJM'),8);
  v_digits := greatest(3,least(9,coalesce(p_digits,6)));

  -- Sequence allocation and collision retry also skip headers left by older,
  -- non-atomic posting attempts.
  loop
    v_attempt := v_attempt + 1;
    if v_attempt>1000 then raise exception 'Unable to allocate a unique journal number'; end if;
    v_entry_no := v_prefix||'-'||(SELECT lpad(n.value,greatest(v_digits,length(n.value)),'0') FROM (SELECT nextval('public.journal_entry_number_seq')::text AS value) n);
    begin
      insert into public.journal_entries(entry_no,transaction_date,memo,status,source,posted_by,posted_at)
      values(v_entry_no,p_transaction_date,trim(p_memo),'posted','manual',auth.uid(),now())
      returning id into v_entry_id;
      exit;
    exception when unique_violation then
      null;
    end;
  end loop;

  for v_line in select value from jsonb_array_elements(p_lines) loop
    v_line_no := v_line_no + 1;
    if nullif(v_line->>'account_id','') is null then
      raise exception 'Line % has no account ID',v_line_no;
    end if;
    v_debit := coalesce((v_line->>'debit')::numeric,0);
    v_credit := coalesce((v_line->>'credit')::numeric,0);
    if not ((v_debit>0 and v_credit=0) or (v_credit>0 and v_debit=0)) then
      raise exception 'Line % must contain either a debit or a credit',v_line_no;
    end if;
    insert into public.journal_lines(
      journal_entry_id,line_no,account_id,description,currency_code,debit,credit,line_date,fx_rate_lak,book_rate_lak
    ) values(
      v_entry_id,v_line_no,(v_line->>'account_id')::uuid,
      coalesce(v_line->>'description',p_memo),v_line->>'currency_code',
      v_debit,v_credit,(v_line->>'line_date')::date,nullif(v_line->>'fx_rate_lak','')::numeric,nullif(v_line->>'book_rate_lak','')::numeric
    );
  end loop;

  insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id)
  values('journal_entries',v_entry_id::text,'POST',jsonb_build_object('entry_no',v_entry_no,'line_count',v_line_no),'Atomic manual journal posting',auth.uid());

  return query select v_entry_id,v_entry_no;
end $function$
;

CREATE OR REPLACE FUNCTION public.revise_open_journal_entry(p_entry_id uuid, p_reason text, p_transaction_date date, p_memo text, p_lines jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
 v_entry public.journal_entries; v_old jsonb; v_new jsonb; v_line jsonb;
 v_month date; v_status text; v_n integer:=0; v_dr numeric; v_cr numeric;
begin
 if auth.uid() is null or not public.has_user_permission('post') then
  raise exception 'Direct journal posting permission required';
 end if;
 if nullif(trim(p_reason),'') is null then raise exception 'A modification reason is required'; end if;
 if p_transaction_date is null or nullif(trim(p_memo),'') is null then raise exception 'Date and description are required'; end if;
 if p_lines is null or jsonb_typeof(p_lines)<>'array' then raise exception 'Journal lines must be an array'; end if;
 if jsonb_array_length(p_lines)<2 then raise exception 'At least two journal lines are required'; end if;
 select * into v_entry from public.journal_entries where id=p_entry_id for update;
 if not found or v_entry.status<>'posted' then raise exception 'Posted journal entry not found'; end if;
 -- Lock all affected periods in stable order. A closed/locked period is never bypassed.
 for v_month in
  select distinct month_key from (
   select date_trunc('month',v_entry.transaction_date)::date as month_key
   union select date_trunc('month',coalesce(line_date,v_entry.transaction_date))::date from public.journal_lines where journal_entry_id=p_entry_id
   union select date_trunc('month',p_transaction_date)::date
  ) m order by month_key
 loop
  insert into public.accounting_periods(period_month,status,updated_by)
   values(v_month,'open',auth.uid()) on conflict(period_month) do nothing;
  select status into v_status from public.accounting_periods where period_month=v_month for update;
  if v_status<>'open' then raise exception 'Period % must be reopened before editing',v_month; end if;
 end loop;
 for v_line in select value from jsonb_array_elements(p_lines) loop
  v_n:=v_n+1;
  v_dr:=coalesce((v_line->>'debit')::numeric,0); v_cr:=coalesce((v_line->>'credit')::numeric,0);
  if not ((v_dr>0 and v_cr=0) or (v_cr>0 and v_dr=0)) then raise exception 'Line % requires either debit or credit',v_n; end if;
  if v_dr<>round(v_dr,2) or v_cr<>round(v_cr,2) then raise exception 'Line % supports at most two decimal places',v_n; end if;
  if coalesce(nullif(v_line->>'line_date','')::date,p_transaction_date)<>p_transaction_date then raise exception 'Edited entry must have one transaction date'; end if;
  if not exists(select 1 from public.accounts a where a.id=(v_line->>'account_id')::uuid and a.is_active and a.currency_code=v_line->>'currency_code') then raise exception 'Line % has an invalid account or currency',v_n; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_lines) l group by l->>'currency_code'
  having sum(coalesce((l->>'debit')::numeric,0))<>sum(coalesce((l->>'credit')::numeric,0))) then raise exception 'Every currency must balance'; end if;
 select to_jsonb(v_entry)||jsonb_build_object('lines',coalesce(jsonb_agg(to_jsonb(l)||jsonb_build_object('account_name',a.name) order by l.line_no),'[]'::jsonb))
  into v_old from public.journal_lines l join public.accounts a on a.id=l.account_id where l.journal_entry_id=p_entry_id;
 -- Atomic replacement of lines: the journal header and its ID remain unchanged.
 delete from public.journal_lines where journal_entry_id=p_entry_id;
 v_n:=0;
 for v_line in select value from jsonb_array_elements(p_lines) loop
  v_n:=v_n+1;
  insert into public.journal_lines(journal_entry_id,line_no,account_id,line_date,description,currency_code,debit,credit,fx_rate_lak,book_rate_lak)
   values(p_entry_id,v_n,(v_line->>'account_id')::uuid,p_transaction_date,coalesce(v_line->>'description',p_memo),v_line->>'currency_code',coalesce((v_line->>'debit')::numeric,0),coalesce((v_line->>'credit')::numeric,0),nullif(v_line->>'fx_rate_lak','')::numeric,nullif(v_line->>'book_rate_lak','')::numeric);
 end loop;
 update public.journal_entries set transaction_date=p_transaction_date,memo=trim(p_memo),updated_at=now(),
  accounting_period_id=(select id from public.accounting_periods where period_month=date_trunc('month',p_transaction_date)::date)
  where id=p_entry_id;
 select to_jsonb(e)||jsonb_build_object('lines',(select coalesce(jsonb_agg(to_jsonb(l)||jsonb_build_object('account_name',a.name) order by l.line_no),'[]'::jsonb) from public.journal_lines l join public.accounts a on a.id=l.account_id where l.journal_entry_id=p_entry_id))
  into v_new from public.journal_entries e where e.id=p_entry_id;
 insert into public.audit_log(table_name,record_id,action,old_data,new_data,reason,actor_id)
  values('journal_entries',p_entry_id::text,'UPDATE',v_old,v_new,trim(p_reason),auth.uid());
end $function$
;

CREATE OR REPLACE FUNCTION public.save_staff_editor1437(p_owner uuid, p_key text, p_items jsonb, p_snapshot jsonb, p_edit_ids uuid[] DEFAULT ARRAY[]::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE receipt public.operation_receipts14228;request_payload jsonb;item jsonb; saved record; line_id uuid; position integer:=0; ids uuid[]:=ARRAY[]::uuid[];
 old_id uuid; existing_ids uuid[]; snapshot jsonb; n integer; actor uuid:=auth.uid();
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=actor AND status='active') THEN RAISE EXCEPTION 'Active login required';END IF;
 IF p_owner IS NULL OR NOT public.can_workspace113(p_owner) OR NOT public.can_action113(CASE WHEN actor=p_owner THEN 'sub-users-workspace' ELSE 'user-entry-review' END,'edit') THEN RAISE EXCEPTION 'Current workspace edit access required';END IF;
 IF p_key IS NULL OR length(p_key)<10 OR length(p_key)>160 THEN RAISE EXCEPTION 'Invalid save reference';END IF;
 IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items)<1 OR jsonb_array_length(p_items)>500 THEN RAISE EXCEPTION 'Provide 1 to 500 complete entries';END IF;
 IF jsonb_typeof(p_snapshot) IS DISTINCT FROM 'object' OR p_snapshot->'components1437' IS DISTINCT FROM p_items THEN RAISE EXCEPTION 'Editor snapshot must match the supplied entries';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text||':desktop-editor',0));
 request_payload:=jsonb_build_object('owner',p_owner,'items',p_items,'snapshot',p_snapshot,'edit_ids',coalesce(p_edit_ids,ARRAY[]::uuid[]));
 SELECT * INTO receipt FROM operation_receipts14228 WHERE actor_id=actor AND request_key=p_key;
 IF FOUND THEN
  IF receipt.operation<>'staff-editor' OR receipt.payload IS DISTINCT FROM request_payload THEN RAISE EXCEPTION 'Save reference already used for different data';END IF;
  RETURN receipt.result||jsonb_build_object('already_saved',true);
 END IF;
 SELECT array_agg(l.id),min(l.editor_snapshot1437::text)::jsonb INTO existing_ids,snapshot
 FROM public.staff_journal_lines l JOIN public.staff_journals j ON j.id=l.staff_journal_id
 WHERE j.owner_id=p_owner AND left(l.editor_group1437,length(p_key)+1)=p_key||':';
 IF cardinality(existing_ids)>0 THEN
  IF snapshot IS DISTINCT FROM p_snapshot THEN RAISE EXCEPTION 'Save reference already used; refresh before retrying';END IF;
  RETURN jsonb_build_object('line_ids',existing_ids,'already_saved',true);
 END IF;
 IF cardinality(p_edit_ids)>0 THEN
  SELECT count(*) INTO n FROM public.staff_journal_lines l JOIN public.staff_journals j ON j.id=l.staff_journal_id
  WHERE l.id=ANY(p_edit_ids) AND j.owner_id=p_owner AND j.status IN ('draft','returned') AND l.journal_entry_id IS NULL;
  IF n<>cardinality(p_edit_ids) THEN RAISE EXCEPTION 'Only editable entries in this personal journal can be changed';END IF;
 END IF;
 -- Explicit target applies only to new lines; v3 rechecks owner, period and returned status.
 PERFORM set_config('app.correction_journal14347',coalesce(p_snapshot->>'correction_journal14347',''),true);
 FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  position:=position+1;old_id:=p_edit_ids[position];
  SELECT * INTO saved FROM public.save_staff_workspace_entry_v3(
   p_owner_id=>p_owner,p_line_id=>old_id,p_client_key=>p_key||':'||position,
   p_transaction_date=>(item->>'date')::date,p_direction=>item->>'direction',
   p_fund_account_id=>(item->>'fund')::uuid,p_account_id=>(item->>'account')::uuid,
   p_memo=>item->>'memo',p_reference=>coalesce(item->>'reference',''),
   p_amount=>(item->>'amount')::numeric,p_entry_kind=>item->>'kind');
  line_id:=saved.line_id;
  IF line_id IS NULL THEN RAISE EXCEPTION 'Entry save returned no record';END IF;
  UPDATE public.staff_journal_lines l SET editor_group1437=p_key||':'||(item->>'date'),editor_snapshot1437=p_snapshot,fx_rate_lak=nullif(item->>'fx_rate_lak','')::numeric
  FROM public.staff_journals j WHERE l.id=line_id AND j.id=l.staff_journal_id AND j.owner_id=p_owner;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'Saved entry owner did not match';END IF;
  ids:=array_append(ids,line_id);
 END LOOP;
 FOREACH old_id IN ARRAY coalesce(p_edit_ids,ARRAY[]::uuid[]) LOOP
  IF NOT old_id=ANY(ids) THEN PERFORM public.void_staff_workspace_entry(p_line_id=>old_id,p_reason=>'Replaced while editing the personal journal transaction');END IF;
 END LOOP;
 PERFORM set_config('app.correction_journal14347','',true);
 INSERT INTO operation_receipts14228(actor_id,request_key,operation,payload,result) VALUES(actor,p_key,'staff-editor',request_payload,jsonb_build_object('line_ids',ids,'already_saved',false));
 RETURN jsonb_build_object('line_ids',ids,'already_saved',false);
END $function$
;

CREATE OR REPLACE FUNCTION public.post_report14349(p_journal uuid, p_date date, p_memo text, p_lines jsonb, p_prefix text, p_digits integer, p_mode text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE j staff_journals;snapshot jsonb;expected jsonb;actual jsonb;posted record;item jsonb;src record;line_id uuid;summary_line_no integer:=0;owner_name text;receipt operation_receipts14228;payload jsonb;answer jsonb;
BEGIN
 IF auth.uid() IS NULL OR p_mode NOT IN ('consolidated','detailed') OR p_mode IS NULL THEN RAISE EXCEPTION 'Authenticated user and posting mode required';END IF;
 IF NOT public.has_user_permission('approve') OR NOT public.has_user_permission('post') OR NOT public.can_action113('user-entry-review','post') OR NOT public.can_action113('journal','post') THEN RAISE EXCEPTION 'Review and journal posting permissions required';END IF;
 SELECT * INTO j FROM staff_journals WHERE id=p_journal FOR UPDATE;
 IF NOT FOUND OR NOT public.can_workspace113(j.owner_id) THEN RAISE EXCEPTION 'Workspace access denied';END IF;
 PERFORM public.assert_final_review14229(p_journal);
 payload=jsonb_build_object('date',p_date,'memo',p_memo,'lines',p_lines,'prefix',p_prefix,'digits',p_digits,'mode',p_mode);
 SELECT * INTO receipt FROM operation_receipts14228 WHERE actor_id=auth.uid() AND request_key='summary:'||p_journal::text;
 IF FOUND THEN IF receipt.payload IS DISTINCT FROM payload THEN RAISE EXCEPTION 'Report already posted with different data';END IF;RETURN receipt.result;END IF;
 IF j.status<>'submitted' THEN RAISE EXCEPTION 'Report is not awaiting posting';END IF;
 SELECT a.snapshot INTO snapshot FROM approved_reports1443 a WHERE a.journal_id=p_journal;
 IF NOT FOUND THEN RAISE EXCEPTION 'Approve the exact detailed report before summary posting';END IF;
 IF p_date IS NULL OR date_trunc('month',p_date)<>date_trunc('month',j.period_start) THEN RAISE EXCEPTION 'Keep original reporting dates';END IF;
 PERFORM 1 FROM staff_journal_lines WHERE staff_journal_id=p_journal FOR UPDATE;
 -- Compare immutable reviewed content, ignoring only links filled by previous postings.
 IF (SELECT jsonb_agg(jsonb_strip_nulls(to_jsonb(l)-'journal_entry_id') ORDER BY l.id) FROM staff_journal_lines l WHERE staff_journal_id=p_journal)
 IS DISTINCT FROM (SELECT jsonb_agg(jsonb_strip_nulls(x-'journal_entry_id') ORDER BY x->>'id') FROM jsonb_array_elements(snapshot->'journal'->'lines') x) THEN RAISE EXCEPTION 'Source changed after approval';END IF;
 IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines)<2 THEN RAISE EXCEPTION 'No balanced summary supplied';END IF;
 -- Derive the exact allowed lines. Only fund sides may be consolidated.
 WITH sides AS (
 SELECT l.id,l.transaction_date,l.currency_code,l.fx_rate_lak,l.amount,l.account_id,CASE WHEN l.direction='in' THEN 'credit' ELSE 'debit' END side,l.id::text bucket FROM staff_journal_lines l WHERE l.staff_journal_id=p_journal AND NOT (l.entry_kind='collection' AND l.account_id=l.fund_account_id) AND l.journal_entry_id IS NULL
 UNION ALL SELECT l.id,l.transaction_date,l.currency_code,l.fx_rate_lak,l.amount,l.fund_account_id,CASE WHEN l.direction='in' THEN 'debit' ELSE 'credit' END,CASE WHEN p_mode='consolidated' THEN 'fund' ELSE l.id::text END FROM staff_journal_lines l WHERE l.staff_journal_id=p_journal AND NOT (l.entry_kind='collection' AND l.account_id=l.fund_account_id) AND l.journal_entry_id IS NULL
 ), grouped AS (SELECT transaction_date,account_id,currency_code,fx_rate_lak,side,bucket,sum(amount) amount,jsonb_agg(id::text ORDER BY id::text) ids FROM sides GROUP BY transaction_date,account_id,currency_code,fx_rate_lak,side,bucket), objects AS (
 SELECT jsonb_build_object('date',transaction_date,'account',account_id,'currency',currency_code,'side',side,'amount',amount,'ids',ids) obj FROM grouped)
 SELECT jsonb_agg(obj ORDER BY obj::text) INTO expected FROM objects;
 WITH objects AS (SELECT jsonb_build_object('date',(x->>'line_date')::date,'account',(x->>'account_id')::uuid,'currency',x->>'currency_code','side',CASE WHEN (x->>'debit')::numeric>0 THEN 'debit' ELSE 'credit' END,'amount',greatest((x->>'debit')::numeric,(x->>'credit')::numeric),'ids',(SELECT jsonb_agg(v ORDER BY v) FROM jsonb_array_elements_text(x->'source_ids') v)) obj FROM jsonb_array_elements(p_lines) x)
 SELECT jsonb_agg(obj ORDER BY obj::text) INTO actual FROM objects;
 IF expected IS NULL OR expected IS DISTINCT FROM actual THEN RAISE EXCEPTION 'Dates, accounts, amounts or references do not match the approved report';END IF;
 -- Preserve reviewed rates. A reviewer may supply rates absent from older source records.
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_lines) x CROSS JOIN LATERAL jsonb_array_elements_text(x->'source_ids') sid JOIN staff_journal_lines l ON l.id=sid.value::uuid WHERE l.currency_code<>'LAK' AND l.fx_rate_lak IS NOT NULL AND l.fx_rate_lak IS DISTINCT FROM nullif(x->>'fx_rate_lak','')::numeric) THEN RAISE EXCEPTION 'Exchange rates do not match the approved report';END IF;
 -- Validate and lock every original date before allocating one entry number.
 FOR src IN SELECT (x->>'line_date')::date d,jsonb_agg(x) lines FROM jsonb_array_elements(p_lines) x GROUP BY (x->>'line_date')::date ORDER BY (x->>'line_date')::date LOOP
 PERFORM public.validate_journal14228(src.d,p_memo,src.lines);
 END LOOP;
 SELECT * INTO posted FROM public.post_report_worker14349(p_date,p_memo,p_lines,p_prefix,p_digits);
 owner_name=coalesce(snapshot->'user'->>'full_name',(SELECT full_name FROM profiles WHERE id=j.owner_id),'Former user');
 FOR item IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
 summary_line_no=summary_line_no+1;SELECT l.id INTO STRICT line_id FROM journal_lines l WHERE l.journal_entry_id=posted.entry_id AND l.line_no=summary_line_no;
 FOR src IN SELECT l.* FROM staff_journal_lines l WHERE l.id IN(SELECT value::uuid FROM jsonb_array_elements_text(item->'source_ids')) LOOP
 INSERT INTO journal_sources14253 VALUES(line_id,src.id,p_journal,src.workspace_entry_no,j.owner_id,owner_name,src.transaction_date,src.memo,src.reference,src.amount);
 END LOOP;END LOOP;
 UPDATE staff_journal_lines SET journal_entry_id=posted.entry_id WHERE staff_journal_id=p_journal AND NOT (entry_kind='collection' AND account_id=fund_account_id) AND journal_entry_id IS NULL;
 UPDATE staff_journals SET status='posted',reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() WHERE id=p_journal;
 answer=jsonb_build_object('entry_id',posted.entry_id,'entry_no',posted.entry_no,'report_id',p_journal);
 INSERT INTO operation_receipts14228(actor_id,request_key,operation,payload,result) VALUES(auth.uid(),'summary:'||p_journal::text,'workspace-summary',payload,answer);
 INSERT INTO audit_log(table_name,record_id,action,new_data,reason,actor_id) VALUES('staff_journals',p_journal::text,'POST',answer,'Approved report posted with original dates: '||p_mode,auth.uid());
 RETURN answer;
END $function$
;

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
 l.debit,l.credit,l.fx_rate_lak,l.book_rate_lak,l.base_debit,l.base_credit,false AS archived
 FROM public.journal_entries e JOIN public.journal_lines l ON l.journal_entry_id=e.id
 LEFT JOIN public.accounts a ON a.id=l.account_id
 WHERE e.status='posted' AND coalesce(l.line_date,e.transaction_date) BETWEEN p_from AND p_to
 ORDER BY coalesce(l.line_date,e.transaction_date) DESC,e.id,l.line_no LIMIT 500 OFFSET p_offset
 ) r;
 IF p_offset=0 THEN
 SELECT coalesce(jsonb_agg(row_to_json(b)),'[]') INTO opening FROM (
 SELECT l.account_id AS "accountId",l.currency_code AS currency,sum(l.debit-l.credit) AS balance,CASE WHEN bool_or(l.base_debit IS NULL OR l.base_credit IS NULL) THEN NULL ELSE sum(l.base_debit-l.base_credit) END AS base_balance
 FROM public.journal_entries e JOIN public.journal_lines l ON l.journal_entry_id=e.id
 WHERE e.status='posted' AND coalesce(l.line_date,e.transaction_date)<p_from
 GROUP BY l.account_id,l.currency_code HAVING sum(l.debit-l.credit)<>0 OR sum(l.base_debit-l.base_credit)<>0 OR bool_or(l.base_debit IS NULL OR l.base_credit IS NULL)
 ) b;
 END IF;
 SELECT md5(coalesce(sum(hashtextextended(concat_ws('|',e.id,e.entry_no,e.transaction_date,e.memo,e.status,e.updated_at,l.id,l.account_id,l.currency_code,l.debit,l.credit,l.line_date,l.description,l.fx_rate_lak,l.book_rate_lak),0)::numeric)::text,'0')) INTO revision
 FROM public.journal_entries e JOIN public.journal_lines l ON l.journal_entry_id=e.id WHERE e.status='posted' AND coalesce(l.line_date,e.transaction_date)<=p_to;
 RETURN jsonb_build_object('rows',result,'opening',opening,'revision',revision);
END $function$
;

NOTIFY pgrst, 'reload schema';