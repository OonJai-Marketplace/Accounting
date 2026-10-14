  function allocation(user, fundId) {
    const posted=(window.funds113?.confirmed?.get(user.id)||[]).find(r=>String(r.account_id||r.id)===String(fundId));
    return Number(posted?.opening||0);
  }
  function activity(user, fundId) {
    const lines = journalRows(user.id).filter(journal=>['draft','returned','submitted'].includes(journal.status)).flatMap(journal => journal.lines || []).filter(line => !line.journal_entry_id && !wsIsCollection(line) && String(line.fund_account_id) === String(fundId));
    const posted=(window.funds113?.confirmed?.get(user.id)||[]).find(r=>String(r.account_id||r.id)===String(fundId));
    const base = {received:Number(posted?.received||0), used:Number(posted?.used||0), handover:Number(posted?.handover||0)};
    lines.forEach(line => {
      if (line.entry_kind === 'collection' || line.direction === 'in') base.received += Number(line.amount || 0);
      else if (line.entry_kind === 'handover') base.handover += Number(line.amount || 0);
      else base.used += Number(line.amount || 0);
    });
    // Requests cannot change posted ledger balances; a linked journal is required.
    return base;
  }
  function remaining(user, fundId) {
    const row = activity(user, fundId);
    return allocation(user, fundId) + row.received - row.used - row.handover;
  }
  window.v49FundActivity = function(userId, fundId) {
    const user = currentUser(userId);
    if (!user) return null;
    const row = activity(user, fundId);
    const opening = allocation(user, fundId);
    return {opening, ...row, balance: opening + row.received - row.used - row.handover};
  };
