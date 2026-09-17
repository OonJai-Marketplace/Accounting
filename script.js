// --- GLOBAL SYSTEM STATE ---
let currentUserRole = "admin";
let currencies = ["USD", "LAK"];
let baseCurrency = "USD"; 

let accounts = [
  { code: "1010", name: "Operating Cash", type: "Asset", currency: "USD" },
  { code: "1020", name: "Main Bank Account", type: "Asset", currency: "USD" },
  { code: "2010", name: "Accounts Payable", type: "Liability", currency: "USD" },
  { code: "3010", name: "Owner Equity", type: "Equity", currency: "USD" },
  { code: "4010", name: "Operating Sales", type: "Revenue", currency: "USD" },
  { code: "5010", name: "General Expenses", type: "Expense", currency: "USD" }
];

let subAccounts = [
  { id: "SUB-1", name: "Kitchen Petty Cash", desc: "Daily market produce", currency: "USD" }
];
let activeSubAccountId = "SUB-1";
let subAccountLogs = { "SUB-1": [] };

let journalEntries = [];
let entryCounter = 1;
let subCounter = 1;

let chartInstance = null;
let chartCheckedAccounts = ['1010', '1020', '2010']; // State tracker for graph selections

let editingJournalId = null;
let editingSubVoucherId = null;
let editingCoaCode = null; 

let uploadedHeaderImg = "";
let uploadedFooterImg = "";
let uploadedLogoImg = "";

window.onload = function() {
  const defaultDate = "2026-09-17";
  const defaultMonth = "2026-09";
  document.getElementById('jeDate').value = defaultDate;
  document.getElementById('subEntryDate').value = defaultDate;

  injectSampleData();
  
  updateCompanyProfile();
  refreshAllCurrencyDropdowns(); 
  renderSettingsCurrencyList();
  refreshAccountDropdowns();
  renderChartOfAccounts();
  setupJournalColumns();
  initSummaryChart();
  renderTrialBalance();
  generateAutomatedReports();
  renderSettingsSubAccounts();
  populateSubAccountDropdowns();
  renderJournalLog();
};

function toggleMenu() {
  document.getElementById('navMenuBar').classList.toggle('open');
}

