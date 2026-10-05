-- Oon Jai v142.28: logic/security only. Apply to a staging copy first.
-- Existing business records are not deleted, rewritten, or automatically posted.
BEGIN;
DO $$ BEGIN
 IF to_regprocedure('public.branch_home14229()') IS NOT NULL THEN
  RAISE EXCEPTION 'v142.29 is already installed. Use INSTALL-ORGANIZATION-v142.29.sql; an older security installer could replace its rules.';
 END IF;
 IF to_regclass('public.staff_journal_lines') IS NULL OR to_regclass('public.approved_reports1443') IS NULL
 OR to_regprocedure('public.workspace_pre_request138()') IS NULL THEN
  RAISE EXCEPTION 'Expected v142.27 database baseline is missing. No changes applied.';
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.active_account14228() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND status='active')
$$;
CREATE OR REPLACE FUNCTION public.current_access14228() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Active accounting account required' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('profile',(SELECT to_jsonb(p) FROM profiles p WHERE p.id=auth.uid()),'permissions',(SELECT to_jsonb(u) FROM user_permissions u WHERE u.user_id=auth.uid()));
END $$;
CREATE OR REPLACE FUNCTION public.accounting_workspace_allowed123() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT public.active_account14228() AND (public.is_admin() OR NOT EXISTS(
  SELECT 1 FROM public.restaurant_members121 WHERE user_id=auth.uid()))
$$;

CREATE OR REPLACE FUNCTION public.report_access1443(p_owner uuid,p_approve boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT public.accounting_workspace_allowed123() AND (public.is_admin() OR
  (NOT p_approve AND p_owner=auth.uid() AND public.can_action113('sub-users-workspace','view')
   AND public.can_action113('document-editor105','export')) OR
  (EXISTS(SELECT 1 FROM public.user_permissions WHERE user_id=p_owner AND manager_id=auth.uid())
   AND public.can_action113('user-entry-review',CASE WHEN p_approve THEN 'approve' ELSE 'export' END)
   AND (p_approve OR public.can_action113('document-editor105','export'))))
$$;

CREATE TABLE IF NOT EXISTS public.operation_receipts14228(
 actor_id uuid NOT NULL REFERENCES public.profiles(id),request_key text NOT NULL,
 operation text NOT NULL,payload jsonb NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(actor_id,request_key),CHECK(length(request_key) BETWEEN 10 AND 200)
);
ALTER TABLE public.operation_receipts14228 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operation_receipts14228 FROM PUBLIC,anon,authenticated;
-- Receipts are read through their authorized RPC. Clients cannot edit the deduplication record.

CREATE OR REPLACE FUNCTION public.validate_journal14228(p_date date,p_memo text,p_lines jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE l jsonb; dr numeric;cr numeric;
BEGIN
 IF p_date IS NULL OR nullif(btrim(p_memo),'') IS NULL THEN RAISE EXCEPTION 'Date and memo are required';END IF;
 IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Journal lines must be an array';END IF;
 IF jsonb_array_length(p_lines)<2 OR jsonb_array_length(p_lines)>500 THEN RAISE EXCEPTION 'Provide 2 to 500 journal lines';END IF;
 FOR l IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
  dr:=coalesce((l->>'debit')::numeric,0);cr:=coalesce((l->>'credit')::numeric,0);
  IF dr::text IN ('NaN','Infinity','-Infinity') OR cr::text IN ('NaN','Infinity','-Infinity')
   OR NOT ((dr>0 AND cr=0) OR (cr>0 AND dr=0)) OR dr<>round(dr,2) OR cr<>round(cr,2)
   THEN RAISE EXCEPTION 'Use one positive debit or credit, with at most two decimals';END IF;
  IF NOT EXISTS(SELECT 1 FROM accounts a WHERE a.id=(l->>'account_id')::uuid AND a.is_active AND a.is_posting
    AND a.currency_code=l->>'currency_code') THEN RAISE EXCEPTION 'Invalid posting account or account currency';END IF;
  IF coalesce(nullif(l->>'line_date','')::date,p_date) IS DISTINCT FROM p_date THEN RAISE EXCEPTION 'Each entry must use one transaction date';END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_lines) x GROUP BY x->>'currency_code'
  HAVING sum(coalesce((x->>'debit')::numeric,0))<>sum(coalesce((x->>'credit')::numeric,0)))
  THEN RAISE EXCEPTION 'Every currency must balance';END IF;
 -- Serialize posting with close/lock, including the first posting in a new month.
 INSERT INTO accounting_periods(period_month,status,updated_by)
 VALUES(date_trunc('month',p_date)::date,'open',auth.uid()) ON CONFLICT(period_month) DO NOTHING;
 PERFORM 1 FROM accounting_periods WHERE period_month=date_trunc('month',p_date)::date FOR SHARE;
 IF EXISTS(SELECT 1 FROM accounting_periods WHERE period_month=date_trunc('month',p_date)::date AND status<>'open')
  AND NOT public.internal_operation136() THEN RAISE EXCEPTION 'Reopen the accounting period before posting';END IF;
END $$;

