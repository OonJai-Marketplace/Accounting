"""Replace only changed source segments, preserving every later deployed extension."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[2]
import sys
names=sys.argv[1:] or ['todos1438.js','workflows-v136.js','archive-xlsx-v129.js','document-export-v108.js','document-import-v1422.js','navigation-v48.js']
for p in (root/'scripts').glob('desktop14245-*.js'):
 s=p.read_text()
 matches=list(re.finditer(r'^/\* (scripts/[^\n]+\.js) \*/\n',s,re.M))
 for i in range(len(matches)-1,-1,-1):
  m=matches[i]
  if Path(m[1]).name not in names:continue
  end=matches[i+1].start() if i+1<len(matches) else len(s)
  body=(root/m[1]).read_text().rstrip()
  if Path(m[1]).name in ['document-export-v108.js','document-import-v1422.js']:
   body='/* Loaded on demand by scripts/optional-tools14335.js. */'
  s=s[:m.end()]+body+'\n;\n'+s[end:]
 p.write_text(s)
