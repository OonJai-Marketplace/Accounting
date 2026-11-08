/* Template journal completion. No posting, IDs, inferred taxes or balancing plugs. */
((root)=>{'use strict';
const currency=a=>a?.currency||a?.currency_code;
const type=a=>String(a?.baseType||a?.account_type||a?.type||'').toUpperCase();
const technical=a=>!!(a?.isTechnical||a?.is_technical||a?.type==='SYSTEM');
const available=a=>a?.id&&a.isPosting!==false&&a.is_posting!==false&&a.active!==false&&a.is_active!==false&&/^[A-Z]{3}$/.test(currency(a)||'')&&currency(a)!=='NA';
const fund=a=>available(a)&&type(a)==='ASSET'&&!technical(a)&&/^10\d{2}$/.test(String(a.code));
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
 const cashNeeds=new Map();
 function carry(l){
  const b=balances[l.a.id];
  if(l.specified>0)return l.specified;
  if(fund(l.a)&&b?.rate>0)return b.rate;
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
  for(const l of active.filter(l=>!reg.maps.has(l.a.id))){
   if(reg.isTax(l.a)){l.book=l.rt;continue;}
   if(l.credit>0&&fund(l.a)||l.debit>0&&(staff(l.a)||type(l.a)==='LIABILITY')||l.credit>0&&!fund(l.a)&&!staff(l.a)&&type(l.a)==='ASSET')l.book=carry(l);else l.book=l.specified||l.rt;
   if(fund(l.a)&&l.credit>0)cashNeeds.set(l.a.id,(cashNeeds.get(l.a.id)||0)+l.credit);
  }
  const outs=active.filter(l=>fund(l.a)&&l.credit>0),outQ=outs.reduce((n,l)=>n+l.credit,0),outValue=outs.reduce((n,l)=>n+round(l.credit*(l.book||0)),0),otherDr=active.filter(l=>!reg.maps.has(l.a.id)&&!fund(l.a)&&!reg.isTax(l.a)).reduce((n,l)=>n+l.debit,0),mapDr=maps.reduce((n,l)=>n+l.debit,0),cashPart=Math.max(0,Math.min(mapDr,outQ-otherDr));
  const historical=active.filter(l=>l.credit>0&&!fund(l.a)&&!monetary(l.a)&&!technical(l.a));
  for(const l of maps){
   const m=reg.maps.get(l.a.id);if(!m.actual||!m.offset){error('Row '+(l.index+1)+': required LAK accounts '+m.actualCode+' / '+m.offsetCode+' are missing.',l.index);continue;}
   l.book=l.specified||(l.debit>0&&cashPart?(cashPart*(outs.length===1?outs[0].book:outValue/outQ)+(mapDr-cashPart)*l.rt)/mapDr:l.rt);
   if(historical.length){if(historical.length!==1||maps.length!==1){error('Use each historical asset lot and its recorded rate separately.',l.index);continue;}l.book=historical[0].book;l.rt=l.book;}
   if(m.offsetCode==='9390'&&!active.some(x=>fund(x.a))){if(!l.specified){error('Row '+(l.index+1)+': enter the original contribution book rate.',l.index,true);continue;}l.rt=l.book;}
   if(l.book>0){add(m.actual,round(signed(l)*l.rt),l.a.name+' · '+Math.abs(signed(l))+' '+c+' × '+displayRate(l.rt));add(m.offset,-round(signed(l)*l.book),l.a.name+' · recorded foreign value');}
  }
  for(const l of tax)add(reg.bridge('LAK',true),-round(signed(l)*l.rt),'Payroll withholding · '+Math.abs(signed(l))+' '+c+' × '+displayRate(l.rt));
 }
 const taxValue=round(foreign.filter(l=>reg.isTax(l.a)&&(l.debit||l.credit)).reduce((n,l)=>n-signed(l)*l.rt,0));
 if(taxValue){const liabilities=rows.filter(l=>l.a&&l.c==='LAK'&&['2111','2112'].includes(String(l.a.code))),blank=liabilities.filter(l=>!l.debit&&!l.credit),entered=liabilities.reduce((n,l)=>n+l.credit-l.debit,0),employer=source.filter(l=>l.c==='LAK'&&['5211','5212'].includes(String(l.a.code))).reduce((n,l)=>n+l.debit-l.credit,0);if(blank.length===1&&taxValue+employer-entered>0)add(blank[0].a,-round(taxValue+employer-entered),'Entered employee withholding and employer obligation');else if(!close(entered-employer,taxValue))error('Choose and allocate the PIT / SSO payable amounts. Withholding cannot be assigned to a tax account automatically.');}
 for(const [id,q] of cashNeeds){const b=balances[id];if(b&&Number.isFinite(b.quantity)&&b.quantity<q-.005)error('The recorded '+currency(reg.all.find(a=>a.id===id))+' funds do not cover all entered payments.');}
 if(errors.length)return {errors};
 const active=foreign.filter(l=>l.debit||l.credit),maps=active.filter(l=>reg.maps.has(l.a.id));
 const real=source.filter(l=>!technical(l.a)&&(l.debit||l.credit)),cash=real.filter(l=>fund(l.a)),out=cash.filter(l=>l.credit>0),incoming=cash.filter(l=>l.debit>0),settled=real.filter(l=>!fund(l.a)&&l.debit>0&&(staff(l.a)||type(l.a)==='LIABILITY'));
 const sameTransfer=!maps.length&&real.length===cash.length&&new Set(cash.map(l=>l.c)).size===1;
 if(sameTransfer){if(!close(sum(cash),0))error('Transfer debits and credits must match. Record an actual fee separately.');else{const q=out.reduce((n,l)=>n+l.credit,0),v=out.reduce((n,l)=>n+round(l.credit*(l.book||1)),0);for(const l of incoming)if(l.c!=='LAK')l.book=v/q;}}
 const econ=new Map(active.map(l=>[l,round(signed(l)*(sameTransfer?l.book:l.rt))]));
 if(!maps.length&&!sameTransfer&&incoming.length&&real.length===cash.length&&out.length){
  const received=round(incoming.reduce((n,l)=>n+l.debit*(l.c==='LAK'?1:l.rt),0)),paid=out.reduce((n,l)=>n+l.credit*(l.c==='LAK'?1:l.rt),0);
  for(const l of out)if(l.c!=='LAK')econ.set(l,-round(received*l.credit*l.rt/paid));
  if(out.some(l=>l.c==='LAK')&&!close(paid,received))error('The LAK payment and receipt rate disagree. Check the actual exchange rate.');
 }else if(!maps.length&&settled.length&&real.length===out.length+settled.length&&new Set(real.map(l=>l.c)).size>1&&settled.every(l=>l.c!=='LAK')){
  const paid=round(out.reduce((n,l)=>n+l.credit*(l.c==='LAK'?1:l.rt),0)),owed=settled.reduce((n,l)=>n+l.debit*l.rt,0);for(const l of settled)econ.set(l,round(paid*l.debit*l.rt/owed));
 }else if(!maps.length&&real.filter(l=>!fund(l.a)).every(l=>l.c==='LAK'&&l.debit>0)&&out.length&&real.length===out.length+real.filter(l=>!fund(l.a)).length){
  const discharged=round(real.filter(l=>!fund(l.a)).reduce((n,l)=>n+l.debit,0)),paid=out.reduce((n,l)=>n+l.credit*(l.c==='LAK'?1:l.rt),0);for(const l of out)if(l.c!=='LAK')econ.set(l,-round(discharged*l.credit*l.rt/paid));
 }
 if(!maps.length&&new Set(real.map(l=>l.c)).size===1&&!close(sum(active),0))error('The entered foreign debits and credits differ. Correct the business amounts before generating.');
 const bridges=new Map();
 for(const l of active){if(!(l.book>0)){error('Row '+(l.index+1)+' needs a recorded rate.',l.index,true);continue;}const k=[...bridges.keys()].find(k=>bridges.get(k).c===l.c&&Math.abs(bridges.get(k).book-l.book)<1e-8)||l.c+'|'+l.book,b=bridges.get(k)||{c:l.c,book:l.book,rt:l.rt,n:0};b.n=round(b.n-signed(l));bridges.set(k,b);l.book_rate_lak=l.book;l.fx_rate_lak=l.rt;l.autoBook=!l.specified;}
 let bridgeValue=0;
 for(const b of bridges.values())if(b.n){const a=reg.bridge(b.c);if(!a)error('The '+b.c+' exchange bridge is missing from the chart.');else{add(a,b.n,'Foreign settlement · recorded value',b.rt,b.book);bridgeValue=round(bridgeValue+round(b.n*b.book));}}
 const components=[];
 for(const l of active.filter(l=>!technical(l.a)&&monetary(l.a))){const n=round((econ.get(l)??signed(l)*l.rt)-round(signed(l)*l.book));if(n){components.push({l,n});add(reg.byCode('5419'),n,(fund(l.a)?'Cash disposal FX':'Balance settlement FX')+' · '+l.a.name+' · '+(n>0?'loss':'gain'));}}
 if(bridgeValue){if(!maps.length&&!real.some(l=>l.c==='LAK')&&close(components.reduce((n,x)=>n+x.n,0),bridgeValue))for(const x of components)add(reg.bridge('LAK'),-x.n,'Settlement valuation · '+x.l.a.name);else add(reg.bridge('LAK'),-bridgeValue,'Exchange / settlement · LAK valuation');}
 if(errors.length)return {errors};
 const localRows=source.filter(l=>l.c==='LAK'&&(l.debit||l.credit)),localSeparate=localRows.length>0&&close(sum(localRows),0)&&!localRows.some(l=>technical(l.a)||String(l.a.code)==='5419');
 const buckets=new Map(),used=new Set(),result=rows.map(l=>({...l}));
 for(const e of expected){const a=reg.all.find(a=>a.id===e.account_id),k=e.account_id+'|'+(currency(a)==='LAK'?'':e.book_rate_lak),b=buckets.get(k)||{a,items:[],n:0};b.items.push(e);b.n=round(b.n+e.debit-e.credit);buckets.set(k,b);}
 for(const b of buckets.values()){
  const e=b.items[0],candidates=result.filter(l=>l.a?.id===b.a.id&&(currency(b.a)==='LAK'||Number(l.book_rate_lak||l.specified)?currency(b.a)==='LAK'||Math.abs(Number(l.book_rate_lak||l.specified)-e.book_rate_lak)<1e-8:!signed(l)||Math.sign(signed(l))===Math.sign(b.n))&&(l.generated==='output'||currency(b.a)==='LAK'||reg.isBridge(l.a))),manual=candidates.filter(l=>l.generated!=='output'&&(l.debit||l.credit)&&!(localSeparate&&!technical(l.a))),blank=candidates.filter(l=>l.generated==='output'||!l.debit&&!l.credit),entered=sum(manual);
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
function templates(chart){
 const g=G();if(!g)return [];const reg=g.registry(chart),out=[];
 const row=(a,side,memo)=>({code:String(a.code),currency:g.currency(a),memo: memo||a.name,side});
 const slot=(role,currency,side,memo)=>({role,currency,side,memo});
 const add=(id,name,lines,autoMatch=true)=>out.push({id:'gen268-'+id,name,builtin:true,lines,generalMemo:'',autoMatch});
 for(const [id,m] of reg.maps){
  const a=reg.all.find(a=>a.id===id),c=g.currency(a);if(!m.actual||!m.offset)continue;
  const expense=g.type(m.actual)==='EXPENSE',asset=g.type(m.actual)==='ASSET';
  const name=String(m.actual.name||m.actual.code).replace(/\s*[—–-]?\s*LAK\s*$/i,'').trim();
  if(String(m.actual.code)==='5311'){
   add('payroll-'+c,'Salary accrual · '+c,[row(a,'debit','Gross salary'),slot('staff',c,'credit','Net salary owed')]);
   const tax=reg.bridge(c,true),pit=reg.byCode('2111'),sso=reg.byCode('2112');
   if(tax&&pit)add('payroll-pit-'+c,'Salary accrual with PIT · '+c,[row(a,'debit','Gross salary'),slot('staff',c,'credit','Net salary owed'),row(tax,'credit','Employee PIT withholding'),row(pit,'credit','PIT payable')],false);
   if(tax&&pit&&sso)add('payroll-tax-sso-'+c,'Salary accrual with PIT and SSO · '+c,[row(a,'debit','Gross salary'),slot('staff',c,'credit','Net salary owed'),row(tax,'credit','Employee withholding'),row(pit,'credit','PIT payable — enter the allocation'),row(sso,'credit','SSO payable — enter the allocation')],false);
   continue;
  }
  add('mapping-'+a.code+'-'+c,name+' · '+c+(expense?' payment':asset?' purchase':' receipt'),expense||asset?[row(a,'debit'),slot('fund',c,'credit','Cash / bank payment')]:[slot('fund',c,'debit','Cash / bank receipt'),row(a,'credit')]);
  const fee=[...reg.maps].find(([id,m])=>String(m.actual?.code)==='5414'&&g.currency(reg.all.find(a=>a.id===id))===c);
  if(expense&&String(m.actual.code)!=='5414'&&fee){const feeAccount=reg.all.find(a=>a.id===fee[0]);add('fee-'+a.code+'-'+c,name+' with bank fee · '+c,[row(a,'debit'),row(feeAccount,'debit','Separate bank fee'),slot('fund',c,'credit','Total paid including bank fee')],false);}
 }
 const salaries=[...reg.maps].filter(([,m])=>String(m.actual?.code)==='5311').map(([id])=>reg.all.find(a=>a.id===id));
 if(salaries.length>1)add('mixed-payroll','Salary accrual · mixed currencies',salaries.flatMap(a=>[row(a,'debit','Gross salary'),slot('staff',g.currency(a),'credit','Net salary owed')]),false);
 const currencies=[...new Set(reg.all.filter(g.fund).map(g.currency))].sort();
 for(const c of currencies){
  add('transfer-'+c,'Cash / bank transfer · '+c,[slot('fund',c,'debit','Receiving fund'),slot('fund',c,'credit','Paying fund')],false);
  add('settlement-'+c,'Pay salary or existing balance · '+c,[slot('balance',c,'debit','Balance payment'),slot('fund','', 'credit','Cash / bank payment')],false);
  for(const to of currencies.filter(x=>x!==c))add('exchange-'+c+'-'+to,'Currency exchange · '+c+' to '+to,[slot('fund',c,'credit','Amount paid'),slot('fund',to,'debit','Amount received')],false);
 }
 if(currencies.includes('LAK')){
  for(const [code,label] of [['2111','PIT'],['2112','SSO']]){
   const payable=reg.byCode(code,'LAK');
   if(payable&&g.type(payable)==='LIABILITY')add('remit-'+label,label+' payment · whole kip',
    [row(payable,'debit',label+' liability to settle'),slot('fund','LAK','credit','Government payment')],false);
  }
 }
 for(const a of reg.all.filter(a=>g.currency(a)==='LAK'&&!g.technical(a)&&['EXPENSE','REVENUE','EQUITY'].includes(g.type(a))&&String(a.code)!=='5419')){
  const expense=g.type(a)==='EXPENSE';add('local-'+a.code,a.name+' · LAK '+(expense?'payment':'receipt'),expense?[row(a,'debit'),slot('fund','LAK','credit','Paying fund')]:[slot('fund','LAK','debit','Receiving fund'),row(a,'credit')]);
 }
 // Releases consume the prepaid asset; they do not repeat the original payment.
 for(const [id,name,expense,prepaid,c] of [['wifi','Prepaid Wi-Fi amortization','5110','1311','LAK'],['rent','Prepaid company house rent amortization','5421','1310','LAK'],['restaurant','Prepaid restaurant rent amortization','9222','1312','THB']]){
  const e=reg.byCode(expense,c),p=reg.byCode(prepaid,c);
  if(!p)continue;
  const debit=e&&g.type(e)==='EXPENSE'?row(e,'debit','Monthly prepaid expense'):null;
  if(debit||id==='rent')add('amortization-'+id,name+' · '+c,[debit||slot('expense',c,'debit','Company house rent expense'),row(p,'credit','Release prepaid balance')]);
 }
 add('amortization-insurance','Prepaid insurance amortization · LAK',[slot('expense','LAK','debit','Insurance expense'),slot('prepaid','LAK','credit','Release prepaid insurance')],false);
 add('amortization-other','Other prepaid amortization · LAK',[slot('expense','LAK','debit','Prepaid expense allocation'),slot('prepaid','LAK','credit','Release prepaid balance')],false);
 return out;
}
function accepts(line,a){const g=G();return !!a&&(!line.currency||line.currency===g.currency(a))&&(line.role==='fund'?g.fund(a):line.role==='staff'?g.staff(a):line.role==='balance'?g.staff(a)||g.type(a)==='LIABILITY':line.role==='prepaid'?g.type(a)==='ASSET'&&/^13\d\d$/.test(String(a.code)):line.role==='expense'?g.type(a)==='EXPENSE'&&!g.technical(a):false);}
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
 const result=rows.map(l=>({...l})),used=new Set();
 for(const [i,line] of (template.lines||[]).entries()){
  const a=resolve(line,chart),index=result.findIndex((l,j)=>!used.has(j)&&l.account_id&&(!line.side||!Number(l.debit)&&!Number(l.credit)||Number(l[line.side])>0)&&(a?.id===l.account_id||accepts(line,chart.find(a=>a.id===l.account_id))));
  if(index>=0){used.add(index);continue;}
  const empty=result.findIndex((l,j)=>!used.has(j)&&!l.account_id&&!l.line_memo&&!l.debit&&!l.credit),next=makeRows(template)[i];
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
const display=v=>typeof v==='number'?v.toLocaleString(typeof appNumberLocale==='function'?appNumberLocale():'en-US',{useGrouping:false,maximumFractionDigits:12}):v??'';
const offline=()=>!navigator.onLine||window.offline14239?.offline()||window.sessionCache14333?.localMode;
const blank=()=>({account_id:'',line_memo:'',debit:'',credit:''});
function eligible(){if(!who())throw Error('Sign in before preparing an entry.');if(window.personalJournal1437?.active||window.workspaceRequest138?.target)throw Error('Open the main company journal to use this generator.');if(!window.access113?.can('journal','edit')&&!window.access113?.can('journal','post'))throw Error('Journal editing permission is required.');if(window.DriveDrafts143128?.preparedCount||window.DriveDrafts143128?.editing||pendingWorkspacePostOwnerId||pendingWorkspacePostJournalId)throw Error('Finish the prepared entries before using this generator.');}
function persist(){if(owner!==who()||!state)return;try{localStorage.setItem(key(),JSON.stringify(state));storageWarning='';}catch{storageWarning='This draft could not be saved on this device. Keep the window open until it is copied to Post Entry.';}}
function invalidate(){revision++;verified='';if(dialog){dialog.querySelector('[data-use]').disabled=true;dialog.querySelector('[data-status]').textContent='';}persist();}
function definitions(){
 const saved=typeof availableTransactionTemplates==='function'?availableTransactionTemplates():[];
 return [{id:'blank',name:'Enter manually — detect template',lines:[{},{}]},...saved];
}
function templateRows(t){return (t.lines||[]).map(l=>{const a=l.code?chart().find(a=>String(a.code)===String(l.code)&&G.currency(a)===l.currency):l.accountId?chart().find(a=>a.id===l.accountId):typeof resolveTemplateAccount14397==='function'?resolveTemplateAccount14397(l):null;return {...blank(),account_id:a?.id||'',line_memo:l.memo||'',role:l.role,expectedCurrency:l.currency,expectedSide:l.side,missing:!a&&(l.accountId||l.account||l.code)?String(l.account||l.code||l.accountId):''};});}
function selectTemplate(id){
 state.drafts[state.template]={rows:state.rows,memo:state.memo,rates:state.rates};
 const previous=state.drafts[id],t=definitions().find(t=>t.id===id);if(!t)return;
 Object.assign(state,previous||{rows:templateRows(t),memo:t.generalMemo||'',rates:{}},{template:id});invalidate();render();
}
function message(text,error=false){const host=dialog?.querySelector('[data-status]');if(host){host.textContent=text+(storageWarning?' '+storageWarning:'');host.classList.toggle('has-error258',error);}}
function close(){
 const previous=dialog;if(!previous)return;revision++;job?.end?.();job=null;busy=false;verified='';
 window.dropdown1434?.close();dialog=null;previous.close();previous.remove();persist();
 $('generateJournal258')?.focus({preventScroll:true});
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
 const apply=t=>{state.rows=Catalog.merge(state.rows,t,chart(),templateRows);invalidate();renderRows();renderRates();};
 if(matches.length===1){apply(matches[0]);return 'Matched '+matches[0].name+'. ';}
 if(matches.length>1){host.append('Several templates fit. Choose one to add its missing lines: ');for(const t of matches){const b=document.createElement('button');b.type='button';b.className='je-btn je-btn-secondary';b.textContent=t.name;b.onclick=()=>{apply(t);host.replaceChildren();message('Matched '+t.name+'. Review the accounts and press Generate.');};host.append(b);}}
 return '';
}
function renderRates(){
 const host=dialog.querySelector('[data-rates]'),cs=[...new Set(state.rows.map(l=>chart().find(a=>a.id===l.account_id)).filter(Boolean).map(G.currency).filter(c=>c!=='LAK'))].sort();
 for(const n of [...host.children])if(!cs.includes(n.dataset.currency))n.remove();
 for(const c of cs)if(![...host.children].some(n=>n.dataset.currency===c)){const label=document.createElement('label');label.dataset.currency=c;label.textContent='ER · LAK per 1 '+c;const n=document.createElement('input');n.className='je-input';n.inputMode='decimal';n.setAttribute('aria-label','LAK per 1 '+c);bindAppRateInput(n,state.rates[c]??'');n.oninput=()=>{state.rates[c]=n.value;for(const l of state.rows)if(G.currency(chart().find(a=>a.id===l.account_id))===c)delete l.fx_rate_lak;invalidate();};label.append(n);host.append(label);}
}
const bookRequests292=new WeakMap();
async function suggestBook292(line){
 const account=chart().find(a=>a.id===line.account_id),date=state.date,actor=who();
 if(!account||G.currency(account)==='LAK'||!window.AccountRates143186)return;
 const request={};bookRequests292.set(line,request);
 const book=await AccountRates143186.bookRateFor(account,date);
 if(bookRequests292.get(line)!==request||actor!==who()||date!==state.date||account.id!==line.account_id||!dialog?.open||!state.rows.includes(line)||line.book_rate_lak&&!line.autoBook)return;
 line.book_rate_lak=book||'';line.autoBook=true;
 const input=dialog.querySelector('[data-row="'+state.rows.indexOf(line)+'"] [data-field=book_rate_lak]');
 if(input&&document.activeElement!==input)bindAppRateInput(input,line.book_rate_lak);
 invalidate();persist();
}
function renderRows(){
 const body=dialog.querySelector('tbody'),accounts=chart(),options=accounts.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.code+' — '+a.name+' · '+G.currency(a))+'</option>').join('');body.replaceChildren();
 state.rows.forEach((l,i)=>{
  const a=chart().find(a=>a.id===l.account_id),tr=document.createElement('tr');tr.dataset.row=i;
  tr.innerHTML='<td>'+(i+1)+'</td><td><select class="je-select" aria-label="Account row '+(i+1)+'"><option value="">Choose account</option>'+options+'</select></td><td><input aria-label="Memo row '+(i+1)+'" data-field="line_memo" value="'+esc(l.line_memo)+'"></td><td data-currency>'+esc(a?G.currency(a):'')+'</td>'+['debit','credit','book_rate_lak'].map(k=>'<td><input inputmode="decimal" aria-label="'+({debit:'Debit',credit:'Credit',book_rate_lak:'Book rate'}[k])+' row '+(i+1)+'" data-field="'+k+'" value="'+esc(display(l[k]||''))+'"'+(k==='book_rate_lak'&&(!a||G.currency(a)==='LAK')?' disabled':'')+'></td>').join('')+'<td><button type="button" class="je-btn je-btn-secondary" aria-label="Delete row '+(i+1)+'">×</button></td>';
  const bookField=tr.querySelector('[data-field=book_rate_lak]');bindAppRateInput(bookField,l.book_rate_lak??'');
  const select=tr.querySelector('select');select.value=l.account_id;select.onchange=()=>{l.account_id=select.value;l.missing='';delete l.generated;delete l.book_rate_lak;delete l.fx_rate_lak;delete l.autoBook;invalidate();renderRows();renderRates();void suggestBook292(l);};
  for(const n of tr.querySelectorAll('[data-field]'))n.oninput=()=>{l[n.dataset.field]=n.value;if(n.dataset.field==='line_memo')delete l.autoMemo;if(['debit','credit'].includes(n.dataset.field))delete l.generated;if(n.dataset.field==='book_rate_lak'){bookRequests292.delete(l);delete l.autoBook;delete l.generated;}invalidate();};
  tr.querySelector('button').onclick=()=>{state.rows.splice(i,1);if(!state.rows.length)state.rows.push(blank());invalidate();renderRows();renderRates();};body.append(tr);
 });
}
function render(){
 dialog.querySelector('[data-template]').value=state.template;dialog.querySelector('[data-date]').value=state.date;dialog.querySelector('[data-memo]').value=state.memo;
 dialog.querySelector('[data-template-query]').value=definitions().find(t=>t.id===state.template)?.name||'';
 dialog.querySelector('[data-rates]').replaceChildren();renderRates();renderRows();dialog.querySelector('[data-use]').disabled=true;
 const missing=state.rows.filter(l=>l.missing);if(missing.length)message('Choose current accounts for these saved template lines: '+missing.map(l=>l.missing).join(', '),true);
}
function readInput(){return {date:state.date,chart:chart(),rates:Object.fromEntries(Object.entries(state.rates).map(([c,v])=>[c,number(v)])),rows:state.rows.map(l=>({...l,debit:number(l.debit),credit:number(l.credit),book_rate_lak:number(l.book_rate_lak),fx_rate_lak:number(l.fx_rate_lak)}))};}
function fingerprint(){return JSON.stringify([who(),window.OJM_SUPABASE_URL,JournalModule.editingEntryId,state,snapshotJournal69(),$('jeGeneralMemo')?.value,$('jeTransDate')?.value]);}
async function balances(input){
 const explicitPrepaid=({l,a})=>a&&/^13\d\d$/.test(String(a.code))&&G.type(a)==='ASSET'&&!G.technical(a)&&l.credit>0&&l.book_rate_lak>0;
 const source=input.rows.filter(l=>l.generated!=='output').map(l=>({l,a:input.chart.find(a=>a.id===l.account_id)}));
 const needs=source.filter(x=>!explicitPrepaid(x)).filter(({l,a})=>a&&G.currency(a)!=='LAK'&&(G.fund(a)&&!l.debit||(l.debit>0||!l.debit&&!l.credit)&&(G.staff(a)||G.type(a)==='LIABILITY')||l.credit>0&&!G.technical(a)&&!G.fund(a)&&!G.staff(a)&&G.type(a)==='ASSET'));
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
  if(G.fund(a)&&values[a.id])for(const r of document.querySelectorAll('#jeLinesBody tr'))if(getSelectedAccountInfo(r.querySelector('.je-line-acc')?.value)?.id===a.id){if(parseCleanNumber(r.querySelector('.je-line-dr')?.value)>0)throw Error('Post Entry already receives money into '+a.name+'. Finish that transaction before using its new book value.');values[a.id].quantity-=parseCleanNumber(r.querySelector('.je-line-cr')?.value);}
 }
 return {values,note:estimated?'Device book-value estimate. Recheck after synchronization.':'Recorded account balances checked.'};
}
function showErrors(errors){message(errors.map(e=>(e.row!=null?'Row '+(e.row+1)+': ':'')+e.message.replace(/^Row \d+: /,'')).join('\n'),true);const book=errors.find(e=>e.needsBook&&e.row!=null);if(book)dialog.querySelector('[data-row="'+book.row+'"] [data-field="book_rate_lak"]')?.focus({preventScroll:true});}
async function calculate(){
 if(busy)return;const detected=detect();busy=true;verified='';dialog.querySelector('[data-use]').disabled=true;const actor=who(),rev=revision,before=fingerprint(),end=window.actionFeedback14296?.begin(dialog.querySelector('[data-generate]'),'Generating journal…'),task=job={end};
 try{eligible();if(!state.memo.trim())throw Error('Enter the general description.');if(!/^\d{4}-\d{2}-\d{2}$/.test(state.date))throw Error('Choose the transaction date.');const input=readInput();const missing=state.rows.findIndex(l=>!l.account_id&&(l.role||l.missing));if(missing>=0)throw Error('Row '+(missing+1)+': choose the '+(state.rows[missing].role||'missing')+' account before generating.');const b=await balances(input);if(!dialog?.open||actor!==who()||rev!==revision||before!==fingerprint())return;
  const result=G.complete({...input,balances:b.values});if(result.errors.length){verified='';dialog.querySelector('[data-use]').disabled=true;showErrors(result.errors);return;}
  state.rows=result.rows;persist();renderRows();renderRates();verified=JSON.stringify(readInput().rows);dialog.querySelector('[data-use]').disabled=false;message(detected+'Journal amounts filled. Review the debit and credit cells. '+b.note+(result.notes.length?' '+result.notes.join(' '):''));
 }catch(e){if(job===task&&actor===who()&&dialog?.open)message(e.message,true);}finally{if(job===task){busy=false;job=null;}end?.();}
}
async function useEntry(){
 if(busy||!verified)return;busy=true;const actor=who(),rev=revision,before=fingerprint(),end=window.actionFeedback14296?.begin(dialog.querySelector('[data-use]'),'Checking journal…'),task=job={end};
 try{eligible();const input=readInput();const missing=state.rows.findIndex(l=>!l.account_id&&(l.role||l.missing));if(missing>=0)throw Error('Row '+(missing+1)+': choose the '+(state.rows[missing].role||'missing')+' account before generating.');const b=await balances(input);if(!dialog?.open||actor!==who()||rev!==revision||before!==fingerprint())return;
  const result=G.complete({...input,balances:b.values});if(result.errors.length){showErrors(result.errors);verified='';dialog.querySelector('[data-use]').disabled=true;return;}
  if(JSON.stringify(result.rows)!==JSON.stringify(state.rows)){state.rows=result.rows;persist();renderRows();verified=JSON.stringify(readInput().rows);message('Recorded values changed. Review the updated debit and credit amounts, then use the journal again.',true);return;}
  const body=$('jeLinesBody'),memo=$('jeGeneralMemo'),oldMemo=memo.value,oldRates=JournalFX14383.capture(),oldDate=$('jeTransDate').value;
  const meaningful=r=>[...r.querySelectorAll('.je-line-acc,.je-line-memo,.je-line-dr,.je-line-cr')].some(n=>n.value.trim()),existing=[...body.children].some(meaningful);
  if(existing&&oldDate!==state.date)throw Error('Post Entry has an unfinished journal on another date. Finish it before copying this journal.');
  window.JournalUndo143103?.checkpoint();window.entry1430?.setMode('double');
  const oldRows=[...body.children];
  try{for(const r of oldRows)if(!meaningful(r))r.remove();if(!existing)$('jeTransDate').value=state.date;
   for(const l of result.rows.filter(l=>l.debit||l.credit)){const a=chart().find(a=>a.id===l.account_id);addJournalLineRow(a.code+' — '+a.name,l.line_memo,l.debit?display(l.debit):'',{[G.currency(a)]:l.credit?display(l.credit):''});const r=body.lastElementChild;r.dataset.fxRate14383=l.fx_rate_lak||number(state.rates[G.currency(a)])||1;r.dataset.bookRate14383=l.book_rate_lak||'';const date=r.querySelector('.je-line-date');if(date)date.value=state.date;}
   memo.value=existing&&oldMemo.trim()?oldMemo+'\n'+state.memo:state.memo;JournalFX14383.restore(existing?{...state.rates,...oldRates}:state.rates);calculateJournalBalance();memo.dispatchEvent(new Event('input',{bubbles:true}));window.dispatchEvent(new Event('save-state14234'));window.drafts1427?.flush();window.JournalUndo143103?.record();
  }catch(e){body.replaceChildren(...oldRows);memo.value=oldMemo;$('jeTransDate').value=oldDate;JournalFX14383.restore(oldRates);calculateJournalBalance();throw e;}
  delete state.drafts[state.template];state={template:'blank',date:state.date,memo:'',rates:{},rows:[blank(),blank()],drafts:state.drafts};persist();dialog.close();dialog.remove();dialog=null;verified='';showJournalEntry98();showCenterStatus('Completed journal copied. Review it, then use Post Entry when ready.');
 }catch(e){if(job===task&&actor===who()&&dialog?.open)message(e.message,true);}finally{if(job===task){busy=false;job=null;}end?.();}
}
function open(){
 try{eligible();if(typeof TemplateStore!=='undefined')TemplateStore.load();}catch(e){showCenterStatus(e.message,true);return;}
 if(dialog&&owner===who()){if(!dialog.open)dialog.showModal();return;}const retained=owner===who()&&state;owner=who();
 if(!retained)try{state=JSON.parse(localStorage.getItem(key())||'null');}catch{state=null;}
 if(!state||!Array.isArray(state.rows))state={template:'blank',date:$('jeTransDate').value,memo:'',rates:{},rows:[blank(),blank()],drafts:{}};
 state.drafts||={};state.rates||={};if(!definitions().some(t=>t.id===state.template))state.template='blank';
 dialog=document.createElement('dialog');dialog.id='journalGenerator258';dialog.setAttribute('aria-labelledby','generatorTitle258');
 dialog.innerHTML='<header><h3 id="generatorTitle258">Generate journal</h3><button type="button" class="je-btn je-btn-secondary" data-close>Close</button></header><div class="generator-meta258"><label class="generator-template268">Transaction template<input class="je-input" data-template-query data-plain14285 role="combobox" aria-label="Transaction template" aria-autocomplete="list" aria-expanded="false" aria-controls="generatorTemplates268" autocomplete="off"><select hidden data-plain14285 data-template>'+definitions().map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join('')+'</select><div id="generatorTemplates268" data-template-options role="listbox" hidden></div></label><label>Transaction date<input class="je-input" type="date" data-date></label><label class="generator-wide258">General description<textarea class="je-input" rows="2" data-memo></textarea></label></div><div data-rates class="generator-rates258"></div><p>Choose a template, or enter the accounts and amounts you know. Generate detects a matching template and fills the remaining amounts. Enter the original book rate for a partial balance payment.</p><div data-matches></div><div class="generator-table258"><table><thead><tr><th>#</th><th>Account</th><th>Line memo</th><th>Currency</th><th>Debit</th><th>Credit</th><th title="Book rate in LAK per foreign unit">BR · LAK/unit</th><th></th></tr></thead><tbody></tbody></table></div><footer><button type="button" class="je-btn je-btn-secondary" data-add>Add line</button><button type="button" class="je-btn je-btn-secondary" data-generate>Generate</button><button type="button" class="je-btn je-btn-emerald" data-use disabled>Use in Post Entry</button></footer><p role="status" aria-live="polite" data-status></p>';
 document.body.append(dialog);render();
 dialog.querySelector('[data-template]').onchange=e=>selectTemplate(e.target.value);
 const query=dialog.querySelector('[data-template-query]'),list=dialog.querySelector('[data-template-options]');
 query.onfocus=()=>{query.select();templateChoices();};query.onclick=()=>{if(query.value===definitions().find(t=>t.id===state.template)?.name)query.select();templateChoices(query.value===definitions().find(t=>t.id===state.template)?.name?'':query.value);};query.oninput=()=>templateChoices(query.value);
 query.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();list.hidden=true;query.setAttribute('aria-expanded','false');}else if(e.key==='ArrowDown'){e.preventDefault();if(list.hidden)templateChoices();list.querySelector('button')?.focus();}else if(e.key==='Enter'){e.preventDefault();if(list.querySelectorAll('button').length===1)list.querySelector('button').click();}};
 list.onkeydown=e=>{const buttons=[...list.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();buttons[(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();list.hidden=true;query.focus();list.hidden=true;query.setAttribute('aria-expanded','false');}};
 dialog.addEventListener('pointerdown',e=>{if(!e.target.closest('.generator-template268')){list.hidden=true;query.setAttribute('aria-expanded','false');}});
 dialog.querySelector('[data-date]').onchange=e=>{state.date=e.target.value;invalidate();for(const line of state.rows)if(line.autoBook||!line.book_rate_lak)void suggestBook292(line);};dialog.querySelector('[data-memo]').oninput=e=>{state.memo=e.target.value;invalidate();};
 dialog.querySelector('[data-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.querySelector('[data-add]').onclick=()=>{state.rows.push(blank());invalidate();renderRows();};dialog.querySelector('[data-generate]').onclick=()=>void calculate();dialog.querySelector('[data-use]').onclick=()=>void useEntry();dialog.showModal();
}
function ready(){
 const button=document.createElement('button');button.type='button';button.id='generateJournal258';button.className='je-btn je-btn-secondary';button.textContent='Generate';button.onclick=open;$('addEntryRow14271')?.after(button);
 const style=document.createElement('style');style.textContent='#journalGenerator258{position:fixed;inset:0;margin:auto;transform:none;max-width:calc(100vw - 24px);width:min(1280px,calc(100vw - 24px));max-height:calc(100dvh - 24px);box-sizing:border-box;overflow:auto;border:1px solid #b9cfc2;border-radius:8px;padding:18px;background:#fff;color:#18392e}#journalGenerator258:not([open]){display:none!important}#journalGenerator258 .generator-template268{position:relative}#journalGenerator258 [data-template-options]{position:absolute;top:100%;left:0;right:0;max-height:260px;overflow:auto;z-index:3;background:#fffdf7;border:1px solid #98b3a2;box-shadow:0 6px 18px #0002}#journalGenerator258 [data-template-options][hidden]{display:none}#journalGenerator258 [data-template-options] button{display:block;width:100%;text-align:left;padding:9px;border:0;background:transparent;color:inherit;cursor:pointer;font-size:13px}#journalGenerator258 [data-template-options] button:hover,#journalGenerator258 [data-template-options] button:focus{background:#e4f1e7}#journalGenerator258 [data-matches]{display:flex;flex-wrap:wrap;gap:6px;font-size:13px}#journalGenerator258::backdrop{background:#0006}#journalGenerator258 header,#journalGenerator258 footer{display:flex;align-items:center;gap:8px;justify-content:space-between}#journalGenerator258 h3{margin:0 0 12px}#journalGenerator258 footer{justify-content:flex-end;flex-wrap:wrap;margin-top:14px}#journalGenerator258 .je-btn{height:32px;min-height:32px}#journalGenerator258 .generator-meta258{display:grid;grid-template-columns:2fr 1fr;gap:12px}#journalGenerator258 label{display:flex;flex-direction:column;gap:5px;font-size:13px;min-width:0}#journalGenerator258 .generator-wide258{grid-column:1/-1}#journalGenerator258 input,#journalGenerator258 select,#journalGenerator258 textarea{box-sizing:border-box;width:100%;color:inherit;background:#fff}#journalGenerator258 .generator-rates258{display:flex;flex-wrap:wrap;gap:12px;margin-top:12px}#journalGenerator258 .generator-rates258 label{width:180px}#journalGenerator258 p{font-size:13px;line-height:1.4}#journalGenerator258 .generator-table258{overflow:auto}#journalGenerator258 table{border-collapse:collapse;min-width:1070px;width:100%;font-size:12px}#journalGenerator258 th,#journalGenerator258 td{padding:6px;border-bottom:1px solid #d6e1da;text-align:left}#journalGenerator258 th{background:#eff5f1}#journalGenerator258 th:nth-child(2){width:29%}#journalGenerator258 th:nth-child(3){width:20%}#journalGenerator258 td input{border:0;background:transparent;padding:6px;min-width:92px}#journalGenerator258 td:nth-child(n+5) input{text-align:right}#journalGenerator258 td .account-search1428{border:0!important;background:transparent!important;box-shadow:none!important}#journalGenerator258 td select{border:0;background:transparent;min-width:250px}#journalGenerator258 [data-status]{white-space:pre-wrap;color:#235d44}#journalGenerator258 [data-status].has-error258{color:#9f2e24}@media(max-width:650px){#journalGenerator258{padding:12px}#journalGenerator258 .generator-meta258{grid-template-columns:1fr}}';document.head.append(style);
 const context=()=>{button.hidden=!!window.personalJournal1437?.active;const locked=$('loginGate')&&!$('loginGate').classList.contains('is-authenticated');if(dialog&&(owner!==who()||locked||window.personalJournal1437?.active)){close();state=null;verified='';}};
 window.addEventListener('page113',context);window.addEventListener('local-work14333',context);document.addEventListener('visibilitychange',context);new MutationObserver(context).observe($('loginGate')||document.body,{attributes:true,attributeFilter:['class','hidden']});
 // The shared editor moves into personal workspaces after page navigation.
 const card=$('journalEntry98');if(card)new MutationObserver(context).observe(card,{attributes:true,attributeFilter:['data-personal-owner1437']});
 style.textContent+='#generateJournal258[hidden]{display:none!important}';context();
}
window.GuidedJournal258={open};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();

