# Accounting repository review — v143.67

User scope: review the entire Version 1 repository, including old fixes and background work, preserve accounting behavior, and publish verified corrections. Baseline: `a91f3bf84d614e6eab6180f2fa6fbc195d438d48` (v143.66).

## Review status

The repository-wide inventory, source ownership checks, HTML load mapping and static line scan are complete. The shared rendering paths listed below received manual review, corrections and browser regressions. **A manual correctness review of every line in every historical migration, business workflow and third-party library is not complete. This release does not certify that the entire application is free of bugs.**

The distinction matters: identifying a file's role is not proof that every function in it is correct. Older suffixes do not make a module obsolete. Many older modules still own accounting behavior or supply a function subsequently wrapped by newer modules.

## Entire repository inventory

The baseline has 1,502 tracked files:

| Role | Files | Treatment |
| --- | ---: | --- |
| Canonical application source | 578 | Mapped to generated assets; scanned for observers, timers, navigation overrides, document-wide queries, layout reads and dynamic code |
| Generated assets | 354 | Regenerated from canonical source; full JavaScript syntax and byte-consistency checks |
| Database scripts | 77 | Catalogued as deployment/history dependencies; not deleted or applied to production |
| Tests and tools | 329 | Separated from runtime; relevant regression suites executed |
| Documentation | 106 | Retained as history and implementation instructions |
| Vendor files | 24 | Separated from application ownership; no unsupported vendor rewrite |
| Entrypoints/configuration/infrastructure | 20 | HTML asset wiring and cache versions checked |
| Other assets | 14 | Retained |

`python tools/audit-repository.py --output /tmp/repository-audit.json` reproduces the file-by-file inventory with hashes, line counts, generated outputs, direct HTML consumers and exact static review sites. Files not directly referenced by HTML are **not** automatically classified as unused: lazy loading, service workers, print/export pages and shared global interfaces also connect them.

No canonical JS/CSS source is omitted from the build manifest. No source is included twice in the static script/style lists of any HTML entry point. Desktop loads 90 script tags, mapping to 351 source modules plus deployment configuration and vendor scripts. This rules out one simple duplicate-loading explanation; it does not rule out overlapping execution inside distinct modules.

## Verified shared-work defects and corrections

| Source | Existing unnecessary work | Correction and preservation |
| --- | --- | --- |
| `src/subusers/review/review-mobile-v78.js` | Every body mutation triggered reading/sorting every table, including hidden retained pages | Track affected tables; preserve grouped transaction lines, dynamically changed dates, oldest-first print ordering and screen-order restoration |
| `src/shared/ui/account-picker1428.js` | Unrelated sidebar/status/table changes triggered enhancement of every select and repeated account resolution | Enhance affected controls/subtrees; preserve native values/events, current choices, disabled/hidden state, unfinished searches and explicit full refresh |
| `src/shared/presentation/layout-consistency-v87.js` | Repeatedly traversed existing Chart of Accounts/Sub-Accounts rows to add the same action wrappers | Decorate changed rows/subtrees, including buttons inserted after a row exists |
| `src/accounts/chart/account-currency14257.js` | Repeatedly scanned all account tables, access grids and badges | Update affected rows/labels and the current page; retain canonical account identity and parent-account symbols |
| `src/core/auth/password-policy14257.js` | Any body change rescanned password controls across the document | Scan affected forms/new controls; retain live validation, submit interception, explicit rescan API and dynamically inserted submit-button validation |
| `src/bookkeeping/journal/transaction-consistency14300.js` | Rescanned every button to identify report actions after every body change | Decorate affected buttons/subtrees; retain history/date/navigation behavior |
| `src/shared/presentation/final-v117.js` | Repeated document-wide dialog/button decoration and select-option measurements | Process affected subtrees and the selected page; retain modal close controls, native select sizing, menu behavior and costing actions |
| `src/subusers/workspace/workspace-consistency14343.js` | Synchronous layout during both the page event and outer navigation wrapper, plus reactions to unchanged body classes and hidden-page mutations | Keep outer navigation layout; coalesce event follow-up, ignore unchanged class notifications and hidden-page content changes; preserve sticky navigation, menus and phone behavior |

Changed-root batches remove nested duplicates by walking ancestor sets, avoiding pairwise subtree comparisons when large tables are inserted. No accounting features, records, journals, payroll calculations, permissions, pending-save queues or recovery copies were removed.

## Evidence and limits

The user's October 13 diagnostic contains 24 navigation attempts with approximately 0.9–2.4 seconds to its visible-page proxy. It records long tasks and work continuing after navigation. It is older than this release and proves the delay existed, not that this release fixes that device. The October 14 recording also shows delayed Blank navigation.

A separate local sequential comparison used the same synthetic 137-account / 1,000-journal-line dataset, ten trusted sidebar clicks (Blank, Journal, Accounts, Settings, Dashboard twice) and CPU profiling:

| Metric | v143.66 baseline | Corrected |
| --- | ---: | ---: |
| Median pointer-to-double-animation-frame proxy | 924 ms | 639 ms |
| Aggregate browser CPU over observation windows | 14,390 ms | 9,025 ms |
| Blank proxy, first / second visit | 1,021 / 785 ms | 781 / 564 ms |

These are approximately 31% less median proxy time and 37% less CPU in this comparison. They are not field INP measurements or guaranteed laptop timings. Profiling adds overhead. Several corrected navigations remain slow; this is **not** an “instant navigation achieved” result. Raw comparison data is in `validation/navigation-review14367.json`; reproduce with `validation/profile-navigation14367.cjs`, `PHASE0_ROOT` and `RESULT`.

## Validation

- All 57 permitted accounting navigation targets: reached the expected page, no page errors. The sub-user workspace test opens a user first; its deliberate fallback to Home without a selected user is preserved.
- Dynamic picker insertion/options, disabled/hidden state and native selection; bounded lookup work, live account-label/currency changes and unfinished input preserved.
- Hidden tables untouched by unrelated navigation, updated date text/new rows sorted, linked lines preserved, print order restored.
- Dynamic password fields and later-added submit buttons, report action decoration, later-added account actions and dialog close controls.
- Desktop 1440px and tablet-size 1024px layout, History/Audit controls, active session/inactivity behavior and standalone phone activity.
- Prepared screens, retained journal/payroll DOM, changed journal data, System parent accounts and Mapping help.
- Actual Blank/Journal clicks, no duplicate records, existing journal retained, normal Bookkeeping restored.
- Canonical build, generated JS syntax, structural gate and HTML references.

## Remaining review work

The profile still attributes substantial work to workspace layout visibility checks, interface-v69 polish, numeric presentation, retained panel border decoration, history initialization and other broad visual observers. Those connections are recorded; they are not assumed safe to remove. Further consolidation requires preserving each module's invalidation rules, editing behavior, modal/print paths and cross-module changes.

The 77 database scripts and every business save/approval/recovery path have not received a new exhaustive semantic audit in this release. Local synthetic routing checks cannot establish correctness of every production data path. No production database migration or data mutation was performed.

No feature is currently justified for removal solely to make navigation faster. The verified excess is repeated presentation work; removing accounting capabilities would not directly address it.
