"""Structural regression gate: byte identity, local references and source build."""
from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parent.parent
baseline = json.loads((ROOT / 'validation/phase0-baseline.json').read_text())
changed = [name for name, digest in baseline['runtime_sha256'].items()
           if hashlib.sha256((ROOT / name).read_bytes()).hexdigest() != digest]
assert not changed, f'Phase 0 changed runtime bytes: {changed}'
manifest = json.loads((ROOT / 'src/manifest.json').read_text())
sources = {part['source'] for parts in manifest['outputs'].values() for part in parts}
for name in sources:
    assert (ROOT / name).is_file(), name
assert not [str(p.relative_to(ROOT)) for p in (ROOT / 'src').rglob('*')
            if p.suffix in ('.js', '.css') and str(p.relative_to(ROOT)) not in sources], 'Unbuilt source'
for name in ('index.html', 'desktop.html', 'phone.html', 'phone-accounting.html', 'recovery.html', 'archive.html', 'setup.html'):
    text = (ROOT / name).read_text()
    for url in re.findall(r'(?:src|href)=[\"\']([^\"\']+)', text):
        path = url.split('?')[0].split('#')[0]
        if path and not re.match(r'(?:[a-z]+:|//|/|\{)', path, re.I):
            assert (ROOT / path).exists(), (name, path)
subprocess.run(['python', str(ROOT / 'tools/build-modules.py'), '--check'], check=True)
print(f'PASS: {len(baseline["runtime_sha256"])} unchanged runtime assets; {len(sources)} wired source modules; local HTML references')
