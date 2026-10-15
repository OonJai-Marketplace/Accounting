"""Verify the completed 110-file inventory against the actual reviewed bytes."""
from pathlib import Path
import hashlib
import json
import re
import subprocess
ledger = json.loads(Path('validation/audit-review-progress.json').read_text())
names = [p for p in subprocess.check_output(['git', 'ls-files']).decode().splitlines()
         if Path(p).suffix in {'.html', '.js', '.mjs', '.ts', '.css', '.sql'}
         and not p.startswith(('src/', 'scripts/', 'styles/', 'validation/', 'tools/'))]
assert len(names) == 110
assert not ledger['partial_review']
for name in names:
    record = ledger['third_party'].get(name) or ledger['reviewed'].get(name)
    assert record and record['sha256'] == hashlib.sha256(Path(name).read_bytes()).hexdigest(), name
    if name not in ledger['third_party']:
        ranges = record['ranges']
        covered = {line for start, end in ranges for line in range(start, end + 1)}
        assert set(range(1, len(Path(name).read_text().splitlines()) + 1)) <= covered, name
worker = Path('desktop-sw14242.js').read_text()
version = re.search(r"VERSION='([^']+)'", worker)[1]
assert f"SHELL_VERSION='{version}'" in Path('src/core/sync/offline14239.js').read_text()
for name in ('offline14239', 'optional-tools14335', 'document-import-v1422', 'document-downloads14311'):
    assert f'scripts/{name}.js?v={version}' in worker
assert f'document-import-v1422.js?v={version}' in Path('scripts/optional-tools14335.js').read_text()
print('PASS: all 110 files have complete review records matching shipped SHA-256; release/cache versions agree')
