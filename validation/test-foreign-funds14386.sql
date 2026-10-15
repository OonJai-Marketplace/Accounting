-- All test setting changes roll back. No journal or financial amounts are written.
BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.profiles WHERE role='admin' AND status='active' LIMIT 1),true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE a uuid; s uuid; linked uuid;
BEGIN
 SELECT id INTO a FROM public.accounts WHERE account_type='ASSET' AND is_posting AND NOT is_technical AND account_purpose='regular' AND currency_code<>'LAK' LIMIT 1;
 IF a IS NULL THEN RAISE EXCEPTION 'No eligible account to test'; END IF;
 UPDATE public.accounts SET track_foreign_funds=true WHERE id=a;
 IF NOT EXISTS(SELECT 1 FROM public.accounts WHERE id=a AND track_foreign_funds) THEN RAISE EXCEPTION 'Account flag did not save'; END IF;
 BEGIN
  UPDATE public.accounts SET track_foreign_funds=true WHERE id=(SELECT id FROM public.accounts WHERE NOT is_posting LIMIT 1);
  RAISE EXCEPTION 'Parent constraint did not reject';
 EXCEPTION WHEN check_violation THEN NULL; END;
 SELECT c.id,c.posting_account_id14285 INTO s,linked FROM public.sub_accounts c JOIN public.accounts p ON p.id=c.posting_account_id14285 WHERE p.account_type='ASSET' AND p.currency_code<>'LAK' AND NOT p.is_technical AND p.account_purpose='regular' LIMIT 1;
 IF s IS NOT NULL THEN
  UPDATE public.sub_accounts SET track_foreign_funds=true WHERE id=s;
  IF NOT EXISTS(SELECT 1 FROM public.accounts WHERE id=linked AND track_foreign_funds) THEN RAISE EXCEPTION 'Sub-account flag did not propagate'; END IF;
  UPDATE public.sub_accounts SET track_foreign_funds=false WHERE id=s;
  IF EXISTS(SELECT 1 FROM public.accounts WHERE id=linked AND track_foreign_funds) THEN RAISE EXCEPTION 'Sub-account flag did not clear'; END IF;
 END IF;
END $$;
ROLLBACK;
