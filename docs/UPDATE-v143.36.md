# v143.36 — restore sub-user navigation

Restores the compact, content-width Home / Journal / Summary tabs from the v143.16 recovery baseline by removing the later full-row stretching rule. Tablet widths now receive the existing personal workspace component styles instead of browser-default gray buttons. Navigation labels use a pointer and suppress text selection/carets; editable fields keep their normal behavior.

The General Ledger and Account Activity Account filters keep at least 320px and move as complete controls when space is limited. The Account table column is widened from 200px to at least 340px; DR/CR and the name stay on one line, with horizontal table scrolling retaining the other columns. Phone and printed report layouts are unchanged.

Validation: current SDK browser fixture checks Home, Journal, Summary, History and Report History at 1440, 1024 and 820px, navigation cursor/caret styling, Account field and column geometry, and runtime errors. Offline asset/version checks verify release preparation.

Reconciliation Print is placed in the top-right header action group beside Import Backup and Open General Ledger. Reconcile Account uses the existing rounded action style. The two print decorators share that destination, preventing repeated heading wrapping.

Report performance: build account lookup maps once per calculation, preserving first-match ID/code/name+currency resolution. Reuse ledger data only within one synchronous render; subsequent renders recalculate fresh state. A 12,001-line/501-account comparison matched the previous output byte for byte (963ms before, 22ms after in the local fixture). This measures ledger calculation, not end-to-end production speed. Current calendar-year journal loading plus earlier opening balances remains in place; older years load when explicitly requested.

The user's information-architecture question was answered: working reconciliation fits Bookkeeping; Reports fits completed summaries. This release corrects the existing screen and does not yet move the reconciliation workflow between modules.

No SQL is needed for these layout corrections. The preceding v143.35 editable starter to-do feature still requires setup/INSTALL-EDITABLE-TODOS-v143.35.sql to be run in Supabase, then an online refresh. Previous offline and payroll year-window SQL installation was confirmed by the user.