CREATE OR REPLACE FUNCTION public.post_journal_batch14228(p_request_key text,p_entries jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=auth.uid();receipt public.operation_receipts14228;entry jsonb;saved record;result jsonb:='[]';
BEGIN
 IF NOT public.can_action113('journal','post') THEN RAISE EXCEPTION 'Current journal posting permission required' USING ERRCODE='42501';END IF;
 IF p_request_key IS NULL OR length(p_request_key) NOT BETWEEN 10 AND 200 THEN RAISE EXCEPTION 'A stable posting reference is required';END IF;
 IF jsonb_typeof(p_entries) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Posting entries must be an array';END IF;
 IF jsonb_array_length(p_entries) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Provide 1 to 100 posting dates';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text||':'||p_request_key,0));
 SELECT * INTO receipt FROM operation_receipts14228 WHERE actor_id=actor AND request_key=p_request_key;
 IF FOUND THEN
  IF receipt.operation<>'journal' OR receipt.payload IS DISTINCT FROM p_entries THEN RAISE EXCEPTION 'Posting reference already used for different data';END IF;
  RETURN receipt.result;
 END IF;
 -- Preflight every date and lock periods in consistent order before inserting headers.
 FOR entry IN SELECT value FROM jsonb_array_elements(p_entries) ORDER BY value->>'p_transaction_date' LOOP
  PERFORM public.validate_journal14228((entry->>'p_transaction_date')::date,entry->>'p_memo',entry->'p_lines');
 END LOOP;
 FOR entry IN SELECT value FROM jsonb_array_elements(p_entries) LOOP
  SELECT * INTO saved FROM public.post_manual_worker14228((entry->>'p_transaction_date')::date,entry->>'p_memo',entry->'p_lines',coalesce(entry->>'p_prefix','OJM'),coalesce((entry->>'p_digits')::integer,6));
  result:=result||jsonb_build_array(jsonb_build_object('date',entry->>'p_transaction_date','entry_id',saved.entry_id,'entry_no',saved.entry_no));
 END LOOP;
 INSERT INTO operation_receipts14228(actor_id,request_key,operation,payload,result) VALUES(actor,p_request_key,'journal',p_entries,result);
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.post_manual_journal14228(p_transaction_date date,p_memo text,p_lines jsonb,p_prefix text,p_digits integer,p_request_key text)
RETURNS TABLE(entry_id uuid,entry_no text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 result:=public.post_journal_batch14228(p_request_key,jsonb_build_array(jsonb_build_object(
  'p_transaction_date',p_transaction_date,'p_memo',p_memo,'p_lines',p_lines,'p_prefix',p_prefix,'p_digits',p_digits)));
 RETURN QUERY SELECT (result->0->>'entry_id')::uuid,result->0->>'entry_no';
END $$;

CREATE OR REPLACE FUNCTION public.journal_receipt14228(p_request_key text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.operation_receipts14228;
BEGIN
 IF NOT public.can_action113('journal','post') THEN RAISE EXCEPTION 'Current journal permission required';END IF;
 SELECT * INTO r FROM operation_receipts14228 WHERE actor_id=auth.uid() AND request_key=p_request_key AND operation='journal';
 IF NOT FOUND THEN RETURN NULL;END IF;
 RETURN jsonb_build_object('payload',r.payload,'result',r.result);
END $$;

-- Deferred validation also protects direct table writes and other existing RPCs.
CREATE OR REPLACE FUNCTION public.check_ledger_entry14228(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE e public.journal_entries;
BEGIN
 SELECT * INTO e FROM journal_entries WHERE id=p_id;
 IF NOT FOUND OR e.status::text<>'posted' THEN RETURN;END IF;
 IF (SELECT count(*) FROM journal_lines WHERE journal_entry_id=p_id)<2 THEN RAISE EXCEPTION 'A posted journal requires at least two lines';END IF;
 IF EXISTS(SELECT 1 FROM journal_lines l JOIN accounts a ON a.id=l.account_id WHERE l.journal_entry_id=p_id AND
   (l.currency_code IS DISTINCT FROM a.currency_code OR NOT a.is_posting OR NOT a.is_active
    OR coalesce(l.line_date,e.transaction_date)<>e.transaction_date)) THEN RAISE EXCEPTION 'Journal account, currency or date mismatch';END IF;
 IF EXISTS(SELECT 1 FROM journal_lines WHERE journal_entry_id=p_id GROUP BY currency_code HAVING sum(debit)<>sum(credit))
  THEN RAISE EXCEPTION 'Every currency must balance';END IF;
END $$;
CREATE OR REPLACE FUNCTION public.ledger_integrity14228() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_TABLE_NAME='journal_entries' THEN
  IF TG_OP<>'DELETE' THEN PERFORM public.check_ledger_entry14228(NEW.id);END IF;
 ELSE
  IF TG_OP<>'INSERT' THEN PERFORM public.check_ledger_entry14228(OLD.journal_entry_id);END IF;
  IF TG_OP<>'DELETE' THEN PERFORM public.check_ledger_entry14228(NEW.journal_entry_id);END IF;
 END IF;
 RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS ledger_integrity14228 ON public.journal_entries;
CREATE CONSTRAINT TRIGGER ledger_integrity14228 AFTER INSERT OR UPDATE ON public.journal_entries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.ledger_integrity14228();
DROP TRIGGER IF EXISTS ledger_integrity14228 ON public.journal_lines;
CREATE CONSTRAINT TRIGGER ledger_integrity14228 AFTER INSERT OR UPDATE OR DELETE ON public.journal_lines DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.ledger_integrity14228();
CREATE OR REPLACE FUNCTION public.ledger_lock14228() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 -- Serialize concurrent edits to the same aggregate before deferred validation.
 PERFORM 1 FROM journal_entries WHERE id=ANY(ARRAY[
  CASE WHEN TG_OP='INSERT' THEN NULL::uuid ELSE OLD.journal_entry_id END,
  CASE WHEN TG_OP='DELETE' THEN NULL::uuid ELSE NEW.journal_entry_id END]) ORDER BY id FOR UPDATE;
 IF TG_OP='DELETE' THEN RETURN OLD;END IF;RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ledger_lock14228 ON public.journal_lines;
CREATE TRIGGER ledger_lock14228 BEFORE INSERT OR UPDATE OR DELETE ON public.journal_lines FOR EACH ROW EXECUTE FUNCTION public.ledger_lock14228();

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
 IF NEW.direction='in' AND NEW.account_id IS DISTINCT FROM NEW.fund_account_id THEN RAISE EXCEPTION 'Collections must use the assigned fund';END IF;
 IF NEW.direction='out' AND (NEW.account_id=NEW.fund_account_id OR
  NOT coalesce(NEW.account_id=ANY(p.allowed_account_ids) OR NEW.account_id=ANY(p.destination_account_ids),false)) THEN RAISE EXCEPTION 'Unassigned spending or receiving account';END IF;
 IF NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.fund_account_id AND is_active AND is_posting AND currency_code=NEW.currency_code)
  OR NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_id AND is_active AND is_posting AND currency_code=NEW.currency_code) THEN RAISE EXCEPTION 'Invalid workspace account or currency';END IF;
 IF NEW.transaction_date<j.period_start OR NEW.transaction_date>j.period_end THEN RAISE EXCEPTION 'Entry date must belong to this workspace period';END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS staff_rules14228 ON public.staff_journal_lines;
CREATE TRIGGER staff_rules14228 BEFORE INSERT OR UPDATE OR DELETE ON public.staff_journal_lines FOR EACH ROW EXECUTE FUNCTION public.staff_rules14228();

CREATE OR REPLACE FUNCTION public.no_duplicate_release136() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.direction='in' AND NEW.entry_kind<>'collection' AND EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_id AND account_type='ASSET') THEN RAISE EXCEPTION 'Fund release acknowledgements cannot be posted as new income';END IF;
 RETURN NEW;
END $$;

-- Do not allow general approvers to change another employee's fund assignments.
DROP POLICY IF EXISTS assignments_current14228 ON public.user_fund_assignments;
CREATE POLICY assignments_current14228 ON public.user_fund_assignments AS RESTRICTIVE FOR ALL TO authenticated
 USING(public.is_admin() OR (user_id=auth.uid() AND public.can_action113('sub-users-workspace','view')))
 WITH CHECK(public.is_admin());

-- Reviewer scope applies to adjustments too, including existing SECURITY DEFINER RPCs.
CREATE OR REPLACE FUNCTION public.fund_request_guard14228() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE own uuid;fund uuid;review boolean;
BEGIN
 own:=CASE WHEN TG_OP='DELETE' THEN OLD.owner_id ELSE NEW.owner_id END;
 fund:=CASE WHEN TG_OP='DELETE' THEN OLD.fund_account_id ELSE NEW.fund_account_id END;
 IF NOT public.can_workspace113(own) THEN RAISE EXCEPTION 'Assigned workspace access required';END IF;
 review:=TG_OP<>'INSERT' AND (TG_OP='DELETE' OR NEW.status IS DISTINCT FROM OLD.status OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by);
 IF NOT public.is_admin() AND (review OR own<>auth.uid()) AND NOT public.can_action113('user-entry-review','approve') THEN RAISE EXCEPTION 'Assigned reviewer approval required';END IF;
 IF NOT review AND NOT public.can_action113(CASE WHEN own=auth.uid() THEN 'sub-users-workspace' ELSE 'user-entry-review' END,'edit') THEN RAISE EXCEPTION 'Workspace edit permission required';END IF;
 IF TG_OP='UPDATE' AND (NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.fund_account_id IS DISTINCT FROM OLD.fund_account_id) THEN RAISE EXCEPTION 'Adjustment owner and fund cannot be changed';END IF;
 IF TG_OP='INSERT' AND NOT EXISTS(SELECT 1 FROM user_permissions WHERE user_id=own AND fund=ANY(assigned_fund_account_ids)) THEN RAISE EXCEPTION 'Fund is not assigned';END IF;
 IF TG_OP='DELETE' THEN RETURN OLD;END IF;RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS fund_request_guard14228 ON public.fund_adjustment_requests;
CREATE TRIGGER fund_request_guard14228 BEFORE INSERT OR UPDATE OR DELETE ON public.fund_adjustment_requests FOR EACH ROW EXECUTE FUNCTION public.fund_request_guard14228();
DROP POLICY IF EXISTS current_requests14228 ON public.fund_adjustment_requests;
CREATE POLICY current_requests14228 ON public.fund_adjustment_requests AS RESTRICTIVE FOR SELECT TO authenticated USING(public.can_workspace113(owner_id));

CREATE OR REPLACE FUNCTION public.submission_guard14228() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE p public.user_permissions;own uuid;cur text;outgoing boolean;incoming boolean;
BEGIN
 own:=CASE WHEN TG_OP='DELETE' THEN OLD.submitted_by ELSE NEW.submitted_by END;
 IF NOT public.can_workspace113(own) THEN RAISE EXCEPTION 'Current assigned workspace access required';END IF;
 IF TG_OP<>'INSERT' THEN
  IF NOT public.is_admin() AND NOT public.can_action113('user-entry-review','approve') THEN RAISE EXCEPTION 'Assigned approval permission required';END IF;
  IF TG_OP='DELETE' THEN RETURN OLD;END IF;
  IF NEW.submitted_by IS DISTINCT FROM OLD.submitted_by THEN RAISE EXCEPTION 'Submission owner cannot be changed';END IF;
 ELSE
  IF NOT public.can_action113(CASE WHEN own=auth.uid() THEN 'sub-users-workspace' ELSE 'user-entry-review' END,'edit') THEN RAISE EXCEPTION 'Submission edit permission required';END IF;
 END IF;
 SELECT * INTO p FROM user_permissions WHERE user_id=own;
 outgoing:=coalesce('out'=ANY(p.allowed_directions) AND NEW.credit_account_id=ANY(p.assigned_fund_account_ids)
  AND (NEW.debit_account_id=ANY(p.allowed_account_ids) OR NEW.debit_account_id=ANY(p.destination_account_ids)),false);
 incoming:=coalesce('in'=ANY(p.allowed_directions) AND NEW.debit_account_id=ANY(p.assigned_fund_account_ids)
  AND NEW.credit_account_id=p.money_in_counterpart_account_id,false);
 IF NOT outgoing AND NOT incoming THEN RAISE EXCEPTION 'Submission uses unassigned accounts or direction';END IF;
 IF NEW.debit_account_id=NEW.credit_account_id OR NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.debit_account_id AND is_active AND is_posting AND currency_code=NEW.currency_code)
  OR NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.credit_account_id AND is_active AND is_posting AND currency_code=NEW.currency_code) THEN RAISE EXCEPTION 'Submission account or currency mismatch';END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS submission_guard14228 ON public.entry_submissions;
