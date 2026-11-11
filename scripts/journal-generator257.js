/* Template journal completion. No posting, IDs, inferred taxes or balancing plugs. */
((root)=>{'use strict';
const currency=a=>a?.currency||a?.currency_code;
const type=a=>String(a?.baseType||a?.account_type||a?.type||'').toUpperCase();
const technical=a=>!!(a?.isTechnical||a?.is_technical||a?.type==='SYSTEM');
const available=a=>a?.id&&a.isPosting!==false&&a.is_posting!==false&&a.active!==false&&a.is_active!==false&&/^[A-Z]{3}$/.test(currency(a)||'')&&currency(a)!=='NA';
const fund=a=>available(a)&&type(a)==='ASSET'&&!technical(a)&&/^10\d{2}$/.test(String(a.code))&&String(a.code)!=='1099';
const staff=a=>/^12[12]\d$/.test(String(a.code));
const monetary=a=>fund(a)||staff(a)||type(a)==='LIABILITY'||/^11\d\d$/.test(String(a.code));
const decimalMoney = new Intl.NumberFormat('en-US', {useGrouping:false, maximumFractionDigits:2});
const round=n=>{if(!Number.isFinite(n)||Math.abs(n)>9e12)throw Error('An amount is too large to calculate safely.');return Number(decimalMoney.format(n));};
const displayRate=n=>typeof formatAppRate==='function'?formatAppRate(n):Number(n).toLocaleString('en-US',{maximumFractionDigits:2});
const close=(a,b)=>Math.abs(a-b)<.005;
const known={9101:['4010','9190','THB'],9102:['4010','9190','USD'],9111:['4110','9190','USD'],9112:['4110','9190','THB'],9121:['4120','9190','USD'],9131:['4130','9190','USD'],9132:['4130','9190','THB'],9201:['5010','9290','THB'],9202:['5010','9290','USD'],9211:['5111','9290','USD'],9212:['5111','9290','THB'],9222:['5119','9290','THB'],9231:['5311','9290','USD'],9232:['5311','9290','THB'],9233:['5315','9290','USD'],9234:['5315','9290','THB'],9241:['5414','9290','USD'],9242:['5414','9290','THB'],9251:['5120','9290','USD'],9311:['3023','9390','USD'],9312:['3023','9390','THB'],9321:['3024','9390','USD'],9322:['3024','9390','THB'],9331:['3031','9390','USD'],9332:['3031','9390','THB'],9411:['1310','9490','USD']};
function registry(chart){
 const all=chart.filter(available),byCode=(code,c='LAK')=>all.find(a=>String(a.code)===code&&currency(a)===c),maps=new Map(),unknown=new Set();
 const codes=[...new Set(all.map(currency))];
 const stem=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/\b(mapping|system)\b/g,'').replace(new RegExp('\\b('+codes.join('|')+')\\b','gi'),'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 for(const a of all.filter(a=>currency(a)!=='LAK'&&technical(a))){
  const k=known[a.code];if(k&&k[2]===currency(a)){maps.set(a.id,{actual:byCode(k[0]),offset:byCode(k[1]),actualCode:k[0],offsetCode:k[1]});continue;}
  // A new currency uses its existing chart mapping and an exact, unique category
  // name. Never invent an account, substitute another currency or use a wildcard.
  const family=String(a.code).slice(0,2),offset={91:'9190',92:'9290',93:'9390',94:'9490'}[family];
  if(!offset)continue;
  if(/^934|^935/.test(a.code)){unknown.add(a.id);continue;}
  const matches=all.filter(b=>currency(b)==='LAK'&&!technical(b)&&stem(a.name)===stem(b.name));
  if(matches.length===1)maps.set(a.id,{actual:matches[0],offset:byCode(offset),actualCode:String(matches[0].code),offsetCode:offset});else unknown.add(a.id);
 }
 function bridge(c,tax=false){
  if(c==='LAK')return byCode(tax?'9041':'9010');
  const code=tax?{USD:'9042'}[c]:{USD:'9011',THB:'9012'}[c];if(code&&byCode(code,c))return byCode(code,c);
  const found=all.filter(a=>currency(a)===c&&technical(a)&&(tax?/payroll tax bridge/i:/fx exchange bridge/i).test(a.name));return found.length===1?found[0]:null;
 }
 return {all,maps,unknown,byCode,bridge,isBridge:a=>currency(a)!=='LAK'&&bridge(currency(a))?.id===a.id,isTax:a=>currency(a)!=='LAK'&&bridge(currency(a),true)?.id===a.id};
}
function complete(input){
 if(!input.rows?.some(l=>l.stage))return completePart(input);
 const stages=new Map(),balances=Object.fromEntries(Object.entries(input.balances||{}).map(([id,b])=>[id,{...b}]));
 const rows=[],notes=[],totals={};
 for(const [index,line] of input.rows.entries()){
  const stage=line.stage||'Additional lines';
  if(!stages.has(stage))stages.set(stage,[]);
  stages.get(stage).push({index,line});
 }
 const ordered=[...stages].sort(([a],[b])=>Number(b==='Receipt')-Number(a==='Receipt'));
 for(const [stage,items] of ordered){
  const result=completePart({...input,balances,rows:items.map(x=>x.line)});
  if(result.errors.length)return {errors:result.errors.map(e=>({...e,row:items[e.row]?.index,message:stage+' · '+e.message.replace(/^Row \d+: /,'')}))};
  if(stage==='Exchange'&&stages.has('Receipt')){
   const receipt=rows.find(l=>l.stage==='Receipt'&&fund(input.chart.find(a=>a.id===l.account_id))&&l.debit);
   const paid=result.rows.filter(l=>fund(input.chart.find(a=>a.id===l.account_id))&&l.credit);
   if(!receipt||paid.length!==1||paid[0].account_id!==receipt.account_id||paid[0].credit>receipt.debit)
    return {errors:[{message:'Exchange the support from its receiving fund, up to the amount received.'}]};
  }
  for(const l of result.rows){
   rows.push({...l,stage});
   const b=balances[l.account_id],a=input.chart.find(a=>a.id===l.account_id);
   if(b&&fund(a)&&currency(a)!=='LAK'){
    const n=l.debit-l.credit,newQuantity=round(b.quantity+n);
    const value=b.quantity*(b.rate||0)+n*(l.book_rate_lak||l.fx_rate_lak);
    b.rate=newQuantity&&(!b.quantity||b.rate)?value/newQuantity:0;b.quantity=newQuantity;
   }
  }
  Object.assign(totals,result.totals);notes.push(...result.notes);
 }
 return {errors:[],rows,notes,totals};
}
function completePart(input){
 const reg=registry(input.chart||[]),errors=[],notes=[],expected=[],rates=input.rates||{},balances=input.balances||{};
 const error=(message,row,needsBook=false)=>errors.push({message,row,needsBook});
 const signed=l=>round(l.debit-l.credit),sum=ls=>round(ls.reduce((n,l)=>n+signed(l),0));
 const rows=(input.rows||[]).map((l,i)=>({...l,index:i,debit:Number(l.debit??0),credit:Number(l.credit??0),a:reg.all.find(a=>String(a.id)===String(l.account_id))}));
 function add(a,n,memo,fx=1,book=null){n=round(n);if(!n)return;if(!a){error('A required mapping or bridge account is missing from the chart.');return;}expected.push({account_id:a.id,debit:n>0?n:0,credit:n<0?-n:0,line_memo:memo,autoMemo:true,fx_rate_lak:fx,book_rate_lak:book,generated:'output'});}
 for(const l of rows){
  if(!l.a){if(l.account_id||l.debit||l.credit)error('Choose a valid account on row '+(l.index+1)+'.',l.index);continue;}
  if([l.debit,l.credit].some(v=>!Number.isFinite(v)||v<0||Math.abs(v-round(v))>1e-8)||l.debit>0&&l.credit>0)error('Row '+(l.index+1)+' needs one nonnegative debit or credit with at most two decimals.',l.index);
  if(l.book_rate_lak!==''&&l.book_rate_lak!=null&&Number(l.book_rate_lak)!==0&&!(Number(l.book_rate_lak)>0))error('Row '+(l.index+1)+' needs a positive book rate.',l.index,true);
  l.c=currency(l.a);l.rt=l.c==='LAK'?1:Number(l.fx_rate_lak||rates[l.c]);l.specified=l.autoBook?null:Number(l.book_rate_lak)||null;
  if(l.generated){l.debit=0;l.credit=0;}
 }
 if(errors.length)return {errors};
 const source=rows.filter(l=>l.a&&l.generated!=='output'&&!reg.isBridge(l.a));
 const foreign=source.filter(l=>l.c!=='LAK');
 // A full bank deposit via a custodian is one receipt with two movements.
 // Only this explicitly selected layout equates the four amounts.
 const receipt=source.filter(l=>l.receiptLeg);
 if(receipt.length){
  const leg=key=>receipt.find(l=>l.receiptLeg===key);
  if(receipt.length!==4||!['receive','equity','deposit','clear'].every(leg)||leg('receive').account_id!==leg('clear').account_id)
   error('The receipt and handover must identify the same staff clearing account.');
  else if(!staff(leg('receive').a)||!fund(leg('deposit').a)||reg.maps.get(leg('equity').a.id)?.actualCode!=='3023'||new Set(receipt.map(l=>l.c)).size!==1)
   error('Choose the staff clearing, remaining owner support and receiving fund in the same currency.');
  else{
   const amounts=new Set(receipt.map(l=>l.debit||l.credit).filter(Boolean));
   if(amounts.size!==1)error('Enter the support amount. A full deposit must equal the amount received.');
   else for(const l of receipt){
    const side=['receive','deposit'].includes(l.receiptLeg)?'debit':'credit';
    if(l[side==='debit'?'credit':'debit'])error('Check the side of this support movement.',l.index);
    else if(!l[side]){l[side]=[...amounts][0];l.generated='source';}
   }
  }
  if(new Set(receipt.map(l=>l.rt)).size>1)error('A full same-currency handover uses the receipt valuation. Review the receipt and deposit rates.');
  const fee=source.find(l=>l.c==='LAK'&&String(l.a.code)==='5414'&&l.debit),payer=source.find(l=>l.role==='payer');
  if(fee&&payer&&!payer.credit&&!payer.debit){payer.credit=fee.debit;payer.generated='source';}
  if(payer&&(!fee||payer.credit!==fee.debit))error('Enter the separate LAK fee and its paying account.',payer.index);
 }
 if(errors.length)return {errors};
 // For a LAK remittance, total PIT and SSO separately. The payable debit
 // clears the recorded liability; only the extra cash is a rounding expense.
 const taxCode=l=>['2111','2112'].includes(String(l.a.code));
 const liabilities=source.filter(l=>taxCode(l)&&type(l.a)==='LIABILITY'&&l.debit>0);
 const payingFunds=source.filter(l=>fund(l.a)&&!l.debit);
 const roundingLines=source.filter(l=>String(l.a.code)==='5420');
 const remittance=!foreign.length && liabilities.length && payingFunds.length===1 &&
  source.length===liabilities.length+payingFunds.length+roundingLines.length;
 if(remittance){
  const assessed=new Map();
  for(const l of liabilities){
   const code=String(l.a.code);
   assessed.set(code,(assessed.get(code)||0)+Math.round(l.debit*100));
  }
  let payment=0, extraCents=0;
  for(const cents of assessed.values()){
   const kip=Math.ceil(cents/100);
   payment+=kip;
   extraCents+=kip*100-cents;
  }
  const bank=payingFunds[0];
  if(bank.credit && bank.credit!==payment)error('The whole-kip PIT / SSO payment totals '+payment+' LAK. Review the payable debits and bank credit.',bank.index);
  else if(!bank.credit){bank.credit=payment;bank.generated='source';}
  if(roundingLines.length){
   if(roundingLines.length!==1 || roundingLines[0].credit || roundingLines[0].debit!==extraCents/100)
    error('The statutory payment rounding debit must equal '+(extraCents/100)+' LAK.');
  }else if(extraCents){
   const expense=reg.byCode('5420');
   if(!expense || type(expense)!=='EXPENSE')error('Choose the LAK rounding expense account 5420 before generating the payment.');
   else add(expense,extraCents/100,'Whole-kip statutory payment rounding');
  }
  if(errors.length)return {errors};
 }
 // A local journal can fill one explicitly chosen counterpart. More than one
 // missing business amount remains ambiguous and must be entered by the user.
 if(!foreign.length){const blanks=source.filter(l=>!l.debit&&!l.credit&&!technical(l.a)&&String(l.a.code)!=='5419'),gap=sum(source);if(gap&&blanks.length===1){const l=blanks[0];l.debit=gap<0?-gap:0;l.credit=gap>0?gap:0;l.generated='source';notes.push('Filled row '+(l.index+1)+'.');}}
 // A documented exchange against kip supplies its own rate. A receipt
 // valuation in the same journal can legitimately be different.
 const transactionLines=source.filter(l=>l.debit||l.credit);
 const exchangeFunds=transactionLines.filter(l=>fund(l.a));
 const localLegs=exchangeFunds.filter(l=>l.c==='LAK'),foreignLegs=exchangeFunds.filter(l=>l.c!=='LAK');
 const rounding=transactionLines.filter(l=>l.c==='LAK'&&String(l.a.code)==='5420');
 if(localLegs.length===1&&foreignLegs.length===1&&exchangeFunds.length+rounding.length===transactionLines.length){
  const l=foreignLegs[0],kip=round(signed(localLegs[0])+sum(rounding));
  if(kip*signed(l)<0){
   if(l.overrideRate&&Math.abs(round(Math.abs(signed(l))*l.rt)-Math.abs(kip))>=.005)
    error('The entered exchange rate disagrees with the documented amounts and rounding.',l.index);
   else l.rt=Math.abs(kip/signed(l));
  }
 }
 const cashNeeds=new Map();
 function carry(l){
  const b=balances[l.a.id];
  if(l.specified>0)return l.specified;
  if(fund(l.a)&&b?.rate>0)return b.rate;
  if(b?.rate>0&&l.debit>0&&b.quantity<0&&l.debit<=-b.quantity+.005&&
     (staff(l.a)||l.role==='balance'&&type(l.a)==='LIABILITY'))return b.rate;
  if(!fund(l.a)&&b?.rate>0&&(b.uniform||close(Math.abs(b.quantity),Math.abs(signed(l)))))return b.rate;
  error('Row '+(l.index+1)+': enter the recorded book rate of the balance being cleared.',l.index,true);return null;
 }
 for(const c of new Set(foreign.map(l=>l.c))){
  const group=foreign.filter(l=>l.c===c),active=group.filter(l=>l.debit||l.credit),blank=group.filter(l=>!l.debit&&!l.credit);
  if(!active.length)continue;
  if(!group.some(l=>reg.maps.has(l.a.id))&&active.length===1&&fund(active[0].a)){
   const payment=active[0],matches=[...reg.maps.entries()].filter(([id,m])=>currency(reg.all.find(a=>a.id===id))===c&&m.actual&&source.some(l=>l.a.id===m.actual.id&&(!l.debit&&!l.credit||Math.sign(signed(l))===-Math.sign(signed(payment))&&close(Math.abs(signed(l)),round(Math.abs(signed(payment))*payment.rt)))));
   if(matches.length===1){const [id]=matches[0],a=reg.all.find(a=>a.id===id),l={a,c,account_id:id,index:rows.length,rt:payment.rt,debit:payment.credit,credit:payment.debit,line_memo:'Foreign mapping · '+a.name,generated:'source'};rows.push(l);source.push(l);foreign.push(l);active.push(l);}
  }
  const gap=sum(active);
  // One selected empty counterpart is arithmetically determined. Multiple
  // missing business amounts, tax allocations or accounts are never guessed.
  const eligibleBlank=blank.filter(l=>!reg.isTax(l.a));
  if(gap&&eligibleBlank.length===1){const l=eligibleBlank[0];l.debit=gap<0?-gap:0;l.credit=gap>0?gap:0;l.generated='source';active.push(l);notes.push('Filled row '+(l.index+1)+'.');}
  const prepaidRelease=active.filter(l=>l.credit>0&&type(l.a)==='ASSET'&&!fund(l.a)&&!monetary(l.a)&&!technical(l.a));
  if(prepaidRelease.length===1&&active.length===2&&active.filter(l=>reg.maps.has(l.a.id)).length===1){const recorded=carry(prepaidRelease[0]);if(recorded>0)for(const l of active)l.rt=recorded;}
  for(const l of active){if(!Number.isFinite(l.rt)||!(l.rt>0))error('Enter the '+c+' exchange rate above the table.',l.index);if(reg.unknown.has(l.a.id)||technical(l.a)&&!reg.maps.has(l.a.id)&&!reg.isTax(l.a))error('Row '+(l.index+1)+': this mapping has no supported LAK counterpart in the chart.',l.index);}
  if(errors.length)continue;
  const maps=active.filter(l=>reg.maps.has(l.a.id)),tax=active.filter(l=>reg.isTax(l.a));
  const newSupport=maps.some(l=>reg.maps.get(l.a.id).actualCode==='3023'&&l.credit>0);
  // Staff may receive funds on behalf of the company and deposit the same
  // funds. This line creates a new balance at receipt value, not a settlement
  // of an older payroll liability. Require a matching support receipt amount.
  const custody=new Set();
  if(newSupport){
   const receipts=active.filter(l=>reg.maps.get(l.a.id)?.actualCode==='3023'&&l.credit);
   const staffReceipts=active.filter(l=>staff(l.a)&&l.debit);
   if(staffReceipts.length===1&&receipts.length===1&&close(staffReceipts[0].debit,receipts[0].credit)){
    const incoming=staffReceipts[0];custody.add(incoming);
    for(const handover of active.filter(l=>l.a.id===incoming.a.id&&l.credit>0&&l.credit<=incoming.debit))custody.add(handover);
   }
  }
  if(maps.length&&sum(active)>0&&!tax.length){
   const withholding=round(source.filter(l=>l.c==='LAK'&&['2111','2112'].includes(String(l.a.code))).reduce((n,l)=>n+l.credit-l.debit,0)-source.filter(l=>l.c==='LAK'&&['5211','5212'].includes(String(l.a.code))).reduce((n,l)=>n+l.debit-l.credit,0));
   const used=foreign.filter(l=>l.c!==c&&reg.isTax(l.a)).reduce((n,l)=>n+round(l.credit*l.rt),0),q=sum(active);
   const selectedTax=blank.filter(l=>reg.isTax(l.a)),blankLiability=rows.filter(l=>l.a&&l.c==='LAK'&&['2111','2112'].includes(String(l.a.code))&&!l.debit&&!l.credit);
   if(withholding>0&&close(withholding-used,round(q*Number(rates[c])))||!withholding&&selectedTax.length===1&&blankLiability.length===1){
    const a=reg.bridge(c,true);if(!a)error('The '+c+' payroll withholding bridge is missing from the chart.');
    else{let l=blank.find(l=>l.a.id===a.id);if(!l){l={a,c,account_id:a.id,index:rows.length,rt:Number(rates[c]),line_memo:'Employee withholding',debit:0,credit:0};rows.push(l);source.push(l);foreign.push(l);}l.credit=q;l.generated='source';active.push(l);tax.push(l);}
   }
  }
  if(maps.length&&!close(sum(active),0))error(c+' source rows differ by '+Math.abs(sum(active))+'. Check the gross amount, payment, staff amounts and deductions. This is not automatically FX.',active[0].index);
  // Matched new receipts have one recognition value, including receipts imported
  // from older drafts that stored an account average without its provenance.
  const receiptMap=maps.length===1&&maps[0].credit&&['9190','9390'].includes(reg.maps.get(maps[0].a.id).offsetCode)?maps[0]:null;
  if(receiptMap&&active.every(l=>l===receiptMap||fund(l.a)&&l.debit||custody.has(l))){
   if(active.some(l=>l.rt!==receiptMap.rt))error('Use the same recognition rate for this receipt and its mapping. Record a later settlement separately.');
   if(active.some(l=>l.book_rate_lak&&Number(l.book_rate_lak)!==l.rt))notes.push('Used the receipt rate for the new funds and their mapping.');
  }
  for(const l of active.filter(l=>!reg.maps.has(l.a.id))){
   if(reg.isTax(l.a)){l.book=l.rt;continue;}
   if(custody.has(l)){l.book=l.rt;continue;}
   if(l.credit>0&&fund(l.a)||l.debit>0&&(staff(l.a)||type(l.a)==='LIABILITY')||l.credit>0&&!fund(l.a)&&!staff(l.a)&&type(l.a)==='ASSET')l.book=carry(l);else l.book=l.specified||l.rt;
   // New money and a newly recognized obligation enter at this transaction's rate.
   // A receiving account's existing average belongs to its previous balance.
   if(fund(l.a)&&l.debit||type(l.a)==='LIABILITY'&&l.credit||staff(l.a)&&l.credit&&maps.some(m=>reg.maps.get(m.a.id).actualCode==='5311'))l.book=l.rt;
   if(fund(l.a)&&l.credit>0)cashNeeds.set(l.a.id,(cashNeeds.get(l.a.id)||0)+l.credit);
  }
  const outs=active.filter(l=>fund(l.a)&&l.credit>0),outQ=outs.reduce((n,l)=>n+l.credit,0),outValue=outs.reduce((n,l)=>n+round(l.credit*(l.book||0)),0),otherDr=active.filter(l=>!reg.maps.has(l.a.id)&&!fund(l.a)&&!reg.isTax(l.a)).reduce((n,l)=>n+l.debit,0),mapDr=maps.reduce((n,l)=>n+l.debit,0),cashPart=Math.max(0,Math.min(mapDr,outQ-otherDr));
  const historical=active.filter(l=>l.credit>0&&!fund(l.a)&&!monetary(l.a)&&!technical(l.a));
  for(const l of maps){
   const m=reg.maps.get(l.a.id);if(!m.actual||!m.offset){error('Row '+(l.index+1)+': required LAK accounts '+m.actualCode+' / '+m.offsetCode+' are missing.',l.index);continue;}
   l.book=l.specified||(l.debit>0&&cashPart?(cashPart*(outs.length===1?outs[0].book:outValue/outQ)+(mapDr-cashPart)*l.rt)/mapDr:l.rt);
   if(historical.length){if(historical.length!==1||maps.length!==1){error('Use each historical asset lot and its recorded rate separately.',l.index);continue;}l.book=historical[0].book;l.rt=l.book;}
   const historicalEquity=m.offsetCode==='9390'&&!active.some(x=>fund(x.a))&&!custody.size;
   if(l.credit&&['9190','9390'].includes(m.offsetCode)&&!historicalEquity)l.book=l.rt;
   if(historicalEquity){if(!l.specified){error('Row '+(l.index+1)+': enter the original contribution book rate.',l.index,true);continue;}l.rt=l.book;}
   if(m.offsetCode==='9490'){l.book=l.rt;}
   if(l.book>0){add(m.actual,round(signed(l)*l.rt),l.a.name+' · '+Math.abs(signed(l))+' '+c+' × '+displayRate(l.rt));add(m.offset,-round(signed(l)*l.book),l.a.name+' · recorded foreign value');}
  }
  const reclass=maps.filter(l=>reg.maps.get(l.a.id).offsetCode==='9390');
  if(reclass.length===2&&reclass.some(l=>reg.maps.get(l.a.id).actualCode==='3024')&&reclass[0].book!==reclass[1].book)
   error('Use the same original contribution rate on both sides of the support allocation.');
  for(const l of tax)add(reg.bridge('LAK',true),-round(signed(l)*l.rt),'Payroll withholding · '+Math.abs(signed(l))+' '+c+' × '+displayRate(l.rt));
 }
 const taxValue=round(foreign.filter(l=>reg.isTax(l.a)&&(l.debit||l.credit)).reduce((n,l)=>n-signed(l)*l.rt,0));
 if(taxValue){const liabilities=rows.filter(l=>l.a&&l.c==='LAK'&&['2111','2112'].includes(String(l.a.code))),blank=liabilities.filter(l=>!l.debit&&!l.credit),entered=liabilities.reduce((n,l)=>n+l.credit-l.debit,0),employer=source.filter(l=>l.c==='LAK'&&['5211','5212'].includes(String(l.a.code))).reduce((n,l)=>n+l.debit-l.credit,0);if(blank.length===1&&taxValue+employer-entered>0)add(blank[0].a,-round(taxValue+employer-entered),'Entered employee withholding and employer obligation');else if(!close(entered-employer,taxValue))error('Choose and allocate the PIT / SSO payable amounts. Withholding cannot be assigned to a tax account automatically.');}
 for(const [id,q] of cashNeeds){const b=balances[id];if(b&&Number.isFinite(b.quantity)&&b.quantity<q-.005)error('The recorded '+currency(reg.all.find(a=>a.id===id))+' funds do not cover all entered payments.');}
 if(errors.length)return {errors};
 const active=foreign.filter(l=>l.debit||l.credit),maps=active.filter(l=>reg.maps.has(l.a.id));
 const real=source.filter(l=>!technical(l.a)&&(l.debit||l.credit)),cash=real.filter(l=>fund(l.a)),out=cash.filter(l=>l.credit>0),incoming=cash.filter(l=>l.debit>0),settled=real.filter(l=>!fund(l.a)&&l.debit>0&&(staff(l.a)||type(l.a)==='LIABILITY'));
 const sameTransfer=!maps.length&&real.length===cash.length&&new Set(cash.map(l=>l.c)).size===1;
 if(sameTransfer&&cash.length&&out.some(l=>incoming.some(r=>r.account_id===l.account_id)))error('Choose different paying and receiving accounts for this transfer.');
 if(sameTransfer){if(!close(sum(cash),0))error('Transfer debits and credits must match. Record an actual fee separately.');else{const q=out.reduce((n,l)=>n+l.credit,0),v=out.reduce((n,l)=>n+round(l.credit*(l.book||1)),0);for(const l of incoming)if(l.c!=='LAK')l.book=v/q;}}
 const econ=new Map(active.map(l=>[l,round(signed(l)*(sameTransfer?l.book:l.rt))]));
 const exchangeRounding=real.filter(l=>l.c==='LAK'&&String(l.a.code)==='5420');
 const exchange=!maps.length&&!sameTransfer&&incoming.length&&out.length&&real.length===cash.length+exchangeRounding.length&&new Set(cash.map(l=>l.c)).size>1;
 const roundingValue=sum(exchangeRounding);
 if(exchange){
  const received=round(incoming.reduce((n,l)=>n+l.debit*(l.c==='LAK'?1:l.rt),0)+roundingValue),paid=out.reduce((n,l)=>n+l.credit*(l.c==='LAK'?1:l.rt),0);
  for(const l of out)if(l.c!=='LAK')econ.set(l,-round(received*l.credit*l.rt/paid));
  if((roundingValue||out.some(l=>l.c==='LAK'))&&!close(paid,received))error('The LAK payment and receipt rate disagree. Check the actual exchange rate.');
 }else if(!maps.length&&settled.length&&real.length===out.length+settled.length&&new Set(real.map(l=>l.c)).size>1&&settled.every(l=>l.c!=='LAK')){
  const paid=round(out.reduce((n,l)=>n+l.credit*(l.c==='LAK'?1:l.rt),0)),owed=settled.reduce((n,l)=>n+l.debit*l.rt,0);for(const l of settled)econ.set(l,round(paid*l.debit*l.rt/owed));
 }else if(!maps.length&&real.filter(l=>!fund(l.a)).every(l=>l.c==='LAK'&&l.debit>0)&&out.length&&real.length===out.length+real.filter(l=>!fund(l.a)).length){
  const discharged=round(real.filter(l=>!fund(l.a)).reduce((n,l)=>n+l.debit,0)),paid=out.reduce((n,l)=>n+l.credit*(l.c==='LAK'?1:l.rt),0);for(const l of out)if(l.c!=='LAK')econ.set(l,-round(discharged*l.credit*l.rt/paid));
 }
 if(!maps.length&&new Set(real.map(l=>l.c)).size===1&&!close(sum(active),0))error('The entered foreign debits and credits differ. Correct the business amounts before generating.');
 const bridges=new Map();
 for(const l of active){if(!(l.book>0)){error('Row '+(l.index+1)+' needs a recorded rate.',l.index,true);continue;}const k=[...bridges.keys()].find(k=>bridges.get(k).c===l.c&&Math.abs(bridges.get(k).book-l.book)<1e-8)||l.c+'|'+l.book,b=bridges.get(k)||{c:l.c,book:l.book,rt:l.rt,n:0,value:0};b.n=round(b.n-signed(l));b.value=round(b.value-round(signed(l)*l.book));bridges.set(k,b);l.book_rate_lak=l.book;l.fx_rate_lak=l.rt;l.autoBook=!l.specified;}
 const sameCurrencySettlement=settled.length===1&&settled[0].role==='balance'&&out.length===1&&real.length===2&&
   settled[0].c===out[0].c&&out[0].c!=='LAK'&&settled[0].rt===out[0].rt&&
   !rows.some(l=>l.a&&reg.isBridge(l.a)&&!l.generated&&(l.debit||l.credit));
 let bridgeValue=0;
 if(exchange){
  // Show the exchange itself, then the release of the fund at its carrying
  // value. Netting these before display hides the evidence for realized FX.
  for(const l of cash){
   const n=signed(l),value=l.c==='LAK'?n:econ.get(l),actual=Math.abs(value/n);
   const roundedLeg=roundingValue&&l===incoming.find(x=>x.c==='LAK');
   add(reg.bridge(l.c),-n-(roundedLeg?roundingValue:0),'Currency exchanged · actual proceeds',actual,actual);
   if(l.c!=='LAK'&&!close(value,round(n*l.book))){
    add(reg.bridge(l.c),-n,'Release at recorded carrying value',l.book,l.book);
    add(reg.bridge(l.c),n,'Clear at actual exchange value',actual,actual);
    bridgeValue=round(bridgeValue+value-round(n*l.book));
   }
  }
 }else if(sameCurrencySettlement){
  const staffLine=settled[0],payment=out[0],quantity=payment.credit;
  const difference=round(round(quantity*payment.book)-round(staffLine.debit*staffLine.book));
  if(difference){
   const reference=round(quantity*payment.rt),adjusted=round(reference+difference);
   // At extreme rates the recorded book values provide a positive bridge pair.
   const creditRate=adjusted>0?payment.rt:staffLine.book;
   const debitRate=(round(quantity*creditRate)+difference)/quantity;
   add(reg.bridge(payment.c),quantity,'Foreign settlement · adjusted value',debitRate,debitRate);
   add(reg.bridge(payment.c),-quantity,'Foreign settlement · reference value',creditRate,creditRate);
   bridgeValue=difference;
  }
 }else{
  // Combine same-side exchange-bridge movements using the sum of the actual
  // rounded LAK line values. Original business rows retain their own rates.
  const sides=new Map();
  for(const b of bridges.values()){
   if(!b.n)continue;
   const key=b.c+'|'+Math.sign(b.n),side=sides.get(key)||{c:b.c,n:0,value:0,book:b.book,rt:b.rt};
   side.n=round(side.n+b.n);side.value=round(side.value+b.value);sides.set(key,side);
  }
  for(const b of sides.values()){
   const effective=close(round(b.n*b.book),b.value)?b.book:b.value/b.n;
   add(reg.bridge(b.c),b.n,'Foreign settlement · recorded value',effective,effective);
   bridgeValue=round(bridgeValue+b.value);
  }
 }
 const components=[];
 for(const l of active.filter(l=>!technical(l.a)&&monetary(l.a)&&!(fund(l.a)&&l.debit))){const n=round((econ.get(l)??signed(l)*l.rt)-round(signed(l)*l.book));if(n)components.push({l,n});}
 const net=round(components.reduce((n,x)=>n+x.n,0));
 if(components.length){
  const memo=components.map(({l,n})=>(fund(l.a)?'Cash disposal FX':'Balance settlement FX')+' · '+l.a.name+' · '+Math.abs(n)+' LAK '+(n>0?'loss':'gain')).join(' / ');
  add(reg.byCode('5419'),net,memo);
 }
 if(bridgeValue)add(reg.bridge('LAK'),-bridgeValue,'Exchange / settlement · LAK valuation');
 if(errors.length)return {errors};
 const localRows=source.filter(l=>l.c==='LAK'&&(l.debit||l.credit)),localSeparate=localRows.length>0&&close(sum(localRows),0)&&!localRows.some(l=>technical(l.a)||String(l.a.code)==='5419');
 const buckets=new Map(),used=new Set(),result=rows.map(l=>({...l}));
 for(const e of expected){const a=reg.all.find(a=>a.id===e.account_id),k=e.account_id+'|'+(currency(a)==='LAK'?'':e.book_rate_lak),b=buckets.get(k)||{a,items:[],n:0};b.items.push(e);b.n=round(b.n+e.debit-e.credit);buckets.set(k,b);}
 for(const b of buckets.values()){
  const e=b.items[0],candidates=result.filter(l=>{
   if(l.a?.id!==b.a.id||used.has(l.index))return false;
   if(sameCurrencySettlement&&l.generated==='output')return !l.expectedSide||l.expectedSide===(b.n>0?'debit':'credit');
   const book=Number(l.book_rate_lak||l.specified),matchesRate=currency(b.a)==='LAK'||(book?Math.abs(book-e.book_rate_lak)<1e-8:!signed(l)||Math.sign(signed(l))===Math.sign(b.n));
   return matchesRate&&(l.generated==='output'||currency(b.a)==='LAK'||reg.isBridge(l.a));
  }),manual=candidates.filter(l=>l.generated!=='output'&&(l.debit||l.credit)&&!(localSeparate&&!technical(l.a))),blank=candidates.filter(l=>l.generated==='output'||!l.debit&&!l.credit),entered=sum(manual);
  manual.forEach(l=>used.add(l.index));
  // Keep independently generated components (for example two settlement FX
  // rows) separate across recalculation. A template's single empty total cell
  // remains a total instead of changing shape on the next Generate.
  if(!manual.length&&(!blank.length||blank.every(l=>l.generated==='output'&&!l.aggregate))){
   b.items.forEach((item,i)=>{const l=blank[i];if(l){Object.assign(l,item,{line_memo:l.line_memo&&!l.autoMemo?l.line_memo:item.line_memo,autoMemo:!l.line_memo||!!l.autoMemo});used.add(l.index);}else{result.push({...item,a:b.a,c:currency(b.a),index:result.length});used.add(result.length-1);}});continue;
  }
  if(close(entered,b.n)){for(const l of manual)if(currency(b.a)!=='LAK'){l.book_rate_lak=e.book_rate_lak;l.fx_rate_lak=e.fx_rate_lak;}continue;}
  if(manual.length===1&&(technical(b.a)||String(b.a.code)==='5419')){const l=manual[0];Object.assign(l,e,{debit:b.n>0?b.n:0,credit:b.n<0?-b.n:0,line_memo:l.line_memo&&!l.autoMemo?l.line_memo:e.line_memo,autoMemo:!l.line_memo||!!l.autoMemo,generated:'output',aggregate:true});used.add(l.index);notes.push('Corrected calculated amount on row '+(l.index+1)+'.');continue;}
  if(manual.length){if(!technical(b.a)&&String(b.a.code)!=='5419'&&Math.sign(entered)===Math.sign(b.n)&&Math.abs(entered)>=Math.abs(b.n))continue;error('Existing '+b.a.code+' rows disagree with the required '+Math.abs(b.n)+' '+currency(b.a)+' '+(b.n>0?'debit':'credit')+'. Check the amounts.',manual[0].index);continue;}
  if(blank.length){const l=blank[0];Object.assign(l,e,{debit:b.n>0?b.n:0,credit:b.n<0?-b.n:0,line_memo:l.line_memo&&!l.autoMemo?l.line_memo:e.line_memo,autoMemo:!l.line_memo||!!l.autoMemo,generated:'output',aggregate:true});used.add(l.index);}
  else for(const item of b.items){result.push({...item,a:b.a,c:currency(b.a),index:result.length});used.add(result.length-1);}
 }
 // Extra explicit technical outputs are an error, not silently discarded.
 for(const l of result)if(l.a&&(l.debit||l.credit)&&!l.generated&&(reg.isBridge(l.a)||['9010','9190','9290','9390','9490','9041','5419'].includes(String(l.a.code)))&&!used.has(l.index))error('Row '+(l.index+1)+': this system/FX line is not required by the entered transaction. Clear or correct it.',l.index);
 const final=result.filter(l=>l.generated!=='output'||used.has(l.index));
 const totals={};let base=0;
 for(const l of final){if(!l.a||!l.debit&&!l.credit)continue;const c=currency(l.a),n=signed(l);totals[c]=round((totals[c]||0)+n);const r=c==='LAK'?1:l.book_rate_lak||l.fx_rate_lak||l.rt;if(!(r>0)){error('Row '+(l.index+1)+' needs an exchange rate.',l.index);continue;}base=round(base+round(n*r));}
 for(const [c,n] of Object.entries(totals))if(n)error(c+' remains out of balance by '+Math.abs(n)+'. Check missing business lines or deductions. No balancing FX was invented.');
 if(base)error('Recorded LAK values differ by '+Math.abs(base)+'. Check the existing lines and rates.');
 if(!final.some(l=>l.debit||l.credit))error('Enter the transaction amounts in the template before generating.');
 return errors.length?{errors}:{errors:[],rows:final.map(({a,c,rt,book,index,specified,...l})=>l),notes,totals};
}
root.JournalCompletion258={complete,registry,currency,type,technical,available,fund,staff,monetary};
})(globalThis);

