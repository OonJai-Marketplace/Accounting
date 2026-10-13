# Phase 0 checkpoints

Baseline: `71e7a8e28bba8b438d07cd30d6e8eb6d44cc8fad`.
Working branch: `phase-0-modularization`. No production publication is part of this work.

- **0.1–0.2:** Current deployed assets extracted with their original script order,
  CSS order and standalone variants. Checkpoint `8db0be7`.
- **0.3:** Shared state, number/date formatting, dialogs, authentication,
  permissions, navigation, loading and sync have explicit source owners.
  The desktop backbone is separated at existing source boundaries; its shared
  scope, overrides and registration order remain intact.
  Structural gate: 452 runtime files unchanged, 328 source sections wired,
  254 generated assets checked, no generated changes.

Source sections are concatenated in `manifest.json` order. A section may depend
on declarations in an earlier or later section of the same classic script.
Do not load individual sections as independent scripts or change their order.

The earlier baseline phone offline sign-in test timed out for both administrator
and staff setup. That is an unresolved baseline test result, not a verified
regression or a reason to change login behavior during this restructuring.

- **0.4:** Bookkeeping journal, history, finalization, recurring entries and
  account controllers own their extensions. Mixed transaction overrides now have
  distinct journal/audit/import/export sections. Gate: 452 unchanged runtime
  files; 351 source sections; 269 checked generated assets.

- **0.5:** Sub-user entries, review, history, assigned funds and both phone
  clients have named source sections; phone rendering, auth, storage and sync
  preserve their original closures. Gate: 452 unchanged runtime files;
  414 sections; 292 generated assets checked.

- **0.6:** Sub-users–Bookkeeping submission, reconciliation, consolidation and
  journal preparation have explicit bridge ownership. Gate: 452 unchanged
  runtime files; 425 sections; 297 generated assets checked.

- **0.7:** HR employee, contract, attachment, leave and calendar sources
  separated; attendance save remains the existing payroll bridge.
  Gate: 452 unchanged runtime files; 438 sections; 304 generated assets.

- **0.8:** Payroll calculations, workspace and reports separated. Mixed v82/v97
  sources now route HR, shared storage, operational reports, financing, journal
  history and lazy loading to their owners. Gate: 452 unchanged runtime files;
  466 sections; 304 generated assets.
