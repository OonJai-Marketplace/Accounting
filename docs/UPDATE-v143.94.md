# Journal interaction and layout — v143.94

Approved 2026-10-16: publish the journal refinements, including the later clarification that balance guidance belongs at the far left and entry boundaries must be uniformly green.

- Calculator selection changes only through Ctrl/Cmd-click, Ctrl/Cmd-drag, or its checkbox. Plain clicks edit, release of modifiers preserves selection, and explicit deselection/Reset/navigation removes it. No calculation or rate reads without a selection.
- Bottom bar stays fixed from the sidebar edge to the screen edge, with two 20px text lines, compact copy icons and horizontal scrolling for longer equations. The whole-entry balance check remains independent and at the far left of the action row. Content padding and floating controls follow the bar height.
- Shared active/history journal Account width increases from 18% to 19.8%, taking the same space from Memo. Date/ID are centered; shared cells retain their original background. Entry dividers are green across shared and individual cells.
- History no longer opens an ID-only action menu. Tablet View Entry remains available. Active entry menu IDs are centered and Edit/Void remain intact.
- Entry Options offers only the alternate Single/Double mode, retaining both template commands.

Validation: calculation and entry UI browser regressions on desktop and tablet; responsive journal layout at 1440/1024/768px and both tablet orientations; shared personal journal layout; build/source ownership and release hash checks. Browser tests use isolated fixture data. No database migrations or financial posting calculations changed.

Update behavior: update.html is an explicit offline-file recovery/preparation route. Normal index/desktop entry points check for releases in the background. This release changes only necessary desktop asset version queries; phone layout is unchanged.
