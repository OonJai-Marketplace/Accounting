"""Current app-wide gates. Uses synthetic browser/isolated SQL fixtures only.

Requires Node with Playwright, Chromium (CHROMIUM_PATH or /tmp/chromium), and
PGlite 0.5.10 plus jsdom (resolvable through NODE_PATH). PGLITE_MODULE may point
to its dist/index.cjs for older SQL fixtures. No hosted credentials.
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
word-images14372 update143100
account-rates143186 rate-snapshot143186 rate-sheet143186 ai-stack143160 rate-ai-review143186
rate-ai-regression143186 memo-links143187 online-save-search143188 news-sheets143189
news-edge143189 live-reference143190 live-inboxes143190 account-sheet-events143191
account-sheet-no-poll143191 account-save143182 inbox-edge143173 inbox-missing143174
account-confirmation143192 reset-cache143108 sync-order143182 report-years143182
report-years-ui143182 scheduled-prepaid-isolated143193""".split()

# Current workflow extensions; historical tests with superseded UI contracts stay
# outside this gate. Keep real regressions separate from obsolete test fixtures.
SUITES += """release-integrity143198 navigation-header232 retired-phone233 security233 retired-journal143195
report-window143195 report-history-ui143195 history-pagination143197 document-index143198
audit-pages143198 historical-hr143200 profit-tax143199 profit-tax-dom143199 profit-tax-ui143199
google-history194.mjs google-history194-edge.mjs google-history194-sql.mjs google-history194-ui
sheet-formulas201.mjs receipt-core202 receipt-backend202.mjs
phone-own207 phone-login210 phone-url210 phone-session212 phone-navigation212
scanner-sequence223 scanner-handler215.mjs scanner-ids215.mjs
journal-receipts224 receipt-status226.mjs receipt-icons226 journal-display227
company-drive228.mjs receipt-settings229 storage-settings230 year-routing231.mjs
yearly-storage231-edge.mjs yearly-storage231-sql.mjs yearly-storage231-ui
scheduled-approval225 scheduled-approval-ui225""".split()

if __name__ == '__main__':
    subprocess.run(['node', '-e', "for (const name of ['playwright','jsdom','@electric-sql/pglite']) require.resolve(name);"], cwd=ROOT, check=True)
    logs = Path(tempfile.mkdtemp(prefix='accounting-audit143100-'))
    def run(name):
        start = time.monotonic()
        try:
            filename = 'validation/test-'+name+('' if name.endswith('.mjs') else '.cjs')
            result = subprocess.run(['node', filename], cwd=ROOT,
                                    capture_output=True, text=True, timeout=180, env=os.environ.copy())
            code, output = result.returncode, result.stdout+result.stderr
        except subprocess.TimeoutExpired as exc:
            code, output = 'timeout', str(exc)
        (logs/(name+'.log')).write_text(output)
        print(('PASS' if code == 0 else 'FAIL')+' '+name, flush=True)
        if code != 0:
            print(output[-2500:], flush=True)
        return {'suite': name, 'exitCode': code, 'seconds': round(time.monotonic()-start, 1)}

    # Session clocks and deliberately interrupted journal requests need stable
    # browser scheduling; run those lifecycle fixtures without other Chromium jobs.
    serial = ['phase0-session-browser', 'journal-durable14385']
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(run, [name for name in SUITES if name not in serial]))
    results.extend(run(name) for name in serial)
    release = json.loads((ROOT/'data/release-notes.json').read_text())['version']
    report = {'release': release, 'completedAt': datetime.now(timezone.utc).isoformat(),
              'environment': 'Synthetic local browser and isolated PostgreSQL fixtures',
              'results': results}
    (ROOT/('validation/accounting-audit'+release.replace('.', '')+'-results.json')).write_text(json.dumps(report, indent=2)+'\n')
    print('Logs:', logs)
    raise SystemExit(1 if any(r['exitCode'] != 0 for r in results) else 0)
