  function options(ids,selected='') { return '<option value="">Choose account</option>'+accounts().filter(a=>ids.includes(a.id)&&a.isPosting!==false&&a.isActive!==false).map(a=>`<option value="${esc(a.id)}" ${a.id===selected?'selected':''}>${esc(symbol(a.currency)+' '+a.code+' — '+cleanName(a.id))}</option>`).join(''); }
  function field(label,input){return `<div class="field"><label>${label}${input}</label></div>`;}
  function post() {
    if(!permission('sub-users-workspace','edit'))return '<h1>Post entry</h1>'+empty('Posting is not enabled for this account.');
    if(!S.data.savedAt)return '<h1>Post entry</h1>'+empty('Download your assigned accounts once before gathering entries offline.')+action('refresh','Try loading accounts','',true);
    S.draft ||= blankDraft();
    const d=S.draft,r=rules(),disabled=S.saving?'disabled':'',single=d.mode==='single',rows=single?d.single:d.lines,cards=identifyReceipts(d);
    const input=(key,value,index,attrs='')=>`<input data-field="${key}" ${index==null?'':'data-index="'+index+'"'} ${attrs} value="${esc(value)}" ${disabled}>`;
    const select=(label,key,i,ids)=>field(label,`<select data-field="${key}" data-index="${i}" ${disabled}>${options(ids,rows[i][key])}</select>`);
    const button=(name,label,attrs='')=>action(name,label,attrs+' '+disabled);
    const tabs=`<div class="receipt-segments" role="group" aria-label="Transaction entry method">${button('mode-single','Cashbook','aria-pressed="'+single+'"')}${button('mode-double','Double Entry','aria-pressed="'+!single+'"')}</div>`;
    const methods=r.offersBothMethods?tabs:'<details class="receipt-options"><summary>Entry options</summary>'+tabs+'</details>';
    const direction=single?`<div class="receipt-segments" aria-label="Cash movement">${['out','in'].map(dir=>button('direction-'+dir,'Money '+dir,'aria-pressed="'+(rows[0]?.direction===dir)+'" '+(r.directions.includes(dir)?'':'disabled'))).join('')}</div>`:'';
    const dateControl=button('entry-date','<span>Date</span><strong>'+esc(d.multiple?'Date on each receipt':dateLabel(d.date))+'</strong><span aria-hidden="true">▾</span>','aria-haspopup="dialog"');
    function line(i,indices) {
      const row=rows[i],memo=field('Line memo',input('memo',row.memo,i));
      if(single)return select('Account / fund','source',i,r.fundIds)+select('Category','affected',i,r.entryIds.filter(id=>!row.source||currency(id)===currency(row.source)))+
        field('Amount',input('amount',row.amount,i,'inputmode="decimal"'))+memo;
      return `<div class="receipt-posting"><div class="staff-account-row14225"><div class="field"><label for="phone-account-${i}">Account for line ${i+1}</label><select id="phone-account-${i}" data-field="account" data-index="${i}" ${disabled}>${options(accountIds(),row.account)}</select></div>${indices.length>2?button('remove-line','×','aria-label="Remove line '+(i+1)+'" data-index="'+i+'"'):''}</div><div class="grid">${field('Debit',input('debit',row.debit,i,'inputmode="decimal"'))}${field('Credit',input('credit',row.credit,i,'inputmode="decimal"'))}</div>${memo}</div>`;
    }
    const receipt=(indices,k)=>{
      const i=indices[0],row=rows[i],indexAttr='data-index="'+i+'"';
      return `<section class="receipt-card" data-receipt-card="${k}"><header><h2>Receipt ${k+1}</h2>${cards.length>1?button('remove-receipt','Remove',indexAttr+' aria-label="Remove receipt '+(k+1)+'"'):''}</header>${d.multiple?field('Receipt date',input('date',cardDate(d,row),i,'type="date"')):''}${indices.map(j=>line(j,indices)).join('')}${single?'':button('add-line','+ Add line',indexAttr)}<div class="receipt-balance" data-card-balance="${k}"></div></section>`;
    };
    return `<h1>${d.editIds?.length?'Edit Entry':'Post Entry'}</h1><form id="postForm" class="receipt-editor">${methods}${direction}${dateControl}${field('Description',input('memo',d.memo))}<details class="receipt-options" ${d.reference?'open':''}><summary>Reference</summary>${field('Reference (optional)',input('reference',d.reference))}</details>${cards.map(receipt).join('')}${button('add-receipt','+ Add receipt')}<span id="entryValidation" class="receipt-validation"></span><div class="receipt-footer"><div class="receipt-tools"><output id="liveReceiptBalance" aria-live="polite" aria-atomic="true"></output><button type="button" class="btn" data-action="calculator" ${disabled}>Calculator</button></div><div class="actions">${button('clear-draft','Clear')}<button type="submit" class="btn primary" ${disabled}>${S.saving?'Saving…':navigator.onLine?(single?'Save Entry':'Post Entry'):'Save on device'}</button></div></div></form>`;
  }