// STRICT NUMBER FORMATTING (#,###.00)
function formatNum(num) {
  if (num === null || num === undefined || isNaN(num) || num === '') return '-';
  if (Number(num) === 0) return '0.00';
  return Number(num).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function getEntryPrefix() {
  const name = document.getElementById('settingCompanyName').value.trim() || 'Oon Jai Marketplace';
  const words = name.split(/\s+/).filter(w => w.length > 0);
  let init = '';
  if (words.length === 1) init = words[0].substring(0, 3).toUpperCase();
  else if (words.length === 2) init = (words[0][0] + words[1][0]).toUpperCase();
  else if (words.length >= 3) init = (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  return init || 'JE';
}

function injectSampleData() {
  const pfx = getEntryPrefix();
  journalEntries.push({
    entryId: `${pfx}-0001`, date: "2026-09-01", desc: "Initial Capital Investment",
    lines: [
      { accountCode: "1020", memo: "Deposit", currency: "USD", dr: 10000, cr: 0 },
      { accountCode: "3010", memo: "Capital", currency: "USD", dr: 0, cr: 10000 }
    ]
  });
  journalEntries.push({
    entryId: `${pfx}-0002`, date: "2026-09-15", desc: "Office Supplies",
    lines: [
      { accountCode: "5010", memo: "Pens & Paper", currency: "USD", dr: 150, cr: 0 },
      { accountCode: "1010", memo: "Cash paid", currency: "USD", dr: 0, cr: 150 }
    ]
  });
  entryCounter = 3;

  subAccountLogs["SUB-1"].push({ voucherId: "V-0001", date: "2026-09-05", category: "Supplies / Materials", desc: "Initial funding", inAmount: 500, outAmount: 0 });
  subAccountLogs["SUB-1"].push({ voucherId: "V-0002", date: "2026-09-16", category: "Meals & Refreshments", desc: "Staff lunch", inAmount: 0, outAmount: 45 });
  subCounter = 3;
}

// --- DATA BACKUP & RESTORE ---
function backupData() {
  const data = { accounts, subAccounts, journalEntries, subAccountLogs, currencies, baseCurrency, entryCounter, subCounter };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `OJM_Backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
}
function restoreData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.accounts) accounts = data.accounts;
      if (data.subAccounts) subAccounts = data.subAccounts;
      if (data.journalEntries) journalEntries = data.journalEntries;
      if (data.subAccountLogs) subAccountLogs = data.subAccountLogs;
      if (data.currencies) currencies = data.currencies;
      if (data.baseCurrency) baseCurrency = data.baseCurrency;
      entryCounter = data.entryCounter || journalEntries.length + 1;
      subCounter = data.subCounter || 1;
      
      alert('Data restored successfully!');
      window.location.reload(); 
    } catch (err) { alert('Invalid backup file'); }
  };
  reader.readAsText(file);
}

// --- AUTHENTICATION, SUB-ACCOUNT PRIVACY & LOCKS ---
function toggleLoginSubAccount() {
  const role = document.getElementById('loginRoleSelect').value;
  document.getElementById('loginSubAccountGroup').style.display = role === 'sub' ? 'block' : 'none';
}

function handleLogin() {
  const role = document.getElementById('loginRoleSelect').value;
  const pass = document.getElementById('loginPassword').value;
  
  if (role === 'admin' && pass !== 'admin123') { alert('Invalid Password'); return; }
  if (role === 'sub') {
    if (pass !== 'sub123') { alert('Invalid Password'); return; }
    const assignedSub = document.getElementById('loginSubAccountSelect').value;
    if (!assignedSub) { alert('No sub-account selected or available.'); return; }
    activeSubAccountId = assignedSub; 
  }
  
  currentUserRole = role;
  document.getElementById('loginOverlay').style.display = 'none';
  applyRolePermissions();
}

function handleLogout() { document.getElementById('loginOverlay').style.display = 'flex'; }

function applyRolePermissions() {
  const isAdmin = currentUserRole === 'admin';
  document.getElementById('userRoleBadge').textContent = isAdmin ? 'Admin Mode' : 'Sub-Account Mode';
  document.getElementById('currentUserDisplay').textContent = `Logged in: ${isAdmin ? 'Admin' : 'Sub-Officer'}`;
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin ? 'flex' : 'none');
  
  if (!isAdmin) { 
    // Sub-Account Mode Privacy: Hide the top dropdown so they can't switch to other sub-accounts
    document.getElementById('subAccountSelectorWrapper').style.display = 'none';
    updateActiveSubAccountHeader();
    renderSubAccountLog();
    switchTab('sub-accounts'); 
  } else { 
    // Admin Mode: Restore the dropdown
    document.getElementById('subAccountSelectorWrapper').style.display = 'block';
    switchTab('summary'); 
  }
}

function isDateLockedForSubAccount(entryDateStr) {
  if (currentUserRole === 'admin') return false; 
  const entryDate = new Date(entryDateStr + "T00:00:00");
  let dYear = entryDate.getFullYear();
  let dMonth = entryDate.getMonth() + 1;
  if (dMonth > 11) { dMonth = 0; dYear += 1; }
  const lockDeadline = new Date(dYear, dMonth, 7, 23, 59, 59);
  return new Date() > lockDeadline; 
}

function checkEntryDateLock() {
  const isLocked = isDateLockedForSubAccount(document.getElementById('subEntryDate').value);
  document.getElementById('subEntryLockWarning').style.display = isLocked ? 'block' : 'none';
  document.getElementById('subSaveBtn').disabled = isLocked;
}

// --- TAB SWITCHING ---
function switchTab(tabId) {
  if (currentUserRole === 'sub' && tabId !== 'sub-accounts') { alert('Restricted Area'); return; }
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick')?.includes(tabId));
  if (btn) btn.classList.add('active');
  document.getElementById(tabId).classList.add('active');
  
  document.getElementById('navMenuBar').classList.remove('open'); 

  if (tabId === 'gl') renderGeneralLedger();
  if (tabId === 'trial-balance') renderTrialBalance();
  if (tabId === 'reports') generateAutomatedReports();
  if (tabId === 'summary') updateChart();
  if (tabId === 'journal') renderJournalLog();
  if (tabId === 'sub-accounts') renderSubAccountLog();
}

// --- GLOBAL CURRENCY MANAGEMENT ---
function refreshAllCurrencyDropdowns() {
  const selects = ['coaCurrency', 'newSubAccountCurrency', 'settingBaseCurrency'];
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const current = el.value;
      el.innerHTML = currencies.map(c => `<option value="${c}">${c}</option>`).join('');
      if (currencies.includes(current)) el.value = current;
      else if (id === 'settingBaseCurrency') el.value = baseCurrency;
    }
  });
}
function updateBaseCurrency() {
  baseCurrency = document.getElementById('settingBaseCurrency').value;
  renderSettingsCurrencyList();
  renderTrialBalance();
}
function renderSettingsCurrencyList() {
  document.getElementById('settingsCurrencyList').innerHTML = currencies.map(c => `
    <div style="display:flex; justify-content:space-between; padding:12px; background:rgba(255,255,255,0.05); border:1px solid var(--panel-border); border-radius:6px; align-items: center;">
      <span><strong>${c}</strong> ${c === baseCurrency ? '<span class="badge-admin" style="margin-left: 8px;">Base</span>' : ''}</span>
      ${currencies.length > 1 && c !== baseCurrency ? `<button class="btn btn-danger btn-sm" onclick="removeCurrency('${c}')">Delete</button>` : ''}
    </div>`).join('');
}
function addCurrencyFromSettings() {
  const val = document.getElementById('settingsNewCurrency').value.trim().toUpperCase();
  if (val && !currencies.includes(val)) {
    currencies.push(val);
    document.getElementById('settingsNewCurrency').value = '';
    refreshAllCurrencyDropdowns(); renderSettingsCurrencyList(); setupJournalColumns(); renderTrialBalance();
  }
}
function removeCurrency(c) {
  if (confirm(`Delete Currency ${c}?`)) {
    currencies = currencies.filter(x => x !== c);
    refreshAllCurrencyDropdowns(); renderSettingsCurrencyList(); setupJournalColumns(); renderTrialBalance();
  }
}

// --- CHART OF ACCOUNTS (WITH EDIT/DELETE) ---
function addOrUpdateChartAccount() {
  const code = document.getElementById('coaCode').value.trim();
  const name = document.getElementById('coaName').value.trim();
  const type = document.getElementById('coaType').value;
  const currency = document.getElementById('coaCurrency').value;
  if (!code || !name) { alert('Code and Name required'); return; }

  if (editingCoaCode) {
    const idx = accounts.findIndex(a => a.code === editingCoaCode);
    if (idx !== -1) accounts[idx] = { code, name, type, currency };
    cancelCoaEdit();
  } else {
    if (accounts.some(a => a.code === code)) { alert('Code exists'); return; }
    accounts.push({ code, name, type, currency });
    document.getElementById('coaCode').value = ''; document.getElementById('coaName').value = '';
  }
  renderChartOfAccounts(); refreshAccountDropdowns(); renderChartCheckboxes(); updateChart();
}
function loadCoaForEdit(code) {
  const acc = accounts.find(a => a.code === code); if (!acc) return;
  editingCoaCode = code;
  document.getElementById('coaFormTitle').textContent = `Edit Account: ${code}`;
  document.getElementById('coaCode').value = acc.code;
  document.getElementById('coaName').value = acc.name;
  document.getElementById('coaType').value = acc.type;
  document.getElementById('coaCurrency').value = acc.currency;
  document.getElementById('coaSaveBtn').textContent = 'Update';
  document.getElementById('coaCancelBtn').style.display = 'inline-flex';
}
function cancelCoaEdit() {
  editingCoaCode = null;
  document.getElementById('coaFormTitle').textContent = 'Create / Edit Account';
  document.getElementById('coaCode').value = ''; document.getElementById('coaName').value = '';
  document.getElementById('coaSaveBtn').textContent = 'Save Account';
  document.getElementById('coaCancelBtn').style.display = 'none';
}
function deleteCoa(code) {
  if (confirm(`Permanently delete account ${code}?`)) {
    accounts = accounts.filter(a => a.code !== code);
    if (editingCoaCode === code) cancelCoaEdit();
    renderChartOfAccounts(); refreshAccountDropdowns(); renderChartCheckboxes(); updateChart();
  }
}
function renderChartOfAccounts() {
  document.getElementById('coaBody').innerHTML = accounts.map(a => `
    <tr>
      <td><strong>${a.code}</strong></td><td>${a.name}</td><td>${a.type}</td><td style="text-align:center;"><span class="currency-tag">${a.currency}</span></td>
      <td class="num">${formatNum(calculateAccountNet(a.code))}</td>
      <td style="text-align:center;">
        <button class="btn btn-secondary btn-sm" onclick="loadCoaForEdit('${a.code}')">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deleteCoa('${a.code}')">🗑️</button>
      </td>
    </tr>`).join('');
}

// --- SUB ACCOUNTS LOGIC ---
function populateSubAccountDropdowns() {
  const select = document.getElementById('subAccountActiveSelect');
  const loginSelect = document.getElementById('loginSubAccountSelect');
  const html = subAccounts.map(s => `<option value="${s.id}">${s.name} (${s.currency})</option>`).join('');
  
  select.innerHTML = html;
  select.value = activeSubAccountId;
  
  if (loginSelect) {
    loginSelect.innerHTML = html;
  }
  
  updateActiveSubAccountHeader();
}
function switchActiveSubAccount() {
  activeSubAccountId = document.getElementById('subAccountActiveSelect').value;
  updateActiveSubAccountHeader(); renderSubAccountLog();
}
function updateActiveSubAccountHeader() {
  const sub = subAccounts.find(s => s.id === activeSubAccountId) || subAccounts[0];
  document.getElementById('subPrintDocAccountName').textContent = sub.name;
  document.getElementById('subPrintDocDesc').textContent = `Scope: ${sub.desc} | Currency: ${sub.currency}`;
}
function addNewSubAccount() {
  const name = document.getElementById('newSubAccountName').value.trim();
  const desc = document.getElementById('newSubAccountDesc').value.trim();
  const curr = document.getElementById('newSubAccountCurrency').value;
  if (!name) { alert('Enter Name'); return; }
  const id = "SUB-" + (subAccounts.length + 1);
  subAccounts.push({ id, name, desc, currency: curr });
  subAccountLogs[id] = [];
  document.getElementById('newSubAccountName').value = ''; document.getElementById('newSubAccountDesc').value = '';
  renderSettingsSubAccounts(); populateSubAccountDropdowns();
}
function renderSettingsSubAccounts() {
  document.getElementById('settingsSubAccountsBody').innerHTML = subAccounts.map(s => `<tr><td><strong>${s.id}</strong></td><td>${s.name}</td><td>${s.desc}</td><td>${s.currency}</td>
    <td style="text-align:center;"><button class="btn btn-danger btn-sm" onclick="removeSubAccount('${s.id}')">Delete</button></td></tr>`).join('');
}
function removeSubAccount(id) {
  if (subAccounts.length <= 1) { alert('Minimum 1 account required.'); return; }
  if (confirm(`Remove ${id}?`)) {
    subAccounts = subAccounts.filter(s => s.id !== id);
    delete subAccountLogs[id];
    activeSubAccountId = subAccounts[0].id;
    renderSettingsSubAccounts(); populateSubAccountDropdowns(); renderSubAccountLog();
  }
}

function saveSubAccountEntry() {
  const date = document.getElementById('subEntryDate').value || new Date().toISOString().split('T')[0];
  if (isDateLockedForSubAccount(date)) return;
  const cat = document.getElementById('subEntryCategory').value;
  const desc = document.getElementById('subEntryDesc').value.trim();
  const type = document.getElementById('subEntryType').value;
  const amt = parseFloat(document.getElementById('subEntryAmount').value || 0);
  if (amt <= 0) return;
  const inAmt = type === 'IN' ? amt : 0; const outAmt = type === 'OUT' ? amt : 0;

  if (!subAccountLogs[activeSubAccountId]) subAccountLogs[activeSubAccountId] = [];

  if (editingSubVoucherId) {
    const idx = subAccountLogs[activeSubAccountId].findIndex(e => e.voucherId === editingSubVoucherId);
    if (idx !== -1) subAccountLogs[activeSubAccountId][idx] = { voucherId: editingSubVoucherId, date, category: cat, desc, inAmount: inAmt, outAmount: outAmt };
    cancelSubEdit();
  } else {
    subAccountLogs[activeSubAccountId].push({ voucherId: "V-" + String(subCounter++).padStart(4, '0'), date, category: cat, desc, inAmount: inAmt, outAmount: outAmt });
  }
  document.getElementById('subEntryDesc').value = ''; document.getElementById('subEntryAmount').value = '';
  renderSubAccountLog();
}
function loadSubEntryForEdit(id) {
  const item = subAccountLogs[activeSubAccountId].find(e => e.voucherId === id);
  if (!item || isDateLockedForSubAccount(item.date)) { alert('Entry is locked or missing.'); return; }
  editingSubVoucherId = id;
  document.getElementById('subEditModeBanner').style.display = 'flex';
  document.getElementById('subEditingVoucherBadge').textContent = id;
  document.getElementById('subEntryDate').value = item.date;
  document.getElementById('subEntryCategory').value = item.category;
  document.getElementById('subEntryDesc').value = item.desc;
  document.getElementById('subEntryType').value = item.inAmount > 0 ? 'IN' : 'OUT';
  document.getElementById('subEntryAmount').value = item.inAmount > 0 ? item.inAmount : item.outAmount;
  checkEntryDateLock(); window.scrollTo({ top: 0, behavior: 'smooth' });
}
function cancelSubEdit() {
  editingSubVoucherId = null;
  document.getElementById('subEditModeBanner').style.display = 'none';
  document.getElementById('subEntryDesc').value = ''; document.getElementById('subEntryAmount').value = '';
}
function deleteSubEntry(id) {
  const item = subAccountLogs[activeSubAccountId].find(e => e.voucherId === id);
  if (!item || isDateLockedForSubAccount(item.date)) return;
  if (confirm(`Remove ${id}?`)) {
    subAccountLogs[activeSubAccountId] = subAccountLogs[activeSubAccountId].filter(e => e.voucherId !== id);
    if (editingSubVoucherId === id) cancelSubEdit(); renderSubAccountLog();
  }
}
function toggleSubDateInputs() {
  const v = document.getElementById('subFilterType').value;
  document.getElementById('subMonthWrap').style.display = v === 'month' ? 'flex' : 'none';
  document.getElementById('subYearWrap').style.display = v === 'year' ? 'flex' : 'none';
  document.getElementById('subRangeWrap').style.display = v === 'custom' ? 'flex' : 'none';
  renderSubAccountLog();
}
function renderSubAccountLog() {
  const tbody = document.getElementById('subAccountLogBody'); tbody.innerHTML = '';
  const list = subAccountLogs[activeSubAccountId] || [];
  const query = document.getElementById('subSearchInput')?.value.toLowerCase() || '';
  const fType = document.getElementById('subFilterType')?.value || 'all';
  const mVal = document.getElementById('subMonthInput')?.value;
  const yVal = document.getElementById('subYearInput')?.value;
  const sVal = document.getElementById('subStartDate')?.value;
  const eVal = document.getElementById('subEndDate')?.value;

  let run = 0, tIn = 0, tOut = 0;
  list.filter(e => {
    if (fType === 'month' && mVal && !e.date.startsWith(mVal)) return false;
    if (fType === 'year' && yVal && !e.date.startsWith(yVal)) return false;
    if (fType === 'custom' && sVal && eVal && (e.date < sVal || e.date > eVal)) return false;
    if (query) return e.voucherId.toLowerCase().includes(query) || e.desc.toLowerCase().includes(query);
    return true;
  }).forEach(e => {
    tIn += e.inAmount; tOut += e.outAmount; run += (e.inAmount - e.outAmount);
    const locked = isDateLockedForSubAccount(e.date);
    tbody.innerHTML += `<tr>
      <td><strong>${e.voucherId}</strong></td><td>${e.date}</td><td><span class="currency-tag">${e.category}</span></td><td>${e.desc}</td>
      <td class="num" style="color:var(--success); font-weight:bold;">${formatNum(e.inAmount)}</td>
      <td class="num" style="color:var(--danger); font-weight:bold;">${formatNum(e.outAmount)}</td>
      <td class="num" style="font-weight:bold;">${formatNum(run)}</td>
      <td style="text-align:center;" class="no-print">
        ${locked ? `<span style="color:var(--text-muted);">🔒 Locked</span>` :
          `<button class="btn btn-secondary btn-sm" onclick="loadSubEntryForEdit('${e.voucherId}')">✏️</button>
           <button class="btn btn-danger btn-sm" onclick="deleteSubEntry('${e.voucherId}')">🗑️</button>`}
      </td></tr>`;
  });
  document.getElementById('subTotalIn').textContent = formatNum(tIn);
  document.getElementById('subTotalOut').textContent = formatNum(tOut);
  document.getElementById('subNetBalance').textContent = formatNum(run);
}

// --- MASTER JOURNAL ---
function setupJournalColumns() {
  const hRow = document.getElementById('jeHeaderRow'); const vRow = document.getElementById('journalViewHeaderRow');
  let formHtml = `<th style="width:250px; text-align:left;">Account</th><th style="text-align:left;">Description</th><th class="num">DR</th>`;
  let viewHtml = `<th style="text-align:left;">Entry #</th><th style="text-align:left;">Date</th><th style="text-align:left;">Account</th><th style="text-align:left;">Description</th><th class="num">DR</th>`;
  currencies.forEach(c => { formHtml += `<th class="num">CR ${c}</th>`; viewHtml += `<th class="num">CR ${c}</th>`; });
  formHtml += `<th style="width:40px; text-align:center;">Action</th>`; viewHtml += `<th style="text-align:center;">Action</th>`;
  hRow.innerHTML = formHtml; vRow.innerHTML = viewHtml;
  if (!editingJournalId) { document.getElementById('jeLinesBody').innerHTML = ''; addJournalLineRow(); addJournalLineRow(); }
  document.getElementById('jeNumberDisplay').textContent = `${getEntryPrefix()}-${String(entryCounter).padStart(4, '0')}`;
}
function refreshAccountDropdowns() {
  const selects = [document.getElementById('glAccountSelect'), document.getElementById('reconAccountSelect'), ...document.querySelectorAll('.line-account-select')];
  selects.forEach(sel => {
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = accounts.map(a => `<option value="${a.code}">${a.code} - ${a.name}</option>`).join('');
    sel.value = current || accounts[0]?.code;
  });
}
function addJournalLineRow(accVal = '', memoVal = '', drVal = '', crDict = {}) {
  const tr = document.createElement('tr');
  let cols = `<td style="padding:0;"><select class="line-account-select" onchange="computeEntryBalance()" style="border-radius:0; border:none; border-right: 1px solid var(--grid-border);">${accounts.map(a => `<option value="${a.code}" ${a.code === accVal ? 'selected' : ''}>${a.code} - ${a.name}</option>`).join('')}</select></td>
    <td style="padding:0;"><input type="text" class="line-memo" value="${memoVal}" style="border-radius:0; border:none; border-right: 1px solid var(--grid-border);" /></td>
    <td style="padding:0;"><input type="number" step="any" class="line-dr num" value="${drVal}" oninput="computeEntryBalance()" style="border-radius:0; border:none; border-right: 1px solid var(--grid-border);" /></td>`;
  currencies.forEach(c => { cols += `<td style="padding:0;"><input type="number" step="any" class="line-cr cr-${c} num" value="${crDict[c] || ''}" oninput="computeEntryBalance()" style="border-radius:0; border:none; border-right: 1px solid var(--grid-border);" /></td>`; });
  cols += `<td style="text-align:center; vertical-align:middle; padding: 0;"><button class="btn btn-danger btn-sm" onclick="this.closest('tr').remove(); computeEntryBalance();">×</button></td>`;
  tr.innerHTML = cols; document.getElementById('jeLinesBody').appendChild(tr);
}

function computeEntryBalance() {
  let drByCurr = {}, crByCurr = {}; currencies.forEach(c => { drByCurr[c] = 0; crByCurr[c] = 0; });
  document.querySelectorAll('#jeLinesBody tr').forEach(r => {
    const code = r.querySelector('.line-account-select').value; const dr = parseFloat(r.querySelector('.line-dr').value || 0);
    if (code && dr > 0) { const acc = accounts.find(a => a.code === code); if (acc) drByCurr[acc.currency] += dr; }
    currencies.forEach(c => { const cr = parseFloat(r.querySelector(`.cr-${c}`).value || 0); if (cr > 0) crByCurr[c] += cr; });
  });
  let stat = [], bal = true, active = false;
  currencies.forEach(c => {
    const d = drByCurr[c], cr = crByCurr[c];
    if (d > 0 || cr > 0) {
      active = true;
      if (Math.abs(d - cr) > 0.001) { bal = false; stat.push(`<span style="color:var(--danger)">${c}: DR ≠ CR</span>`); } 
      else stat.push(`<span style="color:var(--success)">${c} Balanced</span>`);
    }
  });
  document.getElementById('journalBalanceStatus').innerHTML = active ? stat.join(' | ') : ''; return bal;
}

function saveJournalEntry() {
  if (!computeEntryBalance()) return;
  const lines = [];
  document.querySelectorAll('#jeLinesBody tr').forEach(r => {
    const code = r.querySelector('.line-account-select').value; const memo = r.querySelector('.line-memo').value; const dr = parseFloat(r.querySelector('.line-dr').value || 0);
    if (code) {
      const acc = accounts.find(a => a.code === code);
      if (dr > 0) lines.push({ accountCode: code, memo, currency: acc.currency, dr, cr: 0 });
      currencies.forEach(c => { const cr = parseFloat(r.querySelector(`.cr-${c}`).value || 0); if (cr > 0) lines.push({ accountCode: code, memo, currency: c, dr: 0, cr }); });
    }
  });
  const date = document.getElementById('jeDate').value || new Date().toISOString().split('T')[0];
  const desc = document.getElementById('jeDescription').value;

  if (editingJournalId) {
    if (!confirm(`WARNING: You are about to modify and overwrite historical Entry ${editingJournalId}. Are you sure you want to proceed?`)) return;
    
    let auditReason = prompt("AUDIT REQUIREMENT:\nPlease enter a brief reason for changing this entry:");
    if (auditReason === null) return; 
    if (auditReason.trim() === "") auditReason = "Manual revision (No reason provided)";

    const idx = journalEntries.findIndex(e => e.entryId === editingJournalId);
    if (idx !== -1) journalEntries[idx] = { entryId: editingJournalId, date, desc, lines, auditReason: auditReason, auditDate: new Date().toISOString().split('T')[0] };
    cancelJournalEdit();
  } else {
    const pfx = getEntryPrefix();
    journalEntries.push({ entryId: `${pfx}-${String(entryCounter++).padStart(4, '0')}`, date, desc, lines });
    document.getElementById('jeNumberDisplay').textContent = `${pfx}-${String(entryCounter).padStart(4, '0')}`;
    document.getElementById('jeDescription').value = ''; document.getElementById('jeLinesBody').innerHTML = '';
    addJournalLineRow(); addJournalLineRow();
  }
  renderJournalLog(); renderTrialBalance(); generateAutomatedReports(); updateChart();
}
function loadJournalForEdit(id) {
  const e = journalEntries.find(x => x.entryId === id); if (!e) return;
  editingJournalId = id;
  document.getElementById('journalEditModeBanner').style.display = 'flex';
  document.getElementById('editingJournalBadge').textContent = id;
  document.getElementById('jeDate').value = e.date; document.getElementById('jeDescription').value = e.desc;
  document.getElementById('jeLinesBody').innerHTML = '';
  e.lines.forEach(l => { let crDict = {}; if (l.cr > 0) crDict[l.currency] = l.cr; addJournalLineRow(l.accountCode, l.memo, l.dr > 0 ? l.dr : '', crDict); });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function cancelJournalEdit() {
  editingJournalId = null; document.getElementById('journalEditModeBanner').style.display = 'none';
  document.getElementById('jeDescription').value = ''; document.getElementById('jeLinesBody').innerHTML = '';
  addJournalLineRow(); addJournalLineRow();
}
function deleteJournalEntry(id) {
  if (confirm(`Delete ${id}?`)) { journalEntries = journalEntries.filter(e => e.entryId !== id); if (editingJournalId === id) cancelJournalEdit(); renderJournalLog(); renderTrialBalance(); generateAutomatedReports(); updateChart(); }
}
function renderJournalLog() {
  const tbody = document.getElementById('journalLogBody'); 
  tbody.innerHTML = '';
  const query = (document.getElementById('journalSearchInput')?.value || '').toLowerCase();

  journalEntries.forEach(je => {
    let matchesSearch = false;
    if (je.entryId.toLowerCase().includes(query) || je.desc.toLowerCase().includes(query)) matchesSearch = true;
    je.lines.forEach(l => {
      const acc = accounts.find(a => a.code === l.accountCode);
      if (acc && acc.name.toLowerCase().includes(query)) matchesSearch = true;
      if (l.memo && l.memo.toLowerCase().includes(query)) matchesSearch = true;
      if (l.dr.toString().includes(query) || l.cr.toString().includes(query)) matchesSearch = true;
    });

    if (!matchesSearch) return; 

    je.lines.forEach((l, idx) => {
      const acc = accounts.find(a => a.code === l.accountCode);
      let row = `<tr>${idx === 0 ? `<td rowspan="${je.lines.length}"><strong>${je.entryId}</strong></td><td rowspan="${je.lines.length}">${je.date}</td>` : ''}
        <td>${acc ? acc.code + ' - ' + acc.name : l.accountCode} <span class="currency-tag">${l.currency}</span></td><td style="text-align:left;">${l.memo || je.desc}</td><td class="num">${formatNum(l.dr)}</td>`;
      currencies.forEach(c => row += `<td class="num">${(l.currency === c && l.cr > 0) ? formatNum(l.cr) : '-'}</td>`);
      if (idx === 0) row += `<td rowspan="${je.lines.length}" style="text-align:center;"><button class="btn btn-secondary btn-sm" onclick="loadJournalForEdit('${je.entryId}')">✏️</button> <button class="btn btn-danger btn-sm" onclick="deleteJournalEntry('${je.entryId}')">🗑️</button></td>`;
      row += `</tr>`; 
      tbody.innerHTML += row;
    });

    if (je.auditReason) {
      const totalColumns = 5 + currencies.length;
      tbody.innerHTML += `<tr class="audit-row"><td colspan="${totalColumns}"><strong>⚠️ Audit Note (${je.auditDate}):</strong> ${je.auditReason}</td></tr>`;
    }
  });
}

// --- REPORTING, TRIAL BALANCE & GL ---
function calculateAccountNet(code) {
  const acc = accounts.find(a => a.code === code); if (!acc) return 0;
  let dr = 0, cr = 0;
  journalEntries.forEach(je => je.lines.forEach(l => { if (l.accountCode === code) { dr += l.dr; cr += l.cr; } }));
  return (acc.type === 'Asset' || acc.type === 'Expense') ? (dr - cr) : (cr - dr);
}

function renderTrialBalance() {
  const tbody = document.getElementById('tbBody'); tbody.innerHTML = '';
  const thead = document.getElementById('tbHead');
  const sortedCurr = [baseCurrency, ...currencies.filter(c => c !== baseCurrency)];

  let theadHtml = `<tr><th style="text-align:left;">Code</th><th style="text-align:left;">Account Name</th>`;
  sortedCurr.forEach(c => { theadHtml += `<th class="num">DR (${c})</th><th class="num">CR (${c})</th><th class="num">Net (${c})</th>`; });
  theadHtml += `</tr>`;
  thead.innerHTML = theadHtml;

  accounts.forEach(a => {
    let row = `<tr><td><strong>${a.code}</strong></td><td>${a.name}</td>`;
    sortedCurr.forEach(c => {
      let dr = 0, cr = 0; 
      journalEntries.forEach(je => je.lines.forEach(l => { if (l.accountCode === a.code && l.currency === c) { dr += l.dr; cr += l.cr; } }));
      const net = (a.type === 'Asset' || a.type === 'Expense') ? (dr - cr) : (cr - dr);
      row += `<td class="num">${formatNum(dr)}</td><td class="num">${formatNum(cr)}</td><td class="num" style="font-weight:bold;">${formatNum(net)}</td>`;
    });
    row += `</tr>`; tbody.innerHTML += row;
  });
}

function toggleGlDateInputs() {
  const v = document.getElementById('glFilterType').value;
  document.getElementById('glMonthWrap').style.display = v === 'month' ? 'flex' : 'none';
  document.getElementById('glYearWrap').style.display = v === 'year' ? 'flex' : 'none';
  document.getElementById('glRangeWrap').style.display = v === 'custom' ? 'flex' : 'none';
  renderGeneralLedger();
}
function renderGeneralLedger() {
  const code = document.getElementById('glAccountSelect').value; const acc = accounts.find(a => a.code === code); if (!acc) return;
  document.getElementById('soaAccountTitle').textContent = `Statement: ${acc.code} - ${acc.name}`;
  document.getElementById('soaDateGenerated').textContent = `Generated: ${new Date().toISOString().split('T')[0]}`;
  
  const filterType = document.getElementById('glFilterType').value;
  const monthVal = document.getElementById('glMonthInput').value;
  const yearVal = document.getElementById('glYearInput').value;
  const startVal = document.getElementById('glStartDate').value;
  const endVal = document.getElementById('glEndDate').value;

  let filterStartDate = null;
  if (filterType === 'month' && monthVal) filterStartDate = `${monthVal}-01`;
  if (filterType === 'year' && yearVal) filterStartDate = `${yearVal}-01-01`;
  if (filterType === 'custom' && startVal) filterStartDate = startVal;

  let prev = 0;
  if (filterStartDate) {
    journalEntries.forEach(je => { if (je.date < filterStartDate) { je.lines.forEach(l => { if (l.accountCode === code) prev += (acc.type === 'Asset' || acc.type === 'Expense') ? (l.dr - l.cr) : (l.cr - l.dr); }); } });
  }

  const periodEntries = journalEntries.filter(je => {
    if (filterType === 'month' && monthVal && !je.date.startsWith(monthVal)) return false;
    if (filterType === 'year' && yearVal && !je.date.startsWith(yearVal)) return false;
    if (filterType === 'custom' && startVal && endVal && (je.date < startVal || je.date > endVal)) return false;
    return true;
  });

  const tbody = document.getElementById('glTableBody'); 
  tbody.innerHTML = `<tr style="background:rgba(255,255,255,0.05); font-style:italic;"><td>${filterStartDate || '—'}</td><td>—</td><td><strong>Opening Carried Forward Balance</strong></td><td class="num">—</td><td class="num">—</td><td class="num" style="font-weight:bold;">${formatNum(prev)}</td></tr>`;
  
  let run = prev, tDr = 0, tCr = 0;
  periodEntries.forEach(je => {
    je.lines.forEach(l => {
      if (l.accountCode === code) {
        tDr += l.dr; tCr += l.cr; run += (acc.type === 'Asset' || acc.type === 'Expense') ? (l.dr - l.cr) : (l.cr - l.dr);
        tbody.innerHTML += `<tr><td>${je.date}</td><td>${je.entryId}</td><td style="text-align:left;">${l.memo || je.desc}</td><td class="num">${formatNum(l.dr)}</td><td class="num">${formatNum(l.cr)}</td><td class="num" style="font-weight:bold;">${formatNum(run)}</td></tr>`;
      }
    });
  });
  document.getElementById('glPreviousBalance').textContent = formatNum(prev);
  document.getElementById('glPeriodDebits').textContent = formatNum(tDr);
  document.getElementById('glPeriodCredits').textContent = formatNum(tCr);
  document.getElementById('glEndingBalance').textContent = formatNum(run);
}

function toggleReportDateInputs() {
  const v = document.getElementById('reportFilterType').value;
  document.getElementById('repMonthWrap').style.display = v === 'month' ? 'flex' : 'none';
  document.getElementById('repQtrWrap').style.display = v === 'quarter' ? 'flex' : 'none';
  document.getElementById('repYearWrap').style.display = v === 'year' ? 'flex' : 'none';
  document.getElementById('repRangeWrap').style.display = v === 'custom' ? 'flex' : 'none';
  generateAutomatedReports();
}
function generateAutomatedReports() {
  const fType = document.getElementById('reportFilterType')?.value || 'all';
  const mVal = document.getElementById('repMonthInput')?.value;
  const qVal = document.getElementById('repQtrSelect')?.value;
  const qYear = document.getElementById('repQtrYear')?.value;
  const yVal = document.getElementById('repYearInput')?.value;
  const sVal = document.getElementById('repStartDate')?.value;
  const eVal = document.getElementById('repEndDate')?.value;

  let title = "Financial Statement (All-Time)";
  
  const entries = journalEntries.filter(je => {
    if (fType === 'month' && mVal) { title = `Statement (${mVal})`; return je.date.startsWith(mVal); }
    if (fType === 'year' && yVal) { title = `Statement (${yVal})`; return je.date.startsWith(yVal); }
    if (fType === 'custom' && sVal && eVal) { title = `Statement (${sVal} to ${eVal})`; return je.date >= sVal && je.date <= eVal; }
    if (fType === 'quarter' && qVal && qYear) {
      title = `Statement (${qVal} ${qYear})`;
      const month = parseInt(je.date.split('-')[1]);
      const year = je.date.split('-')[0];
      if (year !== qYear) return false;
      if (qVal === 'Q1') return month >= 1 && month <= 3;
      if (qVal === 'Q2') return month >= 4 && month <= 6;
      if (qVal === 'Q3') return month >= 7 && month <= 9;
      if (qVal === 'Q4') return month >= 10 && month <= 12;
    }
    return true;
  });

  document.getElementById('reportPeriodTitle').textContent = title;

  const pnlBody = document.getElementById('incomeStatementBody'); pnlBody.innerHTML = '';
  let rev = {}, exp = {}; currencies.forEach(c => { rev[c] = 0; exp[c] = 0; });

  pnlBody.innerHTML += `<tr style="background:rgba(255,255,255,0.05);"><td colspan="3"><strong>REVENUES</strong></td></tr>`;
  accounts.filter(a => a.type === 'Revenue').forEach(a => {
    let total = 0; entries.forEach(je => je.lines.forEach(l => { if (l.accountCode === a.code) total += (l.cr - l.dr); }));
    rev[a.currency] += total; pnlBody.innerHTML += `<tr><td style="padding-left:16px;">${a.code} - ${a.name}</td><td style="text-align:center;">${a.currency}</td><td class="num">${formatNum(total)}</td></tr>`;
  });

  pnlBody.innerHTML += `<tr style="background:rgba(255,255,255,0.05);"><td colspan="3"><strong>EXPENSES</strong></td></tr>`;
  accounts.filter(a => a.type === 'Expense').forEach(a => {
    let total = 0; entries.forEach(je => je.lines.forEach(l => { if (l.accountCode === a.code) total += (l.dr - l.cr); }));
    exp[a.currency] += total; pnlBody.innerHTML += `<tr><td style="padding-left:16px;">${a.code} - ${a.name}</td><td style="text-align:center;">${a.currency}</td><td class="num">${formatNum(total)}</td></tr>`;
  });

  currencies.forEach(c => { pnlBody.innerHTML += `<tr style="background:rgba(16,185,129,0.1); font-weight:bold;"><td>Net Profit / (Loss) in ${c}</td><td style="text-align:center;">${c}</td><td class="num">${formatNum(rev[c]-exp[c])}</td></tr>`; });

  const bsBody = document.getElementById('balanceSheetBody'); bsBody.innerHTML = '';
  ['Asset', 'Liability', 'Equity'].forEach(cat => {
    bsBody.innerHTML += `<tr style="background:rgba(255,255,255,0.05);"><td colspan="3"><strong>${cat.toUpperCase()}S</strong></td></tr>`;
    accounts.filter(a => a.type === cat).forEach(a => { bsBody.innerHTML += `<tr><td style="padding-left:16px;">${a.code} - ${a.name}</td><td style="text-align:center;">${a.currency}</td><td class="num">${formatNum(calculateAccountNet(a.code))}</td></tr>`; });
  });
}

function toggleReconDateInputs() {
  const v = document.getElementById('reconFilterType').value;
  document.getElementById('reconMonthWrap').style.display = v === 'month' ? 'flex' : 'none';
  document.getElementById('reconYearWrap').style.display = v === 'year' ? 'flex' : 'none';
  document.getElementById('reconRangeWrap').style.display = v === 'custom' ? 'flex' : 'none';
  runReconciliation();
}

function runReconciliation() {
  const code = document.getElementById('reconAccountSelect').value; 
  const panel = document.getElementById('reconResultsPanel');
  if (!code) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';

  const filterType = document.getElementById('reconFilterType').value;
  const mVal = document.getElementById('reconMonthInput').value;
  const yVal = document.getElementById('reconYearInput').value;
  const eVal = document.getElementById('reconEndDate').value;

  let endDate = null;
  if (filterType === 'month' && mVal) endDate = `${mVal}-31`; 
  if (filterType === 'year' && yVal) endDate = `${yVal}-12-31`;
  if (filterType === 'custom' && eVal) endDate = eVal;

  const acc = accounts.find(a => a.code === code);
  let sys = 0;
  journalEntries.forEach(je => {
    if (!endDate || je.date <= endDate) {
      je.lines.forEach(l => { if (l.accountCode === code) sys += (acc.type === 'Asset' || acc.type === 'Expense') ? (l.dr - l.cr) : (l.cr - l.dr); });
    }
  });
  
  const act = parseFloat(document.getElementById('reconActualBalance').value || 0);
  document.getElementById('reconTitle').textContent = `Recon: ${acc.name}`;
  document.getElementById('reconSystemBal').textContent = formatNum(sys);
  document.getElementById('reconActualBal').textContent = formatNum(act);
  document.getElementById('reconDiff').textContent = formatNum(sys - act);
  const st = document.getElementById('reconStatus');
  if (Math.abs(sys - act) < 0.001) { st.innerHTML = '<span style="color:var(--success); font-weight:bold;">✔ Balanced</span>'; st.style.background = 'rgba(16,185,129,0.1)'; }
  else { st.innerHTML = '<span style="color:var(--danger); font-weight:bold;">⚠ Variance</span>'; st.style.background = 'rgba(239,68,68,0.1)'; }
}

function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      uploadedLogoImg = event.target.result;
      document.getElementById('mainAppLogo').src = uploadedLogoImg;
      document.getElementById('mainAppLogo').style.display = 'block';
      ['reportLogoImg', 'glLogoImg', 'subLogoImg'].forEach(id => { const el = document.getElementById(id); if (el) el.src = uploadedLogoImg; });
    };
    reader.readAsDataURL(file);
  }
}
function handleImageUpload(e, type) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      const b64 = event.target.result;
      if (type === 'header') {
        uploadedHeaderImg = b64; document.getElementById('headerImagePreview').src = b64; document.getElementById('headerImagePreview').style.display = 'inline-block';
        ['reportHeaderImg', 'glHeaderImg', 'subHeaderImg'].forEach(id => { const el = document.getElementById(id); if (el) el.src = b64; });
      } else {
        uploadedFooterImg = b64; document.getElementById('footerImagePreview').src = b64; document.getElementById('footerImagePreview').style.display = 'inline-block';
        ['reportFooterImg', 'glFooterImg', 'subFooterImg'].forEach(id => { const el = document.getElementById(id); if (el) el.src = b64; });
      }
    };
    reader.readAsDataURL(file);
  }
}
function updateCompanyProfile() {
  const name = document.getElementById('settingCompanyName').value || "Oon Jai Marketplace";
  document.getElementById('appHeaderTitle').textContent = name;
  document.getElementById('reportHeaderCompanyName').textContent = name;
  document.getElementById('soaCompanyName').textContent = name;
  document.getElementById('jeNumberDisplay').textContent = `${getEntryPrefix()}-${String(entryCounter).padStart(4, '0')}`;
}
function prepareAndPrint(containerId) {
  const showLogo = document.getElementById('settingApplyLogo').value === 'yes' && uploadedLogoImg;
  const logoPos = document.getElementById('settingLogoPosition').value;
  ['reportLogoImg', 'glLogoImg', 'subLogoImg'].forEach(id => { const el = document.getElementById(id); if (el) { el.className = `print-logo-box print-only ${logoPos}`; el.style.display = showLogo ? 'block' : 'none'; } });
  ['reportHeaderImgContainer', 'glHeaderImgContainer', 'subHeaderImgContainer'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = uploadedHeaderImg ? 'block' : 'none'; });
  ['reportFooterImgContainer', 'glFooterImgContainer', 'subFooterImgContainer'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = uploadedFooterImg ? 'block' : 'none'; });

  let printContainer = document.getElementById('printableDocArea');
  if (!printContainer) { printContainer = document.createElement('div'); printContainer.id = 'printableDocArea'; document.body.appendChild(printContainer); }
  printContainer.innerHTML = ''; printContainer.appendChild(document.getElementById(containerId).cloneNode(true));
  window.print();
}

