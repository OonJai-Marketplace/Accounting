// ==============================================================================


// ==============================================================================
// JS 4: MODULE 1 — CHART OF ACCOUNTS CONTROLLER (CURRENCY COLUMN & FILTER)
// ==============================================================================
function initCoaCurrencyFilter() {
  const filterSelect = document.getElementById('filterCoaCurrency');
  const modalSelect = document.getElementById('accCurrency');

  if (filterSelect) {
    const currentVal = filterSelect.value;
    filterSelect.innerHTML = '<option value="ALL">All Currencies</option>';
    CurrencyStore.currencies.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.code;
      opt.textContent = `${c.code} (${c.name})`;
      filterSelect.appendChild(opt);
    });
    filterSelect.value = [...filterSelect.options].some(o=>o.value===currentVal)?currentVal:'ALL';
  }

  if (modalSelect) {
    modalSelect.innerHTML = '';
    CurrencyStore.currencies.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.code;
      opt.textContent = `${c.code} — ${c.name}`;
      modalSelect.appendChild(opt);
    });
    modalSelect.insertAdjacentHTML('beforeend','<option value="__PARENT__">Parent account (non-posting)</option>');
  }
}

function syncCoaDatalist() {
  const dl = document.getElementById('coaList');
  if (!dl) return;
  dl.innerHTML = '';
  AccountingStore.accounts.filter(acc=>acc.isPosting!==false&&acc.is_posting!==false&&acc.active!==false&&acc.is_active!==false&&acc.currency!=='NA').forEach(acc => {
    const opt = document.createElement('option');
    opt.value = `${acc.name} (${acc.currency})`;
    opt.textContent = `${acc.code} — ${acc.type}`;
    dl.appendChild(opt);
  });
}

