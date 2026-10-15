# Phase 1 journal reliability — Accounting Version 1

Reviewed on 15 October 2026 against `OonJai-Marketplace/Accounting`, branch `main`, starting at `f00f49d`. Accounting Version 2 is retired and is not a source or deployment target for this work.

## What changed

The normal direct journal posting path now commits its complete request to the existing encrypted device IndexedDB before clearing the submitted draft or contacting Supabase. A failed device write leaves the editor intact. Further typing during that write is also retained. Pending journal entries can be edited or voided using the existing controls and reason dialogs.

The original posting request stays immutable. Each subsequent edit or void has its own immutable reference and expected previous content. Synchronization posts the original request, then applies its changes in order. Database receipts make retries return the already recorded result when a response was lost. Repeated attempts do not create another posting or audit change. The database compares the expected content under a row lock, rejecting a stale change instead of overwriting another session's work. Permissions and original/destination period checks still apply.

The visible entry number comes from the existing server sequence. Offline entries display “Awaiting entry number”; their internal synchronization references are separate. Edits keep the original number, and voids do not reset numbering. This preserves sequence-based numbering; it does not promise a gapless sequence after every possible database rollback.

Transaction exchange rates and existing book rates travel with the complete lines through the queue, edits, encrypted recovery, synchronization and database audit history. The old manual-post and payroll payload builders also retain these fields. Historical missing rates are not guessed or backfilled.

Status distinguishes a successful device save from database confirmation, a rejected request, and a conflict. Manual retry works after an interrupted response without requiring an online/offline toggle. Confirmed snapshots contain server rows, preventing temporary local overlays from erasing rows in the offline cache. Queue retirement requires observation of the confirmed final state in a complete fresh journal window.

The queue is scoped to the signed-in account and database. Atomic device updates and per-account browser locks protect concurrent operations. An account change while a request is in flight prevents its response from being applied to the new account's workspace. Original references are preserved when importing supported earlier pending requests.

## Verification performed

| Check | Result |
|---|---|
| Save offline before any network request; clear only the committed draft | Passed in Chromium |
| Edit and void a pending entry locally | Passed |
| Server commits but posting/edit/void response is interrupted | Same reference retried; one posting/change |
| Storage failure, repeated submit clicks, edit during an in-flight posting | Draft retained; no duplicate; edit preserved |
| Multiple posting dates with different line rates | Rates preserved; sequential server-issued numbers |
| Another session changes an entry before synchronization | Conflict retained; server content not overwritten |
| Encrypted recovery export/import | Complete changes and rates restored; import itself did not post |
| Reopen the downloaded application with browser network disabled | Pending queue recovered |
| Different account/database and account switching during delayed response | Queue isolation and original-account recovery passed |
| Real PostgreSQL edit/void retries and receipt replay | One audit action per change; posting replay did not allocate a number |
| Real PostgreSQL transaction/book rates and base amounts | Values and old/new audit snapshots preserved |
| Closed destination period, non-admin void, stale content, reused reference with different payload | Rejected |
| New function permissions | Anonymous execution denied; authenticated execution with internal authorization checks |
| Existing desktop/tablet journal layout checks | Passed at 1440px and 1024px |

Browser regression: `validation/test-journal-durable14385.cjs`. Its final fixture produced six posted entries from seven posting calls, with three applied changes despite nine mutation calls. The extra mutation attempts cover response loss and rejected conflicts.

Database regression: `validation/test-journal-changes14385.sql`. Every fixture was inside a transaction that was rolled back. The test asserted that the live journal-number sequence was unchanged. It did not leave bookkeeping records behind.

Release gates: generated source/asset consistency and JavaScript syntax checks, the Phase 0 structural gate, release hash consistency, and `git diff --check`. The structural correction manifest records the explicitly authorized Phase 1 changes; the original extraction baseline remains intact.

## How this affects accuracy

This protects the values that were entered from loss, duplicate application and silent replacement during synchronization. A balanced entry or a preserved rate can still be factually wrong if the user entered the wrong account, amount, date or rate. Those facts still need accounting review.

Pending device work can affect the local view before the shared database confirms it. Pending status and the existing device-copy print notice therefore matter: do not treat that view as a fully synchronized shared ledger. A conflicting or blocked operation remains available in Data Checking and recovery export for review; retry does not forcibly overwrite the server.

## Limits and deferred work

- Device durability depends on retaining the browser profile and storage. Clearing browser data or losing the device can remove unsynchronized work; an exported encrypted recovery copy provides a separate recovery path.
- Offline reopening requires the application and relevant workspace data to have been downloaded during a prior authorized session. A first-ever offline sign-in is not provided.
- Verification used Chromium and desktop/tablet viewport tests, not a physical iPad/Safari device or a production-scale concurrency soak test.
- The new ordered outbox covers normal direct manual journal entries and their open-period edits/voids. Existing payroll-link, submission-approval and reopened-book correction workflows retain their specialized handlers; this release does not certify those complete workflows as converted to the new outbox. The payroll payload rate omission was corrected.
- Conflicts require review; there is no automatic choice between competing accounting versions. Existing historical records and missing exchange rates are unchanged.
- Phase 2 account tracking, carrying-value logic and parent/report calculations were not redesigned or certified. Phase 3 calculator, transaction types, Rate column and action-menu redesign remain deferred.

## Backend and release

The additive migrations `20261015121608_journal_durable_changes14385.sql` and `20261015122604_journal_recovery_receipts14385.sql` were applied to the existing Accounting backend and verified. They add idempotent journal mutations and account-scoped recovery receipts without rewriting historical journals. Other installations must already have the v143.83 FX schema/routines before applying them; fresh-install instructions identify this dependency.

The intended release is v143.85 at the existing Version 1 GitHub Pages site: https://oonjai-marketplace.github.io/Accounting/. The deployment commit and live verification are reported in the accompanying completion message.
