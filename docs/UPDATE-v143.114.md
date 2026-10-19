# v143.114 — Initial numbering and Accounting settings

- Main journal uses `OJM260001`; sub-user IDs use `S` plus configured initials, two-digit transaction year and four-digit number. Scheduled postings and fund requests use the same compact format.
- Main/automated journals retain the existing shared posting sequence. Schedule and adjustment references retain their separate sequences. A counter is never reset by deletion, navigation, filtering or changing the year.
- Explicit initial-setup reset was guarded by empty journal and staff-entry tables. Main journal next number is 1; existing sub-user counters are 0 (next number 1). The two preserved schedule definitions are SCH260001 and SCH260002; the next schedule is SCH260003.
- Sub-user prefix rows have four columns and save atomically with Accounting settings. Prefix reservation checks, existing RLS, permissions and idempotent posting remain in place.
- Accounting, Vouchers and Currency Manager banners display their selected subsection, rather than Ledger. Payroll is unchanged.

## Verification

- `node validation/test-compact-ids143114.cjs`: formatting, selected transaction year, overflow, no reset from empty views, removal of row buttons, shared settings save payload and date-aware preview passed.
- `validation/test-compact-ids143114.sql`: database posting produced OJM260001 and OJM260002, previews advanced, sub-user previews were stable, schedule/adjustment formats passed, and settings saved under the authenticated admin role. All financial test records and sequence restarts rolled back.
- Anonymous access to the new previews/save RPCs is denied. Security advisory changes are limited to the two intentional permission-checked signed-in preview RPCs.
- Canonical module build and structural asset checks passed.
- Browser visual QA was unavailable because this environment has no installed browser executable.
