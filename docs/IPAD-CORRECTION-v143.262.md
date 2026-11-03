# iPad journal correction — v143.262

Account selection uses the shared dropdown without opening a typing field in
all tablet sub-user workspaces, in both cashbook and double-entry mode, and in
the main journal. Existing desktop typing and phone pickers remain available.
Read-only account fields retain their prior journal text size.

The resize handler previously included hidden Date and Action cells in its
colgroup. Those columns displaced the visible widths. It now maps visible
headers, updates handle indices after date-mode changes, and anchors handles
to their actual header. Incompatible old saved widths no longer match the
visible-header key; saved data and other table preferences are not deleted.

Tablet fitting now uses visual viewport width multiplied by its scale, which
stays stable across keyboard-height changes and pinch gestures. This preserves
the 1280px desktop canvas and the permitted zoom range, while fitting each
orientation and the available Split View width. Opening a dropdown no longer
scrolls the workspace to reserve an entire list below the field. The list fits
above or below within the visible viewport; keyboard navigation scrolls only
the choices.

Validation:
- Node regression checks: portrait and landscape fit, height-only resize,
  pinch preservation, Split View, hidden-column and grouped-header mapping.
- Isolated full-app Chrome fixture using synthetic data and tablet geometry:
  landscape 1194×834 and portrait 834×1194; readonly/inputmode=none on journal
  fields and cashbook source/category fields in Gee's workspace; no picker
  search textbox; selection updates the row.
- Real mouse drag on Account: 331.72px to 406.75px, while Memo stayed 467.28px.
  Enabling Date changed Account's resize index from 0 to 1 correctly.
- Reduced visible height: account list opened above the field, top 45.89px,
  bottom 335.89px, with workspace scroll unchanged at 0.
- Generated-source, release/cache and source-ownership checks run before release.

Limits: these are synthetic geometry and browser interaction checks, not a
physical iPad, iPadOS Safari, native keyboard, or real pinch test. Fixture account
permissions are synthetic; no production journals or financial data were changed.
