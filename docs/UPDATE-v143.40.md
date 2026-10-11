# v143.40 — larger journal navigation

Keep the complete downloaded journal in memory while rendering Active Journal in pages of 50 complete entries. Search scans all loaded entries and includes every line of a matching entry. Posting, editing and reporting continue to use the full model. Closed History month details render when opened; existing month summaries and exports retain all entries.

Journal download stages now finish before one full-table refresh. Hidden journal/history and legacy account report tables are not rebuilt while another workspace is active. General-description rendering indexes each entry and its rows once. Device sync assessment renders only when visible; findings and closing guards remain active. Unrelated encrypted storage broadcasts and another tab's navigation no longer trigger duplicate local journal refreshes; translated record events still reach existing handlers.

Local Chromium test: 1,000 journals / 10,000 lines. Cumulative refresh work fell from about 8.1 seconds to roughly 0.08–0.10 seconds; journal-page DOM fell from about 127,000 elements to under 10,000. These are local measurements, not guarantees for every device or network. Regression coverage includes all pages, cross-page search, retained journal lines, lazy history, browser storage event filtering, offline saves and cache recovery. No test records were added to the live database.
