// This report measures the support in the currency originally received.
// Exchanging a receipt or handing cash to another company account is not a second use.
const BudgetOwnerBalance=(()=>{
 const cents=n=>Math.round(Number(n)*100);
 const refs=s=>[...new Set(String(s||'').toUpperCase().match(/\bOJM\d{6}(?:-\d+)?\b/g)||[])];
 const receipts=d=>(d.movements||[]).filter(m=>BudgetReport290.kind(m)==='receipt');
 function receiptRefs(m,d,list){
  const own=refs(m.reference);
  return own.length||list.length!==1?own:refs(d.receiptReference290);
 }
 let client,owner,cache=new Map();
 async function load(records,{fresh=false}={}){
  if(client!==ojmDb||owner!==liveProfile?.id){client=ojmDb;owner=liveProfile?.id;cache=new Map();}
  const session=cache,now=Date.now();
  const ids=[...new Set(records.map(r=>r.id).filter(Boolean))].sort();
  const numbers=[...new Set(records.flatMap(r=>{const list=receipts(r.data);return list.flatMap(m=>receiptRefs(m,r.data,list));}))].sort();
  if(!ids.length&&!numbers.length)return {amounts:[],links:{}};
  const key=JSON.stringify([ids,numbers]);
  const previous=session.get(key);
  if(previous&&(!previous.done||!fresh&&now-previous.time<30000))return previous.promise;
  for(const [k,v] of session)if(v.done&&now-v.time>=30000)session.delete(k);
  const slot={time:now,done:false};
  slot.promise=(async()=>{
   try{
    const {data,error}=await client.rpc('budget_owner_equity_evidence',{p_refs:numbers,p_reports:ids});
    if(error||!Array.isArray(data?.amounts)||!data.links)throw Error('Owner support journals unavailable.');
    return data;
   }catch{return null;}
   finally{slot.done=true;}
  })();
  session.set(key,slot);return slot.promise;
 }
 function calculate(d,id,evidence){
  const rows=new Map(),groups=new Map(),eligible=new Set(),problems=new Set(),uncertain=new Set();
  const get=c=>{
   if(!rows.has(c))rows.set(c,{currency:c,received:0,used:0,postedReceived:0,postedUsed:0,refs:new Set(),posted:false});
   return rows.get(c);
  };
  const list=receipts(d);
  for(const m of list){
   const refs=receiptRefs(m,d,list),ref=refs.length===1?refs[0]:'';
   if(m.ownerSource==='other')continue;
   const key=JSON.stringify([ref,m.currency]);
   if(!groups.has(key))groups.set(key,{ref,currency:m.currency,amount:0,explicit:0});
   const g=groups.get(key);g.amount+=cents(m.inflow);
   if(m.ownerSource==='owner')g.explicit+=cents(m.inflow);
  }
  const posted=evidence?.amounts||[],linked=evidence?.links?.[id];
  for(const {ref,currency,amount,explicit} of groups.values()){
   const line=ref&&posted.find(l=>l.entry_no===ref&&l.currency===currency&&Number(l.received)>0);
   if(line&&cents(line.received)===amount){
    const r=get(currency);r.received+=amount;r.postedReceived+=amount;r.posted=true;r.refs.add(ref);
    eligible.add(JSON.stringify([ref,currency]));
   }else{
    if(explicit)get(currency).received+=explicit;
    if(line)problems.add(currency);
    if(explicit<amount)uncertain.add(currency);
   }
  }
  for(const l of posted){
   const key=JSON.stringify([l.entry_no,l.currency]);
   if(!eligible.has(key)&&l.entry_no!==linked)continue;
   const r=get(l.currency);r.refs.add(l.entry_no);r.posted=true;
   // A utilization journal may itself record the receipt for the first time.
   if(l.entry_no===linked&&!eligible.has(key)&&Number(l.received)){
    r.postedReceived+=cents(l.received);
    if(!r.received)r.received=cents(l.received);
   }
   if(cents(l.debited)!==cents(l.used))problems.add(l.currency);
   else r.postedUsed+=cents(l.used);
  }
  const spends=(d.movements||[]).filter(m=>BudgetReport290.kind(m)==='spend');
  const complete=spends.every(m=>m.ownerAmount!=null&&m.ownerAmount!==''&&Number.isFinite(Number(m.ownerAmount)));
  for(const m of spends)if(Number(m.ownerAmount)>0)get(m.ownerCurrency||m.currency).used+=cents(m.ownerAmount);
  for(const r of rows.values()){
   const conflict=problems.has(r.currency)||r.postedUsed>0&&!r.received,reviewed=complete&&(spends.length>0||!r.postedUsed)&&!uncertain.has(r.currency);
   r.basis=conflict?'Check journal match':reviewed?'Report entries':r.posted?'Posted equity':'Spending match open';
   const used=conflict?null:reviewed?r.used:r.posted?r.postedUsed:null;
   r.balance=used==null?null:r.received-used;
   r.used=used;
   r.difference=reviewed&&r.posted&&(r.used!==r.postedUsed||r.received!==r.postedReceived);
   if(r.posted&&!reviewed&&r.balance>0&&!conflict){
    const relinquished=(d.movements||[]).filter(m=>BudgetReport290.kind(m)==='refund'&&m.currency===r.currency).reduce((sum,m)=>sum+cents(m.outflow),0);
    if(relinquished!==r.balance)r.basis+=' · use still to match';
   }
   if(!evidence&&reviewed)r.basis+=' · equity unavailable';
   if(r.posted&&!reviewed&&r.received!==r.postedReceived){r.basis='Receipts partly matched';r.balance=null;}
  }
  return {rows,uncertain,evidence};
 }
 function render(result,compact=false){
  const {rows,evidence,uncertain}=result,report=BudgetReport290,esc=s=>escapeHtml(String(s));
  const amount=(currency,n)=>n==null?'—':report.amountHtml(currency,n/100);
  const codes=report.orderedUnits(rows.keys());
  if(compact)return codes.length?codes.map(c=>amount(c,rows.get(c).balance)).join('<br>'):'—';
  const body=codes.map(c=>{
   const r=rows.get(c);
   const note=[r.basis,...r.refs].map(esc).join(' · ');
   const ledger=r.difference?'<br>Posted equity remaining '+amount(c,r.postedReceived-r.postedUsed):'';
   return [esc(c),'<strong>'+amount(c,r.balance)+'</strong>',amount(c,r.received),amount(c,r.used),note+ledger];
  });
  const notice=!codes.length?(evidence?'No owner receipt has been identified for this report.':'Posted owner support could not be verified.'):
   uncertain.size?'Receipts without a verified owner source are excluded.':'';
  return section82('Owner support remaining', (body.length?table82(['Funding currency','Remaining from receipts','Owner support received','Owner support used','Basis / journal'],body):'')+
   (notice?'<p>'+esc(notice)+'</p>':''));
 }
 function closing(result){
  const report=BudgetReport290,codes=report.orderedUnits(result.rows.keys());
  const cells=codes.map(c=>{
   const r=result.rows.get(c);
   return r.balance==null?escapeHtml(c)+' —':report.amountHtml(c,r.balance/100);
  });
  return '<p class="owner-support-closing"><strong>Closing owner support remaining</strong> &nbsp; '+(cells.join(' · ')||'Awaiting verification')+'</p>';
 }
 function validateShare(m){
  const n=Number(m.ownerAmount);
  if(!m.ownerCurrency||!Number.isFinite(n)||n<0||!Number.isSafeInteger(cents(n))||Math.abs(n*100-cents(n))>0.00001)
   throw Error('Enter the owner-funded amount to two decimal places. Enter zero for another funding source, or leave it blank for review.');
  if(m.ownerCurrency===m.currency&&cents(n)>cents(m.outflow))throw Error('The owner-funded amount exceeds the spending in this currency.');
 }
 return {load,calculate,render,closing,validateShare};
})();
