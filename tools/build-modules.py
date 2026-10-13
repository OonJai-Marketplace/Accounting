"""Build the ordered classic-script/CSS assets without changing runtime boundaries.

The manifest is authoritative. No HTML, configuration, vendor assets, or database
files are written. Use --check in CI and after editing a module.
"""
from pathlib import Path
import argparse
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / 'src/manifest.json'


def build(check=False):
    manifest = json.loads(MANIFEST.read_text())
    products = {}
    for output, parts in manifest['outputs'].items():
        target = ROOT / output
        if target.parent not in (ROOT / 'scripts', ROOT / 'styles'):
            raise ValueError(f'Invalid generated target: {output}')
        chunks = []
        for part in parts:
            source = (ROOT / part['source']).resolve()
            if not source.is_relative_to(ROOT / 'src'):
                raise ValueError(f'Invalid module path: {source}')
            chunks.append(part.get('prefix', '').encode() + source.read_bytes()
                          + part.get('suffix', '').encode())
        products[target] = b''.join(chunks)
    stale = [str(p.relative_to(ROOT)) for p, data in products.items()
             if not p.exists() or p.read_bytes() != data]
    if check:
        if stale:
            raise SystemExit('Generated assets out of date: ' + ', '.join(stale))
    else:
        for path, data in products.items():
            if str(path.relative_to(ROOT)) in stale:
                path.write_bytes(data)
    # Check whole products: the legacy runtime deliberately shares lexical scope.
    for path in products:
        if path.suffix == '.js':
            subprocess.run(['node', '--check', str(path)], check=True,
                           stdout=subprocess.DEVNULL)
    print(f'{len(products)} generated assets checked; {len(stale)} changed')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    build(parser.parse_args().check)
