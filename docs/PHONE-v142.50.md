# Phone fixes v142.50

- Keep the signed-in administrator in the phone workspace directory independently of the Branch Home cache. Module permission and Organization.mayOpen checks still apply. This fixes navigation rejecting the administrator's own workspace while refreshed Home data is delayed.
- Build replacement workspace content before replacing its visible DOM. If construction fails, restore the previous button handlers and navigation location. Report refresh errors instead of silently discarding them.
- Consolidate phone Settings into Home, Users, and Profile. A single Edit user action opens the main native editor; permissions and account assignments remain available there. Existing saved Access locations route to Users.
- Distinguish Post entry groups with stronger green borders. Normalize inner controls to 44px, align paired columns and account/money wrappers, and keep hidden native selectors from overflowing narrow phones.

Validation uses isolated browser fixtures: delayed Home refresh with administrator and other-user navigation, injected renderer failure with working retained Print action, actual permission denial, Settings editor routing, entry-description regression tests, offline reopening, and 390px/320px visual layout inspection. No production data changes. Desktop/tablet layouts and database rules are unchanged.
