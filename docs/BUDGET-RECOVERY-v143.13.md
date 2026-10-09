# v143.13 — Budget requests, recovery and session settings

Budget Requests is now a Transactions tab. Templates save item descriptions, categories, currencies and amounts; reusing one starts a new request without receipts, movements or currency conversions. Templates and Add Template remain beside the request. Settings stores categories, default currency, recipient emails, WhatsApp group/individual information and an account handover note. Request reference fields and Add Finalized Payroll are removed. Reports provides saved Budget & Financing Reports and exports saved records, not the current unsaved request.

## One-time database setup
Run `setup/INSTALL-BUDGET-TEMPLATES-v143.13.sql` in your existing Supabase SQL Editor. It creates two admin-only tables with RLS and does not change financial records. This migration has not been executed against the live database by Codex. Templates, shared settings and message preparation need this setup. Ordinary request saving uses the existing operational_reports table.

Send Email prepares full item detail; Send WhatsApp prepares category/currency totals and a private saved-breakdown link. Each preparation saves a new snapshot. These actions open drafts for review and sending in the external app; they do not automatically send. Group delivery requires selecting the group in WhatsApp. Change the actual sending account in the email/WhatsApp app. Recipients must have authorized accounting-app access to open links. A complete .eml draft is available for long emails.

Document Download is narrower. Both password-history settings shortcuts were removed from the editor. Archive & Recovery → Recovery Settings opens a scrollable popup; encrypted-download passwords appear below recovery contacts after unlocking. The existing v143.12 database installation remains required for password storage. Closing the popup locks and clears its content. Password history is excluded from offline response snapshots.

App inactivity logout and inactivity-based reopen expiry are removed on desktop and phone. Manual sign-out, revoked access, and the separate sensitive recovery-vault lock remain. System options begin with Date Format, Number Format and Default Opening Page, followed by Archive Reminder. The old retention field was a reminder only; the high-risk checkbox did not govern required action confirmations. Both are removed from the form; actual destructive-action confirmations remain.

Custom sidebar artwork uses the current navigation icon color without the light background tile. Phone visual layout is unchanged.

## Verification
22 browser checks cover navigation badges, icon contrast, document import/downloads, recovery, settings, budget templates (500 restores as 500), draft messages, private links and saved report exports. Seven database password-history checks and three independent phone session checks also pass. Tests use fixtures; no real messages were sent and no live financial records were changed.
