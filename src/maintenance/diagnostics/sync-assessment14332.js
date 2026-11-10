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
  return {id:j.payload.p_key,kind:'staff',periods:months,late,critical:late||j.status==='attention',title:late?'Entry from a closed month needs review':j.status==='attention'?'Entry needs sync review':'Entry awaiting sync',detail:j.message||'Saved on this device; database confirmation is pending.',date:dates.map(d=>formatAppDate(d)).join(', '),amount:amounts.map(n=>formatAppNumber(n)).join(', '),owner:j.payload.p_owner,status:j.status,job:j};
 });
 const main=[...(window.pendingPosts99?.values()||[])].filter(j=>j.payload).map(j=>{const rows=j.payload.p_entries||[j.payload],periods=[...new Set(rows.map(r=>month(r.p_transaction_date)))];return {id:j.id,kind:'journal',periods,late:periods.some(closed),critical:periods.some(closed)||['failed','uncertain'].includes(j.status),title:j.snapshot?.memo||'Journal entry',detail:j.receipt?'Server confirmed. Waiting for the verified journal refresh and applicable recovery cleanup.':j.message||'Saved on this device; database confirmation is pending.',status:j.receipt?'Synced — Cleanup Pending':j.status,job:j}});
 const batch=window.journalBatch1440?.getJob();if(batch&&!batch.completed&&!main.some(j=>j.id===batch.id)){const confirmed=batch.dates.every(d=>d.status==='saved');main.push({id:batch.id,kind:'journal',periods:[...new Set(batch.dates.map(d=>month(d.date)))],critical:!confirmed,title:'Journal batch',detail:confirmed?'Server confirmed. Waiting for the verified journal refresh.':batch.dates.map(d=>d.date+': '+d.status).join(' · '),status:confirmed?'Synced — Cleanup Pending':batch.dates.some(d=>d.status==='sending')?'uploading':'pending',job:batch});}
 const legacy=s.legacy.filter(j=>!main.some(m=>m.id===j.id)&&!jobs.some(q=>q.id===j.id)).map(j=>({id:j.id,kind:'other',periods:[month(j.title?.match(/\d{4}-\d{2}/)?.[0])].filter(Boolean),late:closed(month(j.title?.match(/\d{4}-\d{2}/)?.[0])),critical:true,title:j.title,detail:j.message,status:'attention',legacy:j}));
 const errors=(s.storageIssues|| (s.storageError?[{id:'device-storage',title:'Device storage needs attention',detail:s.storageError}]:[])).map(f=>({...f,kind:'storage',periods:[],critical:true,status:'attention'}));
 const requests=new Map((window.syncRecords284?.pending()||[]).map(r=>[r.id,r]));
 const refresh=window.idleSync14341?.refreshFindings?.()||[];
 const raw=[...refresh,...jobs,...main,...legacy,...errors,...(window.journalDurable14385?.findings()||[]),...(window.offlineAudit143174?.findings()||[]),...(window.localFirst14333?.findings?.()||[]),...(window.syncRecovery14351?.findings()||[])].filter(f=>!(refresh.length&&f.id==='year-loading14333'&&f.detail?.startsWith('Refreshing saved records is waiting: ')));
 for(const request of requests.values()){
  if(request.status!=='server-confirmed'&&!raw.some(item=>item.id===request.id))
   raw.push({id:request.id,periods:[],kind:request.kind,status:request.status,critical:!request.retry});
 }
 return [...new Map(raw.map(f=>[f.id,f])).values()].map(f=>{
  const request=requests.get(f.id);
  if(!request)return f;
  const confirmed=request.status==='server-confirmed';
  return {...f,kind:confirmed?'cleanup':f.kind,critical:confirmed?false:f.critical,status:request.state,title:request.source+' · '+window.syncRecords284.summarize(request.items),detail:request.message||request.action,repair:request.retry?'request':request.recheck?'recheck':null};
 }).map(f=>({...f,created:f.created||f.job?.created||f.job?.syncedAt||null,source:f.job?.kind||f.kind})).filter(f=>!selected||f.periods.includes(selected)||!f.periods.length||f.kind==='storage');
}
function notices(){const items=findings();if(!items.length)return [];const overview=window.idleSync14341?.overview(),count=overview?.pending??items.length,issues=new Set(items.filter(f=>f.critical).map(f=>f.id)).size;const fingerprint=JSON.stringify(items.map(f=>[f.id,f.status]).sort()).split('').reduce((hash,c)=>Math.imul(hash^c.charCodeAt(0),16777619)>>>0,2166136261).toString(36);return [{noticeId:'sync-'+fingerprint,type:'Synchronization',title:count?count+' records waiting to sync':issues?'Sync needs attention':'Saved copies need checking',detail:[issues?issues+' need review':'',overview?.pendingBytes?idleSync14341.bytes(overview.pendingBytes)+' queued':'','Open Data Check to sync by group'].filter(Boolean).join(' · '),target:window.access113?.can('transactions-closing14325')?'transactions-closing14325':'sync-status',syncId:'overview',critical:issues>0,persistent:count>0||issues>0}];}
function pendingFor(monthKey){return findings().filter(f=>!['storage','setup','cleanup','recovery','refresh'].includes(f.kind)&&(!f.periods.length||f.periods.some(m=>m<=monthKey)));}
function duplicateCandidates(selected){const rows=typeof JournalModule==='undefined'?[]:JournalModule.entries||[],entries=new Map(),same=new Map();for(const row of rows){if(!String(row.date||'').startsWith(selected)||!row.id)continue;let group=entries.get(row.id);if(!group){group=[];entries.set(row.id,group)}group.push(row)}for(const [id,group] of entries){const signature=JSON.stringify([group[0].date,String(group[0].generalMemo||'').trim().toLowerCase(),group.map(r=>[r.accountId||r.account,r.currency,Number(r.debit||0),Number(r.credit||0)]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]);let list=same.get(signature);if(!list){list=[];same.set(signature,list)}list.push(id)}return [...same.values()].filter(ids=>ids.length>1)}
function beforeClose(monthKey){const pending=pendingFor(monthKey);if(pending.length)throw Error(pending.length+' device entry or save(s) dated through '+monthKey+' still need database confirmation. Open Bookkeeping → Data Check and resolve them before closing.');if(state()?.storageError)throw Error('Device storage has an error. Open Connection & sync and resolve it before closing.');}
function download(item){const body=item.job?(item.job.entries?item.job:item.job.payload||item.job):{id:item.id,title:item.title,detail:item.detail},blob=new Blob([JSON.stringify({status:item.status,periods:item.periods,entry:body},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='sync-review-'+String(item.id).replace(/[^a-z0-9-]/gi,'_').slice(0,50)+'.json';Promise.resolve(window.exportCenter14337?exportCenter14337.fromLink(a):a.click()).finally(()=>setTimeout(()=>URL.revokeObjectURL(url),60000)).catch(()=>{})}
function action(f){
 if(f.repair==='recheck')return ['Recheck this save',()=>window.syncRecords284.retry(f.id,{reviewed:true})];
 if(f.repair==='request')return ['Sync this save',()=>window.syncRecords284.retry(f.id)];
 if(f.repair==='storage-copy')return ['Retry this offline copy',()=>window.offline14239.retryStorageCopy(f.id)];
 if(f.kind==='refresh')return ['Refresh this area',()=>window.idleSync14341.retryArea(f.area)];
 if(f.id==='local-storage14333')return ['Check saved work',()=>window.localFirst14333.checkStorage()];
 if(f.id==='journal-storage14385')return ['Check journal storage',()=>window.journalDurable14385.initialize()];
 if(f.kind==='recovery'&&!f.manualCleanup)return ['Check this backup',()=>window.syncRecovery14351.cleanup({targetId:f.backupId})];
 return null;
}
const activeRepairs=new Map();
async function repair(id){
 const user=liveProfile.id,client=ojmDb,key=user+':'+id;
 if(activeRepairs.has(key))return activeRepairs.get(key);
 const f=findings().find(f=>f.id===id),task=f&&action(f);
 if(!task)return;
 const promise=Promise.resolve().then(async()=>{
  if(liveProfile?.id!==user||client!==ojmDb)throw Error('Account changed. Reopen Data Check.');
  await task[1]();
  if(liveProfile?.id!==user||client!==ojmDb)return;
  const remaining=findings().find(row=>row.id===id&&action(row));
  if(remaining)throw Error(remaining.detail||'This item still needs review.');
  window.idleSync14341?.afterRepair?.();
 }).finally(()=>{activeRepairs.delete(key);render();window.offline14239?.refreshDialog();});
 activeRepairs.set(key,promise);return promise;
}
let syncingGroup=false;
function groupButtons(controls){
 const sources=new Map();
 for(const row of window.syncRecords284?.pending()||[]){
  if(!row.retry)continue;
  if(!sources.has(row.source))sources.set(row.source,[]);
  sources.get(row.source).push(row.id);
 }
 const host=controls.querySelector('[data-sync-groups]'),who=liveProfile?.id;
 const key=JSON.stringify([who,[...sources],syncingGroup,navigator.onLine]);
 if(host.dataset.groups===key)return;
 host.dataset.groups=key;host.replaceChildren();
 for(const [source,ids] of sources){
  const button=document.createElement('button');button.type='button';button.textContent='Sync '+source+' ('+ids.length+')';
  button.disabled=syncingGroup||navigator.onLine===false;
  button.onclick=async()=>{
   if(syncingGroup||liveProfile?.id!==who)return;
   syncingGroup=true;const status=controls.querySelector('p');status.textContent='Syncing '+source+'…';render();
   try{await window.syncRecords284.retryGroup(ids,source);if(liveProfile?.id===who)status.textContent=source+' confirmed.';}
   catch(e){if(liveProfile?.id===who)status.textContent=e.message;}
   finally{syncingGroup=false;render();window.refreshNotices1443?.();}
  };
  button.title='Sync waiting '+source+' requests across all months';
  host.append(button);
 }
}
function render(){const host=$('maintenanceSync14332');if(!host||!host.closest('.tab-content.active'))return;const selected=$('maintenanceMonth14324')?.value||'',all=findings(),items=all.filter(f=>!selected||f.periods.includes(selected)||!f.periods.length||f.kind==='storage'),late=all.filter(f=>f.late).length,duplicates=duplicateCandidates(selected);
 let controls=host.querySelector('[data-sync-tools14351]');if(!controls){controls=document.createElement('div');controls.dataset.syncTools14351='';controls.className='maintenance-actions14324';controls.innerHTML='<span data-sync-groups></span><button type="button" data-backup>Download Recovery Backup</button><button type="button" data-restore>Restore Recovery Backup</button><button type="button" data-cleanup>Clean Up Synchronized Backups</button><button type="button" data-result>Latest Sync Result</button><p role="status"></p>';host.prepend(controls);controls.querySelector('[data-backup]').onclick=()=>syncRecovery14351.open('export');controls.querySelector('[data-restore]').onclick=()=>syncRecovery14351.open('import');controls.querySelector('[data-cleanup]').onclick=async()=>{try{const r=await syncRecovery14351.cleanup();controls.querySelector('p').textContent=r.message;render()}catch(e){controls.querySelector('p').textContent=e.message}};controls.querySelector('[data-result]').onclick=()=>idleSync14341.show(true);}groupButtons(controls);controls.querySelector('[data-result]').hidden=false;const resultButton=controls.querySelector('[data-result]');if(resultButton.textContent!=='Sync summary')resultButton.textContent='Sync summary';
 let content=host.querySelector('[data-sync-content14335]');if(!content){content=document.createElement('div');content.dataset.syncContent14335='';host.append(content);}
 const markup='<p>'+esc(items.length?items.length+' findings for this month or device (includes diagnostics and recovery, not just transactions). '+(late?late+' closed-period item(s) require review.':''):'No known device sync findings for this month. Other offline devices cannot be checked until they reconnect.')+'</p>'+
 items.map((f,i)=>'<article data-sync-finding14351="'+esc(f.id)+'" class="sync-finding14332 '+(f.late?'late14332':f.critical?'error14332':'pending14332')+'"><strong>'+esc(f.title)+'</strong><span>'+esc(f.periods.join(', ')||'Device')+' · '+esc(f.status)+'</span><p>'+esc(f.detail)+'</p><small>Source: '+esc(f.source)+' · Created: '+esc(f.created?formatAppDate(f.created,true):'Not recorded by the original operation')+(f.date?' · Dates: '+esc(f.date):'')+(f.amount?' · Amounts: '+esc(f.amount):'')+'</small><div><button type="button" data-copy14332="'+i+'">Download entry details</button>'+(action(f)?'<button type="button" data-open14332="'+i+'">'+esc(action(f)[0])+'</button>':'')+' '+(f.manualCleanup?'<button type="button" data-manual-cleanup14351="'+i+'">I removed the downloaded backup</button>':'')+'</div></article>').join('')+
 ((window.idleSync14341?.history()||[]).length?'<details open><summary>Unresolved sync problems</summary>'+window.idleSync14341.history().map(s=>'<p>'+esc(formatAppDate(s.started,true))+' · '+esc(s.result||s.stage)+' · '+esc(s.remaining||0)+' remaining</p>').join('')+'</details>':'')+
 (duplicates.length?'<h4>Possible duplicate journal entries</h4><p>Same date, description, accounts and amounts. Review each pair in Transaction History; equal entries can be legitimate.</p>'+duplicates.map(ids=>'<p class="sync-duplicate14332">Entry IDs: '+ids.map(esc).join(' · ')+'</p>').join(''):'');
 if(content.dataset.render14335===markup)return;content.dataset.render14335=markup;content.innerHTML=markup;
 host.querySelectorAll('[data-manual-cleanup14351]').forEach(b=>b.onclick=async()=>{await syncRecovery14351.acknowledge(items[Number(b.dataset.manualCleanup14351)].backupId);render()});
 host.querySelectorAll('[data-copy14332]').forEach(b=>b.onclick=()=>download(items[Number(b.dataset.copy14332)]));
 host.querySelectorAll('[data-open14332]').forEach(b=>b.onclick=async()=>{
  const f=items[Number(b.dataset.open14332)],who=liveProfile.id,out=controls.querySelector('p');b.disabled=true;out.textContent=f.title+' · Retrying…';
  try{await repair(f.id);if(liveProfile?.id===who)out.textContent=f.title+' · Completed.'}
  catch(e){if(liveProfile?.id===who)out.textContent=f.title+' · '+e.message}finally{b.disabled=false}
 });
}
function install(){const results=$('maintenanceChecks14324');if(results&&!$('maintenanceSync14332')){const box=document.createElement('section');box.id='maintenanceSync14332';box.className='maintenance-result14324 sync-assessment14332';results.before(box);$('maintenanceMonth14324')?.addEventListener('change',render);render()}
 window.addEventListener('sync-assessment14332',render);window.addEventListener('local-work14333',render);window.addEventListener('connection14239',render);window.addEventListener('save-state14234',render);window.addEventListener('page113',render);
}
function focus(id,period){const input=$('maintenanceMonth14324');if(input&&period&&input.value!==period){input.value=period;input.dispatchEvent(new Event('change',{bubbles:true}));}render();const target=[...document.querySelectorAll('[data-sync-finding14351]')].find(n=>n.dataset.syncFinding14351===id);target?.scrollIntoView({block:'center'});}
window.syncAssessment14332={action,repair,focus,findings,notices,beforeClose,duplicateCandidates,render};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
