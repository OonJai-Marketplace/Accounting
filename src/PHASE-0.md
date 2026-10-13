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
