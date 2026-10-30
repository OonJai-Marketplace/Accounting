-- Historical receipt metadata repair. Never changes amounts, accounts or journals.
CREATE OR REPLACE FUNCTION public.historical_receipt_metadata143199(old_row public.staff_journal_lines,new_row public.staff_journal_lines)
RETURNS boolean LANGUAGE plpgsql STABLE SET search_path=public,pg_temp AS $function$
DECLARE parent public.staff_journal_lines; h jsonb;
BEGIN
 IF NOT public.is_admin() OR auth.uid() IS NULL OR old_row.journal_entry_id IS NULL THEN RETURN false; END IF;
 IF (to_jsonb(old_row)-'transaction_date'-'editor_group1437'-'editor_snapshot1437') IS DISTINCT FROM
    (to_jsonb(new_row)-'transaction_date'-'editor_group1437'-'editor_snapshot1437') THEN RETURN false; END IF;
 IF (old_row.editor_snapshot1437-'memo') IS DISTINCT FROM (new_row.editor_snapshot1437-'memo') THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM staff_journals s WHERE s.id=old_row.staff_journal_id AND s.seed_key LIKE 'HISTORY-XLSX:%:RYAN' AND s.status='posted')
    OR EXISTS(SELECT 1 FROM approved_reports1443 WHERE journal_id=old_row.staff_journal_id) THEN RETURN false; END IF;
 h:=old_row.editor_snapshot1437->'historicalSource';
 IF h->>'row' !~ '^[0-9]+$' OR coalesce(h->>'sheet','')='' THEN RETURN false; END IF;
 SELECT l.* INTO parent FROM staff_journal_lines l
 WHERE l.staff_journal_id=old_row.staff_journal_id
 AND l.editor_snapshot1437->'historicalSource'->>'file'=h->>'file'
 AND l.editor_snapshot1437->'historicalSource'->>'sheet'=h->>'sheet'
 AND coalesce(l.editor_snapshot1437->'historicalSource'->>'originalDate','')<>''
 AND (l.editor_snapshot1437->'historicalSource'->>'row')::integer<=(h->>'row')::integer
 ORDER BY (l.editor_snapshot1437->'historicalSource'->>'row')::integer DESC LIMIT 1;
 IF NOT FOUND THEN RETURN false; END IF;
 RETURN new_row.transaction_date=parent.transaction_date
 AND new_row.editor_group1437='history-receipt:'||parent.id::text
 AND new_row.editor_snapshot1437->>'memo'=parent.memo;
END $function$;
REVOKE ALL ON FUNCTION public.historical_receipt_metadata143199(public.staff_journal_lines,public.staff_journal_lines) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.historical_receipt_metadata143199(public.staff_journal_lines,public.staff_journal_lines) TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_linked_workspace_line()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
 if tg_op='UPDATE' and public.historical_receipt_metadata143199(old,new) then return new; end if;
 if old.journal_entry_id is not null then raise exception 'This workspace entry is linked to a posted journal and cannot be changed or voided'; end if;
 if tg_op='DELETE' then return old;end if;return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.staff_rules14228()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE j public.staff_journals;p public.user_permissions;target text;
BEGIN
 SELECT * INTO j FROM staff_journals WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD.staff_journal_id ELSE NEW.staff_journal_id END FOR UPDATE;
 IF NOT FOUND OR NOT public.can_workspace113(j.owner_id) THEN RAISE EXCEPTION 'Current workspace access required';END IF;
 target:=CASE WHEN j.owner_id=auth.uid() THEN 'sub-users-workspace' ELSE 'user-entry-review' END;
 -- Administrator reconstruction of source lines already represented by a closed journal.
 -- This branch inserts evidence only; it cannot create or alter general-ledger entries.
 IF TG_OP='INSERT' AND j.status='draft' AND j.seed_key LIKE 'HISTORY-XLSX:%' THEN
  IF auth.uid() IS NULL OR NOT public.is_admin()
     OR NEW.journal_entry_id IS NULL
     OR NOT EXISTS(SELECT 1 FROM public.accounting_periods WHERE period_month=j.period_start AND status='closed')
     OR NOT EXISTS(SELECT 1 FROM public.journal_entries e JOIN public.journal_lines l ON l.journal_entry_id=e.id
       WHERE e.id=NEW.journal_entry_id AND e.status='posted'
         AND date_trunc('month',e.transaction_date)::date=j.period_start
         AND l.account_id=NEW.account_id AND l.currency_code=NEW.currency_code)
     OR NEW.transaction_date<j.period_start OR NEW.transaction_date>j.period_end
     OR NEW.entry_kind NOT IN ('payment','collection')
     OR (NEW.entry_kind='collection')<>(NEW.direction='in')
     OR NOT EXISTS(SELECT 1 FROM public.accounts WHERE id=NEW.fund_account_id AND is_active AND is_posting AND currency_code=NEW.currency_code)
     OR coalesce(NEW.reference,'')='' OR coalesce(NEW.client_key,'') NOT LIKE 'history-xlsx:%' THEN
   RAISE EXCEPTION 'Historical source requires an administrator, closed month, posted journal link and source reference';
  END IF;
  RETURN NEW;
 END IF;
 IF TG_OP='UPDATE' AND public.historical_receipt_metadata143199(OLD,NEW) THEN RETURN NEW; END IF;
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
END $function$
;
