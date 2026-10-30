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
    for worker in ('desktop-sw14242.js', 'phone-sw.js'):
        worker_version = re.search(r"const VERSION='([0-9]+\.[0-9]+)'", (ROOT/worker).read_text())
        if not worker_version or worker_version[1] != version[1]:
            raise ValueError('Offline worker version does not match the application: '+worker)
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
    version_path = ROOT / 'release-version.json'
    notes = json.loads((ROOT/'data/release-notes.json').read_text())
    if notes.get('version') != json.loads(data)['release'] or not notes.get('changes') or not all(isinstance(item, str) for item in notes['changes']):
        raise SystemExit('Release notes must describe the current release')
    version_data = (json.dumps(notes)+'\n').encode()
    if args.check:
        if not version_path.exists() or version_path.read_bytes() != version_data:
            raise SystemExit('Published update version is stale; refresh-release-manifest.py')
        if TARGET.read_bytes() != data:
            raise SystemExit('Diagnostics manifest is stale; rebuild modules then refresh-release-manifest.py')
    else:
        TARGET.write_bytes(data)
        version_path.write_bytes(version_data)
    print('Diagnostics manifest matches '+str(len(json.loads(data)['files']))+' shipped assets')
