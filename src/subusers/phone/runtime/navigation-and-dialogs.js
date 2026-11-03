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
  function captureDraft(e){const n=e.target;if(!n.dataset.field||S.saving)return;const field=n.dataset.field;if(n.dataset.index!==undefined)S.draft[S.draft.mode==='double'?'lines':'single'][Number(n.dataset.index)][field]=n.value;else S.draft[field]=n.value;saveDraftLater();updateValidation();}
  function updateValidation(){if(!$('entryValidation')||!S.draft)return;try{const {items}=StaffEntry14225.prepare(S.draft,accounts(),rules());const sums=new Map();for(const l of items){const c=currency(l.fund);sums.set(c,(sums.get(c)||0)+l.amount);}$('entryValidation').textContent=items.length+' complete '+(items.length===1?'entry':'entries')+' · '+[...sums].map(([c,n])=>money(n,c)).join(' · '); }catch(e){$('entryValidation').textContent=e.message;}}
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
    await Receipt245.script('scripts/receipt-phone245.js?v=143.250',()=>window.ReceiptPhone245);check();
    await ReceiptPhone245.open({check,today,rpc,
      getDraft:async()=>(await record(actor)).receiptDraft245,
      saveDraft:draft=>{check();return persist(actor,{receiptDraft245:draft})},
      getPending:async()=>(await record(actor)).receiptPending245,
      savePending:request=>{check();return persist(actor,{receiptPending245:request})},
      list:async()=>(await http('vouchers14299',{'data->>documentType':'eq.receipt',select:'id,number,voucher_date,kind,status,version',order:'created_at.desc',limit:'100'})).data,
      get:async id=>(await http('vouchers14299',{id:'eq.'+id,select:'*'})).data[0]
    });
  }
