# Login and temporary-password repair v142.64

The shared session policy originally required report access. Active sub-users can therefore authenticate successfully yet receive zero settings rows. The policy table has a Boolean primary key, so the usual failure here is a hidden or missing row, not duplicates. The v142.63 source message was not synchronized into the deployed desktop bundle; this repair synchronizes it and removes misleading generic installation advice.

## Apply the two server steps

1. In the Supabase SQL Editor, run `setup/FIX-SESSION-POLICY-v142.63.sql` in full. It creates the single settings row if missing and allows active users to read the timeout. Only administrators can edit it. Existing values and all accounting records are preserved. The final result should contain one row with `id=true`.
2. In Edge Functions, open **admin-password14257 → Settings** and turn **Verify JWT** off for this function only. Save it. The current function still verifies every token with Supabase Auth and checks active administrator access; the service-only SQL also enforces administrator/reset gates. This avoids rejection by the legacy gateway when newer signing keys are used. From a linked CLI, deploy with `supabase functions deploy admin-password14257 --no-verify-jwt`; the same setting is included in `supabase/config.toml`.

Then open the current website, sign out, and sign in again. Test a normal active sub-user login after email recovery, then issue a temporary password to a staff test account and verify it requires a different new password before workspace access. Do not recreate existing users or rerun transaction-cleanup SQL.

## Validation boundaries

Regression tests cover session lookup, missing/hidden settings, invalid settings, transport-only cached fallback, changed-account protection, gateway errors, service errors, and authenticated password requests. Function tests cover invalid tokens and administrator checks. These checks do not execute the live database migration or change the deployed Supabase function settings; those two server steps must be applied by an account with Supabase access.
