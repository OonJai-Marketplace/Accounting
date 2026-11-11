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
    const method=single?'Cashbook':'Double Entry',next=single?'Double Entry':'Cashbook';
    const switcher=button('switch-method',esc(method)+' <span aria-hidden="true">⇄</span>','data-mode="'+d.mode+'" aria-label="'+method+' — switch to '+next+'"');
    const direction=single?`<div class="receipt-segments" aria-label="Cash movement">${['out','in'].map(dir=>button('direction-'+dir,'Money '+dir,'aria-pressed="'+(rows[0]?.direction===dir)+'" '+(r.directions.includes(dir)?'':'disabled'))).join('')}</div>`:'';
    const calendarIcon='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18"/></svg>';
    function dateReference(i) {
      const perLine=i!==undefined, row=perLine?rows[i]:null;
      const date=perLine?cardDate(d,row):d.date, text=dateLabel(date);
      const picker=button(perLine?'line-date':'entry-date',calendarIcon+'<strong>'+esc(text)+'</strong>',
        'data-value="'+esc(date)+'" aria-haspopup="dialog" aria-label="Choose date'+(perLine?' for line '+(i+1):' for all lines')+' · '+esc(text)+'"'+(perLine?' data-index="'+i+'"':''));
      return '<div class="receipt-date-reference"><div class="field"><span>Date</span>'+picker+'</div>'+
        field('Reference',input('reference',perLine?(row.reference??d.reference):d.reference,i))+'</div>';
    }
    function line(i,indices) {
      const row=rows[i],memo=field('Line memo',input('memo',row.memo,i));
      const dating=d.multiple?dateReference(i):row.reference!=null&&row.reference!==d.reference?field('Line reference',input('reference',row.reference,i)):'';
      if(single)return dating+select('Account / fund','source',i,r.fundIds)+select('Category','affected',i,r.entryIds.filter(id=>!row.source||currency(id)===currency(row.source)))+
        field('Amount',input('amount',row.amount,i,'inputmode="decimal"'))+memo;
      return `<div class="receipt-posting">${dating}<div class="staff-account-row14225"><div class="field"><label for="phone-account-${i}">Account for line ${i+1}</label><select id="phone-account-${i}" data-field="account" data-index="${i}" ${disabled}>${options(accountIds(),row.account)}</select></div>${indices.length>2?button('remove-line','×','aria-label="Remove line '+(i+1)+'" data-index="'+i+'"'):''}</div><div class="grid">${field('Debit',input('debit',row.debit,i,'inputmode="decimal"'))}${field('Credit',input('credit',row.credit,i,'inputmode="decimal"'))}</div>${memo}</div>`;
    }
    const receipt=(indices,k)=>{
      const i=indices[0],indexAttr='data-index="'+i+'"';
      return `<section class="receipt-card" data-receipt-card="${k}">${cards.length>1?`<header><h2>Receipt ${k+1}</h2>${button('remove-receipt','Remove',indexAttr+' aria-label="Remove receipt '+(k+1)+'"')}</header>`:''}${indices.map(j=>line(j,indices)).join('')}${single?'':button('add-line','+ Add line',indexAttr)}${cards.length>1?`<div class="receipt-balance" data-card-balance="${k}"></div>`:''}</section>`;
    };
    return `<form id="postForm" class="receipt-editor"><header class="receipt-heading"><h1>${d.editIds?.length?'Edit Entry':'Post Entry'}</h1>${switcher}</header>${direction}${field('Description',input('memo',d.memo))}${d.multiple?'':dateReference()}${cards.map(receipt).join('')}${button('add-receipt',single?'+ Add line':'+ Add receipt')}<span id="entryValidation" class="receipt-validation"></span><div class="receipt-footer"><output id="liveReceiptBalance" aria-live="polite" aria-atomic="true"></output><div class="actions">${button('clear-draft','Clear')}<button type="submit" class="btn primary" ${disabled}>${S.saving?'Saving…':navigator.onLine?(single?'Save Entry':'Post Entry'):'Save on device'}</button></div></div></form>`;
  }
