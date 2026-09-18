// ==============================================================================
// JS 1: STATE STORE & REALISTIC RESTAURANT ACCOUNTING INITIAL STATE
// Holds Chart of Accounts, Sub-Accounts, and company configurations.
// ==============================================================================
const AccountingStore = {
  companyName: "Oon Jai Marketplace",

  // ----------------------------------------------------------------------------
  // REALISTIC RESTAURANT CHART OF ACCOUNTS (EACH WITH DESIGNATED CURRENCY)
  // ----------------------------------------------------------------------------
  accounts: [
    /* ASSETS (5 accounts) */
    { code: "1000", name: "Cash on Hand", currency: "USD", type: "ASSET", desc: "Front counter registers, bar cash floats, and manager petty cash." },
    { code: "1010", name: "Operating Bank Account", currency: "LAK", type: "ASSET", desc: "Primary checking account used for vendor payouts and operational drafts." },
    { code: "1100", name: "Credit Card Receivables", currency: "USD", type: "ASSET", desc: "Settlements receivable from credit card processors and delivery platforms." },
    { code: "1200", name: "Food & Beverage Inventory", currency: "USD", type: "ASSET", desc: "Value of raw kitchen ingredients, dry pantry stock, and cellar bottles." },
    { code: "1500", name: "Commercial Kitchen Equipment", currency: "USD", type: "ASSET", desc: "Fixed investment in ranges, refrigeration, walk-in chillers, and POS units." },

    /* LIABILITIES (4 accounts) */
    { code: "2000", name: "Accounts Payable", currency: "USD", type: "LIABILITY", desc: "Trade vendor balances due for food, produce, and beverage supply shipments." },
    { code: "2100", name: "Restaurant Sales & VAT Payable", currency: "LAK", type: "LIABILITY", desc: "Sales tax collected on guest receipts pending statutory government remittance." },
    { code: "2200", name: "Payroll Tax Withholdings", currency: "LAK", type: "LIABILITY", desc: "Employee income tax and social welfare withholdings payable." },
    { code: "2500", name: "Equipment Financing Loan", currency: "USD", type: "LIABILITY", desc: "Commercial financing note for kitchen build-out and appliances." },

    /* EQUITY (3 accounts) */
    { code: "3000", name: "Owner's Capital", currency: "USD", type: "EQUITY", desc: "Initial startup funds and partner equity contributed into the restaurant." },
    { code: "3100", name: "Retained Earnings", currency: "USD", type: "EQUITY", desc: "Cumulative business profits reinvested into operations and reserves." },
    { code: "3200", name: "Owner's Drawings", currency: "USD", type: "EQUITY", desc: "Partner distributions and personal drawings taken during the period." },

    /* REVENUE (4 accounts) */
    { code: "4000", name: "Food Sales — Dine-in", currency: "USD", type: "REVENUE", desc: "Gross dining room food revenues from seated table service." },
    { code: "4010", name: "Beverage & Coffee Sales", currency: "USD", type: "REVENUE", desc: "Revenues from specialty coffees, alcoholic drinks, and table beverages." },
    { code: "4020", name: "Takeout & Delivery Orders", currency: "USD", type: "REVENUE", desc: "Revenues from off-premise pickups and third-party delivery dispatch." },
    { code: "4100", name: "Catering & Private Dining", currency: "USD", type: "REVENUE", desc: "Revenues from contracted private party buyouts and buffet events." },

    /* EXPENSES (5 accounts) */
    { code: "5000", name: "Cost of Goods Sold — Food", currency: "LAK", type: "EXPENSE", desc: "Wholesale purchasing of fresh meats, seafood, dry sauces, and produce." },
    { code: "5010", name: "Cost of Goods Sold — Beverage", currency: "USD", type: "EXPENSE", desc: "Wholesale purchasing of liquors, craft beers, dairy, and coffee beans." },
    { code: "5100", name: "Kitchen & Floor Staff Payroll", currency: "LAK", type: "EXPENSE", desc: "Bi-weekly wages and incentives for chefs, dishwashers, and waitstaff." },
    { code: "5200", name: "Facility Rent & Common Fees", currency: "USD", type: "EXPENSE", desc: "Monthly commercial building lease payments and CAM charges." },
    { code: "5300", name: "Utilities (Power, Gas, Water)", currency: "LAK", type: "EXPENSE", desc: "High-voltage cold storage electric, kitchen stove gas, and water service." }
  ],

  // ----------------------------------------------------------------------------
  // REALISTIC SUB-ACCOUNTS LINKED TO PARENT ACCOUNTS
  // ----------------------------------------------------------------------------
  subAccounts: [
    { parentCode: "1000", code: "1000-01", name: "Main Dining Register Drawer", desc: "Primary POS register float and daily cash intake." },
    { parentCode: "1000", code: "1000-02", name: "Bar Register Cash Drawer", desc: "Counter float dedicated to cocktail and espresso station." },
    { parentCode: "1000", code: "1000-03", name: "Manager Petty Cash Box", desc: "Emergency cash for local grocery runs and direct store needs." },
    { parentCode: "1010", code: "1010-01", name: "Commercial Checking", desc: "Primary daily checking account for payroll and wire payouts." },
    { parentCode: "1010", code: "1010-02", name: "Tax Reserve Savings", desc: "Dedicated escrow savings for quarterly VAT payments." },
    { parentCode: "1200", code: "1200-01", name: "Proteins & Fresh Seafood", desc: "Refrigerated chicken, beef cuts, pork, and seafood stock." },
    { parentCode: "1200", code: "1200-02", name: "Dry Pantry & Spices", desc: "Rices, dry noodles, imported sauces, and bulk condiments." },
    { parentCode: "1200", code: "1200-03", name: "Beer & Liquor Stock", desc: "Bar bottle reserves and keg cold storage inventory." },
    { parentCode: "4000", code: "4000-01", name: "Lunch Table Service", desc: "Daytime meal sales receipts (11:00 AM – 3:00 PM)." },
    { parentCode: "4000", code: "4000-02", name: "Dinner Table Service", desc: "Evening dining revenue (5:00 PM – 10:30 PM)." },
    { parentCode: "5000", code: "5000-01", name: "Fresh Local Produce", desc: "Daily morning local greens, herbs, and market fruit." },
    { parentCode: "5000", code: "5000-02", name: "Wholesale Meat Supply", desc: "Commercial deliveries from certified butchery distributors." }
  ]
};
// ==============================================================================


