# Fund utilization payroll protocol

Salary expenses use earned gross after attendance deductions, before employee PIT, SSO and advance recovery. PIT labels identify the employer 50% share; SSO labels identify the employer 6% share. The payroll source remains unchanged.

The disbursement breakdown uses expense cost. Funding allocated uses that cost in the linked request currency, with an explicitly recorded owner share taking priority. A saved budget equivalent takes priority over actual exchange rates. Missing equivalents remain visibly unresolved. Approved request totals stay separate: approval alone does not invent an expense. Exchanges are not another utilization cost. Physical cash movements remain separately expandable and retain original amounts. Manual journal preparation uses the same committed basis; previously posted journals are never changed by this update.

Payroll amounts reads one finalized payroll for the reporting month. Administrators review a preview and apply it against the exact report and payroll versions. Corrections preserve cash payments, receipt references, funding decisions, exchanges, notes and wording. Missing salary rows with matching personnel request items are added with cash details pending. Unmatched or ambiguous employees need individual review.

Finalized reports retain finalized status. A private audit stores the before/after snapshot and changed salary fields. The finalization guard permits only that exact audited amendment in the same transaction; ordinary updates remain blocked. No private financial values belong in this public repository.

Validation: model checks cover gross versus cash, employer labels, currency equivalents, FX double counting, source immutability, register totals and missing cash disclosure. Negative-finalization and month-order regressions remain covered. The audit table intentionally has no direct client grants or RLS policies; all access uses the guarded administrator RPC.