CREATE TRIGGER submission_guard14228 BEFORE INSERT OR UPDATE OR DELETE ON public.entry_submissions FOR EACH ROW EXECUTE FUNCTION public.submission_guard14228();
DROP POLICY IF EXISTS current_submissions14228 ON public.entry_submissions;
CREATE POLICY current_submissions14228 ON public.entry_submissions AS RESTRICTIVE FOR SELECT TO authenticated USING(public.can_workspace113(submitted_by));

DROP POLICY IF EXISTS current_subaccounts14228 ON public.sub_accounts;
CREATE POLICY current_subaccounts14228 ON public.sub_accounts AS RESTRICTIVE FOR SELECT TO authenticated USING(public.is_admin() OR public.can_action113('sec-sub-accounts','view') OR EXISTS(SELECT 1 FROM accounts a WHERE a.id=parent_account_id));

-- Restrictive policies cannot grant access; the existing row policies still apply.
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relrowsecurity LOOP
  EXECUTE format('DROP POLICY IF EXISTS active_account14228 ON public.%I',r.relname);
  EXECUTE format('CREATE POLICY active_account14228 ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING(public.active_account14228()) WITH CHECK(public.active_account14228())',r.relname);
  EXECUTE format('REVOKE TRUNCATE,TRIGGER,REFERENCES ON public.%I FROM PUBLIC,anon,authenticated',r.relname);
  IF r.relname NOT IN ('profiles','restaurant_members121','restaurant_presentation121','inventory_items104','inventory_movements104','menu_ingredients105','menu_items104','menu_categories104','menu_sales108','pos_config118','pos_orders118','pos_shifts118','pos_cash118','pos_stock118') THEN
   EXECUTE format('DROP POLICY IF EXISTS workspace_accounting123 ON public.%I',r.relname);
   EXECUTE format('CREATE POLICY workspace_accounting123 ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING(public.accounting_workspace_allowed123()) WITH CHECK(public.accounting_workspace_allowed123())',r.relname);
  END IF;
 END LOOP;
 IF to_regclass('storage.objects') IS NOT NULL THEN
  EXECUTE 'DROP POLICY IF EXISTS active_account14228 ON storage.objects';
  EXECUTE 'CREATE POLICY active_account14228 ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated USING(public.accounting_workspace_allowed123()) WITH CHECK(public.accounting_workspace_allowed123())';
 END IF;
END $$;

-- Remaining updated existing functions and explicit function grants follow.

