# v143.21 — Approved action palette and independent budget categories

Shared desktop action buttons use emerald, forest green, brown, warm gold and sage. Templates no longer use violet; Add/New no longer use blue; output buttons no longer use teal. Navigation, calendar indicators and accounting currency badges retain their existing component styling. Narrow desktop canvases receive the same action decoration.

Budget Request header controls appear from left to right as **New Report → Print / PDF → Settings**. Settings is last at the right edge.

Budget category fields bypass account-picker decoration: no currency-symbol slot or account badge appears, even when a category name matches an account. Budget categories are editable text with optional suggestions from Budget Request Settings and the current request. Fresh settings contain no prefilled Salaries, Rent, Utilities or other accounting-style list. Budget categories and request/template currency choices do not query the Chart of Accounts; currencies come from the configured currency list. Existing saved requests, templates and explicitly saved budget categories are preserved. You may clear all saved suggestions in Budget Request Settings.

Validation: isolated runtime checks exercise temporary budget settings and request categories, independent currency choices, escaped suggestions, toolbar order, async hydration, palette contrast and narrow-desktop decoration. Static checks verify JavaScript parsing, bundle/source consistency, local assets and versioned offline asset mappings. The existing isolated PostgreSQL budget lifecycle suite verifies allocation finalization and history preservation. No live financial data or database settings are edited.
