# Sub-users

| Area | Sources | Existing interfaces |
| --- | --- | --- |
| Working entries and corrections | `entries/` | `saveWorkspaceEntry`, `persistWorkspaceSingleRow`, `personalJournal1437` |
| Submitted or returned reports | `review/` | `openWorkspaceReview`, `reopenWorkspaceSubmission`, `renderUserEntryReview` |
| Submitted history and comparisons | `history/` | `loadMySubmittedStaffJournals`, `openSubmissionComparison` |
| Assigned funds and ledgers | `accounts/` | `workspaceRules`, `funds113`, `v49FundActivity` |
| Home, user tabs and layout | `workspace/` | `TeamHome14227`, `renderSubUserWorkspace` |
| Independent phone client | `phone/runtime/` | `PhoneWorkspace14242` |
| Shared desktop helpers | `core/navigation/phone-bridge132.js` | `PhoneApp132`; the old embedded phone URL redirects to the independent client. |

The independent phone client has named sections for entries, history,
navigation, session handling, persistence and synchronization. The retired
embedded presentation is no longer shipped. Its saved-draft importer remains
in the current client so earlier device work can still be recovered.
Their existing closure-local state remains private; concatenate the complete
manifest sequence, including opening/closing sections, before execution.

Approval and journal preparation are owned by `../bridges/subusers-bookkeeping/`.
Record status rules, ownership, source entry IDs and correction/reopen behavior
are preserved as implemented at the baseline, including any pre-existing defects.
