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
    const selected=historyMonth14341.choose('audit',records.map(r=>String(r.created_at||'').slice(0,7)));
    const groups = new Map([[selected,[]]]);
    records.forEach(item => {
      if (query && !`${JSON.stringify(item)} ${getLiveUserName(item.actor_id)||''}`.toLowerCase().includes(query)) return;
      const month = /^\d{4}-\d{2}/.exec(item.created_at||'')?.[0] || 'unknown';
      if(month===selected)groups.get(month).push(item);
    });
    host.innerHTML = historyMonth14341.control('audit',selected)+[...groups].map(([month,items],groupIndex) => {
      const counts = new Map();
      items.forEach(item=>{const action=String(item.action||'CHANGE').toUpperCase();counts.set(action,(counts.get(action)||0)+1)});
      const badges = [...counts].map(([action,count])=>`<span class="audit-count98 ${severity(action)}">${esc(action.replaceAll('_',' '))} <b>${count}</b></span>`).join('');
      const rows = items.map((item,index)=> {
        const action=String(item.action||'CHANGE').toUpperCase(),key=`audit98-${groupIndex}-${index}`;
        return `<tr class="audit-summary-row" tabindex="0" data-audit-severity="${severity(action)}" data-audit-search="${esc(JSON.stringify(item))}" aria-expanded="false" onclick="selectAuditLogRow(this);toggleAuditDetails('${key}',this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}"><td class="audit-expand-cell">▶</td><td>${formatAppDate(item.created_at,true)}</td><td>${esc(auditRecordId(item))}</td><td><span class="audit-count98 ${severity(action)}">${esc(action.replaceAll('_',' '))}</span></td><td>${esc(item.reason||item.new_data?.status||'—')}</td><td>${esc(getLiveUserName(item.actor_id)||'System')}</td></tr><tr id="${key}" class="audit-detail-row" hidden><td colspan="6"><div class="audit-detail-panel">${auditComparisonHtml(item.old_data,item.new_data,item.action)}</div></td></tr>`;
      }).join('');
      return `<section class="archive-month archive-aligned85 audit-month98"><div class="history-summary14359"><strong>${items.length} audit records</strong><span class="audit-counts98">${badges}</span></div><div class="table-container"><table class="audit-table98"><thead><tr><th aria-label="Expand record"></th><th>Date &amp; Time</th><th>Record</th><th>Audit Action</th><th>Reason / Note</th><th>Recorded By</th></tr></thead><tbody>${rows||'<tr><td colspan="6" class="period-empty">No audit records in this month.</td></tr>'}</tbody></table></div></section>`;
    }).join('') || '<p class="period-empty">No audit records match this view.</p>';
    historyMonth14341.bind(host,'audit',renderVoidedTransactionsTable,'local');
  };

  // CSV is imported as an editable draft only; the existing Post Entry validation still applies.
