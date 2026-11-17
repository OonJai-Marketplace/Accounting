  function options(ids,selected='') { return '<option value="">Choose account</option>'+accounts().filter(a=>ids.includes(a.id)&&a.isPosting!==false&&a.isActive!==false).map(a=>`<option value="${esc(a.id)}" ${a.id===selected?'selected':''}>${esc(symbol(a.currency)+' '+a.code+' — '+cleanName(a.id))}</option>`).join(''); }
  function field(label,input){return `<div class="field"><label>${label}${input}</label></div>`;}
  function post() {
    if(!permission('sub-users-workspace','edit'))return '<h1>Post entry</h1>'+empty('Posting is not enabled for this account.');
    if(!S.data.savedAt)return '<h1>Post entry</h1>'+empty('Download your assigned accounts once before gathering entries offline.')+action('refresh','Try loading accounts','',true);
    S.draft ||= blankDraft();
    const d=S.draft,r=rules(),disabled=S.saving?'disabled':'',single=d.mode==='single',rows=single?d.single:d.lines,cards=identifyReceipts(d);
    const splitIcon='<svg aria-hidden="true" width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 16V5m0 7c5 0 9-2 9-7M2 7l3-3 3 3m3 0 3-3 3 3"/></svg>';
    const input=(key,value,index,attrs='')=>`<input data-field="${key}" ${index==null?'':'data-index="'+index+'"'} ${attrs} value="${esc(value)}" ${disabled}>`;
    const amountInput=(key,value,i)=>'<span class="phone-amount">'+
      input(key,Receipt245.groupAmount(value ?? ''),i,'inputmode="decimal"')+
      '<span class="phone-amount-display" aria-hidden="true" hidden></span></span>';
    const button=(name,label,attrs='')=>action(name,label,attrs+' '+disabled);
    const method=single?'Cashbook':'Double Entry',next=single?'Double Entry':'Cashbook';
    const switcher=button('switch-method',esc(method)+' <span aria-hidden="true">⇄</span>','data-mode="'+d.mode+'" aria-label="'+method+' — switch to '+next+'"');
    const editableRows = single ? rows.filter(row => !row.journalLines) : [];
    const direction=editableRows.length?`<div class="receipt-segments" aria-label="Cash movement">${['out','in'].map(dir=>button('direction-'+dir,'Money '+dir,'aria-pressed="'+(editableRows.every(row=>row.direction===dir))+'" '+(r.directions.includes(dir)?'':'disabled'))).join('')}</div>`:'';
    const calendarIcon='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18"/></svg>';
    function dateReference(i,row) {
      const perLine=i!==undefined;
      const date=perLine?cardDate(d,row):d.date, text=dateLabel(date);
      const picker=button(perLine?'line-date':'entry-date',calendarIcon+'<strong>'+esc(text)+'</strong>',
        'data-value="'+esc(date)+'" aria-haspopup="dialog" aria-label="Choose date'+(perLine?' for line '+(i+1):' for all lines')+' · '+esc(text)+'"'+(perLine?' data-index="'+i+'"':''));
      return '<div class="receipt-date-reference"><div class="field"><span>Date</span>'+picker+'</div>'+
        field('Reference',input('reference',perLine?(row.reference??d.reference):d.reference,i))+'</div>';
    }
    function renderCards(rows, single, cards, parentIndex) {
      const labels=numberedReceiptLines(rows);
      const select=(label,key,i,ids)=>field(label,`<select data-field="${key}" data-index="${i}" ${disabled}>${options(ids,rows[i][key])}</select>`);
      function line(i,indices) {
        const row=rows[i],memo=field('Line memo',input('memo',row.memo,i));
        if (single && row.journalLines) {
          const indices = row.journalLines.map((_,j)=>j);
          return '<div data-journal-parent="'+i+'"><h2>Double Entry lines</h2>'+
            renderCards(row.journalLines, false, [indices], i)+'</div>';
        }
        const dating=row.splitGroup?'':d.multiple?dateReference(i,row):row.reference!=null&&row.reference!==d.reference?field('Line reference',input('reference',row.reference,i)):'';
        const partLabel=labels[i].number+(labels[i].suffix || '');
        const splitButton=button('split-receipt',splitIcon+' Split','data-index="'+i+'" aria-label="Split receipt on line '+labels[i].number+'"');
        const partHeading=row.splitGroup ? '<div class="split-line-heading"><strong>'+partLabel+'</strong>'+
          button('remove-part','×','data-index="'+i+'" aria-label="Remove split line '+partLabel+'"')+'</div>' : '';
        const showFund=!row.splitGroup || i===indices.find(j=>rows[j].splitGroup===row.splitGroup);
        if(single)return partHeading+(editableRows.some(l=>l.direction!==row.direction)?'<strong>Money '+(row.direction==='in'?'in':'out')+'</strong>':'')+dating+(row.description && row.description!==d.memo?field('Receipt description',input('description',row.description,i)):'')+(showFund?select('Account / fund','source',i,r.fundIds):'')+select('Category','affected',i,r.entryIds.filter(id=>!row.source||currency(id)===currency(row.source)))+
          field('Amount',amountInput('amount',row.amount,i))+memo+
          (d.multiple && row.fundDate ? '<div class="field fund-date"><span>Fund line date</span>'+button('fund-date',calendarIcon+' '+esc(dateLabel(row.fundDate)),'data-index="'+i+'" data-value="'+esc(row.fundDate)+'" aria-haspopup="dialog"')+'</div>' : '')+
          (row.fundMemo!=null?field('Fund line memo',input('fundMemo',row.fundMemo,i)):'')+
          (row.fundReference!=null?field('Fund reference',input('fundReference',row.fundReference,i)):'')+(row.splitGroup?'':splitButton);
        const label='Account for line '+partLabel, id='phone-account-'+(parentIndex==null?'':parentIndex+'-')+i;
        const controls=row.splitGroup ? '' : splitButton+(indices.length>2?button('remove-line','×','aria-label="Remove line '+labels[i].number+'" data-index="'+i+'"'):'');
        return `<div class="receipt-posting">${partHeading}${dating}<div class="split-line-heading"><label for="${id}">${row.splitGroup?'Account':'Line '+partLabel+' · Account'}</label><div>${controls}</div></div><select id="${id}" aria-label="${label}" data-field="account" data-index="${i}" ${disabled}>${options(accountIds(),row.account)}</select><div class="grid">${field('Debit',amountInput('debit',row.debit,i))}${field('Credit',amountInput('credit',row.credit,i))}</div>${memo}</div>`;
      }
      const receipt=(indices,k)=>{
        const i=indices[0],indexAttr='data-index="'+i+'"';
        const content=indices.map(j=>{
          const group=rows[j].splitGroup;
          if (!group) return line(j,indices);
          const parts=indices.filter(n=>rows[n].splitGroup===group);
          if(j!==parts[0])return '';
          const reference=d.multiple?dateReference(j,rows[j]):field('Receipt reference',input('reference',rows[j].reference??d.reference,j));
          const limit=parts.length>=maxReceiptParts;
          const add=button('split-receipt','+ Add split line','data-index="'+j+'" '+(limit?'disabled':''));
          return '<section class="split-receipt" data-split-number="'+labels[j].number+'"><header><h2>Line '+labels[j].number+' · Split receipt</h2><small>'+parts.length+' / '+maxReceiptParts+' parts</small></header>'+
            reference+parts.map(n=>line(n,indices)).join('')+add+'</section>';
        }).join('');
        if(parentIndex!=null)return content+button('add-line','+ Add line',indexAttr);
        return `<section class="receipt-card" data-receipt-card="${k}">${cards.length>1?`<header><h2>Receipt ${k+1}</h2>${button('remove-receipt','Remove',indexAttr+' aria-label="Remove receipt '+(k+1)+'"')}</header>`:''}${content}${single?'':button('add-line','+ Add line',indexAttr)}${cards.length>1?`<div class="receipt-balance" data-card-balance="${k}"></div>`:''}</section>`;
      };
      return cards.map(receipt).join('');
    }
    return `<form id="postForm" class="receipt-editor"><header class="receipt-heading"><h1>${d.editIds?.length?'Edit Entry':'Post Entry'}</h1>${switcher}</header>${direction}${field('Description',input('memo',d.memo))}${d.multiple?'':dateReference()}${renderCards(rows,single,cards)}${button('add-receipt','+ Add receipt')}${!single&&cards.length>1?'<button type="button" class="btn" data-action="combine-payment" hidden>Use one petty-cash credit for these receipts</button>':''}<span id="entryValidation" class="receipt-validation"></span><div class="receipt-footer"><output id="liveReceiptBalance" aria-live="polite" aria-atomic="true"></output><div class="actions">${button('clear-draft','Clear')}<button type="submit" class="btn primary" ${disabled}>${S.saving?'Saving…':navigator.onLine?(single?'Save Entry':'Post Entry'):'Save on device'}</button></div></div></form>`;
  }
