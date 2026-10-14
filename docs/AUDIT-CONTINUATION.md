# Repository audit continuation

All 577 canonical application modules and the first-party SQL, tools, tests, HTML, styles and documentation now have review records. The ledger separates line-level first-party review, 354 byte-verified generated outputs, structured/binary evidence, and 12 third-party bundles. The third-party bundles received version, licensing, integration and selected advisory checks; their approximately 4 MB of upstream implementation has **not** received a manual line-by-line review. No claim of literal every-line review of those dependencies is made.

The user authorized repairs during review and one combined publication after completion. Production rollout status is recorded below; local passing tests alone do not establish deployment. Earlier automatic approval review rejected a push, but the checkpoint did not preserve its reason. Personal Context remains unavailable; no alternate route has been used to bypass that rejection.

## Confirmed findings and repairs

- Navigation previously rebuilt hidden journal views and repeatedly scanned unrelated DOM. Scope work to active panels and changed nodes; preserve prepared panel identity, numeric caret behavior and existing layouts. Earlier all-target navigation checks passed; rerun them after remaining changes.
- Device storage enumerations repeatedly scanned the whole physical store for each key/property descriptor. Reuse a key snapshot only during one synchronous pass; invalidate on storage writes, account/key changes and the next microtask. The 100-key regression verifies one physical scan rather than repeated scans.
- An obsolete sample-revenue chart controller had no remaining canvas, but its 208,522-byte Chart.js dependency still loaded at startup and was included in offline preparation. Remove the controller, its sole navigation call and current loading/cache-list entries. Retain the vendor file/license for older cached releases.
- Newly paged audit, task, schedule, voucher and budget-template reads did not have complete offline snapshots. Add dataset-level snapshots, with distinct keys for differently filtered/projection queries and account/workspace isolation. Never cache an incomplete or malformed page set as a complete dataset. The offline-reopen test initially reproduced a startup stall at audit loading; after the fix, both administrator and staff reopen successfully offline.
- Latest saved year-end carry-forward also used an uncached limited query. Cache its complete result and invalidate displayed state when the database client changes.
- Delayed staff-save notices and password-status responses could mutate storage after an account switch. Capture actor/client and discard stale completions; preserve original pending entries for idempotent retry.
- Journal/payroll year-window responses could apply stale missing-function flags, data or checkpoints after client replacement/reset. Validate client, account and generation before accepting success or error results; scope missing-function state and checkpoints to the client. Period-selection completion must not restore a previous account's state.
- Document undo compared nested objects incorrectly; use a deep content comparison that ignores caret-only changes. Document table structural edits used physical cell indices, corrupting merged cells. Use logical grid positions, preserve spanning cells and row groups, and bound row spans to existing rows.
- Fresh installations reused fixed installation/reset-generation identifiers. Generate distinct UUIDs per installation. Remove the duplicate PostgREST pre-request setting.
- The fresh installer lacked current year-window, task, reconciliation, returned-submission, report-posting and account-purpose functionality. Assemble reviewed forward scripts into the original guarded installation transaction using `tools/portability/refresh-fresh14370.py`; refresh checksums and verification contracts. Maintenance is now included in file 001; file 004 remains for older installations.
- Release packaging hardcoded an old release label and omitted file 004 from its instructions. Derive the version from the application, derive numbered files from the manifest, and verify installer checksums before packaging.
- A read-only production query found **no nonfinite amounts among the existing journal and staff-journal lines**, but the existing positive-amount constraints allow PostgreSQL numeric NaN. Prepared finite-value constraints validate existing rows and abort if invalid data exists; they never rewrite historical rows.
- Prepared posting cleanup removes duplicate identical validation calls, avoids truncating long sequence IDs, returns the adjustment entry directly instead of scanning all journal IDs, and makes year-close numbering use the shared sequence. Authorization, transaction locks and ledger validation remain.
- Read-only production query plans previously showed repeated row-independent permission checks: approximately 2.736 seconds for a 500-row journal window. A guarded migration prepares statement-scoped permission subqueries while retaining correlated row predicates and all grants/access rules. It checks exact existing policy definitions and locks the affected tables before replacement. Production before/after authorization fingerprints and timings remain required.