CREATE OR REPLACE FUNCTION public.can_action113(p_target text, p_action text DEFAULT 'view'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare p jsonb; a jsonb; parent text;
begin
 if NOT public.accounting_workspace_allowed123() then return false; end if;
 if public.is_admin() then return true; end if;
 if p_target in ('settings-users','settings-system','settings-backup113','settings-recovery113','settings-appearance113') then return false;end if;
 select to_jsonb(u) into p from public.user_permissions u where user_id=auth.uid();
 if p->'module_actions113' is not null and p->'module_actions113'<>'null'::jsonb then
  a:=p->'module_actions113'->p_target;
  return coalesce(a ? 'view' and a ? p_action,false);
 end if;
 -- Old accounts retain their previous action flags until their matrix is saved.
 parent:=case when p_target like 'menu-%' then 'menu' when p_target like 'inv-%' then 'inventory' when p_target like 'sub-users-%' then 'sub-users' when p_target like 'settings-%' then 'settings' when p_target like 'report-%' then 'reports' when p_target like 'payroll-%' or p_target like 'hr-%' then 'payroll' when p_target like 'tax-%' then 'tax-sso' when p_target like 'sec-%' or p_target in ('trial-balance','account-balances') then 'accounts' when p_target='dashboard' then 'dashboard' else 'transactions' end;
 if p_action='view' then return exists(select 1 from jsonb_array_elements_text(case when jsonb_typeof(p->'modules')='array' then p->'modules' else '[]'::jsonb end) m where m=p_target or m=parent or m='all:'||parent or m like '%:'||p_target);end if;
 return public.can_action113(p_target,'view') AND coalesce((p->>case p_action when 'edit' then 'can_manage_data' when 'export' then 'can_export' when 'approve' then 'can_approve' when 'post' then 'can_post_directly' when 'void' then 'can_void' else '' end)::boolean,false);
end $function$;

CREATE OR REPLACE FUNCTION public.has_user_permission(p_permission text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT public.accounting_workspace_allowed123() AND (public.is_admin() OR CASE p_permission
 WHEN 'post' THEN public.can_action113('journal','post')
 WHEN 'approve' THEN public.can_action113('user-entry-review','approve')
 WHEN 'void' THEN public.can_action113('journal','void')
 WHEN 'export' THEN public.can_action113('journal','export') OR public.can_action113('document-editor105','export')
 WHEN 'data' THEN public.can_action113('journal','edit') ELSE false END)
$$;

CREATE OR REPLACE FUNCTION public.guard_actions113()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare target text; action text := 'edit'; rowdata jsonb; olddata jsonb; matrix_set boolean;
begin
 if NOT public.accounting_workspace_allowed123() then raise exception 'Active accounting access required'; end if;
 if public.is_admin() then if tg_op='DELETE' then return old;else return new;end if;end if;
 select module_actions113 is not null into matrix_set from public.user_permissions where user_id=auth.uid();
 -- Both legacy and matrix accounts pass the same current action checks.
 rowdata:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 olddata:=case when tg_op='INSERT' then '{}'::jsonb else to_jsonb(old) end;
 target:=tg_argv[0];
 if tg_op='DELETE' or rowdata->>'status' in ('voided','cancelled') then action:='void';
 elsif rowdata->>'status' is distinct from olddata->>'status' and rowdata->>'status' in ('posted','finalized') then action:='post';
 elsif rowdata->>'status' is distinct from olddata->>'status' and rowdata->>'status' like 'approved%' then action:='approve';end if;
 if target='staff' then
  target:=case when rowdata->>'owner_id'=auth.uid()::text then 'sub-users-workspace' else 'user-entry-review' end;
  if tg_table_name='staff_journal_lines' then
   if exists(select 1 from public.staff_journals where id::text=rowdata->>'staff_journal_id' and owner_id=auth.uid()) then target:='sub-users-workspace';else target:='user-entry-review';end if;
  end if;
 end if;
 if tg_argv[0]='staff' then
  if tg_table_name='staff_journals' and not public.can_workspace113((rowdata->>'owner_id')::uuid) then raise exception 'Workspace not assigned';end if;
  if tg_table_name='staff_journal_lines' and not exists(select 1 from public.staff_journals s where s.id::text=rowdata->>'staff_journal_id' and public.can_workspace113(s.owner_id)) then raise exception 'Workspace not assigned';end if;
 end if;
 if tg_table_name='journal_lines' AND tg_op='INSERT' THEN action:='post';END IF;
 if tg_table_name='accounting_periods' AND tg_op='INSERT' AND rowdata->>'status'='open' AND public.can_action113('journal','post') THEN RETURN NEW;END IF;
 if tg_table_name='staff_journal_lines' AND tg_op='UPDATE' AND rowdata->>'journal_entry_id' IS DISTINCT FROM olddata->>'journal_entry_id' THEN action:='post';end if;
 if not public.can_action113(target,action) then raise exception 'Permission denied: % / %',target,action;end if;
 if tg_op='DELETE' then return old;else return new;end if;
end $function$;

CREATE OR REPLACE FUNCTION public.preview_staff_workspace_entry_no(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare permission public.user_permissions; number_next bigint; number_prefix text;
begin
 if NOT public.can_workspace113(p_user_id) then raise exception 'Current assigned workspace access required';end if;
 select * into permission from public.user_permissions where user_id=p_user_id;
 if not found then raise exception 'User permissions not configured'; end if;
 number_prefix:=coalesce(nullif(permission.entry_initials,''),'U')||'-';
 select greatest(
   coalesce((select last_number from public.staff_entry_sequences where user_id=p_user_id),0),
   coalesce(max(case when substring(workspace_entry_no from length(number_prefix)+1) ~ '^[0-9]+$' then substring(workspace_entry_no from length(number_prefix)+1)::bigint else 0 end),0)
 )+1
 into number_next
 from public.staff_journal_lines
 where left(workspace_entry_no,length(number_prefix))=number_prefix;
 return number_prefix||lpad(number_next::text,greatest(permission.entry_digits,length(number_next::text)),'0');
end $function$;

CREATE OR REPLACE FUNCTION public.void_staff_editor1437(p_owner uuid,p_ids uuid[],p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE n integer;line_id uuid;
BEGIN
 IF NOT public.can_workspace113(p_owner) OR NOT public.can_action113(CASE WHEN p_owner=auth.uid() THEN 'sub-users-workspace' ELSE 'user-entry-review' END,'void') THEN RAISE EXCEPTION 'Current workspace void permission required';END IF;
 IF cardinality(p_ids) IS NULL OR cardinality(p_ids)<1 OR nullif(btrim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'Choose entries and provide a reason';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text||':desktop-editor',0));
 SELECT count(*) INTO n FROM public.staff_journal_lines l JOIN public.staff_journals j ON j.id=l.staff_journal_id
 WHERE l.id=ANY(p_ids) AND j.owner_id=p_owner AND j.status IN ('draft','returned') AND l.journal_entry_id IS NULL;
 IF n<>cardinality(p_ids) THEN RAISE EXCEPTION 'Only editable entries in this personal journal can be removed';END IF;
 FOREACH line_id IN ARRAY p_ids LOOP
  PERFORM public.void_staff_workspace_entry(p_line_id=>line_id,p_reason=>p_reason);
 END LOOP;
END $$;;

CREATE OR REPLACE FUNCTION public.can_use_staff_account(p_account_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select public.is_admin() or (public.can_action113('sub-users-workspace','view') AND exists(
    select 1 from public.user_permissions p join public.profiles u on u.id=p.user_id
    where p.user_id=auth.uid() and u.status='active'
      and (p.allow_any_account or p_account_id=any(p.allowed_account_ids))
  ));
$function$;

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
  new_entry_no := 'OJM-' || lpad(nextval('public.journal_entry_number_seq')::text,6,'0');
  insert into public.journal_entries(entry_no,transaction_date,memo,reference,status,source,submitted_by,posted_by,posted_at)
  values(new_entry_no,s.transaction_date,s.memo,s.reference,'posted','staff_submission',s.submitted_by,auth.uid(),now()) returning id into new_entry_id;
  insert into public.journal_lines(journal_entry_id,line_no,account_id,description,currency_code,debit,credit,line_date) values
  (new_entry_id,1,s.debit_account_id,s.memo,s.currency_code,s.amount,0,s.transaction_date),
  (new_entry_id,2,s.credit_account_id,s.memo,s.currency_code,0,s.amount,s.transaction_date);
  update public.entry_submissions set status='approved',reviewed_by=auth.uid(),reviewed_at=now(),journal_entry_id=new_entry_id where id=p_submission_id;
  insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id) values('entry_submissions',p_submission_id::text,'APPROVE',jsonb_build_object('journal_entry_id',new_entry_id),'Approved and posted',auth.uid());
  return new_entry_id;
end $function$;

CREATE OR REPLACE FUNCTION public.workspace_pre_request138()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE headers jsonb:=coalesce(nullif(current_setting('request.headers',true),'')::jsonb,'{}');
 claims jsonb:=coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}');
 actor uuid:=auth.uid(); target uuid; p public.profiles; previous regprocedure; ns text; fn text;
BEGIN
 PERFORM set_config('ojm.workspace_actor138','',true);
 IF claims->>'role'='service_role' THEN RETURN;END IF;
 IF nullif(headers->>'x-ojm-workspace','') IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=actor AND role='admin' AND status='active') THEN
   RAISE EXCEPTION 'Only an active administrator may switch accounts' USING ERRCODE='42501';
  END IF;
  BEGIN target:=(headers->>'x-ojm-workspace')::uuid; EXCEPTION WHEN invalid_text_representation THEN
   RAISE EXCEPTION 'Invalid workspace account' USING ERRCODE='42501'; END;
  SELECT * INTO p FROM profiles WHERE id=target AND status='active' AND role<>'admin';
  IF p.id IS NULL THEN RAISE EXCEPTION 'Choose an active sub-user account' USING ERRCODE='42501';END IF;
  PERFORM set_config('ojm.workspace_actor138',actor::text,true);
  -- Authorization stays in the existing authenticated role; identity-dependent RLS/RPCs see the sub-user.
  claims:=claims||jsonb_build_object('sub',target::text,'email',to_jsonb(p)->>'email');
  claims:=claims-'app_metadata'-'user_metadata';
  PERFORM set_config('request.jwt.claims',claims::text,true);
  PERFORM set_config('request.jwt.claim.sub',target::text,true);
 END IF;
 IF NOT public.active_account14228() THEN RAISE EXCEPTION 'Active account required' USING ERRCODE='42501';END IF;
 IF NOT public.accounting_workspace_allowed123() AND regexp_replace(rtrim(coalesce(current_setting('request.path',true),''),'/'),'^.*/','') <> ALL(ARRAY[
 'profiles','restaurant_members121','restaurant_presentation121','inventory_items104','inventory_movements104','menu_ingredients105','menu_items104','menu_categories104','menu_sales108','pos_config118','pos_orders118','pos_shifts118','pos_cash118','pos_stock118',
 'is_admin','restaurant_can121','restaurant_signed_in121','restaurant_table_can121','restaurant_delete121','pos_snapshot118','pos_order118','pos_manage118','pos_import_online_menu120'])
 THEN RAISE EXCEPTION 'Restaurant staff cannot access Accounting' USING ERRCODE='42501';END IF;
 SELECT previous_hook INTO previous FROM workspace_hook_config138 WHERE id;
 IF previous IS NOT NULL AND previous<>'public.workspace_pre_request138()'::regprocedure THEN
  SELECT n.nspname,f.proname INTO ns,fn FROM pg_proc f JOIN pg_namespace n ON n.oid=f.pronamespace WHERE f.oid=previous::oid;
  IF fn IS NOT NULL THEN EXECUTE format('SELECT %I.%I()',ns,fn);END IF;
 END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.stage_book_operation136(p_session uuid, p_kind text, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE request_key text:=p_payload->>'p_request_key';existing jsonb;actor uuid:=public.require_admin136();s book_sessions136;m date;d date;op jsonb;BEGIN
 SELECT * INTO s FROM book_sessions136 WHERE id=p_session FOR UPDATE;
 IF s.owner_id IS DISTINCT FROM actor OR s.status<>'editing' THEN RAISE EXCEPTION 'Correction session is unavailable';END IF;
 SELECT period_month INTO m FROM accounting_periods WHERE id=s.period_id AND status='closed';IF m IS NULL THEN RAISE EXCEPTION 'The book is no longer closed and unlocked';END IF;
 IF p_kind NOT IN ('post','revise','void') OR jsonb_typeof(p_payload)<>'object' THEN RAISE EXCEPTION 'Invalid staged operation';END IF;
 IF p_kind='post' THEN d:=(p_payload->>'p_transaction_date')::date;
 ELSE SELECT transaction_date INTO d FROM journal_entries WHERE id=(p_payload->>'p_entry_id')::uuid;END IF;
 IF d IS NULL OR date_trunc('month',d)::date<>m THEN RAISE EXCEPTION 'Changes must belong to this book';END IF;
 IF p_kind='revise' AND date_trunc('month',(p_payload->>'p_transaction_date')::date)::date<>m THEN RAISE EXCEPTION 'A correction cannot move the transaction to another month';END IF;
 IF request_key IS NOT NULL THEN
 SELECT x INTO existing FROM jsonb_array_elements(coalesce(s.operations,'[]')) x WHERE x->>'request_key14228'=request_key;
 IF FOUND THEN IF existing->>'kind' IS DISTINCT FROM p_kind OR existing->'payload' IS DISTINCT FROM (p_payload-'p_request_key') THEN RAISE EXCEPTION 'Correction request reference already used';END IF;RETURN to_jsonb(s)||jsonb_build_object('month',m);END IF;END IF;
 op:=jsonb_build_object('id',gen_random_uuid(),'kind',p_kind,'payload',p_payload-'p_request_key','request_key14228',request_key);
 UPDATE book_sessions136 SET operations=operations||jsonb_build_array(op) WHERE id=s.id RETURNING * INTO s;
 RETURN to_jsonb(s)||jsonb_build_object('month',m);END $function$;

CREATE OR REPLACE FUNCTION public.post_review_adjustment136(p_review uuid, p_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE actor uuid:=public.require_admin136();r audit_reviews136;old_ids uuid[];entry uuid;BEGIN
 SELECT * INTO r FROM audit_reviews136 WHERE id=p_review FOR UPDATE;
 IF r.status='resolved' AND r.adjustment_id IS NOT NULL THEN RETURN r.adjustment_id;END IF;
 IF r.id IS NULL OR r.status<>'open' THEN RAISE EXCEPTION 'Review is unavailable or already resolved';END IF;
 IF NOT EXISTS(SELECT 1 FROM accounting_periods WHERE period_month=date_trunc('month',(p_payload->>'p_transaction_date')::date)::date AND status='open') THEN RAISE EXCEPTION 'Choose an open posting period';END IF;
 LOCK TABLE journal_entries IN SHARE ROW EXCLUSIVE MODE;
 SELECT array_agg(id) INTO old_ids FROM journal_entries;
 PERFORM public.post_manual_worker14228(p_transaction_date=>(p_payload->>'p_transaction_date')::date,p_memo=>p_payload->>'p_memo',p_lines=>p_payload->'p_lines',p_prefix=>p_payload->>'p_prefix',p_digits=>(p_payload->>'p_digits')::integer);
 SELECT id INTO entry FROM journal_entries WHERE NOT(id=ANY(coalesce(old_ids,'{}'::uuid[]))) AND posted_by=actor LIMIT 1;
 IF entry IS NULL THEN RAISE EXCEPTION 'Adjustment posting was not confirmed';END IF;
 UPDATE journal_entries SET adjustment_for_entry_id=r.entry_id WHERE id=entry;
 UPDATE audit_reviews136 SET adjustment_id=entry,status='resolved' WHERE id=r.id;
 RETURN entry;END $function$;

CREATE OR REPLACE FUNCTION public.restaurant_signed_in121()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select public.active_account14228() and (public.is_admin() or exists(select 1 from restaurant_members121 where user_id=auth.uid() and enabled and not must_change_password))
$function$;

CREATE OR REPLACE FUNCTION public.restaurant_can121(p_scope text, p_action text DEFAULT 'view'::text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select public.active_account14228() and (public.is_admin() or exists(
 select 1 from public.restaurant_members121 m where m.user_id=auth.uid() and m.enabled and not m.must_change_password
 and m.permissions->p_scope->>'view'='true' and m.permissions->p_scope->>p_action='true'))
$function$;

create or replace function public.guard_separate_members123() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if exists(select 1 from profiles where id=new.user_id and role='admin') then return new;end if;
 if tg_table_name='restaurant_members121' then
  if exists(select 1 from user_permissions u where u.user_id=new.user_id and
    (coalesce(to_jsonb(u)->'modules','[]') not in ('[]'::jsonb,'null'::jsonb)
     or coalesce(to_jsonb(u)->'assigned_fund_account_ids','[]') not in ('[]'::jsonb,'null'::jsonb))) then
   raise exception 'Keep this Accounting account unchanged. Create a separate Restaurant staff account.';
  end if;
 elsif exists(select 1 from restaurant_members121 where user_id=new.user_id) then
  raise exception 'This is a Restaurant staff account. Create a separate Accounting sub-user account.';
 end if;return new;
end $$;
revoke all on function public.guard_separate_members123() from public,anon,authenticated;
drop trigger if exists guard_separate_members123 on public.restaurant_members121;
create trigger guard_separate_members123 before insert or update on public.restaurant_members121 for each row execute function public.guard_separate_members123();
drop trigger if exists guard_separate_members123 on public.user_permissions;
create trigger guard_separate_members123 before insert or update on public.user_permissions for each row execute function public.guard_separate_members123();


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
  PERFORM public.validate_journal14228(p_transaction_date,p_memo,p_lines);
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
      v_debit,v_credit,p_transaction_date
    );
  end loop;

  insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id)
  values('journal_entries',v_entry_id::text,'POST',jsonb_build_object('entry_no',v_entry_no,'line_count',v_line_no),'Atomic manual journal posting',auth.uid());

  return query select v_entry_id,v_entry_no;
end $function$;

CREATE OR REPLACE FUNCTION public.post_manual_journal(p_transaction_date date,p_memo text,p_lines jsonb,p_prefix text DEFAULT 'OJM',p_digits integer DEFAULT 6)
RETURNS TABLE(entry_id uuid,entry_no text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.internal_operation136() THEN RAISE EXCEPTION 'Refresh the app: posting requires a stable request reference';END IF;
 RETURN QUERY SELECT * FROM public.post_manual_worker14228(p_transaction_date,p_memo,p_lines,p_prefix,p_digits);
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
 if p_direction='in' and p_account_id<>p_fund_account_id then raise exception 'Select the assigned main account for collections'; end if;
 if p_direction='out' and not coalesce(p_account_id=any(permission.destination_account_ids) or p_account_id=any(permission.allowed_account_ids),false) then raise exception 'Entry account not assigned'; end if;
 if p_direction='out' and p_account_id=p_fund_account_id then raise exception 'The receiving/spending account must differ from the fund'; end if;
 select currency_code into fund_currency from public.accounts where id=p_fund_account_id;
 if fund_currency is null then raise exception 'Main account currency missing'; end if;
 if p_direction='out' and (select currency_code from public.accounts where id=p_account_id) is distinct from fund_currency then raise exception 'Main and entry accounts must use the same currency'; end if;
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
 INSERT INTO operation_receipts14228(actor_id,request_key,operation,payload,result) VALUES(actor,p_key,'staff-editor',request_payload,jsonb_build_object('line_ids',ids,'already_saved',false));
 RETURN jsonb_build_object('line_ids',ids,'already_saved',false);
END $function$;

CREATE OR REPLACE FUNCTION public.void_staff_workspace_entry(p_line_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare journal_row public.staff_journals; line_row public.staff_journal_lines;
begin
  if nullif(trim(p_reason),'') is null then raise exception 'A void reason is required'; end if;
  select * into line_row from public.staff_journal_lines where id=p_line_id for update;
  if not found then raise exception 'Workspace entry not found'; end if;
  select * into journal_row from public.staff_journals where id=line_row.staff_journal_id for update;
  if not found then raise exception 'Workspace journal not found'; end if;
  if NOT public.can_workspace113(journal_row.owner_id) OR NOT public.can_action113(CASE WHEN journal_row.owner_id=auth.uid() THEN 'sub-users-workspace' ELSE 'user-entry-review' END,'void') then raise exception 'Current workspace void access required'; end if;
  if journal_row.status not in ('draft','returned') then raise exception 'Only draft or returned entries can be voided'; end if;
  insert into public.audit_log(table_name,record_id,action,old_data,reason,actor_id)
  values('staff_journal_lines',p_line_id::text,'VOID',to_jsonb(line_row),trim(p_reason),auth.uid());
  delete from public.staff_journal_lines where id=p_line_id;
end $function$;

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
 LEFT JOIN journal_lines l ON l.account_id=a.id AND EXISTS(SELECT 1 FROM journal_entries h WHERE h.id=l.journal_entry_id AND h.status::text='posted' AND (p_month IS NULL OR coalesce(l.line_date,h.transaction_date)<(p_month+interval '1 month')::date))
 LEFT JOIN journal_entries e ON e.id=l.journal_entry_id GROUP BY a.id,a.name,a.currency_code ORDER BY a.code;
END $function$;

CREATE OR REPLACE FUNCTION public.staff_report1434(p_journal uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare j public.staff_journals%rowtype; actor_permissions jsonb; owner_permissions jsonb;
 source_lines jsonb; posted_entries jsonb; account_rows jsonb; user_data jsonb;
 linked uuid[]; permitted boolean; reviewer boolean;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and status='active') then raise exception 'Active sign-in required'; end if;
 select * into j from public.staff_journals where id=p_journal;
 if not found then raise exception 'Saved report not found'; end if;
 if exists(select 1 from public.approved_reports1443 where journal_id=p_journal) then return public.approved_report1443(p_journal); end if;
 select to_jsonb(p) into actor_permissions from public.user_permissions p where user_id=auth.uid();
 select to_jsonb(p) into owner_permissions from public.user_permissions p where user_id=j.owner_id;
 permitted:=public.report_access1443(j.owner_id);
 reviewer:=coalesce(actor_permissions->'module_actions113'->'user-entry-review','[]'::jsonb) @> '["view","export"]'::jsonb
  and owner_permissions->>'manager_id'=auth.uid()::text;
 if not public.is_admin() then
  if not coalesce(permitted,false) or not ((j.owner_id=auth.uid() and coalesce(actor_permissions->'module_actions113'->'sub-users-workspace','[]'::jsonb) @> '["view"]'::jsonb) or coalesce(reviewer,false)) then raise exception 'Report print permission required'; end if;
  if j.status::text not in ('approved','posted','reviewed','approved_posted') then raise exception 'Only approved reports can be printed'; end if;
 end if;
 select coalesce(jsonb_agg(to_jsonb(l) order by l.transaction_date,l.line_no),'[]'::jsonb),
  coalesce(array_agg(distinct l.journal_entry_id) filter(where l.journal_entry_id is not null),array[]::uuid[])
 into source_lines,linked from public.staff_journal_lines l where staff_journal_id=j.id;
 select coalesce(jsonb_agg(to_jsonb(e)||jsonb_build_object('lines',
  (select coalesce(jsonb_agg(to_jsonb(l) order by l.id),'[]'::jsonb) from public.journal_lines l where l.journal_entry_id=e.id))),'[]'::jsonb)
 into posted_entries from public.journal_entries e where e.id=any(linked) and e.status::text='posted';
 if jsonb_array_length(posted_entries)<>cardinality(linked) then raise exception 'A linked journal is missing or no longer posted. Review this report before printing'; end if;
 with recursive report_account_ids(id) as (
  select a.id from public.accounts a where a.id in (
   select account_id from public.staff_journal_lines where staff_journal_id=j.id
   union select fund_account_id from public.staff_journal_lines where staff_journal_id=j.id
   union select account_id from public.journal_lines where journal_entry_id=any(linked)
  )
  union
  select parent.id from public.accounts parent join public.accounts child
   on parent.code=to_jsonb(child)->>'parent_code'
  join report_account_ids selected on selected.id=child.id
 )
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'code',a.code,'name',a.name,
  'currency_code',a.currency_code,'account_type',a.account_type,'parent_code',to_jsonb(a)->>'parent_code')),'[]'::jsonb)
 into account_rows from public.accounts a join report_account_ids selected on selected.id=a.id;
 select jsonb_build_object('id',p.id,'full_name',p.full_name,'email',p.email,'role',p.role,'job_title',owner_permissions->>'job_title') into user_data
 from public.profiles p where p.id=j.owner_id;
 return jsonb_build_object('journal',to_jsonb(j)||jsonb_build_object('lines',source_lines),
  'user',user_data,'accounts',account_rows,'posted',posted_entries);
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
   if line_row.entry_kind='collection' and line_row.account_id<>line_row.fund_account_id then raise exception 'Invalid collection account'; end if;
 end loop;
 update public.staff_journals set status='submitted',submitted_at=now(),return_note=null,updated_at=now() where id=p_journal_id;
 insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id) values('staff_journals',p_journal_id::text,'SUBMIT',jsonb_build_object('line_count',count_lines),'Workspace submitted for review',auth.uid());
