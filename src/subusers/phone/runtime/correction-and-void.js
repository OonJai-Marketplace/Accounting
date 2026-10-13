  async function edit(index){const g=groupEntries()[index];if(!g||!permission('sub-users-workspace','edit')||!editable14348(g.batch))return;
    if(queue().some(q=>q.params.p_edit_ids.some(id=>g.lines.some(l=>l.id===id)))){notice('Sync the pending change to this entry first.',true);return;}
    if(draftFilled()&&!await confirmDialog('Replace the current draft?','Save the current draft first if you need to keep it.','Replace'))return;
    const first=g.lines[0],saved=first.editor_snapshot1437,r=rules();let d;
    const normalize=rows=>rows.map(l=>JSON.stringify([l.date,l.direction,l.fund,l.account,Number(l.amount),l.memo])).sort().join('|');
    const actual=g.lines.map(l=>({date:l.transaction_date,direction:l.direction,fund:l.fund_account_id,account:l.account_id,amount:l.amount,memo:l.memo}));
    if(saved?.components1437&&normalize(actual)===normalize(saved.components1437.filter(l=>l.date===first.transaction_date))){d={...blankDraft(),mode:saved.mode,date:first.transaction_date,memo:saved.memo,reference:saved.reference||'',single:structuredClone(saved.single||[]),lines:(saved.rows||[]).map(l=>({account:accounts().find(a=>a.code+' — '+a.name===l.account||a.id===l.account)?.id||'',debit:l.dr||'',credit:Object.values(l.credits||{}).find(x=>Number(x)>0)||'',memo:l.memo||''}))};}
    else d={...blankDraft(),date:first.transaction_date,memo:first.memo,reference:first.reference||'',single:g.lines.map(l=>({direction:l.direction,source:l.fund_account_id,affected:l.direction==='in'&&l.account_id===l.fund_account_id?r.counterpart:l.account_id,amount:String(l.amount),memo:l.memo||''}))};
    d.correction_journal14347=g.batch.status==='returned'?g.batch.id:null;d.editIds=g.lines.map(l=>l.id);S.draft=d;saveDraftLater();navigate('post');
  }
  async function voidEntry(index){const g=groupEntries()[index];if(!g||!permission('sub-users-workspace','void')||!editable14348(g.batch))return;
    if(!navigator.onLine||queue().length){notice('Sync pending entries and reconnect before voiding.',true);return;}
    const owner=S.owner,epoch=S.epoch,reason=await confirmDialog('Void this entry?','All lines in this entry will be voided together.','Void',true);if(!reason||!current(owner,epoch))return;
    try{await access();await rpc('void_staff_editor1437',{p_owner:owner,p_ids:g.lines.map(l=>l.id),p_reason:reason});notice('Entry voided.');await refresh();}catch(e){if(current(owner,epoch)){if(denied(e))await revoke(e);else notice('The result needs confirmation. Refresh before retrying. '+e.message,true);}}
  }
