  async function openScanner209(settings=false){
    if(!S.owner||S.owner!==S.actor||!permission('sub-users-workspace')||S.saving||S.submitting)return;
    const owner=S.owner,epoch=S.epoch;
    clearTimeout(draftTimer);
    // Await durable storage before leaving an unfinished journal form.
    if(S.draft){await persist(owner,{draft:structuredClone(S.draft),page:S.page});if(!current(owner,epoch))return;saveMirror();}
    rememberLocation();touch();
    location.assign(settings?'scan.html?settings=1':'scan.html?capture=1');
  }
  function navigate(page){if(!pages.includes(page)||!S.owner||!permission('sub-users-workspace'))return;if(S.page==='post')saveMirror();S.page=page;rememberLocation();$('accountMenu').hidden=true;touch();void persist(S.owner,{page}).catch(()=>{});render();}
  function captureDraft(e){
    const n=e.target;
    if(!n.dataset.field||S.saving)return;
    const key=n.dataset.field,d=S.draft,rows=d.mode==='double'?d.lines:d.single;
    if(n.dataset.index===undefined)d[key]=n.value;
    else {
      const index=Number(n.dataset.index),previous=rows[index][key];
      rows[index][key]=n.value;
      if(key==='source'&&previous!==n.value){
        const picker=$('postForm').querySelector('[data-field=affected][data-index="'+index+'"]');
        const ids=rules().entryIds.filter(id=>!n.value||currency(id)===currency(n.value));
        if(!ids.includes(rows[index].affected))rows[index].affected='';
        if(picker)picker.innerHTML=options(ids,rows[index].affected);
      }
    }
    saveDraftLater();updateValidation(n.dataset.index===undefined?undefined:Number(n.dataset.index));
  }
  function updateValidation(editedIndex){
    if(!$('entryValidation')||!S.draft)return;
    const d=S.draft, single=d.mode==='single',rows=single?d.single:d.lines;
    const totals=new Map(),problems=[];
    const cards=receiptCards(d);
    cards.forEach((indices,k)=>{
      const sums=new Map();let invalid=false,started=false;
      for(const i of indices){
        const row=rows[i],c=currency(single?row.source:row.account);
        const raw=single?[row.amount]:[row.debit,row.credit];
        const values=raw.map(value=>Number(String(value??'').replaceAll(',','')));
        if(!raw.some(value=>String(value??'').trim()))continue;
        started=true;
        if(values.some(n=>!Number.isFinite(n)||n<0||!Number.isSafeInteger(Math.round(n*100))||Math.abs(n*100-Math.round(n*100))>0.000001)||!single&&values.every(n=>n>0)){invalid=true;continue;}
        const [a,b]=values.map(n=>Math.round(n*100));
        const date=d.multiple&&!single?cardDate(d,row):'',key=date+'/'+c;
        const sum=sums.get(key)||{date,c,debit:0,credit:0};
        sum.debit+=a;sum.credit+=b||0;sums.set(key,sum);
        if(single&&c)totals.set(c,(totals.get(c)||0)+a);
      }
      let label=single?'Enter an amount':'Enter debits and credits',state='neutral';
      if(invalid){label='Check the account and amounts';state='pending';}
      else if(started&&sums.size){
        const lines=[];state='balanced';
        for(const {date,c,debit,credit} of sums.values()){
          if(single){lines.push(c?money(debit/100,c):'Choose a fund account');continue;}
          const diff=debit-credit;
          const message=diff?'Add '+money(Math.abs(diff)/100,c)+(diff>0?' credit':' debit'):!c?'Choose an account':debit?'Balanced':'Enter an amount';
          if(diff||!debit||!c)state='pending';
          lines.push((date&&sums.size>1?dateLabel(date)+' · ':'')+'Debit '+money(debit/100,c)+' · Credit '+money(credit/100,c)+' · '+message);
        }
        label=lines.join(' / ');
      }
      const box=$('postForm').querySelector('[data-card-balance="'+k+'"]');
      if(box){box.textContent=label;box.dataset.state=state;}
      if(!single&&state!=='balanced')problems.push({priority:indices.includes(editedIndex)?0:started?1:2,text:(cards.length>1?'Receipt '+(k+1)+' · ':'')+label});
    });
    const summary=$('liveReceiptBalance');
    const message=single?(totals.size?'Receipt total · '+[...totals].map(([c,n])=>money(n/100,c)).join(' / '):'Receipt total —'):
      (problems.sort((a,b)=>a.priority-b.priority)[0]?.text|| (cards.length===1?'Balanced':'All '+cards.length+' receipts balanced'));
    if(summary.textContent!==message)summary.textContent=message;
    summary.dataset.state=single?'neutral':problems.length?'pending':'balanced';
    try{const {items}=preparePhoneEntry(d);$('entryValidation').textContent=items.length+' complete '+(items.length===1?'entry':'entries');}
    catch(error){$('entryValidation').textContent=error.message;}
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
    await Receipt245.script('scripts/receipt-phone245.js?v=143.273',()=>window.ReceiptPhone245);check();
    await ReceiptPhone245.open({check,today,rpc,
      getDraft:async()=>(await record(actor)).receiptDraft245,
      saveDraft:draft=>{check();return persist(actor,{receiptDraft245:draft})},
      getPending:async()=>(await record(actor)).receiptPending245,
      savePending:request=>{check();return persist(actor,{receiptPending245:request})},
      list:async()=>(await http('vouchers14299',{'data->>documentType':'eq.receipt',select:'id,number,voucher_date,kind,status,version',order:'created_at.desc',limit:'100'})).data,
      get:async id=>(await http('vouchers14299',{id:'eq.'+id,select:'*'})).data[0]
    });
  }
