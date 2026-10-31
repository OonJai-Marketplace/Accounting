"""Inspect the synthetic PDF emitted by test-receipt-browser202.cjs."""
from pathlib import Path
from pypdf import PdfReader
import os
out = Path(os.environ.get('SCAN_TEST_OUTPUT', '/tmp/receipt202'))
r = PdfReader(out / 'scanner.pdf')
assert len(r.pages) == 4
assert r.trailer['/Root']['/PageMode'] == '/UseOutlines'
assert r.outline[0].title == 'October 2026 Cash Slips'
assert r.outline[1].title == 'OJM26-0007'
assert [x.title for x in r.outline[2]] == ['OJM26-0007A', 'OJM26-0007B']
assert r.get_destination_page_number(r.outline[1]) == 2
assert len(r.pages[0]['/Annots']) == 2
assert r.pages[3].extract_text() == 'OJM26-0007B'
original = (out / 'approved.jpg').read_bytes()
streams = [obj.get_object().get_data() for obj in r.pages[1]['/Resources']['/XObject'].values()
           if obj.get_object().get('/Subtype') == '/Image']
assert original in streams
print('PASS: PDF links, group/child bookmarks, footer IDs and unchanged embedded JPEG bytes')
