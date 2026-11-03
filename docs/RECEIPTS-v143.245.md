# Receipts and shared voucher IDs

Payment receipts and general payment vouchers use one seven-row A4 portrait template. Existing salary voucher layouts are preserved. Desktop creates them in the document editor; Payroll links to the shared register. Phone administrators use the account menu’s Issue receipt form.

Preview does not reserve IDs. Saving allocates OJMYY-LMMNN atomically across receipt and voucher types; NN is 01–99, then the letter advances A–Z. The yearly counter continues across months. On wrapping, previously issued full IDs are skipped, including void records; a full month’s 2,574 combinations cannot be exceeded. New years restart at A01. Request UUIDs make retries immutable and idempotent. Historical IDs remain unchanged.

Receipt output retains the exact PDF per document revision before print, download or share. The system share chooser requires browser/native file-sharing support; unsupported browsers provide download. Blank batches are allowed and each sheet reserves an ID. Completed handwritten receipts can have image evidence attached. Receipt issuance and PDF/photo RPCs require active administrator access.

Install setup/INSTALL-RECEIPTS-v143.245.sql after the existing voucher schema. The production Accounting migration was applied. Retained PDF and photo evidence lives in the existing voucher/current-history JSON, preserving its existing backup path.

Validation: validation/test-receipts245.cjs covers shared design, decimal totals, currency/payment selection, no allocation on preview, blank batches, retained PDFs, phone form and immutable retries. Database tests run inside a rolled-back transaction covered actual issuance, retries, PDF retention, shared batch IDs, collision skipping, new-year reset and denied anonymous preview. Salary voucher layout regression also passed. Browser fixtures do not establish physical-phone or WhatsApp delivery behavior.
