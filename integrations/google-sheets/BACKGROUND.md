# Background AI Journal connection (143.150)

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

The database cron job checks every minute while a connection exists. It replaces
one metadata cache row per sheet and excludes posted receipt IDs. It never posts
journal entries. Browser reads enforce Accounting workspace and journal posting
permissions. Requests to Google are restricted to the configured workbook and the
journal's Drafts, Accounts, and Posted Archive operations. Existing source-change,
archive-verification, and idempotent posting checks remain in the client/database.

Verification: fixture tests `test-ai-background143150.cjs`,
`test-ai-currency143150.cjs`, `test-gpt-workspace143129.cjs`, and
`test-cleanup143149.cjs`; live database privilege checks and unauthenticated endpoint
rejection checks. A full Google consent/refresh check requires the company owner.