## Verification completed in this continuation

- Owner/client regression suite: 33 passing groups, including delayed saves, password cache, year windows, reset generations and storage enumeration.
- Merged-table browser test: add/delete rows and columns, merged cells, zero row spans, row-group boundaries and oversized spans pass.
- Complete-page cache tests: 502 rows across pages, failed second page, malformed response, retained prior complete copy, offline zero-request read and ownership checks pass.
- Desktop real-SDK vault suite: administrator/staff online preparation and offline reopen, ciphertext/tamper checks, 24-hour inactivity, offline password unlock, explicit-only sync, two-account isolation, cross-tab sign-out and revocation checks pass. The inactivity fixture was updated to advance the clock as well as stored timestamps, since current activity is also held in memory.
- Fresh backend: 31 isolated PostgreSQL checks pass with PGlite 0.5.10 and pgcrypto. They include all routine-body compilation, empty installation, first administrator, idempotent posting, current report/returned workflows, permission restrictions, backup/purge guards and independent installation UUIDs. Auth/Storage platform tables are test doubles; these do not certify hosted email/Edge behavior.
- Prepared forward SQL chain, including posting cleanup and policy changes, installed and all routine bodies compiled in isolated PostgreSQL. No production SQL mutation was used.
- Five backend packaging guard tests pass. Generated asset identity check passes after rebuild. Service-worker isolation and hidden-journal navigation regression pass.
- Real trusted Journal-to-Blank clicks: at 4× CPU throttling, baseline median paint-opportunity estimate was 276 ms online; current after hidden-panel status filtering was 220 ms online and 218 ms offline, with zero database requests. Handler median was 73 ms online. Two animation frames estimate paint opportunity, not physical display latency. A broader baseline navigation run timed out and is not a passing benchmark.

## Release completion gates

First-party review, async-state repairs, fresh installer contracts, cache URL alignment and isolated financial boundary checks are complete. Production visibility comparisons and migration/Edge rollout have completed. Website publication and deployment verification are the final steps. Dependency review is explicitly limited as described above.

## Latest continuation repairs

- Skip inactive-panel status geometry during notification scanning.
- Task starter initialization now retries after transient failure with a bounded cooldown; reconnect can retry immediately. Old database-client completions cannot reload current tasks.
- Replacing a phone dialog settles its old promise and ignores the old queued close event. Layout is unchanged.
- Voucher correction history now pages complete results, retains complete offline snapshots and rejects stale account/client completion. Template-based HTML inspection does not load embedded resources. The 502-version browser regression passes.
- Maintenance JSON/full-backup exports now await delivery and handle rejection; spreadsheet export checks the database client and always schedules object-URL cleanup.

- Broader navigation preservation initially failed: settings/form changes scheduled hidden workspace builds, causing 10–11 workforce renders during unrelated navigation. Form changes now invalidate signatures without scheduling whole-screen preparation. Full preservation test now passes online/offline, including journal/company drafts, payroll/sub-user reload recovery, fresh employee data, table styling and staff permissions.
- Retired `entry-submissions` form was still callable and performed delete-then-insert staff saves. Current staff triggers require assigned fund and stable identity absent from that form, so an insert could fail after deleting rows. Removed both non-atomic save implementations; the compatibility function preserves the draft and directs users to current workspace Journal. It returns false so legacy submission cannot proceed. Current atomic staffSave14228 remains unchanged. Regression verifies zero writes and retained draft.
- Archive paid-at timestamp conversion now preserves its date; impossible dates remain blank. Adjustment counts and payroll currency groups are indexed once instead of rescanning all rows per group.
- Personal history memory is partitioned by database client; adjustment history has complete offline snapshots and rejects malformed pages. Review-launch failures are caught and unavailable correction owners handled.
- Phone connected-shell cached draft nested objects are checked before use. No phone layout changes.
- Payroll inline handlers encode full JavaScript argument strings; delayed link/recovery-save completions recheck client before applying state.
- Browser settings imports discard prototype keys, bound file size, check actor/client and persist before replacing live settings. Exports await delivery before reporting success. Installation loads and saves partition by database client.

