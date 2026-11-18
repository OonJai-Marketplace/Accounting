/* Prepare owner support in its actual currencies; the journal editor owns posting. */
window.BudgetSupportEquity=(()=>{
 'use strict';
 const cents=n=>Math.round(Number(n||0)*100),money=n=>cents(n)/100;
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const refs=s=>[...new Set(String(s||'').toUpperCase().match(/\bOJM\d{6}(?:-\d+)?\b/g)||[])];
 const codes={remaining:{LAK:'3023',USD:'3028',THB:'3020-02'},used:{LAK:'3024',USD:'3029',THB:'3020-03'},original:{LAK:'3027',USD:'3026',THB:'3020-01'}};
 const bridges=new Set(['9010','9011','9012','9021','9022']);
 const regular=(a,type,c)=>a?.currency===c&&a.isActive!==false&&a.is_active!==false&&a.isPosting!==false&&!a.isTechnical&&a.type===type&&(!a.purpose||a.purpose==='regular');
 function equity(role,c){
  const found=AccountingStore.accounts.filter(a=>regular(a,'EQUITY',c)&&a.code===codes[role]?.[c]);
  if(found.length!==1)throw Error('Refresh the Chart of Accounts: Owner Support '+role+' — '+c+' is required.');
  return found[0];
 }
 function groups(d){
  const list=(d.movements||[]).filter(m=>BudgetReport290.kind(m)==='receipt'&&m.ownerSource!=='other'&&Number(m.inflow)>0),out=new Map();
  for(const m of list){
   const references=refs(m.reference),header=refs(d.receiptReference290);
   if(!references.length&&header.length&&list.length>1)throw Error('Identify the posted journal on each receipt before preparing this report.');
   if(!references.length&&list.length===1)references.push(...header);
   const key=JSON.stringify([references.slice().sort(),m.currency,references.length?'':m.destination290||'']);
   if(!out.has(key))out.set(key,{references,currency:m.currency,destination:m.destination290||'',amount:0});
   out.get(key).amount=money(out.get(key).amount+Number(m.inflow));
  }
  return [...out.values()];
 }
 async function evidence(record){
  const client=ojmDb,owner=liveProfile?.id;
  const {data,error}=await client.rpc('budget_utilization_evidence478',{p_report:record.id,p_version:record.version});
  if(client!==ojmDb||owner!==liveProfile?.id)throw Error('The account changed. Reopen the report.');
  if(error||!Array.isArray(data?.journals)||!/^[a-f0-9]{32}$/.test(data?.fingerprint||''))throw Error('Could not verify the saved report and its journals. '+(error?.message||'Refresh and try again.'));
  return data;
 }
 const code=l=>l.accounts?.code;
 const sameRate=(a,b)=>Number(a.fx_rate_lak||0)===Number(b.fx_rate_lak||0)&&Number(a.book_rate_lak||0)===Number(b.book_rate_lak||0);
 const rateOf=l=>({rate:Number(l.fx_rate_lak)||null,bookRate:Number(l.book_rate_lak||l.fx_rate_lak)||null});
 const flowKey=(a,c,r)=>JSON.stringify([a,c,r.rate,r.bookRate]);
 function flows(j){
  const out={received:new Map(),used:new Map(),exchanges:[],paired:new Set()},ls=j.journal_lines||[];
  const add=(map,k,n)=>map.set(k,(map.get(k)||0)+cents(n));
  for(const l of ls){
   const c=l.currency_code;
   if(code(l)===codes.used[c])add(out.used,c,Number(l.credit)-Number(l.debit));
   if(code(l)!==codes.remaining[c])continue;
   const other=ls.find(b=>b!==l&&!out.paired.has(b)&&b.currency_code===c&&
    (bridges.has(code(b))||code(b)===codes.used[c])&&sameRate(l,b)&&b.line_date===l.line_date&&
    cents(l.debit)===cents(b.credit)&&cents(l.credit)===cents(b.debit));
   if(other){
    out.paired.add(l);out.paired.add(other);
    if(bridges.has(code(other)))out.exchanges.push({code:code(other),currency:c,amount:Number(l.debit||l.credit),out:!!Number(l.debit),...rateOf(l)});
   }else if(Number(l.credit))add(out.received,c,l.credit);
   else if(Number(l.debit))throw Error('Review the unmatched Remaining debit in '+j.entry_no+' before preparing another allocation.');
  }
  if(ls.some(l=>code(l)===codes.used[l.currency_code]&&(Number(l.debit)||Number(l.credit))&&!out.paired.has(l)))throw Error('Review the unmatched Used allocation in '+j.entry_no+' before preparing another journal.');
  return out;
 }
 function receivingAccount(destination,c){
  const matched=typeof getSelectedAccountInfo==='function'?getSelectedAccountInfo(destination):null;
  if(matched&&regular(matched,'ASSET',c))return matched;
  const text=norm(destination);
  const found=AccountingStore.accounts.filter(a=>regular(a,'ASSET',c)&&text&&
   (norm(a.name)===text||norm(a.name).replace(new RegExp(' '+c.toLowerCase()+'$'),'')===text||a.code===destination));
  return found.length===1?found[0]:null;
 }
 function plan(d,receiptGroups=groups(d),evidence=[]){
  const journals=Array.isArray(evidence)?evidence:evidence.journals;
  const posted=new Map(journals.filter(j=>j.status==='posted').map(j=>[j.entry_no,j]));
  const summaries=new Map([...posted].map(([ref,j])=>[ref,flows(j)]));
  const pairs=[],notes=[],totals=new Map(),claimed=new Set(),basis=new Map();
  const get=c=>{if(!totals.has(c))totals.set(c,{received:0,used:0,exchangedIn:0,exchangedOut:0});return totals.get(c);};
  const pair=(label,c,amount,debit,credit,roles,r={},fixed=false)=>{
   if(cents(amount)<=0)return;
   pairs.push({label,currency:c,amount:money(amount),debitCode:debit?.code||'',creditCode:credit?.code||'',debitId:debit?.id||'',creditId:credit?.id||'',roles,rate:c==='LAK'?1:r.rate||null,bookRate:c==='LAK'?1:r.bookRate||r.rate||null,fixed});
  };
  const carrying=(c,amount,l)=>{const r=Number(l.book_rate_lak||l.fx_rate_lak);if(r>0){const b=basis.get(c)||{amount:0,value:0};b.amount+=amount;b.value+=amount*r;basis.set(c,b);}};
  for(const g of receiptGroups){
   const c=g.currency,remaining=equity('remaining',c);get(c).received+=cents(g.amount);
   if(!g.references.length){pair('Funding received',c,g.amount,receivingAccount(g.destination,c),remaining,['asset','remaining']);continue;}
   let received=0;
   for(const ref of g.references){
    const j=posted.get(ref),key=ref+':'+c;
    if(!j||claimed.has(key))throw Error('Check the receipt reference '+ref+': it must identify one posted receipt, counted once.');
    claimed.add(key);
    const current=summaries.get(ref).received.get(c)||0;
    const old=j.journal_lines.filter(l=>l.currency_code===c&&code(l)===codes.original[c]&&Number(l.credit)>0);
    received+=current+old.reduce((n,l)=>n+cents(l.credit),0);
    for(const l of j.journal_lines.filter(l=>l.currency_code===c&&code(l)===remaining.code&&!summaries.get(ref).paired.has(l)&&Number(l.credit)>0))carrying(c,Number(l.credit),l);
    for(const l of old){carrying(c,Number(l.credit),l);pair('Reclassify posted support · '+ref,c,l.credit,equity('original',c),remaining,['original','remaining'],rateOf(l),true);}
    notes.push('Receipt already posted in '+ref+'.');
   }
   if(received!==cents(g.amount))throw Error('The '+c+' receipt in '+g.references.join(' / ')+' does not match this saved report.');
  }
  const spends=(d.movements||[]).filter(m=>BudgetReport290.kind(m)==='spend');
  const explicit=spends.some(m=>m.ownerAmount!=null&&m.ownerAmount!=='');
  if(explicit&&spends.some(m=>m.ownerAmount==null||m.ownerAmount===''))throw Error('Complete the owner-funded share on each spending row, including zero for other funding.');
  if(!explicit&&(d.movements||[]).some(m=>BudgetReport290.kind(m)==='receipt'&&m.ownerSource==='other'))throw Error('Enter the owner-funded share for spending paid from mixed funding sources.');
  for(const m of spends){
   if(explicit)BudgetOwnerBalance.validateShare(m);
   const c=explicit?m.ownerCurrency:m.currency,n=explicit?Number(m.ownerAmount):BudgetReport290.expenseAmount(m);
   get(c).used+=cents(n);
  }
  if(!explicit)for(const m of d.movements||[])if(BudgetReport290.kind(m)==='coverage')get(m.currency).used-=cents(m.inflow);
  // Group split slips from the same posted conversion before matching the bridge.
  const fxGroups=new Map();
  for(const f of d.conversions||[]){
   const references=refs(f.evidence);
   if(references.length!==1)throw Error('Link each currency exchange to its posted journal before preparing owner support.');
   if(f.currency===f.target)throw Error('Choose two different exchange currencies.');
   const key=JSON.stringify([references[0],f.currency,f.target]);
   if(!fxGroups.has(key))fxGroups.set(key,{ref:references[0],from:f.currency,to:f.target,out:0,in:0});
   const g=fxGroups.get(key);g.out+=cents(f.amount);g.in+=cents(BudgetReport290.conversionAmount(f));
  }
  const expected=new Map(),already=new Map();
  const addFlow=(map,x)=>{const k=flowKey(x.code,x.currency,x)+':'+x.out;const v=map.get(k)||{...x,amount:0,refs:[]};v.amount+=cents(x.amount);if(x.ref)v.refs.push(x.ref);map.set(k,v);};
  for(const [ref,s] of summaries)for(const x of s.exchanges)addFlow(already,{...x,ref});
  function bankBridge(j,c,n,side){
   const s=summaries.get(j.entry_no),ls=j.journal_lines.filter(l=>l.currency_code===c&&bridges.has(code(l))&&!s.paired.has(l));
   const candidates=ls.filter(l=>cents(l[side])===n&&!/valuation|technical|carrying|book.rate|historical|exchange gain|exchange loss|rounding/i.test(l.description||''));
   const unique=new Map(candidates.map(l=>[flowKey(code(l),c,rateOf(l)),l]));
   if(unique.size!==1)throw Error('Check the '+c+' exchange amount and original bridge in '+j.entry_no+'. No second bank movement will be prepared.');
   const l=[...unique.values()][0];return {...rateOf(l),code:code(l),currency:c};
  }
  for(const g of fxGroups.values()){
   const j=posted.get(g.ref);if(!j||g.out<=0||g.in<=0)throw Error('Verify the posted currency exchange '+g.ref+'.');
   const source=bankBridge(j,g.from,g.out,'debit'),target=bankBridge(j,g.to,g.in,'credit');
   addFlow(expected,{...source,amount:g.out/100,out:true,ref:g.ref});
   addFlow(expected,{...target,amount:g.in/100,out:false,ref:g.ref});
   get(g.from).exchangedOut+=g.out;get(g.to).exchangedIn+=g.in;
   carrying(g.to,g.in/100,{book_rate_lak:target.bookRate});
  }
  for(const [k,v] of already)if(v.amount>(expected.get(k)?.amount||0))throw Error('The referenced journals contain an exchange allocation not matched by this report. Review its saved exchange references.');
  for(const [k,x] of expected){
   const n=(x.amount-(already.get(k)?.amount||0))/100;
   const bridge=AccountingStore.accounts.find(a=>a.code===x.code&&a.currency===x.currency&&a.isPosting!==false);
   if(!bridge)throw Error('Refresh the chart to load the original FX bridge '+x.code+'.');
   const remaining=equity('remaining',x.currency),label='Currency transfer '+(x.out?'out':'in')+' · '+[...new Set(x.refs)].join(' / ');
   pair(label,x.currency,n,x.out?remaining:bridge,x.out?bridge:remaining,x.out?['remaining','bridge']:['bridge','remaining'],x,true);
  }
  for(const [c,t] of totals){
   if(t.used<0)throw Error('Company coverage exceeds '+c+' spending. Review the owner-funded share.');
   const used=[...summaries.values()].reduce((n,s)=>n+(s.used.get(c)||0),0),left=t.used-used;
   if(left<0)throw Error('The referenced journals already allocate more '+c+' as Used than this report. Correct the existing allocation before posting another.');
   const b=basis.get(c),r=b?.amount?b.value/b.amount:null;
   pair('Fund used',c,left/100,equity('remaining',c),equity('used',c),['remaining','used'],{rate:r,bookRate:r});
  }
  if(!pairs.length)throw Error('The referenced journals already record this report’s full owner-support allocation.');
  const summary=[...totals].map(([c,t])=>c+' '+formatAppNumber(t.received/100)+' received · '+formatAppNumber(t.used/100)+' used · '+formatAppNumber((t.received+t.exchangedIn-t.exchangedOut-t.used)/100)+' remaining');
  return {pairs,notice:[...summary,...notes].join(' '),fingerprint:evidence.fingerprint||null};
 }
 function validate(pair,lines){
  if(lines.length!==2||lines.some(l=>l.currency_code!==pair.currency))return false;
  if(!(Number(lines[0].debit)>0)||Number(lines[0].credit)||!(Number(lines[1].credit)>0)||Number(lines[1].debit)||cents(lines[0].debit)!==cents(lines[1].credit))return false;
  if(pair.fixed&&(cents(lines[0].debit)!==cents(pair.amount)||lines.some(l=>pair.rate&&Number(l.fx_rate_lak)!==pair.rate||pair.bookRate&&Number(l.book_rate_lak||l.fx_rate_lak)!==pair.bookRate)))return false;
  return pair.roles.every((role,i)=>{
   const a=AccountingStore.accounts.find(a=>a.id===lines[i].account_id);
   if(role==='asset')return regular(a,'ASSET',pair.currency);
   if(role==='bridge'||role==='original')return a?.id===(i?pair.creditId:pair.debitId);
   return a?.id===equity(role,pair.currency).id;
  });
 }
 return {groups,evidence,plan,validate};
})();