// ==============================================================================
// JS 2: CURRENCY SETTINGS STORE (STARTING DR, CR-LAK, CR-USD, CR-THB)
// Dynamic manager: Adding a currency creates a new CR column across all tables.
// ==============================================================================
const CurrencyStore = {
  // Ordered sequence starting from LAK, USD, and THB (Baht)
  currencies: [
    { code: "LAK", name: "Lao Kip", symbol: "₭", isBase: false },
    { code: "USD", name: "US Dollar", symbol: "$", isBase: true },
    { code: "THB", name: "Thai Baht", symbol: "฿", isBase: false }
  ],

  add(code, name, symbol) {
    const cleanCode = code.toUpperCase().trim();
    if (!cleanCode || !name.trim()) {
      alert("Please provide both Currency Code and Name.");
      return;
    }
    if (this.currencies.some(c => c.code === cleanCode)) {
      alert(`Currency ${cleanCode} already exists.`);
      return;
    }
    this.currencies.push({
      code: cleanCode,
      name: name.trim(),
      symbol: symbol.trim() || cleanCode,
      isBase: false
    });
    this.render();
    setupJournalColumns(); // Rebuilds table headers & columns in all areas
    initCoaCurrencyFilter();
  },

  edit(code) {
    const cur = this.currencies.find(c => c.code === code);
    if (!cur) return;
    const newName = prompt(`Edit name for currency ${cur.code}:`, cur.name);
    if (newName && newName.trim()) {
      cur.name = newName.trim();
      this.render();
      setupJournalColumns();
    }
  },

  remove(code) {
    const cur = this.currencies.find(c => c.code === code);
    if (!cur) return;
    if (cur.isBase) {
      alert("Cannot remove the base currency (USD).");
      return;
    }
    if (confirm(`Remove currency ${cur.code} (${cur.name})? All transaction columns will adapt automatically.`)) {
      this.currencies = this.currencies.filter(c => c.code !== code);
      this.render();
      setupJournalColumns();
      initCoaCurrencyFilter();
    }
  },

  render() {
    const tbody = document.getElementById('currencyTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    this.currencies.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong style="font-family: monospace; color: #064e3b;">${c.code}</strong></td>
        <td>${escapeHtml(c.name)}</td>
        <td><span class="currency-tag">${escapeHtml(c.symbol)}</span></td>
        <td>
          ${c.isBase ? '<span style="color: #059669; font-weight: 700; font-size: 11.5px;">★ Base Currency</span>' : '<span style="color: #64748b; font-size: 11.5px;">Operating</span>'}
        </td>
        <td style="text-align: right;">
          <button type="button" class="btn-icon-edit" style="margin-right: 4px;" onclick="CurrencyStore.edit('${c.code}')" title="Edit Currency">✏️</button>
          ${!c.isBase ? `<button type="button" class="je-btn-del" onclick="CurrencyStore.remove('${c.code}')" title="Remove Currency">✕</button>` : ''}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
};

function handleAddCurrency() {
  const code = document.getElementById('newCurrencyCode').value;
  const name = document.getElementById('newCurrencyName').value;
  const symbol = document.getElementById('newCurrencySymbol').value;
  CurrencyStore.add(code, name, symbol);
  document.getElementById('newCurrencyCode').value = '';
  document.getElementById('newCurrencyName').value = '';
  document.getElementById('newCurrencySymbol').value = '';
}
// ==============================================================================


// ==============================================================================
// JS 3: CLUSTERED JOURNAL MODULE & DYNAMIC MULTI-CURRENCY COLUMNS ENGINE
// Handles DR + dynamic CR-Currency columns, clean account names, and clusters.
// ==============================================================================
const JournalModule = {
  // Master entry ledger
  entries: [
    { id: "OJM-0926-0001", date: "2026-09-18", account: "Cash on Hand", currency: "USD", memo: "Daily register cash closeout", debit: 1420.50, credit: 0 },
    { id: "OJM-0926-0001", date: "2026-09-18", account: "Food Sales — Dine-in", currency: "USD", memo: "Dine-in USD allocation", debit: 0, credit: 1000.00 },
    { id: "OJM-0926-0001", date: "2026-09-18", account: "Food Sales — Dine-in", currency: "LAK", memo: "Dine-in LAK allocation equivalent", debit: 0, credit: 420.50 },
    { id: "OJM-0926-0002", date: "2026-09-18", account: "Cost of Goods Sold — Food", currency: "LAK", memo: "Morning fresh vegetable procurement", debit: 8500000.00, credit: 0 },
    { id: "OJM-0926-0002", date: "2026-09-18", account: "Operating Bank Account", currency: "LAK", memo: "Direct commercial wire for market goods", debit: 0, credit: 8500000.00 },
    { id: "OJM-0826-0001", date: "2026-08-15", account: "Cash on Hand", currency: "USD", memo: "Historical mid-month cash register intake", debit: 1250.00, credit: 0 },
    { id: "OJM-0826-0001", date: "2026-08-15", account: "Food Sales — Dine-in", currency: "USD", memo: "Historical mid-month dining receipts", debit: 0, credit: 1250.00 }
  ],
  sequence: 3
};

// ------------------------------------------------------------------------------
// DYNAMIC ENTRY ID GENERATION
// ------------------------------------------------------------------------------
function generateEntryId() {
  const words = (AccountingStore.companyName || "Oon Jai Marketplace").trim().split(/\s+/).filter(w => w.length > 0);
  const initials = words.map(w => w[0].toUpperCase()).join('') || "OJM";
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const counterStr = String(JournalModule.sequence).padStart(4, '0');
  return `${initials}-${mm}${yy}-${counterStr}`;
}

function updateNextEntryIdDisplay() {
  const display = document.getElementById('jeNextIdDisplay');
  if (display) {
    display.textContent = `Entry ID: ${generateEntryId()}`;
  }
}

function updateCompanySettings() {
  const nameInput = document.getElementById('settingCompanyName');
  if (nameInput) {
    AccountingStore.companyName = nameInput.value.trim() || "Oon Jai Marketplace";
    updateNextEntryIdDisplay();
  }
}

// ------------------------------------------------------------------------------
// CLEAN ACCOUNT DISPLAY FORMATTER (STRIPS CODE, ADDS CURRENCY)
// ------------------------------------------------------------------------------
function getCleanAccountDisplay(accountStr, explicitCurrency = null) {
  if (!accountStr) return { name: "Unassigned Account", currency: "" };

  // If passed with code e.g. "1000 — Cash on Hand" or "1000"
  let cleanName = accountStr;
  let detectedCurrency = explicitCurrency || "";

  const matched = AccountingStore.accounts.find(a => 
    a.code === accountStr || 
    a.name.toLowerCase() === accountStr.toLowerCase() ||
    accountStr.includes(a.name) ||
    accountStr.startsWith(a.code)
  );

  if (matched) {
    cleanName = matched.name;
    detectedCurrency = explicitCurrency || matched.currency;
  } else {
    // Strip leading digits/dashes if raw string has them (e.g. "1000 - Cash" -> "Cash")
    cleanName = cleanName.replace(/^\d+\s*[-—–]\s*/, '').replace(/\s*\([A-Z]{3}\)$/, '').trim();
  }

  return {
    name: cleanName,
    currency: detectedCurrency
  };
}

// ------------------------------------------------------------------------------
// DYNAMIC GENERAL HEADERS BUILDER ACROSS ALL TRANSACTION TABLES
// ------------------------------------------------------------------------------
function setupJournalColumns() {
  syncCoaDatalist();
  CurrencyStore.render();
  updateNextEntryIdDisplay();

  const currencies = CurrencyStore.currencies;

  // 1. Build Header for Post Form (.je-table)
  const jeHeader = document.getElementById('jeHeaderRow');
  if (jeHeader) {
    let crHeaders = '';
    currencies.forEach(c => {
      crHeaders += `<th class="num" style="width: 140px;">CR-${c.code}</th>`;
    });
    jeHeader.innerHTML = `
      <th style="width: 28%;">Account (Search & Select)</th>
      <th style="width: 32%;">Line Memo / Reference</th>
      <th class="num" style="width: 130px;">DR</th>
      ${crHeaders}
      <th style="width: 40px; text-align: center;">X</th>
    `;
  }

  // 2. Build Unified Master Headers for Journal History, New, and All Transactions
  const historyHeader = document.getElementById('thJournalHistoryRow');
  const newHeader = document.getElementById('thNewTransRow');
  const allHeader = document.getElementById('thAllTransRow');

  let dynamicCrHeaders = '';
  currencies.forEach(c => {
    dynamicCrHeaders += `<th class="num" style="width: 130px;">CR-${c.code}</th>`;
  });

  const baseHeaderHtml = `
    <th style="width: 110px;">Date</th>
    <th style="width: 140px;">Entry ID</th>
    <th>Memo / Reference</th>
    <th style="width: 270px;">Account</th>
    <th class="num" style="width: 130px;">DR</th>
    ${dynamicCrHeaders}
  `;

  if (historyHeader) {
    historyHeader.innerHTML = `${baseHeaderHtml}<th style="width: 60px; text-align: right;">Action</th>`;
  }
  if (newHeader) {
    newHeader.innerHTML = baseHeaderHtml;
  }
  if (allHeader) {
    allHeader.innerHTML = baseHeaderHtml;
  }

  // Reset lines in posting table
  resetJournalLinesForm();

  // Render all transaction tables with new dynamic headers
  renderJournalHistoryTable();
  renderNewTransactionsTable();
  renderAllTransactionsTable();
}

// ------------------------------------------------------------------------------
// POST JOURNAL FORM ROW BUILDER (DR + DYNAMIC CR-COLUMNS)
// ------------------------------------------------------------------------------
function resetJournalLinesForm() {
  const tbody = document.getElementById('jeLinesBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  addJournalLineRow();
  addJournalLineRow();
  calculateJournalBalance();
}

function addJournalLineRow() {
  const tbody = document.getElementById('jeLinesBody');
  if (!tbody) return;

  const currencies = CurrencyStore.currencies;
  let crInputs = '';
  currencies.forEach(c => {
    crInputs += `
      <td>
        <input type="text" class="num je-line-cr" data-currency="${c.code}" placeholder="0.00" 
          onfocus="unformatNumber(this)" onblur="formatNumber(this)" oninput="calculateJournalBalance()" />
      </td>
    `;
  });

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>
      <input type="text" class="je-line-acc" placeholder="Search account..." list="coaList" />
    </td>
    <td>
      <input type="text" class="je-line-memo" placeholder="Line note / reference..." />
    </td>
    <td>
      <input type="text" class="num je-line-dr" placeholder="0.00" 
        onfocus="unformatNumber(this)" onblur="formatNumber(this)" oninput="calculateJournalBalance()" />
    </td>
    ${crInputs}
    <td style="text-align: center;">
      <button type="button" class="je-btn-del" onclick="removeJournalLineRow(this)">✕</button>
    </td>
  `;
  tbody.appendChild(tr);
  calculateJournalBalance();
}

function removeJournalLineRow(btn) {
  const tbody = document.getElementById('jeLinesBody');
  if (tbody.querySelectorAll('tr').length <= 2) {
    alert("A double-entry transaction requires at least 2 lines.");
    return;
  }
  btn.closest('tr').remove();
  calculateJournalBalance();
}

function formatNumber(input) {
  const val = parseCleanNumber(input.value);
  input.value = val > 0 ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
}

function unformatNumber(input) {
  const val = parseCleanNumber(input.value);
  input.value = val > 0 ? val : '';
}

function parseCleanNumber(val) {
  if (!val) return 0;
  const clean = String(val).replace(/,/g, '').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function calculateJournalBalance() {
  let totalDebit = 0;
  let totalCredit = 0;

  document.querySelectorAll('.je-line-dr').forEach(inp => {
    totalDebit += parseCleanNumber(inp.value);
  });

  document.querySelectorAll('.je-line-cr').forEach(inp => {
    totalCredit += parseCleanNumber(inp.value);
  });

  const diff = Math.abs(totalDebit - totalCredit);
  const badge = document.getElementById('jeBalanceIndicator');
  const postBtn = document.getElementById('btnPostJournal');

  if (totalDebit > 0 && diff < 0.001) {
    badge.className = "je-status-badge balanced";
    badge.textContent = `Balanced ($${totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })})`;
    if (postBtn) postBtn.disabled = false;
  } else if (totalDebit === 0 && totalCredit === 0) {
    badge.className = "je-status-badge balanced";
    badge.textContent = "Balanced";
    if (postBtn) postBtn.disabled = false;
  } else {
    badge.className = "je-status-badge unbalanced";
    badge.textContent = `Out of Balance: $${diff.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    if (postBtn) postBtn.disabled = true;
  }
}

// ------------------------------------------------------------------------------
// SUBMIT & POST TRANSACTION
// ------------------------------------------------------------------------------
function submitJournalEntry() {
  const transDate = document.getElementById('jeTransDate').value;
  const generalMemo = document.getElementById('jeGeneralMemo').value.trim();
  const rows = document.querySelectorAll('#jeLinesBody tr');

  if (!transDate || !generalMemo) {
    alert("Please provide both a transaction date and a general memo.");
    return;
  }

  let totalDebit = 0;
  let totalCredit = 0;
  const linesToPost = [];

  rows.forEach(row => {
    const rawAcc = row.querySelector('.je-line-acc').value.trim();
    const memo = row.querySelector('.je-line-memo').value.trim() || generalMemo;
    const debit = parseCleanNumber(row.querySelector('.je-line-dr').value);

    // Identify and sanitize clean account name
    const accInfo = getCleanAccountDisplay(rawAcc);

    if (rawAcc && debit > 0) {
      totalDebit += debit;
      linesToPost.push({
        account: accInfo.name,
        currency: accInfo.currency || "USD",
        memo: memo,
        debit: debit,
        credit: 0
      });
    }

    // Check all multi-currency credit columns in this row
    row.querySelectorAll('.je-line-cr').forEach(crInput => {
      const crVal = parseCleanNumber(crInput.value);
      const crCurr = crInput.getAttribute('data-currency');
      if (rawAcc && crVal > 0) {
        totalCredit += crVal;
        linesToPost.push({
          account: accInfo.name,
          currency: crCurr,
          memo: memo,
          debit: 0,
          credit: crVal
        });
      }
    });
  });

  if (linesToPost.length < 2) {
    alert("Please enter at least 2 valid transaction lines.");
    return;
  }

  if (Math.abs(totalDebit - totalCredit) >= 0.001) {
    alert(`Entry is unbalanced. Total DR ($${totalDebit.toFixed(2)}) must equal Total CR ($${totalCredit.toFixed(2)}).`);
    return;
  }

  const entryId = generateEntryId();
  linesToPost.forEach(item => {
    JournalModule.entries.unshift({
      id: entryId,
      date: transDate,
      account: item.account,
      currency: item.currency,
      memo: item.memo,
      debit: item.debit,
      credit: item.credit
    });
  });

  JournalModule.sequence++;
  updateNextEntryIdDisplay();
  document.getElementById('jeGeneralMemo').value = '';
  resetJournalLinesForm();
  renderJournalHistoryTable();
  renderNewTransactionsTable();
  renderAllTransactionsTable();

  alert(`Success: Journal Voucher ${entryId} posted.`);
}

// ------------------------------------------------------------------------------
// UNIFIED MASTER TABLE RENDERING (CLUSTER-BY-ENTRY-ID WITH DYNAMIC CR COLUMNS)
// ------------------------------------------------------------------------------
function renderTransactionRowsToTbody(tbody, records, showAction = false) {
  if (!tbody) return;
  tbody.innerHTML = '';

  const currencies = CurrencyStore.currencies;
  const totalColumns = 5 + currencies.length + (showAction ? 1 : 0);

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${totalColumns}" style="text-align: center; color: var(--text-muted); padding: 24px;">No matching transactions found.</td></tr>`;
    return;
  }

  // Group by Entry ID for distinct clustering
  const clusters = {};
  records.forEach(r => {
    if (!clusters[r.id]) clusters[r.id] = [];
    clusters[r.id].push(r);
  });

  Object.keys(clusters).forEach(entryId => {
    const lines = clusters[entryId];
    const totalLines = lines.length;
    const firstLine = lines[0];

    lines.forEach((line, idx) => {
      const tr = document.createElement('tr');
      const isStart = idx === 0;
      tr.className = isStart ? 'cluster-row-start' : 'cluster-row-cont';

      // Clean account name without numeric code, displaying assigned currency
      const cleanAcc = getCleanAccountDisplay(line.account, line.currency);

      // Construct dynamic credit columns (LAK, USD, THB, etc.)
      let crColumnsHtml = '';
      currencies.forEach(c => {
        const isMatch = line.currency === c.code && line.credit > 0;
        crColumnsHtml += `
          <td class="num" style="font-weight: 600; color: ${isMatch ? '#065f46' : '#94a3b8'};">
            ${isMatch ? line.credit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
          </td>
        `;
      });

      tr.innerHTML = `
        ${isStart ? `<td rowspan="${totalLines}" style="vertical-align: top; font-weight: 600; color: #1e293b; border-right: 1px solid #e2e8f0;">${firstLine.date}</td>` : ''}
        ${isStart ? `<td rowspan="${totalLines}" style="vertical-align: top; font-family: monospace; font-weight: 700; color: #065f46; border-right: 1px solid #e2e8f0;">${entryId}</td>` : ''}
        <td style="color: var(--text-muted); font-size: 12.5px;">${escapeHtml(line.memo)}</td>
        <td>
          <span class="account-clean-name">${escapeHtml(cleanAcc.name)}</span>
          ${cleanAcc.currency ? `<span class="account-curr-pill">${cleanAcc.currency}</span>` : ''}
        </td>
        <td class="num" style="font-weight: 600; color: ${line.debit > 0 ? '#065f46' : '#94a3b8'};">
          ${line.debit > 0 ? line.debit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
        </td>
        ${crColumnsHtml}
        ${showAction && isStart ? `
          <td rowspan="${totalLines}" style="vertical-align: top; text-align: right; border-left: 1px solid #e2e8f0;">
            <button type="button" class="btn-icon-delete" onclick="deleteTransactionCluster('${entryId}')" title="Delete Entry Cluster">
              <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </td>` : ''}
      `;
      tbody.appendChild(tr);
    });
  });
}

