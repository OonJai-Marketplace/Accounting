/* Phone drafts use the existing atomic personal-journal RPC and snapshot format. */
(function (root) {
  'use strict';
  const epsilon = 0.00000001;
  const number = value => {
    const n = Number(String(value ?? '').replaceAll(',', ''));
    if (!Number.isFinite(n) || !Number.isSafeInteger(Math.round(n * 100)) || n < 0 || Math.abs(n * 100 - Math.round(n * 100)) > 0.000001) throw Error('Enter a valid, non-negative amount.');
    return n;
  };
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const day = new Date(value + 'T00:00:00Z');
    return Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === value;
  }
  function prepare(data, accounts, rules) {
    const memo = String(data.memo || '').trim();
    if (!memo) throw Error('Add the General Description / Memo.');
    if (!validDate(data.date)) throw Error('Choose a transaction date.');
    const receiptDate = line => {
      // Earlier cashbook callers supplied row dates without a Multiple dates flag.
      const useRow = data.multiple || (data.multiple == null && data.mode !== 'double');
      const date = useRow ? (line.date ?? data.date) : data.date;
      if (!validDate(date)) throw Error('Choose a valid date for each receipt.');
      return date;
    };
    const permitted = new Set([...rules.fundIds, ...rules.entryIds, rules.counterpart].map(String));
    const account = id => {
      const a = accounts.find(a => String(a.id || a.code) === String(id));
      if (!a || a.isPosting === false || a.is_posting === false || a.active === false || a.isActive === false || a.is_active === false || a.currency === 'NA' || !permitted.has(String(a.id))) throw Error('Choose an account assigned to this user in Settings.');
      return a;
    };
    const items = [], rows = [], single = [];
    const add = (direction, fund, affected, value, description, date = data.date, reference = data.reference || '') => {
      if (!rules.directions.includes(direction)) throw Error(direction === 'in' ? 'Money In is not enabled for this user.' : 'Money Out is not enabled for this user.');
      if (!rules.fundIds.includes(fund)) throw Error('Choose an assigned fund account.');
      if (!rules.entryIds.includes(affected)) throw Error('Choose a category account enabled in Settings.');
      if (fund === affected) throw Error('The fund and affected account must be different.');
      if (account(fund).currency !== account(affected).currency) throw Error('Currency mismatch: the fund and affected account must use the same currency.');
      items.push({direction, fund, account: affected, amount: value, date, memo: description || memo, reference, kind: direction === 'in' ? 'collection' : 'payment'});
    };
    if (data.mode === 'double') {
      const groups = new Map();
      for (const line of data.lines || []) {
        const debit = number(line.debit), credit = number(line.credit);
        if (!line.account && !debit && !credit && !line.memo) {
          if (data.multiple && line.date) throw Error('Complete or remove the empty journal line for ' + receiptDate(line) + '.');
          continue;
        }
        const a = account(line.account);
        if ((debit > 0) === (credit > 0)) throw Error('Enter either Debit or Credit on each line, with a positive amount.');
        const date = receiptDate(line), key = date + '/' + a.currency;
        if (!groups.has(key)) groups.set(key, {date, currency:a.currency, dr:[], cr:[]});
        groups.get(key)[debit ? 'dr' : 'cr'].push({account: a, left: debit || credit, memo: line.memo || ''});
        rows.push({account: a.code + ' — ' + a.name, memo: line.memo || '', dr: debit || '', credits: {[a.currency]: credit || ''}, date});
      }
      for (const g of groups.values()) {
        const difference = g.dr.reduce((n, l) => n + l.left, 0) - g.cr.reduce((n, l) => n + l.left, 0);
        if (Math.abs(difference) > epsilon) throw Error((data.multiple ? g.date + ' · ' : '') + g.currency + ' is unbalanced. Difference: ' + Math.abs(difference).toLocaleString('en-US', {maximumFractionDigits: 8}));
        // Match fund payments and collections exactly as the desktop personal journal does.
        for (const d of g.dr) for (const c of g.cr) {
          if (d.left < epsilon || c.left < epsilon) continue;
          const outgoing = rules.fundIds.includes(c.account.id) && rules.entryIds.includes(d.account.id) && rules.directions.includes('out');
          const incoming = rules.fundIds.includes(d.account.id) && rules.entryIds.includes(c.account.id) && rules.directions.includes('in');
          if (!outgoing && !incoming) continue;
          const value = Math.min(d.left, c.left);
          add(outgoing ? 'out' : 'in', outgoing ? c.account.id : d.account.id, outgoing ? d.account.id : c.account.id, value, [...new Set([d.memo, c.memo].filter(Boolean))].join(' · ') || memo, g.date);
          d.left -= value; c.left -= value;
        }
        if ([...g.dr, ...g.cr].some(l => l.left > epsilon)) throw Error('These lines use accounts or directions outside this user\u2019s assigned funds and entry permissions.');
      }
    } else {
      for (const l of data.single || []) {
        const amount = number(l.amount);
        if (!l.source && !l.affected && !amount && !l.memo) {
          if (data.multiple && l.date) throw Error('Complete or remove the empty receipt for ' + receiptDate(l) + '.');
          continue;
        }
        if (!(amount > 0)) throw Error('Enter a positive amount on each entry line.');
        const date=receiptDate(l), description=l.description===undefined?memo:String(l.description).trim();
        if (!description) throw Error('Add the General Description for each entry.');
        add(l.direction, l.source, l.affected, amount, [description,l.memo].filter(Boolean).join(' — '),date,l.reference||data.reference||'');
        single.push({...l, amount: String(amount), date, description});
      }
    }
    if (!items.length) throw Error('Enter at least one complete transaction.');
    return {items, snapshot: {mode: data.mode === 'double' ? 'double' : 'single', date: data.date, memo, reference: data.reference || '', multiple: !!data.multiple || items.some(item=>item.date!==data.date), rows, single, owner: '', journal: '', local: false, editIds: data.editIds || [], requestKey: data.requestKey, components1437: items}};
  }
  const api = {prepare};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StaffEntry14225 = api;
})(typeof window === 'undefined' ? globalThis : window)