// --- NEW CHART LOGIC WITH SEARCH, SORT, AND LINE STYLING ---
function renderChartCheckboxes() {
  const box = document.getElementById('chartAccountCheckboxes');
  const query = (document.getElementById('chartAccountSearch')?.value || '').toLowerCase();
  
  // Get all valid accounts for graphing (Assets and Liabilities)
  let validAccounts = accounts.filter(a => a.type === 'Asset' || a.type === 'Liability');
  
  // Apply Search filter
  if (query) {
    validAccounts = validAccounts.filter(a => a.code.toLowerCase().includes(query) || a.name.toLowerCase().includes(query));
  }
  
  // Custom Sort: Checked items at the top, then alphabetically by code
  validAccounts.sort((a, b) => {
    const aChecked = chartCheckedAccounts.includes(a.code);
    const bChecked = chartCheckedAccounts.includes(b.code);
    if (aChecked && !bChecked) return -1;
    if (!aChecked && bChecked) return 1;
    return a.code.localeCompare(b.code);
  });

  box.innerHTML = validAccounts.map((a) => `
    <label class="checkbox-list-item">
      <input type="checkbox" value="${a.code}" class="chart-acc-toggle" ${chartCheckedAccounts.includes(a.code) ? 'checked' : ''} onchange="toggleChartAccount('${a.code}')" />
      <span><strong>${a.code}</strong><br>${a.name}</span>
    </label>
  `).join('');
}

