# Application source modules

Edit the modules under this directory, then run:

```sh
python tools/build-modules.py
python tools/build-modules.py --check
python validation/test-phase0-structure.py
```

`manifest.json` preserves the exact classic-script order, script boundaries,
separators, CSS cascade, and generated compatibility paths. GitHub Pages serves
the existing committed assets; no runtime loader or additional requests are needed.
Commit source and regenerated assets together. Do not edit generated files directly.

The extraction baseline is commit `71e7a8e28bba8b438d07cd30d6e8eb6d44cc8fad`.
Current deployed bundles are authoritative; the older desktop builder is retired.
Every application JavaScript and CSS asset in `scripts/` and `styles/` now has
canonical sources here. HTML entry points, root service-worker/cache assets,
deployment configuration, vendor assets and database files remain in place.

These are ordered source modules, not isolated ES modules. Existing globals,
event hooks, and shared stores remain their public interfaces. Keep their order
when correcting a feature. Some desktop bundled variants intentionally differ
from standalone/lazy-loaded versions; the manifest records each separately.

## Where to work

| Area | Source location |
| --- | --- |
| Login, session, startup, permissions, navigation, offline/sync | `core/` |
| Shared state, storage, formatting, dialogs and presentation | `shared/` |
| Chart of accounts, currencies, sub-accounts, opening balances | `accounts/` |
| Journal, history, finalization, templates, recurring entries | `bookkeeping/` |
| Entries, review, history, assigned funds, both phone clients | `subusers/` |
| HR, Payroll and cross-module handoffs | `hr/`, `payroll/`, `bridges/` |
| Financial, statutory, voucher and saved reports | `reports/` |
| Document editing, import and export | `documents/` |
| Business, user, application and installation settings | `settings/` |
| Backup, archive, audit and diagnostics | `maintenance/` |
| Budget requests and dashboard | `budget/`, `dashboard/` |

This is source separation, preserving the existing classic-script interfaces.
Sections called `scope-and-state`, `scope-open` or `scope-close` deliberately
retain an original closure across source files. They are build inputs, not
standalone browser modules. Do not add separate script tags for these sections.

Version suffixes identify the original override layer. They are retained where
merging or deleting a wrapper would risk changing behavior. Fix the active
implementation using the manifest's output order, then rebuild and test.

Use `python tools/source-map.py --find submitJournalEntry` to locate source
occurrences and generated asset line ranges. `python tools/source-map.py` prints
the area inventory. `PHASE-0.md` records verification and known limitations.
