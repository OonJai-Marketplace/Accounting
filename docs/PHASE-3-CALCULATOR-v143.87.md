# Phase 3 — inline transaction calculator (v143.87)

**Retired in v143.91.** The role-based editor, table, metadata column, and standalone installer were removed at the user’s request. This document records the earlier design only. See UPDATE-v143.91.md for the replacement.

Authorized 2026-10-15 for Accounting Version 1. Continues Phases 1 and 2.

## User behavior

- Post Transaction has an explicit Transaction Type beside Voucher ID: Normal, Income, Expense, Transfer, Currency Exchange. New/reset entries start at Normal. Existing templates remain editable zero-amount journal rows; select the calculation type when using them.
- Income and Expense calculate foreign system offsets, LAK mapping and recognized income/expense from actual fund amounts. Expense compares the entered transaction rate with the source's recorded carrying value and calculates exchange gain/loss.
- Example: paying 9 THB at 6.7 with a carrying rate of 6.5 produces expense DR 60.30, mapping CR 58.50 and exchange gain CR 1.80. A lower transaction rate produces a debit loss.
- Transfer moves equal original-currency amounts between two different same-currency fund accounts, preserving the source carrying rate. It requires no new transaction rate and creates no mapping or gain/loss. Currency Exchange calculates the destination quantity and exchange difference for different currencies.
- Calculation details show line roles, suggested amounts, carrying-value arithmetic and supporting journal references. Assign paid/received roles there for blank Transfer/Exchange fund rows. Each date is calculated separately and prior draft dates affect available funds.
- Editing a calculated amount or rate marks it Manual. Restore Auto resumes calculation for that row. Invalid rates, missing valuation and insufficient source funds block an automatic calculation. Foreign source funds must have Track foreign-currency funds enabled in Accounts.
- Rate appears between Memo and Debit with compact currency units. The top transaction-rate fields remain. Where present, the row shows its recorded carrying rate.
- Journal and History share one entry menu, opened through the touch-friendly ellipsis, desktop double-click or Enter. Existing permission/period restrictions determine available actions. Escape and arrow keys are supported.

## Persistence and compatibility

Calculator modes/roles persist in the durable outbox, encrypted recovery, saved entries and protected edit/retry paths. Reopening a saved entry retains exact amounts/rates until an explicit calculation input change or Restore Auto. Normal entries retain the existing manual workflow. Automatic calculations operate in the main journal; the personal submission editor keeps its existing workflow.

The additive nullable `journal_lines.calculation14387` column has a shape constraint. Existing protected posting/edit functions save the metadata, journal-window reads return it, and normalized change comparisons include it only when present. Existing RLS, authorization, audit, period locking and idempotent receipt behavior remain in place. No historic entry revaluation, sequence reset, scheduled fees or period-end revaluation is introduced. The approved phone layout remains unchanged.

## Validation

- `node validation/test-calculator14387.cjs`: arithmetic examples, income, gain/loss, same-currency transfer without a new rate, currency exchange, manual amounts, zero reset, missing/insufficient funds, multi-date availability, editor integration, Restore Auto, snapshots, offline metadata, saved-edit preservation and menu keyboard/mouse actions.
- `PHASE0_DEVICE=tablet node validation/test-calculator14387.cjs`: touch/tablet integration; desktop and narrower viewport screenshots inspected.
- `node validation/test-journal-durable14385.cjs`: offline create/edit/void, lost responses, immutable retries, double-click prevention, in-flight edits, conflicts, encrypted recovery, reload and account/database isolation.
- `node validation/test-foreign-funds14386.cjs`: carrying values, prior-year openings, missing rates, transfers, parent totals and account tracking persistence.
- `validation/test-calculator14387.sql`: protected metadata edit/read/retry, invalid metadata rejection and legacy compatibility, entirely rolled back without allocating journal IDs.
- `validation/test-journal-changes14385.sql`: existing edit/void retry, closed-period, authorization and stale-edit guards, entirely rolled back without allocating journal IDs.
- Module build/check, structure byte manifest, release manifest and whitespace checks.

Migration: `setup/INSTALL-JOURNAL-CALCULATOR-v143.87.sql`.
