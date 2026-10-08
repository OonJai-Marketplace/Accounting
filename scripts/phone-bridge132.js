/* Same application, alternate phone view. All mutations use existing desktop handlers. */
(()=>{'use strict';const $=id=>document.getElementById(id);const phone=()=>document.documentElement.dataset.device132==='phone';
const allowed=(target,verb='view')=>!!window.access113?.can(target,verb);
function run(target,verb,fn){if(!allowed(target,verb)){showCenterStatus('This action is not included in your permissions.',true);return false}return fn()}
function profile(){return typeof liveProfile==='undefined'?null:liveProfile}
function users(){const me=profile();if(!me)return [];const list=availableSubUsers();
 // Keep authorized administrator self-access independent of the refreshing Home cache.
 if((me.role==='admin'&&allowed('sub-users-workspace')||window.Organization14229?.homeUsers().some(u=>String(u.id)===String(me.id)))&&!list.some(u=>String(u.id)===String(me.id)))list.push({...me,user_permissions:livePermission||{}});
 return list.filter(u=>window.Organization14229?Organization14229.mayOpen(u.id):u.id===me.id||me.role==='admin');
}
function workspaceUsers(){const all=new Map();for(const u of [...(window.Organization14229?.homeUsers()||[]),...users()])all.set(String(u.id),u);return window.Organization14229?.orderUsers([...all.values()])||[...all.values()];}

function user(id){return users().find(u=>String(u.id)===String(id))}
function selectUser(id,view='home'){if(!allowed('sub-users-workspace')||!user(id))throw Error('This user is not assigned to you.');switchTab('sub-users-workspace');openWorkspaceUser(id);v49SetView(id,view)}
function nativeTarget(n){return n?.closest('[id^=sec-]')?.id||n?.closest('.tab-content')?.id}
function nativeAllowed(n){const target=nativeTarget(n),action=window.access113?.actionFor(n)||'view';return !!target&&allowed(target,action)}
function put(id,value){const n=$(id);if(!n)throw Error('The entry form is unavailable.');n.value=value??'';n.dispatchEvent(new Event('input',{bubbles:true}));return n}
function canWriteStaff(id){return allowed('sub-users-workspace','edit')&&!!user(id)&&(profile()?.role==='admin'||String(profile()?.id)===String(id))}
function staffGroups(id){
 const groups=[];
 for(const batch of api.reports(id)){
  const map=new Map();
  for(const line of batch.lines||[]){if(line.voided_at||line.status==='voided')continue;const key=line.editor_group1437||line.id;if(!map.has(key))map.set(key,[]);map.get(key).push(line)}
  for(const lines of map.values())groups.push({batch,lines});
 }
 return groups.sort((a,b)=>String(b.lines[0].transaction_date).localeCompare(String(a.lines[0].transaction_date)));
}
function staffEditorDraft(id,lineId){
 if(!canWriteStaff(id))throw Error('Editing is not enabled for this workspace.');
 const group=staffGroups(id).find(g=>g.lines.some(l=>l.id===lineId));
 if(!group||!['draft','returned'].includes(group.batch.status))throw Error('This entry is no longer editable.');
 const first=group.lines[0],saved=first.editor_snapshot1437,rules=api.rules(id);
 const normalize=rows=>rows.map(r=>JSON.stringify([r.date,r.direction,r.fund,r.account,Number(r.amount),r.memo])).sort().join('|');
 const actual=group.lines.map(l=>({date:l.transaction_date,direction:l.direction,fund:l.fund_account_id,account:l.account_id,amount:l.amount,memo:l.memo}));
 const valid=saved?.components1437&&normalize(actual)===normalize(saved.components1437.filter(r=>r.date===first.transaction_date));
 const resolve=label=>AccountingStore.accounts.find(a=>a.code+' — '+a.name===label||String(a.id)===String(label))?.id||'';
 return {entryNo:first.workspace_entry_no||first.reference||'',mode:valid?saved.mode:'single',date:first.transaction_date,memo:valid?saved.memo:first.memo,reference:valid?saved.reference||'':first.reference||'',requestKey:'phone-'+crypto.randomUUID(),editIds:group.lines.map(l=>l.id),
  lines:valid?(saved.rows||[]).filter(r=>!saved.multiple||r.date===first.transaction_date).map(r=>({account:resolve(r.account),memo:r.memo||'',debit:r.dr||'',credit:Object.values(r.credits||{}).find(v=>Number(String(v).replaceAll(',',''))>0)||''})):[],
  single:valid&&saved.mode==='single'?(saved.single||[]).filter(r=>!saved.multiple||r.date===first.transaction_date):group.lines.map(l=>({direction:l.direction,source:l.fund_account_id,affected:l.direction==='in'?rules.counterpart:l.account_id,amount:String(l.amount),memo:l.memo||''}))};
}
async function reminderEditor14229(){const editor=document.getElementById('upcomingEditor92');if(!editor)throw Error('Reminder form is unavailable. Refresh and try again.');const marker=document.createComment('restore reminder form');editor.before(marker);const done=ui108.modal('Add reminder','<div data-reminder-editor14229></div>',[{label:'Cancel',value:false}],true),overlay=document.querySelector('.ui-overlay108:last-child');overlay.querySelector('[data-reminder-editor14229]').append(editor);editor.hidden=false;editor.dataset.edited='true';const observer=new MutationObserver(()=>{if(editor.hidden)overlay.resolve108(false)});observer.observe(editor,{attributes:true,attributeFilter:['hidden']});try{document.getElementById('recurringMemo')?.focus();await done;}finally{observer.disconnect();if(marker.parentNode){marker.before(editor);marker.remove()}editor.hidden=true;}}
// Phone reads do not depend on mounting the hidden desktop workspace.
const phoneFunds14237=new Map(),phoneLoads14237=new Map(),phoneErrors14237=new Map();let phoneActor14237='',phoneReports14237=null,phoneReportsRequest14237=null;
function phoneIdentity14237(){const id=api.session();if(phoneActor14237!==id){phoneActor14237=id;phoneFunds14237.clear();phoneLoads14237.clear();phoneErrors14237.clear();phoneReports14237=null;phoneReportsRequest14237=null;}return id;}
function phoneRead14238(request){let timer;return Promise.race([request,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('The connection is taking too long. Please try again.')),12000)})]).finally(()=>clearTimeout(timer));}
async function loadPhoneWorkspace14237(id,force=false){
 const who=phoneIdentity14237();if(!user(id)||!allowed('sub-users-workspace'))throw Error('This workspace is not included in your access.');
 if(phoneLoads14237.has(id))return phoneLoads14237.get(id);
 if(!force&&phoneFunds14237.has(id)&&phoneReports14237)return;
 phoneErrors14237.delete(id);
 const task=(async()=>{try{
  if(!phoneReportsRequest14237&&(force||!phoneReports14237)){
   const request=phoneRead14238(ojmDb.rpc('review_inbox14229')).then(r=>{if(r.error)throw Error(r.error.message);if(who===api.session()){if(!Array.isArray(r.data))throw Error('Entry data could not be read.');phoneReports14237=r.data;reviewStaffJournals=r.data;}});
   phoneReportsRequest14237=request;request.finally(()=>{if(phoneReportsRequest14237===request)phoneReportsRequest14237=null;}).catch(()=>{});
  }
  const [funds]=await Promise.all([phoneRead14238(ojmDb.rpc('fund_balances136',{p_owner:id,p_month:null})),phoneReportsRequest14237]);
  if(who!==api.session()||!user(id))return;
  if(funds.error)throw Error(funds.error.message);if(!Array.isArray(funds.data))throw Error('Fund balances could not be read.');phoneFunds14237.set(id,funds.data);
 }catch(e){if(who===api.session())phoneErrors14237.set(id,e.message||'Loading failed.');throw e;}finally{if(who===api.session()){phoneLoads14237.delete(id);notify();}}})();
 phoneLoads14237.set(id,task);return task;
}
const api=window.PhoneApp132={
 async ensureUser(id){
  const who=api.session();
  if(!user(id))await phoneRead14238(window.Organization14229?.loadProfiles());
  if(who!==api.session())throw Error('Your session changed. Open the workspace again.');
  if(!allowed('sub-users-workspace')||!user(id))throw Error('This workspace is not included in your current access.');
  return true;
 },
 loadWorkspace:loadPhoneWorkspace14237,
 loadHome:async()=>{await Promise.all([window.TeamHome14227?.reload(),phoneRead14238(window.Organization14229?.loadHome())]);},
 workspaceState(id){phoneIdentity14237();return {loading:phoneLoads14237.has(id),error:phoneErrors14237.get(id)||'',loaded:phoneFunds14237.has(id)&&phoneReports14237!==null};},
 profile,users,workspaceUsers,allowed,documents:()=>run('document-editor105','view',()=>openDocumentEditor105()),reportHistory:id=>reportHistory1443.open(id),
 landing:()=>window.phoneLanding14225,
 numberFormat:()=>ApplicationSettings.system?.numberFormat||'1,234.56',
 decimalPlaces:()=>appDecimalPlaces(),
 reminders:()=>window.PrivateReminders14229?.ready()?RecurringStore.items:[],addReminder:()=>run('transactions-recurring','edit',reminderEditor14229),markReminderPaid:id=>run('transactions-recurring','edit',()=>markRecurringPaid(id)),pauseReminder:id=>run('transactions-recurring','edit',()=>toggleRecurringPause(id)),removeReminder:id=>run('transactions-recurring','edit',()=>removeRecurring(id)),
 teamHome:()=>window.TeamHome14227?.home(),teamHomeAllowed:()=>!!window.Organization14229?.homeAllowed(),reviewPending:j=>!!window.Organization14229?.pending(j),reviewInfo:j=>window.Organization14229?.info(j),
 session:()=>String(profile()?.id||'')+':'+String(typeof sessionEpoch1430==='undefined'?'':sessionEpoch1430),
 ready:()=>!!profile()&&!!livePermission&&(!$('loginGate')||$('loginGate').classList.contains('is-authenticated'))&&(!phone()||(window.startup14257?.interactive===true&&typeof Location69!=='undefined'&&Location69.ready&&!Location69.hydrating)),
 canWriteStaff,staffGroups,staffEditorDraft,
 validateStaff:(id,data)=>{if(!user(id)||!allowed('sub-users-workspace'))throw Error('This workspace is not accessible.');return StaffEntry14225.prepare(data,api.accounts(),api.rules(id))},
 saveStaffEditor:async(id,data)=>{
  if(!canWriteStaff(id))throw Error('Editing is not enabled for this workspace.');
  const actor=profile().id,{items,snapshot}=api.validateStaff(id,data);
  const result=await window.staffSave14228({p_owner:id,p_key:data.requestKey,p_items:items,p_snapshot:snapshot,p_edit_ids:data.editIds||[]});
  if(result.error)throw Error(result.error.message+(result.error.code==='PGRST202'?' Run setup/INSTALL-DESKTOP-JOURNAL-v142.17.sql once.':''));
  if(result.queued)return {queued:true,actor};
  if(profile()?.id===actor)void loadPhoneWorkspace14237(id,true).catch(()=>{if(profile()?.id===actor)showCenterStatus('Entry saved. Refresh Entries to load the updated records.',true)});
  return {saved:true,actor};
 },
 voidStaffGroup:async(id,lineId)=>{
  if(!canWriteStaff(id)||!allowed('sub-users-workspace','void'))throw Error('Voiding is not enabled for this workspace.');
  const group=staffGroups(id).find(g=>g.lines.some(l=>l.id===lineId));if(!group||!['draft','returned'].includes(group.batch.status))throw Error('This entry is no longer editable.');
  const reason=await ui117.prompt('Reason for voiding this personal journal entry:');if(!reason?.trim())return;
  const result=await ojmDb.rpc('void_staff_editor1437',{p_owner:id,p_ids:group.lines.map(l=>l.id),p_reason:reason.trim()});
  if(result.error)throw Error(result.error.message);await loadPhoneWorkspace14237(id,true);
 },
 settingsUsers:()=>allowed('settings-users')?liveProfiles||[]:[],
 editUser:(id='',section)=>run('settings-users','edit',()=>{switchTab('settings-users');openUserAccessEditor(id);window.compactUserSettings133?.();if(section)openAccessPicker(section==='accounts'?'Account Assignment':'Module Access',section==='accounts'?'userAccountAssignmentPanel':'userModuleAccessPanel');}),
 resetOwnPassword:async()=>{const me=profile();if(!me?.email)throw Error('Your account email is unavailable.');const {error}=await ojmDb.auth.resetPasswordForEmail(me.email,{redirectTo:passwordRecoveryRedirectUrl()});if(error)throw error;showCenterStatus('Password-reset email requested. Check your inbox.');},
 accounts:()=>{const all=AccountingStore.accounts||[];if(!phone()&&['journal','transactions-all','sec-chart-accounts','sec-general-ledger','trial-balance','account-balances'].some(t=>allowed(t)))return all;if(!allowed('sub-users-workspace'))return [];const ids=new Set(users().flatMap(u=>{const r=workspaceRules(u);return [...r.fundIds,...r.entryIds,r.counterpart]}));return all.filter(a=>ids.has(a.id))},
 subAccounts:()=>{const permitted=new Set(api.accounts().map(a=>String(a.id||a.code)));return (AccountingStore.subAccounts||[]).filter(s=>permitted.has(String(s.parentId||AccountingStore.accounts.find(a=>a.code===s.parentCode)?.id||s.parentCode)))},
 accountName:id=>accountLabelOnly(id),
 rules:id=>{const u=user(id);return u?workspaceRules(u):null},
 journals:()=>allowed('journal')||allowed('transactions-all')?JournalModule.entries||[]:[],
 reports:id=>{if(id&&(!allowed('sub-users-workspace')||!user(id)))return [];phoneIdentity14237();return (reviewStaffJournals||[]).filter(j=>id?String(j.owner_id)===String(id):allowed('user-entry-review'))},
 funds:id=>{phoneIdentity14237();return user(id)?phoneFunds14237.get(id):undefined;},
 openUser:selectUser,
 navigate:(target)=>{if(phone()&&!['sub-users-workspace','sub-users-home14229','settings-users','document-editor105'].includes(target))return false;if(!allowed(target))return false;if(target.startsWith('sec-'))scrollToAccountModule(target);else switchTab(target);return true},
 saveStaff:async(id,data)=>run('sub-users-workspace','edit',async()=>{window.phoneResetStaff132?.();selectUser(id,'post');put('v49Date',data.date);put('v49Direction',data.direction);v49DirectionChanged(id);put('v49Fund',data.fund);v49FundChanged();put('v49Account',data.direction==='in'?data.fund:data.account);put('v49Amount',data.amount);put('v49Description',[data.memo,data.reference].filter(Boolean).join(' — '));v49ValidatePost();return v49SavePost(id)}),
 editStaff:(id,line)=>run('sub-users-workspace','edit',()=>{selectUser(id,'entries');v49EditEntry(id,line);const val=n=>$(n)?.value;return {date:val('v49Date'),direction:val('v49Direction'),fund:val('v49Fund'),account:val('v49Account'),amount:val('v49Amount'),memo:val('v49Description')}}),
 saveEditedStaff:async(id,data)=>run('sub-users-workspace','edit',async()=>{put('v49Date',data.date);put('v49Direction',data.direction);v49DirectionChanged(id);put('v49Fund',data.fund);v49FundChanged();put('v49Account',data.direction==='in'?data.fund:data.account);put('v49Amount',data.amount);put('v49Description',[data.memo,data.reference].filter(Boolean).join(' — '));v49ValidatePost();return v49SavePost(id)}),
 deleteStaff:(id,line)=>run('sub-users-workspace','void',()=>{if(!allowed('sub-users-workspace','edit')||!user(id))return false;return voidWorkspaceSingleRow(id,line)}),
 submit:async(id,month='')=>{
  if(window.offline14239?.pendingOwner(id))throw Error('Sync all pending entries for this user before submitting for review.');
  if(!canWriteStaff(id))throw Error('Submitting is not enabled for this workspace.');
  const batches=api.reports(id).filter(j=>['draft','returned'].includes(j.status)&&j.lines?.length&&(!month||String(j.period_start).startsWith(month)));
  if(!batches.length)throw Error('No saved entries are ready to submit for this selection.');
  const who=api.session();const content='<p>Submit this period and lock its saved entries for review?</p><label>Period<select id="phoneSubmitPeriod14237">'+batches.map(j=>'<option value="'+escapeHtml(j.id)+'">'+escapeHtml(String(j.period_start).slice(0,7))+' · '+j.lines.length+' entries</option>').join('')+'</select></label>';
  const answer=ui108.modal('Submit for Review',content,[{label:'Cancel',value:false},{label:'Submit',value:true,primary:true}]);
  const select=document.getElementById('phoneSubmitPeriod14237');let selected=select.value;select.onchange=()=>selected=select.value;
  if(!await answer)return;if(who!==api.session()||!canWriteStaff(id))throw Error('Your access changed. Open the workspace again.');
  if(!api.reports(id).some(j=>j.id===selected&&['draft','returned'].includes(j.status)))throw Error('This period is no longer ready to submit.');
  const result=await ojmDb.rpc('submit_staff_journal',{p_journal_id:selected});if(result.error)throw Error(result.error.message);await loadPhoneWorkspace14237(id,true);
 },
 staffHistory:(id,mode)=>{selectUser(id,'entries');openWorkspaceReview(id,mode)},
 adjust:(id,fund)=>run('sub-users-workspace','edit',()=>{selectUser(id,'accounts');v49OpenAdjustment(id,fund)}),
 compare:id=>run('user-entry-review','view',()=>{switchTab('user-entry-review');openSubmissionComparison(id)}),
 returnReport:id=>run('user-entry-review','approve',()=>returnReviewJournal(id)),
 approve:id=>run('user-entry-review','approve',()=>prepareReviewJournal(id)),
 dashboard:()=>allowed('dashboard')?({state:dashboardWarm112.state,amount:dashboardWarm112.amount}):({state:{mappings:{},month:'',currency:''},amount:()=>0}),
 map:key=>run('dashboard','view',()=>dashboardWarm112.mapDialog(key)),
 dashboardPeriod:(month,currency)=>{api.navigate('dashboard');const m=document.querySelector('[data-month112]');if(m){m.value=month;m.dispatchEvent(new Event('change',{bubbles:true}))}const c=document.querySelector('[data-currency112]');if(c){c.value=currency;c.dispatchEvent(new Event('change',{bubbles:true}))}},
 ledger:()=>allowed('sec-general-ledger')||allowed('trial-balance')||allowed('account-balances')?reportRows69():[],
 reportPeriod:(key,value)=>setReport69(key,value),
 reportState:()=>({...Accounts69}),
 export:kind=>run(kind==='ledger'?'sec-general-ledger':kind==='trial'?'trial-balance':'account-balances','export',()=>exportAccounts69(kind)),
 addAccount:()=>run('sec-chart-accounts','edit',()=>openAddAccountModal()),
 editAccount:code=>run('sec-chart-accounts','edit',()=>openEditAccountModal(code)),
 subAccount:()=>run('sec-sub-accounts','edit',()=>openAddSubAccountModal()),
 source:id=>run('sec-general-ledger','view',()=>showJournalSource69(encodeURIComponent(id))),
 prepareJournal:id=>run('journal','edit',()=>{switchTab('journal');if(id)loadEntryForEdit(id);else clearJournalEntry();showJournalEntry98(true);return api.journalDraft()}),
 journalDraft:()=>({date:$('jeTransDate')?.value,memo:$('jeGeneralMemo')?.value,lines:[...document.querySelectorAll('#jeLinesBody tr')].map(r=>({account:r.querySelector('.je-line-acc')?.value,memo:r.querySelector('.je-line-memo')?.value,debit:r.querySelector('.je-line-dr')?.value,credit:[...r.querySelectorAll('.je-line-cr')].find(n=>n.value&&Number(n.value.replaceAll(',','')))?.value||''}))}),
 postJournal:data=>run('journal','post',()=>{put('jeTransDate',data.date);put('jeGeneralMemo',data.memo);$('jeLinesBody').replaceChildren();data.lines.forEach(l=>{const a=AccountingStore.accounts.find(a=>String(a.id||a.code)===String(l.account)||a.code+' — '+a.name===l.account);if(!a)throw Error('Select an existing account for every line.');addJournalLineRow(a.code+' — '+a.name,l.memo||'',l.debit||'',{[a.currency]:l.credit||''})});calculateJournalBalance();return submitJournalEntry()}),
 exportJournal:()=>run('journal','export',()=>exportJournalCSV()),
 closing:()=>allowed('period-review')?({month:PeriodReview.selectedMonth,status:PeriodReview.status(PeriodReview.selectedMonth),findings:PeriodReview.findings.filter(f=>f.month===PeriodReview.selectedMonth),entries:periodEntries()}):({month:'',status:'unavailable',findings:[],entries:[]}),
 closingMonth:month=>{api.navigate('period-review');selectReviewPeriod(month)},
 close:()=>run('period-review','approve',()=>finishEditing69(PeriodReview.selectedMonth)),
 lock:()=>run('period-review','approve',()=>changePeriodStatus('locked')),
 reopen:()=>run('period-review','edit',()=>changePeriodStatus('open')),
 finding:data=>run('period-review','edit',()=>{put('findingTransactionId',data.transaction);put('findingType',data.type);put('findingDescription',data.description);return savePeriodFinding({preventDefault(){}})}),
 schedule:id=>run('transactions-recurring','edit',()=>openScheduledEditor91(id||'')),
 nativeCards:(selector)=>[...document.querySelectorAll(selector)].map((n,i)=>({node:n,index:i})).filter(x=>allowed(nativeTarget(x.node))).map(({node:n,index:i})=>({index:i,text:n.textContent.trim(),title:n.querySelector('summary')?.textContent.trim()||n.textContent.trim(),actions:[...n.querySelectorAll('button')].map((b,j)=>({index:j,label:b.textContent.trim()||b.title,disabled:b.disabled||b.hidden||!nativeAllowed(b)}))})),
 nativeAction:(selector,i,j)=>{const b=document.querySelectorAll(selector)[i]?.querySelectorAll('button')[j];if(b&&!b.disabled&&!b.hidden&&nativeAllowed(b))b.click()},
 printStaff:id=>run('document-editor105','export',()=>reportHistory1443.open(id)),
 printSavedReport:id=>run('document-editor105','export',()=>reportHistory1443.has(id)?reportHistory1443.print(id):savedReports1434.print(id)),
 logout:()=>logoutDemoUser(),
 refresh:async()=>{if(!profile())return;const selected=$('connectedPhone132')?.contentWindow?.phoneSelection14237?.();if(selected?.module==='subusers'){if(selected.user)await loadPhoneWorkspace14237(selected.user,true);else await window.TeamHome14227?.reload();notify();return;}await Promise.all([loadJournalFromSupabase(),loadStaffJournalsForReview()]);window.funds113?.refresh();await window.TeamHome14227?.reload();notify()}
};
function notify(){const frame=$('connectedPhone132');try{frame?.contentWindow?.phoneRefresh132?.()}catch{}}
function ready(){if(!phone())return;const f=document.createElement('iframe');f.id='connectedPhone132';f.title='Oon Jai phone workspace';f.src='phone-accounting.html?v=142.89';document.body.append(f);const gate=$('loginGate');if(gate){new MutationObserver(()=>{const doc=f.contentDocument;if(doc?.documentElement&&(!api.ready()||doc.documentElement.dataset.phoneOwner14288!==api.session())){doc.documentElement.dataset.phoneReady14288='false';notify();}}).observe(gate,{attributes:true,attributeFilter:['class']});}let timer;new MutationObserver(records=>{if(records.every(r=>r.target.closest?.('#connectedPhone132')))return;clearTimeout(timer);timer=setTimeout(notify,180)}).observe(document.querySelector('.app-layout'),{childList:true,subtree:true});window.addEventListener('page113',notify);setInterval(()=>{notify()},3000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
