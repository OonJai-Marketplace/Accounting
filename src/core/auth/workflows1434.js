/* Account workflow, saved preferences, audit actions and activity-based sessions. */
(()=>{'use strict';
const esc=v=>escapeHtml(String(v??''));
window.printPreferences1434={
 async load(){const id=liveProfile?.id;if(!id)return null;let local;try{local=JSON.parse(localStorage.getItem('ojm-print-defaults1434:'+id)||'null')}catch{}try{const r=await ojmDb.from('user_print_preferences1434').select('data').eq('owner_id',id).maybeSingle();if(liveProfile?.id!==id)return null;if(!r.error&&r.data?.data){try{localStorage.setItem('ojm-print-defaults1434:'+id,JSON.stringify(r.data.data))}catch{}return r.data.data}}catch{}return local},
 async save(data){const id=liveProfile?.id;if(!id)throw Error('Sign in before saving defaults.');const r=await ojmDb.from('user_print_preferences1434').upsert({owner_id:id,data,updated_at:new Date().toISOString()},{onConflict:'owner_id'});if(r.error)throw Error('Defaults could not be saved: '+r.error.message+'. Install setup/INSTALL-WORKFLOWS-v142.14.sql if needed.');if(liveProfile?.id===id)localStorage.setItem('ojm-print-defaults1434:'+id,JSON.stringify(data))}
};
// Inactivity logout removed. Manual sign-out and authentication revocation remain in the auth flow.
window.bindSessionActivity1434=()=>{};
window.openAuditCleanup313=async function(item=null,month=''){
 const actor=liveProfile?.id,db=ojmDb,current=()=>liveProfile?.id===actor&&ojmDb===db&&!window.workspaceRequest138?.target;
 if(liveProfile?.role!=='admin'||!current())return showCenterStatus('Administrator access required.',true);
 if(window.offlineAudit143174?.offline())return showCenterStatus('Connect to delete audit logs. No records have been deleted.',true);
 const selected=/^\d{4}-\d{2}$/.test(month)?month:(window.auditPage143198?.state().month||new Date().toISOString().slice(0,7));
 const options=(item?'<option value="record">This audit log</option><option value="entry">All logs for this record</option>':'')+'<option value="month">Reviewed month (Orange only)</option>';
 const pending=ui108.modal('Clear reviewed Orange logs',`<form id="auditCleanup313"><div class="audit-cleanup-fields313"><label>Delete by<select name="scope">${options}</select></label><label data-period="month">Month<input type="month" name="month" value="${esc(selected)}" required></label></div><p data-count role="status">Checking logs…</p><p>Only Orange financial audit events are cleared after review. Red records are permanently retained. Journals, payroll and journal numbers remain unchanged.</p><p role="alert"></p><button type="button" data-refresh hidden>Refresh count</button><div class="actions82"><button type="button" data-cancel>Cancel</button><button type="submit" class="je-btn je-btn-danger" disabled>Delete logs</button></div></form>`,[]);
 const root=document.querySelector('.ui-overlay108:last-child'),form=root?.querySelector('#auditCleanup313');if(!form)return;
 let generation=0,preview=null,args=null,saving=false;
 const submit=form.querySelector('[type=submit]'),message=form.querySelector('[role=alert]'),count=form.querySelector('[data-count]');
 const inputArgs=()=>{const s=form.elements.scope.value;const period=s==='month'?form.elements.month.value+'-01':selected+'-01';return {p_scope:s,p_period:period,p_source:item?.auditSource1434||'audit_log',p_id:item?String(item.id):null};};
 async function refresh(){
  if(saving)return;const g=++generation;preview=null;submit.disabled=true;message.textContent='';form.querySelector('[data-refresh]').hidden=true;const s=form.elements.scope.value;
  for(const label of form.querySelectorAll('[data-period]')){label.hidden=!label.dataset.period.split(' ').includes(s);for(const input of label.querySelectorAll('input,select'))input.disabled=label.hidden;}
  if(!form.checkValidity()){count.textContent='Choose a valid period.';return;}
  count.textContent='Checking logs…';args=inputArgs();
  try{const r=await db.rpc('audit_cleanup313',args);if(!current()||!root.isConnected||g!==generation)return;if(r.error)throw r.error;if(!Number.isInteger(r.data?.count)||typeof r.data.expected!=='string')throw Error('Log cleanup service is unavailable.');preview=r.data;count.textContent=preview.count+' Orange audit log'+(preview.count===1?'':'s')+' can be cleared after review.';submit.textContent='Clear '+preview.count+' Orange log'+(preview.count===1?'':'s');submit.disabled=!preview.count;}catch(e){if(current()&&g===generation&&root.isConnected){count.textContent='';message.textContent=e.message;form.querySelector('[data-refresh]').hidden=false;}}
 }
 form.onchange=()=>void refresh();form.querySelector('[data-refresh]').onclick=()=>void refresh();form.querySelector('[data-cancel]').onclick=()=>{if(!saving){generation++;root.resolve108(false);}};
 form.onsubmit=async e=>{e.preventDefault();if(saving||!preview||!current()||JSON.stringify(inputArgs())!==JSON.stringify(args))return;const expected=preview.expected;saving=true;submit.disabled=true;form.querySelector('[data-cancel]').disabled=true;message.textContent='';count.textContent='Deleting logs…';
  try{const r=await db.rpc('audit_cleanup313',{...args,p_confirm:true,p_expected:expected});if(r.error)throw r.error;if(!current())return;if(!Number.isInteger(r.data?.deleted))throw Error('Deletion reply was incomplete. Refresh the log list to confirm.');generation++;root.resolve108(true);const s=window.auditPage143198?.state();s?.details.clear();if(s){s.offset=0;s.loaded=false;}await window.offlineAudit143174?.rememberAudit([]);await loadTransactionAudit();if(current())showCenterStatus(r.data.deleted+' audit logs deleted.');}
  catch(e){if(current()&&root.isConnected){message.textContent=e.message;count.textContent='Check the current list before retrying.';preview=null;form.querySelector('[data-refresh]').hidden=false;}}
  finally{saving=false;if(root.isConnected){form.querySelector('[data-cancel]').disabled=false;submit.disabled=true;}}
 };
 void refresh();await pending;generation++;
};
window.deleteAuditMonth1434=month=>window.openAuditCleanup313(null,month);
window.deleteAuditRecord1434=item=>window.openAuditCleanup313(item);
function auditRows1434(scope=document){if(liveProfile?.role!=='admin')return;for(const table of desktopNodes80(scope,'#auditMonths98 .audit-table98')){const header=table.tHead?.rows[0];if(!header)continue;if(!header.querySelector('[data-audit-action1434]')){const th=document.createElement('th');th.dataset.auditAction1434='1';th.textContent='Action';header.append(th)}for(const row of table.querySelectorAll('.audit-summary-row')){if(row.querySelector('[data-delete-record1434]'))continue;let item;try{item=JSON.parse(row.dataset.auditSearch)}catch{continue}const td=document.createElement('td'),button=document.createElement('button');td.className='audit-action1434 no-print';button.type='button';button.className='je-btn je-btn-danger';button.dataset.deleteRecord1434=item.id;button.disabled=/^(device:|pending-delete:|local-)/.test(String(item.id));button.textContent='Delete log';button.setAttribute('aria-label','Delete audit log for '+auditRecordId(item));button.onclick=e=>{e.preventDefault();e.stopPropagation();deleteAuditRecord1434(item)};td.append(button);row.append(td);}}}
function polish(scope=document){auditRows1434(scope);desktopNodes80(scope,'th').forEach(n=>{if(n.children.length)return;const text=n.textContent,next=text.replace(/\bDR\b/g,'Debit').replace(/\bCR\b/g,'Credit');if(text!==next)n.textContent=next});}
function ready(){const nav=document.getElementById('nav-module-documents');if(nav)nav.dataset.module='documents';const panel=document.getElementById('document-editor105');if(panel)panel.dataset.module='documents';applyGranularPermissionAccess();let queued=false;const dirty=new Set();new MutationObserver(records=>{for(const root of desktopMutationRoots80(records))dirty.add(root);if(queued||!dirty.size)return;queued=true;requestAnimationFrame(()=>{queued=false;const roots=[...dirty];dirty.clear();for(const root of roots)if(root.isConnected)polish(root)})}).observe(document.body,{childList:true,subtree:true});polish()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})()