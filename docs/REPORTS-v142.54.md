# Approved report foundation — v142.54

Journal, sub-user account reports, payroll and salary vouchers share compact A4
portrait typography, table rules, settings-owned letterhead/footer images and
signature lines. Saved-report and history integration uses public hooks in the
standalone reports module; all existing application bundles are unchanged. The approved phone layout is unchanged; AGENTS.md records that
restriction for future work.

- Journal and transaction-history printing select a month and retain original
  entry IDs, source descriptions and mixed-currency chronology. Period totals
  keep currencies separate, with full-width top/bottom borders.
- Sub-user printing uses the same original double-entry details in review and
  history. Account and liquidation summaries follow the entries; there is no
  journal-total section or checkmark column.
- Payroll attendance uses employee codes, days across the top, and color-only
  indicators using the system legend. Detailed deductions follow. Paid leave
  value is informational and is never added to payment again.
- Salary vouchers use the same layout in English and Lao. Set **Salary voucher
  language** in the employee form. Historical financial values remain the saved
  payroll results. Older runs without a language preference can use the employee's
  explicit current language preference; nationality is never inferred.
- Report History and Salary History have month selectors. Reports are rebuilt
  from their saved source period, rather than current-month balances.

## Database installation

After the existing v142.53 update, install
`setup/INSTALL-REPORT-SNAPSHOTS-v142.54.sql` in Supabase SQL Editor. This release
has not run SQL against the live database.

The new trigger saves period-specific posted account balances with **future**
report approvals. Opening + received − used − handover = closing, using the
existing fund-summary convention (unclassified credits remain in used/outflow).
The ledger snapshot reflects what was posted at approval, and is labeled as such;
the original report's own activity appears in the liquidation table separately.
No previous approved report is rewritten or backfilled from today's ledger.
Older reports without a saved balance show “Not recorded.”

## Verification

Local browser tests verified actual document-editor pagination and Chromium PDF
generation: six employees; English/Lao vouchers; multi-page journal and sub-user
reports; mixed currencies; original ID gaps; 28/29/30/31 days; saved months;
image settings; language preference; legacy print entry points; and finalized
payroll printing. All 14 browser/PDF checks passed.

The SQL was tested in isolated PostgreSQL (PGlite): repeat installation, month
boundaries, posted-only balances, legacy preservation, unchanged captures after
ledger edits and access checks. No live SQL was run.

The six-employee sample payroll prints on two A4 pages with signature lines;
English and Lao sample vouchers each print on one page with normal margins.
Longer names, descriptions or larger configured letterhead can require more pages.