function renderJournalHistoryTable(records = JournalModule.entries) {
  const tbody = document.getElementById('tblJournalHistoryBody');
  renderTransactionRowsToTbody(tbody, records, true);
}

function deleteTransactionCluster(id) {
  if (confirm(`Are you sure you want to delete transaction cluster ${id}?`)) {
    JournalModule.entries = JournalModule.entries.filter(t => t.id !== id);
    renderJournalHistoryTable();
    renderNewTransactionsTable();
    renderAllTransactionsTable();
  }
}

function filterJournalHistory() {
  const query = (document.getElementById('jeSearchInput')?.value || '').toLowerCase().trim();
  const period = document.getElementById('jePeriodSelect')?.value || 'all';
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentYear = `${now.getFullYear()}`;

  const filtered = JournalModule.entries.filter(entry => {
    const matchesQuery = entry.account.toLowerCase().includes(query) ||
                         entry.memo.toLowerCase().includes(query) ||
                         entry.id.toLowerCase().includes(query);
    let matchesPeriod = true;
    if (period === 'month') matchesPeriod = entry.date.startsWith(currentMonth);
    if (period === 'year') matchesPeriod = entry.date.startsWith(currentYear);
    return matchesQuery && matchesPeriod;
  });

  renderJournalHistoryTable(filtered);
}