end $function$;

CREATE OR REPLACE FUNCTION public.reopen_staff_journal(p_journal_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare j public.staff_journals;
begin
  if nullif(trim(p_reason),'') is null then raise exception 'A reopening reason is required'; end if;
  select * into j from public.staff_journals where id=p_journal_id for update;
  if not found or j.owner_id<>auth.uid() or j.status<>'submitted' then raise exception 'Only your own in-review submission can be reopened'; end if;
  if NOT public.can_workspace113(j.owner_id) OR NOT public.can_action113(CASE WHEN j.owner_id=auth.uid() THEN 'sub-users-workspace' ELSE 'user-entry-review' END,'edit') THEN RAISE EXCEPTION 'Workspace reopen permission required';END IF;
  update public.staff_journals set status='returned',return_note='Reopened by submitter: '||trim(p_reason),reviewed_at=now(),updated_at=now() where id=j.id;
  insert into public.audit_log(table_name,record_id,action,old_data,new_data,reason,actor_id)
  values('staff_journals',j.id::text,'REOPEN_BY_SUBMITTER',jsonb_build_object('status','submitted'),jsonb_build_object('status','returned'),trim(p_reason),auth.uid());
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
 if exists(select 1 from public.staff_journal_lines where staff_journal_id=p_journal_id and entry_kind<>'collection' and journal_entry_id is null) then raise exception 'This report has entries requiring journal preparation'; end if;
 update public.staff_journals set status='reviewed',reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=p_journal_id;
 insert into public.audit_log(table_name,record_id,action,reason,actor_id) values('staff_journals',p_journal_id::text,'REVIEW','Collection report reviewed; no revenue posted. Month-end sales entry remains separate.',auth.uid());
end $function$;

CREATE OR REPLACE FUNCTION public.link_recorded_workspace_handover(p_line_id uuid, p_entry_no text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare source_line public.staff_journal_lines; journal_row public.staff_journals; posted_id uuid;
begin
 if not public.has_user_permission('approve') then raise exception 'Reviewer permission required'; end if;
 select j.* into journal_row from public.staff_journals j join public.staff_journal_lines l on l.staff_journal_id=j.id where l.id=p_line_id for update of j;
 if NOT public.can_workspace113(journal_row.owner_id) OR NOT public.can_action113('user-entry-review','approve') THEN RAISE EXCEPTION 'Assigned reviewer required';END IF;
 select * into source_line from public.staff_journal_lines where id=p_line_id for update;
 if not found or source_line.entry_kind<>'handover' or source_line.journal_entry_id is not null or journal_row.status<>'submitted' then raise exception 'Choose an unlinked handover awaiting review'; end if;
 select id into posted_id from public.journal_entries where entry_no=trim(p_entry_no) and status='posted' and transaction_date=source_line.transaction_date for update;
 if posted_id is null then raise exception 'No posted entry with that number and handover date'; end if;
 if exists(select 1 from public.staff_journal_lines where journal_entry_id=posted_id) then raise exception 'This journal entry is already linked to a workspace report'; end if;
 if (select count(*) from public.journal_lines where journal_entry_id=posted_id)<>2
 or not exists(select 1 from public.journal_lines where journal_entry_id=posted_id and account_id=source_line.account_id and debit=source_line.amount and credit=0 and currency_code=source_line.currency_code)
 or not exists(select 1 from public.journal_lines where journal_entry_id=posted_id and account_id=source_line.fund_account_id and credit=source_line.amount and debit=0 and currency_code=source_line.currency_code) then raise exception 'The posted entry must exactly match the receiving account debit, clearing credit, currency and amount'; end if;
 update public.staff_journal_lines set journal_entry_id=posted_id where id=p_line_id;
 insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id) values('staff_journal_lines',p_line_id::text,'LINK',jsonb_build_object('journal_entry_id',posted_id),'Existing cash handover linked to prevent duplicate posting',auth.uid());
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
 if exists(select 1 from public.staff_journal_lines l where l.staff_journal_id=p_journal_id and l.entry_kind<>'collection' and l.journal_entry_id is null and not exists(select 1 from jsonb_array_elements(p_groups) g where (g->>'date')::date=l.transaction_date)) then raise exception 'Some submission dates are missing'; end if;
 for grp in select value from jsonb_array_elements(p_groups) loop
   posting_date:=(grp->>'date')::date;
   if posting_date is null or not exists(select 1 from public.staff_journal_lines where staff_journal_id=p_journal_id and transaction_date=posting_date and entry_kind<>'collection' and journal_entry_id is null) then raise exception 'Posting date is not part of this submission'; end if;
   if exists(select 1 from public.accounting_periods where period_month=date_trunc('month',posting_date)::date and status<>'open') then raise exception 'Reopen the accounting period before posting'; end if;
   if jsonb_typeof(grp->'lines') is distinct from 'array' or jsonb_array_length(grp->'lines')<2 then raise exception 'At least two journal lines are required'; end if;
   if exists(select 1 from jsonb_array_elements(grp->'lines') l where nullif(l->>'account_id','') is null or coalesce((l->>'debit')::numeric,0)<0 or coalesce((l->>'credit')::numeric,0)<0 or ((coalesce((l->>'debit')::numeric,0)>0)::integer+(coalesce((l->>'credit')::numeric,0)>0)::integer)<>1) then raise exception 'Every line needs an account and one positive debit or credit'; end if;
   if exists(select 1 from jsonb_array_elements(grp->'lines') l group by l->>'currency_code' having abs(sum(coalesce((l->>'debit')::numeric,0)-coalesce((l->>'credit')::numeric,0)))>=0.001) then raise exception 'Each currency must balance'; end if;
   select * into posted from public.post_manual_worker14228(posting_date,p_memo,grp->'lines',p_prefix,p_digits);
   update public.staff_journal_lines set journal_entry_id=posted.entry_id where staff_journal_id=p_journal_id and transaction_date=posting_date and entry_kind<>'collection' and journal_entry_id is null;
   result:=result||jsonb_build_array(jsonb_build_object('date',posting_date,'entry_id',posted.entry_id,'entry_no',posted.entry_no,'lines',grp->'lines'));
 end loop;
 update public.staff_journals set status='posted',reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=p_journal_id;
 insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id) values('staff_journals',p_journal_id::text,'POST',jsonb_build_object('posted_entries',result),'Reviewed workspace posted atomically; report-only collections excluded',auth.uid());
 INSERT INTO operation_receipts14228(actor_id,request_key,operation,payload,result) VALUES(actor,'workspace:'||p_journal_id::text,'workspace',request_payload,result);
 return result;