function toggleChartAccount(code) {
  if (chartCheckedAccounts.includes(code)) {
    chartCheckedAccounts = chartCheckedAccounts.filter(c => c !== code);
  } else {
    chartCheckedAccounts.push(code);
  }
  renderChartCheckboxes();
  updateChart();
}

function initSummaryChart() {
  const ctx = document.getElementById('summaryChart').getContext('2d');
  Chart.defaults.color = '#a7f3d0';
  
  chartInstance = new Chart(ctx, { 
    type: 'bar', 
    data: { 
      labels: [], 
      datasets: [{ 
        label: 'Net Balance', 
        data: [], 
        backgroundColor: '#10b981',
        borderColor: '#34d399',       // Added for line graph
        borderWidth: 2,               // Added for line graph
        pointBackgroundColor: '#fff', // Added for line graph
        pointRadius: 4,               // Added for line graph
        fill: false,                  // Crucial: stops the line graph from being a solid block
        tension: 0.2                  // Smooths the line
      }] 
    }, 
    options: { 
      responsive: true, 
      maintainAspectRatio: false, 
      scales: { 
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' } }, 
        x: { grid: { color: 'rgba(255,255,255,0.1)' } } 
      } 
    } 
  });
  
  renderChartCheckboxes(); 
}

function updateChart() {
  if (!chartInstance) return;
  const btn = document.getElementById('refreshChartBtn');
  if (btn) { btn.innerHTML = '⏳ Processing...'; btn.disabled = true; }

  setTimeout(() => {
    const cType = document.getElementById('chartTypeSelect')?.value || 'bar';
    chartInstance.config.type = cType;

    const sel = accounts.filter(a => chartCheckedAccounts.includes(a.code));
    
    chartInstance.data.labels = sel.map(a => `${a.name}`);
    chartInstance.data.datasets[0].data = sel.map(a => calculateAccountNet(a.code));
    chartInstance.update();

    const w = document.getElementById('currencySummaryWidgets'); 
    if (w) {
      w.innerHTML = '';
      currencies.forEach(c => {
        let total = 0; accounts.filter(a => a.currency === c && a.type === 'Asset').forEach(a => total += calculateAccountNet(a.code));
        w.innerHTML += `<div class="kpi-card"><div class="kpi-label">Assets (${c})</div><div class="kpi-value" style="color:var(--primary);">${formatNum(total)}</div></div>`;
      });
    }
    
    if (btn) { btn.innerHTML = '🔄 Refresh Graph'; btn.disabled = false; }
  }, 400); 
}

