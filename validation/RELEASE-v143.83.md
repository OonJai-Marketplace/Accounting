# v143.83 — Foreign currency journals and reporting

User-authorized changes: separate foreign-currency income/expense mapping parents; built-in income and expense templates; saved LAK transaction and carrying rates; short desktop rate fields immediately left of Voucher ID in main and personal journals; voucher ID without the Handwritten suffix; LAK financial reporting with original currency detail; parent subtotals; bottom-only 100-line pagination, including single-page tables and history.

9030 now contains 9031 (THB), 9033 (USD) and 9035 (LAK), classified Revenue. New 9037 contains 9032 (THB), 9034 (USD) and 9036 (LAK), classified Expense. All remain technical mapping accounts excluded from operating results. The misconfigured 9031 currency was corrected to THB. Its existing LAK sample line moved to 9035 without changing the amount. Two sample journals were revised through audited closed-book correction sessions; both months remain closed. The stale overlapping sample correction was retained in audit history and cancelled before replacement. Synthetic reconciliations remain explicitly labelled synthetic.

The expense template compares transaction-date value with the entered carrying value and posts realized gain or loss to 5419. A suggested carrying rate is available only from complete recorded holdings. This release does not automatically revalue all foreign balances at period end. Old entries with no recorded exchange rate remain incomplete in LAK reports; no historical rates were invented.

Verification:
- `validation/test-foreign-currency14383.cjs`: passed draft rate persistence, both templates, realized gain/loss directions, mixed USD/THB fields, main and personal editor placement (1440/1024), staff save-item rates, LAK reports, system exclusions, parent totals, missing-rate handling, 100-line pagination and shared cells across page boundaries.
- `validation/test-account-ledger14381.cjs`: passed technical account ledger visibility and financial statement exclusion.
- `python validation/test-phase0-structure.py`: passed source/generated ownership and authorized runtime corrections.
- `python tools/refresh-release-manifest.py --check`: passed asset hashes.
- Database rollback-only edit verified persisted rate 670, carrying rate 650, and LAK debit/credit 65,000 for 100 THB. No test edit was committed.
- Database verification after account conversion: no unbalanced entry/currency groups; June and August remain closed.
- Supabase advisors reviewed: existing permission/search-path/auth configuration notices; this change preserves existing function grants and authorization checks and adds no public endpoint.
- Legacy `test-report-workflow14349.cjs` passes its first five checks but stops at an obsolete assertion that page banners must be absent. Current approved navigation intentionally has banners; navigation was not changed for that assertion.

Database install files: `setup/INSTALL-FOREIGN-CURRENCY-v143.83.sql`, `setup/COMPATIBILITY-FX-v143.83.sql`. The separately guarded sample-data conversion is `setup/REORGANIZE-FX-MAPPING-v143.83.sql`; it is restricted to the existing synthetic trial dataset and is not a general real-data migration.
