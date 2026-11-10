# Audit Logs 143.324 (10 November 2026)

Approved categories: R1 financial deletions; R2 posted debit/credit edits; R3 opening balance edits; R4 bulk/period deletions; R5 reversal/void; R6 reopened closed period; R7 finalized payroll numerical edits; O1 draft debit/credit edits; O2 exchange-rate edits. Ordinary admin, description, date and account-number edits are not audit events on their own.

History is one Red/Orange feed. No separate administrator-assisted activity area. Financially significant assisted changes follow the same rules as other changes. Red logs are permanently protected. Only Orange logs may be removed after review, individually or by selected month, not through quarter/year/all cleanup.

Live historical audit logs were reset. The previous 129 administrator-assisted rows remain only in the restricted private.legacy_audit_archive_20261110 for compliance evidence; the corresponding active table is empty. Financial journals, lines and operation receipts are retained. Year-end book closing must preserve locked financial records and Red audit evidence. Lao accounting document retention applies independently of the UI.

Applied Supabase migrations: audit_red_orange_classification_143324; audit_protect_red_reviewed_orange_only_143324; audit_combined_financial_page_143324; archive_and_clear_legacy_audit_history_143324.
