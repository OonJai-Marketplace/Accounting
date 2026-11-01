# Accounting cleanup and database protection — v143.233

The user authorized removal of proven obsolete code and security/performance fixes that preserve normal workflows. This release follows the fresh v143.232 audit. Repository visibility, hosting, billing, accounting calculations and journal data were not changed.

## Retired code and retained dependencies

The embedded phone presentation had been replaced by the independent `phone.html` client. Real phones already redirect there before the desktop runtime starts. Nine exclusively related generated assets and their 21 canonical sources are removed: the embedded UI, its data wrapper, picker, pull-to-refresh, keyboard observer and dedicated styles. The removed generated assets total **149,044 bytes**. Their exact inventory and hashes are recorded in `validation/retired-phone233.json`.

The old `phone-accounting.html` URL remains as a small redirect that preserves query parameters and recovery fragments. The shared `PhoneApp132` API remains because desktop callers still use it. The current phone client retains its importer for earlier account-scoped drafts and immutable pending save requests. The common civil-date helper also remains. No device storage or old release cache was erased.

The retired iframe setup, its two observers and periodic refresh callback are removed from the shared bridge. The separate legacy keyboard observer is no longer loaded by desktop. Current screen designs and scanner behavior are unchanged. Older filenames elsewhere are not evidence of unused code; connected wrappers remain until their consumers can be safely replaced.

## Applied database changes

Migration: `supabase/migrations/20261101151747_cleanup_security233.sql`, applied to the Accounting project only.

| Change | Purpose and compatibility |
| --- | --- |
| Pin the search path of three invoker functions | Prevent caller-controlled function resolution. Keep their bodies and invoker privileges unchanged. |
| Cache `auth.uid()` within 33 policies across 27 tables | Avoid repeatedly obtaining the same identity for every row. Keep role, command, ownership and write-check conditions equivalent. |
| Remove one identical payroll policy | Remove duplicate permission work only after comparing every authorization field with its retained counterpart. |
| Index `staff_journal_lines.journal_entry_id` | Cover the journal-link lookup used by visibility checks. The inspected plan changes from sequential scan to index-only scan. This is not an application-wide speed benchmark. |
| Require explicit grants for future API objects | Stop new postgres-owned public tables, sequences and functions from receiving blanket anonymous/authenticated access. Keep all existing object grants and service-role defaults unchanged. New features must grant their intended API access explicitly and enforce ownership/RLS. |

The migration has short lock/statement timeouts and is idempotent. It contains no financial data updates or deletions. It does not force new logins or introduce extra approval screens.

## Verification

All **107 regression suites passed**, including 39 isolated backend scenarios in the new security suite. Coverage includes posting and retry behavior, payroll, staff permissions, approvals, recovery, account switching and future-object access denial. The security suite applies the exact migration to PostgreSQL fixtures, verifies equivalent policies and existing function permissions, repeats the migration, and checks that a hostile search path cannot replace the timestamp function used by the trigger.

One existing draft test initially referenced a deleted embedded-phone source. It now checks the retained current-client importer: own-account recovery, preservation of newer drafts, immutable-request deduplication, refusal of incomplete requests and retention of original browser data. Its allocation-template/save assertions remain. The initial failure and targeted successful rerun are recorded in `validation/accounting-audit143233-results.json`.

The build has 371 generated outputs, 607 wired canonical sources and 408 release-manifest assets. Build parity, source ownership, local references, release consistency and whitespace checks passed. All 237 shipped JavaScript files included in the syntax check parsed successfully.

Read-only comparisons around the live migration confirmed unchanged journal row counts and complete-row hashes, unchanged existing table grants, and unchanged execution grants/security modes for 272 application functions. All remaining policy expressions and metadata were equivalent after normalizing the cached identity calls. All public tables still have RLS enabled. Sanitized evidence is in `validation/security233-results.json`.

| Advisor finding | Before | After |
| --- | ---: | ---: |
| Mutable function search path | 3 | 0 |
| Repeated RLS identity evaluation | 33 | 0 |
| Multiple permissive policies | 19 | 15 |
| Foreign keys without covering indexes | 106 | 105 |

Tests use synthetic browser and isolated SQL fixtures. No production financial test transactions, physical-phone camera tests, native-app rebuild or live Google authorization flow were performed.

## Remaining review items

Advisor findings are not automatically defects. The no-policy tables inspected are intentionally closed to direct client access; guard and application RPCs need their existing execution grants. Remaining policy combinations express different access paths. Indexes were neither added nor removed merely to clear an advisor notice.

Two infrastructure items need a separate migration plan: the non-relocatable `pg_net` extension and the `regprocedure` column in `workspace_hook_config138`, which has a database-upgrade compatibility notice. Neither was dropped or rewritten during this cleanup.

Supabase leaked-password screening remains disabled. [Supabase documents this feature as available on Pro and above](https://supabase.com/docs/guides/auth/password-security). Enabling it is a separate Auth configuration decision; no subscription or billing change was made.

## Repository privacy and joining the app

A private repository is optional source-code privacy, not the database access boundary. Browser code is delivered to users even when its source repository is private. Database authentication, authorization and secret handling still enforce access.

Users can use and join a publicly hosted app whose source repository is private; they do not need repository access. However, [GitHub documents that changing a repository to private on GitHub Free unpublishes its Pages site](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility). [Private-repository Pages hosting requires a supported paid plan](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages). Confirm suitable hosting before changing visibility. Existing public forks or copies are not made private by changing this repository.

The repository remains public. Hosting changes, paid settings and larger connected-code consolidation require a separately reviewed scope.
