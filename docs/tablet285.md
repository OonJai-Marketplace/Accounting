# Tablet layout corrections — v143.285

User-reported failures: right gutter and unstable zoom after rotating, keyboard
focus closing or moving away from journal cells, hidden journal actions, a short
portrait sidebar, tiny 120% text and clipped sub-user banners.

The tablet uses one 1280px viewport declaration without repeatedly rewriting
initial-scale. Safari owns native fitting and pinch zoom. Shared viewport metrics
track device orientation, fitted text compensation, unoccluded shell height and
the keyboard-visible main workspace. All three retained navigation handlers use
device orientation rather than the keyboard-shortened page aspect ratio.

The journal reveals native inputs and contenteditable memo carets inside the
workspace, accounting for sticky tabs and the action bar. The workspace shrinks
above the keyboard without adding a large spacer; closing the keyboard restores
its original padding. The sidebar retains full height. Typography compensates
for initial fitting only, preserves the saved font preference, and retains print
sizing. Banners and quotations flow with their content. Native account buttons
are installed before first-touch default focus; labels target visible controls.

Verification:

- Eight synthetic viewport regression groups: orientation, pinch, keyboard,
  focus changes, viewport offsets, keyboard rotation, dismissal and device scope.
- First-touch picker regression: native button before observer delivery, label
  target, selection retention, source isolation and no tablet search textbox.
- Existing native picker and touch column-resize regressions.
- Chrome rendered actual shipped CSS and shared scripts at 834/1194 and 768/1024
  portrait/landscape widths plus 507px Split View. Shared journal and cashbook
  controls used synthetic records; no database connection or real posting.
- At 1024px and 1194px landscape with a simulated 330px keyboard, the edited
  memo remained above the actions, and the actions above the keyboard.
- Source generation, runtime ownership and fresh changed-asset cache keys.

Limits: no physical iPad, iPadOS Safari, real software keyboard or browser-toolbar
rotation sequence was available. The browser fixture validates rendering and
simulated geometry, not native Safari behavior. The historical Playwright tablet
refresh suite could not run because its configured /tmp/chromium binary is absent;
no replacement browser was installed. Pull-to-refresh code is unchanged.

Run `validation/build-tablet-preview285.py` to generate the local-only preview
pages. The new Node tests require jsdom. Historical tests for the retired dynamic
initial-scale algorithm are superseded by `test-tablet-viewport285.cjs`.

No financial records, permissions, payroll calculations or database schema changed.
