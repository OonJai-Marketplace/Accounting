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
    badge.hidden = empty;
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
    badge.title = description;
    badge.setAttribute('aria-label', `${label}. ${description}`);
    badge.className = 'je-status-badge ' + (invalid ? 'unbalanced' : 'balanced');
    if (post) post.disabled = invalid;
  };

  // Important changes only. Routine events remain in the stored audit trail.
  let auditFilter14361='all',auditOwner14361='',auditDetailRequest143198=0;
  const auditAction14361=item=>String(item.action||'CHANGE').toUpperCase();
  function auditKind14361(item){
    const action=auditAction14361(item),after=item.new_data||{};
    if(item.group143198)return {group:item.group143198,tier:'yellow',label:({routine:action.replaceAll('_',' '),voids:'Voided',corrections:'Correction / adjustment',periods:'Period change',schedules:'Schedule change',deletions:'Deletion / cancellation',reviews:'Review required'})[item.group143198]||action};
    if(action==='VOID_PENDING')return {group:'voids',tier:'red',label:'Void · pending sync'};
    if(action==='DELETE_PENDING')return {group:'deletions',tier:'red',label:'Deletion · pending sync'};
    if(item.deletePolicy143124==='green')return {group:'routine',tier:'green',label:action.replaceAll('_',' ')};
    if(item.voidedJournal143122&&['POST','AUTO_POST'].includes(action))return {group:'voids',tier:'red',label:'Voided entry — remaining posting record'};
    if(['POST','AUTO_POST','SCHEDULE_POST_ADVANCE','CREATE_SCHEDULE','MAINTENANCE_CLOSE','SUBMIT','REVIEW','REVIEW_FORWARD','APPROVE','APPROVE_AND_POST','LINK'].includes(action))return item.deletePolicy143124==='protected'?{group:'reviews',tier:'yellow',label:'Protected '+action.replaceAll('_',' ')}:null;
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
  const auditGroups14361=[['all','All audit events'],['routine','Routine events'],['voids','Voided'],['corrections','Corrections'],['periods','Period changes'],['schedules','Schedule changes'],['deletions','Deletions / cancellations'],['reviews','Review required']];
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
  window.renderVoidedTransactionsTable = function () {
    const original=byId('tblVoidedTransactions');if(!original)return;original.closest('.table-container').hidden=true;
    let host=byId('auditMonths98');if(!host){host=document.createElement('div');host.id='auditMonths98';original.closest('.table-container').after(host)}host.dataset.historySearch='off';
    const owner=typeof liveProfile==='undefined'?'':liveProfile?.id;if(auditOwner14361!==owner){auditOwner14361=owner;auditFilter14361='all'}
    const local=(JournalModule.voidedEntries||[]).map((item,i)=>({id:`local-${i}`,record_id:item.id,action:'ADJUSTMENT',reason:item.explanation,old_data:item.oldData,new_data:item.newData,created_at:item.timestamp}));
    const records=[...(LiveTransactionAudit||[])].filter(auditKind14361).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
    const selected=historyMonth14341.choose('audit',records.map(r=>String(r.created_at||'').slice(0,7))),month=records.filter(item=>String(item.created_at||'').slice(0,7)===selected);
    const page=window.auditPage143198?.state(),remote=page?.loaded&&!page.offline&&page.month===selected;
    if(remote)auditFilter14361=page.group;
    const count=key=>remote?(key==='all'?Object.values(page.counts).reduce((n,v)=>n+Number(v),0):Number(page.counts[key]||0)):(key==='all'?month.length:month.filter(item=>auditKind14361(item).group===key).length);
    const cards=auditGroups14361.filter(([key])=>key==='all'||count(key)).map(([key,label])=>`<button type="button" class="period-summary-card" data-audit-filter14361="${key}" aria-pressed="${auditFilter14361===key}"><span>${label}</span><strong>${count(key)}</strong></button>`).join('');
    const matching=month.filter(item=>auditFilter14361==='all'||auditKind14361(item).group===auditFilter14361),shown=remote?matching.slice(0,50):matching.slice(page?.offset||0,(page?.offset||0)+50);
    const paging=remote?page:{...page,total:matching.length,offset:page?.offset||0};
    const pager=(page?.offline?'<p>Showing downloaded audit records. Connect to browse the complete history.</p>':'')+(page?`<div class="archive-month-actions no-print"><button type="button" class="je-btn je-btn-secondary" data-audit-page143198="${Math.max(0,paging.offset-50)}" ${paging.offset?'':'disabled'}>Previous</button><span>${paging.total?Math.min(paging.offset+1,paging.total):0}–${Math.min(paging.offset+50,paging.total)} of ${paging.total}</span><button type="button" class="je-btn je-btn-secondary" data-audit-page143198="${paging.offset+50}" ${paging.offset+50>=paging.total?'disabled':''}>Next</button></div>`:'');
    const rows=shown.map((item,index)=>{const kind=auditKind14361(item);return `<tr class="audit-summary-row" tabindex="0" data-audit-open14361="${index}" data-audit-search="${esc(JSON.stringify({id:item.id,auditSource1434:item.auditSource1434,record_id:item.record_id,action:item.action,deletePolicy143124:item.deletePolicy143124,old_data:{entry_no:item.old_data?.entry_no},new_data:{entry_no:item.new_data?.entry_no},summary143198:true}))}" aria-haspopup="dialog" aria-label="View ${esc(kind.label)} ${esc(auditRecordId(item))}"><td>${formatAppDate(item.created_at,true)}</td><td>${esc(auditRecordId(item))}</td><td>${esc(kind.label)}</td><td>${esc(item.reason||'—')}</td><td>${esc(getLiveUserName(item.actor_id)||'System')}</td></tr>`}).join('');
    host.innerHTML=historyMonth14341.control('audit',selected)+`<div class="period-summary-grid audit-filters14361">${cards}</div>${pager}<section class="archive-month audit-month98"><div class="table-container"><table class="audit-table98"><thead><tr><th>Date &amp; Time</th><th>Record</th><th>Audit Action</th><th>Reason / Note</th><th>Recorded By</th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="period-empty">No audit events match this month and category.</td></tr>'}</tbody></table></div></section>${pager}`;
    host.querySelectorAll('[data-audit-filter14361]').forEach(button=>{button.onclick=()=>{auditFilter14361=button.dataset.auditFilter14361;if(remote){window.auditPage143198.move(0,auditFilter14361).catch(()=>{});return;}renderVoidedTransactionsTable();host.querySelector(`[data-audit-filter14361="${auditFilter14361}"]`)?.focus()}});
    host.querySelectorAll('[data-audit-open14361]').forEach(row=>{row.onclick=e=>{if(e.target.closest('[data-delete-record1434]'))return;openAudit14361(shown[Number(row.dataset.auditOpen14361)],row)};row.onkeydown=e=>{if(e.target===row&&(e.key==='Enter'||e.key===' ')){e.preventDefault();row.click()}}});
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
