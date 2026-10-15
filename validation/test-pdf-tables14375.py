"""Check every numeric PDF worker font-table entry; compare standard Adobe glyphs.
Requires fontTools. Embedded Brotli data is exercised by test-pdf-brotli14375.cjs.
These data checks supplement the contiguous executable-source review.
"""
from pathlib import Path
import hashlib
import math
import re
from fontTools.agl import LEGACY_AGL2UV
source = Path('assets/vendor/document14285/pdf.worker.min.mjs').read_text()
assert hashlib.sha256(source.encode()).hexdigest() == '145d2dd3ab0c86151011dba95acfa2d5336e2accd59388ea43dbee0efddaaec6'
glyphs = re.findall(r'e\.([A-Za-z0-9_]+)=([0-9.e+]+)(?=[;}])', source[387444:475759])
assert len(glyphs) == 4529
standard = 0
for name, value in glyphs:
    value = int(float(value))
    assert 0 <= value <= 0x10ffff
    expected = LEGACY_AGL2UV.get(name)
    if expected and len(expected) == 1:
        assert [value] == expected, (name, value, expected)
        standard += 1
arrays = []
for match in re.finditer(r'\[([^\[\]]+)\]', source[653303:742539]):
    try:
        values = list(map(float, match[1].split(',')))
    except ValueError:
        continue
    if len(values) == 1:
        assert values == [0]  # FirstChar indexing, not a font table.
        continue
    assert len(values) == 681 and all(map(math.isfinite, values))
    if any(value < 0 for value in values):
        assert all(value.is_integer() and -1 <= value <= 0x10ffff for value in values)
    elif max(values) > 3:
        assert all(value.is_integer() and 0 <= value <= 2000 for value in values)
    else:
        assert all(0 < value < 3 for value in values)
    arrays.append(values)
assert len(arrays) == 24
print(f'PASS: {len(glyphs)} glyph entries ({standard} standard Adobe matches); 24 font tables / {sum(map(len, arrays))} numeric entries')
