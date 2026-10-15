-- Phase 3 additive metadata. Historic entries and permissions are preserved.
BEGIN;
ALTER TABLE public.journal_lines ADD COLUMN IF NOT EXISTS calculation14387 jsonb;
ALTER TABLE public.journal_lines ADD CONSTRAINT calculation14387_valid CHECK (calculation14387 IS NULL OR coalesce((jsonb_typeof(calculation14387)='object' AND calculation14387 ?& ARRAY['type','role','mode','rateMode'] AND calculation14387->>'role' IN ('input','received','paid','offset','mapping','income','expense','fx') AND octet_length(calculation14387::text)<2048 AND calculation14387->>'type' IN ('Normal','Income','Expense','Transfer','Currency Exchange') AND calculation14387->>'mode' IN ('auto','manual') AND calculation14387->>'rateMode' IN ('auto','manual')),false));

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
      journal_entry_id,line_no,account_id,description,currency_code,debit,credit,line_date,fx_rate_lak,book_rate_lak,calculation14387
    ) values(
      v_entry_id,v_line_no,(v_line->>'account_id')::uuid,
      coalesce(v_line->>'description',p_memo),v_line->>'currency_code',
      v_debit,v_credit,p_transaction_date,nullif(v_line->>'fx_rate_lak','')::numeric,nullif(v_line->>'book_rate_lak','')::numeric,v_line->'calculation14387'
    );
  end loop;

  insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id)
  values('journal_entries',v_entry_id::text,'POST',jsonb_build_object('entry_no',v_entry_no,'line_count',v_line_no),'Atomic manual journal posting',auth.uid());

  return query select v_entry_id,v_entry_no;
end $function$;

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
  insert into public.journal_lines(journal_entry_id,line_no,account_id,line_date,description,currency_code,debit,credit,fx_rate_lak,book_rate_lak,calculation14387)
   values(p_entry_id,v_n,(v_line->>'account_id')::uuid,p_transaction_date,coalesce(v_line->>'description',p_memo),v_line->>'currency_code',coalesce((v_line->>'debit')::numeric,0),coalesce((v_line->>'credit')::numeric,0),nullif(v_line->>'fx_rate_lak','')::numeric,nullif(v_line->>'book_rate_lak','')::numeric,v_line->'calculation14387');
 end loop;
 update public.journal_entries set transaction_date=p_transaction_date,memo=trim(p_memo),updated_at=now(),
  accounting_period_id=(select id from public.accounting_periods where period_month=date_trunc('month',p_transaction_date)::date)
  where id=p_entry_id;
 select to_jsonb(e)||jsonb_build_object('lines',(select coalesce(jsonb_agg(to_jsonb(l)||jsonb_build_object('account_name',a.name) order by l.line_no),'[]'::jsonb) from public.journal_lines l join public.accounts a on a.id=l.account_id where l.journal_entry_id=p_entry_id))
  into v_new from public.journal_entries e where e.id=p_entry_id;
 insert into public.audit_log(table_name,record_id,action,old_data,new_data,reason,actor_id)
  values('journal_entries',p_entry_id::text,'UPDATE',v_old,v_new,trim(p_reason),auth.uid());
end $function$;

CREATE OR REPLACE FUNCTION public.journal_shape14385(p_date date, p_memo text, p_lines jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
 SELECT jsonb_build_object('date',p_date,'memo',trim(coalesce(p_memo,'')),'lines',coalesce(jsonb_agg(jsonb_build_object(
 'account_id',l->>'account_id','description',coalesce(nullif(l->>'description',''),trim(p_memo)),
 'currency_code',l->>'currency_code','debit',coalesce((l->>'debit')::numeric,0),'credit',coalesce((l->>'credit')::numeric,0),
 'fx_rate_lak',CASE WHEN l->>'currency_code'='LAK' THEN 1 ELSE nullif(l->>'fx_rate_lak','')::numeric END,
 'book_rate_lak',nullif(l->>'book_rate_lak','')::numeric) || CASE WHEN l->'calculation14387' IS NULL OR l->'calculation14387'='null'::jsonb THEN '{}'::jsonb ELSE jsonb_build_object('calculation14387',l->'calculation14387') END ORDER BY n),'[]'::jsonb))
 FROM jsonb_array_elements(p_lines) WITH ORDINALITY AS items(l,n);
$function$;

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
 l.calculation14387,l.debit,l.credit,l.fx_rate_lak,l.book_rate_lak,l.base_debit,l.base_credit,false AS archived
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
 SELECT md5(coalesce(sum(hashtextextended(concat_ws('|',e.id,e.entry_no,e.transaction_date,e.memo,e.status,e.updated_at,l.id,l.account_id,l.currency_code,l.debit,l.credit,l.line_date,l.description,l.fx_rate_lak,l.book_rate_lak,l.calculation14387::text),0)::numeric)::text,'0')) INTO revision
 FROM public.journal_entries e JOIN public.journal_lines l ON l.journal_entry_id=e.id WHERE e.status='posted' AND coalesce(l.line_date,e.transaction_date)<=p_to;
 RETURN jsonb_build_object('rows',result,'opening',opening,'revision',revision);
END $function$;

NOTIFY pgrst,'reload schema';
COMMIT;
