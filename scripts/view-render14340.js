/* Retain the full data model; build journal/report DOM only in the visible workspace. */
(()=>{'use strict';
const active=id=>document.getElementById(id)?.classList.contains('active');
function ready(){
 let loading=0,refreshPending=false;const refresh=window.refreshAllTables,load=window.loadJournalFromSupabase;
 window.refreshAllTables=function(...args){if(loading){refreshPending=true;return;}return refresh.apply(this,args)};
 window.loadJournalFromSupabase=async function(...args){loading++;try{return await load.apply(this,args)}finally{loading--;if(!loading&&refreshPending&&(!args[0]?.automatic||!window.idleSync14341||idleSync14341.allowed())){refreshPending=false;window.refreshAllTables()}}};

 window.addEventListener('idle-sync14341',()=>{if(!loading&&refreshPending){refreshPending=false;window.refreshAllTables()}});
 for(const [name,views] of Object.entries({renderJournalHistoryTable:['journal'],renderNewTransactionsTable:['journal'],renderReopened67:['journal'],renderAllTransactionsTable:['transactions-all'],renderAccounts69:['accounts-modular-container','trial-balance','account-balances']})){
  const render=window[name];if(typeof render!=='function')continue;
  window[name]=function(...args){if(!views.some(active))return;return render.apply(this,args)};
 }

 const journal=window.renderJournalHistoryTable;let page=0,lastQuery='',lastRecords;
 window.renderJournalHistoryTable=function(records=JournalModule.entries){
  if(!active('journal'))return;lastRecords=records;
  const query=document.getElementById('jeSearchInput')?.value||'';if(query!==lastQuery){page=0;lastQuery=query;}
  let rows=records.filter(r=>!journalIsHistory14342(r)&&!isReopened67(String(r.date).slice(0,7)));const groups=new Map(),term=query.trim().toLowerCase();if(term){const matches=new Set(rows.filter(r=>[r.id,r.account,r.memo,r.generalMemo].some(v=>String(v||'').toLowerCase().includes(term))).map(r=>String(r.id)));rows=rows.filter(r=>matches.has(String(r.id)));}
  rows.forEach(r=>{if(!groups.has(String(r.id)))groups.set(String(r.id),r)});
  const ids=[...groups.keys()].sort((a,b)=>String(groups.get(b).date).localeCompare(String(groups.get(a).date))||b.localeCompare(a)),pages=Math.max(1,Math.ceil(ids.length/50));page=Math.min(page,pages-1);
  const visible=new Set(ids.slice(page*50,(page+1)*50));journal.call(this,rows.filter(r=>visible.has(String(r.id))));
  const table=document.getElementById('tblJournalHistory');let bar=document.getElementById('journalPages14340');
  if(!bar){bar=document.createElement('div');bar.id='journalPages14340';bar.className='module-actions71 no-print';table.closest('.table-container').before(bar);}
  bar.hidden=pages===1;bar.replaceChildren();if(pages===1)return;
  const previous=document.createElement('button'),next=document.createElement('button'),label=document.createElement('span');
  previous.type=next.type='button';previous.className=next.className='je-btn je-btn-secondary';previous.textContent='Previous';next.textContent='Next';previous.disabled=page===0;next.disabled=page===pages-1;
  label.textContent='Entries '+(page*50+1)+'–'+Math.min((page+1)*50,ids.length)+' of '+ids.length;
  previous.onclick=()=>{page--;window.renderJournalHistoryTable(lastRecords)};next.onclick=()=>{page++;window.renderJournalHistoryTable(lastRecords)};bar.append(previous,label,next);
 };
 window.filterJournalHistory=()=>window.renderJournalHistoryTable();
 window.addEventListener('page113',()=>{if(active('accounts-modular-container')||active('trial-balance')||active('account-balances'))window.renderAccounts69?.()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
