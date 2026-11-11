/* Administrator maintenance hub. Reads full server snapshots; closing is one guarded RPC. */
(()=>{'use strict';const ID='settings-maintenance14324',CLOSE='transactions-closing14325',$=id=>document.getElementById(id),E=maintenanceEngine14324,esc=v=>escapeHtml(String(v??''));let owner='',generation=0,pack=null,checkup=null,diagnostic=null,busy=false,contextClient=null;
const actor=()=>typeof liveProfile!=='undefined'&&liveProfile?.role==='admin'&&liveProfile.status==='active'&&window.access113?.can(ID)?liveProfile.id:'';
const monthNow=()=>{const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Vientiane',year:'numeric',month:'2-digit'}).formatToParts(new Date());return p.find(x=>x.type==='year').value+'-'+p.find(x=>x.type==='month').value};
function guard(id,client=ojmDb){if(!id||id!==actor()||client!==ojmDb)throw Error('Administrator sign-in changed. Run the check again.')}
async function rpc(name,args={}){const id=actor(),client=ojmDb;guard(id,client);if(navigator.onLine===false)throw Error('Connect to the database to run current maintenance checks.');const r=await client.rpc(name,args);guard(id,client);if(r.error)throw Error(r.error.code==='PGRST202'||/maintenance.*(schema cache|does not exist)/i.test(r.error.message)?'Install setup/INSTALL-MAINTENANCE-v143.24.sql in this company database, then retry. Closing requires this database update.':r.error.message);return r.data}
function clear(){document.querySelectorAll('.maintenance-modal14324').forEach(n=>n.resolve108?.(false));generation++;pack=checkup=diagnostic=null;owner=actor();contextClient=ojmDb;for(const id of ['maintenanceChecks14324','maintenanceTrace14324','maintenanceDiagnostics14324'])$(id)?.replaceChildren();}
function table(headers,values){return '<div class="maintenance-table14324"><table><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+values.map(row=>'<tr>'+row.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'}
async function download(name,value,type='application/json'){const text=type==='application/json'?JSON.stringify(value,null,2):value,url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;try{const delivered=await (window.exportCenter14337?exportCenter14337.fromLink(a):a.click());if(delivered===false)throw Error('The export was not prepared. Try again.')}finally{setTimeout(()=>URL.revokeObjectURL(url),3000)}}
function status(message){for(const id of ['maintenanceStatus14324','maintenanceClosingStatus14325'])if($(id))$(id).textContent=message}
async function task(fn){if(busy)return;busy=true;const id=actor(),client=ojmDb;try{guard(id,client);if(owner!==id||contextClient!==client)clear();document.querySelectorAll('#'+ID+' button,#'+CLOSE+' button').forEach(b=>b.disabled=true);await fn(id);guard(id,client)}catch(e){if(id===actor()&&client===ojmDb){status(e.message);if(!document.querySelector('.maintenance-modal14324'))await modal('Action needs attention','<p>'+esc(e.message)+'</p>')}}finally{busy=false;document.querySelectorAll('#'+ID+' button,#'+CLOSE+' button').forEach(b=>b.disabled=false);showClosingState()}}
function validateCheck(c,month){if(c?.version!==14324||c.month!==month+'-01'||typeof c.fingerprint!=='string'||!Array.isArray(c.issues)||!Array.isArray(c.trial)||!Array.isArray(c.balances)||!c.pending?.revision)throw Error('Incomplete database check. Closing is unavailable.');if(c.reconciliation305?.version!==305)throw Error('Required reconciliation verification is unavailable. Reload before closing.');if(c.coverage?.version!==281||!Array.isArray(c.entry_checks))throw Error('The schedule and foreign-currency checks are unavailable. Update the database before closing.');return c}
async function preflight(month){E.cutoff(month);return validateCheck(await rpc('maintenance_preflight14324',{p_month:month+'-01'}),month)}
async function snapshot(){const p=await rpc('maintenance_snapshot14324');if(p?.maintenanceVersion!==14324||!p.tables||!['accounts','journal_entries','journal_lines','payroll_runs','payroll_lines'].every(t=>Array.isArray(p.tables[t])))throw Error('Incomplete maintenance snapshot');return p}
async function describeFindings(check,client){
 const journalByNumber=new Map(check.entry_checks.map(e=>[e.entry_no,e.id]));
 const ids={journal:new Set(),report:new Set(),submission:new Set(),payroll:new Set(),line:new Set(),finding:new Set(),review:new Set()};
 const sourceKeys=new Map();
 for(const issue of check.issues){
  const [type,id]=issue.id.split(':');
  let kind=type==='line-date'?'line':type,key=id;
  const number=(issue.detail||'').split(/ \/ |:| \(/,1)[0];
  const journal=journalByNumber.get(number);
  if(journal||['draft','memo','entry','empty','missing-id'].includes(type)){
   kind='journal';key=journal||id;
  }
  if(ids[kind]&&key){ids[kind].add(key);sourceKeys.set(issue.id,kind+':'+key)}
 }
 const sources=new Map();
 async function batches(kind,tableName,columns,record){
  const keys=[...ids[kind]];
  for(let i=0;i<keys.length;i+=50){
   const result=await client.from(tableName).select(columns).in('id',keys.slice(i,i+50));
   if(result.error)continue;
   for(const row of result.data||[])sources.set(kind+':'+row.id,record(row));
  }
 }
 const account=a=>a?[a.code,a.name].filter(Boolean).join(' · '):'';
 const date=v=>v?formatAppDate(v):'';
 const amount=v=>v==null?'':formatAppNumber(v);
 const rate=v=>v==null?'—':formatAppNumber(Number(v));
 const receipt=(entry,staffLine)=>({entry,staffLine});
 const journalColumns='id,entry_no,transaction_date,memo,reference,journal_lines(line_no,line_date,description,currency_code,debit,credit,book_rate_lak,fx_rate_lak,accounts(code,name))';
 await Promise.all([
  batches('journal','journal_entries',journalColumns,r=>({
   label:[r.entry_no,date(r.transaction_date),r.memo].filter(Boolean).join(' · '),reference:r.reference,receipt:receipt(r.entry_no),
   headers:['Date','Account','Line memo','Currency','Debit','Credit','Book rate','Transaction rate'],
   rows:(r.journal_lines||[]).sort((a,b)=>a.line_no-b.line_no).map(l=>[date(l.line_date||r.transaction_date),account(l.accounts),l.description,l.currency_code,amount(l.debit),amount(l.credit),l.currency_code==='LAK'?'—':rate(l.book_rate_lak),l.currency_code==='LAK'?'—':rate(l.fx_rate_lak)])
  })),
  batches('report','staff_journals','id,owner_id,period_start,status,owner:profiles!staff_journals_owner_id_fkey(full_name,user_permissions!user_permissions_user_id_fkey(job_title))',r=>({
   label:[r.owner?.full_name,r.period_start&&monthLabel(r.period_start.slice(0,7)),r.status].filter(Boolean).join(' · '),meta:r,
   headers:['Date','Source entry','Description / reference','Account','In / out','Amount','Currency','Receipts'],rows:[]
  })),
  batches('submission','entry_submissions','id,submission_no,transaction_date,memo,reference,amount,currency_code,status,debit:accounts!debit_account_id(code,name),credit:accounts!credit_account_id(code,name)',r=>({
   label:[r.submission_no,date(r.transaction_date),r.memo].filter(Boolean).join(' · '),reference:r.reference,
   headers:['Debit account','Credit account','Amount','Currency','Status'],rows:[[account(r.debit),account(r.credit),amount(r.amount),r.currency_code,r.status]]
  })),
  batches('line','journal_lines','id,line_no,line_date,description,currency_code,debit,credit,journal_entries(entry_no,transaction_date,memo),accounts(code,name)',l=>({
   label:[l.journal_entries?.entry_no,date(l.line_date||l.journal_entries?.transaction_date),l.journal_entries?.memo].filter(Boolean).join(' · '),
   receipt:receipt(l.journal_entries?.entry_no),headers:['Line','Account','Description','Currency','Debit','Credit'],rows:[[l.line_no,account(l.accounts),l.description,l.currency_code,amount(l.debit),amount(l.credit)]]
  })),
  batches('finding','period_findings','id,finding_no,reported_at,description,resolution_note,status',r=>({
   label:[r.finding_no,date(r.reported_at),r.status].filter(Boolean).join(' · '),headers:['Finding','Resolution note'],rows:[[r.description,r.resolution_note]]
  })),
  batches('review','audit_reviews136','id,created_at,description,status',r=>({
   label:'Audit review · '+date(r.created_at),headers:['Status','Description'],rows:[[r.status,r.description]]
  })),
  batches('payroll','payroll_runs','id,period_start,period_end,status',r=>({
   label:'Payroll · '+date(r.period_start)+' – '+date(r.period_end),headers:['Period start','Period end','Status'],rows:[[date(r.period_start),date(r.period_end),r.status]]
  }))
 ]);
 const reports=[...ids.report];
 for(let start=0;start<reports.length;start+=50){
  const batch=reports.slice(start,start+50);
  for(let offset=0;;offset+=500){
   const result=await client.from('staff_journal_lines').select('id,staff_journal_id,workspace_entry_no,transaction_date,memo,reference,direction,amount,currency_code,account:accounts!account_id(code,name),fund:accounts!fund_account_id(code,name)').in('staff_journal_id',batch).is('journal_entry_id',null).lt('transaction_date',E.cutoff(check.month.slice(0,7))).order('transaction_date').order('id').range(offset,offset+499);
   if(result.error){for(const id of batch){const s=sources.get('report:'+id);if(s)s.error='Report lines could not load. Run Data Check again.'}break}
   for(const l of result.data||[]){
    sources.get('report:'+l.staff_journal_id)?.rows.push([date(l.transaction_date),l.workspace_entry_no,[l.memo,l.reference].filter(Boolean).join(' · '),[account(l.account),account(l.fund)].filter(Boolean).join(' / '),l.direction,amount(l.amount),l.currency_code,receipt(l.workspace_entry_no,l.id)]);
   }
   if((result.data||[]).length<500)break;
  }
 }
 check.sourceDetails321=Object.fromEntries([...sourceKeys].map(([id,key])=>[id,sources.get(key)||{label:'Source details unavailable',error:'Refresh Data Check to retry loading this record.'}]));
}
function sourceHTML(source){
 if(!source)return '';
 const button=r=>window.JournalReceipts224?.enabled()&&(r.entry||r.staffLine)?'<button type="button" class="je-btn je-btn-secondary" data-source-receipt321="'+esc(r.entry||'')+'" data-staff-line321="'+esc(r.staffLine||'')+'">Receipts</button>':'';
 return '<div class="maintenance-source321"><strong>'+esc(source.label)+'</strong> '+(source.receipt?button(source.receipt):'')+
  (source.reference?'<p>'+esc(source.reference)+'</p>':'')+
  (source.rows?.length?'<div class="maintenance-table14324"><table><thead><tr>'+source.headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+source.rows.map(r=>'<tr>'+r.map(v=>'<td>'+(v&&typeof v==='object'?button(v):esc(v))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>':'')+
  (source.error?'<p>'+esc(source.error)+'</p>':'')+'</div>';
}
function renderCheck(c){
 const block=c.issues.filter(x=>x.severity==='block'),v=c.coverage;
 const signed=n=>n==null?'Needs source review':formatAppNumber(n);
 const entryRows=(c.entry_checks||[]).map(e=>{const found=c.issues.filter(i=>i.id.includes(e.id)||i.detail?.startsWith(e.entry_no+' /')||i.detail?.startsWith(e.entry_no+':'));return [e.entry_no,formatAppDate(e.date),e.lines,e.foreign_lines,signed(e.base_difference),e.foreign_lines||e.fx_recorded?signed(e.fx_expected):'—',e.foreign_lines||e.fx_recorded?signed(e.fx_recorded):'—',found.some(i=>i.severity==='block')?'Fix before closing':found.length?'Review '+found.length+' item(s)':'No arithmetic issue found'];});
 return '<h3>'+esc(c.month.slice(0,7))+' Closing Checks</h3><p>'+esc(block.length?block.length+' blocking error(s). Closing cannot continue.':c.issues.length+' item(s) need review. '+(c.selectedCoverage?'Selected checks only; see the complete flag list before closing.':'No blocking arithmetic error found.'))+'</p><p>Posted ledger through month-end. Currencies stay separate. Checked '+esc(formatAppDate(c.checkedAt,true))+'.</p>'+(v?'<p>'+esc(v.entries+' entries · '+v.foreign_entries+' foreign-currency entries · '+v.schedule_items+' schedule items checked.')+'</p><p>'+esc(v.rate_evidence)+'</p>':'')+table(['Currency','Debit','Credit','Difference'],c.trial.map(t=>[t.currency,formatAppNumber(t.debit),formatAppNumber(t.credit),formatAppNumber(t.difference)]))+(c.trial.length?'':'<p>No posted ledger lines through this month.</p>')+(c.reconciliation305?.items?.length?'<details><summary>Required reconciliations</summary>'+reconciliationTable(c)+'</details>':'')+(block.length?'<h4>Fix before closing</h4>'+block.map(i=>'<p><strong>'+esc(i.title)+'</strong> · '+esc(i.detail)+'</p>'+sourceHTML(c.sourceDetails321?.[i.id])).join(''):'')+checkWarningDetails(c)+(!c.selectedCoverage&&entryRows.length?'<details><summary>Entry-by-entry results ('+entryRows.length+')</summary><p>FX amounts are LAK: positive is a loss/debit; negative is a gain/credit. Expected amounts use the saved business carrying values, with mapping and rate checks above.</p>'+table(['Entry ID','Date','Lines','Foreign lines','LAK difference','Expected FX','Recorded FX','Result'],entryRows)+'</details>':'');
}
function checkWarningDetails(c){
 const groups=new Map();
 for(const issue of c.issues.filter(i=>i.severity==='warning')){
  const source=c.sourceDetails321?.[issue.id],meta=source?.meta;
  const title=meta?.owner?.full_name?'Staff reports · '+meta.owner.full_name:issue.title;
  if(!groups.has(title))groups.set(title,new Map());
  const records=groups.get(title),key=source||issue;
  if(!records.has(key))records.set(key,[]);
  records.get(key).push(issue);
 }
 return [...groups].map(([title,records])=>{
  let count=0;
  const content=[...records].map(([key,items])=>{
   count+=items.length;return items.map(i=>'<p>'+esc(i.detail)+'</p>').join('')+sourceHTML(c.sourceDetails321?.[items[0].id]);
  }).join('');
  return '<details><summary>'+esc(title)+' ('+count+')</summary>'+content+'</details>';
 }).join('');
}
function reconciliationTable(c){
 const n=v=>v==null?'—':formatAppNumber(Number(v));
 return table(['Account','Currency','Status','Ledger','Statement / count','Reference','Reconciliation ID'],(c.reconciliation305?.items||[]).map(a=>[a.code+' '+a.name,a.currency,a.state,n(a.ledgerAmount321),n(a.actualAmount321),a.reference321||'—',a.reportId||'—']));
}
async function runChecks(){const month=$('maintenanceMonth14324').value;status('Checking current saved records…');const id=actor(),client=ojmDb,c=await preflight(month);await describeFindings(c,client);guard(id,client);if($('maintenanceMonth14324').value!==month)throw Error('The selected month changed. Run the check again.');checkup=c;$('maintenanceChecks14324').innerHTML=renderCheck(checkup);window.syncAssessment14332?.render();status('Checks complete. Review device sync findings and reconciliation before closing.');return checkup}
async function closingGroups(check,client,annual){
 const groups=new Map();
 const reports=new Map((check.pending.items||[]).map(r=>[String(r.id),r]));
 const entries=new Map((check.entry_checks||[]).map(e=>[e.entry_no,e]));
 const profiles=typeof liveProfiles==='undefined'?[]:liveProfiles||[];
 for(const issue of check.issues.filter(i=>i.severity==='warning')){
  let key=issue.title,title=issue.title,action='Acknowledge the listed findings for this closing.',record='';
  if(issue.id.startsWith('report:')){
   const reportId=issue.id.slice(7),report=reports.get(reportId),meta=check.sourceDetails321?.[issue.id]?.meta;
   const owner=report?.owner_name||issue.detail.split(' / '+reportId+':')[0];
   const matches=profiles.filter(p=>(p.full_name||p.email)===owner);
   const profile=matches.length===1?matches[0]:null;
   const role=meta?.owner?.user_permissions;
   key='staff:'+String(meta?.owner_id||profile?.id||owner);
   title=((Array.isArray(role)?role[0]:role)?.job_title||profile?.user_permissions?.job_title||'Staff reports')+' · '+owner;
   if(meta?.period_start)record=monthLabel(meta.period_start.slice(0,7));
   action='Defer the unposted lines in these reports for this closing.';
  }else if(maintenanceSelection14325.issueGroup(issue)==='foreign'){
   key='foreign';title='Foreign currency · posted journals';
   action='Acknowledge the listed source-review findings. These journals stay in the ledger.';
   const number=issue.detail.split(/ \/ |:/,1)[0],entry=entries.get(number);
   record=entry?entry.entry_no+' · '+formatAppDate(entry.date):number;
  }else if(/^(draft|submission):/.test(issue.id)){
   action='Leave these unposted items out of this closing.';
  }
  if(!groups.has(key))groups.set(key,{title,action,items:[],records:new Map()});
  const group=groups.get(key);
  const decision=check.decisions319?.[issue.id];
  const item={...issue,record,source:check.sourceDetails321?.[issue.id],saved:annual?null:decision?.saved,canCarry:!annual&&!!decision?.balanceScope};
  group.items.push(item);
  if(!group.records.has(record))group.records.set(record,[]);
  group.records.get(record).push(item);
 }
 return [...groups.values()].sort((a,b)=>a.title.localeCompare(b.title));
}
function groupDetails(group,saved){
 const records=[];
 for(const [record,items] of group.records){
  const rows=items.filter(i=>!!i.saved===saved);
  if(!rows.length)continue;
  const groupedSource=record&&rows[0].source&&rows.every(i=>i.source===rows[0].source)?rows[0].source:null;
  const list=sourceHTML(groupedSource)+rows.map(i=>(groupedSource?'':sourceHTML(i.source))+'<div data-review-item="'+esc(i.id)+'"><strong>'+esc(i.title)+'</strong><p>'+esc(i.detail)+'</p>'+
   (i.saved?'<small>Previously acknowledged · '+esc(monthLabel(i.saved.month.slice(0,7)))+'</small>':'')+
   '<label>'+(i.saved?'Saved reason':'Separate reason (optional)')+'<input type="text" maxlength="2000" data-item-reason value="'+esc(i.saved?.reason||'')+'"></label>'+
   (i.canCarry?'<label><input type="checkbox" data-carry '+(i.saved?.allowCarry?'checked':'')+'>Allow this account to carry a balance on this side at future monthly closes. Give the reason above.</label>':'')+'</div>').join('');
  records.push(record?'<details><summary>'+esc(record)+' ('+rows.length+')</summary>'+list+'</details>':list);
 }
 return records.join('');
}
function reviewHTML(c,groups,options){
 const all=groups.flatMap(g=>g.items),remaining=all.filter(i=>!i.saved).length;
 const sections=saved=>groups.map((g,index)=>{
  const count=g.items.filter(i=>!!i.saved===saved).length;
  if(!count)return '';
  return '<fieldset data-review-group="'+index+'"><legend>'+esc(g.title)+' ('+count+')</legend><p>'+esc(g.action)+'</p><details><summary>View items and reasons</summary>'+groupDetails(g,saved)+'</details>'+
   (!saved&&count>1?'<label>Separate reason for this group (optional)<input type="text" data-group-reason maxlength="2000"></label>':'')+'</fieldset>';
 }).join('');
 const monthly=options.kind!=='year',deferred=all.filter(i=>i.id.startsWith('report:')).length;
 const newItems=sections(false)+'<label>'+(monthly?'Closing note (optional)':'Reason for the remaining findings')+'<input type="text" data-common-reason maxlength="2000"></label>';
 return '<div class="maintenance-review14324"><h3>Required reconciliations</h3>'+reconciliationTable(c)+
  (deferred?'<p>Unposted lines in '+deferred+' staff report'+(deferred===1?'':'s')+' stay outside this closing.</p>':'')+
  (remaining?(monthly?'<details><summary>Accounting follow-up ('+remaining+')</summary>'+newItems+'</details>':'<h3>Annual review ('+remaining+')</h3>'+newItems):'')+
  (remaining<all.length?'<details><summary>Previously acknowledged ('+(all.length-remaining)+')</summary>'+sections(true)+'</details>':'')+
  '<p>'+(!options.kind?'This export includes the displayed reasons.':monthly?'Confirming closes the review. Routine warnings are kept in Data Check for accounting follow-up.':'Final confirmation covers the reconciliations and the listed annual findings.')+'</p><p data-validation role="status"></p></div>';
}
function reconHTML(b){return '<fieldset data-recon="'+esc(b.id)+'" data-balance="'+esc(b.balance)+'"><legend>'+esc(b.code+' '+b.name+' / '+b.currency)+'</legend><p>Ledger balance: '+esc(formatAppNumber(b.balance))+' (debit positive, credit negative)</p><label>Actual balance<input type="text" inputmode="decimal" data-actual required autocomplete="off"></label><p data-difference>Enter the actual balance.</p><div data-reconciliation-exception14382></div></fieldset>'}
function actualAmount14342(input){if(!input.value.trim())throw Error('Enter an actual balance.');const n=parseAppNumber(input.value);if(!Number.isFinite(n))throw Error('Enter a valid actual balance.');return n.toFixed(2)}
function reconDifference14382(field,delta){
 const host=field.querySelector('[data-reconciliation-exception14382]');
 if(delta===null||delta===0){host.replaceChildren();delete host.dataset.difference;return;}
 if(!host.children.length)host.innerHTML='<label><input type="checkbox" data-accept required>I acknowledge this reconciliation difference.</label><label>Explanation of difference<input type="text" data-reason maxlength="2000" required></label>';
 if(host.dataset.difference!==String(delta))host.querySelector('[data-accept]').checked=false;
 host.dataset.difference=String(delta);
}
function answers(root,groups,check,options){
 const result={coverageConfirmed:true,acknowledgments:Object.create(null),reconciliations:Object.create(null)};
 if(check.decisionRevision319)result.decisionRevision319=check.decisionRevision319;
 const common=root.querySelector('[data-common-reason]')?.value.trim();
 const items=new Map([...root.querySelectorAll('[data-review-item]')].map(row=>[row.dataset.reviewItem,row]));
 for(const group of groups)for(const issue of group.items){
  const row=items.get(issue.id),individual=row.querySelector('[data-item-reason]').value.trim();
  const allowCarry=!!row.querySelector('[data-carry]')?.checked;
  if(allowCarry&&individual.length<3)throw Error('Enter the reason for allowing this monthly balance.');
  const reason=individual||row.closest('fieldset').querySelector('[data-group-reason]')?.value.trim()||common||(options.kind!=='year'?'Retained in Data Check for monthly accounting follow-up.':'');
  if(!reason||reason.length<3)throw Error('Enter a reason for the remaining findings or give '+group.title+' a separate reason.');
  result.acknowledgments[issue.id]={acknowledged:true,reason,allowCarry};
 }
 for(const f of root.querySelectorAll('[data-recon]')){const actual=actualAmount14342(f.querySelector('[data-actual]'));const delta=E.cents(actual)-E.cents(f.dataset.balance),a={actual,expectedBalance:f.dataset.balance,acknowledged:f.querySelector('[data-accept]')?.checked||false,reason:f.querySelector('[data-reason]')?.value.trim()||''};if(delta!==0&&(!a.acknowledged||a.reason.length<3))throw Error('Explain and acknowledge each cash / bank difference.');result.reconciliations[f.dataset.recon]=a}return result}
async function review(month,options={}){const id=actor(),client=ojmDb;if(options.kind&&E.cutoff(month)>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Vientiane',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()))throw Error('This month has not ended. Monthly close is available from '+formatAppDate(E.cutoff(month))+'.');if(options.kind)window.syncAssessment14332?.beforeClose(month);const c=await preflight(month);await describeFindings(c,client);guard(id,client);if(options.kind==='session'){const p=await snapshot();c.balances=E.projectSession(p,options.session,month,c.balances);c.projected=true;}guard(id,client);if(c.trial.some(t=>Math.abs(Number(t.difference))>0.005)||c.issues.some(i=>i.severity==='block')){checkup=c;$('maintenanceMonth14324').value=month;$('maintenanceChecks14324').innerHTML=renderCheck(c);switchTab(CLOSE);throw Error('Closing blocked. Complete the listed required reconciliations and resolve any Data Check errors. Only accounts whose movements changed need reconciliation again.');}const groups=await closingGroups(c,client,options.kind==='year');guard(id,client);const pending=modal(options.kind==='year'?'Year-end review · '+options.year:'Closing review — '+month,(options.annualReport||'')+reviewHTML(c,groups,options),[{label:'Cancel',value:false},{label:options.kind==='period'?'Confirm & Close Month':options.kind==='year'?'Close & Lock Year':options.kind==='session'?'Confirm & Finish Corrections':'Export Reconciliation Review',value:true,primary:true}],true),root=document.querySelector('.ui-overlay108:last-child'),button=root.querySelector('footer button:last-child');root.classList.add('maintenance-modal14324');button.disabled=true;const validate=()=>{for(const f of root.querySelectorAll('[data-recon]')){try{const delta=E.cents(actualAmount14342(f.querySelector('[data-actual]')))-E.cents(f.dataset.balance);f.querySelector('[data-difference]').textContent='Difference: '+formatAppNumber(delta/100);reconDifference14382(f,delta)}catch{f.querySelector('[data-difference]').textContent='Enter a valid amount.';reconDifference14382(f,null)}}try{answers(root,groups,c,options);button.disabled=false;root.querySelector('[data-validation]').textContent='Ready to submit this review. Saved records are checked again during closing.'}catch(e){button.disabled=true;root.querySelector('[data-validation]').textContent=e.message}};root.addEventListener('input',validate);root.addEventListener('change',validate);root.addEventListener('focusout',e=>{if(e.target.matches('[data-actual]')&&Number.isFinite(parseAppNumber(e.target.value))){e.target.value=formatAppNumber(parseAppNumber(e.target.value));validate()}});validate();if(!await pending)return null;guard(id,client);window.syncAssessment14332?.beforeClose(month);return {check:c,review:answers(root,groups,c,options),actor:id,client}}
let closing=false;async function finish(options){if(options.kind==='period'){
 if(options.status==='locked')throw Error('Monthly close is complete. Locking takes place at year-end.');
 if(['closed','locked'].includes(PeriodReview.status(options.month))){showPeriodToast('This month is already finalized.');return false}
 }if(closing)throw Error('A closing review is already in progress.');closing=true;try{const r=await review(options.month,options);if(!r)return false;guard(r.actor,r.client);showPeriodToast('Saving closing and reconciliation…');await rpc('maintenance_finish14324',{p_month:options.month+'-01',p_kind:options.kind,p_fingerprint:r.check.fingerprint,p_review:r.review,p_status:options.status||'closed',p_session:options.session||null,p_year:options.year||null,p_confirmation:options.confirmation||null,p_year_fingerprint:options.fingerprint||null});if(options.kind==='period'){PeriodReview.periods[options.month]={...(PeriodReview.periods[options.month]||{}),status:options.status||'closed'};JournalModule.entries.forEach(row=>{if(String(row.date).startsWith(options.month))row.archived=true});PeriodReview.save();refreshAllTables();renderPeriodReview();}try{await (window.offline14239?.freshReads?offline14239.freshReads(()=>loadAccountingPeriodStatuses()):loadAccountingPeriodStatuses())}catch(e){showPeriodToast('Closing saved. Period status refresh is pending: '+e.message,true)}window.dispatchEvent(new Event('period-finished280'));return true}finally{closing=false}}
function modal(title,html,buttons=[{label:'Close',value:false}],wide=true){
 const pending=ui108.modal(title,html,buttons,wide),root=document.querySelector('.ui-overlay108:last-child');root.classList.add('maintenance-modal14324');return pending;
}
async function choose(title,html,confirm='Continue'){
 const id=actor(),client=ojmDb;guard(id,client);const pending=modal(title,html,[{label:'Cancel',value:false},{label:confirm,value:true,primary:true}]);
 const root=document.querySelector('.ui-overlay108:last-child'),button=root.querySelector('footer button:last-child');
 const validate=()=>{const picks=root.querySelectorAll('[data-pick]');button.disabled=!!picks.length&&!root.querySelector('[data-pick]:checked')||[...root.querySelectorAll('input[required]')].some(n=>!n.checkValidity());};root.addEventListener('change',validate);root.addEventListener('input',validate);validate();
 if(!await pending)return null;guard(id,client);return root;
}
async function testSelected(){
 const root=await choose('Choose data checks','<label>Month<input type="month" data-month required value="'+esc($('maintenanceMonth14324').value)+'"></label><fieldset><legend>Checks to display</legend>'+[['ledger','Each journal, dates, lines and trial balance'],['foreign','Foreign rates, LAK mappings and exchange gain/loss'],['schedules','Amortization and recurring schedules'],['pending','Pending entries, payroll and unresolved reviews'],['control','Descriptions and control accounts']].map(([id,name])=>'<label><input type="checkbox" data-pick value="'+id+'" checked> '+name+'</label>').join('')+'</fieldset><p>Checks use records through month-end. Closing always runs all mandatory checks. The complete flag list remains in Bookkeeping.</p>','Run Checks');
 if(!root)return;const selected=[...root.querySelectorAll('[data-pick]:checked')].map(n=>n.value);$('maintenanceMonth14324').value=root.querySelector('[data-month]').value;const c=await runChecks();
 const filtered={...c,selectedCoverage:true,issues:c.issues.filter(i=>selected.includes(maintenanceSelection14325.issueGroup(i)))};
 await modal('Data check results — '+c.month.slice(0,7),'<p>Selected coverage: '+esc(selected.join(', '))+'. The trial balance summary is always included. This is a review, not a closing approval.</p>'+renderCheck(filtered));
}
async function exportSelected(id){
 const client=ojmDb;guard(id,client);
 const root=await choose('Export maintenance data','<label>Comparison month<input type="month" data-month required value="'+esc($('maintenanceMonth14324').value)+'"></label><label>Raw record dates<select data-scope><option value="month">Selected month</option><option value="all">All dates</option></select></label><fieldset><legend>Datasets</legend>'+[['ledger','Journal and account balances'],['payroll','Payroll results and source records'],['staff','Sub-user entries and reports'],['vouchers','Vouchers and versions'],['reference','Chart of accounts and currencies'],['audit','Audit records'],['complete','Complete raw snapshot — all datasets, all dates']].map(([key,label])=>'<label><input type="checkbox" data-pick value="'+key+'" '+(['ledger','payroll'].includes(key)?'checked':'')+'> '+label+'</label>').join('')+'</fieldset><label>Download format<select data-format><option value="xlsx">Excel — General Ledger, Trial Balance, Payroll and comparison formulas</option><option value="zip">ZIP — selected raw CSV / JSON, Excel reports and comparison CSV</option><option value="csv">Comparison CSV — account balances and/or payroll only</option></select></label><p>Balances are cumulative through the comparison month; payroll comparison covers that month. Chart and employee references stay included where needed. A complete snapshot always includes all dates.</p>','Export');
 if(!root)return;guard(id,client);const month=root.querySelector('[data-month]').value,groups=[...root.querySelectorAll('[data-pick]:checked')].map(n=>n.value),format=root.querySelector('[data-format]').value,scope=root.querySelector('[data-scope]').value;
 const complete=groups.includes('complete');if(format==='xlsx'&&!complete&&!groups.some(g=>['ledger','payroll'].includes(g)))throw Error('Excel reports require Journal or Payroll. Use ZIP for other datasets.');if(format==='csv'&&!complete&&!groups.some(g=>['ledger','payroll'].includes(g)))throw Error('Comparison CSV requires Journal balances or Payroll. Use ZIP for other datasets.');
 status('Preparing selected data…');const c=await preflight(month);guard(id,client);pack=await snapshot();guard(id,client);const after=await preflight(month);guard(id,client);if(after.fingerprint!==c.fingerprint)throw Error('Records changed during export. Retry for a consistent comparison.');
 const selected=maintenanceSelection14325.select(pack,{month,groups,scope}),comparison=E.comparisonRows(pack,month,c.balances).filter(r=>complete||groups.includes(r.dataset==='balance'?'ledger':'payroll'));
 const csv=E.csv(comparison,['dataset','record_id','period','currency','amount','description']);guard(id,client);
 if(format==='xlsx'){const blob=await maintenanceReports14326.workbook(pack,month,c.balances,groups,BusinessSettings.current?.companyName||AccountingStore.companyName||'Oon Jai');guard(id,client);await download('oonjai-comparison-'+month+'.xlsx',blob,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');status('Excel reports and comparison formulas exported.');return;}
 if(format==='csv'){await download('comparison-'+month+'.csv',csv,'text/csv;charset=utf-8');status('Comparison CSV exported.');return;}
 await window.optionalTools14335?.load('zip');guard(id,client);const zip=new JSZip();zip.file('raw-snapshot.json',JSON.stringify(selected,null,2));for(const [t,records]of Object.entries(selected.tables)){if(!Array.isArray(records))continue;const headers=[...new Set(records.flatMap(r=>Object.keys(r)))];zip.file('raw/'+t+'.csv',E.csv(records,headers));}
 zip.file('comparison-'+month+'.csv',csv);if(complete||groups.includes('payroll'))zip.file('payroll-results.csv',E.csv(E.payroll(selected)));
 if(complete||groups.some(g=>['ledger','payroll'].includes(g))){const workbook=await maintenanceReports14326.workbook(pack,month,c.balances,groups,BusinessSettings.current?.companyName||AccountingStore.companyName||'Oon Jai');guard(id,client);zip.file('comparison-reports-'+month+'.xlsx',workbook);}
 zip.file('export-selection.json',JSON.stringify(selected.exportSelection,null,2));
 zip.file('READ-ME.txt','Selected raw data is described in export-selection.json. Reference rows are not date-filtered. Comparison contains cumulative posted balances through '+month+' and payroll results for that month, only for the selected datasets. Currencies are separate. Open comparison-reports-' + month + '.xlsx. Its General Ledger and Trial Balance calculate from Journal Data; Payroll calculates from saved payroll components. Enter independently prepared amounts in yellow External cells on Comparison. Re-export when adding records. The older six-column comparison CSV remains available for other systems. CSV text is escaped against spreadsheet formulas; JSON preserves exact source text.');
 const blob=await zip.generateAsync({type:'blob'});guard(id,client);await download('oonjai-maintenance-'+month+'.zip',blob,'application/zip');status('Selected maintenance export prepared.');
}
function showClosingState(){
 const button=$('maintenanceClose14325'),month=$('maintenanceMonth14324')?.value;
 if(!button||!month)return;
 const finalized=['closed','locked'].includes(PeriodReview.status(month));
 button.textContent=finalized?'Month finalized':'Review & Close Month';
 button.disabled=busy||finalized;
}
function mountClosing(){
 const closing=document.createElement('section');closing.id=CLOSE;closing.className='tab-content';closing.dataset.module='transactions';$(ID).after(closing);
 const card=$(ID).querySelector('.maintenance-card14324');closing.append(card);
 const finishButton=document.createElement('button');finishButton.type='button';finishButton.id='maintenanceClose14325';finishButton.textContent='Review & Close Month';card.querySelector('.maintenance-actions14324').append(finishButton);
 const message=document.createElement('p');message.id='maintenanceClosingStatus14325';message.setAttribute('role','status');closing.append(message,$('maintenanceChecks14324'));
 const nav=document.querySelector('#nav-module-transactions .nav-links'),button=document.createElement('button');button.type='button';button.className='tab-btn';button.textContent='Data Check';button.setAttribute('onclick',"switchTab('"+CLOSE+"')");nav.append(button);
 const tree=APP_PERMISSION_TREE.find(t=>t.id==='transactions');if(tree&&!tree.children.some(([id])=>id===CLOSE))tree.children.push([CLOSE,'Closing & Data Checks']);
 const link=document.createElement('p');link.innerHTML='<button type="button" class="je-btn" id="maintenanceGoClosing14325">Open Closing & Data Checks in Bookkeeping</button>';$(ID).prepend(link);link.firstChild.onclick=()=>switchTab(CLOSE);
 finishButton.onclick=()=>task(async()=>{const month=$('maintenanceMonth14324').value;if(await finish({kind:'period',month,status:'closed'})){status(month+' closed successfully.');}});
 window.addEventListener('period-finished280',showClosingState);window.addEventListener('page113',showClosingState);showClosingState();
 window.navigationWorkflow14316?.sync();
}
function install(){if(!$('settings-system')||$(ID))return;
 document.addEventListener('click',event=>{const b=event.target.closest('[data-source-receipt321]');if(b&&actor())window.JournalReceipts224?.open(b.dataset.staffLine321?{staffLine:b.dataset.staffLine321,label:b.dataset.sourceReceipt321}:b.dataset.sourceReceipt321)});const internal=document.createElement('div');internal.id=ID;internal.hidden=true;$('settings-system').after(internal);$(ID).innerHTML='<div class="maintenance-grid14324"><section class="maintenance-card14324"><h3>Closing & Data Checks</h3><p><strong>Before period closing</strong></p><p>Run checks, reconcile cash and bank accounts, review flags, then confirm month closing. Test and reconciliation buttons do not close the month.</p><label>Month <input id="maintenanceMonth14324" type="month"></label><div class="maintenance-actions14324"><button id="maintenanceRun14324" type="button">Test Data</button><button id="maintenanceReconcile14324" type="button">Reconcile Accounts</button><button id="maintenanceReport14324" type="button">Export Check Report</button></div></section><section class="maintenance-card14324"><h3>Investigator</h3><p>Find an exact Entry ID, record ID, reference or employee ID and follow its saved links and audit history across all dates.</p><label>Identifier <input id="maintenanceQuery14324" type="search" placeholder="Entry ID or reference" autocomplete="off"></label><div class="maintenance-actions14324"><button id="maintenanceFind14324" type="button">Investigate</button></div></section><section class="maintenance-card14324"><h3>Independent Data Comparison</h3><p>Download General Ledger, Trial Balance and Payroll as an Excel comparison workbook with the selected month already filled in. Review its formulas, then enter independent figures in the yellow External cells to see differences. ZIP and CSV exports remain available.</p><div class="maintenance-actions14324"><button id="maintenanceExport14324" type="button">Export Maintenance Data</button><button type="button" class="maintenance-download14324">Excel Comparison Workbook</button></div><p>Exports contain company and payroll records. Keep downloaded copies with your accounting files.</p></section><section class="maintenance-card14324"><h3>System Diagnostics</h3><p>Check release files, required code, known logic tests and the current maintenance layout. Findings name the file and explain the likely effect.</p><div class="maintenance-actions14324"><button id="maintenanceSystem14324" type="button">Run System Diagnostics</button><button id="maintenanceSystemExport14324" type="button">Export Diagnostic Report</button></div><p>Checks compare against the tested release and recorded approved rules. They do not prove every possible workflow is free of bugs.</p></section></div><p id="maintenanceStatus14324" role="status" aria-live="polite"></p><p><a href="setup/INSTALL-MAINTENANCE-v143.24.sql" download>Database update</a> · <a href="docs/MAINTENANCE-v143.24.md" target="_blank" rel="noopener">Maintenance guide and check coverage</a></p><section id="maintenanceChecks14324" class="maintenance-result14324"></section><section id="maintenanceTrace14324" class="maintenance-result14324"></section><section id="maintenanceDiagnostics14324" class="maintenance-result14324"></section>';
 $('maintenanceMonth14324').value=monthNow();$('maintenanceMonth14324').onchange=()=>{checkup=null;$('maintenanceChecks14324').replaceChildren();showClosingState()};
 mountClosing();
 $('maintenanceRun14324').onclick=()=>task(testSelected);
 $('maintenanceReconcile14324').onclick=()=>task(async()=>{const r=await review($('maintenanceMonth14324').value);if(r){await download('reconciliation-'+r.check.month+'.json',{check:r.check,review:r.review});status('Reconciliation review exported. No period status was changed.')}});
 $('maintenanceReport14324').onclick=()=>task(async()=>{if(!checkup)await runChecks();if(await modal('Export closing check report',renderCheck(checkup),[{label:'Cancel',value:false},{label:'Download Report',value:true,primary:true}]))download('closing-check-'+checkup.month+'.json',checkup)});
 $('maintenanceFind14324').onclick=()=>task(async()=>{const q=$('maintenanceQuery14324').value.trim();if(!q)throw Error('Enter an identifier.');status('Reading current linked records…');pack=await snapshot();const matches=E.investigate(pack,q);$('maintenanceTrace14324').innerHTML='<h3>Investigation: '+esc(q)+'</h3><p>'+matches.length+' connected record(s). Snapshot '+esc(formatAppDate(pack.copiedAt14324,true))+'. '+(matches.length>200?'Showing the first 200. Download the complete raw snapshot to inspect the rest.':'')+'</p>'+matches.slice(0,200).map(m=>'<details><summary>'+esc(m.table+' / '+(m.record.id||m.record.journal_id||m.record.journal_line_id||'record')+' — '+m.connection)+'</summary><pre>'+esc(JSON.stringify(m.record,null,2))+'</pre></details>').join('');status(matches.length?'Investigation complete.':'No exact identifier match. Check the original ID or reference.');await modal('Investigation — '+q,$('maintenanceTrace14324').innerHTML);$('maintenanceTrace14324').replaceChildren()});
 $('maintenanceQuery14324').onkeydown=e=>{if(e.key==='Enter')$('maintenanceFind14324').click()};
 $('maintenanceExport14324').onclick=()=>task(exportSelected);
 const template=$(ID).querySelector('.maintenance-download14324');template.textContent='Excel Comparison Workbook';template.onclick=e=>{e.preventDefault();task(id=>exportSelected(id))};

 $('maintenanceSystem14324').onclick=()=>task(async(id)=>{status('Checking release files and runtime…');diagnostic=await systemDiagnostics14324.run();guard(id);$('maintenanceDiagnostics14324').innerHTML='<h3>System Diagnostics</h3><p>'+esc(diagnostic.coverage)+'</p>'+table(['Status','File','Finding','Likely effect'],diagnostic.findings.map(f=>[f.status,f.file,f.problem,f.effect]));status('Diagnostics complete: '+diagnostic.findings.filter(f=>f.status==='error').length+' error(s), '+diagnostic.findings.filter(f=>f.status==='warning').length+' warning(s).');await modal('System Diagnostics',$('maintenanceDiagnostics14324').innerHTML);$('maintenanceDiagnostics14324').replaceChildren()});
 $('maintenanceSystemExport14324').onclick=()=>task(async()=>{if(!diagnostic)throw Error('Run System Diagnostics first.');if(await modal('Export diagnostic report','<p>Download the last completed diagnostic findings, file names and effects as JSON.</p>',[{label:'Cancel',value:false},{label:'Download Report',value:true,primary:true}]))download('system-diagnostics14324.json',diagnostic)});
 const original=window.loadLiveProfile;if(typeof original==='function')window.loadLiveProfile=async function(...a){clear();const r=await original.apply(this,a);clear();return r};
 window.addEventListener('page113',()=>{if(owner!==actor()||contextClient!==ojmDb)clear()});
 const gate=$('loginGate');if(gate)new MutationObserver(()=>{if(!gate.classList.contains('is-authenticated'))clear()}).observe(gate,{attributes:true,attributeFilter:['class']});
}
window.maintenance14324={preflight,snapshot,finish,review,runChecks};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();})();
