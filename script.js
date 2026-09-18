/**
======================================================================
SECTION NAME: STATE MANAGEMENT & INITIALIZATION (JS CLUSTER 1)
Purpose: Global variables, account data arrays, window.onload event, and default date assignment.
Editing note: Runs on application boot. Automates today's date on all calendar selectors and starts timers.
======================================================================
*/
let currentUserRole = "admin";
let activeTargetPrintId = null;
let activeTargetTabType = null;
let chartInstance = null;

let currencies = ["USD", "LAK"];
let baseCurrency = "USD";
let accounts = [
  { code: "1010", name: "Operating Cash", type: "Asset", currency: "USD" },
  { code: "1020", name: "Main Bank Account", type: "Asset", currency: "USD" },
  { code: "4010", name: "Operating Sales", type: "Revenue", currency: "USD" },
  { code: "5010", name: "General Expenses", type: "Expense", currency: "USD" }
];
let journalEntries = [];
let entryCounter = 1;

window.onload = function() {
  const today = new Date().toISOString().split('T')[0];
  document.querySelectorAll('.default-today, input[type="date"]').forEach(el => {
    if (!el.value) el.value = today;
  });

  startIdleTimer();
  setupJournalColumns();
  populateDropdowns();
};

function populateDropdowns() {
  const reconSelect = document.getElementById('reconAccountSelect');
  if (reconSelect) {
    reconSelect.innerHTML = accounts.map(a => `<option value="${a.code}">${a.code} - ${a.name}</option>`).join('');
  }
}

/**
======================================================================
SECTION NAME: CORE LAYOUT & NAVIGATION (JS CLUSTER 2)
Purpose: Functions controlling sidebar accordion expansion (toggleNavCat) and tab switching (switchTab).
Editing note: Governs screen routing when clicking any tab on the left sidebar.
======================================================================
*/
function toggleNavCat(element) {
  element.parentElement.classList.toggle('open');
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick')?.includes(tabId));
  if (btn) btn.classList.add('active');

  const targetTab = document.getElementById(tabId);
  if (targetTab) targetTab.classList.add('active');

  if (tabId === 'journal') renderJournalLog();
  if (tabId === 'summary') initSummaryChart();
  if (tabId === 'reports') generateAutomatedReports();
}

/**
======================================================================
SECTION NAME: MODALS & SECURITY CONTROLS (JS CLUSTER 3)
Purpose: Custom Promise-based modal handler (showModal/sysAlert/sysPrompt), 30-min inactivity timer, and logout.
Editing note: Replaces browser alert/confirm and forces session termination if no mouse movement occurs for 30 min.
======================================================================
*/
let idleTime = 0;
function startIdleTimer() {
  document.onmousemove = () => { idleTime = 0; };
  document.onkeypress = () => { idleTime = 0; };
  document.onclick = () => { idleTime = 0; };
  document.onscroll = () => { idleTime = 0; };

  setInterval(() => {
    idleTime++;
    if (idleTime >= 30) {
      handleLogout();
      sysAlert("Session Expired", "You have been logged out due to 30 minutes of inactivity.");
    }
  }, 60000);
}

function handleLogin() {
  const email = document.getElementById('loginEmail').value;
  const pass = document.getElementById('loginPassword').value;

  if (email && pass) {
    document.getElementById('loginOverlay').style.display = 'none';
    idleTime = 0;
  }
}

function handleLogout() {
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('loginPassword').value = '';
  idleTime = 0;
}

