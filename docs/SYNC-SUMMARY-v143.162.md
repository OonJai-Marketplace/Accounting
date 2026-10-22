# Synchronization summary — v143.162

Requested: simplify synchronization notifications, show completed/pending work and data measurements, remove separate progress/acknowledgement notices, and refresh automatically on entering the system.

- The connection control, bell item, manual sync and latest result use one modal. Close/Escape dismiss it while in-flight work continues. Completion and reload do not open another popup.
- One aggregated bell item replaces per-operation sync reports. A changed set of pending references/statuses becomes a new unread item. Opening the bell alone does not mark it read.
- Compact module rows show uploaded records, waiting records and refresh state. Expanded details retain reference IDs, errors, retry, recovery guidance and device/update tools.
- Measured bytes include observed sync request/response bodies and repeated attempts; headers, website files and unmetered requests are excluded. Pending payload size is an estimate. Device size is serialized stored data for the current account, including snapshots and recovery copies, not physical browser quota or the cloud database total.
- After interactive startup, login/reconnect starts an authenticated background coordinator run without waiting for idle. Routine idle uploads retain the two-minute activity gate. Cross-tab locks, original posting references, version checks and server receipts remain in place. Unsaved editor content and AI draft preparation are not automatically posted.
- Account changes stop subsequent coordinator operations and prevent old-account results appearing in a new session. Existing server-side Google draft checks can continue after logout; this release adds no logged-out browser credentials or upload worker.

Validation: sync summary (wide/narrow), coordinator/cross-tab/sign-out, returning startup, changed and offline journal snapshots, encrypted recovery/retry, and mixed journal/staff recovery browser tests. All use synthetic accounts and records. Build, source ownership, release hashes and published asset identity are checked separately.
