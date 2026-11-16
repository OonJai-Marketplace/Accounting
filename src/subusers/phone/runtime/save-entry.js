  async function saveEntry(){
    if(S.saving||!permission('sub-users-workspace','edit'))return;
    readPhoneForm();
    let prepared;
    const draft=structuredClone(S.draft);
    try{
      prepared=preparePhoneEntry(draft);
      if(S.owner===S.actor&&prepared.items.some(item=>!cashierMonthAllows(item.date)))throw Error('Cashier entries must be dated in the current month.');
    }
    catch(error){saveDraftLater();updateValidation();notice(error.message,true,true);return;}
    if($('notice').dataset.entryValidation)notice();
    const owner=S.owner,epoch=S.epoch;let savedOnDevice=false;S.saving=true;
    for(const input of $('postForm')?.querySelectorAll('input,select,textarea,button')||[])input.disabled=true;
    try{
      // The staff save RPC retains existing edit IDs and assigns new client
      // keys using their one-based position in this full save request.
      let offset=0;
      for(const card of prepared.snapshot.receiptCards341 || [prepared.snapshot]){
        if(card.splitParts){
          card.splitByLine={};
          for(const [index,part] of Object.entries(card.splitParts)){
            const position=offset+Number(index);
            card.splitByLine[draft.editIds?.[position] || draft.requestKey+':'+(position+1)]=part;
          }
          delete card.splitParts;
        }
        offset+=card.components1437.length;
      }
      prepared.snapshot.correction_journal14347=draft.correction_journal14347||null;
      const item={owner,key:draft.requestKey,draft,params:{p_owner:owner,p_key:draft.requestKey,p_items:prepared.items,p_snapshot:prepared.snapshot,p_edit_ids:draft.editIds||[]},status:'pending',createdAt:Date.now()};
      clearTimeout(draftTimer);saveMirror();
      const stored=await record(owner,old=>{const all=old.queue||[];const previous=all.find(q=>q.key===item.key);if(previous&&JSON.stringify(previous.params)!==JSON.stringify(item.params))throw fail('This save reference is already in use. Sync the pending entry before making another change.');return {...old,queue:previous?all:[...all,item],draft:null};});
      if(!current(owner,epoch))return;savedOnDevice=true;S.data=stored;S.draft=blankDraft();saveMirror();S.saving=false;notice('Entry saved on this device.');render();
      if(navigator.onLine)void sync({automatic:true});
    }catch(e){if(current(owner,epoch))notice(e.message,true);}
    finally{if(!savedOnDevice&&current(owner,epoch)){S.saving=false;paintConnection();if(S.page==='post')render();}}
  }
