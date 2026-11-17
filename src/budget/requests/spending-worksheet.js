/* Funding decisions and cash disbursements belong to the utilization draft. */
window.BudgetSpendingWorksheet=(()=>{
 function mount(host,draft,openPayment){
  const report=BudgetReport290,request=host.querySelector('[data-request-summary]'),payments=host.querySelector('[data-disbursements]');
  const decisions=[...request.querySelectorAll('[data-decision]')].map((select,i)=>({
   select,input:request.querySelector('[data-adjusted="'+i+'"]'),display:request.querySelector('[data-funded="'+i+'"]'),line:draft.lines[i]
  }));
  const rows=[...payments.tBodies[0].rows].map(row=>({
   inputs:[...row.querySelectorAll('[data-paid-in]')],ref:row.querySelector('[data-payment-reference]'),button:row.querySelector('[data-pay-detail]')
  }));
  for(const row of rows)row.button.onclick=()=>openPayment(row.button,row.inputs);
  const dirty=()=>decisions.some(({select,input,line},i)=>{
   const prior=report.lineFunding(draft,line,i);
   return prior.status!==select.value||(select.value==='deduction'&&prior.amount!==input.valueAsNumber);
  })||rows.some(({inputs,ref})=>ref.value.trim()!==(draft.movements[Number(ref.dataset.payment)]?.reference||'')||
   inputs.some(input=>{const m=draft.movements[Number(input.dataset.payment)];return input.validity.badInput||(m?input.valueAsNumber!==report.cashPaid(m):!!input.value);}));
  function read(commit=false){
   const movements=draft.movements.slice(),funding={...draft.fundingByItem},funded=new Map();
   function invalid(field,message){if(commit)field.focus();throw Error(message);}
   for(const [i,{select,input,display,line}] of decisions.entries()){
    const status=select.value,adjusted=status==='deduction';
    input.hidden=!adjusted;display.hidden=adjusted;
    const amount=adjusted?input.valueAsNumber:status==='approved'?Number(line.amount):status==='declined'?0:null;
    if(adjusted&&(!Number.isFinite(amount)||!input.validity.valid))invalid(input,'Enter the adjusted funding for '+line.description+' between zero and the requested amount.');
    display.innerHTML=amount==null?'Unconfirmed':report.amountHtml(line.currency,amount);
    funding[report.fundingKey(line,i)]=adjusted?{status,received:amount}:{status};
    funded.set(line.currency,amount==null||funded.get(line.currency)===null?null:(funded.get(line.currency)||0)+amount);
   }
   request.querySelector('[data-funded-total]').innerHTML=report.fundedTotal(funded);
   const assignments=[];
   for(const {inputs,ref,button} of rows){
    const reference=ref.value.trim();
    for(const input of inputs){
     const index=Number(input.dataset.payment),prior=draft.movements[index],lineIndex=Number(input.dataset.line);
     const amount=input.valueAsNumber,currency=input.dataset.paidIn;
     if(prior&&amount===report.cashPaid(prior)&&reference===(prior.reference||''))continue;
     if(!input.value&&!input.validity.badInput&&!prior)continue;
     if(!Number.isFinite(amount)||!Number.isSafeInteger(Math.round(amount*100))||!input.validity.valid||(amount===0&&prior&&prior.cashDistributed==null))
      invalid(input,'Enter a valid amount paid in '+currency+'. Use Details to remove an existing payment.');
     if(!prior&&amount===0)continue;
     if(prior){
      if(!reference&&prior.reference&&!prior.worksheetSpend)invalid(ref,'Enter the payment reference.');
      if(reference===prior.reference&&amount===report.cashPaid(prior))continue;
      const next={...prior,reference};
      if(amount!==report.cashPaid(prior)){
       if(prior.cashDistributed!=null){next.cashDistributed=amount;delete next.cashBudgetAmount;}
       else{next.outflow=amount;delete next.ownerAmount;delete next.ownerCurrency;delete next.budgetAmount290;}
      }
      movements[index]=next;
     }else{
      const line=draft.lines[lineIndex];
      const next={type290:'spend',worksheetSpend:true,account:'',reference,date290:draft.date,currency,inflow:0,outflow:amount,budgetKey117:line?.key117||''};
      if(!next.budgetKey117)next.worksheetLine=lineIndex;
      if(commit)next.id290=crypto.randomUUID();
      assignments.push({input,button,ref,index:movements.length});
      movements.push(next);
     }
    }
    if(reference&&inputs.every(input=>Number(input.dataset.payment)<0&&!input.valueAsNumber))invalid(ref,'Enter the disbursement amount for this reference.');
   }
   const preview={...draft,movements,fundingByItem:funding};
   if(commit){
    Object.assign(draft,{movements,fundingByItem:funding});
    for(const {input,button,ref,index} of assignments){input.dataset.payment=String(index);if(button.dataset.payment==='-1')button.dataset.payment=ref.dataset.payment=String(index);}
   }
   return preview;
  }
  return {read,dirty};
 }
 return {mount};
})();
