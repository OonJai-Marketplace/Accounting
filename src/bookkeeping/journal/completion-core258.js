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