The subsequent continuation below resolves allocation-template paging, settings import persistence/prototype handling, installation replacement, phone draft recovery and asynchronous payroll editing. Production publication status is tracked separately.

## Further continuation

- Prepared-screen signatures and retained payroll DOM now include database-client identity. Personal-journal mount and memory caches also reject a replaced client.
- Payroll posting preserves journal and payroll edits made while its request is pending; saved journal-link metadata updates without replacing newer draft fields. Regression reproduces delayed posting and confirms both retained edits and the saved link.
- Allocation saves retain a newly opened budget request instead of repainting a hidden allocation with that request's data. Nonfinite aggregate funding totals are rejected. Template paging and confirmation-change checks pass with 502 records.
- Phone draft recovery tests reject malformed nested cached objects and retain valid staff/journal drafts.
- Root/setup/portability documentation no longer presents old release instructions or automatic desktop scaling as current. Historical README contents remain in docs/history. The visible legacy Settings audit now identifies itself as an integration reference, removes unrelated reference-PDF claims and stale installation assertions, and links to current setup guidance.
- Voucher linking now guards repeated lookup clicks, catches rejected lookups and cancels before mutation when its dialog was dismissed or replaced. Completion cannot close a replacement dialog.

Current focused suites: owner/client guards (39 passing groups), audit draft recovery/allocation (4 passing groups), and hidden-status/journal navigation pass. Full release verification and publication remain pending; these are local results, not a deployment claim.

## Deployed Edge compatibility review

Read the three deployed handler sources and schema metadata without reading recovery contents. Production has only the original recovery_vault113/recovery_sessions113/recovery_audit113 tables; the repository replacement assumed the newer format/tables. Preserved the original deployed source privately for comparison/rollback. Updated the recovery handler to retain original ciphertext format, AAD, key and export compatibility, use the verified shared ticket/rate-limit tables, and stop if both vault formats contain records. Added an explicit pending-password-reset check to shared administrator authorization. Thirteen isolated handler tests pass, including original-format unlock/export/save/restore, no vault rewrite on unlock, inactive/pending-reset denial and two-vault refusal. The EDGE-SERVICES v143.20 prerequisite is not installed in production yet and must precede these handler deployments. No live vault values, encryption keys, passwords or user records were read or changed.

Personal Context was unavailable when attempting to retrieve the earlier push-rejection reason. The checkpoint records the rejection but not its exact reason; no attempt to bypass it was made.

### Continued navigation and verification-file review

- A current real-click profile isolated repeated geometry reads for the ordinary “No known pending uploads” status. The feedback decorator now checks notification eligibility and explicit hidden ancestors before reading layout. The browser regression verifies that ordinary/hidden statuses do not measure layout and that a visible error still opens its notification. This removes avoidable layout work; it does not establish instantaneous physical display response.
- Historical database fixtures still contained machine-specific default PGlite paths and two unconditional paths. They now use `PGLITE_MODULE` or the installed package. Assigned-ledger, sub-account and year-window isolated PostgreSQL checks pass.
- Two browser fixtures wrote results/screenshots into obsolete workspace locations. The recovery fixture now uses its own temporary directory; the historical phone fixture uses this checkout's validation folder.
- Historical test assertions are reviewed as release-specific evidence. Old version numbers are not rewritten to make a current release appear to pass an old gate. The per-file ledger records reviewed files separately from executed tests.

### Final first-party checks and dependency repair

