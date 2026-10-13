"""Structural gate: extraction identity plus explicitly approved final corrections."""
from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parent.parent
baseline = json.loads((ROOT / 'validation/phase0-baseline.json').read_text())
correction_file = ROOT / 'validation/phase0-corrections.json'
corrections = (json.loads(correction_file.read_text())['runtime_sha256']
               if correction_file.exists() else {})
assert set(corrections) <= set(baseline['runtime_sha256']), 'Unknown correction asset'
retired = set(json.loads(correction_file.read_text()).get('retired_assets', {})) if correction_file.exists() else set()
assert retired <= {'tools/desktop-source14245.html'}, 'Unapproved retired asset'
assert all(not (ROOT / name).exists() for name in retired), 'Retired builder snapshot returned'
changed = [name for name, digest in baseline['runtime_sha256'].items()
           if name not in retired and hashlib.sha256((ROOT / name).read_bytes()).hexdigest() != corrections.get(name, digest)]
assert not changed, f'Runtime bytes differ from extraction/approved corrections: {changed}'
manifest = json.loads((ROOT / 'src/manifest.json').read_text())
sources = {part['source'] for parts in manifest['outputs'].values() for part in parts}
runtime_products = {str(p.relative_to(ROOT)) for folder in ('scripts', 'styles')
                    for p in (ROOT / folder).iterdir() if p.suffix in ('.js', '.css')}
assert set(manifest['outputs']) == runtime_products, 'Application assets missing canonical source ownership'
assert not any('/legacy/' in name for name in sources), 'Unclassified source ownership'
assert all(parts for parts in manifest['outputs'].values()), 'Empty generated asset definition'
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
print(f'PASS: {len(baseline["runtime_sha256"])-len(corrections)-len(retired)} unchanged runtime assets; {len(corrections)} explicitly recorded corrections; {len(sources)} wired source modules; full script/style ownership; local HTML references')
