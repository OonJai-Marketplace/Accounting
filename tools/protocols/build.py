"""Build the static Settings reader and printable protocols from handbook.txt."""
from pathlib import Path
from html import escape
from xml.sax.saxutils import escape as xml
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, Table, TableStyle

root = Path(__file__).resolve().parents[2] / 'docs' / 'protocols'
pdf_name = 'Oon-Jai-Accounting-Protocols.pdf'
public_source = 'https://taxsummaries.pwc.com/lao-pdr/individual/other-taxes'
edition = '8 November 2026'
groups = {}
topics = []
for line in (root/'handbook.txt').read_text().splitlines():
    if not line.strip():
        continue
    if line.startswith('@ '):
        area = line[2:]
        groups[area] = []
    elif line.startswith('# '):
        code, title = line[2:].split(' | ')
        topic = dict(code=code, title=title, group=area, steps=[], boxes=[])
        groups[area].append(topic)
        topics.append(topic)
    elif line.startswith('> '):
        topic['route'] = line[2:]
    elif line.startswith('= '):
        topic['lead'] = line[2:]
    elif line.startswith('! '):
        topic['check'] = line[2:]
    elif line.startswith('~ '):
        topic['boxes'].append(line[2:].split(' | '))
    elif line.startswith('% '):
        label, *head = line[2:].split(' | ')
        topic['table'] = (label, [head])
    elif line.startswith(': '):
        topic['table'][1].append(line[2:].split(' | '))
    else:
        topic['steps'].append(line.split(' | '))
assert len({t['code'] for t in topics}) == len(topics)
for i,t in enumerate(topics,3):
    t['page'] = i
    assert all(t.get(k) for k in ('route','lead','check','steps'))

def url(t):
    return 'topics/'+t['code']+'.pdf'

def new_tab(href, label, title=''):
    return f'<a href="{href}" target="_blank" rel="noopener" aria-label="{escape(title or label)}">{label}</a>'

def download(href, label, title):
    return f'<a href="{href}" download aria-label="{escape(title)}">{label}</a>'

def links(t):
    return (new_tab('#'+t['code'], 'New tab', 'Open '+t['title']+' in a new tab')+
            download(url(t), 'Download PDF', 'Download '+t['title']+' PDF'))

indexes=[]
articles=[]
for name,group in groups.items():
    rows=[]
    for t in group:
        code,title=t['code'],escape(t['title'])
        rows.append(f'<li><a class="topic-title" href="#{code}"><span class="code">{code}</span>{title}</a><span class="links"><a href="#{code}" aria-label="Read {title} here">Read</a>{links(t)}</span></li>')
        steps=''.join(f'<li><h3>{escape(k)}</h3><p>{escape(v)}</p></li>' for k,v in t['steps'])
        boxes=''.join(f'<section class="example"><h3>{escape(k)}</h3><p>{escape(v)}</p></section>' for k,v in t['boxes'])
        if 'table' in t:
            caption,grid=t['table']
            def cells(row,tag): return ''.join(f'<{tag}>{escape(v)}</{tag}>' for v in row)
            body=''.join('<tr>'+cells(r,'td')+'</tr>' for r in grid[1:])
            boxes+=f'<section class="example"><h3>{escape(caption)}</h3><table><thead><tr>{cells(grid[0],"th")}</tr></thead><tbody>{body}</tbody></table></section>'
        articles.append(f'<article class="reader" id="{code}" hidden><nav class="toolbar"><a href="#">All protocols</a>{links(t)}</nav><header><div class="category">{escape(name)} · {code}</div><h1 tabindex="-1">{title}</h1><p class="route">{escape(t["route"])}</p></header><p class="lead">{escape(t["lead"])}</p><ol class="steps">{steps}</ol>{boxes}<section class="check"><h3>Before you finish</h3><p>{escape(t["check"])}</p></section><footer>Oon Jai Company Limited · {edition}</footer></article>')
    indexes.append(f'<section data-area="{escape(name)}"><h2>{escape(name)}</h2><ul class="topic-list">{"".join(rows)}</ul></section>')
