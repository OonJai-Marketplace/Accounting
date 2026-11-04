# Monthly cash slips — v143.277

Bookkeeping → Documents replaces the Voucher navigation label and keeps existing voucher and receipt actions. Create Cash Slip opens a dedicated setup dialog for the month, first row number, initials legend, reviewer and role, then uses the existing document editor.

The A4 portrait form contains 40 blank writing rows with nine columns. Compact No/Date/Name/Source columns leave the description widest. Receiver and releaser have separate signature cells. Month/full year and the name legend sit at the bottom left, with two blank legend entries; the reviewer and role sit at bottom right below a compact signature line. The month can be changed by double-clicking it; the generated document name follows the period unless the user has renamed it.

Defaults use a separate cashSlip277 property in the existing account print-preference record, preserving report and voucher defaults. Cash slips use ordinary document saving and printing. They do not allocate voucher/journal numbers, create transaction rows, or post accounting data. Print does not add the generic report-signatory prompt or an extra signature block. The standard form leaves company images off to preserve handwriting space; ordinary Page Setup remains available.

Validation completed:

- Cash-slip behavior tests: 40 rows/nine columns, blank cells, row continuation 41–80, duplicate-initial validation, escaping, default isolation, save errors/cancel, identity changes, month persistence and stale-dialog protection.
- Existing report-signatory tests: defaults, names/roles, voucher identity exceptions and footer/numbering behavior.
- Browser fixture: full eight-name legend fits one A4 page; every heading remains unwrapped; legend and reviewer share the same row; month picker changes the full month/year and generated title; restored device draft retains the changed month and all 40 rows.
- Browser fixture Print action reaches print with one page, 40 rows and zero extra signature blocks. Physical printing and iPad Safari were not tested. Fixture uses test authentication/preferences and intercepts the final native print call; no production financial data was changed.
- Module build/check, phase-0 structure, release integrity/cache-key checks, JavaScript syntax and diff whitespace checks.
