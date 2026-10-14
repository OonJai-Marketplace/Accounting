/* Prepare the bounded journal views after login and reuse them until their data changes. */
(()=>{'use strict';
const active=id=>document.getElementById(id)?.classList.contains('active');
function ready(){
 let loading=0,refreshPending=false,preparing=false,revision=0;const refresh=window.refreshAllTables,load=window.loadJournalFromSupabase;
 window.refreshAllTables=function(...args){if(loading){refreshPending=true;return;}revision++;return refresh.apply(this,args)};
 window.loadJournalFromSupabase=async function(...args){loading++;try{return await load.apply(this,args)}finally{loading--;if(!loading&&refreshPending&&(!args[0]?.automatic||!window.idleSync14341||idleSync14341.allowed())){refreshPending=false;window.refreshAllTables()}}};

 window.addEventListener('idle-sync14341',()=>{if(!loading&&refreshPending){refreshPending=false;window.refreshAllTables()}});
 for(const [name,views] of Object.entries({renderJournalHistoryTable:['journal'],renderNewTransactionsTable:['journal'],renderReopened67:['journal'],renderAllTransactionsTable:['transactions-all'],renderAccounts69:['accounts-modular-container','trial-balance','account-balances']})){
  const render=window[name];if(typeof render!=='function')continue;
  window[name]=function(...args){if(!preparing&&!views.some(active))return;return render.apply(this,args)};
 }

 const journal=window.renderJournalHistoryTable;let lastQuery='',lastRecords,lastRevision=-1;
 window.renderJournalHistoryTable=function(records=JournalModule.entries){
  if(!preparing&&!active('journal'))return;
  const query=document.getElementById('jeSearchInput')?.value||'';
  if(lastRevision===revision&&records===lastRecords&&query===lastQuery)return;
  lastRecords=records;lastQuery=query;lastRevision=revision;
  let rows=records.filter(r=>!journalIsHistory14342(r)&&!isReopened67(String(r.date).slice(0,7)));const term=query.trim().toLowerCase();if(term){const matches=new Set(rows.filter(r=>[r.id,r.account,r.memo,r.generalMemo].some(v=>String(v||'').toLowerCase().includes(term))).map(r=>String(r.id)));rows=rows.filter(r=>matches.has(String(r.id)));}
  journal.call(this,rows);
 };
 const archive=window.renderAllTransactionsTable;let archiveRevision=-1,archiveMonth='',archiveRecords;
 window.renderAllTransactionsTable=function(...args){
  if(!preparing&&!active('transactions-all'))return;
  const rows=JournalModule.entries,month=window.historyMonth14341?.choose('journal',rows.filter(journalIsHistory14342).map(r=>String(r.date).slice(0,7)))||'';
  if(archiveRevision===revision&&archiveRecords===rows&&archiveMonth===month)return;
  archiveRevision=revision;archiveRecords=rows;archiveMonth=month;return archive.apply(this,args);
 };
 window.filterJournalHistory=()=>window.renderJournalHistoryTable();
 window.preparedViews14340={build(){preparing=true;try{window.renderJournalHistoryTable?.();window.renderAllTransactionsTable?.();window.renderNewTransactionsTable?.();window.renderVoidedTransactionsTable?.();window.renderAccounts69?.()}finally{preparing=false}},invalidate(){revision++}};
 window.addEventListener('page113',()=>{if(active('accounts-modular-container')||active('trial-balance')||active('account-balances'))window.renderAccounts69?.()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
