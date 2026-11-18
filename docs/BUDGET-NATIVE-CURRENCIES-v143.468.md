# Native-currency fund utilization

The register, funding summary, draft and final/print reports now keep every
expense in its saved transaction currency. USD exchanged out reduces USD funds;
exact LAK proceeds increase LAK funds. LAK spending is no longer translated back
into USD based on the linked request or owner equivalent.

Remaining per currency = receipts + coverage + advances - repayments + exchange
in - exchange out - expense cost, before cash handover. Gross payroll cost and
employer PIT 50% / SSO 6% remain the approved expense basis. Actual cash payment
details remain separate and disclose missing evidence.

The register totals Requested, Approved, Received, Exchanged out, Exchanged in,
Used and Remaining for the visible reporting months. Exchange references and
saved exact proceeds appear in the main funding summary. Existing inline funding
editing continues to expose these saved fields.

Supabase migration `20261118090717_budget_native_currency_summary.sql` adds a pure
invoker calculation and an invoker view over current operational reports. Existing
report RLS applies; anonymous access is revoked. No source reports, payroll,
approvals, cash history, references, journal entries or report versions are rewritten.

Validation: Node tests cover gross expenses, native currencies, exact/reverse
exchanges, header totals, month ordering, one negative-finalization warning and
remaining before handover. The SQL regression uses synthetic data. Comparison of
all 10 saved monthly reports found no SQL/JavaScript differences across 20 currency
rows. Report fingerprints and versions were unchanged after the migration; no
security-advisor finding targets either new database object.
