  async function saveEntry(){
    if(S.saving||!permission('sub-users-workspace','edit'))return;
    const owner=S.owner,epoch=S.epoch;S.saving=true;
    for(const input of $('postForm')?.querySelectorAll('input,select,textarea,button')||[])input.disabled=true;
    try{
      const draft=structuredClone(S.draft),prepared=StaffEntry14225.prepare(draft,accounts(),rules());
      prepared.snapshot.correction_journal14347=draft.correction_journal14347||null;
      const item={owner,key:draft.requestKey,draft,params:{p_owner:owner,p_key:draft.requestKey,p_items:prepared.items,p_snapshot:prepared.snapshot,p_edit_ids:draft.editIds||[]},status:'pending',createdAt:Date.now()};
      clearTimeout(draftTimer);saveMirror();
      const stored=await record(owner,old=>{const all=old.queue||[];const previous=all.find(q=>q.key===item.key);if(previous&&JSON.stringify(previous.params)!==JSON.stringify(item.params))throw fail('This save reference is already in use. Sync the pending entry before making another change.');return {...old,queue:previous?all:[...all,item],draft:null};});
      if(!current(owner,epoch))return;S.data=stored;S.draft=blankDraft();saveMirror();S.saving=false;notice('Entry saved on this device.');render();
      if(navigator.onLine)await sync();
    }catch(e){if(current(owner,epoch))notice(e.message,true);}
    finally{if(current(owner,epoch)){S.saving=false;paintConnection();if(S.page==='post')render();}}
  }
