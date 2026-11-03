# Requested changes — verification for v143.251

The audit checked the current application, isolated browser workflows, generated
PDF layout, live numbering/PDF-retention functions, and the current pending
October source data. Live reads did not post journals or change payroll.

Three incomplete behaviors from v143.250 were corrected: the independent phone
receipt form now shows its provisional ID before Preview, and the editor's
Download and Share buttons perform their respective actions. Completed phone
receipt details are also cleared from the saved draft, while newer unfinished
edits are preserved. Reopening the form starts a new blank receipt.

## Payroll and salary vouchers

| Request | Verified behavior |
| --- | --- |
| Payroll's horizontal Voucher tab | Opens the voucher/receipt register, not Sub-users. |
| Salary voucher reference | `PAY-2610-R04` style; YYMM and employee code without internal dashes. Stored employee and journal IDs remain independent. |
| Employee details beneath title | Three paired rows: code/name with position; salary month with voucher number; payment date with currency. |
| More readable spacing | Salary/attendance sections, row padding, paragraphs and signing space retained; ordinary English/Lao vouchers fit A4 with letterhead. |
| Attendance record width and alignment | `Code` heading, narrower code column, wider dates, centered date glyphs. HR date headers also remain centered. |
| Zero rows | Optional zero salary/attendance rows omitted; contract salary and final totals retained. |
| Paid leave and holidays | Eligible paid calendar holidays included once with day count and value; leave overlaps and legacy marks do not double count. Current October inputs checked. |
| Excused late | Label is Excused late; EX events are separate from paid leave/holiday and incur no late deduction. |
| Unnecessary notes | Internal calculation commentary omitted from individual salary vouchers. Employee notes retained; value/deduction headings identify LAK. |

## General payment vouchers and receipts

| Request | Verified behavior |
| --- | --- |
| Same printable design | A4 portrait, seven detail rows, shared layout with appropriate titles and payer/payee wording. |
| Existing letterhead | Company header/footer images supported without a duplicate business-name heading or sample watermark. |
| Header fields | Wide payer/payee and one-line contact number on left; smaller document ID/date fields on right. Address removed. |
| Total and amount in words | Automatic totals and LAK/USD/THB words; no trailing “only.” |
| Fields below total | Words left/currency right, then reference left/payment type right; labels above lines or choices. |
| Wording | Reference / Unit table header and Reference field label. |
| Choices | Consistent square checks for currencies and Cash/Bank; no emoji symbols. |
| Blank defaults | Date, amount words, currency and payment choices initially blank. Typed forms validate date/currency when issued. Blank printing remains available. |
| Numeric entry | Live thousands separators in receipt amounts, phone amounts and Journal/AI amount fields; caret preserved. |
| Signing space and stamp | Signature area retained; no mandatory stamp. |
| Editor action placement | Save Voucher, Details, Download and Share together on the right. |
| Obsolete launchers | Separate Open Handwritten/Blank Receipt creation launchers removed; creation goes through the editor. |
| Blank batches | Details accepts the desired count; five blank forms produce five pages with five distinct recorded IDs. |
| Reprints | Reprinting retains the same IDs and company PDF copies. |
| Shared numbering | Receipts and general vouchers share OJMYY-LMMNN; 01–99 then next letter, month/year codes, new-year restart and collision guards. |
| Numbering safety | Preview does not allocate. Issuing is transactional, retries are idempotent, existing IDs are not reused. Live database has unique number constraints. |
| Company copy | PDF retained for each issued voucher/receipt before printing, downloading or sharing. Prior versions remain available. |
| Phone administrator form | Account menu → Issue receipt; available ID visible before Preview, editable typed details, automatic summary and PDF preparation. |
| Download and Share | Download releases the file directly. Share invokes native/browser sharing when supported. Browsers requiring a fresh tap show a ready-to-share button; unsupported browsers offer download. |
| Completed blank receipt evidence | Attach photo remains available for blank receipts. Blank printing itself is not blocked. |

## AI Journal and feedback

| Request | Verified behavior |
| --- | --- |
| Source sequence | Pending entries follow PDF reference order rather than conflicting transaction-date order. Current October source block checked. |
| Available ID | Actual next journal ID is shown provisionally, separately from the PDF/source reference. |
| Descriptions | Pending general descriptions use plain transaction wording without preparation/correction commentary. |
| Confirmed conversion correction | Requested pending October conversion and rounding difference checked; posted records preserved. |
| Description width | Description ends before Debit; Debit, Credit and action columns remain separate. |
| Edit button | Keeps Edit text, becomes gray/disabled while prepared, and does not move the user out of AI Journal. Multiple entries can be prepared. |
| Stable buttons | No appended inline loading spinner; button label/width remain stable. |
| Processing notice | Top-right, above dialogs; launcher feedback pauses when its window opens. Save feedback ends with completion. |
| Journal flicker | Main/personal receipt metadata checks are silent and cached, with no repeated unchanged DOM writes or legacy link notices. |
| Withdrawn requests | Average-rate refresh requirement and posting-performance behavior left unchanged, as requested. |

## Verification coverage and limits

- Browser suites: `test-voucher-layout250`, `test-voucher-compact246`,
  `test-receipts250`, `test-receipt-delivery251`, `test-ui250`,
  `test-ai-stack-browser250`, `test-receipt-icons226`.
- Additional checks: `test-paid-holidays246`, `test-ai-stack250`,
  `test-ai-ids143148`, `test-quiet-inboxes239`, source/build ownership and
  release/cache integrity.
- Tests use isolated data; share calls are mocked and send no messages.
- Tablet checks use touch/iPad browser emulation, not a physical iPad. Native
  share behavior depends on device/browser support and installed applications.
- Previously saved custom editor documents and downloaded PDFs are preserved;
  generating a new salary voucher uses the current layout.
