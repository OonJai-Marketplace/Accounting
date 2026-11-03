# Report cashbooks and journal preview — v143.260

Sub-user account and liquidation reports now render cashbooks in Submitted review,
each user's workspace, saved report history and the document editor. Each fund and
currency has Money In / Money Out, source IDs, dates, memos and references. Category
summaries, reconciliation snapshots and signatures remain. Main-company journal
and ledger print layouts are unchanged.

After final approval, the reviewer chooses and previews a journal format:

| Choice | Journal rows |
| --- | --- |
| Consolidated — category totals | Totals by category and fund account |
| Detailed — fund total once | Individual expense/receipt counterparts plus fund totals |
| As entered — individual transactions | Separate debit/credit legs for each submitted transaction |

The first two formats use one editable journal date within the reporting month.
Original receipt dates are included in memos and retained in immutable source
links. Funds, currencies, exchange rates and debit/credit sides stay separate;
different rates can therefore produce more than one total for a fund.

The preview updates on format/date changes and shows the exact amounts and memos
that Use in Journal transfers. Cancel changes no journal draft. The transfer
explicitly chooses the main Journal, clearing the remembered AI Journal view.
Post Entry remains a separate action. Change format reopens the preview after
confirmation that a new selection will replace the prepared journal.

Server migration `20261103121009_report_journal_formats260.sql` adds
`category_totals` and `fund_totals` modes to the existing posting RPC. Legacy
`consolidated` and `detailed` clients retain their previous grouping. The RPC keeps
its signature and grants, authenticates/authorizes the reviewer, locks and matches
the approved snapshot, derives exact allowed rows, verifies reviewed FX rates,
checks period locks, retains original sources and performs immutable retries.
It does not rewrite any existing financial record. A single journal ID is allocated
only on successful posting. Reports spanning source accounting months must use
original transaction dates rather than being silently consolidated into another
month.

## Verification

- `test-subuser-cashbook260.cjs`: all three saved entry modes and four statuses;
  receipt ordering; separate funds/currencies; internal-transfer direction;
  void exclusions; category totals; reconciliation snapshots; legacy report
  routing; signatures; source immutability; unchanged main-journal printing.
- `test-report-journal260.cjs`: all three choices and legacy grouping, split funds,
  incoming/outgoing totals, FX partitions, original references, preview/cancel,
  date and identity guards, exact draft transfer and explicit main Journal choice.
- `test-fresh-backend14322.cjs` runs the actual fresh installer and
  `report-posting260-fixture.cjs` against isolated PGlite PostgreSQL. Both legacy
  modes and all three new UI choices are exercised with actual approval/posting
  functions. New cases cover LAK and THB, differing rates, original source dates,
  exact amounts, missing IDs, unauthorized users, approval requirements, closed
  periods, immutable retries and ledger integrity. All fixture records roll back.
- Existing workspace integrity, paid-holiday and editable-advance checks pass.
- Full-app browser fixture: submitted Print saved report and user Print Report
  both open cashbooks with category summaries in the document editor. An 80-line
  report paginates into eight pages with all 80 IDs and the final total retained;
  no detected clipping or page overflow.
- Full-app browser fixture: actual Approve/Confirm opens the preview. Switching
  formats produces 3, 4 and 6 rows for two food receipts and one kitchen receipt.
  Use in Journal opens the main Journal with balanced debit/credit cells and one
  fund credit, even when AI Journal was selected beforehand. No Post Entry click.

Browser checks use synthetic data with external writes blocked. They do not claim
physical printer or physical phone testing. No production journal was posted,
approved, edited or deleted during verification. The existing fresh-package
regeneration helper has unrelated missing-contract checks; this release appends
only the reviewed migration to the existing installer and updates its provenance
and checksum, preserving all prior bytes.

Release validation: 36 isolated database checks passed. The deployed posting
function matches the reviewed migration, with unchanged execution grants.
No financial data migration was performed.
