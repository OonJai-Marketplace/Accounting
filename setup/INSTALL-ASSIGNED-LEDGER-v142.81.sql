-- Additive migration. No journal records or posting permissions are changed.
BEGIN;
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS ledger_account_ids14281 uuid[] NOT NULL DEFAULT '{}';
CREATE OR REPLACE FUNCTION public.admin_save_access14281(p_user uuid,p_name text,p_role text,p_permissions jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb; ids uuid[];
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin' AND status='active') THEN RAISE EXCEPTION 'Active administrator required' USING ERRCODE='42501'; END IF;
 IF p_permissions ? 'ledger_account_ids14281' THEN
  IF jsonb_typeof(p_permissions->'ledger_account_ids14281') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Ledger accounts must be an array'; END IF;
  SELECT coalesce(array_agg(DISTINCT v::uuid),'{}'::uuid[]) INTO ids FROM jsonb_array_elements_text(p_permissions->'ledger_account_ids14281') AS x(v);
  IF EXISTS(SELECT 1 FROM unnest(ids) x WHERE x IS NULL OR NOT EXISTS(SELECT 1 FROM accounts WHERE id=x AND is_posting)) THEN RAISE EXCEPTION 'Choose valid posting accounts for ledger access'; END IF;
 ELSE SELECT coalesce(ledger_account_ids14281,'{}') INTO ids FROM user_permissions WHERE user_id=p_user;
 END IF;
 result:=public.admin_save_access1441(p_user,p_name,p_role,p_permissions);
 UPDATE user_permissions SET ledger_account_ids14281=coalesce(ids,'{}') WHERE user_id=p_user;
 RETURN result||jsonb_build_object('ledger_saved',true);
END $$;
CREATE OR REPLACE FUNCTION public.assigned_ledger14281(p_owner uuid,p_account uuid DEFAULT NULL,p_from date DEFAULT NULL,p_to date DEFAULT NULL,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE ids uuid[]; opening numeric; closing numeric; rows jsonb; account_list jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.accounting_workspace_allowed123() OR NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND status='active') OR NOT EXISTS(SELECT 1 FROM profiles WHERE id=p_owner AND status='active') OR NOT (auth.uid()=p_owner OR (EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin' AND status='active') AND public.can_workspace113(p_owner))) THEN RAISE EXCEPTION 'This ledger is not accessible' USING ERRCODE='42501'; END IF;
 SELECT ledger_account_ids14281 INTO ids FROM user_permissions WHERE user_id=p_owner;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'code',code,'name',name,'currency',currency_code) ORDER BY code),'[]') INTO account_list FROM accounts WHERE id=ANY(coalesce(ids,'{}')) AND is_posting;
 IF p_account IS NULL THEN RETURN jsonb_build_object('accounts',account_list); END IF;
 IF NOT coalesce(p_account=ANY(ids),false) THEN RAISE EXCEPTION 'Ledger account not assigned' USING ERRCODE='42501'; END IF;
 IF p_from IS NULL OR p_to IS NULL OR p_to<p_from OR p_to>p_from+366 OR p_offset IS NULL OR p_offset<0 THEN RAISE EXCEPTION 'Choose a valid monthly or quarterly period'; END IF;
 SELECT coalesce(sum(l.debit-l.credit),0) INTO opening FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id WHERE l.account_id=p_account AND e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)<p_from;
 SELECT opening+coalesce(sum(l.debit-l.credit),0) INTO closing FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id WHERE l.account_id=p_account AND e.status::text='posted' AND coalesce(l.line_date,e.transaction_date) BETWEEN p_from AND p_to;
 WITH running AS (
 SELECT l.id,coalesce(l.line_date,e.transaction_date) AS date,e.entry_no AS reference,e.memo AS general_description,coalesce(nullif(l.description,''),e.memo,'') AS description,l.debit,l.credit,
 opening+sum(l.debit-l.credit) OVER(ORDER BY coalesce(l.line_date,e.transaction_date),e.created_at,e.id,l.line_no,l.id) AS balance,
 row_number() OVER(ORDER BY coalesce(l.line_date,e.transaction_date),e.created_at,e.id,l.line_no,l.id) AS ordinal
 FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id
 WHERE l.account_id=p_account AND e.status::text='posted' AND coalesce(l.line_date,e.transaction_date) BETWEEN p_from AND p_to
 ), page AS (SELECT * FROM running ORDER BY ordinal LIMIT 500 OFFSET p_offset)
 SELECT coalesce(jsonb_agg(to_jsonb(page) ORDER BY ordinal),'[]') INTO rows FROM page;
 RETURN jsonb_build_object('accounts',account_list,'opening',opening,'closing',closing,'rows',rows);
END $$;
REVOKE ALL ON FUNCTION public.admin_save_access14281(uuid,text,text,jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.assigned_ledger14281(uuid,uuid,date,date,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_save_access14281(uuid,text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assigned_ledger14281(uuid,uuid,date,date,integer) TO authenticated;
-- Defend the new assignment even if an older installation has broad update RLS.
CREATE OR REPLACE FUNCTION public.guard_ledger_assignment14281() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF (TG_OP='INSERT' AND cardinality(NEW.ledger_account_ids14281)>0)
 OR (TG_OP='UPDATE' AND NEW.ledger_account_ids14281 IS DISTINCT FROM OLD.ledger_account_ids14281) THEN
  IF auth.uid() IS NOT NULL AND NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin' AND status='active') THEN RAISE EXCEPTION 'Only an administrator may assign ledger access' USING ERRCODE='42501'; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_ledger_assignment14281 ON public.user_permissions;
CREATE TRIGGER guard_ledger_assignment14281 BEFORE INSERT OR UPDATE ON public.user_permissions FOR EACH ROW EXECUTE FUNCTION public.guard_ledger_assignment14281();
REVOKE ALL ON FUNCTION public.guard_ledger_assignment14281() FROM PUBLIC,anon,authenticated;
COMMIT;