function exportGlCSV() {
  const code = document.getElementById('glAccountSelect').value; const acc = accounts.find(a => a.code === code) || accounts[0];
  let csv = [`"Statement: ${acc.name}"`, `"Currency: ${acc.currency}"`, ''];
  document.querySelectorAll('#glTable tr').forEach(r => { let cols = []; r.querySelectorAll('th, td').forEach(c => cols.push(`"${c.innerText.trim()}"`)); csv.push(cols.join(',')); });
  const b = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `Statement_${acc.code}.csv`; a.click();
}
function exportSubAccountCSV() {
  const sub = subAccounts.find(s => s.id === activeSubAccountId) || subAccounts[0];
  let csv = [`"Sub-Account Ledger: ${sub.name}"`, `"Currency: ${sub.currency}"`, ''];
  document.querySelectorAll('#subAccountTable tr').forEach(r => { let cols = []; r.querySelectorAll('th, td').forEach(c => cols.push(`"${c.innerText.replace(/"/g, '""').trim()}"`)); csv.push(cols.join(',')); });
  const b = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `SubAccount_${sub.id}.csv`; a.click();
}
function exportReportsCSV() {
  let csv = ['"Financial Statement"',''];
  [document.getElementById('incomeStatementTable'), document.getElementById('balanceSheetTable')].forEach(tbl => { tbl.querySelectorAll('tr').forEach(r => { let cols = []; r.querySelectorAll('th, td').forEach(c => cols.push(`"${c.innerText.trim()}"`)); csv.push(cols.join(',')); }); csv.push(''); });
  const b = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `Financials_${new Date().toISOString().split('T')[0]}.csv`; a.click();
}
