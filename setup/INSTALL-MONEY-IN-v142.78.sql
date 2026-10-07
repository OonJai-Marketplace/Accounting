-- v142.78: Assigned Money In category, preserving earlier report-only collections.
-- Install after INSTALL-SECURITY-v142.28.sql and INSTALL-WORKFLOW-v142.53.sql.
-- An old collection with the same fund and account remains report-only; a new
-- collection with an assigned different account becomes a balanced journal pair.
-- Never rerun the older installers after this without rerunning this migration.
BEGIN;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='save_staff_workspace_entry_v3'
   AND position('Select the assigned main account for collections' in pg_get_functiondef(p.oid))>0)
 OR NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='post_summary14253'
   AND position('entry_kind' in pg_get_functiondef(p.oid))>0)
 THEN RAISE EXCEPTION 'Install the matching security and workflow versions first; no change made';END IF;
END $$;
CREATE OR REPLACE FUNCTION public.staff_rules14228() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE j public.staff_journals;p public.user_permissions;target text;
BEGIN
 SELECT * INTO j FROM staff_journals WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD.staff_journal_id ELSE NEW.staff_journal_id END FOR UPDATE;
 IF NOT FOUND OR NOT public.can_workspace113(j.owner_id) THEN RAISE EXCEPTION 'Current workspace access required';END IF;
 target:=CASE WHEN j.owner_id=auth.uid() THEN 'sub-users-workspace' ELSE 'user-entry-review' END;
 IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'journal_entry_id')=(to_jsonb(OLD)-'journal_entry_id') THEN
  IF NEW.journal_entry_id IS DISTINCT FROM OLD.journal_entry_id AND NOT public.can_action113('user-entry-review','post') THEN RAISE EXCEPTION 'Review posting permission required';END IF;
  RETURN NEW;
 END IF;
 IF NOT public.can_action113(target,CASE WHEN TG_OP='DELETE' THEN 'void' ELSE 'edit' END) OR j.status NOT IN ('draft','returned') THEN RAISE EXCEPTION 'This workspace is not editable';END IF;
 IF TG_OP='DELETE' THEN RETURN OLD;END IF;
 IF TG_OP='UPDATE' AND (NEW.staff_journal_id IS DISTINCT FROM OLD.staff_journal_id OR NEW.client_key IS DISTINCT FROM OLD.client_key OR NEW.workspace_entry_no IS DISTINCT FROM OLD.workspace_entry_no) THEN RAISE EXCEPTION 'Entry identity cannot be changed';END IF;
 SELECT * INTO p FROM user_permissions WHERE user_id=j.owner_id;
 IF NOT FOUND OR coalesce(NEW.direction=ANY(p.allowed_directions),false) IS NOT TRUE
  OR coalesce(NEW.fund_account_id=ANY(p.assigned_fund_account_ids),false) IS NOT TRUE THEN RAISE EXCEPTION 'Unassigned direction or fund';END IF;
 IF NEW.entry_kind NOT IN ('payment','handover','collection') OR (NEW.entry_kind='collection')<>(NEW.direction='in') THEN RAISE EXCEPTION 'Invalid workspace activity';END IF;
 IF NEW.direction='in' AND NEW.account_id IS DISTINCT FROM NEW.fund_account_id AND NOT coalesce(NEW.account_id=ANY(p.allowed_account_ids) OR NEW.account_id=ANY(p.destination_account_ids),false) THEN RAISE EXCEPTION 'Unassigned Money In category';END IF;
 IF NEW.direction='out' AND (NEW.account_id=NEW.fund_account_id OR
  NOT coalesce(NEW.account_id=ANY(p.allowed_account_ids) OR NEW.account_id=ANY(p.destination_account_ids),false)) THEN RAISE EXCEPTION 'Unassigned spending or receiving account';END IF;
 IF NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.fund_account_id AND is_active AND is_posting AND currency_code=NEW.currency_code)
  OR NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_id AND is_active AND is_posting AND currency_code=NEW.currency_code) THEN RAISE EXCEPTION 'Invalid workspace account or currency';END IF;
 IF NEW.transaction_date<j.period_start OR NEW.transaction_date>j.period_end THEN RAISE EXCEPTION 'Entry date must belong to this workspace period';END IF;
 RETURN NEW;
END $$;

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
 insert into public.staff_journals(owner_id,period_start,period_end,status) values(p_owner_id,month_start,(month_start+interval '1 month - 1 day')::date,'draft') on conflict(owner_id,period_start) do nothing;
 select * into journal_row from public.staff_journals where owner_id=p_owner_id and period_start=month_start for update;
 if journal_row.status not in ('draft','returned') then raise exception 'This period is submitted or posted; reopen it before changing entries'; end if;
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
end $function$;

