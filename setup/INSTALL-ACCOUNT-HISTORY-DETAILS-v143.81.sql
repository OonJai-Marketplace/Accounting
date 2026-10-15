-- Preserve stable posting IDs and financial history. Inherit System status and purpose as well as financial type.
BEGIN;
-- Show the exact history that protects an account. No journal values are changed.
CREATE OR REPLACE FUNCTION public.account_history_label14381(account_ids uuid[]) RETURNS text
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
 WITH entries AS (
  SELECT DISTINCT e.id,e.entry_no,e.transaction_date,e.status::text AS status
  FROM public.journal_lines l JOIN public.journal_entries e ON e.id=l.journal_entry_id
  WHERE l.account_id=ANY(account_ids)
 ), sample AS (SELECT * FROM entries ORDER BY transaction_date,entry_no,id LIMIT 20)
 SELECT 'Linked journal entries ('||(SELECT count(*) FROM entries)||' total): '||
 coalesce(string_agg(coalesce(entry_no,id::text)||' ['||to_char(transaction_date,'DD Mon YYYY')||', '||status||']','; ' ORDER BY transaction_date,entry_no,id),'none')||
 CASE WHEN (SELECT count(*) FROM entries)>20 THEN '. Showing the first 20; use General Ledger with All months for the remaining posted entries.' ELSE '.' END
 FROM sample;
$$;
REVOKE ALL ON FUNCTION public.account_history_label14381(uuid[]) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.sync_subaccount_posting14285() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE p public.accounts%ROWTYPE; a public.accounts%ROWTYPE; child uuid; posted boolean;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND status='active') THEN
  RAISE EXCEPTION 'An active administrator is required to change sub-accounts' USING ERRCODE='42501';
 END IF;
 IF TG_OP='DELETE' THEN
  IF OLD.posting_account_id14285 IS NOT NULL THEN
   IF EXISTS(SELECT 1 FROM public.journal_lines WHERE account_id=OLD.posting_account_id14285) THEN RAISE EXCEPTION 'Cannot delete sub-account % because it has journal history. % Deactivate it instead.',OLD.code,public.account_history_label14381(ARRAY[OLD.posting_account_id14285]); END IF;
   IF EXISTS(SELECT 1 FROM public.sub_accounts WHERE parent_account_id=OLD.posting_account_id14285)
      OR EXISTS(SELECT 1 FROM public.accounts WHERE parent_code=OLD.code AND id<>OLD.posting_account_id14285) THEN
    RAISE EXCEPTION 'This grouping account has child accounts. Keep the group or deactivate it instead.';
   END IF;
   DELETE FROM public.accounts WHERE id=OLD.posting_account_id14285;
  END IF;
  RETURN OLD;
 END IF;
 SELECT * INTO p FROM public.accounts WHERE id=NEW.parent_account_id FOR SHARE;
 IF p.id IS NULL OR p.is_posting IS DISTINCT FROM false OR p.is_active IS FALSE THEN RAISE EXCEPTION 'Choose an active non-posting parent grouping account.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.currencies WHERE code=NEW.currency_code AND is_active) THEN RAISE EXCEPTION 'Choose an active currency.'; END IF;
 IF TG_OP='UPDATE' AND NEW.posting_account_id14285 IS DISTINCT FROM OLD.posting_account_id14285 THEN RAISE EXCEPTION 'The posting account link cannot be changed.'; END IF;
 child:=CASE WHEN TG_OP='UPDATE' THEN OLD.posting_account_id14285 ELSE NULL END;
 IF child IS NULL THEN
  IF EXISTS(SELECT 1 FROM public.accounts WHERE code=NEW.code) THEN RAISE EXCEPTION 'This code already belongs to a chart account. Choose a unique sub-account code.'; END IF;
  child:=gen_random_uuid();
  INSERT INTO public.accounts(id,code,name,currency_code,account_type,description,account_purpose,is_technical,is_posting,is_active,parent_code,created_by)
  VALUES(child,NEW.code,NEW.name,NEW.currency_code,p.account_type,NEW.description,p.account_purpose,(p.is_technical OR p.account_purpose<>'regular'),true,NEW.is_active,p.code,auth.uid());
 ELSE
  SELECT * INTO a FROM public.accounts WHERE id=child FOR UPDATE;
  IF a.id IS NULL THEN RAISE EXCEPTION 'The linked posting account is missing.'; END IF;
  posted:=EXISTS(SELECT 1 FROM public.journal_lines WHERE account_id=child);
  IF posted AND (a.currency_code IS DISTINCT FROM NEW.currency_code OR a.account_type IS DISTINCT FROM p.account_type OR a.is_technical IS DISTINCT FROM (p.is_technical OR p.account_purpose<>'regular') OR a.account_purpose IS DISTINCT FROM p.account_purpose) THEN RAISE EXCEPTION 'Cannot change the currency or classification of sub-account % — % because it has journal history. % Review these entries before deciding how to correct the account.',a.code,a.name,public.account_history_label14381(ARRAY[child]); END IF;
  UPDATE public.accounts SET code=NEW.code,name=NEW.name,currency_code=NEW.currency_code,account_type=p.account_type,account_purpose=p.account_purpose,is_technical=(p.is_technical OR p.account_purpose<>'regular'),description=NEW.description,parent_code=p.code,is_active=NEW.is_active WHERE id=child;
 END IF;
 NEW.posting_account_id14285:=child;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_subaccount_posting14285() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS sync_subaccount_write14285 ON public.sub_accounts;
