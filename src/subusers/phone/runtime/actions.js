  function connectionDialog(){const dialog=$('dialog');dialog.close();dialog.classList.add('phone-connection14246');$('dialogBody').innerHTML='<h2>Connection & sync</h2><p>Saved entries sync automatically. Unfinished form edits stay on this device until saved.</p><section class="sync-section14246"><h3>Connection</h3><p>'+esc(navigator.onLine?(S.online?'Online':'Limited connection'):'Offline')+'</p></section><section class="sync-section14246"><h3>Website files</h3><p>'+esc(S.shellReady?'Downloaded for reopening without connection.':'Still preparing for offline reopening.')+'</p></section><section class="sync-section14246"><h3>Device entries · '+queue().length+'</h3>'+(queue().map(q=>'<article class="sync-entry14246"><strong>'+esc(q.draft.date+' · '+q.draft.memo)+'</strong><p>'+esc(q.status==='uncertain'?'Needs confirmation':q.status==='blocked'?'Needs attention':'Waiting to sync')+'</p>'+(q.message?'<p>'+esc(q.message)+'</p>':'')+'<small>Reference: '+esc(q.key)+'</small></article>').join('')||'<p>No device entries waiting to sync.</p>')+'</section>';$('dialogButtons').innerHTML='<button class="btn" value="close">Close</button>';dialog.onclose=()=>dialog.classList.remove('phone-connection14246');dialog.showModal();}
  async function handle(name,index){const owner=S.owner,epoch=S.epoch;try{
    if(name==='protocols'){
      if(!S.owner)return;
      $('accountMenu').hidden=true;
      $('avatar').setAttribute('aria-expanded','false');
      return await phoneDialog14370(()=>{
        $('dialogBody').innerHTML='<iframe class="phone-protocol-reader" title="Accounting protocols" src="docs/protocols/index.html"></iframe>';
        $('dialogButtons').innerHTML='<button class="btn" value="cancel">Close protocols</button>';
      },()=>false);
    }
    if(name==='issue-receipt')return await openReceipt245();
    if(name==='scan'||name==='scan-settings')return await openScanner209(name==='scan-settings');
    if(name==='reopen-correction'){const j=headers().filter(j=>j.status==='returned'&&!reopened14348.has(correctionKey14348(j)))[index];if(j&&permission('sub-users-workspace','edit')){reopened14348.add(correctionKey14348(j));render();}return;}if(name==='tool-back'){S.area='users';window.PhoneTools14242?.close();render();drawUsers();return;}if(name==='reopen')return await boot();if(name==='directory-refresh')return await loadDirectory();if(name==='signout')return await signout();if(name==='refresh')return await refresh();if(name==='sync')return await sync();if(name==='submit')return await submit();if(name==='print')return await printReport();if(name==='edit')return await edit(index);if(name==='void')return await voidEntry(index);if(name==='more'){S.limit+=30;render();return;}
    if(S.page!=='post'||S.saving||!S.draft)return;
    if(name==='mode-single'||name==='mode-double'){if(!changeMode243(name==='mode-single'?'single':'double'))return;}
    const d=S.draft, single=d.mode==='single', rows=single?d.single:d.lines;
    if(name==='calculator'){await phoneCalculator();return;}
    if(name==='entry-date'){
      const selected=await chooseReceiptDate(d);
      if(!selected||!current(owner,epoch)||S.draft!==d||S.saving)return;
      if(!selected.multiple&&d.multiple&&rows.some(row=>cardDate(d,row)!==selected.date)){
        if(!await confirmDialog('Use one date for all receipts?',dateLabel(selected.date),'Use one date')||!current(owner,epoch)||S.draft!==d||S.saving)return;
      }
      identifyReceipts(d);
      d.multiple=selected.multiple;
      d.date=selected.date;
      for(const row of rows){if(d.multiple)row.date??=d.date;else delete row.date;}
    }
    if(name==='direction-out'||name==='direction-in'){
      const direction=name.slice(10);
      if(!single||!rules().directions.includes(direction))return;
      for(const row of rows)row.direction=direction;
    }
    if(name==='add-receipt'){
      const date=cardDate(d,rows.at(-1)), defaults=blankDraft();
      if(single)rows.push({...defaults.single[0],direction:rows[0]?.direction||defaults.single[0].direction,...(d.multiple?{date}:{})});
      else {const receipt=crypto.randomUUID();rows.push(...defaults.lines.map(row=>({...row,receipt,...(d.multiple?{date}:{})})));}
    }
    if(name==='add-line'&&!single){
      const row=rows[index];
      rows.splice(rows.findLastIndex(l=>l.receipt===row.receipt)+1,0,{...blankDraft().lines[0],receipt:row.receipt,...(d.multiple?{date:cardDate(d,row)}:{})});
    }
    if(name==='remove-receipt'){
      const cards=identifyReceipts(d),indices=cards.find(group=>group.includes(index));
      if(cards.length<=1||!indices)return;
      for(const i of [...indices].reverse())rows.splice(i,1);
    }
    if(name==='remove-line'&&!single){
      const group=receiptCards(d).find(group=>group.includes(index));
      if(group?.length>2)rows.splice(index,1);
    }
    if(name==='clear-draft'){if(draftFilled()&&!await confirmDialog('Clear the draft?','This only clears the unfinished form. Saved and pending entries are kept.','Clear'))return;if(!current(owner,epoch))return;S.draft=blankDraft();}
    saveDraftLater();render();
  }catch(e){if(current(owner,epoch))notice(e.message,true);}}
