# Automatic AI Journal checks — v143.161

The saved company Google connection is reused after login. Notification metadata is read on login, page navigation, focus/return, reconnection, and every 15 seconds while the page is visible. The existing server schedule checks Google every minute, so new notices normally appear within about 75 seconds plus network time. Opening AI Journal is not required for the bell to update.

Browser initialization now shares one settings request. Reads have explicit deadlines; aborted or late responses cannot replace the current user's content. Background notification checks do not wait for full journal table loading and continue during prepared-entry editing. Connection/last-check information is separate from journal action messages, so a background success cannot erase a save error.

The table retains its last complete contents during refresh, shows progress, limits receipt checks to four concurrent reads, and shares one ID-preview request per date. Final IDs still come from the posting sequence. Financial posting and server authorization rules are unchanged. Interactive Google consent is only required for initial authorization or an expired/revoked grant.

Validation: regression tests cover login races, on-Home notices, focus and offline recovery, timed-out/late requests, prepared edits, account isolation, ID previews, existing post/retry and reject/delete behavior. Full-app Chromium checks cover the login/bell/AI Journal flow and desktop/tablet layouts. The live connection, one-minute cron, and recent polling responses were verified read-only as healthy before release; no live financial records were changed for testing.
