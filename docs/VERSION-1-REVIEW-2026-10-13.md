# Accounting Version 1 review — 13 October 2026

Target: `OonJai-Marketplace/Accounting`, `phase-0-modularization`, starting at `57f55cb`.
No production deployment, database mutation, or migration is included.

## Findings and corrections

1. **High: overlapping journal refreshes could replace a newer journal with an older response.** Reproduced in the actual browser application with a delayed first read and a faster second read. Before correction the final screen/model and saved snapshot contained the first response. Journal loading now serializes the full fetch, receipt reconciliation, snapshot write and display update. A rejected read does not block subsequent refreshes. Account/workspace checks reject results belonging to a departed session. The regression checks online state, offline restoration, failed-read recovery and account isolation.
2. **Confirmed posting was conflated with a subsequent display refresh.** After the server returns the report's posting receipt, the UI now immediately names the posted entry. If reloading the journal/review fails, it reports that the view needs Sync and explicitly tells the user not to post again. It retains the server's successful result. Tested with a successful posting receipt followed by a failed journal read. Follow-up: a fulfilled refresh can also restore an older offline snapshot, so the UI now checks for the exact confirmed database entry ID before reporting a refreshed journal. If it is absent, the message keeps the successful posting receipt and directs the user to Sync without reposting.
3. **Chart of Accounts still made a navigation-time database request.** Opening-balance availability is now prepared during login and reused on navigation. Explicit opening-balance actions and coordinated refresh still recheck the server. The final measured seven-module online/offline navigation sequence made zero REST requests.
4. **Repeated presentation work remained despite downloaded data.** The base navigation now removes active classes only from active nodes. Editor numeric enhancement ignores unrelated DOM additions. Action-color scans on navigation are restricted to the current workspace. Module-border checks survive tab changes and avoid redundant class/depth writes. Account scroll reset is deferred to a frame. Calendar calculations reuse the date formatter without freezing today's date or changing Lao timezone rules.
5. **Obsolete repository instructions could lead to the wrong build procedure.** Removed the retired full-desktop builder and its two unused input snapshots, plus fourteen superseded ZIP installation/patch instruction files. Git history retains them. Kept the v142.28 historical note referenced by retired SQL guards, the repository separation note, current setup/recovery tools, all database installers, and active compatibility modules. Version numbers in filenames do not establish that a file is unused: the manifest still wires 575 canonical source sections into 351 application assets.

## Review scope and verification

- Inventory covered JavaScript, CSS, HTML, SQL, source/build ownership, entry points, service-worker asset lists, validation scripts and historical instructions.
- All 57 permitted workspace targets opened online and offline with the local synthetic administrator fixture, with no uncaught browser errors or posting writes caused by navigation.
- Navigation preservation checks retained unsaved journal/company/payroll/sub-user edits, restored drafts after reload, kept updated employee data visible, and enforced the staff settings boundary.
- All 351 generated assets were rebuilt and JavaScript syntax checked. Structural checks retain the original baseline, explicitly record changed runtime hashes, and allow only the specifically retired builder HTML snapshot to disappear.
- Regression summary and measurement summaries are in `validation/version1-review-results.json`.

## Additional validation findings

- The old vault regression expected an immediate upload within 25 seconds of reconnecting. That expectation conflicts with the established two-minute-idle/manual-sync rule. The test now verifies that reconnecting while active does not upload, followed by one confirmed manual Sync. The idle timing and queued-save tests independently exercise automatic synchronization.
- The dedicated phone sleep/return session test failed with a destroyed browser execution context after the simulated return. The same failure was reproduced against the unmodified `57f55cb` starting branch. Its desktop clock/expiry checks passed. This existing phone resume test remains unresolved and is not counted as a pass; no authentication code was changed to hide it.

## Remaining preload gaps found by the full workspace sweep

The seven main navigation paths made zero REST requests after preparation. The broader 57-screen sweep still issued ten requests: accounting ID settings (1), voucher settings (1), year-end checkpoints (1), installation status (1), starter-checklist preparation (1), budget templates (1), budget/company settings (3), and refreshed to-do rows (1). The starter preparation RPC can create nonfinancial checklist records on first visit. The smoke test prohibits financial posting writes, not every possible RPC mutation. Therefore the stronger requirement that **every** screen opens exclusively from prepared memory is not yet satisfied. These are active feature paths, not unused files that can safely be deleted. They need preparation/caching changes and feature-specific regression checks; they are recorded rather than silently disabled.

## Performance limits and outstanding risks

The measured fixture uses 137 accounts, 1,000 journal lines, 10 employees, real browser sidebar clicks and four-times CPU throttling. It is not the user's Chromebook or production data. Each measured pass contains seven online and seven offline transitions; these small samples do not establish a reliable percentile or a universal speed improvement.

The remaining navigation cost is primarily presentation/layout work. Preloading data does not prevent JavaScript from rebuilding or rescanning views. Some transitions still take seconds under throttling, and the final online responsive median did not improve over the initial sample. Phase 0 must not be labelled delay-free or complete on this evidence. The journal race is a proven defect consistent with the user's symptom; production traces are still needed to establish whether it is the only cause of that particular report disappearing.

This review does not certify every accounting calculation, every live RLS policy, or every transaction against the production database. No live financial records were opened or changed. Existing deletion-aware incremental synchronization remains a separate backend limitation. Historical-year data and deliberate server-validated actions still require their existing explicit workflows.

These changes are for the working branch. The public GitHub Pages configuration still points to `main`; users of that live deployment will not receive these corrections until a separately authorized deployment.
