"""Refresh the current clean installer from reviewed forward SQL; never connects to a database."""
import hashlib
import importlib.util
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
MARKER = '-- Current backend additions assembled by refresh-fresh14370.py\n'
UPDATES = [
    'INSTALL-MAINTENANCE-v143.24.sql',
    'INSTALL-OFFLINE-YEAR-WINDOW-v143.33.sql',
    'INSTALL-PAYROLL-YEAR-WINDOW-v143.34.sql',
    'INSTALL-EDITABLE-TODOS-v143.35.sql',
    'INSTALL-FINAL-REVIEW-v143.45.sql',
    'INSTALL-RECONCILIATION-REFINEMENTS-v143.46.sql',
    'INSTALL-RETURNED-SUBMISSIONS-v143.47.sql',
    'INSTALL-REPORT-POSTING-v143.49.sql',
    'INSTALL-ACCOUNT-MAPPING-v143.64.sql',
    'INSTALL-POSTING-CLEANUP-v143.70.sql',
    'INSTALL-RLS-STATEMENT-CACHE-v143.70.sql',
    'INSTALL-SUBACCOUNT-INHERITANCE-v143.80.sql',
    'INSTALL-ACCOUNT-HISTORY-DETAILS-v143.81.sql',
    'INSTALL-FOREIGN-FUND-TRACKING-v143.86.sql',
]
# These additions already contain the current function bodies without the removed
# role calculator. The company-specific account reorganization and guarded
# removal of that old calculator must never be replayed by a fresh installer.
CURRENT_ADDITIONS = [
    'setup/INSTALL-FOREIGN-CURRENCY-v143.83.sql',
    'setup/COMPATIBILITY-FX-v143.83.sql',
    'supabase/migrations/20261015121608_journal_durable_changes14385.sql',
    'supabase/migrations/20261015122604_journal_recovery_receipts14385.sql',
    'supabase/migrations/20261016103522_mapping_carry_forward14397.sql',
    'supabase/migrations/20261017145427_report_archive_integrity143106.sql',
]

def refresh():
    directory = ROOT / 'setup/fresh'
    target = directory / '001-Install-Empty-Database.sql'
    original = target.read_text()
    foundation = original.split(MARKER)[0] if MARKER in original else original
    foundation = re.sub(r'\s*COMMIT;\s*$', '\n', foundation)
    parts = []
    for name in UPDATES:
        text = (ROOT / 'setup' / name).read_text()
        if len(re.findall(r'^BEGIN;\s*$', text, re.M)) != 1 or len(re.findall(r'^COMMIT;\s*$', text, re.M)) != 1:
            raise RuntimeError('Expected one outer transaction in ' + name)
        parts.append('-- Source: setup/' + name + '\n' + re.sub(r'^(?:BEGIN|COMMIT);\s*$', '', text, flags=re.M))
    for name in CURRENT_ADDITIONS:
        text = (ROOT / name).read_text()
        if re.search(r'^(?:BEGIN|COMMIT|ROLLBACK);\s*$', text, re.M):
            raise RuntimeError('Unexpected outer transaction in ' + name)
        parts.append('-- Source: ' + name + '\n' + re.sub(r'[ \t]+$', '', text, flags=re.M))
    sql = foundation + MARKER + '\n'.join(parts) + '\nCOMMIT;\n'
    separation_spec = importlib.util.spec_from_file_location('separation', ROOT/'tools/portability/restaurant-separation.py')
    separation = importlib.util.module_from_spec(separation_spec)
    separation_spec.loader.exec_module(separation)
    sql = separation.separate(sql)
    spec = importlib.util.spec_from_file_location('backend', ROOT/'tools/portability/backend-package.py')
    backend = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(backend)
    backend.validate_clean(sql)
    target.write_text(sql)
    verify_path = directory/'003-Verify-Installation.sql'
    verification = verify_path.read_text()
    verification, count = re.subn(r'FOREACH name IN ARRAY ARRAY\[[^\]]+\]',
        'FOREACH name IN ARRAY ARRAY[' + ','.join("'" + name + "'" for name in backend.contracts()) + ']', verification, count=1)
    if count != 1:
        raise RuntimeError('Fresh verification contract list was not found')
    verify_path.write_text(verification)
    provenance_path = directory/'source-provenance.json'
    provenance = json.loads(provenance_path.read_text())
    version = re.search(r"const SHELL_VERSION='([0-9]+\.[0-9]+)'", (ROOT/'src/core/sync/offline14239.js').read_text())[1]
    provenance['currentUpdateRelease'] = version
    provenance['currentUpdates'] = [{'name': name, 'sha256': hashlib.sha256((ROOT/'setup'/name).read_bytes()).hexdigest()} for name in UPDATES]
    provenance['currentUpdates'].extend({'name': name, 'sha256': hashlib.sha256((ROOT/name).read_bytes()).hexdigest()} for name in CURRENT_ADDITIONS)
    provenance['restaurantSeparation'] = {'tablesExcluded': separation.TABLES, 'functionsExcluded': separation.FUNCTIONS,
        'reviewedRoutines': 'validation/restaurant-separation143101-routines.json'}
    provenance_path.write_text(json.dumps(provenance, indent=2)+'\n')
    manifest_path = directory/'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    manifest['release'] = version
    manifest['files'] = {name: hashlib.sha256((directory/name).read_bytes()).hexdigest() for name in manifest['installationOrder']}
    manifest_path.write_text(json.dumps(manifest, indent=2)+'\n')
    print('Fresh installer contracts and checksums updated. Run isolated database acceptance before release.')

if __name__ == '__main__':
    refresh()
