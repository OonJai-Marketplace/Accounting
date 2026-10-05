"""Pack desktop assets in their existing order; keep the source files editable."""
from pathlib import Path
import re,json
ROOT=Path(__file__).resolve().parent.parent
html=(ROOT/'tools/desktop-source14245.html').read_text()
css=re.compile(r'<link\s+rel="stylesheet"\s+href="(styles/[^"?]+)(?:\?[^"]*)?"\s*>')
styles=css.findall(html)
if styles:
    packed='\n'.join('/* '+p+' */\n'+(ROOT/p).read_text() for p in styles)
    (ROOT/'styles/desktop14245.css').write_text(packed)
    first=True
    def style_tag(m):
        global first
        if first:
            first=False
            return '<link rel="stylesheet" href="styles/desktop14245.css?v=142.45">'
        return ''
    html=css.sub(style_tag,html)
# Preserve configuration and third-party script boundaries. Only pack contiguous
# application scripts, which execute in exactly the same order as before.
pat=re.compile(r'(?:<script src="scripts/(?!supabase-config)([^"?]+)(?:\?[^"]*)?"></script>\s*){2,}')
packed_sources=[]
count=0
def script_group(m):
    global count
    count+=1
    paths=re.findall(r'src="(scripts/[^"?]+)',m.group())
    packed_sources.extend(paths)
    output='scripts/desktop14245-'+str(count)+'.js'
    (ROOT/output).write_text('\n;\n'.join('/* '+p+' */\n'+(ROOT/p).read_text() for p in paths)+'\n;\n')
    return '<script src="'+output+'?v=142.45"></script>\n'
html=pat.sub(script_group,html)
html=re.sub(r'(src|href)="((?:scripts/|styles/|assets/vendor/)[^"?]+)\?v=[^"]+"',r'\1="\2?v=142.45"',html)
html=html.replace('Accounting — v142.42','Accounting — v142.45')
html='\n'.join(line.rstrip() for line in html.splitlines())+'\n'
(ROOT/'desktop.html').write_text(html)
manifest=ROOT/'offline-assets14239.js'
assets=json.loads((ROOT/'tools/offline-source14245.json').read_text())
removed=set(styles+packed_sources)
assets=[p for p in assets if p not in removed and not p.startswith('assets/banners/') and p!='assets/dashboard/oonjai-bowl-hero112.png']
assets+=['assets/banners/transactions.webp','styles/desktop14245.css']+['scripts/desktop14245-'+str(i)+'.js' for i in range(1,count+1)]
manifest.write_text('self.OJM_OFFLINE_ASSETS='+json.dumps(list(dict.fromkeys(assets)),separators=(',',':'))+';\n')
print(json.dumps({'stylesheets_before':len(styles),'stylesheets_after':1,'script_groups':count,'scripts_packed':len(packed_sources)}))