CREATE TRIGGER sync_subaccount_write14285 BEFORE INSERT OR UPDATE ON public.sub_accounts FOR EACH ROW EXECUTE FUNCTION public.sync_subaccount_posting14285();
DROP TRIGGER IF EXISTS sync_subaccount_delete14285 ON public.sub_accounts;
CREATE TRIGGER sync_subaccount_delete14285 AFTER DELETE ON public.sub_accounts FOR EACH ROW EXECUTE FUNCTION public.sync_subaccount_posting14285();
CREATE OR REPLACE FUNCTION public.sync_subaccount_parent14285() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND status='active') THEN RAISE EXCEPTION 'An active administrator is required to change parent accounts' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM public.sub_accounts WHERE parent_account_id=NEW.id) THEN
  IF NEW.is_posting IS DISTINCT FROM false THEN RAISE EXCEPTION 'A grouping account with sub-accounts must remain non-posting.'; END IF;
  IF (OLD.account_type IS DISTINCT FROM NEW.account_type OR OLD.account_purpose IS DISTINCT FROM NEW.account_purpose OR OLD.is_technical IS DISTINCT FROM NEW.is_technical) AND EXISTS(SELECT 1 FROM public.journal_lines l JOIN public.sub_accounts s ON s.posting_account_id14285=l.account_id WHERE s.parent_account_id=NEW.id) THEN RAISE EXCEPTION 'Cannot change parent % classification because its sub-accounts have journal history. %',NEW.code,public.account_history_label14381(ARRAY(SELECT posting_account_id14285 FROM public.sub_accounts WHERE parent_account_id=NEW.id)); END IF;
  UPDATE public.accounts a SET parent_code=NEW.code,account_type=NEW.account_type,account_purpose=NEW.account_purpose,is_technical=(NEW.is_technical OR NEW.account_purpose<>'regular') FROM public.sub_accounts s WHERE s.parent_account_id=NEW.id AND a.id=s.posting_account_id14285;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_subaccount_parent14285() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS sync_subaccount_parent14285 ON public.accounts;
CREATE TRIGGER sync_subaccount_parent14285 AFTER UPDATE OF code,account_type,account_purpose,is_technical,is_posting ON public.accounts FOR EACH ROW WHEN(OLD.is_posting IS FALSE) EXECUTE FUNCTION public.sync_subaccount_parent14285();

COMMIT;
