"""Current app-wide gates. Uses synthetic browser/isolated SQL fixtures only.

Requires Node with Playwright, Chromium (CHROMIUM_PATH or /tmp/chromium), and
PGlite 0.5.10 (PGLITE_MODULE may point to its dist/index.cjs). No hosted credentials.
Historical release-specific scripts are not implicitly part of this gate.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
SUITES = """app-integrity143100 civil-date143100 workforce-reports143100 confirmation143100
all-workspaces phase0-browser phase0-session-browser phase0-navigation-preservation
phase0-preload phase0-inactivity phone-cache14368 phone-idle-sync
audit-owner-guards14370 audit-drafts14370 sync-coordinator sync-cache
sync-mixed-recovery sync-recovery hr-calendar-model14306 journal-durable14385
foreign-currency14383 foreign-funds14386 account-ledger14381 assigned-ledger14281
subaccounts14287-repair chart14397 mapping-close14397 bookkeeping14399
return-current14399 year-windows14334 budget-lifecycle14316 fresh-backend14322
audit-reconciliation14382 news-local14396 audit-ui14370 document-table14370
archive-limits14373 encrypted-download14372 edge-services14320 pdf-export14370
word-images14372 update143100""".split()

if __name__ == '__main__':
    logs = Path(tempfile.mkdtemp(prefix='accounting-audit143100-'))
    def run(name):
        start = time.monotonic()
        try:
            result = subprocess.run(['node', 'validation/test-'+name+'.cjs'], cwd=ROOT,
                                    capture_output=True, text=True, timeout=180, env=os.environ.copy())
            code, output = result.returncode, result.stdout+result.stderr
        except subprocess.TimeoutExpired as exc:
            code, output = 'timeout', str(exc)
        (logs/(name+'.log')).write_text(output)
        print(('PASS' if code == 0 else 'FAIL')+' '+name, flush=True)
        if code != 0:
            print(output[-2500:], flush=True)
        return {'suite': name, 'exitCode': code, 'seconds': round(time.monotonic()-start, 1)}

    # Clock jumps/session expiry can race pending navigation under concurrent
    # Chromium pressure; run that lifecycle fixture by itself.
    serial = ['phase0-session-browser']
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(run, [name for name in SUITES if name not in serial]))
    results.extend(run(name) for name in serial)
    report = {'release': '143.100', 'completedAt': datetime.now(timezone.utc).isoformat(),
              'environment': 'Synthetic local browser and isolated PostgreSQL fixtures',
              'results': results}
    (ROOT/'validation/accounting-audit143100-results.json').write_text(json.dumps(report, indent=2)+'\n')
    print('Logs:', logs)
    raise SystemExit(1 if any(r['exitCode'] != 0 for r in results) else 0)
