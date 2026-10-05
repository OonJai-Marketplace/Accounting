/* Same application, alternate phone view. All mutations use existing desktop handlers. */
(()=>{'use strict';const $=id=>document.getElementById(id);const phone=()=>document.documentElement.dataset.device132==='phone';
const allowed=(target,verb='view')=>!!window.access113?.can(target,verb);
function run(target,verb,fn){if(!allowed(target,verb)){showCenterStatus('This action is not included in your permissions.',true);return false}return fn()}
function profile(){return typeof liveProfile==='undefined'?null:liveProfile}
function users(){const me=profile();if(!me)return [];return availableSubUsers().filter(u=>window.Organization14229?Organization14229.mayOpen(u.id):u.id===me.id||me.role==='admin') }

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
 return {mode:valid?saved.mode:'single',date:first.transaction_date,memo:valid?saved.memo:first.memo,reference:valid?saved.reference||'':first.reference||'',requestKey:'phone-'+crypto.randomUUID(),editIds:group.lines.map(l=>l.id),
  lines:valid?(saved.rows||[]).filter(r=>!saved.multiple||r.date===first.transaction_date).map(r=>({account:resolve(r.account),memo:r.memo||'',debit:r.dr||'',credit:Object.values(r.credits||{}).find(v=>Number(String(v).replaceAll(',',''))>0)||''})):[],
  single:valid&&saved.mode==='single'?(saved.single||[]).filter(r=>!saved.multiple||r.date===first.transaction_date):group.lines.map(l=>({direction:l.direction,source:l.fund_account_id,affected:l.direction==='in'?rules.counterpart:l.account_id,amount:String(l.amount),memo:l.memo||''}))};
}
async function reminderEditor14229(){const editor=document.getElementById('upcomingEditor92');if(!editor)throw Error('Reminder form is unavailable. Refresh and try again.');const marker=document.createComment('restore reminder form');editor.before(marker);const done=ui108.modal('Add reminder','<div data-reminder-editor14229></div>',[{label:'Cancel',value:false}],true),overlay=document.querySelector('.ui-overlay108:last-child');overlay.querySelector('[data-reminder-editor14229]').append(editor);editor.hidden=false;editor.dataset.edited='true';const observer=new MutationObserver(()=>{if(editor.hidden)overlay.resolve108(false)});observer.observe(editor,{attributes:true,attributeFilter:['hidden']});try{document.getElementById('recurringMemo')?.focus();await done;}finally{observer.disconnect();if(marker.parentNode){marker.before(editor);marker.remove()}editor.hidden=true;}}
const api=window.PhoneApp132={
 async ensureUser(id){
  const who=api.session();
  if(!user(id))await window.Organization14229?.loadProfiles();
  if(who!==api.session())throw Error('Your session changed. Open the workspace again.');
  if(!allowed('sub-users-workspace')||!user(id))throw Error('This workspace is not included in your current access.');
  return true;
 },
 profile,users,allowed,documents:()=>run('document-editor105','view',()=>openDocumentEditor105()),reportHistory:id=>reportHistory1443.open(id),
 landing:()=>window.phoneLanding14225,
 numberFormat:()=>ApplicationSettings.system?.numberFormat||'1,234.56',
 decimalPlaces:()=>appDecimalPlaces(),
 reminders:()=>window.PrivateReminders14229?.ready()?RecurringStore.items:[],addReminder:()=>run('transactions-recurring','edit',reminderEditor14229),markReminderPaid:id=>run('transactions-recurring','edit',()=>markRecurringPaid(id)),pauseReminder:id=>run('transactions-recurring','edit',()=>toggleRecurringPause(id)),removeReminder:id=>run('transactions-recurring','edit',()=>removeRecurring(id)),
 teamHome:()=>window.TeamHome14227?.home(),teamHomeAllowed:()=>!!window.Organization14229?.homeAllowed(),reviewPending:j=>!!window.Organization14229?.pending(j),reviewInfo:j=>window.Organization14229?.info(j),
 session:()=>String(profile()?.id||'')+':'+String(typeof sessionEpoch1430==='undefined'?'':sessionEpoch1430),
 ready:()=>!!profile()&&!!livePermission&&(!$('loginGate')||$('loginGate').classList.contains('is-authenticated')),
 canWriteStaff,staffGroups,staffEditorDraft,
 validateStaff:(id,data)=>{if(!user(id)||!allowed('sub-users-workspace'))throw Error('This workspace is not accessible.');return StaffEntry14225.prepare(data,api.accounts(),api.rules(id))},
 saveStaffEditor:async(id,data)=>{
  if(!canWriteStaff(id))throw Error('Editing is not enabled for this workspace.');
  const actor=profile().id,{items,snapshot}=api.validateStaff(id,data);
  const result=await window.staffSave14228({p_owner:id,p_key:data.requestKey,p_items:items,p_snapshot:snapshot,p_edit_ids:data.editIds||[]});
  if(result.error)throw Error(result.error.message+(result.error.code==='PGRST202'?' Run setup/INSTALL-DESKTOP-JOURNAL-v142.17.sql once.':''));
  if(profile()?.id===actor){try{await loadStaffJournalsForReview();window.funds113?.refresh()}catch{showCenterStatus('Entry saved. Refresh Entries to load the updated records.',true)}}
  return {saved:true,actor};
 },
 voidStaffGroup:async(id,lineId)=>{
  if(!canWriteStaff(id)||!allowed('sub-users-workspace','void'))throw Error('Voiding is not enabled for this workspace.');
  const group=staffGroups(id).find(g=>g.lines.some(l=>l.id===lineId));if(!group||!['draft','returned'].includes(group.batch.status))throw Error('This entry is no longer editable.');
  const reason=await ui117.prompt('Reason for voiding this personal journal entry:');if(!reason?.trim())return;
  const result=await ojmDb.rpc('void_staff_editor1437',{p_owner:id,p_ids:group.lines.map(l=>l.id),p_reason:reason.trim()});
  if(result.error)throw Error(result.error.message);await loadStaffJournalsForReview();
 },
 settingsUsers:()=>allowed('settings-users')?liveProfiles||[]:[],
 editUser:(id='',section)=>run('settings-users','edit',()=>{switchTab('settings-users');openUserAccessEditor(id);window.compactUserSettings133?.();if(section)openAccessPicker(section==='accounts'?'Account Assignment':'Module Access',section==='accounts'?'userAccountAssignmentPanel':'userModuleAccessPanel');}),
 resetOwnPassword:async()=>{const me=profile();if(!me?.email)throw Error('Your account email is unavailable.');const {error}=await ojmDb.auth.resetPasswordForEmail(me.email,{redirectTo:passwordRecoveryRedirectUrl()});if(error)throw error;showCenterStatus('Password-reset email requested. Check your inbox.');},
 accounts:()=>{const all=AccountingStore.accounts||[];if(['journal','transactions-all','sec-chart-accounts','sec-general-ledger','trial-balance','account-balances'].some(t=>allowed(t)))return all;if(!allowed('sub-users-workspace'))return [];const ids=new Set(users().flatMap(u=>{const r=workspaceRules(u);return [...r.fundIds,...r.entryIds,r.counterpart]}));return all.filter(a=>ids.has(a.id))},
 subAccounts:()=>{const permitted=new Set(api.accounts().map(a=>String(a.id||a.code)));return (AccountingStore.subAccounts||[]).filter(s=>permitted.has(String(s.parentId||AccountingStore.accounts.find(a=>a.code===s.parentCode)?.id||s.parentCode)))},
 accountName:id=>accountLabelOnly(id),
 rules:id=>{const u=user(id);return u?workspaceRules(u):null},
 journals:()=>allowed('journal')||allowed('transactions-all')?JournalModule.entries||[]:[],
 reports:id=>{if(id&&(!allowed('sub-users-workspace')||!user(id)))return [];return (reviewStaffJournals||[]).filter(j=>id?j.owner_id===id:allowed('user-entry-review'))},
 funds:id=>user(id)?window.funds113?.cache.get(id):undefined,
 openUser:selectUser,
 navigate:(target)=>{if(!allowed(target))return false;if(target.startsWith('sec-'))scrollToAccountModule(target);else switchTab(target);return true},
 saveStaff:async(id,data)=>run('sub-users-workspace','edit',async()=>{window.phoneResetStaff132?.();selectUser(id,'post');put('v49Date',data.date);put('v49Direction',data.direction);v49DirectionChanged(id);put('v49Fund',data.fund);v49FundChanged();put('v49Account',data.direction==='in'?data.fund:data.account);put('v49Amount',data.amount);put('v49Description',[data.memo,data.reference].filter(Boolean).join(' — '));v49ValidatePost();return v49SavePost(id)}),
 editStaff:(id,line)=>run('sub-users-workspace','edit',()=>{selectUser(id,'entries');v49EditEntry(id,line);const val=n=>$(n)?.value;return {date:val('v49Date'),direction:val('v49Direction'),fund:val('v49Fund'),account:val('v49Account'),amount:val('v49Amount'),memo:val('v49Description')}}),
 saveEditedStaff:async(id,data)=>run('sub-users-workspace','edit',async()=>{put('v49Date',data.date);put('v49Direction',data.direction);v49DirectionChanged(id);put('v49Fund',data.fund);v49FundChanged();put('v49Account',data.direction==='in'?data.fund:data.account);put('v49Amount',data.amount);put('v49Description',[data.memo,data.reference].filter(Boolean).join(' — '));v49ValidatePost();return v49SavePost(id)}),
 deleteStaff:(id,line)=>run('sub-users-workspace','void',()=>{if(!allowed('sub-users-workspace','edit')||!user(id))return false;return voidWorkspaceSingleRow(id,line)}),
 submit:id=>run('sub-users-workspace','edit',()=>{selectUser(id,'entries');return submitWorkspaceForReview(id)}),
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
 refresh:async()=>{if(!profile())return;await Promise.all([loadJournalFromSupabase(),loadStaffJournalsForReview()]);window.funds113?.refresh();await window.TeamHome14227?.reload();notify()}
};
function notify(){const frame=$('connectedPhone132');try{frame?.contentWindow?.phoneRefresh132?.()}catch{}}
function ready(){if(!phone())return;const f=document.createElement('iframe');f.id='connectedPhone132';f.title='Oon Jai phone workspace';f.src='phone.html?v=142.35';document.body.append(f);let timer;new MutationObserver(records=>{if(records.every(r=>r.target.closest?.('#connectedPhone132')))return;clearTimeout(timer);timer=setTimeout(notify,180)}).observe(document.querySelector('.app-layout'),{childList:true,subtree:true});window.addEventListener('page113',notify);setInterval(()=>{notify()},3000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