html=(root/'reader-template.html').read_text().replace('[[INDEX]]','\n'.join(indexes)).replace('[[ARTICLES]]','\n'.join(articles)).replace('[[OPTIONS]]',''.join(f'<option>{escape(name)}</option>' for name in groups))
(root/'index.html').write_text(html)

W,H=A4
left,right=48,W-48
width=right-left
ink='#142F29'; forest='#175743'; muted='#49655A'; rule='#C7D6CC'; pale='#EFF5F0'; sand='#F6F1E4'
def color(value): return colors.HexColor(value)
def label(c,x,y,s,font='Helvetica',size=10,tint=ink):
    c.setFont(font,size);c.setFillColor(color(tint));c.drawString(x,y,s)
def paragraph(c,x,y,value,w=width,size=12,leading=17,font='Helvetica',tint=ink,draw=True):
    p=Paragraph(xml(value),ParagraphStyle('body',fontName=font,fontSize=size,leading=leading,textColor=color(tint),spaceAfter=0))
    _,height=p.wrap(w,H)
    if draw:p.drawOn(c,x,y-height)
    return y-height
def line(c,x,y,x2,tint=rule):
    c.setStrokeColor(color(tint));c.line(x,y,x2,y)
def setup(path,title):
    c=canvas.Canvas(str(path),pagesize=A4,pageCompression=1,invariant=1)
    c.setTitle(title);c.setAuthor('Oon Jai Company Limited');c.setSubject('Operating procedures for the Accounting workspace')
    return c
def header(c,section):
    c.setFillColor(color(forest));c.rect(0,H-9,W,9,fill=1,stroke=0)
    label(c,left,H-40,'OON JAI COMPANY LIMITED','Helvetica-Bold',9,forest)
    c.setFillColor(color(muted));c.setFont('Helvetica',9);c.drawRightString(right,H-40,section)
    line(c,left,H-52,right)
def footer(c,number=None,back=None):
    line(c,left,45,right)
    if back:
        label(c,left,28,'Contents','Helvetica-Bold',9,forest)
        c.linkRect('Back to contents',back,(left-4,20,left+67,41),relative=0,thickness=0)
    else:label(c,left,28,'Accounting protocols','Helvetica',9,muted)
    c.setFillColor(color(muted));c.setFont('Helvetica',9);c.drawCentredString(W/2,28,edition)
    c.drawRightString(right,28,str(number) if number else 'Protocol reference')
def panel(c,y,title,body,tint=pale):
    end=paragraph(c,left+14,y-28,body,width-28,11.2,15.5,draw=False)
    c.setFillColor(color(tint));c.roundRect(left,end-12,width,y-end+12,5,fill=1,stroke=0)
    label(c,left+14,y-17,title,'Helvetica-Bold',10.4,forest)
    paragraph(c,left+14,y-28,body,width-28,11.2,15.5)
    return end-23
