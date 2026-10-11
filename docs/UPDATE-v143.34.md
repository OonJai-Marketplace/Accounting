# v143.34 — Protected offline sign-in and fixed inactivity logout

## Available in the website

- Sign in online once with an active account to prepare this device. Subsequent offline sign-in uses the same email and the password last verified on that device, including after explicit logout or the inactivity deadline. A first-time account/device still requires an online sign-in.
- After 24 hours without user activity or a return visit, the device session locks. An open tab checks the deadline periodically; a closed or suspended tab checks before restoring any protected storage. Background refresh and synchronization do not extend the deadline. Returning within the deadline counts as activity. Signing out locks the other active tabs for the same account.
- Offline snapshots, journal/staff queues, payroll/document outboxes, document drafts, reconciliation reports, hosted audit working copies and application Web Storage are encrypted per account. AES-256-GCM uses fresh random nonces and binds each record to its database/account/storage key. A PBKDF2-SHA-256 key (600,000 iterations and a random salt) wraps the random data key; passwords are not saved. The cipher implementation is the vendored `@noble/ciphers` 2.4.0 AES-GCM implementation with its MIT license.
- An unlocked tab retains its data key in session storage for reloads. Logout removes that key and the visible workspace; cached records and unconfirmed saves remain encrypted. Closing a tab may require password sign-in again, depending on browser session restoration. Other accounts' legacy caches migrate when those accounts next sign in; they are never reassigned to the first user. The independent, standalone audit file tool and user-requested exports are separate from the signed-in application's protected cache.
- Offline activity uses the previously verified account permissions. Reconnecting refreshes authorization before queued operations can reach the server. A confirmed authorization denial blocks subsequent offline unlocking until successful online verification. A network failure retains the downloaded workspace and the original save references.
- Password changes made while the device is unlocked rewrap its data key. If a password was reset elsewhere, sign in online with the new password and supply the previous device password when prompted to retain encrypted drafts. Forgotten old passwords cannot recover an encrypted cache; no reset silently deletes it.
- The active workspace loads first. Daily-work preparation continues in the background; the existing Connection & sync panel reports preparation. A record that has never downloaded is not available offline. Startup waits until security and cache hooks are installed, correcting a race exposed by cached-session testing.
- Payroll supports requested-year detail plus compact historical attendance/leave usage and a finalized-period index. Earlier Years in Salary History requests the older detail. Historical entitlement dates, fractions, linked-leave exclusions, employee links and finalized-period edit checks remain accounted for.

## Database installation still required

The available connection can update GitHub, but cannot execute SQL in the production Supabase project. Neither migration below has been installed there by this update:

1. `setup/INSTALL-OFFLINE-YEAR-WINDOW-v143.33.sql`
2. `setup/INSTALL-PAYROLL-YEAR-WINDOW-v143.34.sql`

Run each once in that project's SQL Editor. Both are repeatable, read-only functions using the caller's existing row-level permissions. They do not alter accounting or payroll rows. Without them the website retains full-history loading to preserve correct balances and leave calculations, and reports the pending setup in Data Check.

This release improves active-workspace/background data loading. It does not claim that every legacy packed module has been split into separately downloaded route files.

## Security limits

Encryption protects stored records after lock/logout; it does not make a compromised device, an unlocked browser, malicious same-origin script, or a weak password safe. A disconnected device cannot discover a server-side revocation until reconnecting. Browser-data deletion, storage eviction and device loss can still remove unsynced work. Existing exports/backups remain necessary.

## Validation

Controlled browser fixtures use the real Supabase SDK, service workers, localStorage and IndexedDB. Checks cover administrator/staff sign-in and expired-token offline reopen on desktop/tablet/phone, the standalone phone fallback, inactivity logout, wrong-password rejection, offline login after logout, encrypted storage/tamper detection, cross-tab logout, automatic reconnect upload and server revocation. Separate durable-save tests cover restart, account isolation, a lost response without a duplicate write, conflicts, storage failure, and pending journal totals.

Temporary PostgreSQL tests cover both migrations, repeated installation, RLS isolation, exact historic leave fractions, linked-leave exclusion, expanding periods without duplicated leave, finalized-period metadata, journal opening balances and denied unauthenticated calls. No production financial records were modified during testing.
