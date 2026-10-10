"""Record release bytes and original source attribution; no application data."""
from pathlib import Path
import hashlib, json, re
root=Path(__file__).resolve().parents[1]
html=(root/'desktop.html').read_text()
paths={'desktop.html','desktop-sw14242.js','setup/INSTALL-MAINTENANCE-v143.24.sql','assets/maintenance/report-template14326.xlsx'}
paths.update(re.findall(r'(?:src|href)="((?:scripts|styles)/[^"?]+)',html))
effects={
 'scripts/maintenance14324.js':'Maintenance review, investigator and exports may not run correctly.',
 'scripts/maintenance-engine14324.js':'Independent calculations or record tracing may differ.',
 'scripts/period-closing14317.js':'Required pre-closing review may be missing or outdated.',
 'scripts/system-diagnostics14324.js':'Diagnostic coverage or findings may differ.',
 'styles/maintenance14324.css':'Maintenance controls or tables may be clipped or misaligned.',
 'styles/controls14317.css':'Approved action colors, journal actions or fullscreen rail may differ.',
 'scripts/desktop-scale14320.js':'Scaling may affect responsive layout and pointer coordinates.'
}
hashbytes=lambda b:hashlib.sha256(b).hexdigest()
files=[]
for path in sorted(paths):
 p=root/path
 item={'path':path,'sha256':hashbytes(p.read_bytes()),'effect':effects.get(path,'The component may differ from the tested release; reload and investigate this file.')}
 if re.search(r'desktop14245(?:-\d+)?\.(?:js|css)$',path):
  text=p.read_text();matches=list(re.finditer(r'/\* ((?:scripts/[^\n]+\.js|styles/[^\n]+\.css)) \*/\n',text));item['segments']=[]
  for i,m in enumerate(matches):
   body=text[m.end():matches[i+1].start() if i+1<len(matches) else len(text)]
   item['segments'].append({'source':m.group(1),'sha256':hashbytes(body.encode())})
 files.append(item)
manifest={'release':'143.26','comparisonBaseline':'v143.16 / 14d724e15c057bbd4e63324754f89959ea48a784','files':files,'approvedRules':[
 {'rule':'Native 100% desktop; no global zoom/media rewriting','validation':'validation/test-recovery14323.cjs'},
 {'rule':'Preserve phone v142.53 navigation and layout','validation':'validation/test-phone-tools14317.cjs'},
 {'rule':'Administrator workspace and period descriptions remain stable','validation':'validation/test-regressions14304.cjs'},
 {'rule':'Unbalanced trial blocks closing; exceptions require individual acknowledgment','validation':'validation/test-maintenance-db14324.cjs'},
 {'rule':'Maintenance tools and Bookkeeping closing checks remain admin-only','validation':'validation/test-polish14325.cjs'}]}
(root/'assets/maintenance/release14324.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Recorded {len(files)} files and source-segment attribution.')
