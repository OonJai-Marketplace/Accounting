# Accounting workflow v143.16

Transactions run in this order: Journal → Finalization → Period Closing → Upcoming → Budget Requests → Vouchers → History → Audit Logs.

## Prepare and share a budget request

Enter Date, Recipient, Purpose and Notes, then add categorized budget items. Templates and Add Template reuse request items. Print / PDF opens the request in Editor; it does not send or post a journal entry.

Review the document, edit its marked fields and item table, and click Save Budget Request at the top right. Amounts and category descriptions edited in the document become the saved structured request. Requested totals recalculate by currency. Send Email uses that exact saved document. WhatsApp copies the category summary for manual posting in your existing group chat. Both require a saved document and recheck the live transaction immediately before sending or copying. Deleted/reset records and conflicting versions are blocked. Gmail still requires the separate OAuth setup in [GMAIL-SETUP-v143.14.md](GMAIL-SETUP-v143.14.md).

The signed-in administrator supplies Prepared by. Reviewer is removed from the request form. Edits after a save require another save before sharing. A request with fund allocations retains its approved document; create a new request for changes.

## Finalization and history

Finalization offers Submitted Entries and Fund Allocation. Choose a saved request after funds begin arriving. Record partial receipts, allocations, currencies, references and conversion evidence. Save Report keeps an editable draft. Finalize creates a read-only funding record; it requires nonnegative funding balances per currency. Neither action posts an official journal entry.

Allocation Templates and Add Template reuse allocation categories, items and amounts. They exclude actual receipts, references and conversions. Using a template matches items against the chosen request and requires fresh references. Edit updates an existing movement or conversion without adding a duplicate.

History has Journal, Submitted Entries and Budget Requests selectors. Budget Requests contains original requests and linked draft/finalized funding records. Continue reopens a draft in Finalization. Historical documents can be viewed/printed. Completed submitted entries retain their existing history renderer. Access permissions keep their original internal IDs.

## Archive, deletion and reset

Saved request documents are embedded in `operational_reports.data.document14316`, rather than duplicated as unrelated company documents. Fund allocations use `requestId14316` and the request version. Archive selection includes the complete linked request/allocation family even when members fall outside the selected date range. The archive viewer exposes parent/child links; backup validation rejects orphan allocations. Templates/settings are supporting configuration.

The existing selected reset scope `reports` is displayed under Transactions as “Budget requests, allocations and saved operational reports.” **That selection resets all saved operational reports**, including existing non-budget reports. Its confirmation and backup show the complete table count. Accounts, users, templates/settings and generated-number continuity remain outside this transaction reset. No number reset or reopening of opening balances is added.

Install [INSTALL-BUDGET-LIFECYCLE-v143.16.sql](../setup/INSTALL-BUDGET-LIFECYCLE-v143.16.sql) in Supabase after the existing Data Tools and Budget Templates installers. It performs no deletion or reset. It adds a parent foreign key, version/finalization guards, an atomic audited delete RPC, and includes budget configuration in audit snapshots. The website blocks allocation saves with a concrete setup message until this installer is present. Deleting a request then deletes its linked allocations in the same transaction and uses the existing deletion journal. Generic deletion cannot leave orphan allocations. Reset invalidates loaded budget history; restored editor drafts still check the current database and cannot resurrect a deleted saved record.

## Navigation shortcuts

Press Ctrl+Alt and a main area initial, then the horizontal tab initial. A brief on-screen guide lists available tabs. Escape cancels; clicking into an input cancels the second step. Normal typing does not navigate. Existing navigation permissions and draft handling still apply. Shortcuts work inside Editor as well.

| Main area | Initial |
| --- | --- |
| Dashboard | D |
| Transactions | T |
| Users | U |
| Accounts | A |
| Human Resources | H |
| News and Events | N |
| Payroll | P |
| Reports | R |
| Editor | E |
| Mandatory | M |
| Settings | S |

Transaction tab initials are J, F, P, U, B, V, H, A in the order above. To remove sibling conflicts, Payroll uses Deductions and Entries; HR uses Performance; Reports uses Income Statement, User Reports and Funding Reports; Mandatory uses Income Tax, Payments and Contributions. Settings uses Ledger, Mandatory, Theme, Archive and Recovery where applicable. Internal permission/setting IDs are preserved.

## Other changes and validation

System preferences use one desktop/tablet row: Date Format, Number Format, Default Opening Page, Archive Reminder. Centered success notifications are restored after confirmed saves. Journal metadata keeps Date, General Description, Voucher ID and Entry Type in one stable row, including personal journals. Active budget/template/allocation buttons use visible green controls. Handwritten voucher reserves never count as pending; only unlinked, non-void editor vouchers do. News defaults to All News, ordered by upcoming dates, unconfirmed dates and past news.

Browser regression checks use a local fixture, mocked Gmail authorization/API and no live financial writes or real messages. PostgreSQL lifecycle checks use isolated PGlite. The approved phone design is unchanged.
