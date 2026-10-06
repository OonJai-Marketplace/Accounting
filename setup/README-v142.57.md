# Account and journal updates v142.57

## Opening balances appear closed in an empty ledger

The opening-balance installer is intentionally forward-only. The first journal entry closes a persistent setup flag. Removing practice entries does not clear that flag. Empty filtered screens also do not prove that there are no retained voided entries, audit references, archives, or closing records.

1. Run `CHECK-OPENING-SETUP-v142.57.sql` in the Supabase SQL Editor to inspect the flag and retained records. This file is read-only.
2. Only for this initial practice-to-live setup, with other users signed out, run `ONE-TIME-EMPTY-SETUP-v142.57.sql`. It refuses to proceed if financial records remain or if this reset was already used. It deletes no records and preserves retry receipts. If a guard stops it, read the named record type before taking further action; do not remove the guard.
3. After a successful reset, reload the app and open Chart of Accounts → Opening balances. Enter and finalize the starting balances before posting any regular journal entry. The journal sequence restarts at 1; finalizing opening balances itself may consume the first journal number.

This reset is optional and separate from the normal update. It must never run automatically after voiding entries or deleting audit logs. The next number is a preview; concurrent posting can legitimately advance it.

## Install normal server updates

Run `INSTALL-ACCOUNT-UPDATES-v142.57.sql` once in the Supabase SQL Editor. It combines the password-reset gate and read-only journal-number preview. It does not change existing passwords, balances, journal numbers, or the opening setup flag. It can be installed again safely.

If installation reports an existing PostgREST pre-request hook, stop and compose the existing hook with `password_gate14257` instead of clearing the existing hook. The installer deliberately refuses to overwrite another security hook.

Deploy `supabase/functions/admin-password14257/index.ts` as the Edge Function **admin-password14257**, with JWT verification enabled. The function uses the standard server environment variables SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Keep the service-role key exclusively on the server. APP_ORIGIN defaults to https://oonjai-marketplace.github.io; configure the exact origin if hosting changes.

CLI deployment, from this repository after linking the correct Supabase project:

```sh
supabase functions deploy admin-password14257
```

Before enabling temporary resets for privileged users, audit any existing Edge Functions that use service-role access (including admin-create-user). Those functions must check the caller’s pending-reset state before privileged actions: call `password_change_status14257` with the caller’s JWT and refuse when required is true. The Data API and RLS gate cannot control an unrelated service-role Edge Function. Their deployed source is not available in this repository; it has not been changed by this release.

The new function authenticates the caller, checks active administrator permission, replaces the target password, and requires a different new password before workspace access. Pending users are blocked at the Data API and RLS layers, in addition to the browser gate. Only the server can finish the reset after verifying the password actually changed. An interrupted issuance stays locked; the administrator can retry after two minutes. Administrators cannot issue their own temporary password through this action; email recovery remains available.

After installation, test with a non-production staff account: issue a temporary password, sign in, confirm the password-change screen opens first, set a different strong password, and sign in again. Also test the existing email recovery route. Add the recovery.html URL to Supabase Auth redirect allow-list if the project uses an explicit allow-list; existing desktop recovery links also forward there.

## Website changes included

- Separate small recovery page, invalid-link handling, and fast recovery routing.
- Password requirements displayed while typing; weak submissions blocked locally. Supabase remains authoritative for additional password restrictions. Failed saves keep the editor and its entered information; an already-created account is retained for editing.
- Authenticated shell appears before area data; datasets load for the selected area.
- One Online / Offline / Limited connection button with saved-entry and unfinished-draft status. Saved queued entries sync automatically; no manual Sync now button.
- Existing numeric values keep their caret on click, including formatted journal amounts.
- Blank line memos use the general description; specific line memos take priority. Journal printing shows the shared description once, retaining distinct line memos.
- Server-backed next journal-number preview, with an honest fallback when its SQL is not installed.
- Sub-account and assigned-account currency badges use the canonical posting account currency.
- Recovery PIN interface removed; administrator temporary password action added.
- Approved phone layout and report foundation preserved.

Browser regression checks cover caret editing, live validation, retained user editors, connectivity, memo printing, area loading, server number preview, currency badges, recovery, and mandatory password-change routing. Isolated PostgreSQL tests cover permissions, reset gating, password-hash verification, installer repeatability, and the guarded one-time setup reset. No SQL or Edge Function was installed in the live Supabase project by the website release.