def topic_page(c,t,single=False):
    c.bookmarkPage(t['code'])
    if not single:c.addOutlineEntry(t['code']+'  '+t['title'],t['code'],1)
    header(c,t['group'])
    label(c,left,H-83,t['code']+'   /   '+t['group'].upper(),'Helvetica-Bold',10,forest)
    y=paragraph(c,left,H-96,t['title'],size=29,leading=32,font='Times-Bold')-10
    y=paragraph(c,left,y,t['route'],size=10.5,leading=14,tint=muted)-14
    y=paragraph(c,left,y,t['lead'],size=14.2,leading=18.5,font='Times-Italic')-17
    for n,(title,body) in enumerate(t['steps'],1):
        label(c,left,y-10,f'{n:02d}','Helvetica-Bold',10,forest)
        y=paragraph(c,left+29,y,title,width-29,12,15,font='Helvetica-Bold')-3
        y=paragraph(c,left+29,y,body,width-29,11.6,15.8)-11
    if 'table' in t:
        caption,grid=t['table']
        label(c,left,y-9,caption,'Helvetica-Bold',10.5,forest);y-=17
        widths=([width*.48,width*.26,width*.26] if len(grid[0])==3 else [width*.34,width*.22,width*.22,width*.22])
        table=Table(grid,colWidths=widths)
        table.setStyle(TableStyle([('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),10),('TEXTCOLOR',(0,0),(-1,-1),color(ink)),('BACKGROUND',(0,0),(-1,0),color(pale)),('ALIGN',(1,0),(-1,-1),'RIGHT'),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,color('#F7F9F5')]),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5)]))
        _,h=table.wrap(width,H);y-=h;table.drawOn(c,left,y);y-=12
    for k,v in t['boxes']:y=panel(c,y,k,v)
    y=panel(c,y,'Before you finish',t['check'],sand)
    if y < 44:raise ValueError(f'{t["code"]} exceeds page ({y:.1f})')
    if t['code']=='P04':
        if y>=62:
            label(c,left,y-7,'Source: PwC Lao PDR · Individual · Other taxes','Helvetica',9,forest)
            c.linkURL(public_source,(left,y-14,left+210,y+4),relative=0,thickness=0)
    footer(c,None if single else t['page'],None if single else ('contents-1' if t['page']<18 else 'contents-2'))
    c.showPage()
def contents(c,num,names):
    key='contents-'+str(num);c.bookmarkPage(key);c.addOutlineEntry('Contents · '+('Journal and operations' if num==1 else 'Payroll and closing'),key,0)
    header(c,'Operating handbook')
    label(c,left,H-83,'CONTENTS    /    '+str(num)+' OF 2','Helvetica-Bold',10,forest)
    y=paragraph(c,left,H-96,'Accounting protocols' if num==1 else 'Payroll and closing',size=33,leading=38,font='Times-Bold')-5
    y=paragraph(c,left,y,'Select a procedure to open its page. Each procedure is also available in Settings.',size=11.5,leading=16,tint=muted)-14
    for name in names:
        label(c,left,y-11,name,'Helvetica-Bold',13,forest)
        y-=19
        for t in groups[name]:
            line(c,left,y,right)
            label(c,left+2,y-15,t['code'],'Helvetica-Bold',9,muted)
            label(c,left+38,y-15,t['title'],size=11.5)
            c.setFont('Helvetica-Bold',10);c.drawRightString(right-3,y-15,str(t['page']))
            c.linkRect(t['title'],t['code'],(left,y-21,right,y),relative=0,thickness=0)
            y-=22
        y-=11
    label(c,left,y-10,'Continue to payroll and closing  >' if num==1 else '<  Journal, operations and currency','Helvetica-Bold',10,forest)
    c.linkRect('Other contents page','contents-'+str(3-num),(left,y-17,left+250,y+3),relative=0,thickness=0)
    if num==1:
        y-=35
        y=paragraph(c,left,y,'Edition of 8 November 2026. Based on the 29 October journal protocol and Oon Jai Accounting workflows through v143.315. Examples are illustrative. Use the chart and policies saved for the period.',size=10.4,leading=14,tint=muted)-5
        label(c,left,y-9,'Rate reference · PwC Lao PDR, Individual – Other taxes (7 August 2026)','Helvetica',9,forest)
        c.linkURL(public_source,(left,y-14,right,y+2),relative=0,thickness=0)
    footer(c,num);c.showPage()
(root/'topics').mkdir(exist_ok=True)
c=setup(root/pdf_name,'Oon Jai · Accounting protocols')
contents(c,1,list(groups)[:3]);contents(c,2,list(groups)[3:])
for t in topics:
    if t is groups[t['group']][0]:
        destination = 'section-'+t['code']
        c.bookmarkPage(destination)
        c.addOutlineEntry(t['group'],destination,0)
    topic_page(c,t)
    one=setup(root/url(t),t['code']+' · '+t['title'])
    topic_page(one,t,True);one.save()
c.save()
print(f'{len(topics)} procedures, {len(topics)+2} handbook pages.')
