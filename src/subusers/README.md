# Sub-users

| Area | Sources | Existing interfaces |
| --- | --- | --- |
| Working entries and corrections | `entries/` | `saveWorkspaceEntry`, `persistWorkspaceSingleRow`, `personalJournal1437` |
| Submitted or returned reports | `review/` | `openWorkspaceReview`, `reopenWorkspaceSubmission`, `renderUserEntryReview` |
| Submitted history and comparisons | `history/` | `loadMySubmittedStaffJournals`, `openSubmissionComparison` |
| Assigned funds and ledgers | `accounts/` | `workspaceRules`, `funds113`, `v49FundActivity` |
| Home, user tabs and layout | `workspace/` | `TeamHome14227`, `renderSubUserWorkspace` |
| Independent phone client | `phone/runtime/` | `PhoneWorkspace14242` |
| Embedded phone presentation | `phone/connected/` | Parent `PhoneApp132` bridge (see `core/navigation/phone-bridge132.js`) |

The two phone clients are deliberately separate. Each now has named sections for
entries, history, navigation, session handling, persistence and synchronization.
Their existing closure-local state remains private; concatenate the complete
manifest sequence, including opening/closing sections, before execution.

Approval and journal preparation are owned by `../bridges/subusers-bookkeeping/`.
Record status rules, ownership, source entry IDs and correction/reopen behavior
are preserved as implemented at the baseline, including any pre-existing defects.