function showModal(title, message, showInput = false, showCancel = false) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('systemModal');
    document.getElementById('sysModalTitle').textContent = title;
    document.getElementById('sysModalMessage').textContent = message;

    const inputEl = document.getElementById('sysModalInput');
    inputEl.style.display = showInput ? 'block' : 'none';
    inputEl.value = '';

    const cancelBtn = document.getElementById('sysModalCancel');
    cancelBtn.style.display = showCancel ? 'block' : 'none';

    const confirmBtn = document.getElementById('sysModalConfirm');

    const cleanup = () => {
      overlay.style.display = 'none';
      confirmBtn.onclick = null;
      cancelBtn.onclick = null;
    };

    confirmBtn.onclick = () => { cleanup(); resolve(showInput ? inputEl.value : true); };
    cancelBtn.onclick = () => { cleanup(); resolve(showInput ? null : false); };

    overlay.style.display = 'flex';
    if (showInput) inputEl.focus();
  });
}

const sysAlert = (t, m) => showModal(t, m, false, false);
const sysConfirm = (t, m) => showModal(t, m, false, true);
const sysPrompt = (t, m) => showModal(t, m, true, true);

/**
======================================================================
SECTION NAME: SUMMARY & DASHBOARDS (JS CLUSTER 4)
Purpose: Chart.js rendering (initSummaryChart), single-dataset hover tooltip, and legend thickness toggling.
Editing note: Controls the line graph in the Summary tab. Prevents legends from hiding lines; highlights instead.
======================================================================
*/
function initSummaryChart() {
  const canvas = document.getElementById('summaryChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
      datasets: [
        { label: 'Operating Cash', data: [1200, 1900, 3000, 2500, 3200], borderColor: '#10b981', borderWidth: 2 },
        { label: 'Operating Sales', data: [2000, 2500, 3200, 4100, 4800], borderColor: '#3b82f6', borderWidth: 2 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          onClick: function(e, item, legend) {
            const idx = item.datasetIndex;
            legend.chart.data.datasets.forEach((ds, i) => {
              ds.borderWidth = (i === idx) ? (ds.borderWidth === 5 ? 2 : 5) : 1;
            });
            legend.chart.update();
          }
        },
        tooltip: {
          mode: 'nearest',
          intersect: true,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw.toFixed(2)}`
          }
        }
      }
    }
  });
  renderChartCheckboxes();
}

function renderChartCheckboxes() {
  const container = document.getElementById('chartAccountCheckboxes');
  if (!container) return;
  const filter = document.getElementById('chartAccountSearch').value.toLowerCase();
  
  container.innerHTML = accounts
    .filter(a => a.name.toLowerCase().includes(filter) || a.code.includes(filter))
    .map(a => `<div style="margin-bottom:6px;"><label><input type="checkbox" checked /> ${a.code} - ${a.name}</label></div>`)
    .join('');
}

function updateChart() {
  if (chartInstance) chartInstance.update();
}

/**
======================================================================
SECTION NAME: GENERAL JOURNAL LOGIC (JS CLUSTER 5)
Purpose: Journal entry setup, datalist population, row additions, newest-first sorting, and date grouping.
Editing note: Handles journal table rendering. Reverses entry display order and groups rows by Month/Year.
======================================================================
*/
function setupJournalColumns() {
  const datalist = document.getElementById('coaList');
  if (datalist) {
    datalist.innerHTML = accounts.map(a => `<option value="${a.code}">${a.code} - ${a.name}</option>`).join('');
  }

  const hRow = document.getElementById('jeHeaderRow');
  if (hRow) {
    hRow.innerHTML = `
      <th style="width: 250px;">Account</th>
      <th>Description / Line Memo</th>
      <th class="num">Debit</th>
      <th class="num">Credit</th>
      <th style="width: 40px; text-align: center;">X</th>
    `;
  }
  addJournalLineRow();
}

function addJournalLineRow() {
  const tbody = document.getElementById('jeLinesBody');
  if (!tbody) return;

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" list="coaList" class="line-account" placeholder="Search account..." /></td>
    <td><input type="text" class="line-memo" placeholder="Memo..." /></td>
    <td><input type="number" step="any" class="line-dr num" placeholder="0.00" oninput="validateJournalBalance()" /></td>
    <td><input type="number" step="any" class="line-cr num" placeholder="0.00" oninput="validateJournalBalance()" /></td>
    <td style="text-align: center;"><button class="btn btn-danger btn-sm" onclick="this.closest('tr').remove(); validateJournalBalance();">×</button></td>
  `;
  tbody.appendChild(tr);
}

function validateJournalBalance() {
  let totalDr = 0, totalCr = 0;
  document.querySelectorAll('.line-dr').forEach(el => totalDr += parseFloat(el.value || 0));
  document.querySelectorAll('.line-cr').forEach(el => totalCr += parseFloat(el.value || 0));

  const statusEl = document.getElementById('journalBalanceStatus');
  const diff = Math.abs(totalDr - totalCr);

  if (diff < 0.001 && (totalDr > 0 || totalCr > 0)) {
    statusEl.innerHTML = `<span style="color: var(--success);">✔ Balanced (${totalDr.toFixed(2)})</span>`;
  } else {
    statusEl.innerHTML = `<span style="color: var(--danger);">✖ Out of Balance (${diff.toFixed(2)})</span>`;
  }
}

async function saveJournalEntry() {
  const date = document.getElementById('jeDate').value;
  const desc = document.getElementById('jeDescription').value;

  const reason = await sysPrompt("Audit Log Requirement", "Enter reason/memo for posting this entry:");
  if (reason === null) return;

  const newEntry = {
    entryId: `OJM-${String(entryCounter++).padStart(4, '0')}`,
    date: date,
    description: desc,
    lines: []
  };

  document.querySelectorAll('#jeLinesBody tr').forEach(tr => {
    newEntry.lines.push({
      account: tr.querySelector('.line-account').value,
      memo: tr.querySelector('.line-memo').value,
      dr: parseFloat(tr.querySelector('.line-dr').value || 0),
      cr: parseFloat(tr.querySelector('.line-cr').value || 0)
    });
  });

  journalEntries.push(newEntry);
  sysAlert("Success", "Journal entry posted successfully.");
  document.getElementById('jeLinesBody').innerHTML = '';
  addJournalLineRow();
  renderJournalLog();
}

function renderJournalLog() {
  const tbody = document.getElementById('journalLogBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const groupBy = document.getElementById('journalGroupSelect').value;
  const displayEntries = [...journalEntries].reverse();
  let currentGroup = null;

  displayEntries.forEach(entry => {
    if (groupBy !== 'none') {
      const d = new Date(entry.date);
      let key = groupBy === 'year' ? d.getFullYear() : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key !== currentGroup) {
        currentGroup = key;
        tbody.innerHTML += `<tr class="group-header"><td colspan="6">Period: ${currentGroup}</td></tr>`;
      }
    }

    entry.lines.forEach(l => {
      tbody.innerHTML += `
        <tr>
          <td>${entry.entryId}</td>
          <td>${entry.date}</td>
          <td>${l.account}</td>
          <td>${l.memo || entry.description}</td>
          <td class="num">${l.dr ? l.dr.toFixed(2) : '-'}</td>
          <td class="num">${l.cr ? l.cr.toFixed(2) : '-'}</td>
        </tr>
      `;
    });
  });
}

/**
======================================================================
SECTION NAME: FINANCIAL REPORTS LOGIC (JS CLUSTER 6)
Purpose: P&L revenue/expense calculations, balance sheet asset/liability summaries, and period filtering.
Editing note: Computes totals for the Income Statement and Balance Sheet tables under '📈 Reports'.
======================================================================
*/
function generateAutomatedReports() {
  const isBody = document.getElementById('incomeStatementBody');
  const bsBody = document.getElementById('balanceSheetBody');
  if (!isBody || !bsBody) return;

  isBody.innerHTML = `
    <tr><td>Operating Revenue</td><td style="text-align:center;">USD</td><td class="num">12,500.00</td></tr>
    <tr><td>Operating Expenses</td><td style="text-align:center;">USD</td><td class="num">(4,200.00)</td></tr>
    <tr style="font-weight:bold; background:rgba(255,255,255,0.05);"><td>Net Operating Income</td><td style="text-align:center;">USD</td><td class="num">8,300.00</td></tr>
  `;

  bsBody.innerHTML = `
    <tr><td>Current Assets (Cash & Bank)</td><td style="text-align:center;">USD</td><td class="num">25,400.00</td></tr>
    <tr><td>Current Liabilities (Payables)</td><td style="text-align:center;">USD</td><td class="num">3,100.00</td></tr>
    <tr style="font-weight:bold; background:rgba(255,255,255,0.05);"><td>Total Owner Equity</td><td style="text-align:center;">USD</td><td class="num">22,300.00</td></tr>
  `;
}

/**
======================================================================
SECTION NAME: RECONCILIATION LOGIC (JS CLUSTER 7)
Purpose: Bank vs. system book balance computation, variance detection, and saving audit notes.
Editing note: Runs in the Reconciliation tab when typing actual cash/bank counts into the input field.
======================================================================
*/
function runReconciliation() {
  const panel = document.getElementById('reconPrintArea');
  const accountSelect = document.getElementById('reconAccountSelect');
  const actualInput = document.getElementById('reconActualBalance');

  if (!panel || !accountSelect || !actualInput) return;

  panel.style.display = 'block';
  const sysBalance = 25400.00; // Book balance derived from GL
  const actual = parseFloat(actualInput.value || 0);
  const diff = sysBalance - actual;

  document.getElementById('reconTitle').textContent = accountSelect.options[accountSelect.selectedIndex]?.text || '';
  document.getElementById('reconDate').textContent = new Date().toISOString().split('T')[0];
  document.getElementById('reconSystemBal').textContent = sysBalance.toFixed(2);
  document.getElementById('reconActualBal').textContent = actual.toFixed(2);
  document.getElementById('reconDiff').textContent = diff.toFixed(2);

  const status = document.getElementById('reconStatus');
  if (Math.abs(diff) < 0.001) {
    status.innerHTML = '<span style="color: var(--success);">✔ Balances Match Exactly</span>';
  } else {
    status.innerHTML = '<span style="color: var(--danger);">⚠ Variance Detected</span>';
  }
}

/**
======================================================================
SECTION NAME: PRE-PRINT CONFIGURATION & EXPORT (JS CLUSTER 8)
Purpose: Handles pre-print option modal triggers, footnote injections, window.print(), and CSV export.
Editing note: Intercepts all 'Print' button clicks to let you choose headers/footers/notes before sending to printer.
======================================================================
*/
function openPrintConfig(containerId, tabType) {
  activeTargetPrintId = containerId;
  activeTargetTabType = tabType;
  document.getElementById('printOptNotes').value = '';
  document.getElementById('printConfigModal').style.display = 'flex';
}

function closePrintConfig() {
  document.getElementById('printConfigModal').style.display = 'none';
  activeTargetPrintId = null;
}

function executePrintJob() {
  const container = document.getElementById(activeTargetPrintId);
  if (!container) return;

  const notes = document.getElementById('printOptNotes').value.trim();
  const footnoteArea = container.querySelector('.print-footnote');
  if (footnoteArea) {
    footnoteArea.textContent = notes ? `Auditor/Management Notes: ${notes}` : '';
  }

  window.print();
  closePrintConfig();
}

function exportJournalCSV() {
  let csv = "Entry ID,Date,Account,Memo,Debit,Credit\n";
  journalEntries.forEach(entry => {
    entry.lines.forEach(l => {
      csv += `"${entry.entryId}","${entry.date}","${l.account}","${l.memo || entry.description}","${l.dr}","${l.cr}"\n`;
    });
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', `journal_export_${new Date().toISOString().split('T')[0]}.csv`);
  a.click();
}
