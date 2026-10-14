// ==============================================================================


// ==============================================================================
// JS 2: MULTI-CURRENCY SETTINGS STORE (STARTING DR, CR-LAK, CR-USD, CR-THB)
// Dynamic manager: Adding a currency creates a new CR column across all tables.
// ==============================================================================
const CurrencyStore = {
  currencies: [
    { code: "LAK", name: "Lao Kip", symbol: "₭", isBase: false },
    { code: "USD", name: "US Dollar", symbol: "$", isBase: true },
    { code: "THB", name: "Thai Baht", symbol: "฿", isBase: false }
  ],

  add(code, name, symbol) {
    const cleanCode = code.toUpperCase().trim();
    if (!cleanCode || !name.trim()) {
      showAppNotification('Notice',"Please provide both Currency Code and Name.");
      return;
    }
    if (this.currencies.some(c => c.code === cleanCode)) {
      showAppNotification('Notice',`Currency ${cleanCode} already exists.`);
      return;
    }
    this.currencies.push({
      code: cleanCode,
      name: name.trim(),
      symbol: symbol.trim() || cleanCode,
      isBase: false
    });
    this.render();
    if (typeof setupJournalColumns === 'function') setupJournalColumns();
    initCoaCurrencyFilter();
    return true;
  },

  async edit(code) {
    const cur = this.currencies.find(c => c.code === code);
    if (!cur) return;
    const newName = await ui117.prompt(`Edit name for currency ${cur.code}:`, cur.name);
    if (newName && newName.trim()) {
      cur.name = newName.trim();
      this.render();
      if (typeof setupJournalColumns === 'function') setupJournalColumns();
    }
  },

  async remove(code) {
    const cur = this.currencies.find(c => c.code === code);
    if (!cur) return;
    if (cur.isBase) {
      showAppNotification('Notice',"Cannot remove the base currency (USD).");
      return;
    }
    if (await ui117.confirm(`Remove currency ${cur.code} (${cur.name})? All transaction columns will adapt automatically.`)) {
      this.currencies = this.currencies.filter(c => c.code !== code);
      this.render();
      if (typeof setupJournalColumns === 'function') setupJournalColumns();
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
        <td><strong style="font-family: monospace; color: #064e3b;">${escapeHtml(c.code)}</strong></td>
        <td>${escapeHtml(c.name)}</td>
        <td><span class="currency-tag" data-currency-code="${escapeHtml(c.code)}" title="${escapeHtml(c.code)}">${escapeHtml(c.symbol)}</span></td>
        <td>
          ${c.isBase ? '<span style="color: #059669; font-weight: 700; font-size: 11.5px;">★ Base Currency</span>' : '<span style="color: #64748b; font-size: 11.5px;">Operating</span>'}
        </td>
        <td style="text-align: right;">
          <button type="button" class="btn-icon-edit" style="margin-right: 4px;" title="Edit Currency">✏️</button>
          ${!c.isBase ? `<button type="button" class="btn-action-delete" style="width:24px;height:24px;" title="Remove Currency">✕</button>` : ''}
        </td>
      `;
      tr.querySelector('.btn-icon-edit').onclick=()=>this.edit(c.code);
      const remove=tr.querySelector('.btn-action-delete');if(remove)remove.onclick=()=>this.remove(c.code);
      tbody.appendChild(tr);
    });
  }
};

async function handleAddCurrency() {
  const code = document.getElementById('newCurrencyCode').value;
  const name = document.getElementById('newCurrencyName').value;
  const symbol = document.getElementById('newCurrencySymbol').value;
  const saved = await CurrencyStore.add(code, name, symbol);
  if (!saved) return;
  document.getElementById('newCurrencyCode').value = '';
  document.getElementById('newCurrencyName').value = '';
  document.getElementById('newCurrencySymbol').value = '';
}