function renderChartOfAccountsTable() {
  const tbody = document.getElementById('coaTableBody');
  if (!tbody) return;

  const filterCurr = document.getElementById('filterCoaCurrency')?.value || 'ALL';
  const table=tbody.closest('table');
  table.dataset.preservePage14397='true';
  const filterKey=JSON.stringify([filterCurr,document.getElementById('searchCoa1439')?.value||'']);
  if(table.dataset.filterKey14397!==filterKey){window.tablePagination14383?.reset(table);table.dataset.filterKey14397=filterKey}
  tbody.innerHTML = '';

  const terms=(document.getElementById('searchCoa1439')?.value||'').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const visibleAccounts = AccountingStore.accounts.filter(acc => {
    const text=[acc.code,acc.name,acc.currency,currencySymbolV6(acc.currency),acc.type,acc.desc].join(' ').toLocaleLowerCase();
    return (filterCurr === 'ALL' || acc.currency === filterCurr)&&terms.every(term=>text.includes(term));
  });

  if (visibleAccounts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">No accounts match your search.</td></tr>`;
    window.tablePagination14383?.refresh(table);syncSubAccountParentDropdown();syncCoaDatalist();return;
  }

  const fragment=document.createDocumentFragment();
  visibleAccounts.forEach(acc => {
    const badgeClass = `badge-${String(acc.type||'').toLowerCase().replace(/[^a-z-]/g,'')}`;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family: monospace; font-weight: 700; color: #064e3b;">${escapeHtml(acc.code)}</td>
      <td><strong class="${acc.isTechnical||acc.type==='SYSTEM'?'system-account-name14399':''}">${escapeHtml(acc.name)}${acc.isTechnical||acc.type==='SYSTEM'?' <small class="system-account-badge14399">SYSTEM</small>':''}</strong></td>
      <td><span class="currency-tag" data-currency-code="${escapeHtml(acc.currency)}" title="${escapeHtml(acc.isPosting===false?'Grouping account':acc.currency)}">${acc.isPosting===false?'Parent':escapeHtml(currencySymbolV6(acc.currency)+' '+acc.currency)}</span></td>
      <td><span class="badge-type ${badgeClass}">${escapeHtml(acc.type)}</span></td>
      <td style="color: var(--text-muted);">${escapeHtml(acc.desc || '—')}</td>
      <td style="text-align: right;">
        <div style="display: inline-flex; gap: 6px;">
          <button type="button" class="btn-action-edit" title="Edit Account" onclick="openEditAccountModal(${escapeHtml(JSON.stringify(acc.code))})">✏️</button>
          <button type="button" class="btn-action-delete" title="Delete Account" onclick="promptDeleteAccount(${escapeHtml(JSON.stringify(acc.code))})">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </td>
    `;
    fragment.appendChild(tr);
  });

  tbody.appendChild(fragment);
  // Apply the retained page before the browser paints rebuilt rows.
  window.tablePagination14383?.refresh(table);
  syncSubAccountParentDropdown();
  syncCoaDatalist();
}

function configureAccountPurpose87(systemOnly=false){
 const select=document.getElementById('accPurpose71');
 select.innerHTML=(systemOnly?'<option value="" disabled selected>Select account purpose</option>':'<option value="regular">Regular</option>')+'<option value="mapping">Mapping</option><option value="clearing">Clearing</option><option value="suspense">Suspense</option><option value="settlement">Payment Settlement</option><option value="payroll">Payroll Control</option><option value="opening">Opening Balance Offset</option>';
 select.dataset.systemOnly=String(systemOnly);
}
function openAddAccountModal(systemOnly=false) {
  configureAccountPurpose87(systemOnly);
  initCoaCurrencyFilter();
  document.getElementById('modalAccountTitle').innerText = systemOnly?'Add System Account':'Add New Account';
  document.getElementById('accountOrigCode').value = '';
  document.getElementById('formAccount').reset();
  document.getElementById('accPurpose71').value=systemOnly?'':'regular';
  window.ForeignFunds14386?.form('acc',false);
  openModal('modalAccount');
  document.getElementById('accCode').focus();
}

function openEditAccountModal(code) {
  const child=AccountingStore.accounts.find(a=>a.code===code&&a.subAccountId14285);if(child)return openEditSubAccountModal(code);
  configureAccountPurpose87(false);
  const acc = AccountingStore.accounts.find(a => a.code === code);
  if (!acc) return;
  initCoaCurrencyFilter();
  document.getElementById('modalAccountTitle').innerText = 'Edit Account';
  document.getElementById('accountOrigCode').value = acc.code;
  document.getElementById('accCode').value = acc.code;
  document.getElementById('accName').value = acc.name;
  document.getElementById('accCurrency').value = acc.isPosting===false?'__PARENT__':acc.currency;
  document.getElementById('accType').value = acc.type;
  document.getElementById('accDesc').value = acc.desc || '';
  document.getElementById('accPurpose71').value=acc.purpose||'regular';
  window.ForeignFunds14386?.form('acc',acc.trackForeignFunds);
  openModal('modalAccount');
}

function handleAccountFormSubmit(event) {
  event.preventDefault();
  const origCode = document.getElementById('accountOrigCode').value;
  const code = document.getElementById('accCode').value.trim();
  const name = document.getElementById('accName').value.trim();
  const currency = document.getElementById('accCurrency').value;
  const type = document.getElementById('accType').value;
  const desc = document.getElementById('accDesc').value.trim();

  if (origCode) {
    const acc = AccountingStore.accounts.find(a => a.code === origCode);
    if (acc) {
      if (origCode !== code && AccountingStore.accounts.some(a => a.code === code)) {
        showAppNotification('Notice','Account Code already in use.');
        return;
      }
      if (origCode !== code) {
        AccountingStore.subAccounts.forEach(sub => {
          if (sub.parentCode === origCode) sub.parentCode = code;
        });
      }
      acc.code = code;
      acc.name = name;
      acc.currency = currency;
      acc.type = type;
      acc.desc = desc;
    }
  } else {
    if (AccountingStore.accounts.some(a => a.code === code)) {
      showAppNotification('Notice','Account Code already exists.');
      return;
    }
    AccountingStore.accounts.push({ code, name, currency, type, desc });
  }

  closeModal('modalAccount');
  renderChartOfAccountsTable();
  renderSubAccountsTable();
}

function promptDeleteAccount(code) {
  const acc = AccountingStore.accounts.find(a => a.code === code);
  if (!acc) return;
  const count = AccountingStore.subAccounts.filter(s => s.parentCode === code).length;
  let text = `Delete account "${acc.code} — ${acc.name}"?`;
  if (count > 0) text += ` Note: ${count} linked sub-account(s) will also be removed.`;

  document.getElementById('confirmDeletePrompt').innerText = text;
  openModal('modalConfirmDelete');

  document.getElementById('btnDeleteConfirmAction').onclick = function() {
    AccountingStore.subAccounts = AccountingStore.subAccounts.filter(s => s.parentCode !== code);
    AccountingStore.accounts = AccountingStore.accounts.filter(a => a.code !== code);
    closeModal('modalConfirmDelete');
    renderChartOfAccountsTable();
    renderSubAccountsTable();
  };
}