end $function$;

CREATE OR REPLACE FUNCTION public.admin_save_access1441(
 p_user uuid,p_name text,p_role text,p_permissions jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=auth.uid();
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=actor AND status='active' AND role='admin') THEN
  RAISE EXCEPTION 'Active administrator required' USING ERRCODE='42501';
 END IF;
 IF p_user IS NULL OR p_role NOT IN ('admin','submitter') OR p_role IS NULL OR nullif(btrim(p_name),'') IS NULL THEN RAISE EXCEPTION 'Invalid user details';END IF;
 IF jsonb_typeof(p_permissions) IS DISTINCT FROM 'object' OR p_permissions->>'user_id' IS DISTINCT FROM p_user::text
  OR jsonb_typeof(p_permissions->'module_actions113') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid permission map';END IF;
 IF (p_role='admin') IS DISTINCT FROM (p_permissions->>'user_type'='admin') THEN RAISE EXCEPTION 'Role and user type must agree';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(p_permissions->'module_actions113') e WHERE jsonb_typeof(e.value)<>'array') THEN RAISE EXCEPTION 'Every module must contain an action list';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(p_permissions->'module_actions113') e CROSS JOIN LATERAL jsonb_array_elements_text(e.value) a WHERE a NOT IN ('view','edit','export','approve','post','void')) THEN RAISE EXCEPTION 'Invalid module action';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(p_permissions->'module_actions113') e WHERE jsonb_array_length(e.value)>0 AND NOT(e.value ? 'view')) THEN RAISE EXCEPTION 'Module actions require View';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(p_permissions->'assigned_fund_account_ids','[]')) f WHERE NOT EXISTS(SELECT 1 FROM accounts WHERE id=f::uuid AND is_active AND is_posting))
 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(p_permissions->'destination_account_ids','[]')) f WHERE NOT EXISTS(SELECT 1 FROM accounts WHERE id=f::uuid AND is_active AND is_posting)) THEN RAISE EXCEPTION 'Assignments require active posting accounts';END IF;
 PERFORM 1 FROM public.profiles WHERE id=p_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'User not found. Refresh Users.';END IF;
 UPDATE public.profiles SET (full_name,role)=(SELECT r.full_name,r.role FROM jsonb_populate_record(NULL::public.profiles,jsonb_build_object('full_name',p_name,'role',p_role)) r) WHERE id=p_user;
 INSERT INTO public.user_permissions (user_id,user_type,manager_id,job_title,modules,can_approve,can_post_directly,can_void,can_export,can_manage_data,module_actions113,allow_any_account,allowed_account_ids,destination_account_ids,assigned_fund_account_ids,fund_allocations,default_out_credit_account_id,default_in_debit_account_id,allowed_directions,allow_multiple_funds,money_in_counterpart_account_id,entry_prefix,entry_initials,entry_digits,updated_by,updated_at)
 SELECT r.user_id,r.user_type,r.manager_id,r.job_title,r.modules,r.can_approve,r.can_post_directly,r.can_void,r.can_export,r.can_manage_data,r.module_actions113,r.allow_any_account,r.allowed_account_ids,r.destination_account_ids,r.assigned_fund_account_ids,r.fund_allocations,r.default_out_credit_account_id,r.default_in_debit_account_id,r.allowed_directions,r.allow_multiple_funds,r.money_in_counterpart_account_id,r.entry_prefix,r.entry_initials,r.entry_digits,r.updated_by,r.updated_at FROM jsonb_populate_record(NULL::public.user_permissions,
  p_permissions||jsonb_build_object('user_id',p_user,'updated_by',actor,'updated_at',now())) r
 ON CONFLICT (user_id) DO UPDATE SET user_type=EXCLUDED.user_type,manager_id=EXCLUDED.manager_id,job_title=EXCLUDED.job_title,modules=EXCLUDED.modules,can_approve=EXCLUDED.can_approve,can_post_directly=EXCLUDED.can_post_directly,can_void=EXCLUDED.can_void,can_export=EXCLUDED.can_export,can_manage_data=EXCLUDED.can_manage_data,module_actions113=EXCLUDED.module_actions113,allow_any_account=EXCLUDED.allow_any_account,allowed_account_ids=EXCLUDED.allowed_account_ids,destination_account_ids=EXCLUDED.destination_account_ids,assigned_fund_account_ids=EXCLUDED.assigned_fund_account_ids,fund_allocations=EXCLUDED.fund_allocations,default_out_credit_account_id=EXCLUDED.default_out_credit_account_id,default_in_debit_account_id=EXCLUDED.default_in_debit_account_id,allowed_directions=EXCLUDED.allowed_directions,allow_multiple_funds=EXCLUDED.allow_multiple_funds,money_in_counterpart_account_id=EXCLUDED.money_in_counterpart_account_id,entry_prefix=EXCLUDED.entry_prefix,entry_initials=EXCLUDED.entry_initials,entry_digits=EXCLUDED.entry_digits,updated_by=EXCLUDED.updated_by,updated_at=EXCLUDED.updated_at;
 RETURN jsonb_build_object('user_id',p_user,'saved',true);
