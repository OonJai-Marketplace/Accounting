# Document Editor and Headings — v142.97

Refresh warnings now compare dirty tabs with successfully committed IndexedDB device drafts. Company-unsaved drafts remain recoverable on this device; edits awaiting storage or failed saves still warn.

Insert → Signatories supports 1–6 editable role labels, full names and positions. File → Save Template, Open Template and Edit Template distinguish reusable company templates from working document copies. Starter letter and payment-voucher templates use placeholders, never real transactions. Templates use the existing company_documents105 JSON data field and current administrator/RLS access. No SQL installation or financial writes are needed. Explicit template updates use version checks. Device restoration retains template protection.

File → Open groups Open/Delete at the right of each saved document. Report/screen headings capitalize word initials while preserving acronyms and body text; report model/Excel/CSV headings and generated document previews share the capitalization. User-edited document content is not rewritten.

Nine browser checks passed using stub company data, including refresh/reload durability, signatory insertion, template copy isolation, explicit/version-safe updates, network failure retention, tablet layout and dynamic/report headings. Source and deployed packed module are synchronized.
