-- Historical installer. Preserved for reference only after v142.28.
DO $$ BEGIN RAISE EXCEPTION 'Superseded installer: use INSTALL-SECURITY-v142.28.sql and START-HERE-v142.28.txt';END $$;
-- Run once in Supabase SQL Editor as the database owner.
-- Stores a sub-account's own currency, linked to Currency Settings.
-- Existing records keep the currency previously inherited from their parent.
-- No balances, transactions, permissions or audit logs are changed.
BEGIN;
ALTER TABLE public.sub_accounts ADD COLUMN IF NOT EXISTS currency_code text;

UPDATE public.sub_accounts s
SET currency_code = a.currency_code
FROM public.accounts a
WHERE a.id = s.parent_account_id AND s.currency_code IS NULL
  AND EXISTS (SELECT 1 FROM public.currencies c WHERE c.code = a.currency_code);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.sub_accounts'::regclass
      AND conname = 'sub_accounts_currency1436_fk'
  ) THEN
    ALTER TABLE public.sub_accounts
      ADD CONSTRAINT sub_accounts_currency1436_fk
      FOREIGN KEY (currency_code) REFERENCES public.currencies(code);
  END IF;
END $$;

COMMENT ON COLUMN public.sub_accounts.currency_code IS
  'Sub-account currency from Currency Settings. Legacy NULL rows inherit their parent currency until edited.';
NOTIFY pgrst, 'reload schema';
COMMIT;
