/* Journal presentation and monthly audit review. Existing posting rules remain authoritative. */
(function () {
  'use strict';
  const esc = value => escapeHtml(String(value ?? ''));
  const byId = id => document.getElementById(id);
  const auditOpen = new Set();
  const severity = action => /DELETE|REMOVE|PURGE|CANCEL/.test(action) ? 'destructive' : /VOID/.test(action) ? 'void' : /UPDATE|MODIFY|EDIT|ADJUST/.test(action) ? 'edit' : 'info';

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
      description = state.differences.map(d => `${d.date} · ${d.currency}: ${formatAppNumber(Math.abs(d.debit-d.credit))}`).join('\n');
    }
    const invalid = empty || !!difference || !!state.errors.length;
    if (badge.textContent !== label) badge.textContent = label;
    badge.title = description;
    badge.setAttribute('aria-label', `${label}. ${description}`);
    badge.className = 'je-status-badge ' + (invalid ? 'unbalanced' : 'balanced');
    if (post) post.disabled = invalid;
  };

  window.selectAuditLogRow = function(row) {
    document.querySelectorAll('#auditMonths98 .audit-row-selected').forEach(n=>n.classList.remove('audit-row-selected'));
    row?.classList.add('audit-row-selected');
  };
  window.filterAudit69 = function () { renderVoidedTransactionsTable(); };
  window.renderVoidedTransactionsTable = function () {
    const original = byId('tblVoidedTransactions');
    if (!original) return;
    original.closest('.table-container').hidden = true;
    let host = byId('auditMonths98');
    if (!host) { host = document.createElement('div'); host.id='auditMonths98'; original.closest('.table-container').after(host); }
    const query = (byId('auditSearch69')?.value || '').trim().toLowerCase();
    const local = (JournalModule.voidedEntries || []).map((item,i) => ({id:`local-${i}`,record_id:item.id,action:'ADJUSTMENT',reason:item.explanation,old_data:item.oldData,new_data:item.newData,created_at:item.timestamp}));
    const records = [...(LiveTransactionAudit || []),...local].sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
    const groups = new Map();
    records.forEach(item => {
      if (query && !`${JSON.stringify(item)} ${getLiveUserName(item.actor_id)||''}`.toLowerCase().includes(query)) return;
      const month = /^\d{4}-\d{2}/.exec(item.created_at||'')?.[0] || 'unknown';
      if (!groups.has(month)) groups.set(month,[]);
      groups.get(month).push(item);
    });
    host.innerHTML = [...groups].map(([month,items],groupIndex) => {
      const counts = new Map();
      items.forEach(item=>{const action=String(item.action||'CHANGE').toUpperCase();counts.set(action,(counts.get(action)||0)+1)});
      const badges = [...counts].map(([action,count])=>`<span class="audit-count98 ${severity(action)}">${esc(action.replaceAll('_',' '))} <b>${count}</b></span>`).join('');
      const rows = items.map((item,index)=> {
        const action=String(item.action||'CHANGE').toUpperCase(),key=`audit98-${groupIndex}-${index}`;
        return `<tr class="audit-summary-row" tabindex="0" data-audit-severity="${severity(action)}" data-audit-search="${esc(JSON.stringify(item))}" aria-expanded="false" onclick="selectAuditLogRow(this);toggleAuditDetails('${key}',this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}"><td class="audit-expand-cell">▶</td><td>${formatAppDate(item.created_at,true)}</td><td>${esc(auditRecordId(item))}</td><td><span class="audit-count98 ${severity(action)}">${esc(action.replaceAll('_',' '))}</span></td><td>${esc(item.reason||item.new_data?.status||'—')}</td><td>${esc(getLiveUserName(item.actor_id)||'System')}</td></tr><tr id="${key}" class="audit-detail-row" hidden><td colspan="6"><div class="audit-detail-panel">${auditComparisonHtml(item.old_data,item.new_data,item.action)}</div></td></tr>`;
      }).join('');
      return `<details class="archive-month archive-aligned85 audit-month98" data-month98="${esc(month)}" ${query||auditOpen.has(month)?'open':''}><summary><span class="audit-month-title98"><strong>${esc(month==='unknown'?'Date unavailable':monthLabel(month))}</strong><small>${items.length} audit records</small></span><span class="audit-counts98">${badges}</span></summary><div class="table-container"><table class="audit-table98"><thead><tr><th aria-label="Expand record"></th><th>Date &amp; Time</th><th>Record</th><th>Audit Action</th><th>Reason / Note</th><th>Recorded By</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
    }).join('') || '<p class="period-empty">No audit records match this view.</p>';
    host.querySelectorAll('details').forEach(d=>d.addEventListener('toggle',()=>{
      if (query || !d.isConnected) return;
      if(d.open)auditOpen.add(d.dataset.month98);else auditOpen.delete(d.dataset.month98);
    }));
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
    if(!file)return;
    try {
      const rows=parseCSV((await file.text()).replace(/^\uFEFF/,''));
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
        if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date)))throw new Error(`Row ${i+2}: use a date in YYYY-MM-DD format.`);
        return {account,dr,cr,date,memo:mi>=0?r[mi]:''};
      });
      if(!entries.length)throw new Error('No journal lines were found.');
      const apply=()=>{
        clearJournalEntry();byId('jeLinesBody').replaceChildren();
        byId('jeTransDate').value=entries[0].date;
        setJournalDateMode(new Set(entries.map(e=>e.date)).size>1);
        byId('jeGeneralMemo').value=`Imported draft: ${file.name}`;
        entries.forEach(e=>{addJournalLineRow(`${e.account.code} — ${e.account.name}`,e.memo,String(e.dr||''),{[e.account.currency]:String(e.cr||'')});byId('jeLinesBody').lastElementChild.querySelector('.je-line-date').value=e.date});
        calculateJournalBalance();showJournalEntry98();showCenterStatus('Imported as a draft. Review before posting.');
      };
      showAppConfirm('Import Journal Draft',`Load ${entries.length} lines from ${file.name}? This replaces the current entry form. Nothing is posted until you press Post Entry.`,'Load Draft',apply,false);
    }catch(error){showAppNotification('Import Could Not Load',error.message,true)}
  };
  window.exportJournalCSV=function(){
    const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
    const rows=[['Date','Entry ID','Account','Memo','Currency','DR','CR'],...[...JournalModule.entries].sort((a,b)=>String(a.date).localeCompare(String(b.date))).map(e=>[e.date,e.id,e.account,e.memo,e.currency,e.debit,e.credit])];
    const url=URL.createObjectURL(new Blob([rows.map(row=>row.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'}));
    const link=document.createElement('a');link.href=url;link.download='journal_transactions.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
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
