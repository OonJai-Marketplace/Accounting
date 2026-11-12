/* SYSTEM ACCOUNTS AND RECONCILIATION — report snapshots never post ledger entries. */
const purposes71={mapping:['Mapping','Connects related posting legs, including foreign-currency and reporting-currency amounts. Choose the actual posting connections separately; this label does not create a conversion or posting rule.'],regular:['Regular','An ordinary operational account.'],clearing:['Clearing','Temporarily holds amounts while related postings are matched.'],suspense:['Suspense','Holds an actual transaction while its proper classification is investigated.'],settlement:['Payment Settlement','Tracks amounts held by a payment or delivery provider before settlement.'],payroll:['Payroll Control','Tracks payroll amounts awaiting payment or remittance.'],opening:['Opening Balance Offset','Supports initial balance setup; unexplained residual balances require investigation.']};
function purposeHelp71(){showAppNotification('Account purposes',Object.values(purposes71).map(([n,d])=>`${n}: ${d}`).join('\n\n')+'\n\nAll actual accounts retain their accounting classification and appear in ledger reports. Posting mappings are rules connecting activities to these accounts.',false)}
function editSystemAccount71(code){openEditAccountModal(decodeURIComponent(code))}
function renderSystemAccounts71(){
 const host=document.getElementById('otherAccounts69');if(!host)return;
 const accounts=(AccountingStore.accounts||[]).filter(a=>(a.purpose||'regular')!=='regular');
 const users=typeof availableSubUsers==='function'?availableSubUsers():[];
 const mappings=users.map(u=>({user:u,p:subUserPermission(u)||{}}));
 host.innerHTML=`<div class="je-card-header"><div><h3>System Accounts &amp; Mapping</h3><p>Account purpose is separate from Asset, Liability, Equity, Revenue or Expense.</p></div><div class="module-actions71"><button class="je-btn je-btn-secondary" onclick="purposeHelp71()">Purpose Guide</button><button class="je-btn je-btn-emerald" onclick="openAddAccountModal(true)">Add Account</button></div></div><div class="table-container"><table><thead><tr><th>Code</th><th>Account</th><th>Currency</th><th>Classification</th><th>Purpose</th><th>Action</th></tr></thead><tbody>${accounts.map(a=>`<tr><td>${escapeHtml(a.code)}</td><td>${escapeHtml(a.name)}</td><td>${escapeHtml(a.currency)}</td><td>${escapeHtml(a.type)}</td><td>${escapeHtml(purposes71[a.purpose]?.[0]||a.purpose)}</td><td><button class="je-btn je-btn-secondary" onclick="editSystemAccount71('${encodeURIComponent(a.code).replaceAll("'",'%27')}')">Edit</button><button class="je-btn je-btn-danger" onclick="promptDeleteAccount(decodeURIComponent('${encodeURIComponent(a.code).replaceAll("'",'%27')}'))">Delete</button></td></tr>`).join('')||'<tr><td colspan="6">No special-purpose accounts yet. Set Account Purpose when adding or editing a chart account.</td></tr>'}</tbody></table></div><div class="system-content71"><h4>System Posting Mappings</h4><p>Existing user posting connections are shown below. Edit opens the same permissions editor used by the posting workflow; changing a purpose alone does not change posting rules.</p></div><div class="table-container"><table><thead><tr><th>User</th><th>Money Out — default credit</th><th>Money In — default debit</th><th>Assigned funds</th><th>Action</th></tr></thead><tbody>${mappings.map(({user:u,p})=>`<tr><td>${escapeHtml(subUserName(u))}</td><td>${escapeHtml(accountNameById(p.default_out_credit_account_id)||'Not configured')}</td><td>${escapeHtml(accountNameById(p.default_in_debit_account_id)||'Not configured')}</td><td>${escapeHtml((p.assigned_fund_account_ids||[]).map(accountNameById).filter(Boolean).join(', ')||'None')}</td><td><button class="je-btn je-btn-secondary" onclick="openUserAccessEditor(${escapeHtml(JSON.stringify(u.id))})">Edit Mapping</button></td></tr>`).join('')||'<tr><td colspan="5">No user posting mappings available.</td></tr>'}</tbody></table></div>`;
}
let currentReport71=null,reportBusy71=false,reportAttaching71=false,reportRequest71=0;
function reportOwner71(){return liveProfile?.id||'local-preview'}
function preparer71(){return liveProfile?.full_name||liveProfile?.email||'Local preview'}
function reportDb71(){return new Promise((resolve,reject)=>{const r=indexedDB.open('oonjai-reconciliation-v1'+(window.accountingReset143108?.suffix()||''),1);r.onupgradeneeded=()=>r.result.createObjectStore('reports',{keyPath:'key'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function reportStore71(mode,action){const actor=reportOwner71(),client=ojmDb,db=await reportDb71();const check=()=>{if(reportOwner71()!==actor||ojmDb!==client)throw Error('Account changed before report storage completed.')};try{check();return await new Promise((resolve,reject)=>{const tx=db.transaction('reports',mode),store=tx.objectStore('reports'),wrapped=new Proxy(store,{get(s,k){if(k==='put')return v=>{check();return s.put(window.deviceVault14334?{...deviceVault14334.pack(v,'oonjai-reconciliation-v1:'+v.key),key:v.key}:v)};const value=s[k];return typeof value==='function'?value.bind(s):value}});let request,result;try{request=action(wrapped)}catch(e){tx.abort();reject(e);return}request.onsuccess=()=>{try{check();const decode=v=>window.deviceVault14334&&v?.vault14334?deviceVault14334.unpack(v,'oonjai-reconciliation-v1:'+v.key):v;result=Array.isArray(request.result)?request.result.map(decode).filter(Boolean):decode(request.result)}catch(e){tx.abort();reject(e)}};tx.oncomplete=()=>{try{check();resolve(result)}catch(e){reject(e)}};tx.onerror=tx.onabort=()=>reject(tx.error||new Error('Report save interrupted'))})}finally{db.close()}}
function recError71(message){const n=document.getElementById('recError71');if(n)n.textContent=message;else showAppNotification('Reconciliation',message,true)}
function reportPermission71(){return typeof canAccessAppTarget!=='function'||canAccessAppTarget('report-reconciliation')}
function reconciliationReceiptDate71(line){
 const saved=[...String(line.memo||'').matchAll(/\[Receipt date: (\d{4}-\d{2}-\d{2})\]/g)].at(-1),date=saved?.[1]||String(line.date||'').slice(0,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw Error('Invalid receipt date for '+line.id+'. Review the journal source.');
 return date;
}
function reconciliationAccount71(key,from,to,source=JournalModule.entries,basis='receipt'){
 const account=(AccountingStore.accounts||[]).find(a=>accountKey69(a)===key);if(!account)return null;
 const r={account,key,currency:account.currency,opening:0,debit:0,credit:0,closing:0,lines:[],dateBasis:basis};
 const annual=line=>line.annualOpening||String(line.generalMemo||'').startsWith('Annual opening balances ')||line.generalMemo==='Opening Balances';
 const rows=source.filter(line=>!line.pendingSync&&!line.local14333&&!line.voided_at&&(!line.status||line.status==='posted')&&line.currency===r.currency&&accountKey69(accountForLine69(line)||{},line.currency)===key);
 // Start at the latest saved opening, avoiding a second count of prior-year balances.
 const baseline=rows.filter(line=>annual(line)&&line.date<=(from||to)).map(line=>line.date).sort().at(-1)||'';
 for(const [index,line] of rows.entries()){
  const postingDate=String(line.date||'').slice(0,10),dr=cents69(line.debit),cr=cents69(line.credit);
  if(annual(line)){if(postingDate===baseline)r.opening+=dr-cr;continue}
  const date=basis==='posting'?postingDate:reconciliationReceiptDate71(line);
  // A receipt carried in an earlier book's closing must leave the opening and appear once on its actual date.
  if(baseline&&postingDate<baseline){if(date<baseline)continue;r.opening-=dr-cr;}
  if(date>to)continue;
  if(from&&date<from)r.opening+=dr-cr;
  else{r.debit+=dr;r.credit+=cr;r.lines.push({...line,date,postingDate,dr,cr,originalIndex:index})}
 }
 r.closing=r.opening+r.debit-r.credit;r.lines.sort((a,b)=>a.date.localeCompare(b.date)||String(a.id).localeCompare(String(b.id))||a.originalIndex-b.originalIndex);return r;
}
async function readReconciliationAccount71(key,from,to,basis='posting',refresh=false){
 const actor=reportOwner71(),client=ojmDb,workspace=window.workspaceRequest138?.target||'';
 if(reconciliationCloud305()){const a=reconAccounts71().find(a=>accountKey69(a)===key);return a?reconciliationSnapshot305(a,from,to,basis):null;}
 const check=()=>{if(actor!==reportOwner71()||client!==ojmDb||(window.workspaceRequest138?.target||'')!==workspace||!reportPermission71())throw Error('Account or workspace changed while loading reconciliation.');};
 if(basis!=='receipt'){
  if(liveProfile){await window.yearWindow14333?.ensure(from,to);check();if(refresh)await loadJournalFromSupabase();check();}
  // A spanning-year cash report needs every posting; year-specific openings
  // already contain prior closings and must not be added twice.
  if(from&&from.slice(0,4)!==to.slice(0,4))return reconciliationAccount71(key,from,to,JournalModule.entries,'posting');
  const saved={...Accounts69};try{Object.assign(Accounts69,{from,to});return accountData69().find(r=>r.key===key)}finally{Object.assign(Accounts69,saved)}
 }
 const account=(AccountingStore.accounts||[]).find(a=>accountKey69(a)===key);if(!account)return null;
 if(!liveProfile)return reconciliationAccount71(key,from,to);
 const load=async()=>{
  const rows=[];
  // Read the selected bank's complete saved history, independent of the active year and closed-month flags.
  for(let offset=0;;offset+=500){
   check();const {data,error}=await client.from('journal_lines').select('id,line_no,line_date,description,currency_code,debit,credit,journal_entries!inner(id,entry_no,transaction_date,memo,reference,status)').eq('account_id',account.id).eq('currency_code',account.currency).eq('journal_entries.status','posted').order('id').range(offset,offset+499);check();
   if(error)throw Error(error.message);if(!Array.isArray(data))throw Error('Bank history is incomplete. Reconnect and refresh.');
   for(const line of data){const entry=line.journal_entries;if(!entry||entry.status!=='posted'||!line.id||![line.debit,line.credit].every(v=>Number.isFinite(Number(v))))throw Error('Bank history contains an invalid record.');rows.push({dbLineId:line.id,dbEntryId:entry.id,id:entry.entry_no||entry.id,date:line.line_date||entry.transaction_date,accountId:account.id,accountCode:account.code,account:account.name,currency:line.currency_code,memo:line.description||entry.memo||'',generalMemo:entry.memo||'',annualOpening:String(entry.reference||'').startsWith('ANNUAL-OPENING-'),debit:Number(line.debit),credit:Number(line.credit),status:'posted'});}
   if(data.length<500)break;
  }
  return rows;
 };
 const rows=window.offline14239?await offline14239.snapshot('bank-reconciliation:'+key,load):await load();check();return reconciliationAccount71(key,from,to,rows);
}
const priorityReconciliation71=['1040','1041','1010','1011','1012','1030','1020','9051'];
const reconciliationLabels71={bank:'Bank statement',cash:'Cash count',balance:'Supporting balance'};
function reconAccounts71(){
 const staff=liveProfile&&liveProfile.role!=='admin'?workspaceRules(liveProfile):null;
 const assigned=staff?new Set([...staff.fundIds,...staff.entryIds]):null;
 return AccountingStore.accounts.filter(a=>a.isPosting!==false&&!a.isTechnical&&a.type!=='SYSTEM'&&a.currency!=='NA'&&(!staff||staff.permission.allow_any_account||assigned.has(a.id)));
}
function defaultReconciliation71(a){
 if(a.type==='ASSET'&&/\b(?:BCEL|bank)\b/i.test(a.name))return 'bank';
 if(a.type==='ASSET'&&/cash on hand|petty cash|cashier float|^cash$/i.test(a.name))return 'cash';
 return 'balance';
}
function reconciliationCloud305(){return liveProfile?.role==='admin'}
async function reconciliationRpc305(name,args={}){
 const actor=reportOwner71(),client=ojmDb;
 if(navigator.onLine===false)throw Error('Connect to save and verify reconciliation.');
 const result=await client.rpc(name,args);
 if(actor!==reportOwner71()||client!==ojmDb)throw Error('Account changed while verifying reconciliation.');
 if(result.error)throw Error(result.error.message);return result.data;
}
async function reconPreferences71(owner,update){
 if(!reconciliationCloud305())return window.localFirst14333.edit(owner,'reconciliation-list302',update);
 let saved=await reconciliationRpc305('reconciliation_preferences305');
 if(saved.preferences===null){
  const local=await window.localFirst14333.edit(owner,'reconciliation-list302')||{};
  try{saved=await reconciliationRpc305('reconciliation_preferences305',{p_preferences:local,p_revision:saved.revision})}
  catch(e){if(!/list changed/.test(e.message))throw e;saved=await reconciliationRpc305('reconciliation_preferences305')}
 }
 if(update)saved=await reconciliationRpc305('reconciliation_preferences305',{p_preferences:update(structuredClone(saved.preferences)),p_revision:saved.revision});
 return saved.preferences||{};
}
async function reconciliationSnapshot305(account,from,to,basis){
 const data=await reconciliationRpc305('reconciliation_snapshot305',{p_account:account.id,p_from:from,p_to:to,p_basis:basis});
 return {...data,account,key:accountKey69(account),currency:account.currency};
}
let reconciliationRecordsFlight309=null,legacyChecks309={owner:'',client:null,journal:null,records:new Map()};
function reconciliationRecords305(){
 const owner=reportOwner71(),client=ojmDb;
 if(reconciliationRecordsFlight309?.owner===owner&&reconciliationRecordsFlight309.client===client)return reconciliationRecordsFlight309.promise;
 const task={owner,client};task.promise=readReconciliationRecords309().finally(()=>{if(reconciliationRecordsFlight309===task)reconciliationRecordsFlight309=null});reconciliationRecordsFlight309=task;return task.promise;
}
async function readReconciliationRecords309(){
 const actor=reportOwner71(),client=ojmDb;
 if(legacyChecks309.owner!==actor||legacyChecks309.client!==client||legacyChecks309.journal!==JournalModule.entries)legacyChecks309={owner:actor,client,journal:JournalModule.entries,records:new Map()};
 const checked=legacyChecks309.records;
 let local=[];try{local=await reportStore71('readonly',s=>s.getAll())}catch(e){if(!reconciliationCloud305())throw e}
 local=local.filter(r=>r.owner===actor);
 if(!reconciliationCloud305())return local;
 const remote=await reconciliationRpc305('reconciliation_records305'),records=new Map(local.map(r=>[reconciliationKey71(r),r]));
 for(const r of remote)records.set(reconciliationKey71(r),r);
 // Preserve saved legacy counts when their dated financial movements still match.
 for(const r of local){
  if(records.get(reconciliationKey71(r))?.cloudConfirmed305||!reconciliationRecorded71(r))continue;
  const key=reconciliationKey71(r),fingerprint=JSON.stringify(r),prior=checked.get(key);
  if(prior?.fingerprint===fingerprint&&Date.now()-prior.at<60000)continue;
  try{
   validateReport71(r,'save');const latest=await reconciliationSnapshot305(r.account,r.from,r.to,r.dateBasis||'posting');
   const signature=x=>JSON.stringify([x.opening,x.debit,x.credit,x.closing,x.lines.map(l=>[l.date,l.dr,l.cr]).sort()]);
   if(signature(r)!==signature(latest)){checked.set(key,{fingerprint,at:Date.now()});continue;}
   const copy={...r,method:reportMethod71(r),status:reportCalculation71(r).difference===0?'reconciled':'saved'};
   const saved=await reconciliationRpc305('reconciliation_save305',{p_report:copy,p_fingerprint:latest.fingerprint});
   records.set(reconciliationKey71(saved),saved);
   try{await reportStore71('readwrite',s=>s.put(saved))}catch{}
  }catch(e){if(actor!==reportOwner71()||client!==ojmDb)throw e;/* Older incomplete counts remain visible but cannot authorize closing. */}
 }
 return [...records.values()];
}
function reportMethod71(r){
 if(Object.hasOwn(reconciliationLabels71,r.method))return r.method;
 // Preserve the original four-amount comparison in historical statement reports.
 if(r.dateBasis!=='posting'||['statementOpening117','statementDebit117','statementCredit117'].some(k=>r[k]!=null&&r[k]!==''))return 'bank';
 return defaultReconciliation71(r.account);
}
// Visible month/account numbers are independent of the unique saved-record key.
function reconciliationId71(account,to){
 const month=String(to||'').slice(0,7),code=String(account?.code||'').trim();
 if(!/^\d{4}-\d{2}$/.test(month)||!code)throw Error('Choose an account and period before saving reconciliation.');
 return 'REC-'+month.slice(2,4)+month.slice(5,7)+'-'+code;
}
function reconciliationNumber71(r){try{return reconciliationId71(r.account,r.to)}catch{return r.id}}
function reconciliationKey71(r){return r.recordId||(r.key&&r.owner&&r.key.startsWith(r.owner+':')?r.key.slice(r.owner.length+1):r.id)}
function reconciliationRecorded71(r){return !r.editing306&&(r.status!=='draft'||!!r.key)}
function reconciliationStatus71(r){const c=reportCalculation71(r);return !reconciliationRecorded71(r)||c.statement===null?'Incomplete':c.difference===0?'Reconciled':'Difference confirmed'}
function reconciliationPeriod306(from,to){
 const a=new Date(from+'T00:00:00Z'),b=new Date(to+'T00:00:00Z');if(!Number.isFinite(+a)||!Number.isFinite(+b))return String(from||'')+' – '+String(to||'');
 const month=d=>d.toLocaleDateString('en-US',{month:'long',timeZone:'UTC'}),day=d=>d.getUTCDate(),year=d=>d.getUTCFullYear();
 if(from===to)return month(a)+' '+day(a)+', '+year(a);
 return year(a)===year(b)?month(a)+' '+day(a)+'–'+(a.getUTCMonth()===b.getUTCMonth()?'':month(b)+' ')+day(b)+', '+year(b):month(a)+' '+day(a)+', '+year(a)+' – '+month(b)+' '+day(b)+', '+year(b);
}
function reconciliationAccountLabel306(r,includeCurrency=false){
 const a=r.account||r,currency=r.currency||a.currency||'',name=String(a.name||''),escaped=currency.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const clean=currency?name.replace(new RegExp('(?:\\s*[-–—·]\\s*|\\s+)'+escaped+'$','i'),'').replace(new RegExp('\\s*\\('+escaped+'\\)\\s*$','i'),'').trim():name;
 return (a.code?a.code+' — ':'')+clean+(includeCurrency&&currency?' · '+currency:'');
}
function latestReconciliations306(rows){const groups=new Map();for(const r of [...rows].sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))){const key=[r.account.id||r.account.code,r.from,r.to].join('|');if(!groups.has(key))groups.set(key,r)}return [...groups.values()]}
async function reconciliationWorkspace306(month){
 if(reconciliationCloud305())return reconciliationRpc305('reconciliation_workspace306',{p_month:month?month+'-01':null});
 const periods=typeof PeriodReview==='undefined'?{}:PeriodReview.periods,months=Object.entries(periods).filter(([,p])=>p.status==='open').map(([month])=>({month,status:'open'})).sort((a,b)=>a.month.localeCompare(b.month));
 if(!months.length){const now=typeof today82==='function'?today82().slice(0,7):new Date().toISOString().slice(0,7);if(!periods[now]||periods[now].status==='open')months.push({month:now,status:'open'})}
 const chosen=months.some(x=>x.month===month)?month:month?null:months[0]?.month||null;
 return {months,month:chosen,progress:{items:[]}};
}
async function editReconciliation306(id){try{
 if(!reportPermission71()||!access113.can('report-reconciliation','edit'))throw Error('Reconciliation edit access is required.');
 const owner=reportOwner71(),client=ojmDb;
 let r;if(reconciliationCloud305())r=await reconciliationRpc305('reconciliation_edit306',{p_record:decodeURIComponent(id)});
 else{r=(await reconciliationRecords305()).find(x=>reconciliationKey71(x)===decodeURIComponent(id));if(!r)throw Error('Reconciliation not found');if(!(await reconciliationWorkspace306(r.from.slice(0,7))).month)throw Error('This book is closed. View it in Reports.');r={...structuredClone(r),status:'draft',editing306:true}}
 const latest=await readReconciliationAccount71(r.accountKey,r.from,r.to,r.dateBasis,true);
 if(owner!==reportOwner71()||client!==ojmDb)return;if(!latest)throw Error('Account is unavailable.');
 if(r.cloudFingerprint305!==latest.fingerprint)r.differenceConfirmed=false;
 Object.assign(r,{opening:latest.opening,debit:latest.debit,credit:latest.credit,closing:latest.closing,lines:structuredClone(latest.lines),cloudFingerprint305:latest.fingerprint||null,snapshotAt:new Date().toISOString()});
 currentReport71=r;renderReport71();
 }catch(e){showAppNotification('Reconciliation',e.message,true)}
}

function confirmReconciliation71(checked){if(currentReport71?.status==='draft')currentReport71.differenceConfirmed=!!checked}
async function createReconciliation71(dateBasis,selection=Accounts69,method){
 if(!reportPermission71())return showAppNotification('Access denied','Reconciliation Reports is not enabled in your permissions.',true);
 const {account:key,from,to}=selection,actor=reportOwner71(),client=ojmDb,request=++reportRequest71;
 try{
 const account=reconAccounts71().find(a=>accountKey69(a)===key);
 if(!account)return showAppNotification('Choose an account','Select an available main account for reconciliation.',true);
 if(!method){
  const prefs=actor&&liveProfile?await reconPreferences71(actor):{};
  if(request!==reportRequest71||actor!==reportOwner71()||client!==ojmDb)return;
  method=dateBasis==='receipt'?'bank':prefs?.[key]||defaultReconciliation71(account);
 }
 if(!Object.hasOwn(reconciliationLabels71,method))throw Error('Choose a reconciliation method.');
 dateBasis=method==='bank'?(dateBasis||'receipt'):'posting';
 if(reconciliationCloud305()){
  const work=await reconciliationWorkspace306(from.slice(0,7));if(!work.month)throw Error('This book is closed. Its reconciliations are available in Reports.');
  if(work.progress?.items?.some(x=>x.id===account.id&&x.complete))throw Error('This account is already reconciled for this month. Use Edit on its saved record.');
 }
 const r=await readReconciliationAccount71(key,from,to,dateBasis);
 if(request!==reportRequest71||actor!==reportOwner71()||client!==ojmDb||!reportPermission71())return;
 if(!r)return showAppNotification('Choose one account','Select the bank account in the General Ledger Account filter before creating a report.',true);
 currentReport71={id:reconciliationId71(r.account,to),recordId:crypto.randomUUID(),owner:actor,method,accountKey:r.key,account:structuredClone(r.account),currency:r.currency,from,to,cloudFingerprint305:r.fingerprint||null,correctionSession305:r.session||null,dateBasis:dateBasis==='receipt'?'receipt':'posting',statementReverse117:dateBasis==='receipt',opening:r.opening,debit:r.debit,credit:r.credit,closing:r.closing,lines:structuredClone(r.lines),statement:'',statementReference:'',notes:'',reviewer:'',preparedBy:preparer71(),createdAt:new Date().toISOString(),snapshotAt:new Date().toISOString(),status:'draft',findings:[],attachments:[]};renderReport71();
 }catch(e){if(request===reportRequest71&&actor===reportOwner71()&&client===ojmDb)showAppNotification('Reconciliation unavailable',e.message,true)}
}
function reportCalculation71(r){const statement=r.statement==null||r.statement===''?null:cents69(r.statement),outstanding=r.findings.filter(f=>f.kind==='outstanding').reduce((s,f)=>s+cents69(f.amount),0);return {statement,outstanding,adjusted:statement===null?null:statement+outstanding,difference:statement===null?null:r.closing-statement-outstanding}}
function recField71(key,value){if(currentReport71?.status!=='draft')return;if(currentReport71[key]!==value)currentReport71.differenceConfirmed=false;currentReport71[key]=value;updateRecTotals71()}
function recAmountValue71(input){const raw=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').get.call(input);return raw.trim()===''?'':String(input.type==='number'?Number(raw):parseAppNumber(raw))}
function recAmountField71(key,input){recField71(key,recAmountValue71(input))}
function findingChange71(index,key,value){if(currentReport71?.status!=='draft')return;currentReport71.differenceConfirmed=false;currentReport71.findings[index][key]=value;updateRecTotals71()}
function addFinding71(){if(currentReport71?.status!=='draft')return;currentReport71.differenceConfirmed=false;currentReport71.findings.push({kind:'unexplained',amount:'',description:'',entryId:'',status:'investigating'});renderReport71()}
function removeFinding71(index){if(currentReport71?.status!=='draft')return;currentReport71.differenceConfirmed=false;currentReport71.findings.splice(index,1);renderReport71()}
function statementParts71(r){
 const read=k=>r[k]!==''&&r[k]!=null&&Number.isFinite(Number(r[k]))?cents69(r[k]):null;
 const opening=read('statementOpening117'),dr=read('statementDebit117'),cr=read('statementCredit117'),reverse=r.statementReverse117!==false;
 return {opening,debit:reverse?cr:dr,credit:reverse?dr:cr,calculated:[opening,dr,cr].every(v=>v!==null)?opening+(reverse?cr-dr:dr-cr):null};
}
function reconciliationComparison71(r){
 const method=reportMethod71(r);
 if(method!=='bank'){
  const c=reportCalculation71(r),label=method==='cash'?'Actual cash counted':'Supporting balance';
  const rows=[['Closing book balance',r.closing],[label,c.statement]];
  if(c.outstanding)rows.push(['Outstanding items',c.outstanding]);
  rows.push(['Difference',c.difference]);
  return '<div class="table-container"><table><thead><tr><th>Comparison</th><th>'+escapeHtml(r.currency)+'</th></tr></thead><tbody>'+rows.map(([name,n])=>'<tr><td>'+name+'</td><td>'+ (n===null?'—':money69(n))+'</td></tr>').join('')+'</tbody></table></div>';
 }
 const p=statementParts71(r),c=reportCalculation71(r),rows=[['Opening',r.opening,p.opening],['DR / deposits',r.debit,p.debit],['CR / withdrawals',r.credit,p.credit],['Closing',r.closing,c.statement]];
 if(c.outstanding)rows.push(['Closing + outstanding',r.closing,c.adjusted]);
 return `<div class="table-container"><table><thead><tr><th>Measure</th><th>Recorded in system</th><th>Bank statement</th><th>Difference</th></tr></thead><tbody>${rows.map(([label,system,bank])=>`<tr><td>${label}</td><td>${money69(system)}</td><td>${bank===null?'—':money69(bank)}</td><td class="${bank!==null&&system!==bank?'negative-amount':''}">${bank===null?'—':money69(system-bank)}</td></tr>`).join('')}</tbody></table></div>`;
}
function updateRecTotals71(){
 const r=currentReport71;if(!r)return;const c=reportCalculation71(r),p=statementParts71(r),reason=document.querySelector('[data-bank-reason14346]');
 if(reason){reason.hidden=(c.difference===null||c.difference===0)&&!r.notes;reason.querySelector('textarea').required=c.difference!==null&&c.difference!==0;const confirmation=reason.querySelector('[data-rec-confirm305]');if(confirmation){confirmation.closest('label').hidden=c.difference===null||c.difference===0;confirmation.checked=!!r.differenceConfirmed}}
 const table=document.getElementById('recCompare117');if(table)table.innerHTML=reconciliationComparison71(r);
 const check=document.getElementById('recStatementCheck71');if(check){check.hidden=p.calculated===null||c.statement===null||p.calculated===c.statement;check.textContent=check.hidden?'':`Statement totals differ by ${money69(c.statement-p.calculated)} ${r.currency}. Calculated closing: ${money69(p.calculated)}.`;}
}
function renderReport71(){
 document.getElementById('recOverlay71')?.remove();const r=currentReport71;if(!r)return;const locked=reconciliationRecorded71(r),disabled=locked?'disabled':'',e=escapeHtml;
 const method=reportMethod71(r),bank=method==='bank',title=bank?'Bank Reconciliation Report':method==='cash'?'Cash Count Reconciliation':'Account Reconciliation Report';
 const fields=bank?[['statementOpening117','Previous / Opening Balance'],['statementDebit117','Statement DR'],['statementCredit117','Statement CR'],['statement','Ending Balance']]:[['statement',method==='cash'?'Actual cash counted':'Supporting balance']];
 const overlay=document.createElement('div');overlay.id='recOverlay71';overlay.className='rec-overlay71';
 overlay.innerHTML=`<section class="rec-dialog71" data-method="${e(method)}" role="dialog" aria-modal="true" aria-labelledby="recTitle71"><header><div><h3 id="recTitle71">${title}</h3>${locked?`<small>${e(reconciliationNumber71(r))} · ${e(reconciliationStatus71(r))}</small>`:''}</div></header>
 <div class="rec-body71">
 <section class="rec-section71 rec-comparison117" data-currency-code="${e(r.currency)}"><header><h4>${bank?'System and statement comparison':method==='cash'?'Physical cash count':'Supporting record comparison'}</h4></header><div class="rec-body71">
 <div class="rec-account71"><strong>${e(reconciliationAccountLabel306(r,true))}</strong><span>${e(reconciliationPeriod306(r.from,r.to))}</span></div>
 ${locked?'':`<div class="rec-amounts71">${fields.map(([key,label])=>`<label>${label}<input ${key==='statement'?'id="recStatement71"':`data-rec117="${key}"`} type="number" step="0.01" data-financial-number data-currency="${e(r.currency)}" value="${e(r[key]??'')}" ${disabled} oninput="recAmountField71('${key}',this)"></label>`).join('')}</div>`}
 <div class="rec-basis71">${bank&&!locked?`<label><input type="checkbox" data-rec-reverse117 ${r.statementReverse117!==false?'checked':''} ${disabled} onchange="recField71('statementReverse117',this.checked)"> Bank CR = deposits; bank DR = withdrawals</label>`:''}<span>${r.dateBasis==='receipt'?'Bank · receipt dates':'Posting dates'}</span></div>
 <p id="recStatementCheck71" class="rec-error71" role="status" hidden></p></div><div id="recCompare117"></div><div data-bank-reason14346 class="rec-body71" hidden><label>Explanation of difference<textarea placeholder="Explain the difference" ${disabled} oninput="recField71('notes',this.value)">${e(r.notes)}</textarea></label><label class="rec-confirm305"><input type="checkbox" data-rec-confirm305 ${r.differenceConfirmed?'checked':''} ${disabled} onchange="confirmReconciliation71(this.checked)"> I confirm this amount and the explanation of the difference.</label></div></section>
 <details class="rec-section71" data-rec-findings ${r.findings.length?'open':''}><summary>Findings &amp; Outstanding Items${r.findings.length?' · '+r.findings.length:''}</summary><div class="rec-body71">${locked?'':`<button class="je-btn je-btn-secondary" onclick="addFinding71()">Add Finding</button>`}</div><div class="table-container"><table><thead><tr><th>Type</th><th>Signed amount</th><th>Explanation / resolution</th><th>Journal entry ID</th><th>Status</th>${locked?'':'<th>Action</th>'}</tr></thead><tbody>${r.findings.map((f,i)=>`<tr><td><select ${disabled} onchange="findingChange71(${i},'kind',this.value)">${[['outstanding','Timing / outstanding'],['correction','Posted correction'],['unexplained','Unexplained difference']].map(([v,t])=>`<option value="${v}" ${f.kind===v?'selected':''}>${t}</option>`).join('')}</select></td><td><input type="number" step="0.01" value="${e(f.amount)}" ${disabled} oninput="findingChange71(${i},'amount',recAmountValue71(this))"></td><td><textarea ${disabled} oninput="findingChange71(${i},'description',this.value)">${e(f.description)}</textarea></td><td><input value="${e(f.entryId)}" placeholder="Exact journal ID" ${disabled} oninput="findingChange71(${i},'entryId',this.value)"></td><td><select ${disabled} onchange="findingChange71(${i},'status',this.value)">${['investigating','outstanding','resolved'].map(v=>`<option ${f.status===v?'selected':''}>${v}</option>`).join('')}</select></td>${locked?'':`<td><button class="je-btn je-btn-danger" onclick="removeFinding71(${i})" aria-label="Remove finding">×</button></td>`}</tr>`).join('')||`<tr><td colspan="${locked?5:6}">No findings recorded.</td></tr>`}</tbody></table></div></details>
 <details class="rec-section71" data-rec-documents><summary>Supporting Documents${r.attachments.length?' · '+r.attachments.length+' files':''}</summary><div class="rec-body71"><div class="rec-grid71"><label>Prepared by<strong>${e(r.preparedBy)}</strong></label><label>Reviewed by (name / reference)<input value="${e(r.reviewer)}" ${disabled} oninput="recField71('reviewer',this.value)"></label></div>${locked?'':'<label>Supporting evidence (optional; PDF, PNG or JPEG; 10 MB each)<input type="file" accept="application/pdf,image/png,image/jpeg" multiple onchange="attachReportFiles71(this)"></label>'}<div id="recAttachments71" class="rec-attachments71">${r.attachments.map((a,i)=>`<span><button class="je-btn je-btn-secondary" onclick="downloadAttachment71(${i})">${e(a.name)}</button>${locked?'':`<button class="je-btn je-btn-secondary" onclick="currentReport71.attachments.splice(${i},1);renderReport71()" aria-label="Remove attachment">×</button>`}</span>`).join('')}</div></div></details>
 <details class="rec-section71" data-rec-ledger><summary>Ledger details · ${r.lines.length} lines</summary>${snapshotTable71(r)}</details>${r.correctionSession305&&!r.correctionApplied305?'<p class="rec-section71">This reconciliation includes pending book corrections. Finish those corrections to apply them to the ledger.</p>':''}</div><footer class="rec-actions305"><div class="module-actions71"><button type="button" class="je-btn je-btn-secondary" onclick="closeReport71()">Close</button>${locked?'<button type="button" class="je-btn je-btn-emerald" onclick="printReport71()">Export / Print</button>':'<button type="button" class="je-btn je-btn-emerald" data-rec-save305 onclick="saveReport71()">Save</button>'}</div><p class="rec-error71" id="recError71" role="status"></p></footer></section>`;
 document.body.appendChild(overlay);overlay.onclick=event=>{if(event.target===overlay)closeReport71()};updateRecTotals71();
}
function snapshotTable71(r){const receipt=r.dateBasis==='receipt';return `<div class="table-container"><table class="rec-ledger71"><thead><tr><th class="rec-compact71">${receipt?'Receipt date':'Date'}</th>${receipt?'<th class="rec-compact71">Posting date</th>':''}<th class="rec-compact71">Entry ID</th><th class="rec-description71">Description</th><th class="rec-compact71 rec-number71">Debit</th><th class="rec-compact71 rec-number71">Credit</th></tr></thead><tbody>${r.lines.map(l=>`<tr><td class="rec-compact71">${escapeHtml(formatAppDate(l.date))}</td>${receipt?`<td class="rec-compact71">${escapeHtml(formatAppDate(l.postingDate||l.date))}</td>`:''}<td class="rec-compact71">${escapeHtml(l.id)}</td><td class="rec-description71">${journalMemoHtml143187(journalMemoValue143187(l))}</td><td class="rec-compact71 rec-number71">${money69(l.dr)}</td><td class="rec-compact71 rec-number71">${money69(l.cr)}</td></tr>`).join('')}</tbody></table></div>`}
async function refreshReportSnapshot71(){
 if(currentReport71?.status!=='draft'||reportBusy71)return;const report=currentReport71,actor=reportOwner71(),client=ojmDb;reportBusy71=true;
 try{const r=await readReconciliationAccount71(report.accountKey,report.from,report.to,report.dateBasis,true);if(reportOwner71()!==actor||client!==ojmDb||currentReport71!==report)return;if(!r)throw Error('The original account is no longer available.');Object.assign(report,{opening:r.opening,debit:r.debit,credit:r.credit,closing:r.closing,lines:structuredClone(r.lines),snapshotAt:new Date().toISOString()});renderReport71();}catch(e){if(reportOwner71()===actor&&client===ojmDb&&currentReport71===report)recError71('Could not refresh: '+e.message)}finally{reportBusy71=false}
}
function validateReport71(r,finish){
 for(const key of ['statementOpening117','statementDebit117','statementCredit117'])if(r[key]!=null&&r[key]!==''&&(!Number.isFinite(Number(r[key]))||Math.abs(Number(r[key])*100-Math.round(Number(r[key])*100))>0.00001||(key!=='statementOpening117'&&Number(r[key])<0)))throw Error('Enter valid statement amounts with at most two decimal places; DR and CR totals cannot be negative.');
 if(r.statement!=null&&r.statement!==''&&(!Number.isFinite(Number(r.statement))||Math.abs(Number(r.statement)*100-Math.round(Number(r.statement)*100))>0.00001))throw Error('Enter a valid statement balance.');
 for(const f of r.findings){if(f.amount===''||!Number.isFinite(Number(f.amount))||Math.abs(Number(f.amount)*100-Math.round(Number(f.amount)*100))>0.00001||!f.description.trim())throw Error('Each finding needs an amount with at most two decimal places and an explanation.');if(f.entryId&&!r.lines.some(l=>l.id===f.entryId))throw Error('Linked entry '+f.entryId+' is not in this account snapshot. Refresh the ledger figures after posting a correction.');}
 if(reportCalculation71(r).difference!==null&&reportCalculation71(r).difference!==0&&!String(r.notes||'').trim())throw Error('Explain the reconciliation difference.');
 if(!finish)return;
 if(r.statement==null||String(r.statement).trim()==='')throw Error(reportMethod71(r)==='cash'?'Enter the actual cash counted.':reportMethod71(r)==='bank'?'Enter the statement closing balance.':'Enter the supporting balance.');
 if(reportMethod71(r)==='bank'&&r.status==='draft'&&statementParts71(r).calculated!==null&&statementParts71(r).calculated!==cents69(r.statement))throw Error('The statement opening, DR and CR do not agree with its closing balance. Check the four amounts.');
 if(finish==='save'){if(reportCalculation71(r).difference!==0&&!r.differenceConfirmed)throw Error('Confirm the amount and explanation of the difference before saving.');return;}
 if(reportCalculation71(r).difference!==0)throw Error('The unexplained difference must be zero before finishing.');
 if(r.findings.some(f=>f.kind==='unexplained'||f.status==='investigating'||(f.kind==='correction'&&(!f.entryId||f.status!=='resolved'))||(f.kind==='outstanding'&&f.status!=='outstanding')))throw Error('Resolve unexplained findings. Timing items must be Outstanding; corrections must be Resolved with a linked posted entry.');
}
async function saveReport71(mode='save'){
 if(reportAttaching71)return recError71('Wait for the attachment to finish loading before saving.');
 if(reportBusy71||currentReport71?.status!=='draft')return;
 reportBusy71=true;const report=currentReport71,actor=reportOwner71(),client=ojmDb,finish=mode!==false;
 const current=()=>reportOwner71()===actor&&client===ojmDb&&currentReport71===report;
 const button=document.querySelector('[data-rec-save305]');if(button)button.disabled=true;
 try{
  if(!reportPermission71()||report.owner!==actor||!access113.can('report-reconciliation','edit'))throw Error('Report access is not available.');
  validateReport71(report,mode);
  if(finish){
   const latest=await readReconciliationAccount71(report.accountKey,report.from,report.to,report.dateBasis,true);if(!current())return;
   const signature=x=>JSON.stringify([x.opening,x.debit,x.credit,x.closing,x.lines.map(l=>[l.id,l.date,l.postingDate,l.memo,l.dr,l.cr])]);
   if(!latest)throw Error('The original account is no longer available.');
   if((latest.fingerprint&&latest.fingerprint!==report.cloudFingerprint305)||signature(latest)!==signature(report)){
    Object.assign(report,{cloudFingerprint305:latest.fingerprint||null,correctionSession305:latest.session||null,opening:latest.opening,debit:latest.debit,credit:latest.credit,closing:latest.closing,lines:structuredClone(latest.lines),snapshotAt:new Date().toISOString(),differenceConfirmed:false});renderReport71();
    throw Error('The ledger has changed. Review the updated figures and save again.');
   }
  }
  if(!reportPermission71()||!access113.can('report-reconciliation','edit'))throw Error('Report access is not available.');
  validateReport71(report,mode);const originalState=JSON.stringify(report),copy=structuredClone(report);
  copy.status=finish?(reportCalculation71(copy).difference===0?'reconciled':'saved'):'draft';copy.updatedAt=new Date().toISOString();
  if(finish){copy.completedAt=copy.updatedAt;copy.completedBy=preparer71()}
  copy.key=copy.owner+':'+reconciliationKey71(copy);
  if(finish&&reconciliationCloud305())Object.assign(copy,await reconciliationRpc305(report.editing306?'reconciliation_update306':'reconciliation_save305',{p_report:copy,p_fingerprint:report.cloudFingerprint305,...(report.editing306?{p_expected:report.editVersion306}:{})}));
  delete copy.editing306;delete copy.editVersion306;
  if(!current())return;
  try{await reportStore71('readwrite',s=>s.put(copy))}catch(e){if(!copy.cloudConfirmed305)throw e}

  if(!current())return;
  if(JSON.stringify(report)!==originalState){recError71('Report saved. Newer edits remain unsaved.');return}
  currentReport71=copy;
  if(finish){document.getElementById('recOverlay71')?.remove();currentReport71=null;await renderReconciliationList71();}
  else{renderReport71();recError71('Reconciliation saved.');await renderReconciliationList71();}
 }catch(e){if(current())recError71('Not saved: '+e.message)}finally{reportBusy71=false;const save=document.querySelector('[data-rec-save305]');if(save)save.disabled=false}
}
function closeReport71(){const report=currentReport71;if(currentReport71&&!reconciliationRecorded71(currentReport71)){if(document.querySelector('#activeAppConfirm.rec-confirm14231'))return;showAppConfirm('Close report','Unsaved changes will be lost. Save first if you want to keep them.','Close',()=>{if(currentReport71!==report)return;document.getElementById('recOverlay71')?.remove();currentReport71=null});const confirm=document.getElementById('activeAppConfirm');confirm.classList.add('rec-confirm14231');confirm.setAttribute('role','alertdialog');confirm.setAttribute('aria-modal','true');confirm.setAttribute('aria-label','Close reconciliation');confirm.querySelector('[data-cancel]').focus({preventScroll:true});return}document.getElementById('recOverlay71')?.remove();currentReport71=null}
document.addEventListener('keydown',event=>{if(event.key!=='Escape'||!document.getElementById('recOverlay71')||document.querySelector('#activeAppConfirm,.ui-overlay108,.account-list1428'))return;event.preventDefault();closeReport71()});
async function attachReportFiles71(input){if(currentReport71?.status!=='draft')return;const report=currentReport71,actor=reportOwner71(),client=ojmDb;reportAttaching71=true;try{for(const f of input.files){if(!['application/pdf','image/png','image/jpeg'].includes(f.type)||f.size>10*1024*1024)throw Error('Use PDF, PNG or JPEG files up to 10 MB each.');const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(f)});if(actor!==reportOwner71()||client!==ojmDb||currentReport71!==report)return;report.attachments.push({name:f.name,type:f.type,data})}if(currentReport71===report)renderReport71()}catch(e){recError71(e.message)}finally{reportAttaching71=false}}
async function downloadData71(data,name,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;await (window.exportCenter14337?exportCenter14337.fromLink(a):a.click());setTimeout(()=>URL.revokeObjectURL(url),1000)}
function downloadAttachment71(i){const a=currentReport71?.attachments[i];if(!a)return;const bytes=Uint8Array.from(atob(a.data.split(',')[1]),c=>c.charCodeAt(0));downloadData71(bytes,a.name,a.type)}
function exportReport71(){if(!currentReport71)return;downloadData71(JSON.stringify({format:'oonjai-reconciliation-1',report:currentReport71},null,2),currentReport71.id+'.json','application/json')}
let reconciliationLoad306=null;
async function renderReconciliationList71(){
 const host=document.getElementById('reconciliationList71'),owner=reportOwner71(),client=ojmDb;if(!host||!reportPermission71())return;
 if(reconciliationLoad306?.owner===owner&&reconciliationLoad306.client===client)return reconciliationLoad306.promise;
 const task={owner,client};task.promise=(async()=>{try{
  const selected=host.dataset.recOwner306===owner?host.querySelector('#recCreate117 [name=month]')?.value:null;
  const [all,prefs]=await Promise.all([reconciliationRecords305(),reconPreferences71(owner)]);const initial=await reconciliationWorkspace306(selected);
  const work=initial.month||!selected?initial:await reconciliationWorkspace306();
  if(reportOwner71()!==owner||client!==ojmDb)return;
  if(selected&&host.querySelector('#recCreate117 [name=month]')?.value!==selected){task.reload=true;return;}
  if(host.dataset.recOwner306!==owner||!host.querySelector('[data-rec-rows306]')){
   host.innerHTML='<div class="je-card-header"><div><h3>Reconciliation</h3><p>Complete the required accounts for the open book. Open History for saved reconciliations.</p></div><div class="module-actions71"><button type="button" class="je-btn je-btn-secondary" data-add-account disabled>Add account</button><button type="button" class="je-btn je-btn-secondary" onclick="workspace14337.reconciliationHistory()">History</button></div></div><div class="table-container"><table><thead><tr><th>Reconciliation ID</th><th>Account</th><th>Status</th><th>Actual</th><th>Action</th></tr></thead><tbody data-rec-rows306></tbody></table></div>';host.dataset.recOwner306=owner;
  }
  host.querySelector('[data-rec-error306]')?.remove();
  host.recWorkspace306=work;host.recPreferences306=prefs;
  const rows=latestReconciliations306(all.filter(r=>r.owner===owner&&work.month&&r.from===work.month+'-01'&&r.to.slice(0,7)===work.month)),open=work.months.find(m=>m.month===work.month)?.status==='open';
  host.querySelector('[data-rec-rows306]').innerHTML=rows.map(r=>{const c=reportCalculation71(r),item=work.progress?.items?.find(x=>x.id===r.account.id),status=item&&!item.complete?'Needs review':reconciliationStatus71(r),id=encodeURIComponent(reconciliationKey71(r)).replaceAll("'",'%27');return `<tr><td>${escapeHtml(reconciliationNumber71(r))}</td><td>${escapeHtml(reconciliationAccountLabel306(r,true))}</td><td>${escapeHtml(status)}</td><td>${c.adjusted===null?'—':money69(c.adjusted)}</td><td><button class="je-btn je-btn-secondary" onclick="openSavedReport71('${id}')">View</button> <button class="je-btn je-btn-secondary" ${open?'':'disabled'} onclick="editReconciliation306('${id}')">Edit</button></td></tr>`}).join('')||'<tr><td colspan="5">'+(work.month?'No reconciliations recorded for this open month.':'No open book. Saved reconciliations are available in Reports.')+'</td></tr>';
  host.querySelector('#recCreate117')?.refresh306?.(work,prefs);
 }catch(e){if(owner===reportOwner71()&&client===ojmDb){let note=host.querySelector('[data-rec-error306]');if(!note){note=document.createElement('p');note.dataset.recError306='';note.setAttribute('role','status');host.append(note)}note.textContent='Reconciliation could not load: '+e.message}}
 })().finally(()=>{if(reconciliationLoad306===task){reconciliationLoad306=null;if(task.reload)void renderReconciliationList71()}});reconciliationLoad306=task;return task.promise;
}

function reconciliationSummary306(rows){
 return '<div class="table-container"><table data-reconciliation-summary306><thead><tr>'+['Reconciliation ID','Account','Currency','Period','Ledger','Actual','Difference'].map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>{const c=reportCalculation71(r);return '<tr>'+[escapeHtml(reconciliationNumber71(r)),escapeHtml(reconciliationAccountLabel306(r)),escapeHtml(r.currency),escapeHtml(reconciliationPeriod306(r.from,r.to)),money69(r.closing),c.adjusted===null?'—':money69(c.adjusted),c.difference===null?'—':money69(c.difference)].map(x=>'<td>'+x+'</td>').join('')+'</tr>'}).join('')+'</tbody></table></div>';
}
function reconciliationReportContent306(rows,choices){
 let html=choices.summary?'<h2>Reconciliation Summary</h2>'+reconciliationSummary306(rows):'';
 if(choices.ledger)for(const r of rows){html+='<h2>'+escapeHtml(reconciliationNumber71(r))+' · '+escapeHtml(reconciliationAccountLabel306(r,true))+'</h2><p>'+escapeHtml(reconciliationPeriod306(r.from,r.to))+' · '+(r.dateBasis==='receipt'?'Receipt dates':'Posting dates')+'</p>'+snapshotTable71(r);if(r.notes)html+='<p><strong>Reconciliation note:</strong> '+escapeHtml(r.notes)+'</p>';if(r.findings?.length)html+='<h3>Reconciling items</h3>'+table82(['Item','Amount','Explanation'],r.findings.map(f=>[escapeHtml(f.kind),money69(cents69(f.amount)),escapeHtml(f.description)]));}
 return html;
}
async function reconciliationExport306(preferred=null){
 const owner=reportOwner71(),client=ojmDb,current=()=>owner===reportOwner71()&&client===ojmDb&&reportPermission71();
 try{
  if(!current()||!access113.can('report-reconciliation','export'))throw Error('Reconciliation export access is required.');
  const all=latestReconciliations306((await reconciliationRecords305()).filter(reconciliationRecorded71));if(!current())return;if(!all.length)throw Error('There are no saved reconciliations to export.');
  if(preferred){const i=all.findIndex(r=>r.account.id===preferred.account.id&&r.from===preferred.from&&r.to===preferred.to);if(i>=0)all[i]=preferred;}
  const latest=preferred||all[0],defaults=await window.printPreferences1434?.load();if(!current())return;
  const previous=defaults?.reports275?.['report:report-reconciliation'],signers=previous?.signers||[{name:liveProfile?.full_name||liveProfile?.email||'',role:'Manager'}];
  const accounts=[...new Map(all.map(r=>[r.account.id||r.accountKey,r])).values()],esc=escapeHtml;
  const pending=ui108.modal('Reconciliation report',`<form id="recExport306"><div class="rec-export-dates306"><label>From<input name="from" type="date" value="${esc(latest.from)}" required></label><label>Through<input name="to" type="date" value="${esc(latest.to)}" required></label></div><p>Includes the latest saved reconciliation for each account and period within these dates.</p><fieldset><legend>Accounts</legend><label><input type="checkbox" data-rec-all306 ${preferred?'':'checked'}> Select all</label><div class="rec-export-accounts306">${accounts.map((r,i)=>`<label><input type="checkbox" name="account" value="${i}" ${!preferred||r.account.id===preferred.account.id?'checked':''}> ${esc(reconciliationAccountLabel306(r,true))}</label>`).join('')}</div></fieldset><fieldset class="rec-export-content306"><legend>Include</legend><label><input name="summary" type="checkbox" checked> Summary</label><label><input name="ledger" type="checkbox" checked> Ledger details and reconciliation notes</label></fieldset><label>Signatories<select name="count" data-plain14285>${[0,1,2,3].map(n=>`<option value="${n}" ${n===signers.length?'selected':''}>${n===0?'None':n}</option>`).join('')}</select></label>${[0,1,2].map(i=>`<fieldset data-rec-signer306="${i}"><legend>Signatory ${i+1}</legend><div class="rec-export-dates306"><label>Name<input name="person${i}" value="${esc(signers[i]?.name||'')}" maxlength="120"></label><label>Job title<input name="role${i}" value="${esc(signers[i]?.role||['Manager','Cashier','Director'][i])}" maxlength="80"></label></div></fieldset>`).join('')}<label><input type="checkbox" name="saveSignatories"> Save these signatories for reconciliation reports</label><p role="status" data-rec-export-status306></p></form>`,[{label:'Cancel',value:false},{label:'Open report',value:true,primary:true}],true);
  const overlay=document.querySelector('.ui-overlay108:last-child'),form=overlay.querySelector('form'),button=overlay.querySelector('footer button:last-child'),status=form.querySelector('[role=status]');let chosen=null;
  const refresh=()=>{
   form.querySelectorAll('[data-rec-signer306]').forEach((f,i)=>{f.hidden=i>=Number(form.elements.count.value);f.querySelectorAll('input').forEach(n=>{n.disabled=f.hidden;n.required=!f.hidden})});
   const from=form.elements.from.value,to=form.elements.to.value;
   form.querySelectorAll('[name=account]').forEach(box=>{const r=accounts[Number(box.value)],available=all.some(x=>(x.account.id||x.accountKey)===(r.account.id||r.accountKey)&&x.from>=from&&x.to<=to);box.disabled=!available;box.closest('label').hidden=!available});
   const boxes=[...form.querySelectorAll('[name=account]:not(:disabled)')],checked=boxes.filter(b=>b.checked).length,allBox=form.querySelector('[data-rec-all306]');allBox.checked=!!boxes.length&&checked===boxes.length;allBox.indeterminate=checked>0&&checked<boxes.length;
   status.textContent=boxes.length?'':'No saved reconciliations fall within these dates.';
  };
  form.elements.count.onchange=refresh;form.elements.from.onchange=refresh;form.elements.to.onchange=refresh;
  form.querySelector('[data-rec-all306]').onchange=e=>{form.querySelectorAll('[name=account]:not(:disabled)').forEach(b=>b.checked=e.target.checked);refresh()};form.querySelectorAll('[name=account]').forEach(b=>b.onchange=refresh);
  button.onclick=async()=>{
   if(button.disabled)return;if(!current()){status.textContent='Account changed. Open the report again.';return}if(!form.reportValidity())return;
   const from=form.elements.from.value,to=form.elements.to.value,selected=new Set([...form.querySelectorAll('[name=account]:checked:not(:disabled)')].map(b=>accounts[Number(b.value)].account.id||accounts[Number(b.value)].accountKey));
   const rows=all.filter(r=>selected.has(r.account.id||r.accountKey)&&r.from>=from&&r.to<=to);
   if(from>to||!rows.length){status.textContent='Choose a valid date range and at least one account.';return}
   if(!form.elements.summary.checked&&!form.elements.ledger.checked){status.textContent='Include the summary, ledger details, or both.';return}
   const names=Array.from({length:Number(form.elements.count.value)},(_,i)=>({name:form.elements['person'+i].value.trim(),role:form.elements['role'+i].value.trim()}));
   if(names.some(s=>!s.name||!s.role)){status.textContent='Enter each signatory’s name and job title.';return}
   const signatures={reportSignatories275:true,enabled:names.length>0,signers:names};button.disabled=true;
   try{if(form.elements.saveSignatories.checked){if(!window.printPreferences1434)throw Error('Signatory defaults are unavailable.');const previous=await printPreferences1434.load();if(!current())return;await printPreferences1434.save({...previous,reports275:{...previous?.reports275,'report:report-reconciliation':signatures}})}if(!current())return;chosen={rows,from,to,summary:form.elements.summary.checked,ledger:form.elements.ledger.checked,signatures};overlay.resolve108(true)}catch(e){status.textContent=e.message}finally{button.disabled=false}
  };
  refresh();if(!await pending||!chosen||!current())return;
  return print82('Reconciliation Report',reconciliationReportContent306(chosen.rows,chosen),reconciliationPeriod306(chosen.from,chosen.to),{source:'report-reconciliation',reconciliationOptions306:true,reportSignatories275:chosen.signatures});
 }catch(e){if(current())showAppNotification('Reconciliation report',e.message,true)}
}

async function openSavedReport71(id){if(!reportPermission71())return;try{const r=(await reconciliationRecords305()).find(r=>reconciliationKey71(r)===decodeURIComponent(id));if(!r||r.owner!==reportOwner71())throw Error('Report not found for this user.');currentReport71=r;renderReport71()}catch(e){recError71(e.message)}}
async function importReport71(input){const actor=reportOwner71(),client=ojmDb;try{if(!reportPermission71())throw Error('Report access is not available.');const file=input.files[0];if(!file)return;if(file.size>50*1024*1024)throw Error('Backup exceeds 50 MB.');const data=JSON.parse(await file.text()),r=data.report;if(data.format!=='oonjai-reconciliation-1'||!r||!Array.isArray(r.lines)||!Array.isArray(r.findings)||!Array.isArray(r.attachments)||!r.account?.name||!['draft','reconciled','saved'].includes(r.status)||!Number.isSafeInteger(r.closing))throw Error('Invalid report backup.');if(r.attachments.some(a=>!/^data:(application\/pdf|image\/png|image\/jpeg);base64,[A-Za-z0-9+/=]+$/.test(a.data)))throw Error('Unsupported attachment in backup.');validateReport71(r,r.status==='saved'?'save':r.status==='reconciled');if(actor!==reportOwner71()||client!==ojmDb||!reportPermission71())return;r.originalReportId=r.id;r.id=reconciliationNumber71(r);r.recordId=crypto.randomUUID();r.owner=reportOwner71();r.key=r.owner+':'+reconciliationKey71(r);r.updatedAt=new Date().toISOString();r.importedAt=r.updatedAt;await reportStore71('readwrite',s=>s.put(r));await renderReconciliationList71()}catch(e){showAppNotification('Import failed',e.message,true)}finally{input.value=''}}
function printReport71(){
 const r=currentReport71;if(!r)return;const c=reportCalculation71(r),e=escapeHtml,frame=document.createElement('iframe');frame.style.cssText='position:fixed;width:0;height:0;border:0';document.body.appendChild(frame);const doc=frame.contentDocument;const setting=ApplicationSettings.printing||{},paper=['A4','Letter','Legal'].includes(setting.paperSize)?setting.paperSize:'A4',orientation=setting.orientation==='landscape'?'landscape':'portrait';
 const safeImage=(src)=>/^data:image\/(png|jpeg|webp|gif);base64,/.test(src||'')?`<img style="max-width:100%;max-height:100px" src="${src}">`:'';
 doc.open();doc.write(`<!doctype html><html><head><title>${e(r.id)}</title><style>@page{size:${paper} ${orientation};margin:15mm}body{font:11px Arial;color:#162e36}h1{font-size:20px}h2{font-size:15px}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border:1px solid #b8c9c1;padding:6px;text-align:left;overflow-wrap:anywhere}th{text-align:center;background:#edf8f2}tr{break-inside:avoid}p{white-space:pre-wrap}.status{color:#9a3412}</style></head><body>${safeImage(PrintSettings.headerImage)}${setting.showBusinessName!==false?`<h2>${e(BusinessSettings.current.companyName||AccountingStore.companyName||'Oon Jai')}</h2>`:''}<h1>Bank Reconciliation Report</h1><p data-report-notice270>${e(r.status.toUpperCase())}</p><p>${e(r.id)}</p><p>${e(r.account.code+' — '+r.account.name)} · ${e(r.currency)}\n${e(r.from?formatAppDate(r.from):'Beginning')} to ${e(formatAppDate(r.to))}\nPrepared by: ${e(r.preparedBy)} · ${e(formatAppDate(r.createdAt,true))}\nReviewed by (entered): ${e(r.reviewer||'Not recorded')}\nSnapshot: ${e(formatAppDate(r.snapshotAt,true))}${r.completedAt?'\nCompleted: '+e(formatAppDate(r.completedAt,true)):''}</p><table><tbody><tr><td>Opening book balance</td><td>${money69(r.opening)}</td></tr><tr><td>Period debits / credits</td><td>${money69(r.debit)} / ${money69(r.credit)}</td></tr><tr><td>Closing book balance</td><td>${money69(r.closing)}</td></tr><tr><td>Statement closing balance</td><td>${c.statement===null?'Not entered':money69(c.statement)}</td></tr><tr><td>Signed outstanding items</td><td>${money69(c.outstanding)}</td></tr><tr><td>Unexplained difference</td><td>${c.difference===null?'Not calculated':money69(c.difference)}</td></tr></tbody></table><h2>Findings</h2><table><thead><tr><th>Type</th><th>Amount</th><th>Explanation</th><th>Entry ID</th><th>Status</th></tr></thead><tbody>${r.findings.map(f=>`<tr><td>${e(f.kind)}</td><td>${money69(cents69(f.amount))}</td><td>${e(f.description)}</td><td>${e(f.entryId)}</td><td>${e(f.status)}</td></tr>`).join('')||'<tr><td colspan="5">No findings.</td></tr>'}</tbody></table><p>${e(r.notes)}</p><p>Supporting files: ${e(r.attachments.map(a=>a.name).join(', ')||'None')}</p><h2>Ledger snapshot</h2>${snapshotTable71(r)}${safeImage(PrintSettings.footerImage)}</body></html>`);doc.close();const preview=doc.body.cloneNode(true);preview.querySelectorAll('img').forEach(n=>n.remove());frame.remove();return openDocumentEditor105({title:'Bank Reconciliation Report '+r.id,category:'Reports',printPreview:true,html:preview.innerHTML});
}
const saveAccountBefore71=handleAccountFormSubmit;
handleAccountFormSubmit=async function(event){await saveAccountBefore71(event);renderAccounts69()};
document.addEventListener('DOMContentLoaded',()=>{renderAccounts69();if(document.querySelector('#report-reconciliation.active,#user-entry-review.active'))void renderReconciliationList71()});

const logoutBefore71=logoutDemoUser;
logoutDemoUser=async function(){document.getElementById('recOverlay71')?.remove();currentReport71=null;document.getElementById('reconciliationList71')?.replaceChildren();return logoutBefore71()}
