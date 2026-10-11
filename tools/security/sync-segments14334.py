"""Replace only changed source segments, preserving every later deployed extension."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[2]
names=['script.js','document-editor-v105.js','reports-system-v71.js','payroll-fixes-v83.js','payroll-groups-v96.js','payroll-reports-v82.js','shared-v108.js','audit-storage14232.js','session-policy1443.js','permissions1441.js']
for p in (root/'scripts').glob('desktop14245-*.js'):
 s=p.read_text()
 for m in reversed(list(re.finditer(r'/\* (scripts/[^\n]+\.js) \*/\n',s))):
  if Path(m[1]).name not in names:continue
  end=s.find('\n;\n/* scripts/',m.end())
  if end<0:end=s.rfind('\n;\n')
  assert end>=m.end(),m[1]
  s=s[:m.end()]+(root/m[1]).read_text().rstrip()+'\n'+s[end:]
 p.write_text(s)
