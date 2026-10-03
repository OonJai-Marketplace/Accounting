/* Phone drafts use the existing atomic personal-journal RPC and snapshot format. */
(function (root) {
  'use strict';
  const epsilon = 0.00000001;
  const number = value => {
    const n = Number(String(value ?? '').replaceAll(',', ''));
    if (!Number.isFinite(n) || n < 0) throw Error('Enter a valid, non-negative amount.');
    return n;
  };
  function prepare(data, accounts, rules) {
    const memo = String(data.memo || '').trim();
    if (!memo) throw Error('Add the General Description / Memo.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date || '')) throw Error('Choose a transaction date.');
    const permitted = new Set([...rules.fundIds, ...rules.entryIds, rules.counterpart].map(String));
    const account = id => {
      const a = accounts.find(a => String(a.id || a.code) === String(id));
      if (!a || a.isPosting === false || !permitted.has(String(a.id))) throw Error('Choose an account assigned to this user in Settings.');
      return a;
    };
    const items = [], rows = [], single = [];
    const add = (direction, fund, affected, value, description) => {
      if (!rules.directions.includes(direction)) throw Error(direction === 'in' ? 'Money In is not enabled for this user.' : 'Money Out is not enabled for this user.');
      if (!rules.fundIds.includes(fund)) throw Error('Choose an assigned fund account.');
      if (direction === 'out' ? !rules.entryIds.includes(affected) : affected !== rules.counterpart) throw Error('Choose an account enabled for this direction in Settings.');
      if (fund === affected) throw Error('The fund and affected account must be different.');
      if (account(fund).currency !== account(affected).currency) throw Error('Currency mismatch: the fund and affected account must use the same currency.');
      items.push({direction, fund, account: direction === 'in' ? fund : affected, amount: value, date: data.date, memo: description || memo, reference: data.reference || '', kind: direction === 'in' ? 'collection' : 'payment'});
    };
    if (data.mode === 'double') {
      const groups = new Map();
      for (const line of data.lines || []) {
        const debit = number(line.debit), credit = number(line.credit);
        if (!line.account && !debit && !credit && !line.memo) continue;
        const a = account(line.account);
        if ((debit > 0) === (credit > 0)) throw Error('Enter either Debit or Credit on each line, with a positive amount.');
        if (!groups.has(a.currency)) groups.set(a.currency, {dr: [], cr: []});
        groups.get(a.currency)[debit ? 'dr' : 'cr'].push({account: a, left: debit || credit, memo: line.memo || ''});
        rows.push({account: a.code + ' — ' + a.name, memo: line.memo || '', dr: debit || '', credits: {[a.currency]: credit || ''}, date: data.date});
      }
      for (const [currency, g] of groups) {
        const difference = g.dr.reduce((n, l) => n + l.left, 0) - g.cr.reduce((n, l) => n + l.left, 0);
        if (Math.abs(difference) > epsilon) throw Error(currency + ' is unbalanced. Difference: ' + Math.abs(difference).toLocaleString('en-US', {maximumFractionDigits: 8}));
        // Match fund payments and collections exactly as the desktop personal journal does.
        for (const d of g.dr) for (const c of g.cr) {
          if (d.left < epsilon || c.left < epsilon) continue;
          const outgoing = rules.fundIds.includes(c.account.id) && rules.entryIds.includes(d.account.id) && rules.directions.includes('out');
          const incoming = rules.fundIds.includes(d.account.id) && c.account.id === rules.counterpart && rules.directions.includes('in');
          if (!outgoing && !incoming) continue;
          const value = Math.min(d.left, c.left);
          add(outgoing ? 'out' : 'in', outgoing ? c.account.id : d.account.id, outgoing ? d.account.id : c.account.id, value, [...new Set([d.memo, c.memo].filter(Boolean))].join(' · ') || memo);
          d.left -= value; c.left -= value;
        }
        if ([...g.dr, ...g.cr].some(l => l.left > epsilon)) throw Error('These lines use accounts or directions outside this user\u2019s assigned funds and entry permissions.');
      }
    } else {
      for (const l of data.single || []) {
        const amount = number(l.amount);
        if (!l.source && !l.affected && !amount && !l.memo) continue;
        if (!(amount > 0)) throw Error('Enter a positive amount on each entry line.');
        add(l.direction, l.source, l.affected, amount, l.memo);
        single.push({...l, amount: String(amount), date: data.date});
      }
    }
    if (!items.length) throw Error('Enter at least one complete transaction.');
    return {items, snapshot: {mode: data.mode === 'double' ? 'double' : 'single', date: data.date, memo, reference: data.reference || '', multiple: false, rows, single, owner: '', journal: '', local: false, editIds: data.editIds || [], requestKey: data.requestKey, components1437: items}};
  }
  const api = {prepare};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StaffEntry14225 = api;
})(typeof window === 'undefined' ? globalThis : window);
