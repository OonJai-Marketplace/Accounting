# v143.65 — Reuse unchanged presentation work

The user requested a website-wide navigation assessment and research into Excel and Google Sheets performance, followed by applying useful principles to Version 1.

## Research

- Google INP guidance: visual responsiveness at or below 200 ms is good; above 500 ms is poor. This is next-paint feedback, not the completion of every asynchronous operation: https://web.dev/articles/inp
- Microsoft describes smart recalculation, dependency tracking and reuse of calculation sequences: https://learn.microsoft.com/en-us/office/vba/excel/concepts/excel-performance/excel-improving-calculation-performance
- Google's Sheets engineering case study describes a calculation engine in a Web Worker, communicating with the main thread, and the WasmGC migration: https://web.dev/case-studies/google-sheets-wasmgc
- Rendering a bounded visible window is a documented browser-table technique; this is not a claim about unpublished Sheets rendering internals: https://web.dev/articles/virtualize-long-lists-react-window

## Applied changes

Retain formatted date-label state until its value, type, disabled state, configured date format or label element changes. Reuse Intl month formatters. Numeric date formats no longer compute unused short and long month names.

Retain panel-decoration state for unchanged surfaces. Added or removed layout elements invalidate their containing surface. Table-row mutations do not invalidate panel borders. Resize, appearance changes and printing retain their existing refresh behavior. Existing calendar, date preferences, panel appearance, accounting calculations and records are preserved.

Source and generated bundles are committed together, with versioned browser-cache assets.

## Assessment and validation

A local Chromium diagnostic visited 57 permitted navigation destinations. The comparable small-data runs measured median two-frame navigation proxies of 104.6 ms before and 86.4 ms after; total TaskDuration over the observed windows was 8074.2 ms before and 6830.1 ms after. These are synthetic diagnostic measurements, not field INP or a guarantee for the user's laptop. The largest remaining sampled costs include panel border checks, shell synchronization, account-picker control enhancement, and report-button normalization. Sub-user workspace, account navigation and document editor were among the slowest destinations in these runs.

A separate 1,000-line trusted sidebar diagnostic timed out on its readiness criterion at Sub-Users. A larger-data 4x-CPU full sweep was stopped after several minutes without a completed report. Neither is evidence of successful large-data performance. The exact real-device 1–2 second delay remains unconfirmed. Standalone phone performance is outside these desktop measurements.

Regression checks cover all nine supported date formats, live format changes, calendar opening, dynamic panel styling, retained controls, resize, invalid/blank dates, prepared screens, payroll retention, journal refresh, System parents and Mapping. Generated-asset and source-ownership checks pass.

## Priorities beyond this release

1. Replace broad page observers and repeated control decoration with change-scoped updates, retaining current visuals.
2. Review broad hidden-workspace invalidation after data/settings changes; preserve correct refreshes while scheduling only affected work.
3. Keep loaded records separate from rendered rows. Existing journal paging already limits visible rows; investigate other large lists before changing their behavior.
4. Consider a worker for measured heavy calculations, not DOM styling (workers cannot directly manipulate the page).
5. Do not remove audit trails, saving, permissions or offline recovery to gain speed. Optional dashboard summaries and cosmetic effects are candidates only if they show meaningful cost in further measurement.
