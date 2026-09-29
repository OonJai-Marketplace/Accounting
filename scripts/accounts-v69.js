/* ACCOUNTS 69 — One posted-journal source for ledger, trial balance and balances. */
const now71=new Date();
const date71=(y,m,d)=>`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const Accounts69={mode:'monthly',month:date71(now71.getFullYear(),now71.getMonth()+1,1).slice(0,7),year:now71.getFullYear(),quarter:Math.floor(now71.getMonth()/3)+1,from:'',to:'',currency:'',account:'',query:''};
function periodRange71(){
 let y=Number(Accounts69.year),m=1,count=12;
 if(Accounts69.mode==='custom')return;
 if(Accounts69.mode==='monthly'){[y,m]=Accounts69.month.split('-').map(Number);count=1}
 if(Accounts69.mode==='quarterly'){m=(Number(Accounts69.quarter)-1)*3+1;count=3}
 Accounts69.from=date71(y,m,1);const end=new Date(y,m-1+count,0);Accounts69.to=date71(end.getFullYear(),end.getMonth()+1,end.getDate());
}
periodRange71();
function accountsToday88(){const n=new Date();return date71(n.getFullYear(),n.getMonth()+1,n.getDate())}
function periodControls71(){
 const today=accountsToday88(),year=Number(today.slice(0,4)),quarter=Math.ceil(Number(today.slice(5,7))/3);
 return `<label class="filter-period81">Period<select onchange="setReport69('mode',this.value)">${['monthly','quarterly','yearly','custom'].map(v=>`<option value="${v}" ${Accounts69.mode===v?'selected':''}>${v[0].toUpperCase()+v.slice(1)}</option>`).join('')}</select></label>`+(Accounts69.mode==='monthly'?`<label class="filter-month81">Month<input type="month" max="${today.slice(0,7)}" value="${Accounts69.month}" onchange="setReport69('month',this.value)"></label>`:Accounts69.mode==='custom'?`<label class="filter-date81">From<input type="date" max="${today}" value="${Accounts69.from}" onchange="setReport69('from',this.value)"></label><label class="filter-date81">Through<input type="date" max="${today}" value="${Accounts69.to}" onchange="setReport69('to',this.value)"></label>`:`${Accounts69.mode==='quarterly'?`<label class="filter-quarter81">Quarter<select onchange="setReport69('quarter',this.value)">${[1,2,3,4].map(q=>`<option value="${q}" ${Number(Accounts69.quarter)===q?'selected':''} ${Number(Accounts69.year)>=year&&q>quarter?'disabled':''}>${matchMedia('(min-width:1025px)').matches?'Quarter ':'Q'}${q}</option>`).join('')}</select></label>`:''}<label class="filter-year81">Year<input type="number" min="1900" max="${year}" value="${Accounts69.year}" onchange="setReport69('year',this.value)"></label>`);
}
function closeSelectedMonth71(){if(Accounts69.mode!=='monthly')return;document.getElementById('closeMonth67').value=Accounts69.month;return closeMonthFromAccounts()}

const money69=n=>formatAppNumber(n/100);
const cents69=n=>Math.round(Number(n||0)*100);
function accountForLine69(line){
 const a=AccountingStore.accounts||[];
 return a.find(x=>line.accountId&&String(x.id)===String(line.accountId))||a.find(x=>line.accountCode&&String(x.code)===String(line.accountCode))||a.find(x=>x.name===line.account&&x.currency===line.currency)||null;
}
function accountKey69(a,currency){return `${a.id||a.code||a.name}|${currency||a.currency||''}`}
function accountData69(through=Accounts69.to){
 const map=new Map();
 (AccountingStore.accounts||[]).forEach(a=>map.set(accountKey69(a),{account:a,key:accountKey69(a),currency:a.currency,opening:0,debit:0,credit:0,closing:0,lines:[]}));
 JournalModule.entries.forEach((line,index)=>{
  if(line.status&&line.status!=='posted')return;
  const a=accountForLine69(line)||{name:line.account,code:line.accountCode||'Unmapped',currency:line.currency,type:'Unmapped'};
  const key=accountKey69(a,line.currency);if(!map.has(key))map.set(key,{account:a,key,currency:line.currency,opening:0,debit:0,credit:0,closing:0,lines:[]});
  const r=map.get(key),date=String(line.date||'').slice(0,10),dr=cents69(line.debit),cr=cents69(line.credit);
  if(!date||date>through)return;
  if(Accounts69.from&&date<Accounts69.from)r.opening+=dr-cr;
  else{r.debit+=dr;r.credit+=cr;r.lines.push({...line,date,dr,cr,originalIndex:index})}
 });
 return [...map.values()].map(r=>{r.closing=r.opening+r.debit-r.credit;r.lines.sort((a,b)=>a.date.localeCompare(b.date)||String(a.id).localeCompare(String(b.id))||a.originalIndex-b.originalIndex);return r}).sort((a,b)=>String(a.account.code).localeCompare(String(b.account.code),undefined,{numeric:true}));
}
function reportRows69(through=Accounts69.to){return accountData69(through).filter(r=>(!Accounts69.currency||r.currency===Accounts69.currency)&&(!Accounts69.account||r.key===Accounts69.account))}
function balanceText69(value){return `${money69(Math.abs(value))}${value>0?' DR':value<0?' CR':''}`}
function reportControls69(kind){
 const rows=accountData69(),codes=[...new Set([...(CurrencyStore.currencies||[]).map(c=>c.code),...rows.map(r=>r.currency)])];
 return `<div class="report-controls69">${periodControls71()}<label class="filter-currency81">Currency <select onchange="setReport69('currency',this.value)"><option value="">All currencies</option>${codes.map(c=>`<option ${Accounts69.currency===c?'selected':''}>${escapeHtml(c)}</option>`).join('')}</select></label><label class="filter-account81">Account <select onchange="setReport69('account',this.value)"><option value="">All accounts</option>${rows.map(r=>`<option value="${escapeHtml(r.key)}" ${Accounts69.account===r.key?'selected':''}>${escapeHtml(r.account.code+' — '+r.account.name+' ('+r.currency+')')}</option>`).join('')}</select></label>${kind==='ledger'?`<label class="filter-search81">Search <input type="search" value="${escapeHtml(Accounts69.query)}" placeholder="ID, account or description" onchange="setReport69('query',this.value)"></label>`:''}</div>`;
}
function setReport69(key,value){
 const previous={...Accounts69},today=accountsToday88(),year=Number(today.slice(0,4));
 if((['month','year','from','to'].includes(key)&&!value)||(key==='year'&&(!Number.isInteger(Number(value))||Number(value)<1900||Number(value)>year))){renderAccounts69();return}
 if((key==='month'&&value>today.slice(0,7))||(['from','to'].includes(key)&&value>today)){
  showCenterStatus('Choose today or an earlier reporting period.',true);renderAccounts69();return;
 }
 Accounts69[key]=value;
 // A retained quarter from an earlier year must not become a future quarter.
 if(['year','mode'].includes(key)&&Number(Accounts69.year)===year)Accounts69.quarter=Math.min(Number(Accounts69.quarter),Math.ceil(Number(today.slice(5,7))/3));
 if(key==='mode'&&value==='custom')Accounts69.to=Accounts69.to>today?today:Accounts69.to;
 periodRange71();
 if(!Accounts69.to||Accounts69.from>today||(Accounts69.from&&Accounts69.from>Accounts69.to)){
  Object.assign(Accounts69,previous);showCenterStatus('Choose a valid reporting period that has already started.',true);
 }
 renderAccounts69();
}
function header69(title,subtitle,kind){return `<div class="je-card-header main-heading87"><div><h3>${title}</h3><p>${subtitle}</p></div>${kind?`<div class="module-actions71"><button class="je-btn je-btn-secondary" onclick="exportAccounts69('${kind}')">Export CSV</button></div>`:''}</div>`}
function totals69(rows){
 const map={};rows.forEach(r=>{const t=map[r.currency]||(map[r.currency]={dr:0,cr:0,activityDr:0,activityCr:0});t.dr+=Math.max(r.closing,0);t.cr+=Math.max(-r.closing,0);t.activityDr+=r.debit;t.activityCr+=r.credit});return map;
}
function currencySummary69(rows){return `<div class="report-summary69">${Object.entries(totals69(rows)).map(([c,t])=>`<div><strong>${escapeHtml(c)}</strong><span>Closing DR ${money69(t.dr)} · CR ${money69(t.cr)}</span><b class="${t.dr===t.cr?'green':'negative-amount'}">${t.dr===t.cr?'Balanced':'Difference '+money69(Math.abs(t.dr-t.cr))}</b></div>`).join('')}</div>`}
function ledgerSummary88(r){
 if(!matchMedia('(min-width:1025px)').matches)return `<summary class="ledger-summary71"><span class="currency-symbol-badge" data-currency-code="${escapeHtml(r.currency)}" title="${escapeHtml(r.currency)}">${currencySymbolV6(r.currency)}</span><span class="ledger-name71"><small>Account</small><strong>${escapeHtml(r.account.name)}</strong></span><span class="ledger-stat71"><small>Lines</small><strong>${r.lines.length}</strong></span><span class="ledger-stat71"><small>Total DR</small><strong>${money69(r.debit)}</strong></span><span class="ledger-stat71"><small>Total CR</small><strong>${money69(r.credit)}</strong></span><span class="ledger-stat71"><small>Closing · ${escapeHtml(r.currency)}</small><strong>${balanceText69(r.closing)}</strong></span></summary>`;
 return `<summary class="ledger-summary71 aligned85"><span class="ledger-identity85"><span class="currency-symbol-badge" data-currency-code="${escapeHtml(r.currency)}" title="${escapeHtml(r.currency)}">${currencySymbolV6(r.currency)}</span><span class="ledger-name71"><small>Account</small><strong>${escapeHtml(r.account.name)}</strong></span></span><span class="ledger-stat71"><small>Total DR</small><strong>${money69(r.debit)}</strong></span><span class="ledger-stat71"><small>Total CR</small><strong>${money69(r.credit)}</strong></span><span class="ledger-stat71"><small>Closing · ${escapeHtml(r.currency)}</small><strong>${money69(Math.abs(r.closing))}</strong></span><span class="ledger-meta85"><span>Type <b>${r.closing>0?'DR':r.closing<0?'CR':'—'}</b></span><span>Lines <b>${r.lines.length}</b></span></span></summary>`;
}
function ledgerHtml69(rows){
 const q=Accounts69.query.trim().toLowerCase();
 return rows.filter(r=>r.lines.length||r.opening).map((r,index)=>{
  let running=r.opening;const lines=r.lines.map(l=>{running+=l.dr-l.cr;return {...l,running}}).filter(l=>!q||`${l.id} ${l.memo} ${r.account.name} ${r.account.code} ${l.date}`.toLowerCase().includes(q));
  if(q&&!lines.length)return'';
  return `<details class="ledger-account69 ${matchMedia('(min-width:1025px)').matches?'ledger-aligned85':''}" ${rows.length===1?'open':''}>${ledgerSummary88(r)}<div class="table-container table-module85"><table><thead><tr><th>Date</th><th>Entry ID</th><th>Description / Reference</th><th>Debit</th><th>Credit</th><th>Running Balance</th><th>Action</th></tr></thead><tbody><tr class="opening69"><td colspan="3">Opening balance${Accounts69.from?' before '+formatAppDate(Accounts69.from):' from posted records'}</td><td>—</td><td>—</td><td>${money69(r.opening)}</td><td></td></tr>${lines.map(l=>`<tr><td>${formatAppDate(l.date)}</td><td>${escapeHtml(l.id)}</td><td>${escapeHtml(l.memo||'')}</td><td>${money69(l.dr)}</td><td>${money69(l.cr)}</td><td>${money69(l.running)}</td><td><button class="je-btn je-btn-secondary" onclick="showJournalSource69('${encodeURIComponent(l.id)}')">View</button></td></tr>`).join('')}</tbody></table></div></details>`;
 }).join('')||'<p class="period-empty">No posted journal activity matches this selection.</p>';
}
function trialThrough87(){
 const now=new Date(),today=date71(now.getFullYear(),now.getMonth()+1,now.getDate());
 return Accounts69.from<=today&&Accounts69.to>today?today:Accounts69.to;
}
function trialRangeLabel87(){
 const format=value=>new Date(value+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
 return `${format(Accounts69.from)} – ${format(trialThrough87())}`;
}
function trialHtml69(rows){
 const codes=[...new Set(rows.map(r=>r.currency))];
 return codes.map(c=>{const group=rows.filter(r=>r.currency===c&&(r.opening||r.debit||r.credit)),t=totals69(group)[c]||{dr:0,cr:0};return `<section class="report-group69"><h4>${escapeHtml(c)} · Trial Balance · ${trialRangeLabel87()}</h4><div class="table-container"><table><thead><tr><th>Code</th><th>Account</th><th>Type</th><th>Opening Balance</th><th>Period DR</th><th>Period CR</th><th>Closing DR</th><th>Closing CR</th></tr></thead><tbody>${group.map(r=>`<tr><td>${escapeHtml(r.account.code)}</td><td><button class="account-link69" onclick="openIndividualLedger69('${encodeURIComponent(r.key)}')">${escapeHtml(r.account.name)}</button></td><td>${escapeHtml(r.account.type||'Unclassified')}</td><td>${balanceText69(r.opening)}</td><td>${money69(r.debit)}</td><td>${money69(r.credit)}</td><td>${money69(Math.max(0,r.closing))}</td><td>${money69(Math.max(0,-r.closing))}</td></tr>`).join('')||'<tr><td colspan="8">No activity.</td></tr>'}<tr class="report-total69"><td colspan="6">Closing totals</td><td>${money69(t.dr)}</td><td>${money69(t.cr)}</td></tr></tbody></table></div></section>`}).join('');
}
function balanceBadge105(value){const side=value>0?'DR':value<0?'CR':'—';return `<span class="balance-value105"><span class="balance-badge105 ${side.toLowerCase()}" aria-label="${side==='DR'?'Debit balance':side==='CR'?'Credit balance':'Zero balance'}">${side}</span><span>${money69(Math.abs(value))}</span></span>`}
function balancesHtml69(rows){return `<div class="table-container"><table><thead><tr><th>Code</th><th>Account</th><th>Type</th><th>Currency</th><th>Opening</th><th>Period DR</th><th>Period CR</th><th>Closing</th><th>Last Activity</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${escapeHtml(r.account.code)}</td><td><button class="account-link69" onclick="openIndividualLedger69('${encodeURIComponent(r.key)}')">${escapeHtml(r.account.name)}</button></td><td>${escapeHtml(r.account.type||'Unclassified')}</td><td>${escapeHtml(r.currency)}</td><td>${balanceText69(r.opening)}</td><td>${money69(r.debit)}</td><td>${money69(r.credit)}</td><td>${balanceBadge105(r.closing)}</td><td>${r.lines.length?formatAppDate(r.lines.at(-1).date):'—'}</td></tr>`).join('')||'<tr><td colspan="9">No accounts.</td></tr>'}</tbody></table></div>`}
function renderAccounts69(){
 const rows=reportRows69(),ledger=document.getElementById('ledger69'),trial=document.getElementById('trial69'),balances=document.getElementById('balances69');
 if(!ledger)return;
 ledger.innerHTML=`<div class="je-card-header ledger-header71 main-heading87"><div><h3>General Ledger</h3><p>Review posted entries and the Trial Balance before closing the selected month.</p></div><div class="ledger-actions71"><div class="module-actions71"><button class="je-btn je-btn-secondary" onclick="exportAccounts69('ledger')">Export CSV</button><button class="je-btn je-btn-secondary" onclick="createReconciliation71()">Create Reconciliation Report</button><button class="je-btn je-btn-emerald" ${Accounts69.mode!=='monthly'?'disabled title="Select Monthly to close one month"':''} onclick="closeSelectedMonth71()">Close &amp; Archive Month</button></div><span>${Accounts69.mode==='monthly'?monthLabel(Accounts69.month):'Select Monthly to close one month.'}</span></div></div>`+reportControls69('ledger')+ledgerHtml69(rows)+`<input type="hidden" id="closeMonth67" value="${Accounts69.month}">`;

 const trialRows=reportRows69(trialThrough87());
 trial.innerHTML=header69('Trial Balance','Opening balances + period activity = closing balances. Each currency balances independently; equal totals do not rule out missing or misclassified entries.','trial')+reportControls69('trial')+(Accounts69.account?'<p class="report-note69">Single-account view: debit and credit totals are not expected to balance. Select All accounts for the full Trial Balance.</p>':'')+currencySummary69(trialRows)+trialHtml69(trialRows);
 balances.innerHTML=header69('Account Balances','A snapshot of each account at the selected end date. Click an account to inspect its individual ledger.','balances')+reportControls69('balances')+balancesHtml69(rows);
 renderOtherAccounts69(rows);
}
function openIndividualLedger69(encoded){Accounts69.account=decodeURIComponent(encoded);Accounts69.query='';renderAccounts69();scrollToAccountModule('sec-general-ledger')}
function showJournalSource69(encoded){
 const id=decodeURIComponent(encoded),lines=JournalModule.entries.filter(l=>l.id===id);if(!lines.length)return;
 document.getElementById('source69')?.remove();const overlay=document.createElement('div');overlay.id='source69';overlay.className='submission-compare-overlay';overlay.innerHTML=`<section class="source-dialog69"><header><h3>Journal Entry ${escapeHtml(id)}</h3><button class="je-btn je-btn-secondary" onclick="document.getElementById('source69').remove()">Close</button></header><div class="table-container"><table><thead><tr><th>Date</th><th>Account</th><th>Currency</th><th>Description</th><th>Debit</th><th>Credit</th></tr></thead><tbody>${lines.map(l=>`<tr><td>${formatAppDate(l.date)}</td><td>${escapeHtml(l.account)}</td><td>${escapeHtml(l.currency)}</td><td>${escapeHtml(l.memo)}</td><td>${formatAppNumber(l.debit)}</td><td>${formatAppNumber(l.credit)}</td></tr>`).join('')}</tbody></table></div><p>${lines.some(l=>l.archived)?'Closed period — use Period Closing to review or reopen.':'Open period — editing remains available in Active Journal.'}</p></section>`;document.body.append(overlay);
}
function renderOtherAccounts69(){if(typeof renderSystemAccounts71==='function')renderSystemAccounts71()}
function exportAccounts69(kind){
 const through=kind==='trial'?trialThrough87():Accounts69.to,rows=reportRows69(through);let header=['Code','Account','Currency','Opening DR less CR','Period Debit','Period Credit','Closing DR','Closing CR'];let values=rows.map(r=>[r.account.code,r.account.name,r.currency,r.opening/100,r.debit/100,r.credit/100,Math.max(r.closing,0)/100,Math.max(-r.closing,0)/100]);
 if(kind==='ledger'){header=['Code','Account','Currency','Date','Entry ID','Description','Debit','Credit','Running DR less CR'];values=rows.flatMap(r=>{let running=r.opening;return [[r.account.code,r.account.name,r.currency,Accounts69.from,'','Opening',0,0,r.opening/100],...r.lines.map(l=>{running+=l.dr-l.cr;return [r.account.code,r.account.name,r.currency,l.date,l.id,l.memo,l.dr/100,l.cr/100,running/100]})]})}
 const csv=[header,...values].map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`${kind}-${through}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const refreshAccountsBefore69=refreshAllTables;
refreshAllTables=function(...args){refreshAccountsBefore69(...args);renderAccounts69()};
document.addEventListener('DOMContentLoaded',()=>renderAccounts69());

archiveTransactionMonth=function(month){Accounts69.mode='monthly';Accounts69.month=month;periodRange71();renderAccounts69();scrollToAccountModule('sec-general-ledger')};
