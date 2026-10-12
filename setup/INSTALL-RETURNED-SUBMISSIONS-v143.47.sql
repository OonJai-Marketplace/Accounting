-- v143.47: independent submission batches and explicit returned-book corrections.
BEGIN;
ALTER TABLE public.staff_journals DROP CONSTRAINT IF EXISTS staff_journals_owner_id_period_start_key;
CREATE UNIQUE INDEX IF NOT EXISTS staff_journals_one_draft14347 ON public.staff_journals(owner_id,period_start) WHERE status='draft';
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
 number_text:=public.preview_staff_workspace_entry_no(p_owner_id);
 number_next:=substring(number_text from '[0-9]+$')::bigint;
 insert into public.staff_entry_sequences(user_id,last_number) values(p_owner_id,number_next) on conflict(user_id) do update set last_number=greatest(public.staff_entry_sequences.last_number,excluded.last_number),updated_at=now();
 select coalesce(max(line_no),0)+1 into sequence_line from public.staff_journal_lines where staff_journal_id=journal_row.id;
 insert into public.staff_journal_lines(staff_journal_id,line_no,transaction_date,direction,fund_account_id,account_id,memo,reference,amount,currency_code,workspace_entry_no,entry_kind,client_key)
 values(journal_row.id,sequence_line,p_transaction_date,p_direction,p_fund_account_id,p_account_id,trim(p_memo),coalesce(p_reference,''),p_amount,fund_currency,number_text,p_entry_kind,p_client_key) returning id into new_id;
 return query select new_id,number_text;
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
  UPDATE public.staff_journal_lines l SET editor_group1437=p_key||':'||(item->>'date'),editor_snapshot1437=p_snapshot
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
REVOKE ALL ON FUNCTION public.save_staff_workspace_entry_v3(uuid,uuid,text,date,text,uuid,uuid,text,text,numeric,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.save_staff_editor1437(uuid,text,jsonb,jsonb,uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_staff_workspace_entry_v3(uuid,uuid,text,date,text,uuid,uuid,text,text,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_staff_editor1437(uuid,text,jsonb,jsonb,uuid[]) TO authenticated;
COMMIT;
