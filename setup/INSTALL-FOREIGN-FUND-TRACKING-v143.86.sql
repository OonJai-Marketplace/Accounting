-- Additive Phase 2 settings. Existing accounts and historical amounts are unchanged.
BEGIN;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS track_foreign_funds boolean NOT NULL DEFAULT false;
ALTER TABLE public.sub_accounts ADD COLUMN IF NOT EXISTS track_foreign_funds boolean NOT NULL DEFAULT false;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_foreign_funds14386 CHECK (NOT track_foreign_funds OR (is_posting AND currency_code <> 'LAK' AND account_type='ASSET' AND NOT is_technical AND account_purpose='regular'));
-- Extend the existing authorized, atomic sub-account synchronization.
DO $migration$
DECLARE definition text;
BEGIN
 definition:=pg_get_functiondef('public.sync_subaccount_posting14285()'::regprocedure);
 IF position('track_foreign_funds' in definition)=0 THEN
  IF position('parent_code,created_by)' in definition)=0 OR position('is_active=NEW.is_active WHERE id=child' in definition)=0 THEN RAISE EXCEPTION 'Unexpected sub-account function; review before installing'; END IF;
  definition:=replace(definition,'parent_code,created_by)','parent_code,created_by,track_foreign_funds)');
  definition:=replace(definition,'p.code,auth.uid());','p.code,auth.uid(),NEW.track_foreign_funds);');
  definition:=replace(definition,'is_active=NEW.is_active WHERE id=child','is_active=NEW.is_active,track_foreign_funds=NEW.track_foreign_funds WHERE id=child');
  EXECUTE definition;
 END IF;
END $migration$;
NOTIFY pgrst,'reload schema';
COMMIT;
