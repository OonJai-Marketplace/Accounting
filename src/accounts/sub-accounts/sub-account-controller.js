// ==============================================================================


// ==============================================================================
// JS 5: MODULE 2 — SUB-ACCOUNTS CONTROLLER
// ==============================================================================
function syncSubAccountParentDropdown() {
  const select = document.getElementById('subParentCode');
  if (!select) return;
  select.innerHTML = '';
  select.add(new Option('Choose parent account…',''));
  AccountingStore.accounts.filter(acc=>acc.isPosting===false).sort((a,b)=>a.code.localeCompare(b.code,undefined,{numeric:true})).forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc.code;
    opt.textContent = `${acc.code} — ${acc.name}${window.AccountGroups14253?.type(acc)==='SYSTEM'?' · System':''}`;
    select.appendChild(opt);
  });
}

function renderSubAccountsTable() {
  const tbody = document.getElementById('subAccountTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const fragment=document.createDocumentFragment(),parents=new Map(AccountingStore.accounts.map(a=>[a.code,a]));
  AccountingStore.subAccounts.forEach(sub => {
    const parent = parents.get(sub.parentCode);
    const parentLabel = parent ? `${parent.code} — ${parent.name}` : sub.parentCode;
    const currency = sub.currency || parent?.currency || '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="parent-account-label">${escapeHtml(parentLabel)}</span></td>
      <td style="font-family: monospace; font-weight: 700; color: #064e3b;">${escapeHtml(sub.code)}</td>
      <td><span class="currency-symbol-badge" data-currency-code="${escapeHtml(currency)}" title="${escapeHtml(currency)}">${escapeHtml(currencySymbolV6(currency))}</span> <strong>${escapeHtml(sub.name)}</strong></td>
      <td style="color: var(--text-muted);">${escapeHtml(sub.desc || '—')}</td>
      <td style="text-align: right;">
        <div style="display: inline-flex; gap: 6px;">
          <button type="button" class="btn-action-edit" title="Edit Sub-Account" onclick="openEditSubAccountModal(${escapeHtml(JSON.stringify(sub.code))})">✏️</button>
          <button type="button" class="btn-action-delete" title="Delete Sub-Account" onclick="promptDeleteSubAccount(${escapeHtml(JSON.stringify(sub.code))})">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </td>
    `;
    fragment.appendChild(tr);
  });
  tbody.appendChild(fragment);
}

function syncSubAccountCurrencyDropdown(selected = '') {
  const select = document.getElementById('subCurrency');
  if (!select) return;
  select.replaceChildren(new Option('Choose currency…', ''));
  for (const currency of CurrencyStore.currencies.filter(c => c.active !== false)) {
    select.add(new Option(`${currency.code}${currency.name ? ' — ' + currency.name : ''}`, currency.code));
  }
  if (selected && !Array.from(select.options).some(o => o.value === selected)) {
    const unavailable = new Option(`${selected} — inactive; choose a currency`, selected);
    unavailable.disabled = true;
    select.add(unavailable);
  }
  select.value = selected;
  window.dropdown1434?.enhance(document.getElementById('formSubAccount'));
}

function openAddSubAccountModal() {
  syncSubAccountParentDropdown();
  document.getElementById('modalSubAccountTitle').innerText = 'Add Sub-Account';
  document.getElementById('subAccountOrigCode').value = '';
  document.getElementById('formSubAccount').reset();
  syncSubAccountCurrencyDropdown();
  openModal('modalSubAccount');
  document.getElementById('subCode').focus();
}

function openEditSubAccountModal(code) {
  const sub = AccountingStore.subAccounts.find(s => s.code === code);
  if (!sub) return;
  syncSubAccountParentDropdown();
  document.getElementById('modalSubAccountTitle').innerText = 'Edit Sub-Account';
  document.getElementById('subAccountOrigCode').value = sub.code;
  document.getElementById('subParentCode').value = sub.parentCode;
  document.getElementById('subCode').value = sub.code;
  document.getElementById('subName').value = sub.name;
  document.getElementById('subDesc').value = sub.desc || '';
  syncSubAccountCurrencyDropdown(sub.currency || AccountingStore.accounts.find(a => a.code === sub.parentCode)?.currency || '');
  openModal('modalSubAccount');
}

function handleSubAccountFormSubmit(event) {
  event.preventDefault();
  const origCode = document.getElementById('subAccountOrigCode').value;
  const parentCode = document.getElementById('subParentCode').value;
  const code = document.getElementById('subCode').value.trim();
  const name = document.getElementById('subName').value.trim();
  const desc = document.getElementById('subDesc').value.trim();
  const currency = document.getElementById('subCurrency').value;

  if (origCode) {
    const sub = AccountingStore.subAccounts.find(s => s.code === origCode);
    if (sub) {
      if (origCode !== code && AccountingStore.subAccounts.some(s => s.code === code)) {
        showAppNotification('Notice','Sub-Account code already exists.');
        return;
      }
      sub.parentCode = parentCode;
      sub.code = code;
      sub.name = name;
      sub.desc = desc;
      sub.currency = currency;
    }
  } else {
    if (AccountingStore.subAccounts.some(s => s.code === code)) {
      showAppNotification('Notice','Sub-Account code already exists.');
      return;
    }
    AccountingStore.subAccounts.push({ parentCode, code, name, desc, currency });
  }

  closeModal('modalSubAccount');
  renderSubAccountsTable();
}

function promptDeleteSubAccount(code) {
  const sub = AccountingStore.subAccounts.find(s => s.code === code);
  if (!sub) return;
  document.getElementById('confirmDeletePrompt').innerText = `Delete sub-account "${sub.code} — ${sub.name}"?`;
  openModal('modalConfirmDelete');

  document.getElementById('btnDeleteConfirmAction').onclick = function() {
    AccountingStore.subAccounts = AccountingStore.subAccounts.filter(s => s.code !== code);
    closeModal('modalConfirmDelete');
    renderSubAccountsTable();
  };
}
