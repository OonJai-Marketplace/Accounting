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
Files still under `legacy` are awaiting ownership separation. Existing standalone
modules outside this directory remain authoritative unless listed as outputs.

These are ordered source modules, not isolated ES modules. Existing globals,
event hooks, and shared stores remain their public interfaces. Keep their order
when correcting a feature. Some desktop bundled variants intentionally differ
from standalone/lazy-loaded versions; the manifest records each separately.
