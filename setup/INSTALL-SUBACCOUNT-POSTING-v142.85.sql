-- Run once in Supabase SQL Editor. Idempotent; existing journal entries remain unchanged.
BEGIN;
ALTER TABLE public.sub_accounts ADD COLUMN IF NOT EXISTS posting_account_id14285 uuid REFERENCES public.accounts(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS sub_accounts_posting14285_unique ON public.sub_accounts(posting_account_id14285);
-- Each child gets a real posting identity. A code collision aborts the entire migration.
DO $$
DECLARE s record; p public.accounts%ROWTYPE; a public.accounts%ROWTYPE; child uuid;
BEGIN
 FOR s IN SELECT * FROM public.sub_accounts WHERE posting_account_id14285 IS NULL ORDER BY code LOOP
  SELECT * INTO p FROM public.accounts WHERE id=s.parent_account_id;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Sub-account % has no parent account',s.code; END IF;
  SELECT * INTO a FROM public.accounts WHERE code=s.code;
  IF FOUND THEN
   IF a.name IS DISTINCT FROM s.name OR a.currency_code IS DISTINCT FROM coalesce(s.currency_code,p.currency_code) OR a.is_posting IS FALSE THEN
    RAISE EXCEPTION 'Sub-account code % conflicts with a chart account. Resolve that duplicate code before running this installer.',s.code;
   END IF;
   child:=a.id;
  ELSE
   child:=gen_random_uuid();
   INSERT INTO public.accounts(id,code,name,currency_code,account_type,description,account_purpose,is_posting,is_active,parent_code,created_by)
   VALUES(child,s.code,s.name,coalesce(s.currency_code,p.currency_code),p.account_type,s.description,'regular',true,s.is_active,p.code,p.created_by);
  END IF;
  UPDATE public.sub_accounts SET posting_account_id14285=child WHERE id=s.id;
 END LOOP;
END $$;
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
  UPDATE public.accounts SET code=NEW.code,name=NEW.name,currency_code=NEW.currency_code,account_type=p.account_type,description=NEW.description,parent_code=p.code,is_active=NEW.is_active,is_posting=true WHERE id=child;
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
COMMENT ON COLUMN public.sub_accounts.posting_account_id14285 IS 'Stable child posting account; account assignments still apply to this account ID.';
NOTIFY pgrst,'reload schema';
COMMIT;
