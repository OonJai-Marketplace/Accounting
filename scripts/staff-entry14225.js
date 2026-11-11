/* Phone drafts use the existing atomic personal-journal RPC and snapshot format. */
(function (root) {
  'use strict';
  const epsilon = 0.00000001;
  const number = value => {
    const n = Number(String(value ?? '').replaceAll(',', ''));
    if (!Number.isFinite(n) || !Number.isSafeInteger(Math.round(n * 100)) || n < 0 || Math.abs(n * 100 - Math.round(n * 100)) > 0.000001) throw Error('Enter a valid, non-negative amount.');
    return n;
  };
  function assignmentMessage(rules, accounts) {
    if (rules.directions.length === 1 && rules.directions[0] === 'out') {
      const funds = accounts.filter(a => rules.fundIds.includes(a.id)).map(a => a.code + ' ' + a.name).join(' / ');
      if (funds) return 'DR and CR balance. This account allows Money Out: debit an assigned expense or category and credit ' + funds + '.';
    }
    return 'DR and CR balance. Check the assigned funds, category accounts and permitted payment directions.';
  }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const day = new Date(value + 'T00:00:00Z');
    return Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === value;
  }
  function balanceMessage(currency, debit, credit) {
    const format = n => n.toLocaleString('en-US', {maximumFractionDigits: 2});
    const gap = Math.round((debit - credit) * 100) / 100;
    return 'DR ' + format(debit) + ' / CR ' + format(credit) + ' ' + currency +
      (gap ? ' · Add ' + (gap > 0 ? 'CR ' : 'DR ') + format(Math.abs(gap)) + ' ' + currency : ' · Balanced');
  }

  // A single assigned fund payment can cover several dated expense debits.
  // Separate receipts with their own funding lines still balance independently.
  function sharedPayment(draft, lines, accounts, rules) {
    if (draft.mode !== 'double' || !rules.directions.includes('out')) return null;
    let fundLine, currency, totalCents = 0;
    const expenses = [];
    for (const line of lines) {
      const account = accounts.find(a => a.id === line.account);
      if (!account || !validDate(line.date ?? draft.date) || (currency && account.currency !== currency)) return null;
      currency = account.currency;
      const debit = number(line.debit), credit = number(line.credit);
      if (debit && !credit && rules.entryIds.includes(account.id)) {
        expenses.push(line);
        totalCents += Math.round(debit * 100);
      } else if (credit && !debit && !fundLine && rules.fundIds.includes(account.id)) {
        fundLine = line;
      } else return null;
    }
    if (!fundLine || expenses.length < 2 || expenses.some(line => line.account === fundLine.account)) return null;
    return {fundLine, expenses, totalCents, currency};
  }
  function datedPaymentParts(draft, plan, accounts, rules) {
    const {fundLine, expenses, totalCents, currency} = plan;
    const credit = number(fundLine.credit);
    if (!Number.isSafeInteger(totalCents)) throw Error('Expense total exceeds the supported range.');
    if (totalCents !== Math.round(credit * 100)) throw Error(balanceMessage(currency, totalCents / 100, credit));
    const days = new Map();
    for (const row of expenses) {
      const date = row.date ?? draft.date;
      if (!days.has(date)) days.set(date, []);
      days.get(date).push(row);
    }
    return [...days].map(([date, rows]) => {
      const slice = rows.reduce((cents, row) => cents + Math.round(number(row.debit) * 100), 0) / 100;
      const part = prepare({...draft, date, lines:[...rows, {...fundLine, date, credit:slice}]}, accounts, rules);
      part.snapshot.sharedFundCredit = {...fundLine, date:fundLine.date ?? draft.date};
      return part;
    });
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
        groups.get(key)[debit ? 'dr' : 'cr'].push({account: a, left: debit || credit, memo: line.memo || '', reference: line.reference});
        rows.push({account: a.code + ' — ' + a.name, memo: line.memo || '', ...(line.reference==null?{}:{reference:line.reference}), dr: debit || '', credits: {[a.currency]: credit || ''}, date});
      }
      for (const g of groups.values()) {
        const debit = g.dr.reduce((n,l) => n + l.left, 0), credit = g.cr.reduce((n,l) => n + l.left, 0);
        if (Math.abs(debit-credit) > epsilon) throw Error((data.multiple ? g.date + ' · ' : '') + 'Entry is unbalanced · ' + balanceMessage(g.currency, debit, credit));
        // Match fund payments and collections exactly as the desktop personal journal does.
        for (const d of g.dr) for (const c of g.cr) {
          if (d.left < epsilon || c.left < epsilon) continue;
          const outgoing = rules.fundIds.includes(c.account.id) && rules.entryIds.includes(d.account.id) && rules.directions.includes('out');
          const incoming = rules.fundIds.includes(d.account.id) && rules.entryIds.includes(c.account.id) && rules.directions.includes('in');
          if (!outgoing && !incoming) continue;
          const value = Math.min(d.left, c.left);
          add(outgoing ? 'out' : 'in', outgoing ? c.account.id : d.account.id, outgoing ? d.account.id : c.account.id, value, [...new Set([d.memo, c.memo].filter(Boolean))].join(' · ') || memo, g.date, (outgoing?d.reference??c.reference:c.reference??d.reference)??data.reference??'');
          d.left -= value; c.left -= value;
        }
        if ([...g.dr, ...g.cr].some(l => l.left > epsilon)) throw Error(assignmentMessage(rules, accounts));
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
        add(l.direction, l.source, l.affected, amount, data.receiptEditor341 ? String(l.memo||'').trim() || description : [description,l.memo].filter(Boolean).join(' — '),date,l.reference??data.reference??'');
        single.push({...l, amount: String(amount), date, description});
      }
    }
    if (!items.length) throw Error('Enter at least one complete transaction.');
    return {items, snapshot: {...(data.receiptEditor341?{receiptEditor341:true}:{}), mode: data.mode === 'double' ? 'double' : 'single', date: data.date, memo, reference: data.reference || '', multiple: !!data.multiple || items.some(item=>item.date!==data.date), rows, single, owner: '', journal: '', local: false, editIds: data.editIds || [], requestKey: data.requestKey, components1437: items}};
  }
  const api = {prepare, sharedPayment, datedPaymentParts, balanceMessage, assignmentMessage};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StaffEntry14225 = api;
})(typeof window === 'undefined' ? globalThis : window);
