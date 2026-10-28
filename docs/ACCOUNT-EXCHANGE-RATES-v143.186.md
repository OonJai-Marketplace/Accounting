# Account exchange rate review — v143.186

Main Journal, AI Journal draft cards, and AI preparation show entered FX, entered book rate, account average and used-rate difference below each foreign-currency transaction. They never replace entered rates. The average is account-specific and uses the effective posting date; another account using the same currency is not a substitute. Online posting refreshes the comparison and retains the entry for review if the average changed. Offline manual posting retains the established durable queue.

`account_exchange_rates143186` is a read-only, security-invoker RPC. It uses one database snapshot, posted records only, the requested year through the requested effective date, and explicit annual opening entries. This matches the app's annual opening policy. Editing excludes the original entry by ID/number. Saved LAK amounts take precedence, then recorded book/FX rates. Missing valuation, zero balance, inconsistent signs and negative regular-asset balances have no usable average. Credit balances on liabilities and technical accounts remain supported. Anonymous access is denied and authenticated users must pass the journal/workspace checks.

The device comparison uses the already projected journal (including durable edits/voids) once; it does not add the outbox a second time. It labels local estimates and unavailable periods. It cannot know about unsynced work on another device. The database column is a timestamped snapshot, not an assertion that all devices are synced.

The configured Journal Submission Inbox now has `Account Exchange Rates` (A:M). Account ID is retained in hidden column A for exact matching. Column G is the book-rate reference; H indicates availability; I/J identify the date and snapshot time. `Start Here` includes lookup guidance. Actual transaction FX stays separate, and backdated drafts require a date-appropriate rate.

The existing one-minute Google inbox poll also publishes this fixed tab from the database RPC, using one atomic Sheets batch with raw numeric/text values and clearing outdated trailing values. Client-provided rates/workbook destinations are never accepted. Failure preserves the last published data and timestamp. `rates-refresh` supports an authenticated refresh through the same restricted bridge.

Deployment verification: the database RPC was verified as an authorized administrator and its anonymous/service grants checked. The Sheets connector populated and read back all 49 active foreign-currency accounts. The app's pre-existing Google refresh authorization was expired/revoked during deployment: the automatic path is deployed but live Google refresh cannot complete until the administrator uses AI Journal → Connect/Reconnect Google. The one-time snapshot remains explicitly labelled until the background connection publishes again.

Validation:
- `test-account-rates143186.cjs`: real browser main-journal Post guard, per-account comparison, changed averages, preserved inputs, device estimates, date/edit exclusions, missing/zero/negative balances, desktop/tablet layout.
- `test-rate-ai-review143186.cjs`: real AI draft/preparation rendering, changed-rate direct-post guard, edited book rate and unchanged submitted FX/book values.
- `test-rate-ai-regression143186.cjs`: current inbox delta protocol, stacked AI edits, separate entries and failed-batch retention in Chromium.
- `test-rate-snapshot143186.cjs`: isolated PostgreSQL formula, cutoffs, exclusion, balance states and authorization.
- `test-rate-sheet143186.cjs`: literal text, numeric precision, blank unavailable rates, bounds and stale-row clearing.
- Existing FX, AI amount display, draft validation, AI stack/retry checks, canonical build and release checks pass. No financial test entries were posted to the live database.
