# v143.38 — Refresh server records after showing the saved device copy

Slow successful reads could be cancelled after 1.8 seconds whenever a cached
response existed. Background preparation could then reuse that same snapshot
and stop entirely if an unrelated dataset failed. Newly added server records
could remain invisible after a page refresh or sign-in.

Background refresh now allows the existing bounded eight-second read to finish,
retries after a previous reachability failure, and checks whether a cached
response was used. Independent dataset refreshes continue after an error;
incomplete preparation stays visible and retries. Reconnect refreshes share a
single job, and returning to an older tab rechecks its server data.

The initial device copy still opens quickly. Offline snapshots, account
isolation, denied-access responses, pending entries and posting receipts retain
their existing behavior. This change does not clear device storage or change
database records.

Validation: delayed server responses replace old records, the refreshed copy
remains available offline, HTTP 403 is not masked, an unrelated profile error
does not starve journal/payroll reads, and duplicate reconnect events do not
start duplicate refresh jobs.

Reporting calendars now retain their selection and reposition on window or visual-viewport resize instead of closing. Month/quarter/year navigation keeps focus without scrolling.
