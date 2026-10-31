  const monthRevision14359=(month,list)=>JSON.stringify(list.filter(j=>String(j.period_start).slice(0,7)===month));
  async function getMonth(month, batchHeaders = headers()) {
    const ids = batchHeaders.filter(j => String(j.period_start).slice(0,7) === month && j.owner_id === S.owner).map(j => j.id);
    const result = ids.length ? await paged('staff_journal_lines', {staff_journal_id:'in.(' + ids.join(',') + ')'}) : [];
    const allowed=new Set(ids);
    if (result.some(l => !allowed.has(l.staff_journal_id) || !l.transaction_date || !Number.isFinite(Number(l.amount)))) throw fail('This period returned incomplete records.', 'INVALID_RESPONSE');
    return {lines:result, savedAt:Date.now(), batchIds:ids,revision14359:monthRevision14359(month,batchHeaders)};
  }
  async function refresh() {
    if (!S.owner || S.owner!==S.actor) return;
    if (refreshJob) return refreshJob;
    const owner = S.owner, epoch = S.epoch, month = S.month; S.loading = true; paintConnection();
    refreshJob = (async () => {
      try {
        await access();if(!current(owner,epoch))return;
        const confirmedKeys=new Set(queue().filter(q=>q.status==='confirmed').map(q=>q.key));const ids = accountIds();
        const [rawAccounts, ownFunds, ownHeaders] = await Promise.all([
          ids.length ? paged('accounts', {id:'in.(' + ids.join(',') + ')'}, 'id,code,name,currency_code,is_posting,is_active') : [],
          rpc('fund_balances136',{p_owner:owner,p_month:null}),
          paged('staff_journals',{owner_id:'eq.' + owner}, 'id,owner_id,period_start,status,submitted_at,return_note,updated_at,report_types14253,reconciliation14345')
        ]);
        if (!current(owner, epoch)) return;
        if (!Array.isArray(ownFunds) || ownFunds.some(f => !rules().fundIds.includes(f.account_id)) || ownHeaders.some(j => j.owner_id !== owner)) throw fail('The workspace response was incomplete.', 'INVALID_RESPONSE');
        const months={...S.data.months},year=today().slice(0,4),needed=new Set([month,...Array.from({length:12},(_,i)=>year+'-'+String(i+1).padStart(2,'0')),...ownHeaders.filter(j=>['draft','returned'].includes(j.status)).map(j=>String(j.period_start).slice(0,7))]);
        for(const m of needed){if(ownHeaders.some(j=>String(j.period_start).slice(0,7)===m&&['draft','returned'].includes(j.status))||months[m]?.revision14359!==monthRevision14359(m,ownHeaders))months[m]=await getMonth(m,ownHeaders);if(!current(owner,epoch))return;}
        const patch = {accounts:rawAccounts.map(a => ({...a,currency:a.currency_code,isPosting:a.is_posting!==false,isActive:a.is_active!==false})),funds:ownFunds,headers:ownHeaders,months,savedAt:Date.now()};
        const stored = await record(owner, old => ({...old,...patch,queue:(old.queue||[]).filter(q=>!confirmedKeys.has(q.key)), months:{...old.months,...months}, pendingSubmit:old.pendingSubmit && ['submitted','approved','posted'].includes(ownHeaders.find(j => j.id === old.pendingSubmit.id)?.status) ? null : old.pendingSubmit}));
        if (!current(owner, epoch)) return;
        S.data = stored; S.error = ''; S.online = true;
        // Routine refresh is silent; connection and queue state remain visible.
        render(S.page !== 'post' || !$('postForm'));

      } catch (e) {
        if (!current(owner, epoch)) return;
        if (denied(e)) await revoke(e);
        else { S.online = false; S.error = e.message; notice((S.data.savedAt ? 'Showing downloaded records. ' : '') + e.message, true); render(S.page !== 'post'); }
      } finally { if (current(owner,epoch)) { S.loading = false; refreshJob = null; paintConnection(); } }
    })();
    return refreshJob;
  }
  async function loadMonth() {
    if (!S.owner || !permission('sub-users-workspace') || !navigator.onLine || S.data.months?.[S.month]) return;
    const owner = S.owner, epoch = S.epoch, month = S.month;
    const task = (async () => {
      try { await access();if(!current(owner,epoch))return;const result = await getMonth(month);if(!current(owner,epoch))return;const stored = await record(owner, old => ({...old, months:{...old.months,[month]:result}})); if (current(owner,epoch)) { S.data.months=stored.months; S.online=true; S.error=''; if(S.month===month)render(); } }
      catch (e) { if (!current(owner,epoch)) return; if (denied(e)) await revoke(e); else { S.online=false; S.error=e.message; notice('Downloaded records are kept. '+e.message,true); if(S.month===month)render(); } }
      finally { if(monthJob===task)monthJob=null;if(current(owner,epoch))paintConnection(); }
    })(); monthJob=task;return task;
  }
