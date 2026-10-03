/* Account workflow, saved preferences, audit actions and activity-based sessions. */
(()=>{'use strict';
const esc=v=>escapeHtml(String(v??''));
window.printPreferences1434={
 async load(){const id=liveProfile?.id;if(!id)return null;let local;try{local=JSON.parse(localStorage.getItem('ojm-print-defaults1434:'+id)||'null')}catch{}try{const r=await ojmDb.from('user_print_preferences1434').select('data').eq('owner_id',id).maybeSingle();if(liveProfile?.id!==id)return null;if(!r.error&&r.data?.data){localStorage.setItem('ojm-print-defaults1434:'+id,JSON.stringify(r.data.data));return r.data.data}}catch{}return local},
 async save(data){const id=liveProfile?.id;if(!id)throw Error('Sign in before saving defaults.');const r=await ojmDb.from('user_print_preferences1434').upsert({owner_id:id,data,updated_at:new Date().toISOString()},{onConflict:'owner_id'});if(r.error)throw Error('Defaults could not be saved: '+r.error.message+'. Install setup/INSTALL-WORKFLOWS-v142.14.sql if needed.');if(liveProfile?.id===id)localStorage.setItem('ojm-print-defaults1434:'+id,JSON.stringify(data))}
};
// Measure the actual time since interaction; activity within an editor iframe counts.
const session=SessionTimeoutManager;
// Persist interaction separately from navigation so iframe activity survives mobile suspension.
let activityWrite1443=0;
function persistActivity1443(force=false){
 if(!liveProfile||(!force&&Date.now()-activityWrite1443<1000))return;
 activityWrite1443=Date.now();
 try{const key=locationKey69(),saved=readLocation69()||{};localStorage.setItem(key,JSON.stringify({...saved,lastActivity:session.lastActivity}));}catch{}
}
function syncActivity1443(){const saved=readLocation69();const value=Number(saved?.lastActivity);if(value>session.lastActivity&&value<=Date.now())session.lastActivity=value;}
session.reset=function(){
 if(!liveProfile||Location69.hydrating)return;
 syncActivity1443();
 if(Date.now()-this.lastActivity>=this.minutes()*60000){this.check1434();return;}
 this.lastActivity=Date.now();this.hideWarning();persistActivity1443();if(Date.now()-this.lastArmed>1000)this.arm();
};
session.arm=function(){
 clearTimeout(this.logoutTimer);clearTimeout(this.warningTimer);if(!liveProfile||Location69.hydrating)return;
 syncActivity1443();this.lastArmed=Date.now();
 const remaining=Math.max(0,this.minutes()*60000-(Date.now()-this.lastActivity)),warning=Math.min(this.minutes()-1,Math.max(1,Number(ApplicationSettings.system?.sessionWarning)||1))*60000;
 this.logoutTimer=setTimeout(()=>this.check1434(),remaining);
 if(remaining>warning)this.warningTimer=setTimeout(()=>this.warn(Math.ceil(warning/60000)),remaining-warning);
 else if(remaining>0)this.warn(Math.max(1,Math.ceil(remaining/60000)));
};
session.check1434=async function(){
 if(!liveProfile||Location69.hydrating)return;syncActivity1443();
 if(Date.now()-this.lastActivity>=this.minutes()*60000){
  if(this.policyCheck1443)return this.policyCheck1443;const actor=liveProfile.id;
  this.policyCheck1443=(async()=>{try{await window.loadSessionPolicy1443?.(actor)}catch{}if(liveProfile?.id!==actor)return;syncActivity1443();if(Date.now()-this.lastActivity>=this.minutes()*60000)return this.logout();this.arm()})();
  try{return await this.policyCheck1443}finally{this.policyCheck1443=null}
 }this.arm();
};
window.startSessionTimeoutManager=()=>{session.hideWarning();session.arm()};
const logout=session.logout.bind(session);session.logout=async function(){
 if(Location69.hydrating)return;syncActivity1443();
 if(Date.now()-this.lastActivity<this.minutes()*60000){this.arm();return}
 if(this.expiring1443)return;this.expiring1443=true;
 try{try{await window.documentWorkspace105?.flush()}catch{}return await logout()}finally{this.expiring1443=false}
};
window.addEventListener('pagehide',()=>persistActivity1443(true));
document.addEventListener('visibilitychange',()=>{if(document.hidden)persistActivity1443(true);else session.check1434()});
window.addEventListener('storage',event=>{if(event.key===locationKey69()||event.key===APP_SETTINGS_KEY){if(event.key===APP_SETTINGS_KEY)ApplicationSettings=loadApplicationSettings();session.check1434()}});
const boundDocs=new WeakSet();function bindActivity(doc){if(!doc||boundDocs.has(doc))return;boundDocs.add(doc);for(const type of ['pointerdown','pointermove','keydown','input','wheel','scroll','touchstart'])doc.addEventListener(type,()=>{if(liveProfile)session.reset()},{capture:true,passive:true})}
window.bindSessionActivity1434=bindActivity;bindActivity(document);
function frames(){for(const frame of document.querySelectorAll('iframe')){try{bindActivity(frame.contentDocument)}catch{}if(!frame.dataset.activity1434){frame.dataset.activity1434='1';frame.addEventListener('load',()=>{try{bindActivity(frame.contentDocument)}catch{}})}}}
window.addEventListener('message',event=>{const recognized=[...document.querySelectorAll('iframe')].some(f=>event.source===f.contentWindow);if(recognized&&event.data?.type==='oonjai-activity1434')session.reset()});
window.deleteAuditMonth1434=async function(month){if(liveProfile?.role!=='admin')return showCenterStatus('Administrator access required.',true);try{const local=(JournalModule.voidedEntries||[]).filter(r=>String(r.timestamp||'').slice(0,7)===month),preview=await ojmDb.rpc('audit_month1434',{p_month:month+'-01'});if(preview.error)throw Error(preview.error.message+'. Install setup/INSTALL-WORKFLOWS-v142.14.sql if needed.');const snapshot=preview.data||{},count=(snapshot.audit_ids?.length||0)+(snapshot.deletion_ids?.length||0)+local.length;if(!count)return showCenterStatus('No audit logs remain for this month.');if(!await ui108.confirm('Delete audit logs',`Permanently delete ${count} audit log records for ${month}? This removes audit history only; the underlying transactions and employee records stay in place.`))return;const r=await ojmDb.rpc('audit_month1434',{p_month:month+'-01',p_confirm:true,p_audit_ids:snapshot.audit_ids||[],p_deletion_ids:snapshot.deletion_ids||[]});if(r.error)throw r.error;JournalModule.voidedEntries=(JournalModule.voidedEntries||[]).filter(x=>!local.includes(x));if(typeof PeriodReview!=='undefined'){PeriodReview.findings=(PeriodReview.findings||[]).map(f=>local.some(x=>x===f.auditRecord||x.id&&x.id===f.auditRecord?.id)?{...f,auditRecord:null}:f);PeriodReview.save?.()}await loadTransactionAudit();renderVoidedTransactionsTable();showCenterStatus('Audit logs deleted.')}catch(e){showCenterStatus('Audit logs were not deleted: '+e.message,true)}};
window.deleteAuditRecord1434=async function(item){
 if(liveProfile?.role!=='admin')return showCenterStatus('Administrator access required.',true);
 const localIndex=/^local-([0-9]+)$/.exec(String(item.id));
 const local=localIndex?JournalModule.voidedEntries[Number(localIndex[1])]:null;
 try{
  if(!item.id||localIndex&&!local)throw Error('This record is no longer available. Refresh the audit log.');
  if(!await ui108.confirm('Delete ONE audit record',`Delete only ${auditRecordId(item)} — ${String(item.action||'change')} (${formatAppDate(item.created_at,true)})? All other audit records will remain.`))return;
  if(local){
   const index=JournalModule.voidedEntries.indexOf(local);
   if(index<0)throw Error('This record has already changed. Refresh the audit log.');
   JournalModule.voidedEntries.splice(index,1);
   if(typeof PeriodReview!=='undefined'){PeriodReview.findings=(PeriodReview.findings||[]).map(f=>f.auditRecord===local||local.id&&f.auditRecord?.id===local.id?{...f,auditRecord:null}:f);PeriodReview.save?.()}
  }else{
   const source=item.auditSource1434==='record_deletions108'?'record_deletions108':'audit_log';
   const r=await ojmDb.rpc('delete_one_audit1437',{p_source:source,p_id:String(item.id)});
   if(r.error)throw Error(r.error.message+'. Install setup/INSTALL-DESKTOP-JOURNAL-v142.17.sql if needed.');
   if(Number(r.data?.deleted)!==1)throw Error('No matching record was deleted. Refresh the audit log.');
   // Remove exactly the returned identity, retaining every other loaded row.
   const index=LiveTransactionAudit.findIndex(x=>String(x.id)===String(item.id)&&(x.auditSource1434||'audit_log')===source);
   if(index>=0)LiveTransactionAudit.splice(index,1);
  }
  renderVoidedTransactionsTable();showCenterStatus('One audit record deleted. Other records were kept.');
 }catch(e){showCenterStatus('Audit record was not deleted: '+e.message,true)}
};
function auditRows1434(){if(liveProfile?.role!=='admin')return;for(const table of document.querySelectorAll('#auditMonths98 .audit-table98')){const header=table.tHead?.rows[0];if(header&&!header.querySelector('[data-audit-action1434]')){const th=document.createElement('th');th.dataset.auditAction1434='1';th.textContent='Action';header.append(th)}for(const row of table.querySelectorAll('.audit-summary-row')){if(row.querySelector('[data-delete-record1434]'))continue;let item;try{item=JSON.parse(row.dataset.auditSearch)}catch{continue}const td=document.createElement('td'),button=document.createElement('button');td.className='audit-action1434 no-print';button.type='button';button.className='je-btn je-btn-danger';button.dataset.deleteRecord1434=item.id;button.textContent='Delete';button.setAttribute('aria-label','Delete audit log for '+auditRecordId(item));button.onclick=e=>{e.preventDefault();e.stopPropagation();deleteAuditRecord1434(item)};td.append(button);row.append(td);if(row.nextElementSibling?.classList.contains('audit-detail-row'))row.nextElementSibling.firstElementChild.colSpan=header.cells.length}}}
function polish(){frames();auditRows1434();document.querySelectorAll('#auditMonths98 .audit-month98').forEach(card=>{const summary=card.querySelector(':scope>summary');if(!summary)return;summary.querySelectorAll('.audit-stat99').forEach(n=>{if(!Number(n.querySelector('b')?.textContent))n.remove()});if(liveProfile?.role==='admin'&&!summary.querySelector('[data-delete-audit1434]')&&/^\d{4}-\d{2}$/.test(card.dataset.month98||'')){const b=document.createElement('button');b.type='button';b.className='je-btn je-btn-danger no-print';b.dataset.deleteAudit1434=card.dataset.month98;b.textContent='Delete entire month';b.onclick=e=>{e.preventDefault();e.stopPropagation();deleteAuditMonth1434(b.dataset.deleteAudit1434)};summary.append(b)}});document.querySelectorAll('th').forEach(n=>{if(n.children.length)return;const text=n.textContent,next=text.replace(/\bDR\b/g,'Debit').replace(/\bCR\b/g,'Credit');if(text!==next)n.textContent=next});}
function ready(){const nav=document.getElementById('nav-module-documents');if(nav)nav.dataset.module='documents';const panel=document.getElementById('document-editor105');if(panel)panel.dataset.module='documents';applyGranularPermissionAccess();let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;polish()})}).observe(document.body,{childList:true,subtree:true});polish();session.arm()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