CREATE OR REPLACE FUNCTION public.submit_staff_journal(p_journal_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare journal_row public.staff_journals; permission public.user_permissions; line_row public.staff_journal_lines; count_lines integer;
begin
 select * into journal_row from public.staff_journals where id=p_journal_id for update;
 if not found or auth.uid() is null or (journal_row.owner_id<>auth.uid() and not public.has_user_permission('approve')) then raise exception 'Workspace access denied'; end if;
 if NOT public.can_workspace113(journal_row.owner_id) OR NOT public.can_action113(CASE WHEN journal_row.owner_id=auth.uid() THEN 'sub-users-workspace' ELSE 'user-entry-review' END,'edit') THEN RAISE EXCEPTION 'Workspace submit permission required';END IF;
 if journal_row.status not in ('draft','returned') then raise exception 'Journal cannot be submitted'; end if;
 select * into permission from public.user_permissions where user_id=journal_row.owner_id;
 select count(*) into count_lines from public.staff_journal_lines where staff_journal_id=p_journal_id;
 if count_lines=0 then raise exception 'Add at least one complete row'; end if;
 for line_row in select * from public.staff_journal_lines where staff_journal_id=p_journal_id loop
   if not(line_row.direction=any(permission.allowed_directions)) or not(line_row.fund_account_id=any(permission.assigned_fund_account_ids)) then raise exception 'An entry uses an unassigned direction or fund'; end if;
   if line_row.direction='out' and not(line_row.account_id=any(permission.destination_account_ids) or line_row.account_id=any(permission.allowed_account_ids)) then raise exception 'An entry uses an unassigned spending account'; end if;
   if line_row.entry_kind='collection' and line_row.account_id<>line_row.fund_account_id and not(line_row.account_id=any(permission.destination_account_ids) or line_row.account_id=any(permission.allowed_account_ids)) then raise exception 'Unassigned Money In category'; end if;
 end loop;
 update public.staff_journals set status='submitted',submitted_at=now(),return_note=null,updated_at=now() where id=p_journal_id;
 insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id) values('staff_journals',p_journal_id::text,'SUBMIT',jsonb_build_object('line_count',count_lines),'Workspace submitted for review',auth.uid());
end $function$;

