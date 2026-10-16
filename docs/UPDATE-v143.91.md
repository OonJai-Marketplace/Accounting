# v143.91 — selected-amount calculation notifications

Replaces the role-based calculator with display-only arithmetic in the journal's existing notification area. No amount, rate, journal line, or allocation is written by the calculator.

- Removed Transaction Type, Calculation details, role assignment, automatic amount distribution, Restore Auto, and calculator mode metadata in posting/edit/draft/recovery paths.
- A compact fixed bottom bar spans from the navigation boundary to the screen's right edge. It contains the existing debit/credit status and simple account/amount/rate/equivalent notifications. The total and signed comparison come first; longer notifications scroll inside the bar.
- Select amount cells with their small check selectors, Ctrl/Cmd-click, or Select amounts then drag. Selection persists while using the calculator and copy icon. All posting account types are eligible.
- Same-currency foreign amounts sum before conversion using the matching transaction rate. Selected LAK amounts are compared against that total as they are edited. Difference = converted foreign total minus selected LAK total; positive is remaining, negative is over, zero is matched. The sign alone is not an accounting gain/loss classification.
- A LAK-only selection can be divided using an explicitly selected foreign rate. Mixed foreign currencies, invalid/missing rates, and mismatched rate currencies show an explanation rather than a conversion.
- Without a selection, tracked foreign funds show their individual transaction equivalents and available recorded averages. Different funds retain separate averages. No counterpart matching is inferred.
- Copy icons copy plain numbers only. Pasting uses the device's standard paste commands. There is no double-click paste or armed paste state.
- The bar reserves bottom clearance while active and moves floating workspace tools above it. Other modules and the existing personal/phone workspace retain their status/layout.

## Database cleanup

`setup/REMOVE-ROLE-CALCULATOR-v143.91.sql` removes the unused `journal_lines.calculation14387` field and its shape constraint after removing references from four existing functions. It preserves function permissions, authentication checks, period restrictions, idempotency receipts, journal amounts, transaction/carrying rates, audit history, and entry numbering. The migration aborts if calculator metadata has appeared since inspection. Old queued requests may still contain the retired JSON property; the functions ignore it without rewriting the request or its receipt.

## Verification

`validation/test-calculation14391.cjs` covers arithmetic, mixed/mismatched currencies, non-asset selection, live remainders, copy and ordinary paste, no double-click paste, persistent selection, drag and Ctrl selection, shared status, fixed-bar bounds and floating-button/content clearance. Run on desktop and with `PHASE0_DEVICE=tablet`.

Existing durable-journal and foreign-fund suites verify preservation of amounts/rates, offline edits, recovery and retries. Canonical source/module and release checks accompany the update.
