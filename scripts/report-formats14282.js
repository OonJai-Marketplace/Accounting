/* Complete the approved print foundation without changing source records. */
(()=>{'use strict';
const esc=v=>escapeHtml(String(v??'')),active=()=>document.querySelector('.tab-content.active')?.id||'';
const names={'sec-chart-accounts':'Chart of Accounts','sec-sub-accounts':'Sub-accounts','transactions-voided':'Audit Logs','transactions-recurring':'Upcoming Obligations','period-review':'Period Review & Closing','payroll-employees':'Employee Register','hr-contracts':'Employee Contracts','hr-assessments':'Employee Assessments','hr-leave':'Employee Leave Report','hr-attendance':'HR Attendance & Late Calculation','payroll-deductions':'HR Attendance & Late Calculation','payroll-overview':'Payroll Overview','payroll-history':'Salary History','report-payroll':'Payroll Report History','report-reconciliation':'Reconciliation Register','report-subusers82':'Sub-user Operational Report'};
const head=(s)=>`<h3 style="font-family:Arial;font-size:10pt;font-weight:bold;color:white;background-color:#176249;padding:1mm 1.5mm;margin:2mm 0 1mm;break-after:avoid">${esc(s)}</h3>`;
const title=(s,p)=>`<h1 style="font-family:Arial;font-size:15pt;font-weight:bold;color:#176249;margin:0 0 1.5mm">${esc(s)}</h1><p style="font-family:Arial;font-size:10pt;margin:0 0 2mm">${esc(p)}</p>`;
const table=(headers,rows,widths,numeric=[])=>reports14254.table(headers,rows,widths,{numeric});
const allowed=id=>!!liveProfile&&access113.can(id,'view')&&access113.can(id,'export');
function permission(id){if(!allowed(id))throw Error('View and Export / Print permission are required for this report.');if(document.getElementById('startup1443')?.hidden===false)throw Error('Wait for this area to finish loading before printing.');}
function signatures(){return printSignatures1424({enabled:true,prepared:liveProfile?.full_name||liveProfile?.email||'',receiver:'',approver:''});}
// Flatten layout containers so the editor can paginate tables row by row.
function format(html){const root=document.createElement('div');root.innerHTML=html;
 root.querySelectorAll('script,style,form,.no-print,.doc-source-action105,.row-menu99,.row-menu-panel99').forEach(n=>n.remove());
 root.querySelectorAll('input,textarea,select').forEach(n=>n.replaceWith(document.createTextNode(n.tagName==='SELECT'?n.selectedOptions[0]?.textContent||'':n.value||'')));
 root.querySelectorAll('button').forEach(n=>n.replaceWith(document.createTextNode(n.textContent)));
 root.querySelectorAll('.r79-metrics,.metric82,.period-summary-grid').forEach(n=>{const rows=[...n.children].map(c=>[c.querySelector('small,span')?.textContent||'',c.querySelector('strong')?.textContent||'']);n.outerHTML=table(['Summary','Value'],rows,[65,35],[1]);});
 root.querySelectorAll('details').forEach(n=>{const summary=n.querySelector(':scope>summary');if(summary){const h=document.createElement('h3');h.textContent=summary.textContent;summary.replaceWith(h)}n.replaceWith(...n.childNodes)});
 // Only table cells and signature blocks retain their internal structure.
 for(const n of [...root.querySelectorAll('section,article,header,footer,div')].reverse())if(!n.closest('table,[data-print-signatures]')&&!n.hasAttribute('data-print-signatures')&&!n.hasAttribute('data-page-break'))n.replaceWith(...n.childNodes);
 // Wide registers repeat their identifying column in compact continuation tables.
 root.querySelectorAll('table').forEach(t=>{const headers=[...t.tHead?.rows[0]?.cells||[]];if(headers.length<=5||t.querySelector('[rowspan],[colspan]'))return;const output=[];for(let start=1;start<headers.length;start+=3){const indices=[0,...Array.from({length:Math.min(3,headers.length-start)},(_,i)=>start+i)],part=t.cloneNode(false);part.removeAttribute('id');const h=document.createElement('thead'),hr=document.createElement('tr'),body=document.createElement('tbody');indices.forEach(i=>hr.append(headers[i].cloneNode(true)));h.append(hr);for(const row of t.querySelectorAll('tbody>tr')){const r=document.createElement('tr');indices.forEach(i=>{const c=row.cells[i];if(c)r.append(c.cloneNode(true))});body.append(r)}part.append(h,body);output.push(part)}t.replaceWith(...output)});
 root.querySelectorAll('table').forEach(t=>{t.removeAttribute('class');t.style.cssText='font-family:Arial;font-size:10pt;line-height:1.15;width:100%;border-collapse:collapse;table-layout:fixed;margin:0 0 2mm';
 const heads=[...t.querySelectorAll('thead tr:last-child>th')],remove=heads.map((h,i)=>/^actions?$/i.test(h.textContent.trim())?i:-1).filter(i=>i>=0).reverse();for(const r of t.rows)for(const i of remove)if(r.cells.length===heads.length||r.parentElement.tagName==='THEAD')r.cells[i]?.remove();
 t.querySelectorAll('th,td').forEach(c=>{const numeric=/^[−–-]?[\d,.]+(?:\s*(?:DR|CR|Dr|Cr))?$/.test(c.textContent.trim());c.style.cssText='border-bottom:0.5pt solid #b8c8bd;padding:0.55mm 0.65mm;vertical-align:top;overflow-wrap:anywhere;'+(c.tagName==='TH'?'background-color:#eaf1eb;text-align:left;font-weight:bold;':numeric?'text-align:right;white-space:nowrap;overflow-wrap:normal;':'white-space:pre-line;');if(numeric){const m=c.textContent.trim().match(/^(.*)\s+(DR|CR|Dr|Cr)$/);if(m)c.innerHTML=esc(m[1])+'<br><small>'+esc(m[2])+'</small>';}});
 t.querySelectorAll('thead').forEach(h=>h.style.display='table-header-group');
 });
 root.querySelectorAll('h1,h2,h3,h4,h5').forEach(h=>{h.style.cssText=h.tagName==='H1'?'font-family:Arial;font-size:15pt;font-weight:bold;color:#176249;margin:0 0 1.5mm':'font-family:Arial;font-size:10pt;font-weight:bold;color:white;background-color:#176249;padding:1mm 1.5mm;margin:2mm 0 1mm;break-after:avoid';});
 root.querySelectorAll('p').forEach(p=>p.style.cssText='font-family:Arial;font-size:10pt;line-height:1.15;margin:1mm 0 2mm;white-space:pre-wrap');
 return root.innerHTML;}
function financial(kind){const groups=reportModel79(kind,true);let html=title(reportNames79[kind],Reports79.from+' — '+Reports79.to),omitted=[];
 for(const g of groups){const start=['gl','activity'].includes(kind)?4:['cf','payroll'].includes(kind)?1:2;const hasAmounts=g.values.some(r=>r.slice(start).some(v=>Number(String(v).replace(/,/g,'').replace(/\s*(?:DR|CR)$/,''))));if(!hasAmounts&&!g.metrics.some(([,v])=>Number(v))){omitted.push(g.currency);continue}html+=head(g.currency);
 if(kind==='pl'||kind==='expense'){
 for(const type of kind==='expense'?['EXPENSE']:['REVENUE','EXPENSE']){const rows=g.values.filter(r=>String(r[0]).toUpperCase()===type).map(r=>[r[1],r[4]]);html+=head(type==='REVENUE'?'Income':'Expenses')+table(['Account / Description','Amount'],rows.length?rows:[['No activity','—']],[72,28],[1]);}
 }else if(kind==='tb'){
 html+=head('Opening and period movement')+table(['Account','Opening (DR − CR)','Period debit','Period credit'],g.values.map(r=>[r[0],r[2],r[3],r[4]]),[34,22,22,22],[1,2,3]);
 html+=head('Closing balances')+table(['Account','Classification','Closing debit','Closing credit'],g.values.map(r=>[r[0],r[1],r[5],r[6]]),[34,22,22,22],[2,3]);
 }else if(['gl','activity'].includes(kind)){
 const accountName=r=>String(r[2]).replace(/^(DR|CR|—) · /,'');const accounts=[...new Set(g.values.map(accountName))];for(const account of accounts)html+=head(String(account).replace(/^(DR|CR|—) · /,''))+table(['Date','Entry / description','Debit','Credit','Running amount'],g.values.filter(r=>accountName(r)===account).map(r=>[r[0],r[1]+'\n'+r[3],r[4],r[5],r[6]+' '+(String(r[2]).match(/^(DR|CR)/)?.[1]||'')]),[12,28,20,20,20],[2,3,4]);
 }else html+=table(g.headers,g.values,undefined,g.headers.map((h,i)=>/amount|debit|credit|opening|closing|20\d\d/i.test(h)?i:-1));
 if(g.metrics.length)html+=table(['Total / result','Amount'],g.metrics.map(([k,v])=>[k,money69(v)]),[72,28],[1]);html+=`<p>${esc(g.note)}</p>`;
 }
 if(omitted.length)html+=`<p>${omitted.map(c=>esc(c)+' = 0; no activity').join(' · ')}</p>`;
 if(!groups.length)html+='<p>No posted records for this selection.</p>';
 if(Reports79.query&&['gl','activity'].includes(kind))html+=`<p>Detail search: ${esc(Reports79.query)}. Balances cover the full selected period.</p>`;
 if(Reports79.notes[kind])html+=head('Notes / findings')+`<p>${esc(Reports79.notes[kind])}</p>`;
 return format(html)+signatures();}
function cleanSource(source){const clone=source.cloneNode(true),original=[source,...source.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')];original.forEach((n,i)=>{if(n.hidden||n.style.display==='none')copies[i]?.remove()});
 clone.querySelectorAll('#todos136').forEach(n=>n.remove());
 clone.querySelectorAll('td,th').forEach(n=>{if(n.matches('.audit-expand-cell')||n.getAttribute('aria-label')==='Expand record')n.remove()});
 return documentWorkspace105.copySource(clone);}
function sourceId(){if(active()==='accounts-modular-container'){const selected=document.querySelector('.print-selected-section');if(selected&&names[selected.id])return selected.id;return [...document.querySelectorAll('#accounts-modular-container>section')].find(n=>names[n.id]&&!n.hidden&&getComputedStyle(n).display!=='none')?.id||'sec-chart-accounts'}return active();}
function hr(){const run=Work82.run;if(!run)throw Error('Open an attendance month first.');const rows=run.rows||[],results=runResults82(structuredClone(run));return title('HR Attendance & Late Calculation',run.month)+head('Employee reference')+table(['Code','Employee','Position'],rows.map(r=>[r.employee.code,r.employee.name,r.employee.position||'']),[18,47,35])+head('Attendance calendar')+reports14254.attendance(run,rows)+head('Attendance and late calculation · LAK')+reports14254.attendanceSummary(run,results,'en',true);}
function sourceModel(id){const node=document.getElementById(id);if(!node)throw Error('Open this reporting area first.');let html;
 if(['hr-attendance','payroll-deductions'].includes(id))html=hr();else if(id==='period-review'){const month=PeriodReview.selectedMonth,rows=periodEntries(month),findings=PeriodReview.findings.filter(f=>f.month===month);html=title(names[id],month+' · '+PeriodReview.status(month))+head('Review findings')+table(['Finding / reference','Type / status','Description','Adjustment'],findings.map(f=>[f.number||f.id,(f.type||'')+' / '+f.status,f.description,f.adjustmentEntryId||'—']),[20,20,40,20])+head('Period transactions')+reports14254.journalTable(rows);}else{html=cleanSource(node);if(id==='period-review'){const meta=[['Period',document.getElementById('periodReviewMonth105')?.value||''],['Status',document.getElementById('periodReviewStatus')?.textContent||'']];html=table(['Review','Value'],meta,[40,60])+html;}
 const filters=[...node.querySelectorAll('input[type=month],input[type=date],input[type=search],select')].filter(n=>!n.closest('form,tbody')).map(n=>{const label=n.getAttribute('aria-label')||n.closest('label')?.textContent.split('\n')[0]||n.id;return n.value?label+': '+(n.tagName==='SELECT'?n.selectedOptions[0]?.textContent:n.value):''}).filter(Boolean);html=title(names[id],filters.join(' · ')||'Current selection')+html;}
 return (['hr-attendance','payroll-deductions','period-review'].includes(id)?html:format(html))+signatures();}
function open(id,reportTitle,html,category='Reports'){permission(id);return openDocumentEditor105({title:reportTitle,category,source:id,html,printPreview:true,approvedLayout14254:true,settings:reports14254.settings()});}
async function printFinancial(kind){try{return await open('report-'+kind,reportNames79[kind],financial(kind));}catch(e){showCenterStatus(e.message,true);}}
async function printSource(id=sourceId()){try{permission(id);return await open(id,names[id],sourceModel(id),id.startsWith('hr-')?'Human Resources':'Reports');}catch(e){showCenterStatus(e.message,true);}}
function ready(){
 const model=window.reportModel79;window.reportModel79=function(kind,...args){const old=Reports79.kind;try{Reports79.kind=kind;return model.call(this,kind,...args)}finally{Reports79.kind=old}};
 window.print82=function(name,content,period='',options={}){const id=active();try{permission(id);return openDocumentEditor105({title:name,category:/payroll|salary/i.test(name)?'Payroll':'Reports',source:id,printPreview:true,...options,approvedLayout14254:true,settings:reports14254.settings(),html:format(title(name,period)+content)+(content.includes('data-print-signatures')?'':signatures())});}catch(e){showCenterStatus(e.message,true);}};
 const reconciliation=window.printReport71;window.printReport71=function(...args){try{permission('report-reconciliation');return reconciliation.apply(this,args)}catch(e){showCenterStatus(e.message,true)}};
 window.printDesktopReport79=printFinancial;
 window.printHistory95=function(id){try{permission(active());const run=Work82.runs.find(r=>r.id===id)?.data;if(!run)throw Error('Open a saved payroll month first.');return open(active(),'Payroll Calculation Report '+run.month,reports14254.payroll(run,runResults82(run))+signatures(),'Payroll');}catch(e){showCenterStatus(e.message,true);}};
 const before=window.print,copy=window.copyReportToEditor105;
 function route(f,args){const id=sourceId();if(id.startsWith('report-')&&Object.hasOwn(reportNames79,id.slice(7))&&id!=='report-payroll')return printFinancial(id.slice(7));if(id==='report-financing82')return printFinance82();if(id==='report-reconciliation'&&typeof currentReport71!=='undefined'&&currentReport71&&document.getElementById('reportOverlay71'))return printReport71();if(names[id])return printSource(id);return f(...args)}
 window.print=(...args)=>route(before,args);window.copyReportToEditor105=(...args)=>route(copy,args);
 let pending=false;function decorate(){for(const [id,name]of Object.entries(names)){const node=document.getElementById(id);if(['period-review','transactions-voided'].includes(id)||!node||node.querySelector('[data-print14282]')||!allowed(id)||!node.querySelector('table'))continue;const b=document.createElement('button');b.type='button';b.className='je-btn je-btn-secondary no-print';b.dataset.print14282=id;b.textContent='Print Report';b.onclick=()=>printSource(id);node.prepend(b)}}
 new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;decorate()})}).observe(document.body,{subtree:true,childList:true});decorate();
}
window.reportFormats14282={format,financial,sourceModel,printSource,printFinancial,names};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
