-- Run this entire file in Supabase SQL Editor as the database owner.
-- This replacement uses one atomic DO statement and no temporary tables.
-- It reconciles the reviewed legacy sub-account defaults against chart identities,
-- preserves existing chart IDs, currencies and non-posting groups, and adds missing
-- posting accounts for new sub-accounts. Existing journal rows are not updated.
-- Already-linked records are not rewritten.
DO $install$
DECLARE
 saved_guard_states jsonb;
 g record;
BEGIN
 LOCK TABLE public.accounts, public.sub_accounts IN ACCESS EXCLUSIVE MODE;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'table_name',c.relname,'trigger_name',t.tgname,'enabled_mode',t.tgenabled
  )),'[]'::jsonb) INTO saved_guard_states
 FROM pg_catalog.pg_trigger t
 JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
 WHERE t.tgrelid IN ('public.accounts'::regclass,'public.sub_accounts'::regclass)
   AND t.tgfoid='public.guard_actions113()'::regprocedure
   AND t.tgenabled IN ('O','A');
 FOR g IN SELECT * FROM jsonb_to_recordset(saved_guard_states)
   AS guard_state(table_name text,trigger_name text,enabled_mode text)
 LOOP
  EXECUTE format('ALTER TABLE public.%I DISABLE TRIGGER %I',g.table_name,g.trigger_name);
 END LOOP;

ALTER TABLE public.sub_accounts ADD COLUMN IF NOT EXISTS posting_account_id14285 uuid REFERENCES public.accounts(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS sub_accounts_posting14285_unique ON public.sub_accounts(posting_account_id14285);
-- Reconcile the legacy duplicate records against the existing chart identities.
-- Only the currency defaults and the name discrepancy verified by the owner
-- on 2026-10-08 are accepted. Parent/type mismatches still stop the transaction.
DO $backfill$
DECLARE s record; p public.accounts%ROWTYPE; a public.accounts%ROWTYPE; child uuid;
        expected_currency text;
BEGIN
 FOR s IN SELECT * FROM public.sub_accounts WHERE posting_account_id14285 IS NULL ORDER BY code LOOP
  SELECT * INTO p FROM public.accounts WHERE id=s.parent_account_id;
  IF p.id IS NULL OR p.is_posting IS DISTINCT FROM false THEN
   RAISE EXCEPTION 'Sub-account % needs a non-posting parent account',s.code;
  END IF;
  SELECT * INTO a FROM public.accounts WHERE code=s.code;
  IF FOUND THEN
   IF a.id=p.id OR a.parent_code IS DISTINCT FROM p.code
      OR a.account_type IS DISTINCT FROM p.account_type OR a.is_posting IS NULL THEN
    RAISE EXCEPTION 'Sub-account % has a conflicting chart identity, parent or classification',s.code;
   END IF;
   IF a.name IS DISTINCT FROM s.name
      AND NOT (s.code='4014' AND s.name='Sales – Sonpao' AND a.name='Sales – Xonpao') THEN
    RAISE EXCEPTION 'Sub-account % has an unreviewed name mismatch',s.code;
   END IF;
   expected_currency:=CASE
    WHEN s.code IN ('1041','1220','1221','1222','1223','2212','2213','2410',
      '3020','3030','3111','4111','4131','5112','5310','5314','5415',
      '9011','9021','9033','9042') THEN 'USD'
    WHEN s.code IN ('1224','3112','4112','4132','9012','9032','9052') THEN 'THB'
    ELSE NULL END;
   IF a.currency_code IS DISTINCT FROM coalesce(s.currency_code,p.currency_code)
      AND NOT coalesce(coalesce(s.currency_code,p.currency_code)='LAK'
        AND expected_currency=a.currency_code,false) THEN
    RAISE EXCEPTION 'Sub-account % has an unreviewed currency mismatch',s.code;
   END IF;
   -- Preserve every existing chart ID, currency, balance and posting/group flag.
   UPDATE public.sub_accounts SET posting_account_id14285=a.id,
      name=a.name,currency_code=a.currency_code WHERE id=s.id;
  ELSE
   IF p.is_active IS FALSE OR NOT EXISTS(
      SELECT 1 FROM public.currencies WHERE code=coalesce(s.currency_code,p.currency_code) AND is_active
   ) THEN RAISE EXCEPTION 'Sub-account % needs an active parent and currency',s.code; END IF;
   child:=gen_random_uuid();
   INSERT INTO public.accounts(id,code,name,currency_code,account_type,description,account_purpose,is_posting,is_active,parent_code,created_by)
   VALUES(child,s.code,s.name,coalesce(s.currency_code,p.currency_code),p.account_type,s.description,'regular',true,s.is_active,p.code,p.created_by);
   UPDATE public.sub_accounts SET posting_account_id14285=child WHERE id=s.id;
  END IF;
 END LOOP;
END $backfill$;
CREATE OR REPLACE FUNCTION public.sync_subaccount_posting14285() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE p public.accounts%ROWTYPE; a public.accounts%ROWTYPE; child uuid; posted boolean;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND status='active') THEN
  RAISE EXCEPTION 'An active administrator is required to change sub-accounts' USING ERRCODE='42501';
 END IF;
 IF TG_OP='DELETE' THEN
  IF OLD.posting_account_id14285 IS NOT NULL THEN
   IF EXISTS(SELECT 1 FROM public.journal_lines WHERE account_id=OLD.posting_account_id14285) THEN RAISE EXCEPTION 'This sub-account has journal history. Deactivate it instead.'; END IF;
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
  INSERT INTO public.accounts(id,code,name,currency_code,account_type,description,account_purpose,is_posting,is_active,parent_code,created_by)
  VALUES(child,NEW.code,NEW.name,NEW.currency_code,p.account_type,NEW.description,'regular',true,NEW.is_active,p.code,auth.uid());
 ELSE
  SELECT * INTO a FROM public.accounts WHERE id=child FOR UPDATE;
  IF a.id IS NULL THEN RAISE EXCEPTION 'The linked posting account is missing.'; END IF;
  posted:=EXISTS(SELECT 1 FROM public.journal_lines WHERE account_id=child);
  IF posted AND (a.currency_code IS DISTINCT FROM NEW.currency_code OR a.account_type IS DISTINCT FROM p.account_type) THEN RAISE EXCEPTION 'Keep the currency and classification of a sub-account with journal history. Create a new sub-account for a different currency or type.'; END IF;
  UPDATE public.accounts SET code=NEW.code,name=NEW.name,currency_code=NEW.currency_code,account_type=p.account_type,description=NEW.description,parent_code=p.code,is_active=NEW.is_active WHERE id=child;
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
 IF EXISTS(SELECT 1 FROM public.sub_accounts WHERE parent_account_id=NEW.id) THEN
  IF NEW.is_posting IS DISTINCT FROM false THEN RAISE EXCEPTION 'A grouping account with sub-accounts must remain non-posting.'; END IF;
  IF OLD.account_type IS DISTINCT FROM NEW.account_type AND EXISTS(SELECT 1 FROM public.journal_lines l JOIN public.sub_accounts s ON s.posting_account_id14285=l.account_id WHERE s.parent_account_id=NEW.id) THEN RAISE EXCEPTION 'Sub-accounts have journal history. Keep their parent classification.'; END IF;
  UPDATE public.accounts a SET parent_code=NEW.code,account_type=NEW.account_type FROM public.sub_accounts s WHERE s.parent_account_id=NEW.id AND a.id=s.posting_account_id14285;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_subaccount_parent14285() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS sync_subaccount_parent14285 ON public.accounts;
