# v143.93 — automatic selection and independent journal diagnostics

- Removed the Select amounts/Clear toolbar and persistent selection mode. Normal amount clicks, Ctrl/Cmd-click and Ctrl/Cmd-drag select amounts. Releasing the key and using results/copy retain selection; clicking elsewhere or Escape clears it. Numeric editing and standard paste remain unchanged.
- Foreign selections use their own currency rate, regardless of the most recently touched rate field. USD and THB calculations occupy separate columns. When LAK cells are also selected, their sum is compared with the combined LAK equivalent; no allocation is inferred. LAK-only reverse conversion uses the explicitly chosen rate.
- Reduced footer spacing and removed the toolbar row. The footer remains fixed from the sidebar boundary to the right screen edge, with content and floating-button clearance. It runs only while amount cells are selected and stops when selection clears or the user leaves Journal. No automatic fund/history calculations run without a selection.
- Restored the full-entry balance message to the entry action area as plain red text. It appears after journal input begins and hides on Reset. It shows all outstanding currency/date differences, independently of selected-cell arithmetic; posting validation is retained.
- Pressing, clicking or focusing a journal row highlights only that row, without selected top/bottom shadows. Shared Date and Entry ID cells retain their original neutral backgrounds. Entry IDs are plain text with no dotted underline or single-click menu. Double-click/Enter opens Edit and Void where permitted; View entry is included on tablets only.

Verified on desktop and tablet with calculation and journal-interface suites, including Ctrl selection/drag, copy/paste, mixed-currency columns, independent balance/posting validation, startup/reset visibility, row press/focus, and device-specific menus. Canonical build and release checks accompany publication. No database changes.

The published release includes the generated stylesheet and a fresh cache version so every device receives the verified layout.