;
/* Chart-backed starters and conservative matching; never changes saved templates. */
((root)=>{'use strict';
const G=()=>root.JournalCompletion258;
const actions={
 '1310':'Prepay company house rent','3010':'Receive an owner capital contribution',
 '3023':'Receive financial support','3024':'Apply financial support to expenses','3031':'Receive cash contributed for airfare',
 '4010':'Record dine-in sales','4019':'Record other sales','4110':'Receive a donation or external support',
 '4120':'Receive a housing contribution','4130':'Receive other income','5010':'Buy food for immediate use',
 '5110':'Pay a utility bill','5111':'Buy kitchen supplies','5113':'Pay for transport','5114':'Pay for cleaning',
 '5115':'Pay for marketing','5116':'Pay for maintenance or repairs','5117':'Pay for an event',
 '5118':'Pay legal or permit fees','5119':'Pay restaurant rent','5120':'Pay an operating expense',
 '5210':'Record VAT expense','5211':'Record employer PIT','5212':'Record employer SSO','5213':'Record profit tax expense',
 '5311':'Record salary expense','5312':'Pay staff permit or legal fees','5313':'Pay for staff training',
 '5315':'Pay employee benefits','5410':'Buy office supplies','5411':'Pay a farm expense',
 '5412':'Pay for vehicle repairs','5413':'Pay for vehicle registration','5414':'Pay a bank fee',
 '5421':'Pay company house rent'
};
function action(a){
 const name=String(a.name||a.code).replace(/\s*[—–-]\s*LAK$/i,'').trim();
 if(/^Sales [—–-] /i.test(name))return 'Record '+name.slice(8)+' sales';
 return actions[a.code]||'Record '+name.charAt(0).toLowerCase()+name.slice(1);
}
function templates(chart){
 const g=G();if(!g)return [];const reg=g.registry(chart),out=[];
 const row=(a,side,memo)=>({code:String(a.code),currency:g.currency(a),memo: memo||a.name,side});
 const slot=(role,currency,side,memo)=>({role,currency,side,memo});
 const calculated=(a,side,memo)=>a?{...row(a,side,memo),calculated:true}:null;
 function add(id,name,lines,autoMatch=true){
  const outputs=[];
  const include=(a,side,memo)=>{const line=calculated(a,side,memo);if(line&&!outputs.some(x=>x.code===line.code&&x.side===line.side))outputs.push(line);};
  for(const line of lines){
   const account=reg.byCode(line.code,line.currency),mapping=reg.maps.get(account?.id);
   if(mapping){
    include(mapping.actual,line.side,'LAK recognition · '+mapping.actual.name);
    include(mapping.offset,line.side==='debit'?'credit':'debit','LAK mapping offset');
   }
   if(account&&reg.isTax(account))include(reg.bridge('LAK',true),'debit','LAK withholding bridge');
  }
  const exchange=id.startsWith('exchange-'),settlement=id.startsWith('settlement-');
  if(settlement){
   for(const c of new Set(lines.map(l=>l.currency).filter(c=>c&&c!=='LAK'))){
    include(reg.bridge(c),'debit','Foreign settlement · debit bridge');
    include(reg.bridge(c),'credit','Foreign settlement · credit bridge');
    include(reg.byCode('5419'),'','Realized FX if carrying values differ');
    include(reg.bridge('LAK'),'','LAK bridge for the realized difference');
   }
  }
  if(exchange){
   for(const c of new Set(lines.map(l=>l.currency).filter(c=>c&&c!=='LAK')))include(reg.bridge(c),'','Exchange or settlement at the evidenced rates');
   if(lines.some(l=>l.currency!=='LAK'))include(reg.bridge('LAK'),'','LAK bridge when required');
  }
  if((exchange||settlement||lines.some(l=>l.role==='fund'&&l.side==='credit'))&&lines.some(l=>l.currency&&l.currency!=='LAK'))include(reg.byCode('5419'),'','Realized FX if carrying and settlement values differ');
  const layout=id.startsWith('support-deposit-fee-')?[...lines.slice(0,4),...outputs,...lines.slice(4)]:[...lines,...outputs];
  out.push({id:'gen268-'+id,name,builtin:true,lines:layout,generalMemo:'',autoMatch});
 }
 for(const [id,m] of reg.maps){
  const a=reg.all.find(a=>a.id===id),c=g.currency(a);if(!m.actual||!m.offset)continue;
  const expense=g.type(m.actual)==='EXPENSE',asset=g.type(m.actual)==='ASSET';
  const name=action(m.actual);
  if(String(m.actual.code)==='5311'){
   add('payroll-'+c,'Accrue salaries · '+c,[row(a,'debit','Gross salary'),slot('staff',c,'credit','Net salary owed')]);
   const tax=reg.bridge(c,true),pit=reg.byCode('2111'),sso=reg.byCode('2112');
   if(tax&&pit)add('payroll-pit-'+c,'Accrue salaries with PIT · '+c,[row(a,'debit','Gross salary'),slot('staff',c,'credit','Net salary owed'),row(tax,'credit','Employee PIT withholding'),row(pit,'credit','PIT payable')],false);
   if(tax&&pit&&sso)add('payroll-tax-sso-'+c,'Accrue salaries with PIT and SSO · '+c,[row(a,'debit','Gross salary'),slot('staff',c,'credit','Net salary owed'),row(tax,'credit','Employee withholding'),row(pit,'credit','PIT payable — enter the allocation'),row(sso,'credit','SSO payable — enter the allocation')],false);
   continue;
  }
  if(m.actualCode==='3024'){
   const remaining=[...reg.maps].find(([key,v])=>v.actualCode==='3023'&&g.currency(reg.all.find(item=>item.id===key))===c);
   if(remaining)add('mapping-'+a.code+'-'+c,name+' · '+c,[row(reg.all.find(item=>item.id===remaining[0]),'debit','Release remaining support at its original rate'),row(a,'credit','Support used at the same original rate')],false);
   continue;
  }
  add('mapping-'+a.code+'-'+c,name+' · '+c,expense||asset?[row(a,'debit'),slot('fund',c,'credit','Cash / bank payment')]:[slot('fund',c,'debit','Cash / bank receipt'),row(a,'credit')]);
  if(m.actualCode==='3023'){
   const receipt=[{...slot('staff',c,'debit','Support received through staff'),receiptLeg:'receive'},
    {...row(a,'credit','Owner support received'),receiptLeg:'equity'},
    {...slot('fund',c,'debit','Full deposit into company cash / bank'),receiptLeg:'deposit'},
    {...slot('staff',c,'credit','Clear the same staff receipt'),receiptLeg:'clear'}];
   add('support-deposit-'+c,'Receive financial support via staff and deposit it · '+c,receipt,false);
   const feeAccount=reg.byCode('5414');
   if(feeAccount)add('support-deposit-fee-'+c,'Receive financial support via staff, deposit it and record a LAK fee · '+c,
    [...receipt,row(feeAccount,'debit','Separate LAK bank fee'),slot('payer','LAK','credit','Fund or staff who paid the fee')],false);
  }
  const fee=[...reg.maps].find(([id,m])=>String(m.actual?.code)==='5414'&&g.currency(reg.all.find(a=>a.id===id))===c);
  if((expense||asset)&&String(m.actual.code)!=='5414'&&fee){const feeAccount=reg.all.find(a=>a.id===fee[0]);const payment=asset?[row(a,'debit'),slot('fund',c,'credit','Prepayment released'),row(feeAccount,'debit','Separate bank fee'),slot('fund',c,'credit','Fee released at its own rate')]:[row(a,'debit'),row(feeAccount,'debit','Separate bank fee'),slot('fund',c,'credit','Total paid including bank fee')];add('fee-'+a.code+'-'+c,name+' and pay a bank fee · '+c,payment,false);}
 }
 const salaries=[...reg.maps].filter(([,m])=>String(m.actual?.code)==='5311').map(([id])=>reg.all.find(a=>a.id===id));
 if(salaries.length>1)add('mixed-payroll','Accrue salaries in multiple currencies',salaries.flatMap(a=>[row(a,'debit','Gross salary'),slot('staff',g.currency(a),'credit','Net salary owed')]),false);
 const currencies=[...new Set(reg.all.filter(g.fund).map(g.currency))].sort();
 for(const c of currencies){
  add('transfer-'+c,'Transfer between cash or bank accounts · '+c,[slot('fund',c,'debit','Receiving fund'),slot('fund',c,'credit','Paying fund')],false);
  add('settlement-'+c,'Settle a salary or outstanding payable · '+c,[slot('balance',c,'debit','Balance payment'),slot('fund','', 'credit','Cash / bank payment')],false);
  for(const to of currencies.filter(x=>x!==c))add('exchange-'+c+'-'+to,'Exchange currency · '+c+' to '+to,[slot('fund',c,'credit','Amount paid'),slot('fund',to,'debit','Amount received')],false);
 }
 for(const receipt of out.filter(t=>/^gen268-mapping-931[12]-/.test(t.id))){
  const c=receipt.lines[0].currency;
  for(const to of currencies.filter(x=>x!==c)){
   const exchange=out.find(t=>t.id==='gen268-exchange-'+c+'-'+to);
   out.push({id:'gen268-support-exchange-'+c+'-'+to,name:'Receive financial support and exchange part or all · '+c+' to '+to,builtin:true,autoMatch:false,
    lines:[...receipt.lines.map(l=>({...l,stage:'Receipt'})),...exchange.lines.map(l=>({...l,stage:'Exchange'}))]});
  }
 }
 if(currencies.includes('LAK')){
  for(const [code,label] of [['2111','PIT'],['2112','SSO']]){
   const payable=reg.byCode(code,'LAK');
   if(payable&&g.type(payable)==='LIABILITY')add('remit-'+label,'Pay '+label+' in whole kip',
    [row(payable,'debit',label+' liability to settle'),slot('fund','LAK','credit','Government payment')],false);
  }
 }
 for(const a of reg.all.filter(a=>g.currency(a)==='LAK'&&!g.technical(a)&&['EXPENSE','REVENUE','EQUITY'].includes(g.type(a))&&String(a.code)!=='5419')){
  if(String(a.code)==='3024'){
   const remaining=reg.byCode('3023');
   if(remaining)add('local-'+a.code,action(a)+' · LAK',[row(remaining,'debit','Release remaining support'),row(a,'credit','Support applied')],false);
   continue;
  }
  const code=String(a.code);
  // Opening and retained earnings are prepared in the dedicated opening/closing workflows.
  if(['3110','3200'].includes(code))continue;
  const fixed={
   '3042':['1410','Withdraw inventory for the owner','debit','Inventory at supported cost'],
   '4011':['1110','Record Foodpanda sales on account','credit','Amount due from Foodpanda'],
   '4012':['1111','Record EGetS sales on account','credit','Amount due from EGetS'],
   '4013':['1112','Record Champa sales on account','credit','Amount due from Champa'],
   '5211':['2111','Accrue employer PIT','debit','PIT payable'],
   '5212':['2112','Accrue employer SSO','debit','SSO payable'],
   '5213':['2113','Accrue assessed profit tax','debit','Profit tax payable'],
   '5416':['1410','Record inventory waste','debit','Inventory at supported cost'],
   '5417':['1511','Record equipment depreciation','debit','Accumulated depreciation']
  }[code];
  if(fixed){
   const [otherCode,title,side,memo]=fixed,other=reg.byCode(otherCode);
   if(other)add('local-'+code,title+' · LAK',side==='debit'?[row(a,side),row(other,'credit',memo)]:[row(other,'debit',memo),row(a,side)]);
   continue;
  }
  if(code==='5420'){
   const payable=reg.byCode('2010');
   if(payable)add('local-'+code,'Settle a supplier payable with a rounding difference · LAK',
    [row(payable,'debit','Amount discharged'),row(a,'','Documented rounding difference'),slot('fund','LAK','credit','Actual payment')],false);
   continue;
  }
  if(code==='5311'){
   add('local-'+code,'Accrue salary owed to staff · LAK',[row(a,'debit','Salary earned'),slot('staff','LAK','credit','Salary owed')]);
   continue;
  }
  const withdrawal=code==='3041',expense=g.type(a)==='EXPENSE';
  const title=withdrawal?'Withdraw cash for the owner':code==='5418'?'Record a confirmed cash shortage':action(a);
  add('local-'+code,title+' · LAK',expense||withdrawal?[row(a,'debit'),slot('fund','LAK','credit','Paying fund')]:[slot('fund','LAK','debit','Receiving fund'),row(a,'credit')]);
 }
 // Releases consume the prepaid asset; they do not repeat the original payment.
 for(const [id,name,expense,prepaid,c] of [['wifi','Recognize prepaid Wi-Fi expense','5110','1311','LAK'],['rent','Recognize prepaid company house rent','5421','1310','LAK'],['restaurant','Recognize prepaid restaurant rent','9222','1312','THB']]){
  const e=reg.byCode(expense,c),p=reg.byCode(prepaid,c);
  if(!p)continue;
  const debit=e&&g.type(e)==='EXPENSE'?row(e,'debit','Monthly prepaid expense'):null;
  if(debit||id==='rent')add('amortization-'+id,name+' · '+c,[debit||slot('expense',c,'debit','Company house rent expense'),row(p,'credit','Release prepaid balance')]);
 }
 add('amortization-insurance','Recognize prepaid insurance expense · LAK',[slot('expense','LAK','debit','Insurance expense'),slot('prepaid','LAK','credit','Release prepaid insurance')],false);
 add('amortization-other','Recognize another prepaid expense · LAK',[slot('expense','LAK','debit','Prepaid expense allocation'),slot('prepaid','LAK','credit','Release prepaid balance')],false);
 return out;
}
function accepts(line,a){const g=G();return !!a&&(!line.currency||line.currency===g.currency(a))&&(line.role==='fund'?g.fund(a):line.role==='staff'?g.staff(a):line.role==='payer'?g.fund(a)||g.staff(a):line.role==='balance'?g.staff(a)||g.type(a)==='LIABILITY':line.role==='prepaid'?g.type(a)==='ASSET'&&/^13\d\d$/.test(String(a.code)):line.role==='expense'?g.type(a)==='EXPENSE'&&!g.technical(a):false);}
function resolve(line,chart){return line.accountId?chart.find(a=>a.id===line.accountId&&(!line.currency||G().currency(a)===line.currency)):line.code?chart.find(a=>String(a.code)===String(line.code)&&(!line.currency||G().currency(a)===line.currency)):root.resolveTemplateAccount14397?.(line);}
function match(rows,definitions,chart){
 const g=G(),reg=g.registry(chart),entered=rows.filter(l=>l.account_id&&l.generated!=='output'),anchors=entered.filter(l=>{const a=chart.find(a=>a.id===l.account_id);return a&&!g.fund(a)&&(!g.technical(a)||reg.maps.has(a.id))});
 if(!anchors.length)return [];
 const candidates=[];
 for(const t of definitions.filter(t=>t.id!=='blank'&&t.autoMatch!==false)){
  const lines=t.lines||[];let score=0,valid=true;
  for(const l of entered){const a=chart.find(a=>a.id===l.account_id);if(!a)continue;const side=Number(l.debit)>0?'debit':Number(l.credit)>0?'credit':'';
   const matches=lines.filter(x=>(!side||!x.side||x.side===side)&&(resolve(x,chart)?.id===a.id||accepts(x,a)||reg.maps.get(resolve(x,chart)?.id)?.actual?.id===a.id));
   if(!matches.length){if(anchors.includes(l)||g.fund(a)){valid=false;break;}continue;}
   if(anchors.includes(l))score+=matches.some(x=>resolve(x,chart)?.id===a.id)?4:2;
   else score++;
  }
  if(valid&&score>=2)candidates.push({template:t,score});
 }
 candidates.sort((a,b)=>b.score-a.score);return candidates.filter(x=>x.score===candidates[0]?.score).map(x=>x.template);
}
function merge(rows,template,chart,makeRows){
 const result=rows.map(l=>({...l})),used=new Set(),layout=makeRows(template);
 for(const [i,line] of (template.lines||[]).entries()){
  const a=resolve(line,chart),index=result.findIndex((l,j)=>!used.has(j)&&l.account_id&&(!line.side||!Number(l.debit)&&!Number(l.credit)||Number(l[line.side])>0)&&(a?.id===l.account_id||accepts(line,chart.find(a=>a.id===l.account_id))));
  if(index>=0){const current=result[index];result[index]={...current,role:line.role,expectedSide:line.side,expectedCurrency:line.currency,stage:line.stage,receiptLeg:line.receiptLeg,generated:layout[i].generated,autoMemo:layout[i].autoMemo,line_memo:current.line_memo||layout[i].line_memo};if(current.line_memo)result[index].autoMemo=current.autoMemo;if(!line.calculated||current.debit||current.credit)result[index].generated=current.generated;used.add(index);continue;}
  const empty=result.findIndex((l,j)=>!used.has(j)&&!l.account_id&&!l.line_memo&&!l.debit&&!l.credit),next=layout[i];
  if(empty>=0){result[empty]=next;used.add(empty);}else{result.push(next);used.add(result.length-1);}
 }
 return result;
}
root.JournalTemplateCatalog268={templates,accepts,resolve,match,merge};
})(globalThis);

