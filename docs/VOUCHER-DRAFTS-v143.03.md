# Voucher drafts and requested layout corrections — v143.03

## Numbering workflow

Opening either voucher type creates a local draft and makes no voucher issuance call. The Number of Vouchers input on Transactions → Vouchers controls handwritten batch size (1–50). Canceling the editor destination dialog records nothing.

Save Voucher records the draft. Print, PDF, Word export and JSON download require Record & Continue for an unsaved voucher. Cancel leaves the draft unrecorded. Confirmed server numbers replace tentative preview numbers. Reprinting a recorded batch does not allocate another batch. Stable request payloads and keys survive interrupted responses and prevent duplicate issuance on retry.

Existing issued references are preserved. No SQL change is required; the existing voucher issuance endpoint is used.

## Handwritten and editor distinction

Handwritten Voucher has a visible editor mode label, handwritten page heading, blank date/payee/payment method/currency/reference lines, empty table amounts and total, and increased signature space. Automatic voucher calculation is disabled for handwritten mode. Editor Voucher retains automatic totals. The handwritten workflow no longer waits for a full register reload before opening the editor.

## Layout corrections

- Remove duplicate title-adjacent print controls on Audit Logs and Period Closing; keep the far-right Print / Preview action.
- Put a square Wi-Fi status icon first in the existing workspace control dock, with status-dependent color.
- Use a 252px full-height Table Settings panel. First row: Insert, Size, Borders. Second row: Structure, Selected Cell. Insert is the default; page fit adjusts after viewport rotation.
- Place Save Voucher at the upper right for both types. Adapt the title row for iPad widths.
- Remove the Payment Voucher starter from Company Templates.
- Right-align voucher header details and leave handwritten fields blank.
- Position row action menus synchronously and disable animated repositioning.

## Verification

Ten targeted browser checks passed with fixture data, including no issuance on opening/canceling, output confirmation, distinct handwritten/editor calculation behavior, unique batch IDs, retry after a lost response, all five table panels at desktop/iPad widths, template removal, rightmost print controls, and stable action-menu positioning. No uncaught browser errors. PDF inspection confirmed exactly ten A5 pages for a ten-voucher batch. Inspected PDF and desktop/iPad screenshots. Offline regression checks passed.

These are local Chromium/fixture checks, not physical-device or live-database certification. Changes have not been pushed in this session.
