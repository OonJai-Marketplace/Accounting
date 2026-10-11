/* Device sync findings in the shared bell and Bookkeeping data check. */
(()=>{'use strict';
const $=id=>document.getElementById(id),esc=v=>escapeHtml(String(v??''));
const month=v=>String(v||'').slice(0,7);
const closed=m=>{try{return ['closed','locked'].includes(PeriodReview.status(m))}catch{return false}};
const state=()=>window.offline14239?.state?.();
function findings(selected=''){
 const s=state();if(!s)return [];
 const jobs=s.jobs.filter(j=>j.status!=='synced').map(j=>{
  const dates=(j.payload?.p_items||[]).map(x=>x.date).filter(Boolean),months=[...new Set(dates.map(month))];
  const late=months.some(closed),amounts=(j.payload?.p_items||[]).map(x=>Number(x.amount||x.debit||x.credit||0));
  return {id:j.payload.p_key,kind:'staff',periods:months,late,critical:late||j.status==='attention',title:late?'Entry from a closed month needs review':j.status==='attention'?'Entry needs sync review':'Entry awaiting sync',detail:j.message||'Saved on this device; database confirmation is pending.',date:dates.join(', '),amount:amounts.join(', '),owner:j.payload.p_owner,status:j.status,job:j};
 });
 const main=[...(window.pendingPosts99?.values()||[])].filter(j=>j.payload).map(j=>{const rows=j.payload.p_entries||[j.payload],periods=[...new Set(rows.map(r=>month(r.p_transaction_date)))];return {id:j.id,kind:'journal',periods,late:periods.some(closed),critical:periods.some(closed)||['failed','uncertain'].includes(j.status),title:j.snapshot?.memo||'Journal entry',detail:j.message||'Saved on this device; database confirmation is pending.',status:j.status,job:j}});
 const legacy=s.legacy.filter(j=>!main.some(m=>m.id===j.id)).map(j=>({id:j.id,kind:'other',periods:[month(j.title?.match(/\d{4}-\d{2}/)?.[0])].filter(Boolean),late:closed(month(j.title?.match(/\d{4}-\d{2}/)?.[0])),critical:true,title:j.title,detail:j.message,status:'attention',legacy:j}));
 const errors=s.storageError?[{id:'device-storage',kind:'storage',periods:[],critical:true,title:'Device storage needs attention',detail:s.storageError,status:'attention'}]:[];
 return [...jobs,...main,...legacy,...errors,...(window.localFirst14333?.findings?.()||[])].filter(f=>!selected||f.periods.includes(selected)||!f.periods.length||f.kind==='storage');
}
function notices(){return findings().filter(f=>f.critical).map(f=>({type:f.late?'Closed month · sync problem':'Sync needs attention',title:f.title,detail:(f.periods.join(', ')||'Device')+' · '+f.detail,target:'transactions-closing14325',critical:true}));}
function pendingFor(monthKey){return findings().filter(f=>!['storage','setup'].includes(f.kind)&&(!f.periods.length||f.periods.some(m=>m<=monthKey)));}
function duplicateCandidates(selected){const rows=typeof JournalModule==='undefined'?[]:JournalModule.entries||[],entries=new Map(),same=new Map();for(const row of rows){if(!String(row.date||'').startsWith(selected)||!row.id)continue;let group=entries.get(row.id);if(!group){group=[];entries.set(row.id,group)}group.push(row)}for(const [id,group] of entries){const signature=JSON.stringify([group[0].date,String(group[0].generalMemo||'').trim().toLowerCase(),group.map(r=>[r.accountId||r.account,r.currency,Number(r.debit||0),Number(r.credit||0)]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]);let list=same.get(signature);if(!list){list=[];same.set(signature,list)}list.push(id)}return [...same.values()].filter(ids=>ids.length>1)}
function beforeClose(monthKey){const pending=pendingFor(monthKey);if(pending.length)throw Error(pending.length+' device entry or save(s) dated through '+monthKey+' still need database confirmation. Open Bookkeeping → Data Check and resolve them before closing.');if(state()?.storageError)throw Error('Device storage has an error. Open Connection & sync and resolve it before closing.');}
function download(item){const body=item.job?(item.job.payload||item.job):{id:item.id,title:item.title,detail:item.detail},blob=new Blob([JSON.stringify({status:item.status,periods:item.periods,entry:body},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='sync-review-'+item.id.replace(/[^a-z0-9-]/gi,'_').slice(0,50)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)}
function render(){const host=$('maintenanceSync14332');if(!host)return;const selected=$('maintenanceMonth14324')?.value||'',items=findings(selected),all=findings(),late=all.filter(f=>f.late).length,duplicates=duplicateCandidates(selected);
 host.innerHTML='<h3>Device sync assessment</h3><p>'+esc(items.length?items.length+' item(s) need attention for this month or device. '+(late?late+' closed-period item(s) require review.':''):'No known device sync findings for this month. Other offline devices cannot be checked until they reconnect.')+'</p>'+
 items.map((f,i)=>'<article class="sync-finding14332 '+(f.late?'late14332':f.critical?'error14332':'pending14332')+'"><strong>'+esc(f.title)+'</strong><span>'+esc(f.periods.join(', ')||'Device')+' · '+esc(f.status)+'</span><p>'+esc(f.detail)+'</p><small>Reference: '+esc(f.id)+(f.date?' · Dates: '+esc(f.date):'')+(f.amount?' · Amounts: '+esc(f.amount):'')+'</small><div><button type="button" data-copy14332="'+i+'">Download entry details</button><button type="button" data-open14332="'+i+'">Connection & sync</button></div></article>').join('')+
 (duplicates.length?'<h4>Possible duplicate journal entries</h4><p>Same date, description, accounts and amounts. Review each pair in Transaction History; equal entries can be legitimate.</p>'+duplicates.map(ids=>'<p class="sync-duplicate14332">Entry IDs: '+ids.map(esc).join(' · ')+'</p>').join(''):'');
 host.querySelectorAll('[data-copy14332]').forEach(b=>b.onclick=()=>download(items[Number(b.dataset.copy14332)]));
 host.querySelectorAll('[data-open14332]').forEach(b=>b.onclick=()=>window.offline14239?.open());
}
function install(){const results=$('maintenanceChecks14324');if(results&&!$('maintenanceSync14332')){const box=document.createElement('section');box.id='maintenanceSync14332';box.className='maintenance-result14324 sync-assessment14332';results.before(box);$('maintenanceMonth14324')?.addEventListener('change',render);render()}
 window.addEventListener('local-work14333',render);window.addEventListener('connection14239',render);window.addEventListener('save-state14234',render);window.addEventListener('page113',render);
}
window.syncAssessment14332={findings,notices,beforeClose,duplicateCandidates,render};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
