-- v143.114: compact year-prefixed IDs. Existing financial identifiers are not rewritten.
-- Keep posting permissions, idempotency, locks, and shared journal sequence intact.
CREATE OR REPLACE FUNCTION private.format_entry_id143114(p_stem text,p_date date,p_number bigint,p_digits integer DEFAULT 4)
RETURNS text LANGUAGE sql IMMUTABLE STRICT SET search_path=pg_catalog AS $$
 SELECT upper(regexp_replace(p_stem,'[^A-Za-z0-9]','','g')) || to_char(p_date,'YY') || lpad(p_number::text,greatest(coalesce(p_digits,4),length(p_number::text)),'0')
$$;
REVOKE ALL ON FUNCTION private.format_entry_id143114(text,date,bigint,integer) FROM PUBLIC,anon,authenticated;


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
    v_entry_no := private.format_entry_id143114(v_prefix,p_transaction_date,nextval('public.journal_entry_number_seq'),v_digits);
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
    v_entry_no := private.format_entry_id143114(v_prefix,p_transaction_date,nextval('public.journal_entry_number_seq'),v_digits);
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

CREATE OR REPLACE FUNCTION public.next_schedule_no91()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare p text;d integer;n text;
begin
 select schedule_prefix,journal_digits into p,d from public.accounting_id_settings where id=true;
 n:=nextval('public.scheduled_journal_number_seq')::text;
 return private.format_entry_id143114(coalesce(p,'SCH'),(now() at time zone 'Asia/Vientiane')::date,n::bigint,coalesce(d,4));
end $function$
;

CREATE OR REPLACE FUNCTION public.next_adjustment_no89()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare p text;d integer;n text;
begin
 select adjustment_prefix,journal_digits into p,d from public.accounting_id_settings where id=true;
 n:=nextval('public.fund_adjustment_request_seq')::text;
 return private.format_entry_id143114(coalesce(p,'ADJ'),(now() at time zone 'Asia/Vientiane')::date,n::bigint,coalesce(d,4));
end $function$
;

CREATE OR REPLACE FUNCTION public.post_scheduled_one91(p_id uuid, p_early boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare s public.scheduled_journals;v_id uuid;v_no text;v_num text;v_prefix text;v_digits integer;v_today date;v_post date;v_status text;v_currency text;v_other text;v_attempt integer:=0;v_next date;v_index integer;
begin
 if auth.uid() is not null and not public.schedule_admin91() then raise exception 'Administrator required';end if;
 select * into s from public.scheduled_journals where id=p_id for update;
 if not found or s.status<>'active' or s.is_sample then raise exception 'Schedule is unavailable for posting';end if;
 v_today:=(now() at time zone 'Asia/Vientiane')::date;
 if not p_early and s.next_due>v_today then raise exception 'Schedule is not due yet';end if;
 if s.end_date is not null and s.next_due>s.end_date or s.max_occurrences is not null and s.posted_count>=s.max_occurrences then raise exception 'Schedule ended';end if;
 v_post:=s.next_due;
 if s.credit_amount is null or s.credit_amount<>s.amount then raise exception 'Debit and credit must balance';end if;
 select status into v_status from public.accounting_periods where period_month=date_trunc('month',v_post)::date;
 if coalesce(v_status,'open')<>'open' then raise exception 'Posting period is %',v_status;end if;
 select currency_code into v_currency from public.accounts where id=s.debit_account_id and is_active=true;
 select currency_code into v_other from public.accounts where id=s.credit_account_id and is_active=true;
 if v_currency is null or v_currency is distinct from s.currency_code or v_other is distinct from s.currency_code then raise exception 'Scheduled account is inactive or has changed currency';end if;
 select automated_prefix,journal_digits into v_prefix,v_digits from public.accounting_id_settings where id=true;
 loop
  v_attempt:=v_attempt+1;if v_attempt>1000 then raise exception 'Unable to allocate entry ID';end if;
  v_num:=nextval('public.journal_entry_number_seq')::text;
  v_no:=private.format_entry_id143114(coalesce(v_prefix,'AUTO'),v_post,v_num::bigint,coalesce(v_digits,4));
  begin
   insert into public.journal_entries(entry_no,transaction_date,memo,status,source,posted_by,posted_at)
   values(v_no,v_post,s.memo,'posted','recurring',auth.uid(),now()) returning id into v_id;
   exit;
  exception when unique_violation then null;
  end;
 end loop;
 insert into public.journal_lines(journal_entry_id,line_no,account_id,description,currency_code,debit,credit,line_date) values
 (v_id,1,s.debit_account_id,s.memo,s.currency_code,s.amount,0,v_post),
 (v_id,2,s.credit_account_id,s.memo,s.currency_code,0,s.amount,v_post);
 insert into public.scheduled_journal_occurrences(schedule_id,occurrence_date,journal_entry_id,posted_early) values(s.id,s.next_due,v_id,p_early and s.next_due>v_today);
 v_index:=s.posted_count+1;v_next:=public.schedule_next_date91(s.start_date,s.frequency,s.day_rule,s.anchor_day,v_index);
 update public.scheduled_journals set posted_count=v_index,next_due=v_next,status=case when (s.max_occurrences is not null and v_index>=s.max_occurrences) or (s.end_date is not null and v_next>s.end_date) then 'complete' else 'active' end,last_error=null,updated_at=now() where id=s.id;
 insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id) values('journal_entries',v_id::text,'AUTO_POST',jsonb_build_object('schedule_id',s.id,'due_date',s.next_due,'posted_early',p_early,'entry_no',v_no),'Scheduled journal posted',auth.uid());
 return v_no;
