# Report loading and journal history — v143.195

Posted entries appear in Journal History regardless of whether their month is open. History remains read-only; period locks are unchanged.

Reports preserve the selected filters per account and workspace, default to the latest recorded month, and fetch only selected periods through journal_window14333. Compact year-to-date opening totals preserve balances without downloading preceding detail. Comparative balance sheets request their displayed periods. All months remains an explicit choice. Report snapshots do not replace the editable journal. Refresh invalidates the report cache; source-entry links fetch only the selected complete entry. Hidden workspaces are no longer prepared in the background.

A fresh complete company journal now retires previously confirmed device copies even when a later database edit or removal changes their contents. Recovery receipts remain stored. A pre-download checkpoint preserves newly confirmed in-flight saves, unsynced changes, and records outside the downloaded period.

Validation: exact-period/cache/account-isolation tests; bounded/full-ledger equivalence for ledger, trial balance, income, expense, cash flow and comparative balance sheets; multi-year regression; obsolete-copy retirement tests; real-browser History, navigation, source-entry and Refresh checks; durable offline posting, edit/void, lost-response, conflict and recovery regression; build and release-manifest gates.

The older test-history14362.cjs audit-toolbar assertion also fails on untouched v143.194 (expected one visible historical toolbar, found zero). It is unchanged here. The new browser regression directly verifies open-month posted Journal History.

The live September journal has 228 lines, compared with 1,710 across January–September. No financial amounts or period statuses were changed by this release.
