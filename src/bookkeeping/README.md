# Bookkeeping

| Work area | Source directory | Existing interfaces |
| --- | --- | --- |
| Entry form, validation, edit and posting | `journal/` | `JournalModule`, `submitJournalEntry`, `calculateJournalBalance`, `journalBatch1440` |
| Posted history, archive, voided records and CSV | `history/` | `renderJournalHistoryTable`, `renderAllTransactionsTable`, `renderVoidedTransactionsTable` |
| Review, period closing and carry forward | `finalization/` | `PeriodReview`, `workflow136`, `periodClosing14317` |
| Saved entry structures | `templates/` | `TemplateStore` |
| Upcoming obligations and reminders | `recurring/` | `RecurringStore`, `PrivateReminders14229` |

Sub-user conversion lives in `../bridges/subusers-bookkeeping/`. Payroll journal
preparation belongs in `../bridges/payroll-bookkeeping/`. Their callers retain
the existing global interfaces. Shared accounts and currencies are in `../accounts/`;
formatting, dialogs, authentication and sync remain shared dependencies.

Versioned sections are ordered overrides, not interchangeable implementations.
For example, `transactions-v98` is split between entry/balance, history/audit,
import and export while retaining its single original closure. The `scope-open`
and `install-and-scope-close` sections must surround the intervening parts in
the manifest. Build the complete assets before testing in a browser.
