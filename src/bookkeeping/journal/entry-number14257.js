/* Number a journal from the signed-in device, then reconcile its durable request. */
(()=>{
'use strict';
let flight=null,historyOwner='',historyDb=null,deviceHistory=null;
const date=()=>document.getElementById('jeTransDate')?.value||appLocalDate();
const owner=()=>typeof liveProfile==='undefined'?'':liveProfile?.id||'';
const permitted=()=>window.access113?.can('journal','view')===true;
const offline=()=>window.offlineAudit143174?.offline()||navigator.onLine===false;
function policy(){
 const prefix=String(ApplicationSettings.accounting?.journalPrefix||'JRN').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8)||'JRN';
 const digits=Math.max(3,Math.min(9,Number(ApplicationSettings.accounting?.journalDigits)||4));
 const day=date();
 return {prefix,digits,day,key:[owner(),day,prefix,digits].join('|')};
}
function hasJournal(){return !!historyOwner&&historyOwner===owner()&&historyDb===ojmDb;}
function history(){
 if(!permitted()||window.workspaceRequest138?.target)return [];
 if(hasJournal())return JournalModule.entries;
 return deviceHistory?.actor===owner()&&deviceHistory.db===ojmDb?deviceHistory.rows:[];
}
async function prepareLocalHistory(){
 if(hasJournal()||!owner()||!permitted()||window.workspaceRequest138?.target)return;
 const actor=owner(),db=ojmDb,rows=await window.offline14239.localJournalHistory();
 if(actor===owner()&&db===ojmDb&&!hasJournal())deviceHistory={actor,db,rows};
}
function review(){
 const p=policy();
 if(!permitted()||!owner()||window.workspaceRequest138?.target||window.personalJournal1437?.active)return null;
 const reviews=window.offlineAudit143174?.snapshot?.(p.day,p.prefix,p.digits)?.reviews||[];
 return reviews.find(r=>history().some(l=>l.dbEntryId===r.id&&l.id===r.from))||null;
}
function paint(){
 document.getElementById('availableJournalIds143121')?.remove();
 document.getElementById('journalIdAction335')?.remove();
 const n=document.getElementById('jeNextIdDisplay');
 if(!n||typeof JournalModule==='undefined'||window.personalJournal1437?.active)return;
 const p=policy(),r=review(),editing=JournalModule.editingEntryId;
 if(editing){
  const number=JournalModule.entries.find(line=>line.id===editing)?.entryNumber||editing;
  n.textContent=r?.from===editing?'Journal ID '+r.to+' · '+r.voucher:'Editing: '+number;
  return;
 }
 const local=permitted()&&owner()?window.offlineAudit143174?.provisional(p.day,p.prefix,p.digits):null;
 const number=local;
 n.textContent=number?formatEntryId143114(p.prefix,number,p.day,p.digits):'Ready for device posting';
 n.title='Next number from this device’s journal. Sync will flag a number already taken by another device.';
 if(window.workspaceRequest138?.target||!permitted())return;
 const job=window.journalDurable14385?.pending()?.find(j=>j.numberConflict335&&!j.receipt);
 if(!job&&!r)return;
 const button=document.createElement('button');button.type='button';button.id='journalIdAction335';
 button.textContent=job?'Review ID conflict':'Review '+r.to+' · '+r.voucher;
 button.addEventListener('click',async()=>{
  try{
   if(job){
    if(await ui108.confirm('Journal ID conflict',(job.entries[0]?.memo||'')+' · '+job.message+' Use the available number on sync?'))
     await window.journalDurable14385.acceptNextNumber(job.id);
    return;
   }
   const fresh=review();
   if(!fresh||fresh.id!==r.id)return;
   const occupied=document.getElementById('jeGeneralMemo')?.value.trim()||document.getElementById('journalDocumentRef')?.value||
    [...document.querySelectorAll('#jeLinesBody input')].some(i=>i.type!=='date'&&i.type!=='hidden'&&i.value.trim()&&i.value.trim()!=='0');
   if(occupied&&!await ui108.confirm('Open existing entry','Replace the current editor contents with '+r.from+' for review?'))return;
   window.vouchers14299?.setDocument();
   await window.loadEntryForEdit(r.from);
  }catch(e){showAppNotification('Journal review',e.message,true);}
 });
 n.after(button);
}
async function refresh(download=false){
 if(!permitted()||!owner()){paint();return;}
 const p=policy(),db=ojmDb;
 const current=()=>permitted()&&owner()===p.key.split('|')[0]&&db===ojmDb;
 await window.offlineAudit143174?.initialize();if(!current())return;
 paint();
 if(!download||!db||offline()||window.workspaceRequest138?.target)return;
 if(flight?.key===p.key&&flight.db===db)return flight.promise;
 const promise=(async()=>{
  const result=await db.rpc('journal_number_records335',{p_date:p.day,p_prefix:p.prefix,p_digits:p.digits});
  if(!current()||result.error||!Array.isArray(result.data?.retained))return;
  await window.offlineAudit143174?.rememberIds(p.day,p.prefix,p.digits,result.data);
 })().catch(()=>{}).finally(()=>{if(flight?.promise===promise)flight=null;});
 flight={key:p.key,db,promise};return promise;
}
function ready(){
 document.addEventListener('change',e=>{if(e.target.id==='jeTransDate')void refresh();});
 window.updateNextEntryIdDisplay=paint;
 const load=window.loadJournalFromSupabase;
 window.loadJournalFromSupabase=async function(...args){const actor=owner(),db=ojmDb;const r=await load.apply(this,args);if(actor&&actor===owner()&&db===ojmDb&&!window.workspaceRequest138?.target){historyOwner=actor;historyDb=db;deviceHistory=null;void refresh(true);}paint();return r;};
 window.addEventListener('page113',()=>{if(document.getElementById('journal')?.classList.contains('active'))void refresh();});
 window.addEventListener('online',()=>void refresh());window.addEventListener('offline',paint);
 window.addEventListener('focus',()=>{if(document.getElementById('journal')?.classList.contains('active'))paint();});
 paint();
}
window.addEventListener('local-work14333',paint);window.entryNumber14257={refresh,paint,history,prepareLocalHistory,correctionReason(id){const r=review();return r?.from===id?'Correct journal ID to '+r.to:'';}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
