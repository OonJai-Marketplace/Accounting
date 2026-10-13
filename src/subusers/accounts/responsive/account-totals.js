  function accountTotals(user, lines) {
    const totals = new Map();
    const add = (id, side, amount) => {
      if (!id) return;
      const name = accountLabelOnly(id) || workspaceAccountName(id, 'Unassigned account');
      if (!totals.has(name)) totals.set(name, {dr:0, cr:0});
      totals.get(name)[side] += Number(amount || 0);
    };
    lines.forEach(line => {
      const fund = line.fund_account_id;
      const other = line.account_id;
      if (line.direction === 'in') { add(fund, 'dr', line.amount); add(other, 'cr', line.amount); }
      else { add(other, 'dr', line.amount); add(fund, 'cr', line.amount); }
    });
    return [...totals.entries()].filter(([, row]) => row.dr || row.cr);
  }
  function totalsTable(user, lines, className='') {
    const phone = className.includes('v49-home-totals') || className.includes('v62-phone-totals');
    const number = value => phone ? Number(value || 0).toLocaleString(appNumberLocale(), {minimumFractionDigits:appDecimalPlaces(),maximumFractionDigits:appDecimalPlaces()}) : formatAppNumber(value);
    const rows = accountTotals(user, lines);
    const dr = rows.reduce((sum, [, row]) => sum + row.dr, 0);
    const cr = rows.reduce((sum, [, row]) => sum + row.cr, 0);
    return `<section class="v49-card v49-totals ${className}"><header><div><h3>Account Totals</h3><p>${phone?'Double-entry counterpart preview for the current unsubmitted entries.':'Debit and Credit are positive; Balance is Debit minus Credit.'}</p></div><b>${rows.length} accounts</b></header><div class="v49-table-scroll"><table><thead><tr><th>Account</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>${rows.length ? rows.map(([name,row]) => `<tr><td>${escapeHtml(name)}</td><td>${row.dr ? number(row.dr) : (phone?'':'—')}</td><td>${row.cr ? number(row.cr) : (phone?'':'—')}</td><td class="${row.dr-row.cr<0?'negative-amount':''}">${number(row.dr-row.cr)}</td></tr>`).join('') + `<tr class="v49-overall"><td>Overall total</td><td>${number(dr)}</td><td>${number(cr)}</td><td>${number(dr-cr)}</td></tr>` : '<tr><td colspan="4" class="period-empty">No account activity yet.</td></tr>'}</tbody></table></div></section>`;
  }
