# Vouchers and Document Editor — v143.01

H means **Handwritten**. E means **Edited and Printed**. Settings → Accounting → Voucher IDs controls the prefix, the two codes and their meanings, two- or four-digit year, and minimum number width.

A sheet saved before its journal exists has a permanent reserved reference. Linking it copies the posted journal's general description, accounts, line memos, amounts and currencies automatically; you do not retype the transaction. The linked voucher ID uses the numeric suffix of the main journal Entry ID. For example, Entry `OJM-000042` dated in 2026 produces `OJM-26H-0042` or `OJM-26E-0042`. The year and classification letter are kept together; there is no hyphen between `26` and `H` or `E`. Its original sheet reference remains visible for tracing paper already printed. A linked ID is fixed; changing Settings affects newly issued sheets. Larger journal numbers are never truncated.

Transactions → Vouchers offers editor vouchers, numbered blank A5 sheets, links to posted entries, correction history and Mark Unused. Opening an editor draft consumes no reference. Save Voucher is required before printing or downloading an edited voucher. A saved or reserved sheet consumes its reference; Mark Unused retains it permanently and removes its unlinked reminder. Unused sheets cannot be linked. Corrections retain both references, require an explanation, compare with the original saved content, and reject stale versions. Linked editor amounts/currency must continue to agree with the posted journal. No receipt uploads are required; record the location of external proof.

For handwritten vouchers, enter the number of blank sheets first. The reservation creates that many consecutive unique `OJM-26H-NNNN` references and opens one A5 page per voucher in the Document Editor; for example, a count of 10 produces 10 pages with 10 different IDs. These reserved blank vouchers can print directly without an edited-voucher save. The application records how many references were reserved and generated, but a browser cannot confirm how many physical sheets a printer successfully produced. If printing is interrupted, reprint the affected sheet from the register. A retried reservation uses the same request key; the server rejects a changed payload under an already used key. Journal posting and voucher linking are separate acknowledged operations: if the journal saves but linking fails, the sheet remains in the unlinked reminder and can be linked from the register without posting again.

Company Template groups template creation, opening and explicit updating. Templates remain separate from document copies. Signatories use existing textbox borders and independent role/name/position alignment. Insert Table opens a closable sidebar beside the paper with Insert selected by default; Structure, Size, Borders and Selected Cell expose one compact settings group at a time. Payment voucher totals recalculate from rows and preserve the amount caret. The voucher register uses readable tables on desktop and iPad/tablet; the approved phone workspace remains unchanged.

## Installation

1. Website files deploy from `main` through the existing GitHub Pages setup.
2. In Supabase SQL Editor, run [INSTALL-VOUCHERS-v142.99.sql](../setup/INSTALL-VOUCHERS-v142.99.sql) once. It requires the existing data-tools setup [INSTALL-DATA-TOOLS-v142.32.sql](../setup/INSTALL-DATA-TOOLS-v142.32.sql); do not rerun that older installer on a current ledger just for this update.
3. No Edge Function change is required. The migration creates voucher tables, administrator-only RPCs/RLS, voucher numbering settings, and the voucher-aware snapshot/reset scope catalog. Installing it does not delete data or change journal amounts.
4. After installation, reload the website, check the H/E settings, save a voucher, and link an existing posted Entry ID. Verify the main-entry-derived ID and copied journal details. Check that its reminder clears, its original sheet reference remains, and View contains correction history.

Vouchers, history, number settings and reserved sequences are included in prepared backups and dated archives. The explicitly selected **journal reset** includes vouchers/history and preserves voucher settings/sequences; it is a destructive initial-setup action, not an installation step. Do not run a reset on the live ledger to enable vouchers.

## Validation

- `validation/test-document-editor14298.cjs`: browser workflows, totals, draft durability, template isolation, server-confirmed numbering, interrupted reservation retry, journal linking and desktop/tablet layouts; company data is stubbed.
- `validation/test-voucher-db14299.cjs`: executes the production migration/RPCs against temporary PostgreSQL, including permissions, duplicate requests/links, journal-derived IDs, correction history, amount consistency, unused sheets and scoped reset.
- `validation/test-vouchers14299.cjs`: dated archives retain linked journals, vouchers and version history; missing links are rejected.
- `validation/test-offline14294.cjs`: offline payload isolation, denied access, lost acknowledgements, retry deduplication and cached static reopening.

These checks do not install SQL or perform test transactions against the live company database.
