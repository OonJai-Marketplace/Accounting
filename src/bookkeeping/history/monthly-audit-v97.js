  function toggleAuditMonth97(month, button) {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    document.querySelectorAll(`[data-audit-month97="${CSS.escape(month)}"]`).forEach(row => { row.hidden = !open; });
    button.querySelector('.audit-month-caret97').textContent = open ? '▼' : '▶';
  }
  window.toggleAuditMonth97 = toggleAuditMonth97;

  function toggleTransactionMonth97(month, button) {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    document.querySelectorAll(`[data-history-month97="${CSS.escape(month)}"]`).forEach(row => { row.hidden = !open; });
    button.querySelector('.history-month-caret97').textContent = open ? '▼' : '▶';
  }
  window.toggleTransactionMonth97 = toggleTransactionMonth97;

  // Keep the existing year/archive filtering, but present the resulting rows
  // in collapsible month groups as the user requested for Transaction History.
  if (typeof window.renderAllTransactionsTable === 'function') {
    const renderAllBefore97 = window.renderAllTransactionsTable;
    window.renderAllTransactionsTable = function (...args) {
      const body = document.getElementById('allTransactionsBody');
      if (!body) return renderAllBefore97.apply(this, args);
      renderAllBefore97.apply(this, args);
      const transactions = new Map();
      [...body.rows].forEach(row => {
        const id = row.dataset.entryId || `row-${transactions.size}`;
        if (!transactions.has(id)) transactions.set(id, []);
        transactions.get(id).push(row);
      });
      const months = new Map();
      transactions.forEach(rows => {
        const raw = rows[0]?.dataset.createdAt || '';
        const parsed = new Date(raw);
        const month = Number.isNaN(parsed.getTime()) ? 'unknown' : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
        if (!months.has(month)) months.set(month, []);
        months.get(month).push(...rows);
      });
      const header = document.getElementById('thAllTransRow');
      const colspan = Math.max(1, header?.cells.length || 1);
      const ordered = [...months.entries()].sort(([a], [b]) => b.localeCompare(a));
      const newest = ordered[0]?.[0];
      const fragments = [];
      ordered.forEach(([month, rows]) => {
        const open = month === newest;
        const label = month === 'unknown' ? 'Date unavailable' : new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        const heading = document.createElement('tr');
        heading.className = 'transaction-month-heading97';
        const cell = document.createElement('td'); cell.colSpan = colspan;
        cell.innerHTML = `<button type="button" aria-expanded="${open}" onclick="toggleTransactionMonth97('${escape(month)}',this)"><span class="history-month-caret97">${open ? '▼' : '▶'}</span><strong>${escape(label)}</strong><span>${new Set(rows.map(row => row.dataset.entryId)).size} transactions</span></button>`;
        heading.append(cell); fragments.push(heading);
        rows.forEach(row => { row.dataset.historyMonth97 = month; row.hidden = !open; fragments.push(row); });
      });
      body.replaceChildren(...fragments);
    };
  }

  const auditActions97 = new Set(['VOID','UPDATE','MODIFY','MARK_UNDER_REVIEW','APPROVE_AND_POST','PERIOD_STATUS','DELETE_SCHEDULE','UPDATE_SCHEDULE','CREATE_SCHEDULE','SCHEDULE_POST_ADVANCE','AUTO_POST']);
  window.renderVoidedTransactionsTable = function () {
    const header = document.getElementById('thVoidedTransRow'), body = document.getElementById('voidedTransactionsBody');
    if (!body) return;
    if (header) header.innerHTML = '<th></th><th>Date &amp; Time</th><th>Record</th><th>Audit Action</th><th>Reason / Note</th><th>Recorded By</th>';
    const live = (LiveTransactionAudit || []).filter(item => auditActions97.has(item.action) || /DELETE|REMOVE|PURGE/.test(String(item.action).toUpperCase()));
    const local = (JournalModule.voidedEntries || []).map((item, index) => ({ id: item.id || `local-${index}`, record_id: item.id, action: 'ADJUSTMENT', reason: item.explanation, old_data: item.oldData, new_data: item.newData, created_at: item.timestamp, actor_id: null }));
    const audits = [...live, ...local].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    const months = new Map();
    audits.forEach(item => {
      const date = new Date(item.created_at || '');
      const key = Number.isNaN(date.getTime()) ? 'unknown' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!months.has(key)) months.set(key, []);
      months.get(key).push(item);
    });
    const detailColspan = 6;
    body.innerHTML = months.size ? [...months.entries()].map(([month, rows]) => {
      const safe = escape(month), label = month === 'unknown' ? 'Date unavailable' : new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      const detailRows = rows.map((item, index) => {
        const key = `audit-detail97-${month.replace(/\D/g, '')}-${index}`, record = auditRecordId(item);
        return `<tr class="audit-summary-row" data-audit-month97="${safe}" data-audit-search="${escape(JSON.stringify(item))}" onclick="selectAuditLogRow(this);toggleAuditDetails('${key}',this)" aria-expanded="false"><td>↳</td><td>${window.formatAppDate(item.created_at, true)}</td><td style="font-family:monospace">${escape(record)}</td><td><span class="submission-status ${item.action === 'VOID' ? 'returned' : 'posted'}">${escape(String(item.action || 'CHANGE').replaceAll('_', ' '))}</span></td><td>${escape(item.reason || item.new_data?.status || '—')}</td><td>${escape(window.getLiveUserName(item.actor_id) || 'System')}</td></tr><tr id="${key}" class="audit-detail-row" data-audit-month97="${safe}" hidden><td colspan="${detailColspan}"><div class="audit-detail-panel">${window.auditComparisonHtml(item.old_data, item.new_data, item.action)}</div></td></tr>`;
      }).join('');
      return `<tr class="audit-month-heading97"><td colspan="${detailColspan}"><button type="button" aria-expanded="false" onclick="toggleAuditMonth97('${safe}',this)"><span class="audit-month-caret97">▶</span><strong>${escape(label)}</strong><span>${rows.length} record${rows.length === 1 ? '' : 's'}</span></button></td></tr>${detailRows}`;
    }).join('') : '<tr><td colspan="6" class="period-empty">No void, correction, or period-review audit records yet.</td></tr>';
  };

  window.loadTransactionAudit = async function () {
    if (typeof ojmDb === 'undefined' || !ojmDb || typeof liveProfile === 'undefined' || !liveProfile) return;
    const pageSize = 500, rows = [];
    try {
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await ojmDb.from('audit_log')
          .select('id,record_id,action,reason,old_data,new_data,actor_id,created_at')
          .in('table_name', ['journal_entries','accounting_periods','period_findings','scheduled_journals'])
          .order('created_at', { ascending: false }).range(offset, offset + pageSize - 1);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < pageSize) break;
      }
      LiveTransactionAudit = rows;
      window.renderVoidedTransactionsTable();
    } catch (error) {
      window.showAppNotification?.('Audit Log Could Not Load', error.message || 'Try reloading the Audit Log.', true);
    }
  };

  // The workspace login coordinator owns the one loading indicator below the buttons.

