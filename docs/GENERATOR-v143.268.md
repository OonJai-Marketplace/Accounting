# Generate journal corrections

The previous generator used the existing template store, whose shipped catalog
contained only two foreign-currency layouts. Calculation coverage was broader
than the selectable catalog. This release adds chart-backed starters to the
same template list and manager, without replacing device-saved templates.

The added catalog includes configured foreign expense and income mappings,
financial support, expenses with bank fees, salary accrual, PIT and combined
PIT/SSO withholding, mixed-currency salary accrual, existing-balance payments,
cash/bank transfers, currency exchanges and local expense/income categories.
Only mappings with valid chart counterparts are included. Fund and employee
accounts are explicit choices. Additional lines support split funds/employees.
Tax allocations and partial-settlement book rates remain user inputs.

Manual entry matches entered account identities, currencies and debit/credit
sides. One best match adds missing structure while preserving entered amounts
and memos. Tied matches are shown for explicit selection. Existing calculation
rules may finish an already sufficient transaction without choosing a template.
Description text alone never selects an account or invents an amount.

Template names use an independent searchable picker; clicking the selected name
selects its text so typing replaces it. Numeric fields retain their values and
caret behavior. Native dialog centering overrides the global margin reset.
Close removes the dialog immediately, retains its draft and invalidates pending
work. Reopening requires fresh generation before copying to Post Entry.

Verification: 132 existing calculation scenarios, added catalog/matching and
payroll-allocation checks, and browser interactions using the generated asset,
production styles, shared picker and processing feedback. Checked desktop and
tablet viewport centering, search replacement, saved-template overrides/removals,
close/Escape, draft recovery, stale-request rejection and duplicate-free repeat
generation. Synthetic browser checks are not physical iPad Safari verification.
No financial records, journal IDs, saved tax rates or accounting periods change.
