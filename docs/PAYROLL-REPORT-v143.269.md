# Payroll report and overview — v143.269

Payroll report identity now uses short code plus surname in its first table.
The three requested name formats were compared in a browser at 190 mm usable
A4 width: all seven fixture rows stayed on one line, with no cell overflow.
Short code plus surname retains both identifiers. Currency prefixes replace
repeated LAK headers; payment currency remains explicit after removing the
redundant currency column. Shared report signing height increases from 6 to 14 mm.

Overview uses the open month and current draft before an older saved copy. With
no open run it defaults to the current application month. Dated HR leave history
and live leave records are selected by date overlap, with duplicate historical
rows suppressed. Missing historic pay treatment remains Not recorded. Existing
manual month selection remains available and loads its payroll window. Cached
Overview screens invalidate when the open run changes, including in-place edits.

Internal Deduction Summary precedes Attendance Deductions. No filtering, payroll
formulas, employee identity, finalized snapshot, financial data, or Bookkeeping
workflow changes. Finalization still uses Save and archive independently of
journal posting. Existing editor copies must be regenerated to use the new layout.

Validation: test-payroll-report-overview269.cjs, test-payroll-refresh235.cjs,
test-payroll-contract234.cjs, test-payroll-explanations143157.cjs, module structure
and release/cache integrity checks. Browser visual inspection used fixtures,
not the user's live payroll data or a physical iPad.
