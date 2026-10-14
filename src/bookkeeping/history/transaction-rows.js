// ==============================================================================


// ==============================================================================
// JS 5: CLUSTERED TABLE RENDERERS (HISTORY, NEW, ARCHIVE, VOIDED & EXPORT)
// Note: Renders newest on top (UI) but oldest on top when printing (isPrintMode).
// ==============================================================================
function renderTransactionRowsToTbody(tbody, records, showAction = false) {
  if (!tbody) return;
  tbody.innerHTML = '';

  const currencies = CurrencyStore.currencies || [];
  const totalColumns = 5 + currencies.length + (showAction ? 1 : 0);

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${totalColumns}" style="text-align: center; color: var(--text-muted); padding: 24px;">No matching transactions found.</td></tr>`;
    return;
  }

  // Screen: newest transaction first. Print: oldest transaction first.
  // Sort by transaction date, then Entry ID, while keeping all lines of one Entry ID together.
  const displayRecords = [...records].sort((a, b) => {
    const dateCmp = String(a.date).localeCompare(String(b.date));
    const idCmp = String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
    const cmp = dateCmp !== 0 ? dateCmp : idCmp;
    return isPrintMode ? cmp : -cmp;
  });

  const clusters = new Map();
  const fragment = document.createDocumentFragment();
  displayRecords.forEach(r => {
    const id = String(r.id);
    if (!clusters.has(id)) clusters.set(id, []);
    clusters.get(id).push(r);
  });

  clusters.forEach((lines, entryId) => {
    const totalLines = lines.length;
    const firstLine = lines[0];

    lines.forEach((line, idx) => {
      const tr = document.createElement('tr');
      tr.dataset.date = line.date || '';
      const isStart = idx === 0;
      tr.className = isStart ? 'cluster-row-start' : 'cluster-row-cont';

      const cleanAcc = getCleanAccountDisplay(line.account, line.currency);

      let crColumnsHtml = '';
      currencies.forEach(c => {
        const isMatch = line.currency === c.code && line.credit > 0;
        crColumnsHtml += `
          <td class="num" style="color: ${isMatch ? '#0f172a' : '#94a3b8'};">
            ${isMatch ? formatAppNumber(line.credit) : '-'}
          </td>
        `;
      });

      // Layout: Date | Entry ID | Account | Memo | DR | CRs | Action
      tr.innerHTML = `
        ${isStart ? `<td rowspan="${totalLines}" style="vertical-align: top; color: #1e293b;">${escapeHtml(formatAppDate(firstLine.date))}</td>` : ''}
        ${isStart ? `<td rowspan="${totalLines}" style="vertical-align: top; font-family: monospace; color: #065f46;">${escapeHtml(entryId)}</td>` : ''}
        
        <td><div class="transaction-account-display"><span class="currency-symbol-badge" data-currency-code="${escapeHtml(cleanAcc.currency || '')}" title="${escapeHtml(cleanAcc.currency || '')}">${escapeHtml(currencySymbolV6(cleanAcc.currency))}</span><span class="account-clean-name">${escapeHtml(cleanAcc.name)}</span></div></td>

        <td style="color: var(--text-muted);">${escapeHtml(line.memo)}</td>
        
        <td class="num" style="color: ${line.debit > 0 ? '#0f172a' : '#94a3b8'};">
          ${line.debit > 0 ? formatAppNumber(line.debit) : '-'}
        </td>
        
        ${crColumnsHtml}
        
        ${showAction && isStart ? `
          <td rowspan="${totalLines}" class="action-col no-print" style="vertical-align: middle; width: 40px;">
            <div style="display: flex; flex-direction: column; gap: 6px; align-items: center;">
              <button type="button" class="btn-action-edit" style="width: 24px; height: 24px;" onclick="loadEntryForEdit(${escapeHtml(JSON.stringify(entryId))})" title="Edit Entry">✏️</button>
              <button type="button" class="btn-action-delete" style="width: 24px; height: 24px;" onclick="deleteTransactionCluster(${escapeHtml(JSON.stringify(entryId))})" title="Delete Cluster">✕</button>
            </div>
          </td>` : ''}
      `;
      fragment.appendChild(tr);
    });

    if (firstLine.editReason) {
      const expTr = document.createElement('tr');
      expTr.className = 'cluster-explanation-row';
      expTr.innerHTML = `
        <td colspan="${totalColumns}">
          <strong style="color: #064e3b; font-weight: 600;">Modification Note:</strong> ${escapeHtml(firstLine.editReason)}
        </td>
      `;
      expTr.dataset.date = firstLine.date || '';
      fragment.appendChild(expTr);
    }
  });
  tbody.appendChild(fragment);
}

function renderJournalHistoryTable(records = JournalModule.entries) {
  const tbody = document.getElementById('tblJournalHistoryBody');
  renderTransactionRowsToTbody(tbody, records, true);
}

async function deleteTransactionCluster(id) {
  const actor = typeof liveProfile === 'undefined' ? '' : liveProfile?.id;
  if (await ui117.confirm(`Are you sure you want to delete transaction cluster ${escapeHtml(id)}?`)) {
    if (actor !== (typeof liveProfile === 'undefined' ? '' : liveProfile?.id)) return;
    JournalModule.entries = JournalModule.entries.filter(t => String(t.id) !== String(id));
    refreshAllTables();
  }
}

function filterJournalHistory() {
  const query = (document.getElementById('jeSearchInput')?.value || '').toLowerCase().trim();
  const filtered = JournalModule.entries.filter(entry => {
    return String(entry.account ?? '').toLowerCase().includes(query) ||
           String(entry.memo ?? '').toLowerCase().includes(query) ||
           String(entry.id ?? '').toLowerCase().includes(query);
  });
  renderJournalHistoryTable(filtered);
}