;
/* A separate template draft. Only Use in Post Entry copies rows to the journal. */
(()=>{'use strict';
const $=id=>document.getElementById(id),G=window.JournalCompletion258,esc=v=>escapeHtml(String(v??''));
let dialog=null,owner='',state=null,busy=false,revision=0,verified='',storageWarning='',job=null;
const Catalog=window.JournalTemplateCatalog268;
const who=()=>typeof liveProfile==='undefined'?'':liveProfile?.id||'';
const chart=()=>AccountingStore.accounts.filter(G.available);
const key=()=> 'ojm_generator258:'+String(window.OJM_SUPABASE_URL||location.origin)+':'+owner;
const number=v=>typeof v==='number'?v:String(v??'').trim()?parseAppNumber(String(v)):0;
const display=v=>typeof v==='number'?v.toLocaleString(typeof appNumberLocale==='function'?appNumberLocale():'en-US',{useGrouping:true,maximumFractionDigits:12}):v??'';
const offline=()=>!navigator.onLine||window.offline14239?.offline()||window.sessionCache14333?.localMode;
const blank=()=>({account_id:'',line_memo:'',debit:'',credit:''});
function eligible(){if(!who())throw Error('Sign in before preparing an entry.');if(window.personalJournal1437?.active||window.workspaceRequest138?.target)throw Error('Open the main company journal to use this generator.');if(!window.access113?.can('journal','edit')&&!window.access113?.can('journal','post'))throw Error('Journal editing permission is required.');if(window.DriveDrafts143128?.preparedCount||window.DriveDrafts143128?.editing||pendingWorkspacePostOwnerId||pendingWorkspacePostJournalId)throw Error('Finish the prepared entries before using this generator.');}
function persist(){if(owner!==who()||!state)return;try{localStorage.setItem(key(),JSON.stringify(state));storageWarning='';}catch{storageWarning='This draft could not be saved on this device. Keep the window open until it is copied to Post Entry.';}}
function invalidate(){revision++;verified='';if(dialog){dialog.querySelector('[data-use]').disabled=true;dialog.querySelector('[data-status]').textContent='';}persist();}
function definitions(){
 const saved=typeof availableTransactionTemplates==='function'?availableTransactionTemplates():[];
 return [{id:'blank',name:'Enter manually — detect template',lines:[{},{}]},...saved];
}
function templateRows(t){return (t.lines||[]).map(l=>{const a=l.code?chart().find(a=>String(a.code)===String(l.code)&&G.currency(a)===l.currency):l.accountId?chart().find(a=>a.id===l.accountId):typeof resolveTemplateAccount14397==='function'?resolveTemplateAccount14397(l):null;return {...blank(),account_id:a?.id||'',line_memo:l.memo||'',role:l.role,stage:l.stage,receiptLeg:l.receiptLeg,...(l.calculated?{generated:'output',autoMemo:true}:{}),expectedCurrency:l.currency,expectedSide:l.side,missing:!a&&(l.accountId||l.account||l.code)?String(l.account||l.code||l.accountId):''};});}
function entrySource(){
 const snap=typeof snapshotJournal69==='function'?snapshotJournal69():null;
 const memo=$('jeGeneralMemo')?.value||'',date=$('jeTransDate')?.value||'';
 const rows=[],editorRows=$('jeLinesBody')?.children||[];let template='blank';
 for(const [index,r] of (snap?.rows||[]).entries()){
  const credits=Object.entries(r.credits||{}).filter(([,v])=>number(v)!==0);
  if(!r.account&&!r.memo&&!number(r.dr)&&!credits.length)continue;
  const a=getSelectedAccountInfo(r.account);
  if(credits.length>1||a&&credits.some(([c])=>c!==G.currency(a)))throw Error('Check the credit currencies in Post Entry before generating.');
  const data=editorRows[index]?.dataset||{};
  if(data.generatorTemplate)template=data.generatorTemplate;
  rows.push({...blank(),expectedSide:data.templateSide274,role:data.generatorRole,expectedCurrency:data.generatorCurrency,stage:data.generatorStage,receiptLeg:data.generatorReceipt,
   ...(r.averageBookRate?{autoBook:true}:{}),
   ...(data.generatorCalculated&&!number(r.dr)&&!credits.length||r.generatorOutput===JSON.stringify([a?.id,number(r.dr),number(credits[0]?.[1]),r.memo||'',number(r.fxRate),number(r.bookRate)])?{generated:'output',autoMemo:true}:{}),sourceIndex:index,account_id:a?.id||'',missing:!a?r.account:'',line_memo:r.memo||'',debit:r.dr||'',credit:credits[0]?.[1]||'',
   fx_rate_lak:r.fxRate?Number(r.fxRate):'',book_rate_lak:r.bookRate?Number(r.bookRate):''});
 }
 if((!snap&&!memo.trim())||!memo.trim()&&!rows.length)return null;
 return {template,signature:JSON.stringify([typeof JournalModule==='undefined'?null:JournalModule.editingEntryId,date,memo,snap]),date,memo,rows:rows.length?rows:[blank(),blank()],rates:snap?.fxRates||{}};
}
function suggestions(){
 const memo=state.memo.toLowerCase();
 const families=[
  [/financial support|owner support|owner funding|capital contribution/,/financial support/],
  [/exchang|convert/,/exchange currency|exchange part or all/],
  [/settle|salary payment|paid.{0,20}salary/,/settle a salary/],
  [/salary accrual|payroll|salaries/,/accrue salaries/],
  [/bank fee|transfer fee|service charge/,/bank fee|lak fee/],
  [/prepaid|amortiz/,/prepay|recognize prepaid/],
  [/kitchen suppl/,/buy kitchen supplies/],
  [/dine.in|cash sales|sales receipt/,/record .*sales/],
  [/transfer between|cash deposit/,/transfer between/]
 ];
 const terms=memo.match(/[a-z]{3,}/g)||[],tokens=terms.filter(x=>!['the','from','and','for','that','with','was','into','received','paid'].includes(x));
 const ranked=definitions().filter(t=>t.id!=='blank').map(t=>{
  const name=t.name.toLowerCase();
  let score=families.reduce((n,[pattern,title])=>n+(pattern.test(memo)&&title.test(name)?5:0),0);
  score+=tokens.reduce((n,w)=>n+(name.includes(w)?1:0),0);
  if(/via|through|deposit/.test(memo)&&name.includes('via staff'))score+=2;
  return {t,score};
 }).filter(x=>x.score>=2).sort((a,b)=>b.score-a.score);
 return ranked.slice(0,8).map(x=>x.t);
}
function relatedTemplates(matches){
 const host=dialog.querySelector('[data-matches]');host.replaceChildren();
 if(!matches.length)return;
 host.append('Choose the transaction you recorded ');
 for(const t of matches){
  const b=document.createElement('button');b.type='button';b.className='je-btn je-btn-secondary';b.textContent=t.name;
  b.onclick=()=>selectTemplate(t.id,true);host.append(b);
 }
}
function showHistory(){
 const host=dialog.querySelector('[data-history-list]'),detail=dialog.querySelector('[data-history-entry]');
 const q=dialog.querySelector('[data-history-query]').value.toLowerCase().trim(),groups=new Map();
 for(const l of (typeof JournalModule==='undefined'?[]:JournalModule.entries||[])){
  if(!l.id||l.voided_at||l.pendingSync||l.local14333||l.status&&l.status!=='posted')continue;
  if(!groups.has(l.id))groups.set(l.id,[]);
  groups.get(l.id).push(l);
 }
 host.replaceChildren();detail.replaceChildren();
 let count=0;
 for(const [id,lines] of [...groups].sort((a,b)=>(b[1][0].postingDate||b[1][0].date||'').localeCompare(a[1][0].postingDate||a[1][0].date||''))){
  if(!q&&!lines.some(l=>l.currency&&l.currency!=='LAK'))continue;
  const title=id+' · '+(lines[0].generalMemo||lines[0].memo||''),haystack=(title+' '+lines.map(l=>l.accountCode+' '+l.account).join(' ')).toLowerCase();
  if(!q.split(/\s+/).every(word=>haystack.includes(word)))continue;
  const b=document.createElement('button');b.type='button';b.className='je-btn je-btn-secondary';b.textContent=id+' · '+(lines[0].postingDate||lines[0].date||'')+' · '+lines.length+' lines';b.title=title;
  b.onclick=()=>{detail.innerHTML='<p>'+esc(title)+'</p><div class="generator-table258"><table><thead><tr><th>Account</th><th>Currency</th><th>Debit</th><th>Credit</th><th>ER / VR</th><th>BR</th></tr></thead><tbody>'+lines.map(l=>'<tr>'+[l.accountCode+' — '+l.account,l.currency,display(Number(l.debit)||''),display(Number(l.credit)||''),l.fx_rate_lak?formatAppRate(l.fx_rate_lak):'',l.book_rate_lak?formatAppRate(l.book_rate_lak):''].map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';};
  host.append(b);if(++count>=12)break;
 }
 if(!count)host.textContent='No matching posted journals in the loaded period.';
}
function restoreProtocolRows(draft,t){
 if(!draft||!t?.builtin)return;
 if(t.id.startsWith('gen268-settlement-')&&draft.protocolVersion!==2){
  const layout=templateRows(t),bridge=layout.find(l=>l.generated&&l.expectedSide==='debit'&&l.expectedCurrency!=='LAK');
  const index=bridge?draft.rows.findIndex(l=>l.account_id===bridge.account_id&&l.generated==='output'&&!l.expectedSide&&!l.debit&&!l.credit):-1;
  if(index>=0){
   draft.rows.splice(index,1,...layout.filter(l=>l.account_id===bridge.account_id));
   const kip=layout[layout.length-1],old=draft.rows.find(l=>l.account_id===kip.account_id&&l.generated==='output');
   if(old){draft.rows.splice(draft.rows.indexOf(old),1);draft.rows.push(old);}
  }
 }
 if(draft.protocolVersion){draft.protocolVersion=2;return;}
 if(!draft.rows.some(l=>l.generated==='output')){
  for(const line of templateRows(t).filter(l=>l.generated==='output')){
   const present=draft.rows.some(l=>l.account_id===line.account_id&&(!line.expectedSide||
    !t.id.startsWith('gen268-settlement-')||l.expectedSide===line.expectedSide||number(l[line.expectedSide])>0));
   if(!present)draft.rows.push(line);
  }
 }
 draft.protocolVersion=2;
}
function selectTemplate(id,merge=false){
 state.drafts[state.template]={rows:state.rows,memo:state.memo,rates:state.rates,protocolVersion:state.protocolVersion};
 const previous=state.drafts[id],t=definitions().find(t=>t.id===id);if(!t)return;
 const fromEntry=state.entrySignature&&id!=='blank';
 const next=merge||fromEntry?{rows:Catalog.merge(fromEntry&&!merge?(entrySource()?.rows||state.rows):state.rows,t,chart(),templateRows),memo:state.memo||t.generalMemo||'',rates:state.rates}:previous||{rows:templateRows(t),memo:state.memo||t.generalMemo||'',rates:state.rates};
 restoreProtocolRows(next,t);Object.assign(state,next,{template:id,protocolVersion:2});dialog.querySelector('[data-matches]').replaceChildren();invalidate();render();suggestSourceBooks();
}
function message(text,error=false){const host=dialog?.querySelector('[data-status]');if(host){host.textContent=text+(storageWarning?' '+storageWarning:'');host.classList.toggle('has-error258',error);}}
function close(){
 const previous=dialog;if(!previous)return;
 const pending=job;dialog=null;job=null;revision++;busy=false;verified='';
 try{if(previous.open)previous.close();}finally{
  previous.remove();persist();
  try{window.dropdown1434?.close?.();}finally{pending?.end?.();$('generateJournal258')?.focus({preventScroll:true});}
 }
}
function dismissible(node){
 const outside=e=>{
  if(e.target!==node)return false;
  const b=node.getBoundingClientRect();
  return e.clientX<b.left||e.clientX>=b.right||e.clientY<b.top||e.clientY>=b.bottom;
 };
 let backdrop=false;
 node.addEventListener('pointerdown',e=>{backdrop=outside(e);});
 node.addEventListener('pointercancel',()=>{backdrop=false;});
 node.addEventListener('click',e=>{if(backdrop&&outside(e))close();backdrop=false;});
 node.querySelector('[data-close]').addEventListener('click',e=>{e.preventDefault();close();});
 node.addEventListener('cancel',e=>{e.preventDefault();close();});
 node.addEventListener('close',()=>{if(dialog===node)close();});
}
function templateChoices(query=''){
 const host=dialog.querySelector('[data-template-options]'),field=dialog.querySelector('[data-template-query]');host.replaceChildren();
 const tokens=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean),matches=definitions().filter(t=>tokens.every(token=>(t.name+' '+(t.lines||[]).map(l=>l.memo||l.account||l.code||'').join(' ')).toLocaleLowerCase().includes(token)));
 for(const t of matches){const b=document.createElement('button');b.type='button';b.setAttribute('role','option');b.setAttribute('aria-selected',String(state.template===t.id));b.textContent=t.name;b.onpointerdown=e=>e.preventDefault();b.onclick=()=>{selectTemplate(t.id);host.hidden=true;field.setAttribute('aria-expanded','false');};host.append(b);}
 if(!matches.length)host.textContent='No matching templates. Choose manual entry and enter the accounts you know.';
 host.hidden=false;field.setAttribute('aria-expanded','true');
}
function detect(){
 if(state.template!=='blank'||!Catalog)return '';
 const matches=Catalog.match(state.rows,definitions(),chart()),host=dialog.querySelector('[data-matches]');host.replaceChildren();
 if(matches.length===1){selectTemplate(matches[0].id,true);return 'Matched '+matches[0].name+'. ';}
 const candidates=matches.length?matches:suggestions();
 if(candidates.length){relatedTemplates(candidates);if(matches.length||!state.rows.some(l=>l.account_id))return null;}
 return '';
}
function renderRates(){
 const host=dialog.querySelector('[data-rates]'),cs=[...new Set(state.rows.map(l=>chart().find(a=>a.id===l.account_id)).filter(Boolean).map(G.currency).filter(c=>c!=='LAK'))].sort();
 for(const n of [...host.children])if(!cs.includes(n.dataset.currency))n.remove();
 for(const c of cs)if(![...host.children].some(n=>n.dataset.currency===c)){const label=document.createElement('label');label.dataset.currency=c;label.textContent='ER / VR · LAK per 1 '+c;const n=document.createElement('input');n.className='je-input';n.inputMode='decimal';n.setAttribute('aria-label','LAK per 1 '+c);bindAppRateInput(n,state.rates[c]??'');n.oninput=()=>{state.rates[c]=n.value;for(const l of state.rows)if(G.currency(chart().find(a=>a.id===l.account_id))===c&&!l.overrideRate)delete l.fx_rate_lak;invalidate();};label.append(n);host.append(label);}
}
const bookRequests292=new WeakMap();
function suggestSourceBooks(){
 for(const line of state.rows)if(line.account_id&&line.generated!=='output'&&(!line.book_rate_lak||line.autoBook))void suggestBook292(line);
}
async function suggestBook292(line){
 const account=chart().find(a=>a.id===line.account_id),date=state.date,actor=who();
 if(!account||G.currency(account)==='LAK'||!window.AccountRates143186)return;
 const request={};bookRequests292.set(line,request);
 if(typeof AccountRates143186.bookRateFor!=='function')return;
 const settling=line.role==='balance'||(!line.role&&G.staff(account)&&number(line.debit)>0);
 const book=await AccountRates143186.bookRateFor(account,date,JournalModule.editingEntryId||null,settling).catch(()=>null);
 if(busy||bookRequests292.get(line)!==request||actor!==who()||date!==state.date||account.id!==line.account_id||!dialog?.open||!state.rows.includes(line)||line.book_rate_lak&&!line.autoBook)return;
 if(!book&&!line.book_rate_lak||line.autoBook&&line.book_rate_lak===book)return;
 line.book_rate_lak=book||'';line.autoBook=true;
 const input=dialog.querySelector('[data-row="'+state.rows.indexOf(line)+'"] [data-field=book_rate_lak]');
 if(input&&document.activeElement!==input)bindAppRateInput(input,line.book_rate_lak);
 invalidate();persist();
}
function renderRows(){
 const body=dialog.querySelector('[data-entry-lines]'),accounts=chart(),options=accounts.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.code+' — '+a.name+' · '+G.currency(a))+'</option>').join('');body.replaceChildren();
 state.rows.forEach((l,i)=>{
  const a=chart().find(a=>a.id===l.account_id),tr=document.createElement('tr');tr.dataset.row=i;
  tr.innerHTML='<td>'+(i+1)+(l.stage?'<small>'+esc(l.stage)+'</small>':'')+'</td><td><select class="je-select" aria-label="Account row '+(i+1)+'"><option value="">'+esc(l.role?'Choose '+l.role+(l.expectedCurrency?' · '+l.expectedCurrency:''):'Choose account')+'</option>'+options+'</select></td><td><input aria-label="Memo row '+(i+1)+'" data-field="line_memo" value="'+esc(l.line_memo)+'"></td><td data-currency>'+esc(a?G.currency(a):'')+'</td>'+['debit','credit','fx_rate_lak','book_rate_lak'].map(k=>'<td><input inputmode="decimal" '+(['debit','credit'].includes(k)?'data-numeric88="true" data-precision88="2" ':'')+'aria-label="'+({debit:'Debit',credit:'Credit',fx_rate_lak:'Transaction or valuation rate',book_rate_lak:'Book rate'}[k])+' row '+(i+1)+'" data-field="'+k+'" value="'+esc(display(l[k]&&['debit','credit'].includes(k)&&Number.isFinite(number(l[k]))?number(l[k]):l[k]||''))+'"'+((k==='book_rate_lak'||k==='fx_rate_lak')&&(!a||G.currency(a)==='LAK')?' disabled':'')+'></td>').join('')+'<td><button type="button" class="je-btn je-btn-secondary" aria-label="Delete row '+(i+1)+'">×</button></td>';
  const rowRate=tr.querySelector('[data-field=fx_rate_lak]');bindAppRateInput(rowRate,l.fx_rate_lak||'');if(a)rowRate.placeholder=display(state.rates[G.currency(a)]||'');
  const bookField=tr.querySelector('[data-field=book_rate_lak]');bindAppRateInput(bookField,l.book_rate_lak??'');
  const select=tr.querySelector('select');select.value=l.account_id;select.onchange=()=>{l.account_id=select.value;l.missing='';delete l.generated;delete l.book_rate_lak;delete l.fx_rate_lak;delete l.autoBook;delete l.overrideRate;
   if(l.receiptLeg==='receive'){const clear=state.rows.find(r=>r.receiptLeg==='clear');if(clear)clear.account_id=l.account_id;}
   invalidate();renderRows();renderRates();void suggestBook292(l);};
  for(const n of tr.querySelectorAll('[data-field]'))n.oninput=()=>{l[n.dataset.field]=n.value;if(n.dataset.field==='fx_rate_lak'){l.overrideRate=!!n.value;if(l.generated==='output')delete l.generated;}if(n.dataset.field==='line_memo')delete l.autoMemo;if(['debit','credit'].includes(n.dataset.field))delete l.generated;if(n.dataset.field==='book_rate_lak'){bookRequests292.delete(l);delete l.autoBook;delete l.generated;}invalidate();};
  tr.querySelector('button').onclick=()=>{state.rows.splice(i,1);if(!state.rows.length)state.rows.push(blank());invalidate();renderRows();renderRates();};body.append(tr);
 });
}
function render(){
 const repair=dialog.querySelector('[data-repair-layout]');
 repair.hidden=!legacyCashLayout();
 if(!repair.hidden){
  const t=definitions().find(t=>t.id===state.template);
  repair.textContent=t?'Load corrected template':'Choose a different template';
  repair.onclick=()=>{
   if(!t){dialog.querySelector('[data-template-query]').focus();templateChoices('');return;}
   state.rows=templateRows(t);invalidate();render();
   message('Enter the documented amounts in the corrected layout.');
  };
 }
 dialog.querySelector('[data-template]').value=state.template;dialog.querySelector('[data-date]').value=state.date;dialog.querySelector('[data-memo]').value=state.memo;
 dialog.querySelector('[data-template-query]').value=definitions().find(t=>t.id===state.template)?.name||'';
 dialog.querySelector('[data-rates]').replaceChildren();renderRates();renderRows();dialog.querySelector('[data-use]').disabled=true;
 const missing=state.rows.filter(l=>l.missing);if(missing.length)message('Choose current accounts for these saved template lines: '+missing.map(l=>l.missing).join(', '),true);
}
function readInput(){return {date:state.date,chart:chart(),rates:Object.fromEntries(Object.entries(state.rates).map(([c,v])=>[c,number(v)])),rows:state.rows.map(l=>({...l,debit:number(l.debit),credit:number(l.credit),book_rate_lak:number(l.book_rate_lak),fx_rate_lak:number(l.fx_rate_lak)}))};}
function legacyCashLayout(){
 if(!String(state.template||'').startsWith('gen268-local-'))return false;
 const t=definitions().find(t=>t.id===state.template);
 if(t&&!t.builtin)return false;
 const cash=state.rows.find(l=>l.role==='fund');
 if(!cash)return false;
 return !t||!t.lines.some(l=>l.role==='fund'&&l.side===cash.expectedSide)||
  t.id==='gen268-local-5420'&&!state.rows.some(l=>l.account_id===Catalog.resolve(t.lines[0],chart())?.id);
}
function validateLayout(input){
 if(legacyCashLayout())throw Error('This draft uses a superseded cash posting. Load the current template and review its accounts before generating.');
 for(const [i,l] of input.rows.entries()){
  const a=input.chart.find(a=>a.id===l.account_id);
  if(!a)continue;
  if(l.overrideRate&&!(l.fx_rate_lak>0))throw Error('Row '+(i+1)+' needs a positive exchange or valuation rate.');
  if(l.role&&!Catalog.accepts({role:l.role,currency:l.expectedCurrency},a))throw Error('Row '+(i+1)+' needs a '+(l.expectedCurrency||'')+' '+l.role+' account.');
  if(l.expectedSide&&l.generated!=='output'&&l[l.expectedSide==='debit'?'credit':'debit']>0)throw Error('Row '+(i+1)+' belongs on the '+l.expectedSide+' side for this template.');
 }
}
function fingerprint(){return JSON.stringify([who(),window.OJM_SUPABASE_URL,JournalModule.editingEntryId,state,snapshotJournal69(),$('jeGeneralMemo')?.value,$('jeTransDate')?.value]);}
async function balances(input){
 const explicitPrepaid=({l,a})=>a&&/^13\d\d$/.test(String(a.code))&&G.type(a)==='ASSET'&&!G.technical(a)&&l.credit>0&&l.book_rate_lak>0&&!l.autoBook;
 const source=input.rows.filter(l=>l.generated!=='output').map(l=>({l,a:input.chart.find(a=>a.id===l.account_id)}));
 const needs=source.filter(x=>!x.l.receiptLeg&&!explicitPrepaid(x)).filter(({l,a})=>a&&G.currency(a)!=='LAK'&&(G.fund(a)&&!l.debit||(l.debit>0||!l.debit&&!l.credit)&&(G.staff(a)||G.type(a)==='LIABILITY')||l.credit>0&&!G.technical(a)&&!G.fund(a)&&!G.staff(a)&&G.type(a)==='ASSET'));
 if(!needs.length)return {values:{},note:source.some(explicitPrepaid)?'Uses the entered historical prepaid rate. Check the source balance before posting.':''};
 const exclude=JournalModule.editingEntryId||null,localMode=offline(),snapshot=localMode?null:await AccountRates143186.snapshot(input.date,exclude,true);
 if(!localMode&&!snapshot)throw Error('Recorded balances could not be checked. Your draft is retained; reconnect and Generate again.');
 const values={};let estimated=false;
 for(const a of new Map(needs.map(({a})=>[a.id,a])).values()){
  const device=window.AccountRates143186?.local(a,input.date,exclude),remote=snapshot?.accounts?.find(r=>String(r.account_id)===String(a.id));let b;
  if(localMode||device?.pending){b=device;estimated=true;}
  else if(remote){const q=Number(remote.foreign_balance),v=remote.lak_carrying_value==null?null:Number(remote.lak_carrying_value);b={quantity:q,rate:Number(remote.average_rate)||(G.staff(a)&&q&&v!=null&&q*v>0?v/q:null)};}
  if(!b||!Number.isFinite(b.quantity))throw Error('The recorded balance for '+a.name+' is unavailable. Load its accounting period and Generate again.');
  values[a.id]={quantity:b.quantity,rate:b.rate||(G.staff(a)&&b.quantity&&b.value!=null&&b.quantity*b.value>0?b.value/b.quantity:null)};
  // Do not ignore cash already committed in the normal unfinished journal.
  if(G.fund(a)&&values[a.id]&&!state.entrySignature)for(const r of document.querySelectorAll('#jeLinesBody tr'))if(getSelectedAccountInfo(r.querySelector('.je-line-acc')?.value)?.id===a.id){if(parseCleanNumber(r.querySelector('.je-line-dr')?.value)>0)throw Error('Post Entry already receives money into '+a.name+'. Finish that transaction before using its new book value.');values[a.id].quantity-=parseCleanNumber(r.querySelector('.je-line-cr')?.value);}
 }
 return {values,note:estimated?'Device book-value estimate. Recheck after synchronization.':'Recorded account balances checked.'};
}
function showErrors(errors){message(errors.map(e=>(e.row!=null?'Row '+(e.row+1)+': ':'')+e.message.replace(/^Row \d+: /,'')).join('\n'),true);const book=errors.find(e=>e.needsBook&&e.row!=null);if(book)dialog.querySelector('[data-row="'+book.row+'"] [data-field="book_rate_lak"]')?.focus({preventScroll:true});}
async function calculate(){
 if(busy)return;const detected=detect();if(detected===null){message('Choose a matching template to see its journal lines.');return;}busy=true;verified='';dialog.querySelector('[data-use]').disabled=true;const actor=who(),rev=revision,before=fingerprint(),end=window.actionFeedback14296?.begin(dialog.querySelector('[data-generate]'),'Generating journal…'),task=job={end};
 try{eligible();if(!state.memo.trim())throw Error('Enter the general description.');if(!/^\d{4}-\d{2}-\d{2}$/.test(state.date))throw Error('Choose the transaction date.');const input=readInput();validateLayout(input);const missing=state.rows.findIndex(l=>!l.account_id&&(l.role||l.missing));if(missing>=0)throw Error('Row '+(missing+1)+': choose the '+(state.rows[missing].role||'missing')+' account before generating.');const b=await balances(input);if(!dialog?.open||actor!==who()||rev!==revision||before!==fingerprint())return;
  const result=G.complete({...input,balances:b.values});if(!result.errors.length){const unfinished=result.rows.find(l=>l.sourceIndex!=null&&!l.debit&&!l.credit&&(l.account_id||l.line_memo));if(unfinished)throw Error('Complete or remove the unfinished Post Entry line before using this journal.');}if(result.errors.length){verified='';dialog.querySelector('[data-use]').disabled=true;showErrors(result.errors);return;}
  state.rows=result.rows;persist();renderRows();renderRates();verified=JSON.stringify(readInput().rows);dialog.querySelector('[data-use]').disabled=false;message(detected+'Journal amounts filled. Review the debit and credit cells. '+b.note+(result.notes.length?' '+result.notes.join(' '):''));
 }catch(e){if(job===task&&actor===who()&&dialog?.open)message(e.message,true);}finally{if(job===task){busy=false;job=null;}end?.();}
}
async function useEntry(){
 if(busy||!verified)return;busy=true;const actor=who(),rev=revision,before=fingerprint(),end=window.actionFeedback14296?.begin(dialog.querySelector('[data-use]'),'Checking journal…'),task=job={end};
 try{eligible();const input=readInput();validateLayout(input);const missing=state.rows.findIndex(l=>!l.account_id&&(l.role||l.missing));if(missing>=0)throw Error('Row '+(missing+1)+': choose the '+(state.rows[missing].role||'missing')+' account before generating.');const b=await balances(input);if(!dialog?.open||actor!==who()||rev!==revision||before!==fingerprint())return;
  const result=G.complete({...input,balances:b.values});if(!result.errors.length){const unfinished=result.rows.find(l=>l.sourceIndex!=null&&!l.debit&&!l.credit&&(l.account_id||l.line_memo));if(unfinished)throw Error('Complete or remove the unfinished Post Entry line before using this journal.');}if(result.errors.length){showErrors(result.errors);verified='';dialog.querySelector('[data-use]').disabled=true;return;}
  if(JSON.stringify(result.rows)!==JSON.stringify(state.rows)){state.rows=result.rows;persist();renderRows();verified=JSON.stringify(readInput().rows);message('Recorded values changed. Review the updated debit and credit amounts, then use the journal again.',true);return;}
  const body=$('jeLinesBody'),memo=$('jeGeneralMemo'),oldMemo=memo.value,oldRates=JournalFX14383.capture(),oldDate=$('jeTransDate').value;
  const meaningful=r=>[...r.querySelectorAll('.je-line-acc,.je-line-memo,.je-line-dr,.je-line-cr')].some(n=>n.value.trim()),existing=[...body.children].some(meaningful);
  if(state.entrySignature&&entrySource()?.signature!==state.entrySignature)throw Error('Post Entry changed. Reopen Generate to use its current lines.');
  if(existing&&!state.entrySignature&&oldDate!==state.date)throw Error('Post Entry has an unfinished journal on another date. Finish it before copying this journal.');
  window.JournalUndo143103?.checkpoint();window.entry1430?.setMode('double');
  const oldRows=[...body.children],builtin=definitions().find(t=>t.id===state.template)?.builtin;
  try{for(const r of oldRows)if(state.entrySignature||!meaningful(r))r.remove();if(!existing||state.entrySignature)$('jeTransDate').value=state.date;
   for(const l of result.rows.filter(l=>l.debit||l.credit)){const a=chart().find(a=>a.id===l.account_id);addJournalLineRow(a.code+' — '+a.name,l.line_memo,l.debit?display(l.debit):'',{[G.currency(a)]:l.credit?display(l.credit):''});const r=body.lastElementChild,original=state.entrySignature?oldRows[l.sourceIndex]:null;
    if(original){Object.assign(r.dataset,original.dataset);}
    if(builtin){
     Object.assign(r.dataset,{generatorTemplate:state.template,generatorRole:l.role||'',generatorCurrency:l.expectedCurrency||'',
      generatorStage:l.stage||'',generatorReceipt:l.receiptLeg||'',templateSide274:l.expectedSide||''});
    }
    delete r.dataset.averageBookRate;delete r.dataset.generatorOutput;
    r.dataset.fxRate14383=l.fx_rate_lak||number(state.rates[G.currency(a)])||1;r.dataset.bookRate14383=l.book_rate_lak||'';const date=r.querySelector('.je-line-date');if(date){const prior=original?.querySelector('.je-line-date');date.value=prior?.value||state.date;if(prior?.dataset.manualDate)date.dataset.manualDate=prior.dataset.manualDate;}
    if(l.generated==='output')r.dataset.generatorOutput=JSON.stringify([a.id,l.debit,l.credit,l.line_memo||'',number(r.dataset.fxRate14383),number(r.dataset.bookRate14383)]);
    if(l.fx_rate_lak&&G.currency(a)!=='LAK')r.dataset.explicitFx291='true';}
   memo.value=!state.entrySignature&&existing&&oldMemo.trim()?oldMemo+'\n'+state.memo:state.memo;JournalFX14383.restore(!state.entrySignature&&existing?{...state.rates,...oldRates}:state.rates);calculateJournalBalance();memo.dispatchEvent(new Event('input',{bubbles:true}));window.dispatchEvent(new Event('save-state14234'));window.drafts1427?.flush();window.JournalUndo143103?.record();
  }catch(e){body.replaceChildren(...oldRows);memo.value=oldMemo;$('jeTransDate').value=oldDate;JournalFX14383.restore(oldRates);calculateJournalBalance();throw e;}
  delete state.drafts[state.template];state=state.standalone||{template:'blank',date:state.date,memo:'',rates:{},rows:[blank(),blank()],drafts:state.drafts};persist();dialog.close();dialog.remove();dialog=null;verified='';showJournalEntry98();showCenterStatus('Completed journal copied. Review it, then use Post Entry when ready.');
 }catch(e){if(job===task&&actor===who()&&dialog?.open)message(e.message,true);}finally{if(job===task){busy=false;job=null;}end?.();}
}
function open(){
 let entry;try{eligible();entry=entrySource();if(typeof TemplateStore!=='undefined')TemplateStore.load();}catch(e){showCenterStatus(e.message,true);return;}
 if(dialog&&owner===who()){if(!dialog.open)dialog.showModal();return;}const retained=owner===who()&&state;owner=who();
 if(!retained)try{state=JSON.parse(localStorage.getItem(key())||'null');}catch{state=null;}
 if(!state||!Array.isArray(state.rows))state={template:'blank',date:$('jeTransDate').value,memo:'',rates:{},rows:[blank(),blank()],drafts:{}};
 if(entry&&entry.signature!==state.entrySignature){
  state={template:entry.template,entrySignature:entry.signature,date:entry.date,memo:entry.memo,rates:entry.rates,rows:entry.rows,drafts:{},standalone:state.entrySignature?state.standalone:state};
 }else if(!entry&&state.entrySignature)state=state.standalone||{template:'blank',date:$('jeTransDate').value,memo:'',rates:{},rows:[blank(),blank()],drafts:{}};
 state.drafts||={};state.rates||={};if(!definitions().some(t=>t.id===state.template)&&!legacyCashLayout())state.template='blank';
 restoreProtocolRows(state,definitions().find(t=>t.id===state.template));
 dialog=document.createElement('dialog');dialog.id='journalGenerator258';dialog.setAttribute('aria-labelledby','generatorTitle258');
 dialog.innerHTML='<header><h3 id="generatorTitle258">Generate journal</h3><button type="button" class="je-btn je-btn-secondary" data-close>Close</button></header><div class="generator-meta258"><label class="generator-template268">Transaction template<input class="je-input" data-template-query data-plain14285 role="combobox" aria-label="Transaction template" aria-autocomplete="list" aria-expanded="false" aria-controls="generatorTemplates268" autocomplete="off"><select hidden data-plain14285 data-template>'+definitions().map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join('')+'</select><div id="generatorTemplates268" data-template-options role="listbox" hidden></div></label><label>Transaction date<input class="je-input" type="date" data-date></label><label class="generator-wide258">General description<textarea class="je-input" rows="2" data-memo></textarea></label></div><div data-rates class="generator-rates258"></div><p>Enter the business amounts and dated rates. Generate fills the LAK valuation, mappings and applicable FX. Use the row rate when a fee or exchange has its own rate.</p><details data-history><summary>Compare posted journals</summary><input data-plain14285 data-history-query type="search" aria-label="Find a posted journal" placeholder="Journal ID, description or account"><div data-history-list></div><div data-history-entry></div></details><a href="docs/protocols/index.html#F02" target="_blank" rel="noopener">Journaling protocol</a><div data-matches></div><button type="button" class="je-btn je-btn-secondary" data-repair-layout hidden></button><div class="generator-table258"><table><thead><tr><th>#</th><th>Account</th><th>Line memo</th><th>Currency</th><th>Debit</th><th>Credit</th><th>ER / VR</th><th title="Book rate in LAK per foreign unit">BR · LAK/unit</th><th></th></tr></thead><tbody data-entry-lines></tbody></table></div><footer><button type="button" class="je-btn je-btn-secondary" data-add>Add line</button><button type="button" class="je-btn je-btn-secondary" data-generate>Generate</button><button type="button" class="je-btn je-btn-emerald" data-use disabled>Use in Post Entry</button></footer><p role="status" aria-live="polite" data-status></p>';
 dismissible(dialog);document.body.append(dialog);
 const history=dialog.querySelector('[data-history]');history.ontoggle=()=>{if(history.open)showHistory();};history.querySelector('input').oninput=showHistory;
 try{render();}catch(e){close();showCenterStatus(e.message,true);return;}
 dialog.querySelector('[data-template]').onchange=e=>selectTemplate(e.target.value);
 const query=dialog.querySelector('[data-template-query]'),list=dialog.querySelector('[data-template-options]');
 query.onfocus=()=>{query.select();templateChoices();};query.onclick=()=>{if(query.value===definitions().find(t=>t.id===state.template)?.name)query.select();templateChoices(query.value===definitions().find(t=>t.id===state.template)?.name?'':query.value);};query.oninput=()=>templateChoices(query.value);
 query.onkeydown=e=>{if(e.key==='Escape'&&!list.hidden){e.preventDefault();e.stopPropagation();list.hidden=true;query.setAttribute('aria-expanded','false');}else if(e.key==='ArrowDown'){e.preventDefault();if(list.hidden)templateChoices();list.querySelector('button')?.focus();}else if(e.key==='Enter'){e.preventDefault();if(list.querySelectorAll('button').length===1)list.querySelector('button').click();}};
 list.onkeydown=e=>{const buttons=[...list.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();buttons[(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();list.hidden=true;query.focus();list.hidden=true;query.setAttribute('aria-expanded','false');}};
 dialog.addEventListener('pointerdown',e=>{if(!e.target.closest('.generator-template268')){list.hidden=true;query.setAttribute('aria-expanded','false');}});
 dialog.querySelector('[data-date]').onchange=e=>{state.date=e.target.value;invalidate();for(const line of state.rows)if(line.autoBook||!line.book_rate_lak)void suggestBook292(line);};dialog.querySelector('[data-memo]').oninput=e=>{state.memo=e.target.value;invalidate();if(state.template==='blank')relatedTemplates(suggestions());};
 dialog.querySelector('[data-add]').onclick=()=>{state.rows.push(blank());invalidate();renderRows();};dialog.querySelector('[data-generate]').onclick=()=>void calculate();dialog.querySelector('[data-use]').onclick=()=>void useEntry();dialog.showModal();suggestSourceBooks();if(state.template==='blank'&&state.memo)relatedTemplates(suggestions());
}
function ready(){
 const button=document.createElement('button');button.type='button';button.id='generateJournal258';button.className='je-btn je-btn-secondary';button.textContent='Generate';button.onclick=open;$('addEntryRow14271')?.after(button);
 const style=document.createElement('style');style.textContent='#journalGenerator258{position:fixed;inset:0;margin:auto;transform:none;max-width:calc(100vw - 24px);width:min(1280px,calc(100vw - 24px));max-height:calc(100dvh - 24px);box-sizing:border-box;overflow:auto;border:1px solid #b9cfc2;border-radius:8px;padding:18px;background:#fff;color:#18392e}#journalGenerator258:not([open]){display:none!important}#journalGenerator258 .generator-template268{position:relative}#journalGenerator258 [data-template-options]{position:absolute;top:100%;left:0;right:0;max-height:260px;overflow:auto;z-index:3;background:#fffdf7;border:1px solid #98b3a2;box-shadow:0 6px 18px #0002}#journalGenerator258 [data-template-options][hidden]{display:none}#journalGenerator258 [data-template-options] button{display:block;width:100%;text-align:left;padding:9px;border:0;background:transparent;color:inherit;cursor:pointer;font-size:13px}#journalGenerator258 [data-template-options] button:hover,#journalGenerator258 [data-template-options] button:focus{background:#e4f1e7}#journalGenerator258 [data-matches]{display:flex;flex-wrap:wrap;gap:6px;font-size:13px}#journalGenerator258::backdrop{background:#0006}#journalGenerator258 header,#journalGenerator258 footer{display:flex;align-items:center;gap:8px;justify-content:space-between}#journalGenerator258 h3{margin:0 0 12px}#journalGenerator258 footer{justify-content:flex-end;flex-wrap:wrap;margin-top:14px}#journalGenerator258 .je-btn{height:32px;min-height:32px}#journalGenerator258 .generator-meta258{display:grid;grid-template-columns:2fr 1fr;gap:12px}#journalGenerator258 label{display:flex;flex-direction:column;gap:5px;font-size:13px;min-width:0}#journalGenerator258 .generator-wide258{grid-column:1/-1}#journalGenerator258 input,#journalGenerator258 select,#journalGenerator258 textarea{box-sizing:border-box;width:100%;color:inherit;background:#fff}#journalGenerator258 .generator-rates258{display:flex;flex-wrap:wrap;gap:12px;margin-top:12px}#journalGenerator258 .generator-rates258 label{width:180px}#journalGenerator258 p{font-size:13px;line-height:1.4}#journalGenerator258 .generator-table258{overflow:auto}#journalGenerator258 table{border-collapse:collapse;min-width:1070px;width:100%;font-size:12px}#journalGenerator258 th,#journalGenerator258 td{padding:6px;border-bottom:1px solid #d6e1da;text-align:left}#journalGenerator258 th{background:#eff5f1}#journalGenerator258 th:nth-child(2){width:29%}#journalGenerator258 th:nth-child(3){width:20%}#journalGenerator258 td input{border:0;background:transparent;padding:6px;min-width:92px}#journalGenerator258 td:nth-child(n+5) input{text-align:right}#journalGenerator258 td .account-search1428{border:0!important;background:transparent!important;box-shadow:none!important}#journalGenerator258 td select{border:0;background:transparent;min-width:250px}#journalGenerator258 [data-status]{white-space:pre-wrap;color:#235d44}#journalGenerator258 [data-status].has-error258{color:#9f2e24}@media(max-width:650px){#journalGenerator258{padding:12px}#journalGenerator258 .generator-meta258{grid-template-columns:1fr}}';document.head.append(style);
 const context=()=>{button.hidden=!!window.personalJournal1437?.active;const locked=$('loginGate')&&!$('loginGate').classList.contains('is-authenticated');if(dialog&&(owner!==who()||locked||window.personalJournal1437?.active)){close();state=null;verified='';}};
 window.addEventListener('page113',context);window.addEventListener('local-work14333',context);document.addEventListener('visibilitychange',context);new MutationObserver(context).observe($('loginGate')||document.body,{attributes:true,attributeFilter:['class','hidden']});
 // The shared editor moves into personal workspaces after page navigation.
 const card=$('journalEntry98');if(card)new MutationObserver(context).observe(card,{attributes:true,attributeFilter:['data-personal-owner1437']});
 style.textContent+='#generateJournal258[hidden]{display:none!important}#journalGenerator258>header{position:sticky;top:-1px;background:#fff;z-index:4}#journalGenerator258 [data-close]{min-height:44px;touch-action:manipulation}#journalGenerator258{inset:auto;left:var(--feedback-left14295,0px);top:var(--feedback-top14295,0px);right:calc(100% - var(--feedback-left14295,0px) - var(--feedback-width14295,100%));bottom:calc(100% - var(--feedback-top14295,0px) - var(--feedback-height14295,100%));transform:none;margin:auto;width:min(1280px,calc(var(--feedback-width14295,100vw) - 24px));max-height:calc(var(--feedback-height14295,100dvh) - 24px)}#journalGenerator258 [data-history-list]{display:flex;gap:4px;flex-wrap:wrap}#journalGenerator258 details{margin:8px 0}#journalGenerator258 small{display:block}';context();
}
window.GuidedJournal258={open};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();

