/* Journal presentation and monthly audit review. Existing posting rules remain authoritative. */
(function () {
  'use strict';
  const esc = value => escapeHtml(String(value ?? ''));
  const byId = id => document.getElementById(id);

  window.showJournalEntry98 = function (show = true, scroll = true) {
    const form = byId('journalEntry98');
    if (!form) return;
    form.hidden = false;
    const button = byId('addEntry98');
    button?.setAttribute('aria-expanded', String(show));
    if (button && button.textContent !== '+ Add Entry') button.textContent = '+ Add Entry';
    if (show && scroll) requestAnimationFrame(() => form.scrollIntoView({behavior:'smooth', block:'start'}));
  };
  function syncTitle() {
    const active = document.querySelector('.tab-content.active');
    const transaction = !!active?.closest('#transactions-module') || ['user-entry-review','period-review'].includes(active?.id);
    if (byId('transactionsHeading98')) byId('transactionsHeading98').hidden = !transaction;
  }
  const switchBefore = window.switchTab;
  window.switchTab = function (...args) { const result = switchBefore.apply(this,args); syncTitle(); return result; };

  // Editing and prepared submissions must reveal the form even when Add Entry is collapsed.
  for (const name of ['loadEntryForEdit','startFindingAdjustment','prepareComparedForm69','applyTemplate']) {
    const before = window[name];
    if (typeof before !== 'function') continue;
    window[name] = function (...args) {
      const result = before.apply(this,args);
      if (name !== 'loadEntryForEdit' || JournalModule.editingEntryId) showJournalEntry98();
      return result;
    };
  }
  const addBefore = window.addJournalLineRow;
  window.addJournalLineRow = function (...args) {
    const result = addBefore.apply(this,args);
    if (args[0]) showJournalEntry98(true,false);
    return result;
  };
  window.calculateJournalBalance = function () {
    const badge = byId('jeBalanceIndicator'), post = byId('btnPostJournal');
    if (!badge || !byId('jeLinesBody')) return;
    document.querySelectorAll('#jeLinesBody .je-line-acc').forEach(updateJournalAccountBadge);
    const state = getMultiDateJournalState();
    const lines = Object.values(state.grouped).flatMap(g => g.lines);
    const empty = !lines.some(l => l.debit || l.credit);
    if(badge.hidden!==empty)badge.hidden=empty;
    const difference = state.differences[0];
    let label = '✓ Balanced', description = 'Debits equal credits in each currency.';
    if (state.errors.length) { label = 'Check entry'; description = state.errors.join('\n'); }
    else if (empty) { label = 'No amounts entered'; description = 'Enter a debit and a credit.'; }
    else if (difference) {
      label = `Difference: ${difference.currency} ${formatAppNumber(Math.abs(difference.debit-difference.credit))}`;
      description = state.differences.map(d => `${formatAppDate(d.date)} · ${d.currency}: ${formatAppNumber(Math.abs(d.debit-d.credit))}`).join('\n');
    }
    if(state.warnings?.length){label+=' · '+state.warnings.join(' ');description+='\n'+state.warnings.join('\n');}
    const invalid = empty || !!difference || !!state.errors.length;
    if (badge.textContent !== label) badge.textContent = label;
    if(badge.title!==description)badge.title=description;
    if(badge.getAttribute('aria-label')!==`${label}. ${description}`)badge.setAttribute('aria-label', `${label}. ${description}`);
    const kind='je-status-badge ' + (invalid ? 'unbalanced' : 'balanced');if(badge.className!==kind)badge.className=kind;
    if(post&&post.disabled!==invalid)post.disabled=invalid;
  };

  // Routine events are rejected at storage; the same rule hides old device copies.
  let auditFilter14361='all',auditOwner14361='',auditDetailRequest143198=0;
  const auditAction14361=item=>String(item.action||'CHANGE').toUpperCase();
  function auditKind14361(item){
 const labels={R1:'Financial record deleted',R2:'Posted debit / credit changed',R3:'Opening balance changed',R4:'Bulk or period deletion',R5:'Journal voided / reversed',R6:'Closed period reopened',R7:'Finalized payroll amount changed',O1:'Draft debit / credit changed',O2:'Exchange rate changed'};
 const category=String(item.category143324||'');
 if(!Object.hasOwn(labels,category))return null;
 const tier=category.startsWith('R')?'red':'orange';
 return {group:tier,tier,label:category+' · '+labels[category]};
}
const auditGroups14361=[['all','Financial audit events'],['red','Red — Permanently kept'],['orange','Orange — Reviewable']];
  const auditMonth313=value=>{const date=new Date(value);if(!Number.isFinite(date.getTime()))return String(value||'').slice(0,7);const parts=new Intl.DateTimeFormat('en',{timeZone:'Asia/Vientiane',year:'numeric',month:'2-digit'}).formatToParts(date);return parts.find(p=>p.type==='year').value+'-'+parts.find(p=>p.type==='month').value;};
  const auditLineIdentity14382=new WeakMap();
  const auditUuid14382=value=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value||''));
  function auditReadable14382(value,record,line=false){
    if(Array.isArray(value))return value.map(row=>auditReadable14382(row,record,true));
    if(!value||typeof value!=='object')return value;
    const out={},entry=value.entry_no||value.entryNo||value.schedule_no;
    for(const [key,child] of Object.entries(value)){
      if(/^(line_id|journal_line_id|line_no|actor_id|effective_user_id|created_by|updated_by|owner_id|client_key|operation_id|request_id|posting_account_id14285)$/i.test(key))continue;
      if(key==='id'){if(!line&&entry)continue;if(!auditUuid14382(child)&&!line)out['Record ID']=child;continue;}
      if(key==='account_id'){
        if(value.account_name||value.account)continue;
        const account=AccountingStore.accounts.find(a=>String(a.id)===String(child));out.Account=account?`${account.code} — ${account.name}`:'Account name not recorded';continue;
      }
      if(key==='journal_entry_id'||key==='entry_id'){
        if(entry||line)continue;
        const journal=JournalModule.entries.find(r=>r.dbEntryId===child);out['Entry ID']=journal?.id||(!auditUuid14382(record)?record:'Entry number not recorded');continue;
      }
      if(auditUuid14382(child))continue;
      const label=({entry_no:'Entry ID',account_name:'Account',account:'Account',transaction_date:'Date',line_date:'Date',currency_code:'Currency',memo:'Description / reference'})[key]||key.replaceAll('_',' ');
      out[label]=auditReadable14382(child,record,key==='lines'||key==='journal_lines');
    }
    if(line&&(value.line_id||value.id))auditLineIdentity14382.set(out,String(value.line_id||value.id));
    return out;
  }
  // Match unchanged lines before pairing edited lines, so an inserted row does not
  // make every later line look edited. Regenerated database IDs are irrelevant.
  function auditValues14361(before,after,path='',old=new Map(),next=new Map()){
    const object=v=>v!==null&&typeof v==='object';
    if(Array.isArray(before)||Array.isArray(after)){
      const left=Array.isArray(before)?before:[],right=Array.isArray(after)?after:[],pairs=new Map(),used=new Set();
      left.forEach((row,i)=>{const id=row&&typeof row==='object'?auditLineIdentity14382.get(row):null;if(!id)return;const j=right.findIndex((r,j)=>!used.has(j)&&r&&typeof r==='object'&&auditLineIdentity14382.get(r)===id);if(j>=0){pairs.set(i,j);used.add(j)}});
      left.forEach((row,i)=>{if(pairs.has(i))return;const j=right.findIndex((r,j)=>!used.has(j)&&JSON.stringify(row)===JSON.stringify(r));if(j>=0){pairs.set(i,j);used.add(j)}});
      const remaining=right.map((_,i)=>i).filter(i=>!used.has(i));
      left.forEach((row,i)=>{if(!pairs.has(i)&&remaining.length){const j=remaining.shift();pairs.set(i,j);used.add(j)}auditValues14361(row,pairs.has(i)?right[pairs.get(i)]:undefined,`${path||'Lines'} [${i+1}]`,old,next)});
      right.forEach((row,j)=>{if(!used.has(j))auditValues14361(undefined,row,`${path||'Lines'} [added ${j+1}]`,old,next)});
    }else if(object(before)||object(after)){
      const keys=[...new Set([...Object.keys(before||{}),...Object.keys(after||{})])];
      for(const key of keys)auditValues14361(before?.[key],after?.[key],path?`${path} / ${key}`:key,old,next);
    }else if(before!==undefined||after!==undefined){old.set(path||'Value',before);next.set(path||'Value',after)}
    return {old,next};
  }
  function auditValue14361(value){
    if(value===undefined)return 'Not recorded';if(value===null)return 'None';if(typeof value==='boolean')return value?'Yes':'No';if(typeof value==='object')return Array.isArray(value)?'Empty list':'Empty object';
    const text=String(value);if(/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(text))return esc(formatAppDate(text,text.includes('T')));return esc(text===''?'Empty text':text);
  }
  async function openAudit14361(item,trigger){
    const request=++auditDetailRequest143198,owner=liveProfile?.id;
    try{item=await window.auditPage143198?.detail(item)||item;}catch(e){if(request===auditDetailRequest143198&&owner===liveProfile?.id)window.showCenterStatus?.(e.message,true);return;}
    if(request!==auditDetailRequest143198||owner!==liveProfile?.id)return;
    byId('auditDetails14361')?.close();byId('auditDetails14361')?.remove();
    const dialog=document.createElement('dialog');dialog.id='auditDetails14361';dialog.setAttribute('aria-labelledby','auditTitle14361');
    const kind=auditKind14361(item),record=auditRecordId(item),{old,next}=auditValues14361(auditReadable14382(item.old_data??{},record),auditReadable14382(item.new_data??{},record));
    const fields=[...new Set([...old.keys(),...next.keys()])].filter(key=>{const meaningful=v=>v!==undefined&&(v===null||typeof v!=='object'||Object.keys(v).length>0);return key!=='Value'||meaningful(old.get(key))||meaningful(next.get(key));});
    const metadata=[['Record',auditRecordId(item)],['Action',auditAction14361(item)],['Reason / note',item.reason||'No reason recorded'],['Recorded by',getLiveUserName(item.actor_id)||(item.actor_id?'Unknown user':'System / not recorded')],['Date and time',item.created_at]];
    if(item.effective_user_id)metadata.push(['Acting for',getLiveUserName(item.effective_user_id)||'Name not recorded']);
    const changed=key=>JSON.stringify(old.get(key))!==JSON.stringify(next.get(key)),count=fields.filter(changed).length;
    const changedLines=new Set(fields.filter(changed).map(key=>key.includes(' / ')?key.slice(0,key.lastIndexOf(' / ')):''));
    const comparison=fields.length?`<p class="audit-legend14382"><strong>${count} changed field${count===1?'':'s'}</strong> · Orange: changed or added · Red: removed${count?'<button type="button" class="je-btn je-btn-secondary" data-audit-all14382>Show all saved fields</button>':''}</p><div class="audit-details-scroll14361"><table><thead><tr><th>Saved field</th><th>Before</th><th>After / result</th></tr></thead><tbody>${fields.map(key=>{const differs=changed(key),removed=differs&&next.get(key)===undefined,added=differs&&old.get(key)===undefined;const context=/ \/ (Account|Currency|Date)$/.test(key)&&changedLines.has(key.slice(0,key.lastIndexOf(' / ')));return `<tr ${!differs&&!context&&count?'hidden data-audit-unchanged14382':''} class="${differs?'audit-changed14361':''} ${removed?'audit-removed14382':''}"><th scope="row">${esc(key)}${differs?`<strong class="audit-change-label14382">${removed?'Removed':added?'Added':'Changed'}</strong>`:''}</th><td>${auditValue14361(old.get(key))}</td><td>${auditValue14361(next.get(key))}</td></tr>`}).join('')}</tbody></table></div>`:'<p class="audit-missing14361">This event has no saved before/after details to display. Its recorded information is shown above; historical details cannot be reconstructed from this audit record.</p>';
    dialog.innerHTML=`<header><h3 id="auditTitle14361">${esc(kind?.label||'Audit details')} — ${esc(auditRecordId(item))}</h3><button type="button" class="je-btn je-btn-secondary" data-audit-close14361>Close</button></header><div class="audit-details-body14361"><table class="audit-metadata14361"><tbody>${metadata.map(([key,value])=>`<tr><th scope="row">${esc(key)}</th><td>${auditValue14361(value)}</td></tr>`).join('')}</tbody></table><h4>Saved details</h4>${comparison}</div>`;
    const toggle=dialog.querySelector('[data-audit-all14382]');if(toggle)toggle.onclick=()=>{const show=toggle.textContent==='Show all saved fields';dialog.querySelectorAll('[data-audit-unchanged14382]').forEach(row=>row.hidden=!show);toggle.textContent=show?'Show changes only':'Show all saved fields'};
    document.body.append(dialog);dialog.addEventListener('close',()=>{dialog.remove();if(trigger?.isConnected)trigger.focus()},{once:true});dialog.querySelector('[data-audit-close14361]').onclick=()=>dialog.close();
    let outside=false;const isOutside=e=>{const r=dialog.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom};dialog.addEventListener('pointerdown',e=>{outside=e.target===dialog&&isOutside(e)});dialog.addEventListener('click',e=>{if(outside&&e.target===dialog&&isOutside(e))dialog.close();outside=false});dialog.showModal();
  }
  window.auditDetails14361={open:openAudit14361,kind:auditKind14361};
  let editPanelState=null;
  function editReasonsPanel(month){
    const owner=liveProfile.id,db=ojmDb,panel=document.createElement('section');
    panel.className='journal-edit-reasons377';
    panel.innerHTML='<button type="button" class="je-btn je-btn-secondary" aria-controls="journalEditReasons377" aria-expanded="false">My active journal edits</button><div id="journalEditReasons377" aria-live="polite" hidden></div>';
    const body=panel.lastElementChild;
    let generation=0;
    async function load(offset){
      const ticket=++generation;
      const current=()=>panel.isConnected&&!body.hidden&&generation===ticket&&db===ojmDb&&owner===liveProfile?.id&&!window.workspaceRequest138?.target;
      body.textContent='Loading edit reasons…';
      try{
        const {data,error}=await db.rpc('my_active_journal_notes377',{p_month:month+'-01',p_offset:offset});
        if(!current())return;
        if(error)throw error;
        if(!Array.isArray(data))throw Error('The server did not return the edit reasons.');
        const rows=data.slice(0,50);
        if(!rows.length&&offset){await load(Math.max(0,offset-50));return;}
        body.innerHTML=rows.length?'<p>Review your reasons for editing the active journal. Delete a note when you have finished checking it.</p><table><thead><tr><th>Edited</th><th>Entry ID</th><th>Reason</th><th>Action</th></tr></thead><tbody>'+rows.map((r,i)=>'<tr><td>'+esc(formatAppDate(r.edited_at,true))+'</td><td>'+esc(r.entry_no)+'</td><td>'+esc(r.reason)+'</td><td><button type="button" class="je-btn je-btn-danger" data-delete-note="'+i+'">Delete note</button></td></tr>').join('')+'</tbody></table>':'<p>No edit notes for this month.</p>';
        for(const button of body.querySelectorAll('[data-delete-note]')){
          const row=rows[Number(button.dataset.deleteNote)];
          button.onclick=async()=>{
            if(button.disabled||!current())return;
            button.disabled=true;
            try{
              if(!await ui117.confirm('Permanently delete your edit note for '+esc(row.entry_no)+'? The journal entry and its financial audit events are kept.')||!current())return;
              const result=await db.rpc('delete_my_journal_edit_note377',{p_note_key:row.note_key});
              if(result.error)throw result.error;
              if(current())await load(offset);
            }catch(e){if(current())window.showCenterStatus?.('Could not confirm deletion. '+(e.message||'Reconnect and try again.'),true);}
            finally{if(current())button.disabled=false;}
          };
        }
        if(offset||data.length>50){
          const nav=document.createElement('div');nav.className='audit-pager377';
          for(const [label,next,disabled] of [['Previous',offset-50,!offset],['Next',offset+50,data.length<=50]]){
            const button=document.createElement('button');button.type='button';button.className='je-btn je-btn-secondary';
            button.textContent=label;button.disabled=disabled;button.onclick=()=>load(next);nav.append(button);
          }
          body.append(nav);
        }
      }catch(e){if(current())body.textContent='Could not load edit reasons. '+(e.message||'Reconnect and reopen this section.');}
    }
    const toggle=panel.firstElementChild;
    toggle.onclick=()=>{
      body.hidden=!body.hidden;
      toggle.setAttribute('aria-expanded',String(!body.hidden));
      if(body.hidden){generation++;body.replaceChildren();}
      else void load(0);
    };
    return panel;
  }
  window.renderVoidedTransactionsTable = function () {
    const original=byId('tblVoidedTransactions');if(!original)return;original.closest('.table-container').hidden=true;
    let host=byId('auditMonths98');if(!host){host=document.createElement('div');host.id='auditMonths98';original.closest('.table-container').after(host)}host.dataset.historySearch='off';
    const owner=typeof liveProfile==='undefined'?'':liveProfile?.id;if(auditOwner14361!==owner){auditOwner14361=owner;auditFilter14361='all'}
    const local=(JournalModule.voidedEntries||[]).map((item,i)=>({id:`local-${i}`,record_id:item.id,action:'ADJUSTMENT',reason:item.explanation,old_data:item.oldData,new_data:item.newData,created_at:item.timestamp}));
    const records=[...(LiveTransactionAudit||[])].filter(auditKind14361).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
    const selected=historyMonth14341.choose('audit',records.map(r=>auditMonth313(r.created_at))),month=records.filter(item=>auditMonth313(item.created_at)===selected);
    const page=window.auditPage143198?.state(),remote=page?.loaded&&!page.offline&&page.month===selected;
    if(remote)auditFilter14361=page.group;
    const count=key=>remote?(key==='all'?Object.values(page.counts).reduce((n,v)=>n+Number(v),0):Number(page.counts[key]||0)):(key==='all'?month.length:month.filter(item=>auditKind14361(item).group===key).length);
    const cards=auditGroups14361.filter(([key])=>key==='all'||count(key)).map(([key,label])=>`<button type="button" class="period-summary-card" data-audit-filter14361="${key}" aria-pressed="${auditFilter14361===key}"><span>${label}</span><strong>${count(key)}</strong></button>`).join('');
    const matching=month.filter(item=>auditFilter14361==='all'||auditKind14361(item).group===auditFilter14361);
    const total=remote?page.total:matching.length;
    const lastOffset=Math.max(0,(Math.ceil(total/50)-1)*50);
    const offset=Math.min(page?.offset||0,lastOffset);
    const shown=remote?matching.slice(0,50):matching.slice(offset,offset+50);
    const offlineNote=page?.offline?'<p>Showing downloaded audit records. Connect to browse the complete history.</p>':'';
    const pager=page&&total>50?`<div class="audit-pager377 no-print"><button type="button" class="je-btn je-btn-secondary" data-audit-page143198="${Math.max(0,offset-50)}" ${offset?'':'disabled'}>Previous</button><span>${offset+1}–${Math.min(offset+50,total)} of ${total}</span><button type="button" class="je-btn je-btn-secondary" data-audit-page143198="${offset+50}" ${offset===lastOffset?'disabled':''}>Next</button></div>`:'';
    const rows=shown.map((item,index)=>{const kind=auditKind14361(item);return `<tr class="audit-summary-row" tabindex="0" data-audit-open14361="${index}" data-audit-search="${esc(JSON.stringify({id:item.id,auditSource1434:item.auditSource1434,record_id:item.record_id,action:item.action,deletePolicy143124:item.deletePolicy143124,old_data:{entry_no:item.old_data?.entry_no},new_data:{entry_no:item.new_data?.entry_no},summary143198:true}))}" aria-haspopup="dialog" aria-label="View ${esc(kind.label)} ${esc(auditRecordId(item))}"><td>${formatAppDate(item.created_at,true)}</td><td>${esc(auditRecordId(item))}</td><td>${esc(kind.label)}</td><td>${esc(item.reason||'—')}</td><td>${esc(getLiveUserName(item.actor_id)||'System')}</td></tr>`}).join('');
    host.innerHTML=historyMonth14341.control('audit',selected)+(liveProfile?.role==='admin'?'<button type="button" class="je-btn je-btn-secondary" data-audit-cleanup313>Clear reviewed Orange…</button>':'')+`<div class="period-summary-grid audit-filters14361">${cards}</div>${offlineNote}<section class="archive-month audit-month98"><div class="table-container"><table class="audit-table98"><thead><tr><th>Date &amp; Time</th><th>Record</th><th>Audit Action</th><th>Reason / Note</th><th>Recorded By</th>${liveProfile?.role==='admin'?'<th data-audit-action1434>Action</th>':''}</tr></thead><tbody>${rows||`<tr><td colspan="${liveProfile?.role==='admin'?6:5}" class="period-empty">No audit events match this month and category.</td></tr>`}</tbody></table></div></section>${pager}`;
    const allowReasons=liveProfile?.role==='admin'&&!window.workspaceRequest138?.target;
    if(editPanelState&&(!allowReasons||editPanelState.owner!==owner||editPanelState.db!==ojmDb||editPanelState.month!==selected||!editPanelState.panel.isConnected)){
      editPanelState.panel.remove();editPanelState=null;
    }
    if(allowReasons&&!editPanelState){
      const panel=editReasonsPanel(selected);host.after(panel);editPanelState={panel,month:selected,owner,db:ojmDb};
    }
    host.querySelector('[data-audit-cleanup313]')?.addEventListener('click',()=>window.openAuditCleanup313(null,selected));
    host.querySelectorAll('[data-audit-filter14361]').forEach(button=>{button.onclick=()=>{auditFilter14361=button.dataset.auditFilter14361;if(page&&!remote)page.offset=0;if(remote){window.auditPage143198.move(0,auditFilter14361).catch(()=>{});return;}renderVoidedTransactionsTable();host.querySelector(`[data-audit-filter14361="${auditFilter14361}"]`)?.focus()}});
    host.querySelectorAll('[data-audit-open14361]').forEach(row=>{row.onclick=e=>{if(e.target.closest('button,a,input,select,textarea,summary,details'))return;openAudit14361(shown[Number(row.dataset.auditOpen14361)],row)};row.onkeydown=e=>{if(e.target===row&&(e.key==='Enter'||e.key===' ')){e.preventDefault();row.click()}}});
    host.querySelectorAll('[data-audit-page143198]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await window.auditPage143198.move(Number(b.dataset.auditPage143198));host.scrollIntoView({block:'start'});}catch{}finally{b.disabled=false;}});
    historyMonth14341.bind(host,'audit',()=>window.auditPage143198.month().catch(()=>{}),'local');
  };

  // CSV is imported as an editable draft only; the existing Post Entry validation still applies.
  function parseCSV(text) {
    const rows=[];let row=[],cell='',quoted=false;
    for(let i=0;i<text.length;i++) {
      const c=text[i];
      if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
      else if(c===','&&!quoted){row.push(cell);cell=''}
      else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell=''}
      else cell+=c;
    }
    if(quoted)throw new Error('The CSV contains an unclosed quotation mark.');
    row.push(cell);if(row.some(v=>v.trim()))rows.push(row);return rows;
  }
  window.importJournalDraft98 = async function (file) {
    if(!file)return;const owner=liveProfile?.id;if(!owner)return;
    try {
      const rows=parseCSV((await file.text()).replace(/^\uFEFF/,''));
      if(liveProfile?.id!==owner)return;
      const head=(rows.shift()||[]).map(s=>s.trim().toLowerCase());
      const column=(...names)=>head.findIndex(h=>names.includes(h));
      const ai=column('account'),di=column('dr','debit'),ci=column('cr','credit'),mi=column('memo','memo / reference','description'),datei=column('date'),currencyi=column('currency');
      if(ai<0||di<0||ci<0)throw new Error('Use CSV columns Account, DR, CR, with optional Date and Memo.');
      const entries=rows.map((r,i)=>{
        const account=getSelectedAccountInfo(r[ai]||'');
        if(!account)throw new Error(`Row ${i+2}: choose an existing account (${r[ai]||'blank'}).`);
        const number=value=>{const raw=String(value||'').trim();if(!raw||raw==='-')return 0;const n=Number(raw.replaceAll(',',''));if(!Number.isFinite(n)||n<0)throw new Error(`Row ${i+2}: enter a positive amount.`);return n};
        const dr=number(r[di]),cr=number(r[ci]);if((dr>0)===(cr>0))throw new Error(`Row ${i+2}: enter either DR or CR.`);
        if(currencyi>=0&&r[currencyi]&&r[currencyi].trim().toUpperCase()!==account.currency)throw new Error(`Row ${i+2}: currency must match ${account.currency}.`);
        const date=(datei>=0?r[datei]:'')||byId('jeTransDate').value;
        if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw new Error(`Row ${i+2}: use a date in YYYY-MM-DD format.`);
        return {account,dr,cr,date,memo:mi>=0?r[mi]:''};
      });
      if(!entries.length)throw new Error('No journal lines were found.');
      const apply=()=>{
        if(liveProfile?.id!==owner)return;
        clearJournalEntry();byId('jeLinesBody').replaceChildren();
        byId('jeTransDate').value=entries[0].date;
        setJournalDateMode(new Set(entries.map(e=>e.date)).size>1);
        byId('jeGeneralMemo').value=`Imported draft: ${file.name}`;
        entries.forEach(e=>{addJournalLineRow(`${e.account.code} — ${e.account.name}`,e.memo,String(e.dr||''),{[e.account.currency]:String(e.cr||'')});byId('jeLinesBody').lastElementChild.querySelector('.je-line-date').value=e.date});
        calculateJournalBalance();showJournalEntry98();showCenterStatus('Imported as a draft. Review before posting.');
      };
      showAppConfirm('Import Journal Draft',`Load ${entries.length} lines from ${escapeHtml(file.name)}? This replaces the current entry form. Nothing is posted until you press Post Entry.`,'Load Draft',apply,false);
    }catch(error){if(liveProfile?.id!==owner)return;showAppNotification('Import Could Not Load',error.message,true)}
  };
  window.exportJournalCSV=function(){
    const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
    const rows=[['Date','Entry ID','Account','Memo','Currency','DR','CR'],...[...JournalModule.entries].sort((a,b)=>String(a.date).localeCompare(String(b.date))).map(e=>[e.date,e.id,e.account,e.memo,e.currency,e.debit,e.credit])];
    const url=URL.createObjectURL(new Blob([rows.map(row=>row.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'}));
    const link=document.createElement('a');link.href=url;link.download='journal_transactions.csv';(window.exportCenter14337?exportCenter14337.fromLink(link):link.click());setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  function mount() {
    const shell=byId('categoryTabShell'),journal=byId('journal');
    if(!shell||!journal||byId('transactionsHeading98'))return;
    const heading=document.createElement('header');heading.id='transactionsHeading98';heading.className='transactions-heading98 no-print';heading.innerHTML='<h1>Transactions</h1>';shell.before(heading);
    byId('journalEntry98').hidden=false;
    setupJournalColumns();calculateJournalBalance();syncTitle();renderVoidedTransactionsTable();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
