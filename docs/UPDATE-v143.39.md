# v143.39 — responsive journal loading and period recovery

Table formatting now collects changed tables once per animation frame, instead of rescanning a complete table for every changed cell. The same 1,000-line browser fixture reduced measured formatting work from 10.6 seconds to about 28 milliseconds. This is a local test measurement, not a guarantee for every device.

Complete dataset reads can retry the server after an earlier connection failure while the browser is online and the session is authenticated online. They use the full bounded read window. True offline and offline-authenticated sessions still use saved copies. Failed period selection restores the last working report filters.

Verified: 1,000-line journal rendering, active and closed journals, ledger display, date picker resizing, unavailable-period rollback, slow server recovery, offline snapshot retention, and access denial handling. No database records or financial calculation rules changed.
