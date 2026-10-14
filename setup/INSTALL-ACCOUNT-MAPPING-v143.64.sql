-- Add a purpose label only. Existing classifications, balances and posting connections are unchanged.
BEGIN;
ALTER TABLE public.accounts DROP CONSTRAINT accounts_purpose_allowed;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_purpose_allowed
 CHECK (account_purpose IN ('regular','mapping','clearing','suspense','settlement','payroll','opening'));
COMMIT;
