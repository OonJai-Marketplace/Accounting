# v143.32 · Sync visibility and navigation

- Settings shows four groups with section links. Existing forms, saved values and permissions retain their IDs.
- Tax and SSO navigation now offers Monthly Statutory, Payments and Records. The monthly print/export groups VAT, PIT and SSO with their source rows.
- The existing numbered bell becomes red for sync failures and closed-period device entries. The Bookkeeping Data Check shows the original reference, date, amount, error and an exportable recovery copy.
- The local month-close review refuses known unconfirmed device entries through that month. The server preflight still checks posted journal balance, invalid/missing IDs, unresolved findings and cash/bank reconciliation; it cannot see a device that has never reconnected.
- Complete journal snapshots are now confirmed in IndexedDB before the load is treated as cached. A storage failure is visible in the sync assessment.

## Scope and remaining work

This release does **not** implement offline posting or locally recalculated official payroll, ledger and print totals across every module. Staff entries retain the existing retry-safe device queue; approvals and final posting still require the server. The journal and payroll readers still fetch data outside the current year, and a signed-in refresh still revalidates broad datasets. Do not treat a pending device entry as database-confirmed or a Data Check on one device as proof that other offline devices have no pending work.
