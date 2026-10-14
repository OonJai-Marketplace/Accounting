"""Refresh diagnostics hashes after building reviewed sources; --check detects drift.

This records byte identity, not test results or audit completion. Preserve the
comparison foundation and documented behavioral checks. Mutable company deployment
configuration and the separately published calendar feed are intentionally excluded.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / 'assets/maintenance/release14324.json'
MARKER = re.compile(r'/\* ((?:scripts/[^\n]+\.js|styles/[^\n]+\.css)) \*/\n')

def build():
    manifest = json.loads(TARGET.read_text())
    version = re.search(r"const SHELL_VERSION='([0-9]+\.[0-9]+)'", (ROOT/'src/core/sync/offline14239.js').read_text())
    if not version:
        raise ValueError('Application release is missing')
    outputs = json.loads((ROOT/'src/manifest.json').read_text())['outputs']
    previous = {item['path']: item for item in manifest['files']}
    names = set(previous) | set(outputs)
    names.update(p.name for p in ROOT.glob('*.html'))
    names.update(['desktop-sw14242.js', 'phone-sw.js', 'sw14239.js', 'offline-assets14239.js'])
    names.difference_update(['deployment-config.js', 'data/calendar-news.json', str(TARGET.relative_to(ROOT))])
    files = []
    for name in sorted(names):
        path = (ROOT/name).resolve()
        if not path.is_relative_to(ROOT) or not path.is_file():
            raise ValueError('Missing or invalid release asset: '+name)
        data = path.read_bytes()
        item = {'path': name, 'sha256': hashlib.sha256(data).hexdigest(), 'effect': previous.get(name, {}).get('effect', 'Reload the current release and investigate mixed or changed files.')}
        if name in outputs and len(outputs[name]) > 1:
            text = data.decode('utf-8')
            matches = list(MARKER.finditer(text))
            if matches:
                item['segments'] = [{'source': match[1], 'sha256': hashlib.sha256(text[match.end():matches[i+1].start() if i+1 < len(matches) else len(text)].encode()).hexdigest()} for i, match in enumerate(matches)]
        files.append(item)
    manifest['release'] = version[1]
    manifest['files'] = files
    return (json.dumps(manifest, indent=2)+'\n').encode()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    data = build()
    if args.check:
        if TARGET.read_bytes() != data:
            raise SystemExit('Diagnostics manifest is stale; rebuild modules then refresh-release-manifest.py')
    else:
        TARGET.write_bytes(data)
    print('Diagnostics manifest matches '+str(len(json.loads(data)['files']))+' shipped assets')
