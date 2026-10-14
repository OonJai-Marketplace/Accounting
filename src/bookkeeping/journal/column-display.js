function updateNextEntryIdDisplay() {
  const display = document.getElementById('jeNextIdDisplay');
  if (display) {
    display.textContent = JournalModule.editingEntryId 
      ? `Editing: ${JournalModule.editingEntryId}` 
      : `Entry ID: ${generateEntryId()}`;
  }
}

function getCleanAccountDisplay(accountStr, explicitCurrency = null) {
  if (!accountStr) return { name: "Unassigned Account", currency: "" };

  const value=String(accountStr).trim();
  let cleanName = value;
  let detectedCurrency = explicitCurrency || "";
  const accounts=AccountingStore.accounts;
  const nameOnly=value.replace(/\s*\([A-Z]{3}\)$/, '').trim().toLowerCase();
  const matched=accounts.find(a=>String(a.code)===value||String(a.name).toLowerCase()===value.toLowerCase())
    || accounts.find(a=>String(a.name).toLowerCase()===nameOnly)
    || accounts.find(a=>{const code=String(a.code||'');return code&&value.startsWith(code)&&/^[\s—–-]/.test(value.slice(code.length))});

  if (matched) {
    cleanName = matched.name;
    detectedCurrency = explicitCurrency || matched.currency;
  } else {
    cleanName = cleanName.replace(/^\d+\s*[-—–]\s*/, '').replace(/\s*\([A-Z]{3}\)$/, '').trim();
  }

  return { name: cleanName, currency: detectedCurrency };
}

function setupJournalColumns() {
  syncCoaDatalist(); updateNextEntryIdDisplay();
  const header=document.getElementById('jeHeaderRow');
  if(header) header.innerHTML='<th>Account</th><th>Line Memo / Reference</th><th class="num">Debit</th><th class="num">Credit</th><th class="action-col no-print">Action</th>';
  // Currency settings must never erase an in-progress journal draft.
  const body=document.getElementById('jeLinesBody');
  if(body && !body.querySelector('.je-line-acc')) resetJournalLinesForm();
}
