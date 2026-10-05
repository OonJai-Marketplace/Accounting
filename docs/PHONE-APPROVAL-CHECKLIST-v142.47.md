# Approved phone checklist — v142.47

The phone presentation keeps the existing authenticated accounting runtime and atomic database save functions. Desktop/tablet retain their full workspace. Phone navigation and startup data requirements are limited to the Sub-users workflow, administrator sub-user settings, and documents.

| # | Requirement | Implementation / verification |
|---|---|---|
| 1 | Administrator phone scope | Sub-users landing; Dashboard, Transactions and general Accounts blocked by phone route guard and absent from menu. Browser checked. |
| 2 | Focused phone interface | Independent phone presentation; no desktop module navigation. Existing shared authentication/posting retained. |
| 3 | Remove decorative content | Phone logo/photo requests removed; no banners. Browser checked. |
| 4 | Bottom navigation | Menu, Home, Accounts, Post, Entries, History. Browser checked. |
| 5 | Home summary | Balance hero, summary with opening/added/used/remaining, account breakdown. Browser checked. |
| 6 | Unsubmitted Entries | Draft/returned groups only; no date picker. Browser checked. |
| 7 | Submitted History | Submission groups and nested entries, including Under review. Browser checked. |
| 8 | Staff name tabs | Hidden. Staff-role browser check. |
| 9 | Compact administrator tabs | Abbreviated labels, compact sizing. Browser checked. |
| 10 | Entry type switch | Single/Double switch retained. Round-trip browser check. |
| 11 | Direction switch | Money In/Out switch respects assigned directions. Validation reviewed. |
| 12 | Single Entry layout | Date/Amount; Source; Category; Line Memo/Reference; General Description. Browser checked. |
| 13 | Add Line | Repeats complete group; each date and description preserved in atomic save payload. Browser checked. |
| 14 | Entry identification | Existing server entry number displayed when editing; new entry honestly states Assigned when saved. |
| 15 | Source restrictions | Assigned funds only. Browser and validation checks. |
| 16 | Category restrictions | Permitted directions/accounts only. Browser and validation checks. |
| 17 | Currency badges | Existing compact symbol before cleaned account name retained. Browser checked. |
| 18 | Double Entry | Grouped debit/credit lines and balance summary retained; mode round-trip tested. |
| 19 | Large amounts | Dynamic font fitting after money formatting; decimal values retained. Browser checked. |
| 20 | Account search | Searchable account picker and currency badges. Browser checked. |
| 21 | Submit/Print | Available on Home and Entries subject to existing permissions. Browser checked. |
| 22 | Bottom menu | Menu in bottom navigation; no floating menu. Browser checked. |
| 23 | Avatar controls | Profile and sign-out retained in avatar menu. Source reviewed. |
| 24 | Appearance | Forest green, cream panels, consistent warm orange borders/actions. Screenshots checked. |
| 25 | Attention grouping | Existing grouped Attention cards retained. Browser checked. |
| 26 | Centered notifications | Phone and desktop centered dialog/status checks pass. |
| 27 | Documents | Existing full-page mobile editor retained; staff save controls removed, Print available. Source and browser checked. |
| 28 | Weak connection navigation | Timeouts, retained data and late-response protections checked. |
| 29 | Last location | Valid phone page restored; obsolete Totals migrates to History and excluded routes rejected. Reload browser check. |
| 30 | Relevant data loading | Phone startup skips journal/legal/submission background task sweep; phone accounts scoped to permitted workspaces. Existing authenticated data boundary retained. |

Validation uses fixture records, not production financial writes. No live entries, submissions, permissions or company documents were changed by the tests. Server-assigned entry numbers are not predicted. Multiple-date Single Entry groups cannot be converted to a single-date Double Entry until saved, preventing silent date loss.