end $function$
;

CREATE OR REPLACE FUNCTION public.preview_journal_number143114(p_date date, p_prefix text DEFAULT 'OJM'::text, p_digits integer DEFAULT 6)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE next_number bigint; prefix text; digits integer; attempts integer:=0;
BEGIN
 IF NOT public.can_action113('journal','view') THEN RAISE EXCEPTION 'Journal access required' USING ERRCODE='42501'; END IF;
 SELECT CASE WHEN is_called THEN last_value+1 ELSE last_value END INTO next_number FROM public.journal_entry_number_seq;
 prefix:=left(coalesce(nullif(upper(regexp_replace(coalesce(nullif(trim(p_prefix),''),'OJM'),'[^A-Za-z0-9]','','g')),''),'OJM'),8);
 digits:=greatest(3,least(9,coalesce(p_digits,6)));
 WHILE EXISTS(SELECT 1 FROM public.journal_entries WHERE entry_no=private.format_entry_id143114(prefix,p_date,next_number,digits)) LOOP
  next_number:=next_number+1;attempts:=attempts+1;
  IF attempts>1000 THEN RAISE EXCEPTION 'Unable to preview a unique journal number'; END IF;
 END LOOP;
 RETURN next_number;
END $function$
;

REVOKE ALL ON FUNCTION public.preview_journal_number143114(date,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.preview_journal_number143114(date,text,integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.preview_journal_number14257(p_prefix text DEFAULT 'OJM',p_digits integer DEFAULT 4)
RETURNS bigint LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$
 SELECT public.preview_journal_number143114((now() at time zone 'Asia/Vientiane')::date,p_prefix,p_digits)
$$;


CREATE OR REPLACE FUNCTION public.preview_staff_entry143114(p_user_id uuid,p_date date)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE permission public.user_permissions; n bigint; stem text; candidate text; attempts integer:=0;
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_workspace113(p_user_id) THEN RAISE EXCEPTION 'Current assigned workspace access required'; END IF;
 SELECT * INTO permission FROM public.user_permissions WHERE user_id=p_user_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'User permissions not configured'; END IF;
 IF p_date IS NULL THEN RAISE EXCEPTION 'Entry date required'; END IF;
 stem:=coalesce(nullif(permission.entry_prefix,''),'S')||coalesce(nullif(permission.entry_initials,''),'U');
 SELECT coalesce((SELECT last_number FROM public.staff_entry_sequences WHERE user_id=p_user_id),0)+1 INTO n;
 LOOP
  candidate:=private.format_entry_id143114(stem,p_date,n,coalesce(permission.entry_digits,4));
  EXIT WHEN NOT EXISTS(SELECT 1 FROM public.staff_journal_lines WHERE workspace_entry_no=candidate);
  n:=n+1;attempts:=attempts+1;
  IF attempts>1000 THEN RAISE EXCEPTION 'Unable to preview a unique workspace number';END IF;
 END LOOP;
 RETURN candidate;
END $$;
REVOKE ALL ON FUNCTION public.preview_staff_entry143114(uuid,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.preview_staff_entry143114(uuid,date) TO authenticated;
CREATE OR REPLACE FUNCTION public.preview_staff_workspace_entry_no(p_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
 SELECT public.preview_staff_entry143114(p_user_id,(now() at time zone 'Asia/Vientiane')::date)
$$;


CREATE OR REPLACE FUNCTION public.save_staff_workspace_entry_v3(p_owner_id uuid, p_line_id uuid, p_client_key text, p_transaction_date date, p_direction text, p_fund_account_id uuid, p_account_id uuid, p_memo text, p_reference text, p_amount numeric, p_entry_kind text)
 RETURNS TABLE(line_id uuid, workspace_entry_no text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare permission public.user_permissions; journal_row public.staff_journals; existing_line public.staff_journal_lines;
 month_start date; number_next bigint; number_prefix text; number_text text; sequence_line integer; new_id uuid; fund_currency text;
begin
 if p_owner_id IS NULL OR NOT public.can_workspace113(p_owner_id) OR NOT public.can_action113(CASE WHEN p_owner_id=auth.uid() THEN 'sub-users-workspace' ELSE 'user-entry-review' END,'edit') then raise exception 'Current workspace edit access required';end if;
 if p_transaction_date is null or p_amount is null or p_amount::text IN ('NaN','Infinity','-Infinity') OR p_amount<>round(p_amount,2) or p_amount<=0 or nullif(trim(p_memo),'') is null then raise exception 'Date, description and positive amount are required'; end if;
 if p_direction is null or p_direction not in ('in','out') or p_entry_kind is null or p_entry_kind not in ('collection','payment','handover') then raise exception 'Invalid activity'; end if;
 if (p_entry_kind='collection')<>(p_direction='in') then raise exception 'Collection must use Money In; payments and handovers must use Money Out'; end if;
 select * into permission from public.user_permissions where user_id=p_owner_id;
 if not found then raise exception 'User permissions not configured'; end if;
 if not coalesce(p_direction=any(permission.allowed_directions),false) then raise exception 'This direction is not allowed'; end if;
 if p_fund_account_id is null or not coalesce(p_fund_account_id=any(permission.assigned_fund_account_ids),false) then raise exception 'Main account not assigned'; end if;
 if not permission.allow_multiple_funds and cardinality(permission.assigned_fund_account_ids)>1 then raise exception 'Multiple funds must be enabled'; end if;
 if p_account_id is null then raise exception 'Account is required'; end if;
 if p_direction='in' and p_account_id<>p_fund_account_id and not coalesce(p_account_id=any(permission.destination_account_ids) or p_account_id=any(permission.allowed_account_ids),false) then raise exception 'Money In category not assigned'; end if;
 if p_direction='out' and not coalesce(p_account_id=any(permission.destination_account_ids) or p_account_id=any(permission.allowed_account_ids),false) then raise exception 'Entry account not assigned'; end if;
 if p_direction='out' and p_account_id=p_fund_account_id then raise exception 'The receiving/spending account must differ from the fund'; end if;
 select currency_code into fund_currency from public.accounts where id=p_fund_account_id;
 if fund_currency is null then raise exception 'Main account currency missing'; end if;
 if (select currency_code from public.accounts where id=p_account_id) is distinct from fund_currency then raise exception 'Main and entry accounts must use the same currency'; end if;
 month_start:=date_trunc('month',p_transaction_date)::date;
 -- Serialize creation/saving for one owner. Client key prevents duplicate retries.
 perform pg_advisory_xact_lock(hashtext('workspace:'||p_owner_id::text));
 if p_line_id IS NULL AND (p_client_key IS NULL OR length(p_client_key) NOT BETWEEN 10 AND 200) THEN RAISE EXCEPTION 'Stable save reference required';END IF;
 if p_line_id is null and p_client_key is not null then
   select line.* into existing_line from public.staff_journal_lines line join public.staff_journals journal on journal.id=line.staff_journal_id where line.client_key=p_client_key and journal.owner_id=p_owner_id;
   if found then
    IF (existing_line.transaction_date,existing_line.direction,existing_line.fund_account_id,existing_line.account_id,existing_line.memo,existing_line.reference,existing_line.amount,existing_line.entry_kind)
      IS DISTINCT FROM (p_transaction_date,p_direction,p_fund_account_id,p_account_id,trim(p_memo),coalesce(p_reference,''),p_amount,p_entry_kind)
      THEN RAISE EXCEPTION 'Save reference already used for different data';END IF;
    return query select existing_line.id,existing_line.workspace_entry_no;return;end if;
 end if;
 -- v143.47: each submission has its own journal; returned books never replace a draft.
 if p_line_id is not null then
  select j.* into journal_row from public.staff_journals j join public.staff_journal_lines l on l.staff_journal_id=j.id
  where l.id=p_line_id and j.owner_id=p_owner_id and j.period_start=month_start and j.status in ('draft','returned') for update of j;
 elsif nullif(current_setting('app.correction_journal14347',true),'') is not null then
  select * into journal_row from public.staff_journals where id=nullif(current_setting('app.correction_journal14347',true),'')::uuid
   and owner_id=p_owner_id and period_start=month_start and status='returned' for update;
 else
  insert into public.staff_journals(owner_id,period_start,period_end,status) values(p_owner_id,month_start,(month_start+interval '1 month - 1 day')::date,'draft')
   on conflict(owner_id,period_start) where status='draft' do nothing;
  select * into journal_row from public.staff_journals where owner_id=p_owner_id and period_start=month_start and status='draft' for update;
 end if;
 if journal_row.id is null then raise exception 'This entry or returned submission is no longer editable in the selected month';end if;
 if p_line_id is not null then
   select * into existing_line from public.staff_journal_lines where id=p_line_id and staff_journal_id=journal_row.id for update;
   if not found or existing_line.journal_entry_id is not null then raise exception 'Entry unavailable or already posted'; end if;
   insert into public.audit_log(table_name,record_id,action,old_data,new_data,reason,actor_id)
   values('staff_journal_lines',p_line_id::text,'EDIT',to_jsonb(existing_line),jsonb_build_object('transaction_date',p_transaction_date,'direction',p_direction,'fund_account_id',p_fund_account_id,'account_id',p_account_id,'memo',p_memo,'reference',p_reference,'amount',p_amount,'entry_kind',p_entry_kind),coalesce(journal_row.return_note,'Workspace draft edited'),auth.uid());
   update public.staff_journal_lines set transaction_date=p_transaction_date,direction=p_direction,fund_account_id=p_fund_account_id,account_id=p_account_id,memo=trim(p_memo),reference=coalesce(p_reference,''),amount=p_amount,currency_code=fund_currency,entry_kind=p_entry_kind where id=p_line_id;
   return query select p_line_id,existing_line.workspace_entry_no;return;
 end if;
 perform pg_advisory_xact_lock(hashtext('workspace-entry-number'));
 number_text:=public.preview_staff_entry143114(p_owner_id,p_transaction_date);
 number_prefix:=coalesce(nullif(permission.entry_prefix,''),'S')||coalesce(nullif(permission.entry_initials,''),'U');
 number_next:=substring(number_text from length(number_prefix)+3)::bigint;
 insert into public.staff_entry_sequences(user_id,last_number) values(p_owner_id,number_next) on conflict(user_id) do update set last_number=greatest(public.staff_entry_sequences.last_number,excluded.last_number),updated_at=now();
 select coalesce(max(line_no),0)+1 into sequence_line from public.staff_journal_lines where staff_journal_id=journal_row.id;
 insert into public.staff_journal_lines(staff_journal_id,line_no,transaction_date,direction,fund_account_id,account_id,memo,reference,amount,currency_code,workspace_entry_no,entry_kind,client_key)
 values(journal_row.id,sequence_line,p_transaction_date,p_direction,p_fund_account_id,p_account_id,trim(p_memo),coalesce(p_reference,''),p_amount,fund_currency,number_text,p_entry_kind,p_client_key) returning id into new_id;
 return query select new_id,number_text;
end $function$
;

CREATE OR REPLACE FUNCTION public.add_staff_workspace_entry(p_journal_id uuid, p_transaction_date date, p_fund_account_id uuid, p_account_id uuid, p_memo text, p_reference text, p_amount numeric, p_currency_code text)
 RETURNS TABLE(line_id uuid, workspace_entry_no text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  j public.staff_journals;
  p public.user_permissions;
  cfg public.accounting_id_settings;
  parts text[];
  initials text;
  next_number bigint;
  next_line integer;
  new_line_id uuid;
  new_entry_no text;
begin
  select * into j from public.staff_journals where id=p_journal_id for update;
  if not found or not (j.owner_id=auth.uid() or public.has_user_permission('approve')) then raise exception 'Workspace journal not found'; end if;
  if j.status not in ('draft','returned') then raise exception 'This workspace is locked'; end if;
  if p_transaction_date is null or p_amount<=0 or nullif(trim(p_memo),'') is null then raise exception 'Date, description, and positive amount are required'; end if;
  select * into p from public.user_permissions where user_id=j.owner_id;
  if not found then raise exception 'The employee has no account assignment'; end if;
  if not (p_fund_account_id=any(p.assigned_fund_account_ids)) then raise exception 'Main account is not assigned to this employee'; end if;
  if not p.allow_any_account and not (p_account_id=any(p.destination_account_ids) or p_account_id=any(p.allowed_account_ids)) then raise exception 'Entry account is not assigned to this employee'; end if;
  select * into cfg from public.accounting_id_settings where id=true;
  parts:=regexp_split_to_array(trim(coalesce((select full_name from public.profiles where id=j.owner_id),'USER')),'\s+');
  initials:=upper(left(parts[1],1)||case when array_length(parts,1)>1 then left(parts[array_length(parts,1)],1) else '' end);
  insert into public.staff_entry_sequences(user_id,last_number) values(j.owner_id,1)
  on conflict(user_id) do update set last_number=public.staff_entry_sequences.last_number+1,updated_at=now()
  returning last_number into next_number;
  new_entry_no:=private.format_entry_id143114(coalesce(nullif(p.entry_prefix,''),'S')||coalesce(nullif(p.entry_initials,''),initials),p_transaction_date,next_number,coalesce(cfg.journal_digits,4));
  select coalesce(max(line_no),0)+1 into next_line from public.staff_journal_lines where staff_journal_id=j.id;
  insert into public.staff_journal_lines(staff_journal_id,line_no,transaction_date,direction,fund_account_id,account_id,memo,reference,amount,currency_code,workspace_entry_no)
  values(j.id,next_line,p_transaction_date,'out',p_fund_account_id,p_account_id,trim(p_memo),coalesce(p_reference,''),p_amount,p_currency_code,new_entry_no)
  returning id into new_line_id;
  return query select new_line_id,new_entry_no;
end $function$
;

CREATE OR REPLACE FUNCTION public.save_staff_workspace_entry_v2(p_line_id uuid, p_journal_id uuid, p_transaction_date date, p_direction text, p_fund_account_id uuid, p_account_id uuid, p_memo text, p_reference text, p_amount numeric, p_currency_code text)
 RETURNS TABLE(line_id uuid, workspace_entry_no text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  j public.staff_journals;
  p public.user_permissions;
  cfg public.accounting_id_settings;
  existing_line public.staff_journal_lines;
  parts text[];
  initials text;
  next_number bigint;
  next_line integer;
  new_line_id uuid;
  new_entry_no text;
begin
  select * into j from public.staff_journals where id=p_journal_id for update;
  if not found or not (j.owner_id=auth.uid() or public.has_user_permission('approve')) then raise exception 'Workspace journal not found'; end if;
  if j.status not in ('draft','returned') then raise exception 'This workspace is locked'; end if;
  if p_transaction_date is null or p_amount<=0 or nullif(trim(p_memo),'') is null then raise exception 'Date, description, and positive amount are required'; end if;
  if p_direction not in ('out','in') then raise exception 'Direction must be Money Out or Money In'; end if;

  select * into p from public.user_permissions where user_id=j.owner_id;
  if not found then raise exception 'The employee has no account assignment'; end if;
  if not (p_direction=any(coalesce(p.allowed_directions,'{}'::text[]))) then raise exception 'This direction is not enabled for the employee'; end if;
  if not (p_fund_account_id=any(coalesce(p.assigned_fund_account_ids,'{}'::uuid[]))) then raise exception 'Main account is not assigned to this employee'; end if;
  if p_direction='out' and not (p_account_id=any(coalesce(p.destination_account_ids,'{}'::uuid[])) or p_account_id=any(coalesce(p.allowed_account_ids,'{}'::uuid[]))) then raise exception 'Entry or spending account is not assigned to this employee'; end if;
  if p_direction='in' and (p.money_in_counterpart_account_id is null or p_account_id<>p.money_in_counterpart_account_id) then raise exception 'Money In must use the configured counterpart account'; end if;

  if p_line_id is not null then
    select * into existing_line from public.staff_journal_lines where id=p_line_id and staff_journal_id=p_journal_id for update;
    if not found then raise exception 'Workspace line not found'; end if;
    update public.staff_journal_lines set transaction_date=p_transaction_date,direction=p_direction,fund_account_id=p_fund_account_id,account_id=p_account_id,memo=trim(p_memo),reference=coalesce(p_reference,''),amount=p_amount,currency_code=p_currency_code where id=p_line_id;
    return query select p_line_id,existing_line.workspace_entry_no;
    return;
  end if;

  select * into cfg from public.accounting_id_settings where id=true;
  parts:=regexp_split_to_array(trim(coalesce((select full_name from public.profiles where id=j.owner_id),'USER')),'\s+');
  initials:=upper(left(parts[1],1)||case when array_length(parts,1)>1 then left(parts[array_length(parts,1)],1) else '' end);
  insert into public.staff_entry_sequences(user_id,last_number) values(j.owner_id,1)
  on conflict(user_id) do update set last_number=public.staff_entry_sequences.last_number+1,updated_at=now()
  returning last_number into next_number;
  new_entry_no:=private.format_entry_id143114(coalesce(nullif(p.entry_prefix,''),'S')||coalesce(nullif(p.entry_initials,''),initials),p_transaction_date,next_number,coalesce(cfg.journal_digits,4));
  select coalesce(max(line_no),0)+1 into next_line from public.staff_journal_lines where staff_journal_id=j.id;
  insert into public.staff_journal_lines(staff_journal_id,line_no,transaction_date,direction,fund_account_id,account_id,memo,reference,amount,currency_code,workspace_entry_no)
  values(j.id,next_line,p_transaction_date,p_direction,p_fund_account_id,p_account_id,trim(p_memo),coalesce(p_reference,''),p_amount,p_currency_code,new_entry_no)
  returning id into new_line_id;
  return query select new_line_id,new_entry_no;
end $function$
;

CREATE OR REPLACE FUNCTION public.approve_staff_journal(p_journal_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare j public.staff_journals; p public.user_permissions; l public.staff_journal_lines; new_entry_id uuid; entry_no text; count_posted integer:=0;
begin
  if not public.has_user_permission('approve') then raise exception 'Approval permission required'; end if;
  select * into j from public.staff_journals where id=p_journal_id for update;
  if not found or j.status<>'submitted' then raise exception 'Submitted journal not found'; end if;
  select * into p from public.user_permissions where user_id=j.owner_id;
  if not found then raise exception 'The user has no account mapping'; end if;
  if p.default_out_credit_account_id is null or p.default_in_debit_account_id is null then raise exception 'The user has incomplete default account mapping'; end if;
  for l in select * from public.staff_journal_lines where staff_journal_id=j.id order by line_no loop
    if not p.allow_any_account and not (l.account_id=any(p.allowed_account_ids)) then raise exception 'Line % uses an account not allowed for this user',l.line_no; end if;
    if not (l.direction=any(p.allowed_directions)) then raise exception 'Line % uses a direction not allowed for this user',l.line_no; end if;
    entry_no:=private.format_entry_id143114(coalesce((select journal_prefix from public.accounting_id_settings where id=true),'OJM'),l.transaction_date,nextval('public.journal_entry_number_seq'),coalesce((select journal_digits from public.accounting_id_settings where id=true),4));
    insert into public.journal_entries(entry_no,transaction_date,memo,reference,status,source,submitted_by,posted_by,posted_at)
    values(entry_no,l.transaction_date,l.memo,l.reference,'posted','staff_journal',j.owner_id,auth.uid(),now()) returning id into new_entry_id;
    if l.direction='out' then
      insert into public.journal_lines(journal_entry_id,line_no,account_id,description,currency_code,debit,credit,line_date) values
        (new_entry_id,1,l.account_id,l.memo,l.currency_code,l.amount,0,l.transaction_date),
        (new_entry_id,2,p.default_out_credit_account_id,l.memo,l.currency_code,0,l.amount,l.transaction_date);
    else
      insert into public.journal_lines(journal_entry_id,line_no,account_id,description,currency_code,debit,credit,line_date) values
        (new_entry_id,1,p.default_in_debit_account_id,l.memo,l.currency_code,l.amount,0,l.transaction_date),
        (new_entry_id,2,l.account_id,l.memo,l.currency_code,0,l.amount,l.transaction_date);
    end if;
    update public.staff_journal_lines set journal_entry_id=new_entry_id where id=l.id; count_posted:=count_posted+1;
  end loop;
  update public.staff_journals set status='posted',reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=j.id;
  insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id) values('staff_journals',j.id::text,'APPROVE_AND_POST',jsonb_build_object('entries_posted',count_posted),'Staff journal converted to double-entry journals',auth.uid());
  return count_posted;
end $function$
;

CREATE OR REPLACE FUNCTION public.approve_entry_submission(p_submission_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare s public.entry_submissions; new_entry_id uuid; new_entry_no text;
begin
  if not public.has_user_permission('approve') then raise exception 'Approval permission required'; end if;
  select * into s from public.entry_submissions where id=p_submission_id for update;
  if NOT FOUND OR NOT public.can_workspace113(s.submitted_by) OR NOT public.can_action113('user-entry-review','approve') OR NOT public.can_action113('journal','post') THEN RAISE EXCEPTION 'Assigned approval and journal posting permissions required';END IF;
  IF s.status='approved' AND s.journal_entry_id IS NOT NULL THEN RETURN s.journal_entry_id;END IF;
  if s.status<>'pending' then raise exception 'Pending submission not found'; end if;
  PERFORM public.validate_journal14228(s.transaction_date,s.memo,jsonb_build_array(jsonb_build_object('account_id',s.debit_account_id,'currency_code',s.currency_code,'debit',s.amount,'credit',0),jsonb_build_object('account_id',s.credit_account_id,'currency_code',s.currency_code,'debit',0,'credit',s.amount)));
  new_entry_no:=private.format_entry_id143114(coalesce((select journal_prefix from public.accounting_id_settings where id=true),'OJM'),s.transaction_date,nextval('public.journal_entry_number_seq'),coalesce((select journal_digits from public.accounting_id_settings where id=true),4));
  insert into public.journal_entries(entry_no,transaction_date,memo,reference,status,source,submitted_by,posted_by,posted_at)
  values(new_entry_no,s.transaction_date,s.memo,s.reference,'posted','staff_submission',s.submitted_by,auth.uid(),now()) returning id into new_entry_id;
  insert into public.journal_lines(journal_entry_id,line_no,account_id,description,currency_code,debit,credit,line_date) values
  (new_entry_id,1,s.debit_account_id,s.memo,s.currency_code,s.amount,0,s.transaction_date),
  (new_entry_id,2,s.credit_account_id,s.memo,s.currency_code,0,s.amount,s.transaction_date);
  update public.entry_submissions set status='approved',reviewed_by=auth.uid(),reviewed_at=now(),journal_entry_id=new_entry_id where id=p_submission_id;
  insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id) values('entry_submissions',p_submission_id::text,'APPROVE',jsonb_build_object('journal_entry_id',new_entry_id),'Approved and posted',auth.uid());
  return new_entry_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.validate_user_prefix89()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 new.entry_prefix:=upper(trim(new.entry_prefix));new.entry_initials:=upper(trim(new.entry_initials));
 select journal_digits into new.entry_digits from public.accounting_id_settings where id=true;
 new.entry_digits:=coalesce(new.entry_digits,4);
 if coalesce(new.entry_initials,'')<>'' then
  if new.entry_prefix!~'^[A-Z0-9]{1,8}$' or new.entry_initials!~'^[A-Z0-9]{1,8}$' then raise exception 'Prefix and initials require 1 to 8 letters or numbers';end if;
  perform public.reserve_entry_prefix89(new.entry_prefix||new.entry_initials,'user:'||new.user_id::text);
 end if;
 return new;
end $function$
;

-- One-time reset, explicitly requested before the first posting. Never run on navigation or deletion.
DO $$ DECLARE actor uuid; BEGIN
 SELECT s.updated_by INTO actor FROM public.accounting_id_settings s JOIN public.profiles p ON p.id=s.updated_by WHERE s.id=true AND p.role='admin';
 IF actor IS NULL THEN RAISE EXCEPTION 'Recorded administrator required for initial setup';END IF;
 PERFORM set_config('request.jwt.claim.sub',actor::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 LOCK TABLE public.journal_entries,public.staff_journal_lines IN ACCESS EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM public.journal_entries) OR EXISTS(SELECT 1 FROM public.staff_journal_lines) THEN
  RAISE EXCEPTION 'New entries exist; stop the initial numbering reset and review them first';
 END IF;
 UPDATE public.accounting_id_settings SET journal_digits=4,sub_user_digits=4,sub_user_prefix='S',updated_at=now() WHERE id=true;
 UPDATE public.user_permissions SET entry_prefix='S',entry_digits=4,updated_at=now();
 UPDATE public.staff_entry_sequences SET last_number=0,updated_at=now();
 ALTER SEQUENCE public.journal_entry_number_seq RESTART WITH 1;
 IF NOT EXISTS(SELECT 1 FROM public.fund_adjustment_requests) THEN
  ALTER SEQUENCE public.fund_adjustment_request_seq RESTART WITH 1;
 END IF;
 -- Saved schedules retain their numbers and relationships; use the compact format.
 UPDATE public.scheduled_journals SET schedule_no=private.format_entry_id143114(
   regexp_replace(schedule_no,'-[0-9]+$',''),created_at::date,substring(schedule_no from '[0-9]+$')::bigint,4)
 WHERE schedule_no ~ '^[A-Z0-9]+-[0-9]+$';
END $$;

CREATE OR REPLACE FUNCTION public.save_accounting_prefixes143114(p_settings jsonb,p_users jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE u jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin') THEN RAISE EXCEPTION 'Administrator required'; END IF;
 IF jsonb_typeof(p_users) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'User prefixes must be a list'; END IF;
 UPDATE public.accounting_id_settings SET
 journal_prefix=p_settings->>'journal_prefix',sub_user_prefix=p_settings->>'sub_user_prefix',
 journal_digits=(p_settings->>'journal_digits')::integer,sub_user_digits=(p_settings->>'journal_digits')::integer,
 automated_prefix=p_settings->>'automated_prefix',schedule_prefix=p_settings->>'schedule_prefix',adjustment_prefix=p_settings->>'adjustment_prefix',
 updated_by=auth.uid(),updated_at=now() WHERE id=true;
 IF NOT FOUND THEN RAISE EXCEPTION 'ID settings unavailable'; END IF;
 FOR u IN SELECT value FROM jsonb_array_elements(p_users) LOOP
  UPDATE public.user_permissions SET entry_prefix=u->>'entry_prefix',entry_initials=u->>'entry_initials',
   entry_digits=(p_settings->>'journal_digits')::integer,updated_by=auth.uid(),updated_at=now()
   WHERE user_id=(u->>'user_id')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'User permission record unavailable'; END IF;
 END LOOP;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.save_accounting_prefixes143114(jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_accounting_prefixes143114(jsonb,jsonb) TO authenticated;
