"""Read-only deployment probes: preflight and requests rejected before any action."""
import concurrent.futures
import json
from pathlib import Path
import urllib.error
import urllib.request

BASE = 'https://nhjsesfhapnjtwlxvirm.supabase.co/functions/v1/'
ORIGIN = 'https://oonjai-marketplace.github.io'

def probe(name):
    rows = []
    for method, origin in [('OPTIONS', ORIGIN), ('POST', ORIGIN), ('POST', 'https://unapproved.invalid')]:
        request = urllib.request.Request(BASE+name, method=method,
            headers={'Origin': origin, 'Content-Type': 'application/json'},
            data=b'{}' if method == 'POST' else None)
        try:
            response = urllib.request.urlopen(request, timeout=20)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            rows.append({'function': name, 'method': method, 'origin': origin,
                'status': response.status, 'allowOrigin': response.headers.get('Access-Control-Allow-Origin'),
                'body': response.read().decode()})
    return rows

if __name__ == '__main__':
    rows = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        for result in executor.map(probe, ['admin-create-user', 'admin-password14257', 'recovery-vault113']):
            rows.extend(result)
    for row in rows:
        if row['method'] == 'OPTIONS':
            assert row['status'] == 200 and row['allowOrigin'] == ORIGIN, row
        else:
            allowed = row['origin'] == ORIGIN
            expected_status = (401 if allowed else 403) if row['function'] == 'admin-password14257' else 400
            assert row['status'] == expected_status, row
            assert json.loads(row['body'])['error'] == ('Sign in first' if allowed else 'Origin not allowed'), row
            assert row['allowOrigin'] == (ORIGIN if allowed else None), row
    Path(__file__).with_name('edge-live14370.json').write_text(json.dumps(rows, indent=2)+'\n')
    print('PASS nine live preflight/authentication/origin probes; no business action invoked')
