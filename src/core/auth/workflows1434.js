/* Account workflow, saved preferences, audit actions and activity-based sessions. */
(()=>{'use strict';
const esc=v=>escapeHtml(String(v??''));
window.printPreferences1434={
 async load(){const id=liveProfile?.id;if(!id)return null;let local;try{local=JSON.parse(localStorage.getItem('ojm-print-defaults1434:'+id)||'null')}catch{}try{const r=await ojmDb.from('user_print_preferences1434').select('data').eq('owner_id',id).maybeSingle();if(liveProfile?.id!==id)return null;if(!r.error&&r.data?.data){try{localStorage.setItem('ojm-print-defaults1434:'+id,JSON.stringify(r.data.data))}catch{}return r.data.data}}catch{}return local},
 async save(data){const id=liveProfile?.id;if(!id)throw Error('Sign in before saving defaults.');const r=await ojmDb.from('user_print_preferences1434').upsert({owner_id:id,data,updated_at:new Date().toISOString()},{onConflict:'owner_id'});if(r.error)throw Error('Defaults could not be saved: '+r.error.message+'. Install setup/INSTALL-WORKFLOWS-v142.14.sql if needed.');if(liveProfile?.id===id)localStorage.setItem('ojm-print-defaults1434:'+id,JSON.stringify(data))}
};
// Inactivity logout removed. Manual sign-out and authentication revocation remain in the auth flow.
window.bindSessionActivity1434=()=>{};
window.deleteAuditMonth1434=async function(month){
 const actor=liveProfile?.id,db=ojmDb,current=()=>liveProfile?.id===actor&&ojmDb===db;
 if(liveProfile?.role!=='admin')return showCenterStatus('Administrator access required.',true);
 try{const preview=await db.rpc('audit_month1434',{p_month:month+'-01'});if(!current())return;if(preview.error)throw preview.error;
 const snapshot=preview.data||{},count=snapshot.audit_ids?.length||0;if(!count)return showCenterStatus('No deletable routine audit records remain for this month.');
 if(!await ui108.confirm('Delete routine audit records',`Permanently delete ${count} routine audit records for ${month}? Protected history is kept. The latest-ID exception must be deleted individually.`)||!current())return;
 const result=await db.rpc('audit_month1434',{p_month:month+'-01',p_confirm:true,p_audit_ids:snapshot.audit_ids,p_deletion_ids:[]});if(result.error)throw result.error;if(!current())return;
 await loadTransactionAudit();if(current())showCenterStatus(`${result.data?.deleted||0} routine audit records deleted. Protected history kept.`);
 }catch(e){if(current())showCenterStatus('Audit records were not deleted: '+e.message,true)}
};
window.deleteAuditRecord1434=async function(item){
 const actor=liveProfile?.id,db=ojmDb,current=()=>liveProfile?.id===actor&&ojmDb===db;
 if(liveProfile?.role!=='admin')return showCenterStatus('Administrator access required.',true);
 try{
  const source=item.auditSource1434==='record_deletions108'?'record_deletions108':'audit_log';
  const args=source==='audit_log'?{p_audit_ids:[String(item.id)]}:{p_deletion_ids:[String(item.id)]};
  const permission=await db.rpc('audit_delete_permissions143124',args);if(!current())return;if(permission.error)throw permission.error;
  const policy=permission.data?.[0]?.policy;
  if(!policy){await loadTransactionAudit();if(current())showCenterStatus('This audit record is already absent from the database.');return}
  if(!['green','latest','latest_active'].includes(policy))throw Error('Protected audit history. Older voided IDs and important records must be kept.');
  const message=policy==='latest'?`Permanently delete the latest voided journal ${auditRecordId(item)} and its linked audit history? Only this latest ID becomes available again.`:`Permanently delete this audit record for ${auditRecordId(item)}? The journal transaction stays in place.`;
  if(!await ui108.confirm(policy==='latest'?'Delete latest journal audit':'Delete audit record',message)||!current())return;
  const result=await db.rpc('delete_one_audit1437',{p_source:source,p_id:String(item.id)});if(!current())return;if(result.error)throw result.error;
  await loadTransactionAudit();await window.entryNumber14257?.refresh(true);if(current())showCenterStatus(Number(result.data?.deleted)>0?'Deletion confirmed by the database.':'Record already deleted; the audit list has been refreshed.');
 }catch(e){if(current())showCenterStatus('Audit record was not deleted: '+e.message,true)}
};
function auditRows1434(scope=document){if(liveProfile?.role!=='admin')return;for(const table of desktopNodes80(scope,'#auditMonths98 .audit-table98')){const header=table.tHead?.rows[0];if(header&&!header.querySelector('[data-audit-action1434]')){const th=document.createElement('th');th.dataset.auditAction1434='1';th.textContent='Action';header.append(th)}for(const row of table.querySelectorAll('.audit-summary-row')){if(row.querySelector('[data-delete-record1434]'))continue;let item;try{item=JSON.parse(row.dataset.auditSearch)}catch{continue}const td=document.createElement('td'),button=document.createElement('button');td.className='audit-action1434 no-print';button.type='button';button.className='je-btn je-btn-secondary';button.dataset.deleteRecord1434=item.id;const allowed=['green','latest','latest_active'].includes(item.deletePolicy143124);button.disabled=!allowed;button.textContent=allowed?(item.deletePolicy143124==='latest'?'Delete latest':'Delete'):'Protected';button.title=allowed?(item.deletePolicy143124==='latest'?'Latest issued journal: deletion releases this ID.':'Delete this routine audit record.'):'Retained to explain the journal history. Older voided IDs and important changes cannot be deleted.';button.setAttribute('aria-label','Delete audit log for '+auditRecordId(item));button.onclick=e=>{e.preventDefault();e.stopPropagation();deleteAuditRecord1434(item)};td.append(button);row.append(td);if(row.nextElementSibling?.classList.contains('audit-detail-row'))row.nextElementSibling.firstElementChild.colSpan=header.cells.length}}}
function polish(scope=document){auditRows1434(scope);desktopNodes80(scope,'#auditMonths98 .audit-month98').forEach(card=>{const summary=card.querySelector(':scope>summary');if(!summary)return;summary.querySelectorAll('.audit-stat99').forEach(n=>{if(!Number(n.querySelector('b')?.textContent))n.remove()});if(liveProfile?.role==='admin'&&!summary.querySelector('[data-delete-audit1434]')&&/^\d{4}-\d{2}$/.test(card.dataset.month98||'')){const b=document.createElement('button');b.type='button';b.className='je-btn je-btn-danger no-print';b.dataset.deleteAudit1434=card.dataset.month98;b.textContent='Delete eligible records';b.onclick=e=>{e.preventDefault();e.stopPropagation();deleteAuditMonth1434(b.dataset.deleteAudit1434)};summary.append(b)}});desktopNodes80(scope,'th').forEach(n=>{if(n.children.length)return;const text=n.textContent,next=text.replace(/\bDR\b/g,'Debit').replace(/\bCR\b/g,'Credit');if(text!==next)n.textContent=next});}
function ready(){const nav=document.getElementById('nav-module-documents');if(nav)nav.dataset.module='documents';const panel=document.getElementById('document-editor105');if(panel)panel.dataset.module='documents';applyGranularPermissionAccess();let queued=false;const dirty=new Set();new MutationObserver(records=>{for(const root of desktopMutationRoots80(records))dirty.add(root);if(queued||!dirty.size)return;queued=true;requestAnimationFrame(()=>{queued=false;const roots=[...dirty];dirty.clear();for(const root of roots)if(root.isConnected)polish(root)})}).observe(document.body,{childList:true,subtree:true});polish()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})()