function exportJournalCSV() {
  const currencies = CurrencyStore.currencies;
  let crHeaders = currencies.map(c => `CR-${c.code}`).join(',');
  let csv = `Date,Entry ID,Memo,Account,Currency,DR,${crHeaders}\n`;

  JournalModule.entries.forEach(e => {
    let crValues = currencies.map(c => (e.currency === c.code && e.credit > 0) ? e.credit : 0).join(',');
    csv += `"${e.date}","${e.id}","${e.memo.replace(/"/g, '""')}","${e.account}","${e.currency}",${e.debit},${crValues}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `journal_transactions_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

// ------------------------------------------------------------------------------
// NEW TRANSACTIONS & ALL TRANSACTIONS (CURRENT MONTH VS HISTORICAL ARCHIVE)
// ------------------------------------------------------------------------------
function getCurrentMonthPrefix() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function renderNewTransactionsTable() {
  const tbody = document.getElementById('newTransactionsBody');
  const currentMonth = getCurrentMonthPrefix();
  const newRecords = JournalModule.entries.filter(t => t.date.startsWith(currentMonth));
  renderTransactionRowsToTbody(tbody, newRecords, false);
}

function renderAllTransactionsTable() {
  const tbody = document.getElementById('allTransactionsBody');
  const currentMonth = getCurrentMonthPrefix();
  const archiveRecords = JournalModule.entries.filter(t => !t.date.startsWith(currentMonth));
  renderTransactionRowsToTbody(tbody, archiveRecords, false);
}
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
    filterSelect.value = currentVal || 'ALL';
  }

  if (modalSelect) {
    modalSelect.innerHTML = '';
    CurrencyStore.currencies.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.code;
      opt.textContent = `${c.code} — ${c.name}`;
      modalSelect.appendChild(opt);
    });
  }
}

