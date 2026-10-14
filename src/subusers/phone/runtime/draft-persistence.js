  function blankDraft() { const r = rules(); return {mode:'single', date:today(), memo:'', reference:'', requestKey:'phone-' + crypto.randomUUID(), editIds:[], single:[{direction:r.directions[0] || 'out', source:r.fundIds.length === 1 ? r.fundIds[0] : '', affected:'', amount:'', memo:''}], lines:[{account:'',debit:'',credit:'',memo:''},{account:'',debit:'',credit:'',memo:''}]}; }
  function normalizeDraft(value){const d={...blankDraft(),...value};d.single=Array.isArray(d.single)&&d.single.length?d.single:blankDraft().single;d.lines=Array.isArray(d.lines)&&d.lines.length?d.lines:blankDraft().lines;return d;}
  const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
  function payloadDraft(p){return normalizeDraft({mode:'single',date:p.p_items[0].date,memo:p.p_snapshot.memo||p.p_items[0].memo,reference:p.p_snapshot.reference||'',requestKey:p.p_key,editIds:p.p_edit_ids||[],single:p.p_items.map(l=>({direction:l.direction,source:l.fund,affected:l.account,amount:String(l.amount),memo:l.memo||''}))});}
  async function migrateLegacy(owner,data){
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
  const draftFilled = () => !!S.draft && (!!S.draft.memo || !!S.draft.reference || !!S.draft.editIds?.length || (S.draft.mode === 'double' ? S.draft.lines.some(l => l.account || l.debit || l.credit || l.memo) : S.draft.single.some(l => l.amount || l.memo || l.affected && l.direction !== 'in')));
  function saveMirror() { if (!S.owner || !S.draft) return; try { localStorage.setItem(mirrorKey(S.owner), JSON.stringify(S.draft)); } catch { notice('This browser could not keep the draft. Keep this page open until you can save it.', true); } }
  function rememberLocation(){if(!S.owner)return;try{localStorage.setItem(locationKey(S.owner),JSON.stringify({page:S.page,month:S.month}));}catch{}}
  function saveDraftLater() { saveMirror(); clearTimeout(draftTimer); const owner = S.owner, epoch=S.epoch,draft = structuredClone(S.draft); draftTimer = setTimeout(() => {if(current(owner,epoch))persist(owner,{draft}).catch(e => {if(current(owner,epoch))notice(e.message,true)})}, 150); }
