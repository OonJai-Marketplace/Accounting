  function blankDraft() { const r = rules(); return {mode:r.entryMode==='double_full'?'double':'single', date:today(), multiple:false, memo:'', reference:'', requestKey:'phone-' + crypto.randomUUID(), editIds:[], single:[{direction:r.directions[0] || 'out', source:r.fundIds.length === 1 ? r.fundIds[0] : '', affected:'', amount:'', memo:''}], lines:[{account:'',debit:'',credit:'',memo:''},{account:'',debit:'',credit:'',memo:''}]}; }
  function normalizeDraft(value){const d={...blankDraft(),...value};d.single=Array.isArray(d.single)&&d.single.length?d.single:blankDraft().single;d.lines=Array.isArray(d.lines)&&d.lines.length?d.lines:blankDraft().lines;
    if(value?.multiple==null)d.multiple=(d.mode==='double'?d.lines:d.single).some(line=>line.date&&line.date!==d.date);
    return d;}
  const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
  function payloadDraft(p){return normalizeDraft({mode:'single',date:p.p_items[0].date,memo:p.p_snapshot.memo||p.p_items[0].memo,reference:p.p_snapshot.reference||'',requestKey:p.p_key,editIds:p.p_edit_ids||[],single:p.p_items.map(l=>({date:l.date,direction:l.direction,source:l.fund,affected:l.account,amount:String(l.amount),memo:l.memo||''}))});}
  async function migrateLegacy(owner,data){
    if(window.accountingReset143108?.enabled())return data;
    // Read only this account's earlier phone draft and immutable staff save requests.
    const offlinePrefix='ojm-offline14239:'+scope+':'+S.actor+':entry:',savePrefix='ojm_staff_save14228:'+scope+':'+S.actor+':',jobs=[];
    for(const storage of [localStorage,sessionStorage])for(let i=0;i<storage.length;i++){
      const sourceKey=storage.key(i);if(!sourceKey.startsWith(offlinePrefix)&&!sourceKey.startsWith(savePrefix)||sourceKey.endsWith(':error'))continue;
      let value;try{value=JSON.parse(storage.getItem(sourceKey));}catch{throw fail('An earlier device entry could not be read. Keep this browser data and recover that entry before continuing.');}
      if(sourceKey.startsWith(offlinePrefix)&&(value?.actor!==S.actor||value.status==='synced'))continue;
      const p=sourceKey.startsWith(offlinePrefix)?value.payload:value;if(p?.p_owner!==owner||!p.p_key)continue;
      if(!Array.isArray(p.p_items)||!p.p_items.length||canonical(p.p_items)!==canonical(p.p_snapshot?.components1437))throw fail('An earlier device entry is incomplete. Keep this browser data and recover that entry before continuing.');
      jobs.push({owner,key:p.p_key,params:p,draft:payloadDraft(p),legacy:true,status:'uncertain',createdAt:Date.parse(value.created)||Date.now(),legacySources:[{storage:storage===localStorage?'local':'session',key:sourceKey}]});
    }
    let previousDraft;
    if(!data.legacyDraftImported&&!data.draft&&!localStorage.getItem(mirrorKey(owner))){try{previousDraft=JSON.parse(localStorage.getItem('ojm_phone_draft1427:'+scope+':'+S.actor))?.staff?.[owner]?.data;}catch{}}
    if(!jobs.length&&!previousDraft)return data;
    return record(owner,old=>{const all=[...(old.queue||[])],seen={...old.legacyReferences};for(const job of jobs){const present=all.find(q=>q.key===job.key);if(present){if(canonical(present.params)!==canonical(job.params))throw fail('An earlier save reference has conflicting entries. Keep both copies for recovery.');present.legacySources=[...(present.legacySources||[]),...job.legacySources];}else if(!seen[job.key])all.push(job);seen[job.key]=true;}
      return {...old,queue:all,legacyReferences:seen,...(previousDraft&&!old.legacyDraftImported&&!old.draft?{draft:normalizeDraft(previousDraft),legacyDraftImported:true}:{})};});
  }
  function clearLegacy(q){for(const source of q.legacySources||[]){try{const storage=source.storage==='session'?sessionStorage:localStorage,value=JSON.parse(storage.getItem(source.key));if((value?.payload||value)?.p_key===q.key){storage.removeItem(source.key);storage.removeItem(source.key+':error');}}catch{}}}
  function draftFilled() {
    const d = S.draft;
    if (!d) return false;
    if (d.multiple || d.memo || d.reference || d.editIds?.length) return true;
    if (d.mode === 'double') return d.lines.some(l => l.splitGroup || l.account || l.debit || l.credit || l.memo || l.reference);
    const funds = rules().fundIds, defaultFund = funds.length === 1 ? funds[0] : '';
    return d.single.some(l => l.splitGroup || l.journalLines || l.amount || l.memo || l.affected || l.reference || l.source && l.source !== defaultFund);
  }
  function saveMirror() { if (!S.owner || !S.draft) return; try { localStorage.setItem(mirrorKey(S.owner), JSON.stringify(S.draft)); } catch { notice('This browser could not keep the draft. Keep this page open until you can save it.', true); } }
  function rememberLocation(){if(!S.owner)return;try{localStorage.setItem(locationKey(S.owner),JSON.stringify({page:S.page,month:S.month}));}catch{}}
  function saveDraftLater() { saveMirror(); clearTimeout(draftTimer); const owner = S.owner, epoch=S.epoch,draft = structuredClone(S.draft); draftTimer = setTimeout(() => {if(current(owner,epoch))persist(owner,{draft}).catch(e => {if(current(owner,epoch))notice(e.message,true)})}, 150); }

  // Match the two sides by their accounts and typed amounts, even if the user
  // has entered only one side or entered the credit first.
  function cashbookPair(draft, lines, previous) {
    if (lines.length > 2 || lines.some(l=>l.splitGroup)) return null;
    const r = rules(), [first, second = {}] = lines;
    const defaults = lines.some(l => l.debit || l.credit) ? ['out','in'] : r.directions;
    const directions = [...new Set([previous?.direction, ...defaults])].filter(dir => r.directions.includes(dir));
    for (const direction of directions) {
      const out = direction === 'out';
      for (const [debit, credit] of [[first, second], [second, first]]) {
        const fund = out ? credit : debit, category = out ? debit : credit;
        if ((fund.account && !r.fundIds.includes(fund.account)) || (category.account && !r.entryIds.includes(category.account))) continue;
        if (debit.credit || credit.debit) continue;
        if (debit.debit && credit.credit && Number(String(debit.debit).replaceAll(',','')) !== Number(String(credit.credit).replaceAll(',',''))) continue;
        if (fund.memo && category.memo && fund.memo !== category.memo) continue;
        if (fund.reference != null && category.reference != null && fund.reference !== category.reference) continue;
        const started = l => l.splitGroup || l.account || l.debit || l.credit || l.memo || l.reference != null || l.date;
        if (draft.multiple && started(fund) && started(category) && cardDate(draft,fund) !== cardDate(draft,category)) continue;
        const source = fund.account || (r.fundIds.length === 1 ? r.fundIds[0] : '');
        if (category.account && source && (source === category.account || currency(source) !== currency(category.account))) continue;
        const reference = category.reference ?? fund.reference;
        return {debit, credit, row:{
          receipt:first.receipt, direction, source, affected:category.account || '',
          amount:debit.debit || credit.credit || '', memo:category.memo || fund.memo || '',
          ...(reference == null ? {} : {reference}),
          ...(draft.multiple ? {date:category.date ?? fund.date ?? draft.date} : {})
        }};
      }
    }
    return null;
  }

  function journalPair(draft, row, original) {
    const receipt = row.receipt || crypto.randomUUID();
    const pair = original && cashbookPair(draft, original, row);
    const out = row.direction === 'out';
    const makeLine = (side, before = {}) => {
      const debit = side === 'debit';
      const line = {...before, receipt, account:(debit === out ? row.affected : row.source) || '',
        debit:debit ? row.amount : '', credit:debit ? '' : row.amount};
      const note = row.memo || (row.description !== draft.memo ? row.description : '') || '';
      if (!pair || note !== pair.row.memo) line.memo = note;
      if (!pair || row.reference !== pair.row.reference) {
        if (row.reference == null) delete line.reference;
        else line.reference = row.reference;
      }
      if (draft.multiple) line.date = row.date ?? draft.date;
      else delete line.date;
      return line;
    };
    const reversed = pair && pair.row.direction !== row.direction;
    const debitBefore = reversed ? pair.credit : pair?.debit, creditBefore = reversed ? pair.debit : pair?.credit;
    const debit = makeLine('debit', debitBefore), credit = makeLine('credit', creditBefore);
    if (row.splitGroup) Object.assign(out ? debit : credit, {splitGroup:row.splitGroup,splitNumber:row.splitNumber,splitLabel:row.splitLabel,splitSide:out?'debit':'credit'});
    return pair && original[0] === creditBefore ? [credit, debit] : [debit, credit];
  }

  // Several expense lines can share a single payment. Only infer that payment
  // when the category sides agree and an entered fund total agrees to the cent.
  function splitPaymentRows(draft, lines) {
    const r = rules();
    for (const direction of r.directions) {
      const out = direction === 'out', side = out ? 'debit' : 'credit', other = out ? 'credit' : 'debit';
      const categories = lines.filter(l => !l[other] && ((l.splitGroup && (!l.splitSide || l.splitSide===side || l[side]) && (!l.account || r.entryIds.includes(l.account))) || (r.entryIds.includes(l.account) && l[side])));
      if (categories.length < 2 || lines.length - categories.length > 1) continue;
      const remaining = lines.filter(l => !categories.includes(l));
      const fund = remaining[0] || {};
      if (fund[side] || fund.memo || fund.reference != null && fund.reference !== draft.reference) continue;
      if (fund.account && !r.fundIds.includes(fund.account)) continue;
      const source = fund.account || (r.fundIds.length === 1 ? r.fundIds[0] : '');
      const c = currency(categories.find(l=>l.account)?.account || source);
      if (categories.some(l => l.account && (currency(l.account) !== c || source === l.account)) || source && currency(source) !== c) continue;
      const total = cashbookTotal(categories.map(l => l[side]));
      if (total == null && !categories.some(l => l.splitGroup) || fund[other] && (total == null || cashbookTotal([fund[other]]) !== total)) continue;
      return categories.map(l => ({receipt:l.receipt, split:side, direction, source, affected:l.account || '', amount:l[side] || '',
        ...(l.splitGroup ? {splitGroup:l.splitGroup,splitNumber:l.splitNumber} : {}),
        memo:l.memo || '', ...((l.reference ?? fund.reference) == null ? {} : {reference:l.reference ?? fund.reference}),
        ...(draft.multiple ? {date:cardDate(draft,l)} : {})}));
    }
    return null;
  }

  function cashbookTotal(values) {
    let cents = 0;
    for (const value of values) {
      const n = Number(String(value ?? '').replaceAll(',','')), rounded = Math.round(n * 100);
      if (n <= 0 || !Number.isSafeInteger(rounded) || Math.abs(n * 100 - rounded) > 0.000001) return null;
      cents += rounded;
    }
    return Number.isSafeInteger(cents) ? String(cents / 100) : null;
  }

  function splitJournalLines(draft, rows) {
    const first = rows[0], receipt = first.receipt;
    const original = draft.lines.filter(l => l.receipt === receipt);
    const total = cashbookTotal(rows.map(l => l.amount));
    // Different funds or an incomplete edit need independent balancing lines.
    if ((total == null && !rows.some(l => l.splitGroup)) || rows.some(l => l.direction !== first.direction || l.source !== first.source)) {
      // Keep each explicitly split slip together when a batch uses multiple funds.
      if (rows.some(l=>l.splitGroup)) {
        const groups=new Map();
        rows.forEach((l,i)=>{const key=l.splitGroup || i;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(l);});
        if (groups.size>1) return [...groups.values()].flatMap((part,i)=>{
          const receiptId=receipt+'-part-'+i;
          return part.length===1 ? journalPair(draft,{...part[0],receipt:receiptId}) :
            splitJournalLines(draft,part.map(l=>({...l,receipt:receiptId})));
        });
      }
      return rows.flatMap((l,i) => journalPair(draft, {...l, receipt:receipt + '-part-' + i}));
    }
    const out = first.direction === 'out';
    const categories = rows.map(l => journalPair(draft,l)[out ? 0 : 1]);
    const originalFund = original.findIndex(l => !l.splitGroup && !l[first.split]);
    const before = originalFund < 0 ? {} : original[originalFund];
    const fund = {...before, receipt, account:first.source, debit:out ? '' : total || '', credit:out ? total || '' : '', memo:before.memo || ''};
    if (draft.multiple) fund.date = before.date ?? first.date ?? draft.date;
    else delete fund.date;
    categories.splice(originalFund < 0 ? categories.length : originalFund, 0, fund);
    return categories;
  }

  function changeMode243(next) {
    const d = S.draft;
    if (!d || S.saving || !['single','double'].includes(next)) return false;
    if (next !== d.mode) {
      if (next === 'single') {
        const previous = new Map(d.single.map(row => [row.receipt, row]));
        d.single = identifyReceipts(d).flatMap(indices => {
          const lines = indices.map(i => d.lines[i]), receipt = lines[0].receipt;
          const old = previous.get(receipt), pair = cashbookPair(d, lines, old);
          // A compound receipt or distinct line details can still travel with
          // a Cashbook draft. Keep its original rows and validation together.
          if (!pair) return splitPaymentRows(d,lines) || [{receipt, journalLines:lines}];
          return {...(old?.description == null ? {} : {description:old.description}), ...pair.row};
        });
      } else {
        const original = new Map();
        for (const line of d.lines) {
          if (!original.has(line.receipt)) original.set(line.receipt, []);
          original.get(line.receipt).push(line);
        }
        d.lines = receiptCards(d).flatMap(indices => {
          const row = d.single[indices[0]];
          if (row.split) return splitJournalLines(d, indices.map(i => d.single[i]));
          row.receipt ||= crypto.randomUUID();
          return row.journalLines || journalPair(d, row, original.get(row.receipt));
        });
      }
      d.mode = next;
    }
    try { localStorage.setItem(modeKey243(), next); } catch {}
    return true;
  }
