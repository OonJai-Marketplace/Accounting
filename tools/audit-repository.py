"""Inventory every tracked file and trace canonical sources to shipped assets.

This is evidence for a repository review, not a claim of semantic correctness or
proof that an unreferenced file is safe to delete. Dynamic globals/lazy loaders
need manual review. Run: python tools/audit-repository.py --output /tmp/audit.json
"""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parent.parent
PATTERNS = {
    'mutation_observer': r'new\s+MutationObserver\s*\(',
    'interval': r'\bsetInterval\s*\(',
    'navigation_assignment': r'\b(?:window\.)?switchTab\s*=',
    'document_query': r'\bdocument\.querySelectorAll\s*\(',
    'layout_read': r'\b(?:getComputedStyle|getBoundingClientRect|getClientRects)\s*\(',
    'dynamic_code': r'\beval\s*\(|new\s+Function\s*\(',
}

def audit():
    files = sorted(set(subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')) - {''})
    outputs = json.loads((ROOT/'src/manifest.json').read_text())['outputs']
    sources = collections.defaultdict(list)
    for output, parts in outputs.items():
        for part in parts:
            sources[part['source']].append(output)
    entrypoints, consumers = {}, collections.defaultdict(set)
    for name in files:
        if name.endswith('.html'):
            html = (ROOT/name).read_text()
            assets = re.findall(r'<(?:script|link)\b[^>]*(?:src|href)=["\']([^"\']+)', html)
            entrypoints[name] = assets
            for asset in assets:
                asset = asset.split('?')[0]
                consumers[asset].add(name)
    rows, counts = [], collections.Counter()
    for name in files:
        path = ROOT/name
        if not path.is_file():
            continue
        data = path.read_bytes()
        try:
            text = data.decode('utf-8')
        except UnicodeDecodeError:
            text = None
        if name in outputs:
            category = 'generated asset'
        elif name in sources:
            category = 'canonical source'
        elif name.startswith('assets/vendor/'):
            category = 'vendor'
        elif name.startswith(('validation/', 'tools/')):
            category = 'test or tooling'
        elif path.suffix in ('.sql',):
            category = 'database script'
        elif path.suffix in ('.md', '.txt'):
            category = 'documentation'
        elif path.suffix in ('.html', '.js', '.json', '.yml', '.yaml'):
            category = 'entrypoint, configuration or infrastructure'
        else:
            category = 'asset or other'
        counts[category] += 1
        sites = {}
        if name.startswith('src/') and name.endswith('.js'):
            for kind, expression in PATTERNS.items():
                lines = [i for i, line in enumerate(text.splitlines(), 1) if re.search(expression, line)]
                if lines:
                    sites[kind] = lines
        rows.append({'path': name, 'category': category, 'bytes': len(data),
                     'lines': len(text.splitlines()) if text is not None else None,
                     'sha256': hashlib.sha256(data).hexdigest(),
                     'outputs': sources.get(name, []),
                     'direct_html_consumers': sorted(consumers.get(name, set()) | set().union(*(consumers.get(out, set()) for out in sources.get(name, [])))),
                     'review_sites': sites})
    duplicate_loads = {}
    for name, assets in entrypoints.items():
        loaded = collections.Counter(part['source'] for asset in assets for part in outputs.get(asset.split('?')[0], []))
        repeats = {source: count for source, count in loaded.items() if count > 1}
        if repeats:
            duplicate_loads[name] = repeats
    return {'scope': 'All git-tracked files; static line scan and manifest/HTML load mapping. Not a semantic certification.',
            'base_commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT).decode().strip(),
            'files': len(rows), 'categories': dict(counts), 'canonical_sources': len(sources),
            'generated_outputs': len(outputs), 'entrypoints': entrypoints,
            'duplicate_source_inclusions': duplicate_loads,
            'unmapped_src_code': [str(p.relative_to(ROOT)) for p in sorted((ROOT/'src').rglob('*')) if p.suffix in ('.js', '.css') and str(p.relative_to(ROOT)) not in sources],
            'inventory': rows}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = audit()
    args.output.write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps({key: result[key] for key in ('files', 'categories', 'canonical_sources', 'generated_outputs', 'duplicate_source_inclusions', 'unmapped_src_code')}, indent=2))
