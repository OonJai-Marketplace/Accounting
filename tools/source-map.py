"""Locate source ownership and generated line ranges without changing any files."""
from pathlib import Path
from collections import defaultdict
import argparse
import json

ROOT = Path(__file__).resolve().parent.parent


def source_map():
    manifest = json.loads((ROOT / 'src/manifest.json').read_text())
    result = {}
    for output, parts in manifest['outputs'].items():
        line = 1
        for part in parts:
            name = part['source']
            data = (ROOT / name).read_bytes()
            prefix, suffix = part.get('prefix', ''), part.get('suffix', '')
            start = line + prefix.count('\n')
            end = start + data.count(b'\n') - int(data.endswith(b'\n'))
            entry = result.setdefault(name, {
                'bytes': len(data), 'lines': len(data.splitlines()), 'outputs': []})
            entry['outputs'].append({'path': output, 'start': start, 'end': max(start, end)})
            line += prefix.count('\n') + data.count(b'\n') + suffix.count('\n')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--find', help='Literal source text or function name to locate')
    parser.add_argument('--json', action='store_true', help='Emit the complete mapping as JSON')
    args = parser.parse_args()
    mapping = source_map()
    if args.json:
        print(json.dumps(mapping, indent=2))
    elif args.find:
        matches = 0
        for name, entry in sorted(mapping.items()):
            lines = [i for i, text in enumerate((ROOT / name).read_text().splitlines(), 1)
                     if args.find in text]
            if not lines:
                continue
            matches += 1
            print(f'{name}: source lines {", ".join(map(str, lines))}')
            for output in entry['outputs']:
                print(f'  -> {output["path"]}:{output["start"]}-{output["end"]}')
        if not matches:
            print('No matching source text.')
    else:
        areas = defaultdict(lambda: {'js': 0, 'css': 0, 'bytes': 0})
        for name, entry in mapping.items():
            area = name.split('/')[1]
            areas[area][Path(name).suffix[1:]] += 1
            areas[area]['bytes'] += entry['bytes']
        for area, counts in sorted(areas.items()):
            print(f'{area:14} {counts["js"]:3} JS  {counts["css"]:3} CSS  {counts["bytes"]:9,} bytes')
        print(f'{len(mapping)} ordered source sections; shared classic-script scopes are preserved.')


if __name__ == '__main__':
    main()
