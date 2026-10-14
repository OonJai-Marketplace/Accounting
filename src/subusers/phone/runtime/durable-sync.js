  async function updateQueue(owner,keyValue,patch,remove=false){return record(owner,old=>({...old,queue:(old.queue||[]).flatMap(q=>q.key!==keyValue?[q]:remove?[]:[{...q,...patch}])}));}
  async function sync({automatic=false}={}){
    if(S.syncing||!S.owner)return;if(!navigator.onLine){notice('You are offline. Your device entries are kept.');return;}
    const owner=S.owner,epoch=S.epoch;S.syncing=true;paintConnection();
    const run=async()=>{
      try{
        if(!current(owner,epoch))return;await access();if(!current(owner,epoch))return;if(!permission('sub-users-workspace','edit'))throw fail('Posting is no longer enabled for this account.');
        const stored=await record(owner);if(!current(owner,epoch))return;S.data.queue=stored.queue||[];
        for(const q of queue().filter(q=>q.status!=='confirmed')){
          if(!current(owner,epoch)||automatic&&!phoneSyncIdle14351())return;
          try{
            if(q.params.p_owner!==owner||q.owner!==owner)throw fail('This entry belongs to a different account.');
            if(q.legacy){for(const date of new Set(q.params.p_items.map(l=>l.date))){const draft=payloadDraft({...q.params,p_items:q.params.p_items.filter(l=>l.date===date)});StaffEntry14225.prepare(draft,accounts(),rules());}}else StaffEntry14225.prepare(q.draft,accounts(),rules());
            const response=await rpc('save_staff_editor1437',q.params);
            if(!Array.isArray(response?.line_ids)||response.line_ids.length!==q.params.p_items.length||response.line_ids.some(id=>!id)||new Set(response.line_ids).size!==response.line_ids.length)throw fail('The complete save was not confirmed. Retry with the same reference.','INVALID_RESPONSE');
            const next=await updateQueue(owner,q.key,{status:'confirmed',receipt:response},false);clearLegacy(q);if(current(owner,epoch))S.data.queue=next.queue;
          }catch(e){if(!current(owner,epoch))return;const next=await updateQueue(owner,q.key,{status:ambiguous(e)?'uncertain':'blocked',message:e.message});if(current(owner,epoch))S.data.queue=next.queue;throw e;}
        }
        if(current(owner,epoch)){S.online=true;notice('All device entries were confirmed.');if(!automatic||phoneSyncIdle14351())await refresh();}
      }catch(e){if(!current(owner,epoch))return;if(denied(e))await revoke(e);else{S.online=false;notice('Pending entries are kept with their original save references. '+e.message,true);}}
    };
    try{if(navigator.locks)await navigator.locks.request('ojm-phone-sync:'+key(owner),{ifAvailable:true},lock=>lock?run():notice('Another tab is syncing this account.'));else await run();}
    finally{if(current(owner,epoch)){S.syncing=false;paintConnection();if(S.page!=='post')render();}}
  }
