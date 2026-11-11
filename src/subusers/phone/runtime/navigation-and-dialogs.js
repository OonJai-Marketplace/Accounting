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
      const index=Number(n.dataset.index);
      const indices=key==='date'&&d.mode==='double'?receiptCards(d).find(group=>group.includes(index)):[index];
      for(const i of indices)rows[i][key]=n.value;
      if(key==='source'){
        const picker=$('postForm').querySelector('[data-field=affected][data-index="'+index+'"]');
        const ids=rules().entryIds.filter(id=>!n.value||currency(id)===currency(n.value));
        if(!ids.includes(rows[index].affected))rows[index].affected='';
        if(picker)picker.innerHTML=options(ids,rows[index].affected);
      }
    }
    saveDraftLater();updateValidation();
  }
  function updateValidation(){
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
        if(!c||values.some(n=>!Number.isFinite(n)||n<0||!Number.isSafeInteger(Math.round(n*100))||Math.abs(n*100-Math.round(n*100))>0.000001)||!single&&values.every(n=>n>0)){invalid=true;continue;}
        const [a,b]=values.map(n=>Math.round(n*100)),sum=sums.get(c)||[0,0];
        sum[0]+=a;sum[1]+=b||0;sums.set(c,sum);
        if(single)totals.set(c,(totals.get(c)||0)+a);
      }
      let label=single?'Enter an amount':'Enter debits and credits',state='neutral';
      if(invalid){label='Check the account and amounts';state='pending';}
      else if(started&&sums.size){
        const lines=[];state='balanced';
        for(const [c,[debit,credit]] of sums){
          if(single){lines.push(money(debit/100,c));continue;}
          const diff=debit-credit;
          const message=diff?'Add '+money(Math.abs(diff)/100,c)+(diff>0?' credit':' debit'):debit?'Balanced':'Enter an amount';
          if(diff||!debit)state='pending';
          lines.push('Debit '+money(debit/100,c)+' · Credit '+money(credit/100,c)+' · '+message);
        }
        label=lines.join(' / ');
      }
      const box=$('postForm').querySelector('[data-card-balance="'+k+'"]');
      if(box){box.textContent=label;box.dataset.state=state;}
      if(!single&&state!=='balanced')problems.push((cards.length>1?'Receipt '+(k+1)+' · ':'')+label);
    });
    const summary=$('liveReceiptBalance');
    const message=single?(totals.size?'Receipt total · '+[...totals].map(([c,n])=>money(n/100,c)).join(' / '):'Receipt total —'):
      (problems[0]|| (cards.length===1?'Balanced':'All '+cards.length+' receipts balanced'));
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

  async function phoneCalculator(){
    const draft=S.draft,owner=S.owner,epoch=S.epoch;
    const amounts=[...$('postForm').querySelectorAll('input[data-field="debit"],input[data-field="credit"],input[data-field="amount"]')];
    const targetList=amounts.map((n,i)=>{
      const card=Number(n.closest('[data-receipt-card]').dataset.receiptCard)+1;
      const line=Number(n.dataset.index)+1;
      const label='Receipt '+card+' · '+(draft.mode==='double'?'Line '+line+' · ':'')+n.dataset.field;
      return '<option value="'+i+'">'+esc(label)+'</option>';
    }).join('');
    let value='0',left=null,operator='',fresh=true,error=false;
    function calculate(){
      if(left===null||!operator)return true;
      const right=Number(value),result=operator==='+'?left+right:operator==='−'?left-right:operator==='×'?left*right:left/right;
      if(!Number.isFinite(result)){value='Cannot divide by zero';error=true;return false;}
      value=String(Number(result.toPrecision(12)));return true;
    }
    const chosen=await phoneDialog14370(()=>{
      $('dialogBody').innerHTML='<h2>Calculator</h2><output class="receipt-calc-display" aria-live="polite"></output><div class="receipt-keypad">'+['7','8','9','÷','4','5','6','×','1','2','3','−','0','.','=','+','Clear','⌫'].map(key=>'<button type="button" data-math="'+key+'">'+key+'</button>').join('')+'</div><label>Apply result to<select id="receiptCalcTarget"><option value="">Choose amount field</option>'+targetList+'</select></label>';
      $('dialogButtons').innerHTML='<button class="btn" value="cancel">Close</button><button class="btn primary" value="yes" disabled>Use amount</button>';
      const display=$('dialogBody').querySelector('output'),target=$('receiptCalcTarget'),apply=$('dialogButtons').querySelector('[value=yes]');
      const draw=()=>{display.textContent=(operator&&!error?left+' '+operator+' ':'')+value;apply.disabled=!target.value||error||!!operator||Number(value)<0||!Number.isSafeInteger(Math.round(Number(value)*100));};
      $('dialogBody').querySelector('.receipt-keypad').onclick=e=>{
        const key=e.target.closest('[data-math]')?.dataset.math;if(!key)return;
        if(key==='Clear'||error){value='0';left=null;operator='';fresh=true;error=false;if(key==='Clear'){draw();return;}}
        if(/[0-9.]/.test(key)){
          if(fresh){value='0';fresh=false;}
          if(key==='.'&&!value.includes('.'))value+='.';
          else if(key!=='.'&&value.length<14)value=value==='0'?key:value+key;
        }else if(key==='⌫'){value=fresh?'0':value.slice(0,-1)||'0';fresh=false;}
        else if(key==='='){if(calculate()){left=null;operator='';fresh=true;}}
        else {if((!operator||fresh||calculate())&&!error){left=Number(value);operator=key;fresh=true;}}
        draw();
      };
      target.onchange=draw;draw();
    },()=>({i:Number($('receiptCalcTarget').value),value:String(Math.round((Number(value)+Number.EPSILON)*100)/100)}));
    if(!chosen||S.draft!==draft||!current(owner,epoch)||S.saving||!amounts[chosen.i]?.isConnected)return;
    const n=amounts[chosen.i];n.value=chosen.value;n.dispatchEvent(new Event('input',{bubbles:true}));n.focus();
  }