CREATE TRIGGER sync_subaccount_parent14285 AFTER UPDATE OF code,account_type,is_posting ON public.accounts FOR EACH ROW WHEN(OLD.is_posting IS FALSE) EXECUTE FUNCTION public.sync_subaccount_parent14285();
COMMENT ON COLUMN public.sub_accounts.posting_account_id14285 IS 'Stable linked chart identity. Existing grouping accounts retain is_posting=false; posting permissions still use the chart account ID.';

 -- Restore the same access guards before this atomic statement can commit.
 FOR g IN SELECT * FROM jsonb_to_recordset(saved_guard_states)
   AS guard_state(table_name text,trigger_name text,enabled_mode text)
 LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE %s TRIGGER %I',
    g.table_name,CASE WHEN g.enabled_mode='A' THEN 'ALWAYS' ELSE '' END,g.trigger_name);
 END LOOP;
 NOTIFY pgrst,'reload schema';
END $install$;

SELECT count(*) AS total_sub_accounts,
       count(a.id) AS linked_sub_accounts,
       count(*) FILTER (WHERE a.is_posting IS FALSE) AS parent_groups,
       (SELECT count(*) FROM pg_catalog.pg_trigger t
        WHERE t.tgrelid IN ('public.accounts'::regclass,'public.sub_accounts'::regclass)
          AND t.tgfoid='public.guard_actions113()'::regprocedure
          AND t.tgenabled='D') AS disabled_access_guards
FROM public.sub_accounts s
LEFT JOIN public.accounts a ON a.id=s.posting_account_id14285;

