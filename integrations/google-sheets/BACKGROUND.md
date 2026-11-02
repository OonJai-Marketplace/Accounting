# Google connection and on-demand inboxes (143.239)

The three Google edge functions share `supabase/functions/_shared/google143150.ts`.
They use the existing server secrets `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
(or `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET`). The saved Accounting
client ID must match. The Google web client must allow this redirect URI:

https://nhjsesfhapnjtwlxvirm.supabase.co/functions/v1/google-oauth-callback

An active Accounting administrator clicks Connect Google and consents as
`oonjaimarketplace@gmail.com`. Google must issue offline access. This interactive
consent cannot be completed by deploying code. Google OAuth Testing-mode tokens
can expire after seven days; use the appropriate production consent configuration
for ongoing service. Revoked/expired permissions require a new authorization.

Refresh/access tokens are AES-GCM encrypted in a server-only table. Set a stable
`GOOGLE_TOKEN_ENCRYPTION_KEY` if independent encryption-key management is desired;
otherwise the server service-role secret derives the encryption key. Rotating that
key requires reconnecting Google. Neither tokens nor credentials are returned to
the browser. Account logout clears local content but retains company authorization.

The database inbox cron job is disabled. AI Journal reads Google only when Refresh
drafts (or the explicit workspace Sync now action) is pressed. Opening a page,
returning to the browser and reconnecting restore local snapshots without polling.
Google Apps Script edit triggers do not fire for API-written rows, so they do not
cover this submission flow. Draft discovery never posts journal entries. Browser reads enforce Accounting workspace and journal posting
permissions. Requests to Google are restricted to the configured workbook and the
journal's Drafts, Accounts, and Posted Archive operations. Existing source-change,
archive-verification, and idempotent posting checks remain in the client/database.

Verification: fixture tests `test-ai-background143150.cjs`,
`test-ai-currency143150.cjs`, `test-gpt-workspace143129.cjs`, and
`test-cleanup143149.cjs`; live database privilege checks and unauthenticated endpoint
rejection checks. A full Google consent/refresh check requires the company owner.

## Background workload policy

Apply `supabase/sql/month_close_sync239.sql` after yearly storage231. Ordinary
saves remain durable in Supabase and its revision queue; Google history copies
start on month closure or explicit Save pending changes. Closed-year immutable
history, comparison/formula verification, deletion gates and annual date routing
are unchanged. An incomplete requested copy retries at 06:10 Asia/Vientiane;
ordinary open-month edits do not trigger the retry. Annual storage preparation
checks once daily at 05:45 and retains the December 30 rule.

Word of Hope saves messages immediately and copies pending rows at 06:00 Laos.
Its browser summary checks once per daily slot, plus explicit inbox actions.
Account averages load when first needed and on Refresh averages; online posting
still obtains a fresh server check. The background inbox poll does not rewrite
the rate sheet. Technical cleanup removes at most 500 successful scheduler logs
older than 30 days per day; failed runs and accounting/audit history are retained.

The GitHub health workflow makes one small check per hour. Failed runs appear in
Actions; email delivery depends on the account's GitHub notification settings.
Tests: `test-month-close-sync239.cjs`, `test-quiet-inboxes239.cjs`,
`test-inbox-sync143173.cjs`, `test-inbox-cache143174.cjs`, plus the existing archive
verification and exchange-rate suites. These use fixtures, not live journal data.