- Scoped draft-control restoration to active panels and modal roots, preserving control order and drafts. A local 100-iteration query microbenchmark fell from 76.7 ms to 30.7 ms; this is not end-to-end navigation timing.
- Standalone mutation SQL fixtures now require the isolated harness marker and roll back their own transaction. All 32 fresh-backend checks pass, including failure without the marker and long sequence/nonfinite boundaries.
- Historical browser checks now fail on uncaught errors and logged report-navigation failures. Cleanup precedes the phone fixture assertion; the spreadsheet fixture creates its output directory. These are test repairs, not claims that all historical version-specific assertions pass today.
- Replaced jsPDF 2.5.2 with upstream 4.2.1, preserved its complete copyright/license header and versioned the lazy-loading URL. The application only embeds browser-generated PNGs and returns a blob. Actual portrait and landscape exports parse and render with the shipped PDF.js, retain their dimensions and contain visible content. This lazy dependency is unrelated to blank navigation latency. Upstream reference: https://github.com/parallax/jsPDF/releases/tag/v4.2.1
- Corrected the stale desktop document title to v143.70. Fixed the portable package to include the exact SQL resources its offline installer requests.
- Parsed retained JSON evidence and all OOXML parts; checked ZIP CRC, macro/external-link absence in the workbook fixtures; decoded all 34 images and inspected their contact sheet. Historical document-editor14298 and voucher-drafts14304 reports contain failures from obsolete login/data fixtures and superseded layouts; they are retained as failed evidence, not acceptance results.
- Current reruns pass: 39 ownership/client-state groups, 13 Edge cases (including legacy vault compatibility), 32 isolated database checks, 5 packaging guards, service-worker release isolation, hidden-journal navigation and full online/offline draft preservation.
- Final local trusted blank clicks at 4× CPU: median handler 70.5 ms online / 63.2 ms offline; two-frame paint opportunity 227.4 ms / 214.5 ms; zero database requests. Baseline online paint opportunity was 275.7 ms in the earlier comparison. The estimate varies between runs and is not physical display latency or proof of instantaneous navigation.
- Read-only production visibility fingerprints captured for all five profiles and an unknown identity. Each staff profile retains its own account subset and no general-ledger rows; administrator retains the complete authorized ledger; unknown identity sees zero. No bookkeeping values were retrieved for this comparison.

### Production backend rollout

Applied `accounting_audit14370_posting_rls_edge_prerequisites` successfully as one transaction: posting corrections, finite-value constraints, statement-scoped permission calls and Edge prerequisites. Saved pre-change routine definitions and policy metadata for review. The before/after visibility fingerprints are identical for every existing profile and the unknown identity; aggregate ledger row counts remain unchanged.

The comparable 500-row journal/account join plan now executes in 11.798 ms with 4,059 shared-buffer hits, versus the previously captured 2,735.888 ms and 26,611 hits. This is a server query-plan observation, not a promise of that speed on every request or the cause of the blank-route delay. The original full query text was not retained, so the plan comparison is qualified as comparable rather than an exact replay.

Deployed active handler versions: admin-create-user 4, admin-password14257 3, recovery-vault113 4. Configuration matches the repository: gateway verify_jwt=false; handlers validate the token with Auth and enforce active administrator, password-reset and workspace checks. The legacy recovery ciphertext/key/AAD remain compatible; no recovery contents were read or rewritten. Allowed origins also tolerate the legacy trailing-slash setting. Positive authenticated account creation/password/recovery operations were not exercised against production because they would change live user records or require private credentials; isolated handler acceptance covers those behaviors.

Live verification: all nine preflight, missing-authentication and disallowed-origin probes passed. Both finite-value constraints are validated. Deployment requests completed without accessing recovery values or changing bookkeeping rows.

### Publication payload review

Automatic review rejected the first push because the broad commit contained potentially sensitive production audit artifacts and database metadata, and the destination had not been verified. The production evidence has now been preserved privately and removed from the unpublished release commit: raw query plans, policies, routine snapshots, account-identifier visibility fingerprints and Edge deployment metadata are not included in the public repository. Only the aggregate findings above remain. GitHub metadata independently confirmed the existing origin is the public OonJai-Marketplace/Accounting repository, its default branch is main and the connected account has administrator/push permission. This cleanup materially changes the publish payload; no alternative transport is used to bypass review.
