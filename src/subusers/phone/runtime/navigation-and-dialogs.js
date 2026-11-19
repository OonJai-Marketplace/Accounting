  function showScanUnavailable(){
    if(!S.owner || S.owner!==S.actor || !permission('sub-users-workspace'))return;
    $('accountMenu').hidden=true;
    notice('Feature unavailable. Coming soon.');
  }
  function navigate(page){if(!pages.includes(page)||!S.owner||!permission('sub-users-workspace'))return;if(S.page==='post')saveMirror();S.page=page;rememberLocation();$('accountMenu').hidden=true;touch();void persist(S.owner,{page}).catch(()=>{});render();}
  function fieldRows(draft, field) {
    const parent = field.closest('[data-journal-parent]');
    if (parent) return draft.single[Number(parent.dataset.journalParent)].journalLines;
    return draft.mode === 'double' ? draft.lines : draft.single;
  }
  // Mobile keyboards and autofill can commit a visible value without an input event.
  function readPhoneForm() {
    const draft=S.draft,form=$('postForm');
    if(!draft||!form)return;
    const rows=draft.mode==='double'?draft.lines:draft.single;
    for(const field of form.querySelectorAll('[data-field]')) {
      const target=field.dataset.index===undefined?draft:fieldRows(draft,field)[Number(field.dataset.index)];
      if (!target) continue;
      const key = field.dataset.field;
      if (key === 'reference' && target !== draft && target.reference == null && field.value === draft.reference) continue;
      // A previously assigned account can be absent from today's picker.
      if (field.tagName === 'SELECT' && !field.value && target[key] && !Array.from(field.options).some(o => o.value === target[key])) continue;
      target[key] = field.inputMode === 'decimal' ? field.value.replaceAll(',','') : field.value;
    }
    // The split panel exposes one receipt reference and one Cashbook fund.
    for (const group of [rows,...rows.filter(r=>r.journalLines).map(r=>r.journalLines)]) {
      const shared=new Map();
      for(const row of group){
        if(!row.splitGroup)continue;
        if(!shared.has(row.splitGroup)){shared.set(row.splitGroup,row);continue;}
        const first=shared.get(row.splitGroup);
        if(first.reference==null)delete row.reference;else row.reference=first.reference;
        if(draft.mode==='single' && group===rows)row.source=first.source;
      }
    }
  }
  function skipGroupingComma(e) {
    const n=e.target;
    if(n.inputMode!=='decimal'||e.isComposing||n.selectionStart!==n.selectionEnd)return;
    const at=n.selectionStart;
    // Delete the adjacent digit even when the caret touches an inserted comma.
    if(e.inputType==='deleteContentBackward' && n.value[at-1]===',')n.setSelectionRange(at-2,at);
    if(e.inputType==='deleteContentForward' && n.value[at]===',')n.setSelectionRange(at,at+2);
  }
  function formatPhoneAmount(field,composing) {
    const display=field.nextElementSibling;
    const grouped=Receipt245.groupAmount(field.value);
    // Rewriting an active IME value ends its replacement range. Paint the
    // grouped text in place until the keyboard commits its original digits.
    const preview=composing && grouped!==field.value;
    display.hidden=!preview;
    field.classList.toggle('composing-amount',preview);
    if(!preview){if(!composing)Receipt245.formatAmount(field);return;}
    const offset=field.value.slice(0,field.selectionEnd ?? field.value.length).replaceAll(',','').length;
    let at=0,digits=0;
    while(at<grouped.length && digits<offset){if(grouped[at++]!==',')digits++;}
    const caret=document.createElement('i');
    display.replaceChildren(grouped.slice(0,at),caret,grouped.slice(at));
    display.scrollLeft=Math.max(0,caret.offsetLeft-display.clientWidth+2);
  }
  function captureDraft(e){
    const n=e.target;
    if(!n.dataset.field||S.saving)return;
    if(n.inputMode==='decimal')formatPhoneAmount(n,e.isComposing);
    const key=n.dataset.field,d=S.draft,rows=fieldRows(d,n);
    if(n.dataset.index===undefined){
      d[key]=n.value;
      if(key==='reference')for(const field of $('postForm').querySelectorAll('[data-field=reference][data-index]')){
        if(fieldRows(d,field)[Number(field.dataset.index)].reference==null)field.value=n.value;
      }
    }
    else {
      const index=Number(n.dataset.index),previous=rows[index][key];
      rows[index][key]=n.value;
      if(key==='source'&&previous!==n.value){
        const ids=rules().entryIds.filter(id=>!n.value||currency(id)===currency(n.value));
        rows.forEach((row,i)=>{
          if(i!==index && !(rows[index].splitGroup && row.splitGroup===rows[index].splitGroup))return;
          row.source=n.value;
          if(!ids.includes(row.affected))row.affected='';
          const picker=$('postForm').querySelector('[data-field=affected][data-index="'+i+'"]');
          if(picker)picker.innerHTML=options(ids,row.affected);
        });
      }
    }
    readPhoneForm();saveDraftLater();updateValidation(n.dataset.index===undefined?undefined:Number(n.dataset.index));
  }
  function updateValidation(editedIndex){
    if(!$('entryValidation')||!S.draft)return;
    const d=S.draft, single=d.mode==='single',rows=single?d.single:d.lines;
    const totals=new Map(),journalTotals=new Map(),problems=[],cardLabels=[];
    const cards=receiptCards(d);
    cards.forEach((indices,k)=>{
      const journalLines = single && rows[indices[0]].journalLines;
      const cash = single && !journalLines;
      const cardRows = journalLines || indices.map(i=>rows[i]);
      const active = cash ? cardRows.filter(l=>cashbookLineEntered(l,rules().fundIds)) : cardRows.filter(journalLineEntered);
      if (!active.length && cards.length>1) {
        const box=$('postForm').querySelector('[data-card-balance="'+k+'"]');
        if(box){box.textContent='';box.dataset.state='neutral';}
        return;
      }
      const sums=new Map();let invalid=false,started=false;
      const shared = !cash && sharedReceiptPayment({...d,mode:'double'}, active);
      for(const row of active){
        const c=currency(cash?row.source:row.account);
        const raw=cash?[row.amount]:[row.debit,row.credit];
        const values=raw.map(value=>Number(String(value??'').replaceAll(',','')));
        if(!raw.some(value=>String(value??'').trim()))continue;
        started=true;
        if(!c){invalid=true;continue;}
        if(values.some(n=>!Number.isFinite(n)||n<0||!Number.isSafeInteger(Math.round(n*100))||Math.abs(n*100-Math.round(n*100))>0.000001)||!cash&&values.every(n=>n>0)){invalid=true;continue;}
        const [a,b]=values.map(n=>Math.round(n*100));
        const date=d.multiple&&!cash&&!shared?cardDate(d,row):'',key=date+'/'+c;
        const sum=sums.get(key)||{date,c,debit:0,credit:0};
        sum.debit+=a;sum.credit+=b||0;sums.set(key,sum);
        if(!cash){
          const journal=journalTotals.get(c)||{debit:0,credit:0};
          journal.debit+=a;journal.credit+=b||0;journalTotals.set(c,journal);
        }
        if(cash&&c)totals.set(c,(totals.get(c)||0)+a);
      }
      let label=cash?'Enter an amount':'Enter debits and credits',state='neutral';
      if(invalid){label='Check the account and amounts';state='pending';}
      else if(started&&sums.size){
        const lines=[];state='balanced';
        for(const {date,c,debit,credit} of sums.values()){
          if(cash){lines.push(c?money(debit/100,c):'Choose a fund account');continue;}
          const diff=debit-credit;
          const message=diff?'Add '+money(Math.abs(diff)/100,c)+(diff>0?' credit':' debit'):!c?'Choose an account':debit?'Balanced':'Enter an amount';
          if(diff||!debit||!c)state='pending';
          lines.push((date&&sums.size>1?dateLabel(date)+' · ':'')+'Debit '+money(debit/100,c)+' · Credit '+money(credit/100,c)+' · '+message);
        }
        label=lines.join(' / ');
      }
      cardLabels.push(label);
      const box=$('postForm').querySelector('[data-card-balance="'+k+'"]');
      if(box){box.textContent=label;box.dataset.state=state;}
      if(!cash&&state!=='balanced')problems.push({priority:indices.includes(editedIndex)?0:started?1:2,text:(cards.length>1?'Receipt '+(k+1)+' · ':'')+label});
    });
    const combine=$('postForm').querySelector('[data-action="combine-payment"]');
    const combined=combine && combinedPayment(d,cards);
    if(combine)combine.hidden=!combined;
    const validation=$('entryValidation'), alert=$('notice');
    let errorText='', allocated=false;
    try {
      const {items,snapshot}=preparePhoneEntry(d);
      allocated=snapshot.allocatedReceipt || snapshot.receiptCards341?.some(card=>card.allocatedReceipt);
      validation.textContent=items.length+' complete '+(items.length===1?'entry':'entries');
    } catch(error){errorText=error.message;validation.textContent=errorText;}
    const summary=$('liveReceiptBalance');
    const message=combined?StaffEntry14225.balanceMessage(combined.plan.currency,combined.plan.totalCents/100,combined.plan.totalCents/100)+' overall · Check individual receipts or use one shared credit.':single?(totals.size?'Receipt total · '+[...totals].map(([c,n])=>money(n/100,c)).join(' / '):'Receipt total —'):
      (problems.sort((a,b)=>a.priority-b.priority)[0]?.text|| (cards.length===1?cardLabels[0]:'All '+cardLabels.length+' receipts balanced'));
    const overall=!single && cards.length>1 && !combined && journalTotals.size ?
      'Journal '+[...journalTotals].map(([c,t])=>'DR '+money(t.debit/100,c)+' / CR '+money(t.credit/100,c)).join(' · ')+' · ' : '';
    const retainedCount=single ? rows.filter(row=>row.journalLines).length : 0;
    const summaryText=retainedCount ? (problems[0]?.text || (cards.length===1 ? cardLabels[0] : cardLabels.join(' / '))) : overall+message;
    const text=allocated ? [...journalTotals].map(([c,t])=>StaffEntry14225.balanceMessage(c,t.debit/100,t.credit/100)).join(' / ') : summaryText;
    if(allocated)for(const box of $('postForm').querySelectorAll('[data-card-balance][data-state=pending]')){
      box.textContent='Balanced in the full journal';box.dataset.state='balanced';
    }
    if(summary.textContent!==text)summary.textContent=text;
    summary.dataset.state=allocated?'balanced':problems.length?'pending':single?'neutral':'balanced';
    if(alert.dataset.entryValidation) {
      if(!errorText)notice();
      else if(alert.querySelector('span')?.textContent!==errorText)notice(errorText,true,true);
    }
  }
  let pendingDialog14370=null;
  function phoneDialog14370(draw,read){
    if(pendingDialog14370)pendingDialog14370(false);
    const dialog=$('dialog');dialog.onclose=null;dialog.close();$('dialogBody').onchange=null;
    return new Promise(resolve=>{
      const finish=value=>{if(pendingDialog14370!==finish)return;pendingDialog14370=null;dialog.onclose=null;$('dialogBody').onchange=null;resolve(value)};
      pendingDialog14370=finish;
      try{draw();dialog.returnValue='cancel';dialog.onclose=()=>{if(!dialog.open)finish(dialog.returnValue==='yes'?read():false)};dialog.showModal();}
      catch(error){pendingDialog14370=null;dialog.onclose=null;$('dialogBody').onchange=null;throw error;}
    });
  }
  function confirmDialog(title,text,label='Continue',input=false){return phoneDialog14370(()=>{$('dialogBody').innerHTML='<h2>'+esc(title)+'</h2><p>'+esc(text)+'</p>'+(input?'<label>Reason<textarea id="dialogReason" required></textarea></label>':'');$('dialogButtons').innerHTML='<button class="btn" value="cancel">Cancel</button><button class="btn primary" value="yes">'+esc(label)+'</button>';},()=>input?$('dialogReason').value.trim():true);}
  function chooseReportTypes14294(types,month){return phoneDialog14370(()=>{$('dialogBody').innerHTML='<h2>Submit for review</h2><p>'+esc(month)+'</p>'+submissionReconciliation14345.types(types,'phoneReportTypes14346');$('dialogButtons').innerHTML='<button class="btn" value="cancel">Cancel</button><button class="btn primary" value="yes" disabled>Submit</button>';const submit=$('dialogButtons').querySelector('[value=yes]');submissionReconciliation14345.bindTypes($('dialogBody'));$('dialogBody').onchange=()=>{submit.disabled=!$('dialogBody').querySelector('input:checked')};},()=>{const chosen=[...$('dialogBody').querySelectorAll('input:checked')].map(n=>n.value);return chosen.length?chosen:false});}

  async function openReceipt245(){
    if(!isAdmin()||S.saving||S.submitting)return;
    const actor=S.actor,epoch=S.epoch,check=()=>{if(!isAdmin()||actor!==S.actor||epoch!==S.epoch)throw fail('Administrator access changed. Reopen Receipts.');};
    saveMirror();$('accountMenu').hidden=true;
    await Receipt245.script('scripts/receipt-phone245.js?v=143.426',()=>window.ReceiptPhone245);check();
    await ReceiptPhone245.open({check,today,rpc,
      getDraft:async()=>(await record(actor)).receiptDraft245,
      saveDraft:draft=>{check();return persist(actor,{receiptDraft245:draft})},
      getPending:async()=>(await record(actor)).receiptPending245,
      savePending:request=>{check();return persist(actor,{receiptPending245:request})},
      list:async()=>(await http('vouchers14299',{'data->>documentType':'eq.receipt',select:'id,number,voucher_date,kind,status,version',order:'created_at.desc',limit:'100'})).data,
      get:async id=>(await http('voucher_documents_read',{id:'eq.'+id,select:'*'})).data[0],
      batchIndex:async row=>(await http('vouchers14299',{batch_key:'eq.'+row.batch_key,ordinal:'lt.'+row.ordinal,select:'id',limit:'50'})).data.length
    });
  }
