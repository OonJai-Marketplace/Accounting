# Desktop alignment and automatic sync — v142.56

Accounts now presents Search accounts, Opening Balances, and Add Account in one
row. Opening Balances remains visible to administrators. Clicking checks the
existing database guard and opens the original form when available, or explains
why setup is closed. This update does not reopen ledgers or alter balances.

User rows keep full names inside their own column. Status is a green active or
red inactive indicator with an accessible label. Edit, Deactivate/Reactivate,
Delete and Reset Password share an aligned action row; existing permissions and
confirmation behavior are unchanged.

Single-entry fields use a shared column grid, including the custom date picker.
The date aligns with Money Out, description with Source, and entry type with
Amount. Tablet placement accounts for the existing responsive date relocation.

Desktop banners show internet status alongside the existing attention/sync
indicator. Complete queued saves sync automatically on reconnect and while the
signed-in session remains open, using the existing account-scoped, idempotent
save path. Failed attempts retain their references and retry with backoff up to
five minutes. Attention remains visible for unresolved saves. Manual retry is
still available. This does not automatically submit drafts or approve reports.

Validation: ten local Chromium checks passed, including opening setup available
and closed states, administrator-only visibility, long names and action
alignment, desktop/tablet field bounds, offline waiting, and a reconnect upload
confirmed exactly once with its original reference. Reviewed rendered desktop
and tablet screenshots. No live financial data was used or modified.

The approved phone layout and report designs are unchanged. No new SQL required.
