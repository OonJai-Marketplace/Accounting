-- One approved report, one journal ID, original dates. No historic rows rewritten.
BEGIN;
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
  PERFORM public.validate_journal14228(p_transaction_date,p_memo,(SELECT jsonb_agg(x-'line_date') FROM jsonb_array_elements(p_lines) x));
  v_prefix := left(coalesce(nullif(v_prefix,''),'OJM'),8);
  v_digits := greatest(3,least(9,coalesce(p_digits,6)));

  -- Sequence allocation and collision retry also skip headers left by older,
  -- non-atomic posting attempts.
  loop
    v_attempt := v_attempt + 1;
    if v_attempt>1000 then raise exception 'Unable to allocate a unique journal number'; end if;
    v_entry_no := v_prefix||'-'||lpad(nextval('public.journal_entry_number_seq')::text,v_digits,'0');
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
      journal_entry_id,line_no,account_id,description,currency_code,debit,credit,line_date
    ) values(
      v_entry_id,v_line_no,(v_line->>'account_id')::uuid,
      coalesce(v_line->>'description',p_memo),v_line->>'currency_code',
      v_debit,v_credit,(v_line->>'line_date')::date
    );
  end loop;

  insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id)
  values('journal_entries',v_entry_id::text,'POST',jsonb_build_object('entry_no',v_entry_no,'line_count',v_line_no),'Atomic manual journal posting',auth.uid());

  return query select v_entry_id,v_entry_no;
end $function$

;
REVOKE ALL ON FUNCTION public.post_report_worker14349(date,text,jsonb,text,integer) FROM PUBLIC,anon,authenticated;
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
 IF (SELECT jsonb_agg(to_jsonb(l)-'journal_entry_id' ORDER BY l.id) FROM staff_journal_lines l WHERE staff_journal_id=p_journal)
 IS DISTINCT FROM (SELECT jsonb_agg(x-'journal_entry_id' ORDER BY x->>'id') FROM jsonb_array_elements(snapshot->'journal'->'lines') x) THEN RAISE EXCEPTION 'Source changed after approval';END IF;
 IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines)<2 THEN RAISE EXCEPTION 'No balanced summary supplied';END IF;
 -- Derive the exact allowed lines. Only fund sides may be consolidated.
 WITH sides AS (
 SELECT l.id,l.transaction_date,l.currency_code,l.amount,l.account_id,CASE WHEN l.direction='in' THEN 'credit' ELSE 'debit' END side,l.id::text bucket FROM staff_journal_lines l WHERE l.staff_journal_id=p_journal AND NOT (l.entry_kind='collection' AND l.account_id=l.fund_account_id) AND l.journal_entry_id IS NULL
 UNION ALL SELECT l.id,l.transaction_date,l.currency_code,l.amount,l.fund_account_id,CASE WHEN l.direction='in' THEN 'debit' ELSE 'credit' END,CASE WHEN p_mode='consolidated' THEN 'fund' ELSE l.id::text END FROM staff_journal_lines l WHERE l.staff_journal_id=p_journal AND NOT (l.entry_kind='collection' AND l.account_id=l.fund_account_id) AND l.journal_entry_id IS NULL
 ), grouped AS (SELECT transaction_date,account_id,currency_code,side,bucket,sum(amount) amount,jsonb_agg(id::text ORDER BY id::text) ids FROM sides GROUP BY transaction_date,account_id,currency_code,side,bucket), objects AS (
 SELECT jsonb_build_object('date',transaction_date,'account',account_id,'currency',currency_code,'side',side,'amount',amount,'ids',ids) obj FROM grouped)
 SELECT jsonb_agg(obj ORDER BY obj::text) INTO expected FROM objects;
 WITH objects AS (SELECT jsonb_build_object('date',(x->>'line_date')::date,'account',(x->>'account_id')::uuid,'currency',x->>'currency_code','side',CASE WHEN (x->>'debit')::numeric>0 THEN 'debit' ELSE 'credit' END,'amount',greatest((x->>'debit')::numeric,(x->>'credit')::numeric),'ids',(SELECT jsonb_agg(v ORDER BY v) FROM jsonb_array_elements_text(x->'source_ids') v)) obj FROM jsonb_array_elements(p_lines) x)
 SELECT jsonb_agg(obj ORDER BY obj::text) INTO actual FROM objects;
 IF expected IS NULL OR expected IS DISTINCT FROM actual THEN RAISE EXCEPTION 'Dates, accounts, amounts or references do not match the approved report';END IF;
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
REVOKE ALL ON FUNCTION public.post_report14349(uuid,date,text,jsonb,text,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.post_report14349(uuid,date,text,jsonb,text,integer,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.check_ledger_entry14228(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE e public.journal_entries;
BEGIN
 SELECT * INTO e FROM journal_entries WHERE id=p_id;
 IF NOT FOUND OR e.status::text<>'posted' THEN RETURN;END IF;
 IF (SELECT count(*) FROM journal_lines WHERE journal_entry_id=p_id)<2 THEN RAISE EXCEPTION 'A posted journal requires at least two lines';END IF;
 IF EXISTS(SELECT 1 FROM journal_lines l JOIN accounts a ON a.id=l.account_id WHERE l.journal_entry_id=p_id AND
   (l.currency_code IS DISTINCT FROM a.currency_code OR NOT a.is_posting OR NOT a.is_active
    OR (coalesce(l.line_date,e.transaction_date)<>e.transaction_date AND NOT (date_trunc('month',l.line_date)=date_trunc('month',e.transaction_date) AND EXISTS(SELECT 1 FROM journal_sources14253 s WHERE s.journal_line_id=l.id AND s.source_date=l.line_date))))) THEN RAISE EXCEPTION 'Journal account, currency or date mismatch';END IF;
 IF EXISTS(SELECT 1 FROM journal_lines WHERE journal_entry_id=p_id GROUP BY currency_code,coalesce(line_date,e.transaction_date) HAVING sum(debit)<>sum(credit))
  THEN RAISE EXCEPTION 'Every currency must balance';END IF;
END $function$

;
COMMIT;
