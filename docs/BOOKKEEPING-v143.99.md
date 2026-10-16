# Bookkeeping adjustments and debugging — v143.99

## Requested changes

- System account names use dark orange, a pale orange background and a SYSTEM badge in account selection, Chart of Accounts and the main journal/history account display. Styling does not recolor the transaction row.
- Post Transaction keeps a thin grid and card border, without focused/selected cell highlighting. Existing posted-entry separators are retained.
- All transaction templates, including built-ins, have Use, Edit and Remove. Edit supports name, general description, accounts, line descriptions, adding and removing lines. Built-in changes and deletions persist in the existing browser template store without recreating deleted defaults. Amounts remain zero on use.
- Templates always restore Double Entry before loading their saved account structure, fixing an edited-template/single-mode mismatch.
- Monthly/quarterly/yearly upcoming reminders retain their original day after a shorter month. Month-based advance reminders clamp to the preceding month's last day instead of overflowing into the due month.

## Trial data added, using existing accounts

The owner confirmed that operational data is temporary. No account definitions or Settings were edited.

| Area | Examples |
| --- | --- |
| Journal | OJM-000108 cash sales LAK 300,000; OJM-000109 ingredient payment LAK 60,000; OJM-000110 THB 100 received at LAK 650/THB, with LAK 65,000 income mapping |
| Scheduled entries | SCH-0001 weekly ingredients LAK 75,000 and SCH-0002 monthly supplies LAK 125,000; both manual-post schedules |
| Schedule posting/history | SCH-0001 posted once as AUTO-0111; next due 23 October; occurrence remains available for review |
| Upcoming transactions | One-time delivery, monthly supplies, and overdue supplier-invoice reminders |
| To-do lists | Daily bookkeeping checklist and sequential supplier-payment checklist |

All new examples are labeled TRIAL. Posted examples affect the trial balances. Reminders and checklist completion do not themselves post payments, consistent with the existing application workflow.

## Verification completed

- Live database: zero duplicate journal numbers, zero unbalanced posted currency groups, zero negative/both-sided debit-credit lines, zero posted foreign-currency lines missing positive exchange rates.
- Live transactional assertions: posting retry returns the same receipt; changed retry payload rejected; closed-period and unbalanced posting rejected; edit retry idempotent; stale edit rejected; void retry idempotent; duplicate scheduled occurrence prevented. Debug edits/voids rolled back, preserving sample entries.
- Browser: durable offline posting, local pending edits/voids, interrupted post/change responses, retry identity, sequential entry numbers, storage failure retention, multi-date batches, FX rates, recovery export/import, account/database isolation.
- Browser: foreign-currency templates, mixed THB/USD layout, LAK reporting, carrying values, mixed-currency parent totals, transfer handling, missing valuations, prior-year openings, pagination and excluded pending/voided records.
- Browser: meaningful audit differences and readable identities; zero/nonzero reconciliation acknowledgement; closing guards and lock preflight; atomic submitted-fund reconciliation; desktop/tablet report layouts.
- Isolated Postgres: year closing retains mapping accounts, closes actual income/expense to LAK retained earnings, preserves foreign-currency carrying values, rejects stale fingerprints, checks administrator permission and repeats safely.
- Isolated Postgres: task editing/deletion, recurring completion, owner isolation, permission denial and inactive/unsigned access rejection.
- Browser: administrator/staff reminder-loading behavior; edited built-ins, persisted deletion, zero amounts, plain editor cells, month-end reminder calculations.

- Current returned-report correction through the entry menu passes on desktop and tablet.
- Update tests pass for automatic discovery, notification badge, manual checks, failed/offline checks, old-cache replacement, interrupted download/retry, preserved localStorage/IndexedDB drafts and offline reopening.
- Canonical-source build, generated-asset identity, HTML references, release manifest and whitespace checks pass.

## Limits and historical tests

This is a targeted deep review of the paths above, not proof that every possible input or device is fault-free. Physical Chromebook/iPad testing, full live user-login-to-month-close operation, all document export combinations, and foreign-currency scheduled posting were not certified. Templates retain their existing browser-local storage model; they are not newly synchronized across devices.

Historical closing test v143.42 tries to close the current month, which the current application intentionally blocks; current v143.47 checks verify that rule. Historical return/report tests v143.48/v143.49 expect removed inline Edit buttons and a pending badge for the report currently under correction; the current interface uses the entry menu and excludes that report from the pending badge. Current return-menu coverage is recorded separately. Older update tests used a now-current release as their simulated newer release; v143.99 copies use appropriate version fixtures.
