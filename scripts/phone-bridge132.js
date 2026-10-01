/* Same application, alternate phone view. All mutations use existing desktop handlers. */
(()=>{'use strict';const $=id=>document.getElementById(id);const phone=()=>document.documentElement.dataset.device132==='phone';
const allowed=(target,verb='view')=>!!window.access113?.can(target,verb);
function run(target,verb,fn){if(!allowed(target,verb)){showCenterStatus('This action is not included in your permissions.',true);return false}return fn()}
function profile(){return typeof liveProfile==='undefined'?null:liveProfile}
function users(){const me=profile();if(!me)return[];return me.role==='admin'?availableSubUsers():me.role==='manager'||livePermission?.can_approve?[me,...availableSubUsers().filter(u=>u.user_permissions?.manager_id===me.id)]:[me]}
function user(id){return users().find(u=>String(u.id)===String(id))}
function selectUser(id,view='home'){if(!user(id))throw Error('This user is not assigned to you.');switchTab('sub-users-workspace');openWorkspaceUser(id);v49SetView(id,view)}
function put(id,value){const n=$(id);if(!n)throw Error('The entry form is unavailable.');n.value=value??'';n.dispatchEvent(new Event('input',{bubbles:true}));return n}
const api=window.PhoneApp132={
 profile,users,allowed,
 settingsUsers:()=>allowed('settings-users')?liveProfiles||[]:[],
 editUser:(id='',section)=>run('settings-users','edit',()=>{switchTab('settings-users');openUserAccessEditor(id);window.compactUserSettings133?.();if(section)openAccessPicker(section==='accounts'?'Account Assignment':'Module Access',section==='accounts'?'userAccountAssignmentPanel':'userModuleAccessPanel');}),
 resetOwnPassword:async()=>{const me=profile();if(!me?.email)throw Error('Your account email is unavailable.');const {error}=await ojmDb.auth.resetPasswordForEmail(me.email,{redirectTo:passwordRecoveryRedirectUrl()});if(error)throw error;showCenterStatus('Password-reset email requested. Check your inbox.');},
 accounts:()=>AccountingStore.accounts||[],
 accountName:id=>accountLabelOnly(id),
 rules:id=>{const u=user(id);return u?workspaceRules(u):null},
 journals:()=>allowed('journal')||allowed('transactions-all')?JournalModule.entries||[]:[],
 reports:id=>{if(id&&!user(id))return[];return (reviewStaffJournals||[]).filter(j=>id?String(j.owner_id)===String(id):allowed('user-entry-review'))},
 funds:id=>user(id)?window.funds113?.cache.get(id):undefined,
 openUser:selectUser,
 navigate:(target)=>{if(!allowed(target))return false;if(target.startsWith('sec-'))scrollToAccountModule(target);else switchTab(target);return true},
 saveStaff:async(id,data)=>run('sub-users-workspace','edit',async()=>{window.phoneResetStaff132?.();selectUser(id,'post');put('v49Date',data.date);put('v49Direction',data.direction);v49DirectionChanged(id);put('v49Fund',data.fund);v49FundChanged();put('v49Account',data.direction==='in'?data.fund:data.account);put('v49Amount',data.amount);put('v49Description',[data.memo,data.reference].filter(Boolean).join(' — '));v49ValidatePost();return v49SavePost(id)}),
 editStaff:(id,line)=>run('sub-users-workspace','edit',()=>{selectUser(id,'entries');v49EditEntry(id,line);const val=n=>$(n)?.value;return {date:val('v49Date'),direction:val('v49Direction'),fund:val('v49Fund'),account:val('v49Account'),amount:val('v49Amount'),memo:val('v49Description')}}),
 saveEditedStaff:async(id,data)=>run('sub-users-workspace','edit',async()=>{put('v49Date',data.date);put('v49Direction',data.direction);v49DirectionChanged(id);put('v49Fund',data.fund);v49FundChanged();put('v49Account',data.direction==='in'?data.fund:data.account);put('v49Amount',data.amount);put('v49Description',data.memo);v49ValidatePost();return v49SavePost(id)}),
 deleteStaff:(id,line)=>run('sub-users-workspace','edit',()=>voidWorkspaceSingleRow(id,line)),
 submit:id=>run('sub-users-workspace','edit',()=>{selectUser(id,'entries');return submitWorkspaceForReview(id)}),
 staffHistory:(id,mode)=>{selectUser(id,'entries');openWorkspaceReview(id,mode)},
 adjust:(id,fund)=>run('sub-users-workspace','edit',()=>{selectUser(id,'accounts');v49OpenAdjustment(id,fund)}),
 compare:id=>run('user-entry-review','view',()=>{switchTab('user-entry-review');openSubmissionComparison(id)}),
 returnReport:id=>run('user-entry-review','approve',()=>returnReviewJournal(id)),
 approve:id=>run('user-entry-review','approve',()=>prepareReviewJournal(id)),
 dashboard:()=>({state:dashboardWarm112.state,amount:dashboardWarm112.amount}),
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
 closing:()=>({month:PeriodReview.selectedMonth,status:PeriodReview.status(PeriodReview.selectedMonth),findings:PeriodReview.findings.filter(f=>f.month===PeriodReview.selectedMonth),entries:periodEntries()}),
 closingMonth:month=>{api.navigate('period-review');selectReviewPeriod(month)},
 close:()=>run('period-review','approve',()=>finishEditing69(PeriodReview.selectedMonth)),
 lock:()=>run('period-review','approve',()=>changePeriodStatus('locked')),
 reopen:()=>run('period-review','edit',()=>changePeriodStatus('open')),
 finding:data=>run('period-review','edit',()=>{put('findingTransactionId',data.transaction);put('findingType',data.type);put('findingDescription',data.description);return savePeriodFinding({preventDefault(){}})}),
 schedule:id=>run('transactions-recurring','edit',()=>openScheduledEditor91(id||'')),
 nativeCards:(selector)=>[...document.querySelectorAll(selector)].map((n,i)=>({index:i,text:n.textContent.trim(),title:n.querySelector('summary')?.textContent.trim()||n.textContent.trim(),actions:[...n.querySelectorAll('button')].map((b,j)=>({index:j,label:b.textContent.trim()||b.title,disabled:b.disabled||b.hidden}))})),
 nativeAction:(selector,i,j)=>{const b=document.querySelectorAll(selector)[i]?.querySelectorAll('button')[j];if(b&&!b.disabled&&!b.hidden)b.click()},
 printStaff:id=>{selectUser(id,'entries');const b=$('global-print-btn');if(b&&!b.hidden&&!b.disabled)b.click()},
 logout:()=>logoutDemoUser(),
 refresh:async()=>{if(!profile())return;await Promise.all([loadJournalFromSupabase(),loadStaffJournalsForReview()]);window.funds113?.refresh();notify()}
};
function notify(){const frame=$('connectedPhone132');try{frame?.contentWindow?.phoneRefresh132?.()}catch{}}
function ready(){if(!phone())return;const f=document.createElement('iframe');f.id='connectedPhone132';f.title='Oon Jai phone workspace';f.src='phone.html';document.body.append(f);let timer;new MutationObserver(records=>{if(records.every(r=>r.target.closest?.('#connectedPhone132')))return;clearTimeout(timer);timer=setTimeout(notify,180)}).observe(document.querySelector('.app-layout'),{childList:true,subtree:true});window.addEventListener('page113',notify);setInterval(()=>{notify()},3000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
