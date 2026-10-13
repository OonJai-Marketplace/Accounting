// ==============================================================================

// ==============================================================================
// JS V6: UNIFIED DIALOGS, MULTI-DATE BATCH ENTRY & CURRENCY SYMBOL BADGES
// ==============================================================================
function currencySymbolV6(code) {
  const normalized = String(code || '').toUpperCase();
  const configured = typeof CurrencyStore !== 'undefined'
    ? (CurrencyStore.currencies || []).find(item => String(item.code || '').toUpperCase() === normalized)
    : null;
  if (configured?.symbol) return configured.symbol;
  const fallback = { LAK: '₭', USD: '$', THB: '฿', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥' };
  return fallback[normalized] || normalized.slice(0, 3);
}

// Keep account choices short and currency-aware. The selected row shows a compact badge.
function accountDisplayName1439(account){
 const currency=String(account.currency||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 return String(account.name||'').replace(new RegExp('\\s*\\('+currency+'\\)\\s*$','i'),'').replace(new RegExp('(?:\\s*[-—–·]\\s*|\\s+)'+currency+'$','i'),'').trim();
}
syncCoaDatalist = function() {
  const dl = document.getElementById('coaList');
  if (!dl) return;
  dl.innerHTML = '';
  AccountingStore.accounts.filter(acc=>acc.isPosting!==false).forEach(acc => {
    const opt = document.createElement('option');
    /* Include the account code in the selected value so identically named
       accounts in different currencies cannot resolve to the wrong badge. */
    opt.value = `${acc.code} — ${accountDisplayName1439(acc)}`;
    opt.textContent = `${currencySymbolV6(acc.currency)}  ${acc.currency} — ${acc.type}`;
    dl.appendChild(opt);
  });
};

function updateJournalAccountBadge(input) {
  if (!input) return;
  const account = getSelectedAccountInfo(input.value);
  const credit = input.closest('tr')?.querySelector('.je-line-cr');
  if (credit) credit.dataset.currency = account?.currency || '';
  const badge = input.closest('.account-input-wrap')?.querySelector('.currency-symbol-badge');
  input.dataset.accountCode = account?.code || '';
  input.dataset.accountCurrency = account?.currency || '';
  if (!badge) return;
  badge.dataset.currencyCode = account?.currency || '';
  badge.textContent = account ? currencySymbolV6(account.currency) : '¤';
  badge.title = account ? `${account.currency} — ${account.code}` : 'Select an account';
}

const addJournalLineRowV5 = addJournalLineRow;
addJournalLineRow = function(accountVal = '', memoVal = '', drVal = '', crMap = {}) {
  const tbody = document.getElementById('jeLinesBody');
  if (!tbody) return;
  const mainDate = document.getElementById('jeTransDate')?.value || '';
  const currencies = CurrencyStore.currencies || [];
  const account = getSelectedAccountInfo(accountVal);
  const cleanAccount = account
    ? `${account.code} — ${accountDisplayName1439(account)}`
    : String(accountVal || '').replace(/\s*\([A-Z]{3}\)$/, '').trim();
  const creditCurrency = account?.currency || Object.keys(crMap)[0] || '';
  const creditValue = crMap[creditCurrency] || '';
  const crInputs = `<td><input type="text" class="num je-line-cr" data-currency="${escapeHtml(creditCurrency)}" placeholder="0.00" value="${escapeHtml(String(creditValue))}" onfocus="unformatNumber(this)" onblur="formatNumber(this)" oninput="calculateJournalBalance()" /></td>`;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="je-date-col"><input type="date" class="je-line-date" value="${mainDate}" onclick="if(this.showPicker) this.showPicker();" onchange="calculateJournalBalance()"></td>
    <td><div class="account-input-wrap"><span class="currency-symbol-badge" data-currency-code="${account?.currency || ''}" title="${account?.currency || 'Select an account'}">${account ? currencySymbolV6(account.currency) : '¤'}</span><input type="text" class="je-line-acc" placeholder="Search account..." list="coaList" value="${escapeHtml(cleanAccount)}" oninput="updateJournalAccountBadge(this);calculateJournalBalance()" onchange="updateJournalAccountBadge(this);calculateJournalBalance()" /></div></td>
    <td><input type="text" class="je-line-memo" placeholder="Line note / reference..." value="${escapeHtml(String(memoVal))}" /></td>
    <td><input type="text" class="num je-line-dr" placeholder="0.00" value="${drVal}" onfocus="unformatNumber(this)" onblur="formatNumber(this)" oninput="calculateJournalBalance()" /></td>
    ${crInputs}
    <td class="action-col no-print" style="text-align:center"><button type="button" class="je-btn-del" style="width:22px;height:22px;font-size:11px" data-permission-action1440="edit" onclick="removeJournalLineRow(this)">✕</button></td>`;
  tbody.appendChild(tr);
  calculateJournalBalance();
};

const setupJournalColumnsV5 = setupJournalColumns;
setupJournalColumns = function() {
  setupJournalColumnsV5();
  syncCoaDatalist();
  const jeHeader = document.getElementById('jeHeaderRow');
  if (jeHeader && !jeHeader.querySelector('.je-date-col')) {
    const th = document.createElement('th');
    th.className = 'je-date-col';
    th.style.width = '138px';
    th.textContent = 'Date';
    jeHeader.insertBefore(th, jeHeader.firstChild);
  }
  document.querySelectorAll('.je-line-acc').forEach(updateJournalAccountBadge);
  toggleMultipleDates(false);
};

function toggleMultipleDates(syncRows = true) {
  const enabled = !!document.getElementById('jeMultipleDates')?.checked;
  document.body.classList.toggle('je-multi-date', enabled);
  if (enabled && syncRows) {
    const mainDate = document.getElementById('jeTransDate')?.value || '';
    document.querySelectorAll('.je-line-date').forEach(inp => { if (!inp.value) inp.value = mainDate; });
  }
  calculateJournalBalance();
}

document.addEventListener('change', event => {
  if (event.target?.id === 'jeTransDate' && document.getElementById('jeMultipleDates')?.checked) {
    document.querySelectorAll('.je-line-date').forEach(inp => { if (!inp.dataset.manualDate) inp.value = event.target.value; });
  }
  if (event.target?.matches('.je-line-date')) event.target.dataset.manualDate = '1';
});

function getMultiDateJournalState() {
  const grouped = {};
  const errors = [];
  document.querySelectorAll('#jeLinesBody tr').forEach((row, index) => {
    const date = (document.getElementById('jeMultipleDates')?.checked ? row.querySelector('.je-line-date')?.value : '') || document.getElementById('jeTransDate')?.value || '';
    const raw = row.querySelector('.je-line-acc')?.value.trim() || '';
    const account = getSelectedAccountInfo(raw);
    const debit = parseCleanNumber(row.querySelector('.je-line-dr')?.value || '');
    const credits = [...row.querySelectorAll('.je-line-cr')].map(i => ({currency:i.dataset.currency,value:parseCleanNumber(i.value)})).filter(x => x.value > 0);
    if (!raw && !debit && !credits.length) return;
    if (!date) { errors.push(`Row ${index + 1}: choose a transaction date.`); return; }
    if (!account) { errors.push(`Row ${index + 1}: select a valid Chart of Accounts account.`); return; }
    if (debit > 0 && credits.length) errors.push(`Row ${index + 1}: use either Debit or Credit, not both.`);
    if (credits.length > 1) errors.push(`Row ${index + 1}: only one credit currency may be used.`);
    credits.forEach(c => { if (c.currency !== account.currency) errors.push(`Row ${index + 1}: ${account.name} must use CR-${account.currency}.`); });
    grouped[date] ||= { totals:{}, lines:[] };
    grouped[date].totals[account.currency] ||= {debit:0,credit:0};
    const memo = row.querySelector('.je-line-memo')?.value.trim() || document.getElementById('jeGeneralMemo')?.value.trim() || '';
    if (debit > 0) {
      grouped[date].totals[account.currency].debit += debit;
      grouped[date].lines.push({account,currency:account.currency,memo,debit,credit:0});
    }
    credits.forEach(c => {
      grouped[date].totals[c.currency] ||= {debit:0,credit:0};
      grouped[date].totals[c.currency].credit += c.value;
      grouped[date].lines.push({account,currency:c.currency,memo,debit:0,credit:c.value});
    });
  });
  const differences = [];
  Object.entries(grouped).forEach(([date,g]) => {
    if (g.lines.length < 2) errors.push(`${date}: at least two posting lines are required.`);
    Object.entries(g.totals).forEach(([currency,t]) => {
      if (Math.abs(t.debit - t.credit) >= .001) differences.push({date,currency,...t});
    });
  });
  return {grouped,errors,differences};
}

const calculateJournalBalanceV5 = calculateJournalBalance;
calculateJournalBalance = function() {
  if (!document.getElementById('jeMultipleDates')?.checked) return calculateJournalBalanceV5();
  const state = getMultiDateJournalState();
  const badge = document.getElementById('jeBalanceIndicator');
  const postBtn = document.getElementById('btnPostJournal');
  if (!badge) return;
  if (state.errors.length) {
    badge.className='je-status-badge unbalanced'; badge.textContent=state.errors[0]; if(postBtn)postBtn.disabled=true; return;
  }
  if (!Object.keys(state.grouped).length) {
    badge.className='je-status-badge balanced'; badge.textContent='Ready — each date balances separately'; if(postBtn)postBtn.disabled=false; return;
  }
  if (state.differences.length) {
    const d=state.differences[0]; badge.className='je-status-badge unbalanced'; badge.textContent=`${d.date} ${currencySymbolV6(d.currency)} ${d.currency}: DR ${formatCompactAmount(d.debit)} / CR ${formatCompactAmount(d.credit)}`; if(postBtn)postBtn.disabled=true; return;
  }
  badge.className='je-status-badge balanced'; badge.textContent=`Balanced — ${Object.keys(state.grouped).length} date${Object.keys(state.grouped).length===1?'':'s'}`; if(postBtn)postBtn.disabled=false;
};

const submitJournalEntryV5 = submitJournalEntry;
submitJournalEntry = function() {
  if (!document.getElementById('jeMultipleDates')?.checked) return submitJournalEntryV5();
  if (JournalModule.editingEntryId) {
    showAppNotification('Multiple Dates Unavailable While Editing','Edit an existing journal voucher using its original single transaction date.',true); return;
  }
  const generalMemo=document.getElementById('jeGeneralMemo')?.value.trim();
  if(!generalMemo){showAppNotification('Missing Data','Please provide the General Description / Memo before posting.',true);return;}
  const state=getMultiDateJournalState();
  if(state.errors.length){showAppNotification('Check Journal Entry',state.errors.join(' '),true);return;}
  if(state.differences.length){const d=state.differences[0];showAppNotification('Unbalanced Batch',`${d.date} does not balance in ${d.currency}. Debit ${formatCompactAmount(d.debit)} vs Credit ${formatCompactAmount(d.credit)}. Each date and currency must balance independently.`,true);return;}
  const groups=Object.entries(state.grouped);
  if(!groups.length){showAppNotification('Incomplete','Enter at least one balanced transaction.',true);return;}
  const postedIds=[];
  groups.forEach(([date,g])=>{
    const entryId=generateEntryId(); postedIds.push(entryId);
    g.lines.forEach(item=>JournalModule.entries.unshift({id:entryId,date,...item,editReason:'',archived:false}));
    JournalModule.sequence++;
  });
  showAppNotification('Batch Posted',`${postedIds.length} journal ${postedIds.length===1?'entry':'entries'} posted successfully: ${postedIds.join(', ')}.`,false);
  const check=document.getElementById('jeMultipleDates'); if(check)check.checked=false; document.body.classList.remove('je-multi-date');
  finalizePostSuccess();
};