END $$;;


-- Checklist history uses its own module permission, independently of report-print permissions.
DO $$ BEGIN IF to_regclass('public.todo_completions1443') IS NOT NULL THEN
 EXECUTE 'DROP POLICY IF EXISTS own_completions1443 ON public.todo_completions1443';
 EXECUTE 'CREATE POLICY own_completions1443 ON public.todo_completions1443 FOR SELECT TO authenticated USING(owner_id=auth.uid() AND public.can_action113(''transactions-recurring'',''view''))';
END IF;END $$;
-- Permission-sensitive reference and ledger reads, including direct links.
DROP POLICY IF EXISTS current_accounts14228 ON public.accounts;
CREATE POLICY current_accounts14228 ON public.accounts AS RESTRICTIVE FOR SELECT TO authenticated USING(
 public.is_admin() OR public.can_action113('sec-chart-accounts','view') OR public.can_action113('journal','view') OR
 EXISTS(SELECT 1 FROM public.user_permissions u WHERE public.can_workspace113(u.user_id) AND
 (id=ANY(u.assigned_fund_account_ids) OR id=ANY(u.allowed_account_ids) OR id=ANY(u.destination_account_ids) OR id=u.money_in_counterpart_account_id)));
DROP POLICY IF EXISTS current_profiles14228 ON public.profiles;
CREATE POLICY current_profiles14228 ON public.profiles AS RESTRICTIVE FOR SELECT TO authenticated USING(id=auth.uid() OR public.is_admin() OR public.can_workspace113(id));
DROP POLICY IF EXISTS current_ledger14228 ON public.journal_entries;
CREATE POLICY current_ledger14228 ON public.journal_entries AS RESTRICTIVE FOR SELECT TO authenticated USING(
 public.can_action113('journal','view') OR EXISTS(SELECT 1 FROM public.staff_journal_lines l JOIN public.staff_journals j ON j.id=l.staff_journal_id WHERE l.journal_entry_id=journal_entries.id AND public.can_workspace113(j.owner_id)));