function syncCoaDatalist() {
  const dl = document.getElementById('coaList');
  if (!dl) return;
  dl.innerHTML = '';
  AccountingStore.accounts.forEach(acc => {
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
  tbody.innerHTML = '';

  const visibleAccounts = AccountingStore.accounts.filter(acc => {
    return filterCurr === 'ALL' || acc.currency === filterCurr;
  });

  if (visibleAccounts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">No accounts found for currency: ${filterCurr}</td></tr>`;
    return;
  }

  visibleAccounts.forEach(acc => {
    const badgeClass = `badge-${acc.type.toLowerCase()}`;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family: monospace; font-weight: 700; color: #064e3b;">${acc.code}</td>
      <td><strong>${escapeHtml(acc.name)}</strong></td>
      <td><span class="badge-currency">${acc.currency}</span></td>
      <td><span class="badge-type ${badgeClass}">${acc.type}</span></td>
      <td style="color: var(--text-muted);">${escapeHtml(acc.desc || '—')}</td>
      <td style="text-align: right;">
        <div style="display: inline-flex; gap: 6px;">
          <button type="button" class="btn-action-edit" title="Edit Account" onclick="openEditAccountModal('${acc.code}')">✏️</button>
          <button type="button" class="btn-action-delete" title="Delete Account" onclick="promptDeleteAccount('${acc.code}')">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  syncSubAccountParentDropdown();
  syncCoaDatalist();
}

function openAddAccountModal() {
  initCoaCurrencyFilter();
  document.getElementById('modalAccountTitle').innerText = 'Add New Account';
  document.getElementById('accountOrigCode').value = '';
  document.getElementById('formAccount').reset();
  openModal('modalAccount');
  document.getElementById('accCode').focus();
}

function openEditAccountModal(code) {
  const acc = AccountingStore.accounts.find(a => a.code === code);
  if (!acc) return;
  initCoaCurrencyFilter();
  document.getElementById('modalAccountTitle').innerText = 'Edit Account';
  document.getElementById('accountOrigCode').value = acc.code;
  document.getElementById('accCode').value = acc.code;
  document.getElementById('accName').value = acc.name;
  document.getElementById('accCurrency').value = acc.currency;
  document.getElementById('accType').value = acc.type;
  document.getElementById('accDesc').value = acc.desc || '';
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
        alert('Account Code already in use.');
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
      alert('Account Code already exists.');
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
// ==============================================================================


// ==============================================================================
// JS 5: MODULE 2 — SUB-ACCOUNTS CONTROLLER
// ==============================================================================
function syncSubAccountParentDropdown() {
  const select = document.getElementById('subParentCode');
  if (!select) return;
  select.innerHTML = '';
  AccountingStore.accounts.forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc.code;
    opt.textContent = `${acc.code} — ${acc.name} (${acc.currency})`;
    select.appendChild(opt);
  });
}

function renderSubAccountsTable() {
  const tbody = document.getElementById('subAccountTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  AccountingStore.subAccounts.forEach(sub => {
    const parent = AccountingStore.accounts.find(a => a.code === sub.parentCode);
    const parentLabel = parent ? `${parent.code} — ${parent.name} (${parent.currency})` : sub.parentCode;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="ref-pill">${escapeHtml(parentLabel)}</span></td>
      <td style="font-family: monospace; font-weight: 700; color: #064e3b;">${sub.code}</td>
      <td><strong>${escapeHtml(sub.name)}</strong></td>
      <td style="color: var(--text-muted);">${escapeHtml(sub.desc || '—')}</td>
      <td style="text-align: right;">
        <div style="display: inline-flex; gap: 6px;">
          <button type="button" class="btn-action-edit" title="Edit Sub-Account" onclick="openEditSubAccountModal('${sub.code}')">✏️</button>
          <button type="button" class="btn-action-delete" title="Delete Sub-Account" onclick="promptDeleteSubAccount('${sub.code}')">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAddSubAccountModal() {
  syncSubAccountParentDropdown();
  document.getElementById('modalSubAccountTitle').innerText = 'Add Sub-Account';
  document.getElementById('subAccountOrigCode').value = '';
  document.getElementById('formSubAccount').reset();
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
  openModal('modalSubAccount');
}

function handleSubAccountFormSubmit(event) {
  event.preventDefault();
  const origCode = document.getElementById('subAccountOrigCode').value;
  const parentCode = document.getElementById('subParentCode').value;
  const code = document.getElementById('subCode').value.trim();
  const name = document.getElementById('subName').value.trim();
  const desc = document.getElementById('subDesc').value.trim();

  if (origCode) {
    const sub = AccountingStore.subAccounts.find(s => s.code === origCode);
    if (sub) {
      if (origCode !== code && AccountingStore.subAccounts.some(s => s.code === code)) {
        alert('Sub-Account code already exists.');
        return;
      }
      sub.parentCode = parentCode;
      sub.code = code;
      sub.name = name;
      sub.desc = desc;
    }
  } else {
    if (AccountingStore.subAccounts.some(s => s.code === code)) {
      alert('Sub-Account code already exists.');
      return;
    }
    AccountingStore.subAccounts.push({ parentCode, code, name, desc });
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
// ==============================================================================


// ==============================================================================
// JS 6: APPLICATION NAVIGATION, ACCORDION & MODAL UTILITIES
// ==============================================================================
function activateCategory(element, defaultTabId) {
  document.querySelectorAll('.nav-category').forEach(cat => {
    if (cat !== element.parentElement) cat.classList.remove('open');
  });
  element.parentElement.classList.toggle('open');
  if (defaultTabId.startsWith('sec-')) {
    scrollToAccountModule(defaultTabId);
  } else {
    switchTab(defaultTabId);
  }
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick')?.includes(tabId));
  if (btn) {
    btn.classList.add('active');
    document.getElementById('mainHeaderTitle').textContent = btn.textContent.trim();
  }

  const targetTab = document.getElementById(tabId);
  if (targetTab) targetTab.classList.add('active');

  if (tabId === 'journal') renderJournalHistoryTable();
  if (tabId === 'transactions-new') renderNewTransactionsTable();
  if (tabId === 'transactions-all') renderAllTransactionsTable();
  if (tabId === 'dashboard') initSummaryChart();
}

function scrollToAccountModule(moduleId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  const accContainer = document.getElementById('accounts-modular-container');
  if (accContainer) accContainer.classList.add('active');

  const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick')?.includes(moduleId));
  if (btn) {
    btn.classList.add('active');
    document.getElementById('mainHeaderTitle').textContent = "Accounts — " + btn.textContent.trim();
  }

  const moduleTarget = document.getElementById(moduleId);
  if (moduleTarget) {
    moduleTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function handleTableSearch(term) {
  const query = term.toLowerCase().trim();
  document.querySelectorAll('#coaTableBody tr, #subAccountTableBody tr').forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(query) ? '' : 'none';
  });
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let chartInstance = null;
function initSummaryChart() {
  const canvas = document.getElementById('summaryChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
      datasets: [{ label: 'Revenue', data: [2000, 2500, 3200, 4100, 4800], borderColor: '#059669', borderWidth: 2 }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function updateChart() {
  if (chartInstance) chartInstance.update();
}

// ------------------------------------------------------------------------------
// INITIAL APPLICATION BOOTSTRAP
// ------------------------------------------------------------------------------
window.onload = function() {
  const today = new Date().toISOString().split('T')[0];
  const datePicker = document.getElementById('jeTransDate');
  if (datePicker) datePicker.value = today;

  initCoaCurrencyFilter();
  setupJournalColumns();
  renderChartOfAccountsTable();
  renderSubAccountsTable();
};
// ==============================================================================
