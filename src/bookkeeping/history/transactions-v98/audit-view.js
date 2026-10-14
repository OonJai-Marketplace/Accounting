  // Important changes only. Routine events remain in the stored audit trail.
  let auditFilter14361='all',auditOwner14361='';
  const auditAction14361=item=>String(item.action||'CHANGE').toUpperCase();
  function auditKind14361(item){
    const action=auditAction14361(item),after=item.new_data||{};
    if(['POST','AUTO_POST','SCHEDULE_POST_ADVANCE','CREATE_SCHEDULE','MAINTENANCE_CLOSE','SUBMIT','REVIEW','REVIEW_FORWARD','APPROVE','APPROVE_AND_POST','LINK','MAINTENANCE_EDIT'].includes(action))return null;
    if(action==='PERIOD_STATUS')return String(after.status||'').toLowerCase()==='open'?{group:'periods',tier:'red',label:'Period reopened'}:null;
    if(/PERIOD.*(?:CLOSE|LOCK)|CLOSE.*PERIOD/.test(action))return null;
    if(/REOPEN/.test(action))return {group:'periods',tier:'red',label:'Period / report reopened'};
    if(action==='DELETE_SCHEDULE')return {group:'schedules',tier:'orange',label:'Schedule deleted'};
    if(action==='UPDATE_SCHEDULE')return {group:'schedules',tier:'yellow',label:'Schedule changed'};
    if(/VOID/.test(action))return {group:'voids',tier:'red',label:'Voided'};
    if(/DELETE|REMOVE|PURGE|CANCEL/.test(action))return {group:'deletions',tier:'red',label:action.replaceAll('_',' ')};
    if(action==='MARK_UNDER_REVIEW')return {group:'reviews',tier:'yellow',label:'Marked for review'};
    if(action==='UPDATE'&&item.table_name==='accounting_periods'&&after.status==='open')return {group:'periods',tier:'red',label:'Period reopened'};
    if(action==='UPDATE'&&item.table_name==='accounting_periods'&&['closed','locked'].includes(after.status))return null;
    if(action==='UPDATE'&&/acknowledged unposted submissions/i.test(item.reason||''))return {group:'periods',tier:'yellow',label:'Unposted submissions acknowledged'};
    if(/UPDATE|MODIFY|EDIT|ADJUST/.test(action))return {group:'corrections',tier:'orange',label:'Correction / adjustment'};
    // Unknown actions stay visible for review instead of silently losing evidence.
    return {group:'reviews',tier:'yellow',label:action.replaceAll('_',' ')};
  }
  const auditGroups14361=[['all','All important events'],['voids','Voided'],['corrections','Corrections'],['periods','Period changes'],['schedules','Schedule changes'],['deletions','Deletions / cancellations'],['reviews','Review required']];
  function auditValues14361(value,path='',out=new Map()){
    if(value!==null&&typeof value==='object'&&Object.keys(value).length){for(const [key,child] of Object.entries(value))auditValues14361(child,path?(Array.isArray(value)?`${path} [${Number(key)+1}]`:`${path} / ${key.replaceAll('_',' ')}`):key.replaceAll('_',' '),out)}
    else out.set(path||'Value',value);
    return out;
  }
  function auditValue14361(value){
    if(value===undefined)return 'Not recorded';if(value===null)return 'None';if(typeof value==='boolean')return value?'Yes':'No';if(typeof value==='object')return Array.isArray(value)?'Empty list':'Empty object';
    const text=String(value);if(/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(text))return esc(formatAppDate(text,text.includes('T')));return esc(text===''?'Empty text':text);
  }
  function openAudit14361(item,trigger){
    byId('auditDetails14361')?.close();byId('auditDetails14361')?.remove();
    const dialog=document.createElement('dialog');dialog.id='auditDetails14361';dialog.setAttribute('aria-labelledby','auditTitle14361');
    const kind=auditKind14361(item),old=auditValues14361(item.old_data??{}),next=auditValues14361(item.new_data??{});
    const fields=[...new Set([...old.keys(),...next.keys()])].filter(key=>{const meaningful=v=>v!==undefined&&(v===null||typeof v!=='object'||Object.keys(v).length>0);return key!=='Value'||meaningful(old.get(key))||meaningful(next.get(key));});
    const metadata=[['Record',auditRecordId(item)],['Action',auditAction14361(item)],['Reason / note',item.reason||'No reason recorded'],['Recorded by',getLiveUserName(item.actor_id)||(item.actor_id?'Unknown user':'System / not recorded')],['Actor ID',item.actor_id||'Not recorded'],['Date and time',item.created_at],['Source',item.table_name||item.auditSource1434||'Local adjustment'],['Audit ID',item.id]];
    if(item.effective_user_id)metadata.push(['Acting for',getLiveUserName(item.effective_user_id)||item.effective_user_id],['Effective user ID',item.effective_user_id]);
    const comparison=fields.length?`<div class="audit-details-scroll14361"><table><thead><tr><th>Saved field</th><th>Before</th><th>After / result</th></tr></thead><tbody>${fields.map(key=>`<tr class="${JSON.stringify(old.get(key))!==JSON.stringify(next.get(key))?'audit-changed14361':''}"><th scope="row">${esc(key)}</th><td>${auditValue14361(old.get(key))}</td><td>${auditValue14361(next.get(key))}</td></tr>`).join('')}</tbody></table></div>`:'<p class="audit-missing14361">This event has no saved before/after details. Its recorded information is shown above; historical details cannot be reconstructed from this audit record.</p>';
    dialog.innerHTML=`<header><h3 id="auditTitle14361">${esc(kind?.label||'Audit details')} — ${esc(auditRecordId(item))}</h3><button type="button" class="je-btn je-btn-secondary" data-audit-close14361>Close</button></header><div class="audit-details-body14361"><table class="audit-metadata14361"><tbody>${metadata.map(([key,value])=>`<tr><th scope="row">${esc(key)}</th><td>${auditValue14361(value)}</td></tr>`).join('')}</tbody></table><h4>Saved details</h4>${comparison}</div>`;
    document.body.append(dialog);dialog.addEventListener('close',()=>{dialog.remove();if(trigger?.isConnected)trigger.focus()},{once:true});dialog.querySelector('[data-audit-close14361]').onclick=()=>dialog.close();
    let outside=false;const isOutside=e=>{const r=dialog.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom};dialog.addEventListener('pointerdown',e=>{outside=e.target===dialog&&isOutside(e)});dialog.addEventListener('click',e=>{if(outside&&e.target===dialog&&isOutside(e))dialog.close();outside=false});dialog.showModal();
  }
  window.auditDetails14361={open:openAudit14361,kind:auditKind14361};
  window.renderVoidedTransactionsTable = function () {
    const original=byId('tblVoidedTransactions');if(!original)return;original.closest('.table-container').hidden=true;
    let host=byId('auditMonths98');if(!host){host=document.createElement('div');host.id='auditMonths98';original.closest('.table-container').after(host)}host.dataset.historySearch='off';
    const owner=typeof liveProfile==='undefined'?'':liveProfile?.id;if(auditOwner14361!==owner){auditOwner14361=owner;auditFilter14361='all'}
    const local=(JournalModule.voidedEntries||[]).map((item,i)=>({id:`local-${i}`,record_id:item.id,action:'ADJUSTMENT',reason:item.explanation,old_data:item.oldData,new_data:item.newData,created_at:item.timestamp}));
    const records=[...(LiveTransactionAudit||[]),...local].filter(auditKind14361).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
    const selected=historyMonth14341.choose('audit',records.map(r=>String(r.created_at||'').slice(0,7))),month=records.filter(item=>String(item.created_at||'').slice(0,7)===selected);
    if(auditFilter14361!=='all'&&!month.some(item=>auditKind14361(item).group===auditFilter14361))auditFilter14361='all';
    const cards=auditGroups14361.filter(([key])=>key==='all'||month.some(item=>auditKind14361(item).group===key)).map(([key,label])=>`<button type="button" class="period-summary-card" data-audit-filter14361="${key}" aria-pressed="${auditFilter14361===key}"><span>${label}</span><strong>${key==='all'?month.length:month.filter(item=>auditKind14361(item).group===key).length}</strong></button>`).join('');
    const shown=month.filter(item=>auditFilter14361==='all'||auditKind14361(item).group===auditFilter14361);
    const rows=shown.map((item,index)=>{const kind=auditKind14361(item);return `<tr class="audit-summary-row" tabindex="0" data-audit-open14361="${index}" data-audit-search="${esc(JSON.stringify(item))}" data-audit-severity="${kind.tier}" aria-haspopup="dialog" aria-label="View ${esc(kind.label)} ${esc(auditRecordId(item))}"><td><button type="button" class="je-btn je-btn-secondary" aria-label="View details for ${esc(auditRecordId(item))}">View</button></td><td>${formatAppDate(item.created_at,true)}</td><td>${esc(auditRecordId(item))}</td><td><span class="audit-count98 ${kind.tier}">${esc(kind.label)}</span></td><td>${esc(item.reason||'—')}</td><td>${esc(getLiveUserName(item.actor_id)||'System')}</td></tr>`}).join('');
    host.innerHTML=historyMonth14341.control('audit',selected)+`<div class="period-summary-grid audit-filters14361">${cards}</div><section class="archive-month audit-month98"><div class="table-container"><table class="audit-table98"><thead><tr><th>Details</th><th>Date &amp; Time</th><th>Record</th><th>Audit Action</th><th>Reason / Note</th><th>Recorded By</th></tr></thead><tbody>${rows||'<tr><td colspan="6" class="period-empty">No important audit events match this month and category.</td></tr>'}</tbody></table></div></section>`;
    host.querySelectorAll('[data-audit-filter14361]').forEach(button=>{button.onclick=()=>{auditFilter14361=button.dataset.auditFilter14361;renderVoidedTransactionsTable();host.querySelector(`[data-audit-filter14361="${auditFilter14361}"]`)?.focus()}});
    host.querySelectorAll('[data-audit-open14361]').forEach(row=>{row.onclick=e=>{if(e.target.closest('[data-delete-record1434]'))return;openAudit14361(shown[Number(row.dataset.auditOpen14361)],row)};row.onkeydown=e=>{if(e.target===row&&(e.key==='Enter'||e.key===' ')){e.preventDefault();row.click()}}});
    historyMonth14341.bind(host,'audit',renderVoidedTransactionsTable,'local');
  };

  // CSV is imported as an editable draft only; the existing Post Entry validation still applies.
