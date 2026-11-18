/* USD owner support is accounted for in regular equity, in its original currency. */
window.BudgetSupportEquity=(()=>{
 'use strict';
 const round=n=>Math.round((n+Number.EPSILON)*100)/100;
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const journalRefs=s=>[...new Set(String(s||'').toUpperCase().match(/\bOJM\d{6}(?:-\d+)?\b/g)||[])];
 const roleName={remaining:'Owner Financial Support — Remaining — USD',used:'Owner Financial Support — Used — USD'};
 const regular=(a,type)=>a?.currency==='USD'&&a.isPosting!==false&&!a.isTechnical&&a.type===type&&(!a.purpose||a.purpose==='regular');
 function equity(role){
  const matches=AccountingStore.accounts.filter(a=>regular(a,'EQUITY')&&norm(a.name).replace(/\busd\b/g,'').trim()===norm(roleName[role]).replace(/ usd$/,''));
  return matches.length===1?matches[0]:null;
 }
 function receipts(d){return (d.movements||[]).filter(m=>BudgetReport290.kind(m)==='receipt'&&m.ownerSource!=='other'&&m.currency==='USD'&&Number(m.inflow)>0);}
 function groups(d){
  const list=receipts(d),header=journalRefs(d.receiptReference290),groups=new Map();
  for(const m of list){
   let refs=journalRefs(m.reference);
   if(!refs.length&&header.length){
    if(list.length!==1)throw Error('Identify the posted journal on each USD receipt before preparing this report.');
    refs=header;
   }
   if(refs.length>1)throw Error('Identify one funding journal per USD receipt.');
   const reference=refs[0]||'',destination=m.destination290||'',key=reference||'new:'+destination;
   if(!groups.has(key))groups.set(key,{reference,destination,amount:0});
   groups.get(key).amount+=Number(m.inflow);
  }
  return [...groups.values()];
 }
 async function evidence(groups){
  const numbers=groups.map(g=>g.reference).filter(Boolean);
  if(!numbers.length)return [];
  const {data,error}=await ojmDb.from('journal_entries').select('entry_no,status,journal_lines(currency_code,debit,credit,fx_rate_lak,book_rate_lak,accounts(id,code,name))').in('entry_no',numbers).setHeader('x-ojm-database-only','1');
  if(error)throw Error('Could not verify the funding journal. '+error.message);
  return data||[];
 }
 function usage(d,received){
  const usd=BudgetReport290.balances(d).get('USD');
  if(usd?.allocated===null)throw Error('Enter the missing USD funding equivalent before preparing owner support.');
  const other=(d.movements||[]).filter(m=>BudgetReport290.kind(m)==='receipt'&&m.currency==='USD'&&m.ownerSource==='other').reduce((n,m)=>n+Number(m.inflow),0);
  if(other>0)throw Error('Enter the owner-funded share of each expense when USD funding has more than one source.');
  return round(Math.max(0,(usd?.allocated||0)-(usd?.coverage||0)));
 }
 function receivingAccount(destination){
  const accounts=AccountingStore.accounts.filter(a=>regular(a,'ASSET'));
  const match=getSelectedAccountInfo(destination);
  if(match)return regular(match,'ASSET')?match:null;
  const text=norm(destination);
  if(text&&!['budget funds','budget funds usd','bcel','bcel usd'].includes(text)){
   const matches=accounts.filter(a=>norm(a.name)===text||norm(a.name).replace(/ usd$/,'')===text);
   return matches.length===1?matches[0]:null;
  }
  return accounts.find(a=>a.code==='1041'&&/\bbcel\b/i.test(a.name));
 }
 function plan(d,groups,journals){
  const remaining=equity('remaining'),usedAccount=equity('used');
  const received=round(groups.reduce((s,g)=>s+g.amount,0));
  let used;
  if((d.movements||[]).some(m=>m.ownerAmount!=null)){
   const review=BudgetOwnerBalance.calculate(d,null,{links:{},amounts:journals.filter(j=>j.status==='posted').map(j=>({
    entry_no:j.entry_no,currency:'USD',received:j.journal_lines.filter(l=>l.currency_code==='USD'&&(l.accounts?.id===remaining?.id||l.accounts?.code==='3026')).reduce((n,l)=>n+Number(l.credit),0),debited:0,used:0
   }))});
   const usd=review.rows.get('USD');
   if(usd?.basis!=='Report entries'||usd.received!==Math.round(received*100))
    throw Error('Review the owner-funded receipts and spending before preparing their equity allocation.');
   used=usd.used/100;
  }else used=usage(d,received);
  const pairs=[],notes=[];let classified=0,carryingValue=0,valuedAmount=0;
  function pair(label,amount,debit,credit,roles,rate){
   pairs.push({label,amount:round(amount),currency:'USD',debitCode:debit?.code||'',creditCode:credit?.code||'',debitId:debit?.id||'',creditId:credit?.id||'',roles,rate});
  }
  for(const g of groups){
   if(!g.reference){
    pair('Funding received',g.amount,receivingAccount(g.destination),remaining,['asset','remaining']);
    continue;
   }
   const entry=journals.find(j=>j.entry_no===g.reference&&j.status==='posted');
   if(!entry)throw Error('Check receipt reference '+g.reference+'. A posted journal must be verified before preparing its funding.');
   const lines=entry.journal_lines.filter(l=>l.currency_code==='USD');
   const credits=lines.filter(l=>Number(l.credit)>0&&((remaining&&l.accounts?.id===remaining.id)||l.accounts?.code==='3026'));
   if(!credits.length||round(credits.reduce((s,l)=>s+Number(l.credit),0))!==round(g.amount))
    throw Error('The USD support credit in '+g.reference+' does not match this receipt. Review the funding reference and amount.');
   for(const l of credits){
    const amount=Number(l.credit),rate=Number(l.book_rate_lak||l.fx_rate_lak)||null;
    if(rate){carryingValue+=amount*rate;valuedAmount+=amount;}
    if(l.accounts.code==='3026'){
     const prior=AccountingStore.accounts.find(a=>a.id===l.accounts.id&&regular(a,'EQUITY'));
     if(!prior)throw Error('Refresh the chart to load the original support account from '+g.reference+'.');
     pair('Funding received · reclassify '+g.reference,amount,prior,remaining,['original','remaining'],rate);
    }
   }
   const usedCredit=lines.filter(l=>usedAccount&&l.accounts?.id===usedAccount.id).reduce((s,l)=>s+Number(l.credit),0);
   const remainingDebit=lines.filter(l=>remaining&&l.accounts?.id===remaining.id).reduce((s,l)=>s+Number(l.debit),0);
   if(round(usedCredit)!==round(remainingDebit))throw Error('Review the existing support allocation in '+g.reference+'.');
   classified+=usedCredit;
   notes.push('Receipt already posted in '+g.reference+'.');
  }
  const toClassify=round(used-classified);
  if(toClassify<0)throw Error('The referenced journals already classify more USD as used than this report shows.');
  if(toClassify>0)pair('Fund used',toClassify,remaining,usedAccount,['remaining','used'],round(valuedAmount)===received?carryingValue/valuedAmount:null);
  if(!pairs.length)throw Error('The referenced journal already records the full support allocation for this report.');
  const missing=['remaining','used'].filter(role=>pairs.some(p=>p.roles.includes(role))&&!equity(role)).map(role=>roleName[role]);
  const notice=['USD support · $'+formatAppNumber(received)+' received · $'+formatAppNumber(used)+' used · $'+formatAppNumber(round(received-used))+' remaining.',...notes];
  if(missing.length)notice.push('Required in the Chart of Accounts: '+missing.join(' and ')+'.');
  return {pairs,notice:notice.join(' ')};
 }
 function validate(pair,lines){
  return pair.roles.every((role,i)=>{
   const id=lines[i].account_id;
   if(role==='asset')return regular(AccountingStore.accounts.find(a=>a.id===id),'ASSET');
   if(role==='original')return id===pair.debitId;
   return id===equity(role)?.id;
  });
 }
 return {groups,evidence,plan,validate};
})();