DROP POLICY IF EXISTS current_ledger14228 ON public.journal_lines;
CREATE POLICY current_ledger14228 ON public.journal_lines AS RESTRICTIVE FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.journal_entries e WHERE e.id=journal_entry_id));

-- Existing callers must use the authoritative versions. Disable obsolete saving/approval endpoints.
REVOKE ALL ON FUNCTION public.approve_staff_journal(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.add_staff_workspace_entry(uuid,date,uuid,uuid,text,text,numeric,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.save_staff_workspace_entry_v2(uuid,uuid,date,text,uuid,uuid,text,text,numeric,text) FROM PUBLIC,anon,authenticated;

DO $$ DECLARE f record;BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=ANY(ARRAY['active_account14228','accounting_workspace_allowed123','can_action113','has_user_permission','report_access1443','post_journal_batch14228','post_manual_journal14228','post_manual_journal','save_staff_workspace_entry_v3','save_staff_editor1437','void_staff_workspace_entry','fund_balances136','staff_report1434','submit_staff_journal','reopen_staff_journal','review_collection_report','link_recorded_workspace_handover','post_workspace_review_v3','admin_save_access1441','restaurant_signed_in121','restaurant_can121','stage_book_operation136','post_review_adjustment136','journal_receipt14228','current_access14228','approve_entry_submission','preview_staff_workspace_entry_no','void_staff_editor1437','can_use_staff_account','validate_journal14228','post_manual_worker14228','check_ledger_entry14228','ledger_integrity14228','staff_rules14228','no_duplicate_release136','guard_actions113','workspace_pre_request138','fund_request_guard14228','submission_guard14228','ledger_lock14228','guard_separate_members123']) LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
 IF f.proname=ANY(ARRAY['active_account14228','accounting_workspace_allowed123','can_action113','has_user_permission','report_access1443','post_journal_batch14228','post_manual_journal14228','post_manual_journal','save_staff_workspace_entry_v3','save_staff_editor1437','void_staff_workspace_entry','fund_balances136','staff_report1434','submit_staff_journal','reopen_staff_journal','review_collection_report','link_recorded_workspace_handover','post_workspace_review_v3','admin_save_access1441','restaurant_signed_in121','restaurant_can121','stage_book_operation136','post_review_adjustment136','journal_receipt14228','current_access14228','approve_entry_submission','preview_staff_workspace_entry_no','void_staff_editor1437','can_use_staff_account']) THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature);END IF;
 END LOOP;END $$;

-- Preserve existing authenticated/service RPC access while removing anonymous defaults.
DO $$ DECLARE f record;auth_allowed boolean;service_allowed boolean;BEGIN
 FOR f IN SELECT p.oid,p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' LOOP
  auth_allowed:=has_function_privilege('authenticated',f.oid,'EXECUTE');
  service_allowed:=has_function_privilege('service_role',f.oid,'EXECUTE');
  EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC,anon',f.signature);
  IF auth_allowed THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature);END IF;
  IF service_allowed THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);END IF;
 END LOOP;
END $$;
-- PostgREST invokes its hook after SET ROLE, so the impersonated roles need EXECUTE.
-- The hook itself rejects anonymous/inactive requests and preserves trusted service operations.
GRANT EXECUTE ON FUNCTION public.workspace_pre_request138() TO authenticator,authenticated,anon,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
