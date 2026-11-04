# Payroll and custom-template corrections — v143.274

Implemented:
- Remove unsolicited payroll header padlocks while retaining calculated-value protection.
- Use $, ₭, ฿ and € to the left of payroll amounts. The first Payroll Breakdown column shows OJM-code · surname. Existing editable report copies receive the presentation correction without recalculation or changes to saved source identities.
- Correct USD/THB salary mapping to 9231/9232 with 5311/9290 LAK counterparts. Employee withholding uses 9042/9041, never employer PIT expense 5211. Preserve original payroll salary and tax amounts. Missing foreign withholding accounts block preparation.
- Derive conversion rounding only from balanced saved payroll source values. Use explicit currency/LAK bridge rows and LAK rounding account 5420; do not invent settlement FX or hide missing/edited business rows. Nonzero foreign reimbursements still require separate mapping review.
- Default the editable journal date to payroll month-end; retain a chosen date and the saved payroll rates/source. Prepare transfers explicit row rates and leaves posting separate. Existing saved custom payroll journals are preserved; Use default journal requires confirmation.
- Reload browser templates after protected storage unlocks. Keep the previous local list before saving, verify writes, reject stale-tab overwrites, preserve deleted IDs/numbers and debit/credit sides, and show custom versus built-in counts. Corrupt storage is retained with an error.

Tested:
- test-payroll-journal274.cjs: protocol examples, local/USD/mixed/THB, PIT/SSO, rounding, missing/edited rows, rate/date guards, advance allocation and immutable inputs.
- test-payroll-prepare274.cjs: saved date, rates, source, main journal selection and finalized/uncertain-post guards.
- test-template-recovery274.cjs: locked-startup recovery, account isolation, stale edits, previous copy, permanent numbers/tombstones, sides and corrupt storage.
- Existing payroll report, protected-field, internal-notice and advance regressions.
- Browser editor screenshot PAYROLL274-QA.jpg uses synthetic amounts. Full codes/surnames, left currency symbols and no header padlocks verified. This is not physical iPad verification.

Publication: the accompanying commit/release identifies the exact shipped code. A local test alone does not certify deployment or the user's open tab.

Unresolved / retained review:
- Exact old custom templates cannot be certified recovered until the original signed-in browser opens its retained list. Custom templates remain local to that protected browser account; cross-device cloud sync is not implemented. The hosted legacy template tables were empty during review.
- October payroll remains a draft; nothing was finalized, paid or posted by this release. Accrual credit allocations do not separately settle earlier advances or loans. Settlement must use actual original/settlement/cash-book rates and reviewed source records.
- Read-only schedule review found the THB rent-release occurrence cancelled/voided, while its LAK expense occurrence remains posted. Do not repost or rewrite historical records without the targeted accounting review. Current AUTO posting uses a separate allocator and automatic posting remains disabled.
- The separately discussed USD prepaid rent has a user-confirmed service period. Its historical posting and proposed amortization still require reconciliation; do not assume it is the existing THB schedule. Keep actual source amounts and journal identities out of public code fixtures.
