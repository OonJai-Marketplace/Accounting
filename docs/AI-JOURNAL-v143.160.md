# AI Journal preparation — v143.160

Requested behavior: reject/delete unwanted AI drafts; select several drafts for editing without repeated navigation; edit them in stacked sections; post them together with separate journal IDs.

## Workflow

- Each pending draft offers Edit, Reject and Delete.
- Edit adds a draft to preparation and stays in the AI Journal. Repeated selection cannot add it twice.
- Open preparation shows all selected drafts as distinct editable sections. Each section displays its draft reference; final accounting IDs are allocated by the existing database sequence at posting, never by the client or Google Sheet.
- Dates, general descriptions, accounts, line memos, debit/credit amounts and foreign exchange/carrying rates can be edited. Lines may be added/removed. Same-date entries stay separate.
- Post all runs one database transaction through existing journal validation and posting workers, preserving a separate receipt per source draft. A failure rolls back all new entries in that request. A retry resolves previous receipts, including responses lost after commit.
- Preparation saves on this device under the signed-in user, workbook and accounting-reset context. Normal manual drafts are not overwritten. Refresh/source changes cannot silently replace preparation edits.
- Reject moves a draft to Rejected drafts, where Restore returns it to pending. Delete permanently removes its reference from the AI inbox. Both actions retain the original source rows in Google Sheets and do not change posted books. The confirmation explains this distinction.
- The database prevents a posted draft being rejected/deleted and prevents rejected/deleted references being posted by an older client. Restoring a deleted reference is intentionally disallowed; use a new draft reference if a new submission is needed.

## Scope and validation

Canonical changes are in the existing Drive drafts module, the shared amount shortcut's explicitly scoped selector, and an exclusion from legacy mobile table conversion for the new preparation panel. The previous one-draft editor handoff was replaced rather than left as an unused parallel implementation. Other layouts, accounting rules, the Google Sheets A:N schema and posted journal data are unchanged.

The new batch RPC delegates to the existing per-draft receipt and accounting posting workers; it does not introduce a second accounting engine. The new disposition table has RLS enabled and no direct browser grants. The three new authenticated RPCs check user identity, journal posting permission and workspace access, and pin their search paths. Anonymous execution is revoked. The existing advisor warnings remain; the new authenticated-definer and no-policy notices correspond to these deliberately restricted RPCs/table.

Tests use synthetic browser data and an isolated PostgreSQL engine. They cover queueing, edit persistence, same-date separation, amounts/caret/suffix shortcuts, exchange-rate fields, cross-month receipt handling, source changes, offline guards, whole-batch rollback, lost-response retries, archiving, rejection/restoration/deletion, and permission restrictions. No real draft was rejected, deleted or posted for testing.

SQL: `setup/AI-JOURNAL-STACK-v143.160.sql`, also tracked as the CLI-created migration. The live migration was applied before releasing the dependent client. Read-only verification confirmed function privileges, pinned search paths, RLS, denied direct table writes and zero disposition records after deployment.

Full-app Chromium checks also cover login/session timing, searchable account controls, 32px actions, borderless table fields and desktop/tablet rendering. This caught and fixed a delayed login check clearing newly prepared drafts and legacy tablet code treating the new stack as the original manual editor. Phone service-worker/cache and offline regression checks passed.