CREATE OR REPLACE FUNCTION public.review_collection_report(p_journal_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare journal_row public.staff_journals;
begin
 if not public.has_user_permission('approve') then raise exception 'Reviewer access required'; end if;
 select * into journal_row from public.staff_journals where id=p_journal_id for update;
 if NOT public.can_workspace113(journal_row.owner_id) OR NOT public.can_action113('user-entry-review','approve') THEN RAISE EXCEPTION 'Assigned reviewer required';END IF;
 if not found or journal_row.status<>'submitted' then raise exception 'Submitted report not found'; end if;
 if exists(select 1 from public.staff_journal_lines where staff_journal_id=p_journal_id and NOT (entry_kind='collection' AND account_id=fund_account_id) and journal_entry_id is null) then raise exception 'This report has entries requiring journal preparation'; end if;
 update public.staff_journals set status='reviewed',reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=p_journal_id;
 insert into public.audit_log(table_name,record_id,action,reason,actor_id) values('staff_journals',p_journal_id::text,'REVIEW','Collection report reviewed; no revenue posted. Month-end sales entry remains separate.',auth.uid());
end $function$;

CREATE OR REPLACE FUNCTION public.post_workspace_review_v3(p_journal_id uuid, p_groups jsonb, p_prefix text, p_digits integer, p_memo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare receipt public.operation_receipts14228;request_payload jsonb;actor uuid:=auth.uid();journal_row public.staff_journals; grp jsonb; posted record; result jsonb:='[]'::jsonb; posting_date date;
begin
 if not public.has_user_permission('approve') or not public.has_user_permission('post') then raise exception 'Review and posting permissions are required'; end if;
 select * into journal_row from public.staff_journals where id=p_journal_id for update;
 if NOT public.can_workspace113(journal_row.owner_id) OR NOT public.can_action113('user-entry-review','post') THEN RAISE EXCEPTION 'Assigned review posting permission required';END IF;
 request_payload:=jsonb_build_object('groups',p_groups,'prefix',p_prefix,'digits',p_digits,'memo',p_memo);
 SELECT * INTO receipt FROM operation_receipts14228 WHERE actor_id=actor AND request_key='workspace:'||p_journal_id::text;
 IF FOUND THEN
  IF receipt.payload IS DISTINCT FROM request_payload THEN RAISE EXCEPTION 'This submission was already posted with different data';END IF;RETURN receipt.result;
 END IF;
 if journal_row.status<>'submitted' then raise exception 'Submission is no longer awaiting review; refresh before continuing'; end if;
 if NOT EXISTS(SELECT 1 FROM approved_reports1443 WHERE journal_id=p_journal_id) THEN RAISE EXCEPTION 'Approve the exact source report before posting';END IF;
 if jsonb_typeof(p_groups) is distinct from 'array' or jsonb_array_length(p_groups)=0 then raise exception 'No journal lines supplied'; end if;
 if (select count(*) from jsonb_array_elements(p_groups))<>(select count(distinct value->>'date') from jsonb_array_elements(p_groups)) then raise exception 'Duplicate posting dates'; end if;
 if exists(select 1 from public.staff_journal_lines l where l.staff_journal_id=p_journal_id and NOT (l.entry_kind='collection' AND l.account_id=l.fund_account_id) and l.journal_entry_id is null and not exists(select 1 from jsonb_array_elements(p_groups) g where (g->>'date')::date=l.transaction_date)) then raise exception 'Some submission dates are missing'; end if;
 for grp in select value from jsonb_array_elements(p_groups) loop
   posting_date:=(grp->>'date')::date;
   if posting_date is null or not exists(select 1 from public.staff_journal_lines where staff_journal_id=p_journal_id and transaction_date=posting_date and NOT (entry_kind='collection' AND account_id=fund_account_id) and journal_entry_id is null) then raise exception 'Posting date is not part of this submission'; end if;
   if exists(select 1 from public.accounting_periods where period_month=date_trunc('month',posting_date)::date and status<>'open') then raise exception 'Reopen the accounting period before posting'; end if;
   if jsonb_typeof(grp->'lines') is distinct from 'array' or jsonb_array_length(grp->'lines')<2 then raise exception 'At least two journal lines are required'; end if;
   if exists(select 1 from jsonb_array_elements(grp->'lines') l where nullif(l->>'account_id','') is null or coalesce((l->>'debit')::numeric,0)<0 or coalesce((l->>'credit')::numeric,0)<0 or ((coalesce((l->>'debit')::numeric,0)>0)::integer+(coalesce((l->>'credit')::numeric,0)>0)::integer)<>1) then raise exception 'Every line needs an account and one positive debit or credit'; end if;
   if exists(select 1 from jsonb_array_elements(grp->'lines') l group by l->>'currency_code' having abs(sum(coalesce((l->>'debit')::numeric,0)-coalesce((l->>'credit')::numeric,0)))>=0.001) then raise exception 'Each currency must balance'; end if;
   select * into posted from public.post_manual_worker14228(posting_date,p_memo,grp->'lines',p_prefix,p_digits);
   update public.staff_journal_lines set journal_entry_id=posted.entry_id where staff_journal_id=p_journal_id and transaction_date=posting_date and NOT (entry_kind='collection' AND account_id=fund_account_id) and journal_entry_id is null;
   result:=result||jsonb_build_array(jsonb_build_object('date',posting_date,'entry_id',posted.entry_id,'entry_no',posted.entry_no,'lines',grp->'lines'));
 end loop;
 update public.staff_journals set status='posted',reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=p_journal_id;
 insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id) values('staff_journals',p_journal_id::text,'POST',jsonb_build_object('posted_entries',result),'Reviewed workspace posted atomically; legacy report-only collections excluded',auth.uid());
 INSERT INTO operation_receipts14228(actor_id,request_key,operation,payload,result) VALUES(actor,'workspace:'||p_journal_id::text,'workspace',request_payload,result);
 return result;
end $function$;

CREATE OR REPLACE FUNCTION public.post_summary14253(p_journal uuid,p_date date,p_memo text,p_lines jsonb,p_prefix text,p_digits integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE j staff_journals;snapshot jsonb;expected jsonb;actual jsonb;posted record;item jsonb;src record;line_id uuid;summary_line_no integer:=0;owner_name text;receipt operation_receipts14228;payload jsonb;answer jsonb;
BEGIN
 IF NOT public.has_user_permission('approve') OR NOT public.has_user_permission('post') OR NOT public.can_action113('user-entry-review','post') OR NOT public.can_action113('journal','post') THEN RAISE EXCEPTION 'Review and journal posting permissions required';END IF;
 SELECT * INTO j FROM staff_journals WHERE id=p_journal FOR UPDATE;
 IF NOT FOUND OR NOT public.can_workspace113(j.owner_id) THEN RAISE EXCEPTION 'Workspace access denied';END IF;
 PERFORM public.assert_final_review14229(p_journal);
 payload=jsonb_build_object('date',p_date,'memo',p_memo,'lines',p_lines,'prefix',p_prefix,'digits',p_digits);
 SELECT * INTO receipt FROM operation_receipts14228 WHERE actor_id=auth.uid() AND request_key='summary:'||p_journal::text;
 IF FOUND THEN IF receipt.payload IS DISTINCT FROM payload THEN RAISE EXCEPTION 'Report already posted with different data';END IF;RETURN receipt.result;END IF;
 IF j.status<>'submitted' THEN RAISE EXCEPTION 'Report is not awaiting posting';END IF;
 SELECT a.snapshot INTO snapshot FROM approved_reports1443 a WHERE a.journal_id=p_journal;
 IF NOT FOUND THEN RAISE EXCEPTION 'Approve the exact detailed report before summary posting';END IF;
 IF p_date IS NULL OR date_trunc('month',p_date)<>date_trunc('month',j.period_start) THEN RAISE EXCEPTION 'Posting date must be within the reporting month';END IF;
 IF EXISTS(SELECT 1 FROM accounting_periods WHERE period_month=date_trunc('month',p_date)::date AND status<>'open') THEN RAISE EXCEPTION 'Reporting period is closed';END IF;
 PERFORM 1 FROM staff_journal_lines WHERE staff_journal_id=p_journal FOR UPDATE;
 -- Compare immutable reviewed content, ignoring only links filled by previous postings.
 IF (SELECT jsonb_agg(to_jsonb(l)-'journal_entry_id' ORDER BY l.id) FROM staff_journal_lines l WHERE staff_journal_id=p_journal)
 IS DISTINCT FROM (SELECT jsonb_agg(x-'journal_entry_id' ORDER BY x->>'id') FROM jsonb_array_elements(snapshot->'journal'->'lines') x) THEN RAISE EXCEPTION 'Source changed after approval';END IF;
 IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines)<2 THEN RAISE EXCEPTION 'No balanced summary supplied';END IF;
 -- Derive each account/currency/side and its exact source IDs on the server.
 WITH sides AS (
 SELECT l.id,l.currency_code,l.amount,l.account_id AS account_id,CASE WHEN l.direction='in' THEN 'credit' ELSE 'debit' END AS side FROM staff_journal_lines l WHERE l.staff_journal_id=p_journal AND NOT (l.entry_kind='collection' AND l.account_id=l.fund_account_id) AND l.journal_entry_id IS NULL
 UNION ALL SELECT l.id,l.currency_code,l.amount,l.fund_account_id,CASE WHEN l.direction='in' THEN 'debit' ELSE 'credit' END FROM staff_journal_lines l WHERE l.staff_journal_id=p_journal AND NOT (l.entry_kind='collection' AND l.account_id=l.fund_account_id) AND l.journal_entry_id IS NULL
 ), grouped AS (SELECT account_id,currency_code,side,sum(amount) amount,jsonb_agg(id::text ORDER BY id::text) ids FROM sides GROUP BY account_id,currency_code,side)
 SELECT jsonb_agg(jsonb_build_object('account',account_id,'currency',currency_code,'side',side,'amount',amount,'ids',ids) ORDER BY account_id,currency_code,side) INTO expected FROM grouped;
 SELECT jsonb_agg(jsonb_build_object('account',(x->>'account_id')::uuid,'currency',x->>'currency_code','side',CASE WHEN (x->>'debit')::numeric>0 THEN 'debit' ELSE 'credit' END,'amount',greatest((x->>'debit')::numeric,(x->>'credit')::numeric),'ids',(SELECT jsonb_agg(v ORDER BY v) FROM jsonb_array_elements_text(x->'source_ids') v)) ORDER BY (x->>'account_id')::uuid,x->>'currency_code',CASE WHEN (x->>'debit')::numeric>0 THEN 'debit' ELSE 'credit' END) INTO actual FROM jsonb_array_elements(p_lines) x;
 IF expected IS NULL OR expected IS DISTINCT FROM actual THEN RAISE EXCEPTION 'Summary accounts, amounts or source references do not match the approved report';END IF;
 SELECT * INTO posted FROM public.post_manual_worker14228(p_date,p_memo,p_lines,p_prefix,p_digits);
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
 INSERT INTO audit_log(table_name,record_id,action,new_data,reason,actor_id) VALUES('staff_journals',p_journal::text,'POST',answer,'Approved detailed report posted as account summary',auth.uid());
 RETURN answer;
END $$;

-- Verify that the account/fund distinction survived the function replacements.
DO $$ BEGIN
 IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname IN
       ('staff_rules14228','save_staff_workspace_entry_v3','submit_staff_journal',
        'review_collection_report','post_workspace_review_v3','post_summary14253'))<>6
 THEN RAISE EXCEPTION 'Money In functions were not installed as expected';END IF;
END $$;
COMMIT;
