# Accounting review — 21 October 2026

Reviewed baseline: `59e3bb8272e94a6bed63bb9b93e0544d9c572584` (143.158).

## Confirmed defects corrected

1. The independent phone runtime announced 143.100 while its worker announced 143.130. The runtime rejected the worker readiness message, leaving offline readiness false. The runtime, worker, and runtime URL now agree at 143.159.
2. Phone tools requested the runtime version but the worker only recognized a different tools URL. The tools could load online without being retained by the worker for later offline use. Their cache keys now agree. A real local-browser test opens Settings online, reloads offline, and loads the tools again from cache.
3. Phone HTML requested a stylesheet version absent from its worker cache. Desktop HTML likewise requested older layout and settings-navigation versions absent from its worker cache. HTML references now match the existing cached versions. No stylesheet rules were changed.

The existing cache regression test now checks every script/style URL in desktop and phone HTML, the lazy-tools cache key, the readiness handshake, authenticated offline reload, and admin tools after offline reload.

## Preservation review

The current repository instructions take precedence over older conversation summaries. In particular, selected cells retain the requested single 1px blue outline; voiding remains database-confirmed; journal IDs follow the latest trailing-ID rule.

| Requested behavior | Evidence and outcome |
| --- | --- |
| Bookkeeping: Journal, Upcoming, History; remembered selection/expansion | Current grouped-navigation definitions and sidebar-selection browser test; retained |
| Journal siblings: Submitted, Funds, Reconcile, Data Check, Closing, Budget, Voucher, AI Journal | Current grouped-navigation definitions; retained, AI Journal remains after Voucher |
| Accounting, Vouchers, Currency Manager settings sections | Current settings controller retains all sections; only Google Sheets has its own banner treatment |
| Manual opening balances through Journal; report-only year close | Opening-balance and mapping/close tests pass; no automatic annual opening restored |
| Official database IDs and retained audit protections | Database-only ID and audit-retention checks pass |
| Amount editing, shortcuts, multi-date behavior | Current entry interaction and date/shortcut tests pass; no input-selection changes made |
| Payroll Entries and History calculation details | Formula and browser drill-down tests pass; finalized calculation snapshots retained |
| Attendance counts/deductions, full-month fit and employee highlighting | Current payroll/attendance tests pass |
| Shared employee order and multi-employee leave | Targeted tests pass |
| Report filters, visible search, all-month General Ledger and statutory totals | Targeted model/browser tests pass |
| Image rotation, deletion and layout controls | Image-editor browser test passes |
| AI draft IDs, currency display, immediate posting transition and notification isolation | Current targeted tests pass |
| Offline drafts, login/logout, session expiry and two-minute phone idle refresh | Browser lifecycle tests pass after the phone fix |

No accidental removal was identified among these checked requirements. This is not a claim that every possible state or every historical instruction was exhaustively verified.

## Coverage and limitations

- Inventory covered 1,744 tracked/non-ignored files, including 594 canonical source modules and 360 generated assets. All source modules were mapped; no duplicate source inclusions were found in HTML entry points. Generated code parsed successfully and matched its sources.
- Navigation exercised 57 permitted workspace targets online and offline without uncaught JavaScript errors or financial-posting requests.
- 58 distinct automated suites passed across the broad and recent-feature runs, including reruns after fixing the phone cache. Browser tests used synthetic accounts; SQL tests used isolated PGlite databases. No live financial records were created, edited, posted, voided, reset, or deleted.
- Historical tests were not treated as authoritative when they contradicted later approved behavior. Examples: chart/report pagination, 2px cell borders, offline voiding, automatic annual opening balances, removed System badges, rebuilding different Journal/History tab sets, and the retired local-only payroll-settings save wrapper. Old isolated fixtures also omit newer notification and employee-order dependencies. Their failed assertions were not reported as passing or used to revert approved features.
- The old 143.100 update-transition test could not complete because its single-process Chromium configuration crashed; it also hardcodes the 143.100 release. The current update downloader was not certified by that historical test. Current cache URL integrity and offline/lifecycle behavior were verified separately.
- The source/generated copies and layered compatibility modules are intentional build inputs and outputs. They are not safe deletion candidates solely because names or content overlap. No speculative deletion or broad refactoring was performed. Obsolete report pagination was already removed in 143.158.

## Read-only backend review

The seven deployed Edge Functions were listed as ACTIVE. This is deployment metadata, not an end-to-end Google authorization test.

Security advisors still report configuration/hardening items: three functions without a fixed search path, the pg_net extension in public, an unsupported regprocedure column, and disabled leaked-password protection. Exposed SECURITY DEFINER functions also require ongoing authorization review. The two anonymously callable functions inspected are request/password gates; inspection did not establish an anonymous data disclosure. Server-only OAuth tables intentionally deny browser access rather than exposing credential policies.

These advisor results were not silently changed during this frontend review. See [database advisor explanations](https://supabase.com/docs/guides/database/database-linter) and [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). This review is not a comprehensive security certification.

## Passing suites

`account-ledger14381`, `ai-background143150`, `ai-currency143150`, `ai-ids143148`, `all-workspaces`, `app-integrity143100`, `archive-limits14373`, `assigned-ledger14281`, `attendance-highlight143154`, `audit-drafts14370`, `audit-reconciliation14382`, `audit-retention143124`, `audit-ui14370`, `balance-explanation143154`, `budget-lifecycle14316`, `civil-date143100`, `cleanup143149`, `confirmation143100`, `database-only143122`, `document-images143151`, `document-table14370`, `drive-post-transition143152`, `edge-services14320`, `employee-order143154`, `encrypted-download14372`, `entry-dates-shortcuts143126`, `entry-interactions143127`, `fresh-backend14322`, `hr-calendar-model14306`, `journal-opening143112`, `leave-multiple143154`, `mapping-close14397`, `news-local14396`, `notification-cleanup143149`, `payroll-details-ui143157`, `payroll-explanations143157`, `pdf-export14370`, `phase0-browser`, `phase0-inactivity`, `phase0-navigation-preservation`, `phase0-preload`, `phase0-session-browser`, `phone-cache14368`, `phone-idle-sync`, `report-filter-ui143153`, `report-filters143153`, `report-ui143154`, `return-current14399`, `sidebar-selection143111`, `statutory-balances143154`, `subaccounts14287-repair`, `sync-cache`, `sync-coordinator`, `sync-mixed-recovery`, `sync-recovery`, `word-images14372`, `workforce-reports143100`, `year-windows14334`.
