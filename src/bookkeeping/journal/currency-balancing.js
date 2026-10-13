// ==============================================================================

// ==============================================================================
// JS V4: CURRENCY-AWARE BALANCING, MONTHLY ARCHIVING & PRINT CONTROLS
// ==============================================================================
function getSelectedAccountInfo(rawValue) {
  const raw = (rawValue || '').trim();
  if (!raw) return null;
  const accounts = (AccountingStore.accounts || []).filter(a=>a.isPosting!==false);
  const normalized = raw.replace(/\s+/g, ' ').trim();
  const legacy = normalized.match(/^(.*)\s+\(([A-Z]{3})\)$/);
  if (legacy) { const matches = accounts.filter(a => a.name === legacy[1].trim() && a.currency === legacy[2]); return matches.length === 1 ? matches[0] : null; }
  const exactCode = accounts.find(account => String(account.code || '').trim() === normalized);
  if (exactCode) return exactCode;

  /* The Chart of Accounts code is the authoritative identity.  Datalist values
     use "CODE — Name", so resolve that code before considering a name. */
  const codePrefix = normalized.split(/\s+[—–-]\s+|\s+/)[0];
  const prefixedAccount = accounts.find(account => String(account.code || '').trim() === codePrefix);
  if (prefixedAccount) return prefixedAccount;

  const exactDisplay = accounts.find(account =>
    normalized === `${String(account.code || '').trim()} — ${String(account.name || '').trim()}`
  );
  if (exactDisplay) return exactDisplay;

  /* A name is accepted only when it identifies exactly one account.  This
     prevents equally named LAK/USD accounts from borrowing the wrong symbol. */
  const exactNameMatches = accounts.filter(account => String(account.name || '').trim() === normalized);
  return exactNameMatches.length === 1 ? exactNameMatches[0] : null;
}

function getJournalCurrencyState() {
  const currencies = (CurrencyStore.currencies || []).map(c => c.code);
  const totals = Object.fromEntries(currencies.map(c => [c, { debit: 0, credit: 0 }]));
  const errors = [];
  let validLines = 0;

  document.querySelectorAll('#jeLinesBody tr').forEach((row, index) => {
    const accountInput = row.querySelector('.je-line-acc');
    if (!accountInput) return;
    const rawAccount = accountInput.value.trim();
    const account = getSelectedAccountInfo(rawAccount);
    const debit = parseCleanNumber(row.querySelector('.je-line-dr')?.value || '');
    const creditInputs = [...row.querySelectorAll('.je-line-cr')];
    const enteredCredits = creditInputs
      .map(inp => ({ currency: inp.dataset.currency, value: parseCleanNumber(inp.value) }))
      .filter(x => x.value > 0);

    if (!rawAccount && (debit > 0 || enteredCredits.length)) {
      errors.push(`Row ${index + 1}: choose an account first.`);
      return;
    }
    if (!rawAccount) return;
    if (!account) {
      errors.push(`Row ${index + 1}: select a valid Chart of Accounts account.`);
      return;
    }
    if (!totals[account.currency]) totals[account.currency] = { debit: 0, credit: 0 };

    if (debit > 0 && enteredCredits.length) errors.push(`Row ${index + 1}: use either Debit or Credit, not both.`);
    if (enteredCredits.length > 1) errors.push(`Row ${index + 1}: only one credit currency may be used for one account.`);
    enteredCredits.forEach(cr => {
      if (cr.currency !== account.currency) {
        errors.push(`Row ${index + 1}: ${account.name} is a ${account.currency} account, so its credit must be entered under CR-${account.currency}.`);
      }
    });

    if (debit > 0) {
      totals[account.currency].debit += debit;
      validLines++;
    }
    enteredCredits.forEach(cr => {
      if (!totals[cr.currency]) totals[cr.currency] = { debit: 0, credit: 0 };
      totals[cr.currency].credit += cr.value;
      validLines++;
    });
  });

  const differences = Object.entries(totals).filter(([, t]) => Math.abs(t.debit - t.credit) >= 0.001);
  return { totals, errors, differences, validLines };
}

function calculateJournalBalance() {
  const state = getJournalCurrencyState();
  const badge = document.getElementById('jeBalanceIndicator');
  const postBtn = document.getElementById('btnPostJournal');
  if (!badge) return;

  const hasAmount = Object.values(state.totals).some(t => t.debit > 0 || t.credit > 0);
  if (state.errors.length) {
    badge.className = 'je-status-badge unbalanced';
    badge.textContent = state.errors[0];
    if (postBtn) postBtn.disabled = true;
    return;
  }
  if (!hasAmount) {
    badge.className = 'je-status-badge balanced';
    badge.textContent = 'Ready — balance checked per currency';
    if (postBtn) postBtn.disabled = false;
    return;
  }
  if (!state.differences.length) {
    badge.className = 'je-status-badge balanced';
    badge.textContent = 'Balanced by currency';
    if (postBtn) postBtn.disabled = false;
  } else {
    badge.className = 'je-status-badge unbalanced';
    badge.textContent = state.differences.map(([c,t]) => `${currencySymbolV6(c)} ${c}: DR ${formatCompactAmount(t.debit)} / CR ${formatCompactAmount(t.credit)}`).join(' • ');
    if (postBtn) postBtn.disabled = true;
  }
}

function formatCompactAmount(value) {
  return formatAppNumber(value);
}

// Currency validation also runs when an account is selected/typed.
document.addEventListener('input', (event) => {
  if (event.target.matches('.je-line-acc')) calculateJournalBalance();
});
document.addEventListener('change', (event) => {
  if (event.target.matches('.je-line-acc')) calculateJournalBalance();
});

const originalSubmitJournalEntryV3 = submitJournalEntry;
submitJournalEntry = function() {
  const state = getJournalCurrencyState();
  if (state.errors.length) {
    showAppNotification('Currency Mismatch', state.errors.join(' '), true);
    return;
  }
  if (state.differences.length) {
    const detail = state.differences.map(([c,t]) => `${c}: Debit ${formatCompactAmount(t.debit)} vs Credit ${formatCompactAmount(t.credit)}`).join(' | ');
    showAppNotification('Unbalanced by Currency', `Every currency must balance independently. ${detail}`, true);
    return;
  }
  originalSubmitJournalEntryV3();
};

