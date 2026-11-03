/* Template journal completion. No posting, IDs, inferred taxes or balancing plugs. */
((root)=>{'use strict';
const currency=a=>a?.currency||a?.currency_code;
const type=a=>String(a?.baseType||a?.account_type||a?.type||'').toUpperCase();
const technical=a=>!!(a?.isTechnical||a?.is_technical||a?.type==='SYSTEM');
const available=a=>a?.id&&a.isPosting!==false&&a.is_posting!==false&&a.active!==false&&a.is_active!==false&&/^[A-Z]{3}$/.test(currency(a)||'')&&currency(a)!=='NA';
const fund=a=>available(a)&&type(a)==='ASSET'&&!technical(a)&&/^10\d{2}$/.test(String(a.code));
const staff=a=>/^12[12]\d$/.test(String(a.code));
const monetary=a=>fund(a)||staff(a)||type(a)==='LIABILITY'||/^11\d\d$/.test(String(a.code));
const round=n=>{if(!Number.isFinite(n)||Math.abs(n)>9e12)throw Error('An amount is too large to calculate safely.');return Math.sign(n)*Math.round((Math.abs(n)+Number.EPSILON)*100)/100;};
const close=(a,b)=>Math.abs(a-b)<.005;
const known={9101:['4010','9190','THB'],9102:['4010','9190','USD'],9111:['4110','9190','USD'],9112:['4110','9190','THB'],9121:['4120','9190','USD'],9131:['4130','9190','USD'],9132:['4130','9190','THB'],9201:['5010','9290','THB'],9202:['5010','9290','USD'],9211:['5111','9290','USD'],9212:['5111','9290','THB'],9222:['5119','9290','THB'],9231:['5311','9290','USD'],9232:['5311','9290','THB'],9233:['5315','9290','USD'],9234:['5315','9290','THB'],9241:['5414','9290','USD'],9242:['5414','9290','THB'],9311:['3023','9390','USD'],9312:['3023','9390','THB'],9321:['3024','9390','USD'],9322:['3024','9390','THB'],9331:['3031','9390','USD'],9332:['3031','9390','THB'],9411:['1310','9490','USD']};
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
   if(l.book>0){add(m.actual,round(signed(l)*l.rt),l.a.name+' · '+Math.abs(signed(l))+' '+c+' × '+l.rt);add(m.offset,-round(signed(l)*l.book),l.a.name+' · recorded foreign value');}
  }
  for(const l of tax)add(reg.bridge('LAK',true),-round(signed(l)*l.rt),'Payroll withholding · '+Math.abs(signed(l))+' '+c+' × '+l.rt);
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
/* A separate template draft. Only Use in Post Entry copies rows to the journal. */
(()=>{'use strict';
const $=id=>document.getElementById(id),G=window.JournalCompletion258,esc=v=>escapeHtml(String(v??''));
let dialog=null,owner='',state=null,busy=false,revision=0,verified='',storageWarning='';
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
 return [{id:'blank',name:'Blank journal',lines:[{},{}]},...saved];
}
function templateRows(t){return (t.lines||[]).map(l=>{const a=l.code?chart().find(a=>String(a.code)===String(l.code)&&G.currency(a)===l.currency):l.accountId?chart().find(a=>a.id===l.accountId):typeof resolveTemplateAccount14397==='function'?resolveTemplateAccount14397(l):null;return {...blank(),account_id:a?.id||'',line_memo:l.memo||'',missing:!a&&(l.accountId||l.account||l.code)?String(l.account||l.code||l.accountId):''};});}
function selectTemplate(id){
 state.drafts[state.template]={rows:state.rows,memo:state.memo,rates:state.rates};
 const previous=state.drafts[id],t=definitions().find(t=>t.id===id);if(!t)return;
 Object.assign(state,previous||{rows:templateRows(t),memo:t.generalMemo||'',rates:{}},{template:id});invalidate();render();
}
function message(text,error=false){const host=dialog?.querySelector('[data-status]');if(host){host.textContent=text+(storageWarning?' '+storageWarning:'');host.classList.toggle('has-error258',error);}}
function renderRates(){
 const host=dialog.querySelector('[data-rates]'),cs=[...new Set(state.rows.map(l=>chart().find(a=>a.id===l.account_id)).filter(Boolean).map(G.currency).filter(c=>c!=='LAK'))].sort();
 for(const n of [...host.children])if(!cs.includes(n.dataset.currency))n.remove();
 for(const c of cs)if(![...host.children].some(n=>n.dataset.currency===c)){const label=document.createElement('label');label.dataset.currency=c;label.textContent='LAK per 1 '+c;const n=document.createElement('input');n.className='je-input';n.inputMode='decimal';n.setAttribute('aria-label','LAK per 1 '+c);n.value=state.rates[c]||'';n.oninput=()=>{state.rates[c]=n.value;for(const l of state.rows)if(G.currency(chart().find(a=>a.id===l.account_id))===c)delete l.fx_rate_lak;invalidate();};label.append(n);host.append(label);}
}
function renderRows(){
 const body=dialog.querySelector('tbody');body.replaceChildren();
 state.rows.forEach((l,i)=>{
  const a=chart().find(a=>a.id===l.account_id),tr=document.createElement('tr');tr.dataset.row=i;
  tr.innerHTML='<td>'+(i+1)+'</td><td><select class="je-select" aria-label="Account row '+(i+1)+'"><option value="">Choose account</option>'+chart().map(a=>'<option value="'+esc(a.id)+'">'+esc(a.code+' — '+a.name+' · '+G.currency(a))+'</option>').join('')+'</select></td><td><input aria-label="Memo row '+(i+1)+'" data-field="line_memo" value="'+esc(l.line_memo)+'"></td><td data-currency>'+esc(a?G.currency(a):'')+'</td>'+['debit','credit','book_rate_lak'].map(k=>'<td><input inputmode="decimal" aria-label="'+({debit:'Debit',credit:'Credit',book_rate_lak:'Book rate'}[k])+' row '+(i+1)+'" data-field="'+k+'" value="'+esc(display(l[k]||''))+'"'+(k==='book_rate_lak'&&(!a||G.currency(a)==='LAK')?' disabled':'')+'></td>').join('')+'<td><button type="button" class="je-btn je-btn-secondary" aria-label="Delete row '+(i+1)+'">×</button></td>';
  const select=tr.querySelector('select');select.value=l.account_id;select.onchange=()=>{l.account_id=select.value;l.missing='';delete l.generated;delete l.book_rate_lak;delete l.fx_rate_lak;delete l.autoBook;invalidate();renderRows();renderRates();};
  for(const n of tr.querySelectorAll('[data-field]'))n.oninput=()=>{l[n.dataset.field]=n.value;if(n.dataset.field==='line_memo')delete l.autoMemo;if(['debit','credit'].includes(n.dataset.field))delete l.generated;if(n.dataset.field==='book_rate_lak'){delete l.autoBook;delete l.generated;}invalidate();};
  tr.querySelector('button').onclick=()=>{state.rows.splice(i,1);if(!state.rows.length)state.rows.push(blank());invalidate();renderRows();renderRates();};body.append(tr);
 });
}
function render(){
 dialog.querySelector('[data-template]').value=state.template;dialog.querySelector('[data-date]').value=state.date;dialog.querySelector('[data-memo]').value=state.memo;
 dialog.querySelector('[data-rates]').replaceChildren();renderRates();renderRows();dialog.querySelector('[data-use]').disabled=true;
 const missing=state.rows.filter(l=>l.missing);if(missing.length)message('Choose current accounts for these saved template lines: '+missing.map(l=>l.missing).join(', '),true);
}
function readInput(){return {date:state.date,chart:chart(),rates:Object.fromEntries(Object.entries(state.rates).map(([c,v])=>[c,number(v)])),rows:state.rows.map(l=>({...l,debit:number(l.debit),credit:number(l.credit),book_rate_lak:number(l.book_rate_lak),fx_rate_lak:number(l.fx_rate_lak)}))};}
function fingerprint(){return JSON.stringify([who(),window.OJM_SUPABASE_URL,JournalModule.editingEntryId,state,snapshotJournal69(),$('jeGeneralMemo')?.value,$('jeTransDate')?.value]);}
async function balances(input){
 const needs=input.rows.filter(l=>l.generated!=='output').map(l=>({l,a:input.chart.find(a=>a.id===l.account_id)})).filter(({l,a})=>a&&G.currency(a)!=='LAK'&&(G.fund(a)&&!l.debit||(l.debit>0||!l.debit&&!l.credit)&&(G.staff(a)||G.type(a)==='LIABILITY')||l.credit>0&&!G.technical(a)&&!G.fund(a)&&!G.staff(a)&&G.type(a)==='ASSET'));
 if(!needs.length)return {values:{},note:''};
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
 if(busy)return;busy=true;verified='';dialog.querySelector('[data-use]').disabled=true;const actor=who(),rev=revision,before=fingerprint(),end=window.actionFeedback14296?.begin(dialog.querySelector('[data-generate]'),'Generating journal…');
 try{eligible();if(!state.memo.trim())throw Error('Enter the general description.');if(!/^\d{4}-\d{2}-\d{2}$/.test(state.date))throw Error('Choose the transaction date.');const input=readInput(),b=await balances(input);if(!dialog?.open||actor!==who()||rev!==revision||before!==fingerprint())return;
  const result=G.complete({...input,balances:b.values});if(result.errors.length){verified='';dialog.querySelector('[data-use]').disabled=true;showErrors(result.errors);return;}
  state.rows=result.rows;persist();renderRows();renderRates();verified=JSON.stringify(readInput().rows);dialog.querySelector('[data-use]').disabled=false;message('Journal amounts filled. Review the debit and credit cells. '+b.note+(result.notes.length?' '+result.notes.join(' '):''));
 }catch(e){if(actor===who()&&dialog?.open)message(e.message,true);}finally{busy=false;end?.();}
}
async function useEntry(){
 if(busy||!verified)return;busy=true;const actor=who(),rev=revision,before=fingerprint(),end=window.actionFeedback14296?.begin(dialog.querySelector('[data-use]'),'Checking journal…');
 try{eligible();const input=readInput(),b=await balances(input);if(!dialog?.open||actor!==who()||rev!==revision||before!==fingerprint())return;
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
 }catch(e){if(actor===who()&&dialog?.open)message(e.message,true);}finally{busy=false;end?.();}
}
function open(){
 try{eligible();}catch(e){showCenterStatus(e.message,true);return;}
 if(dialog&&owner===who()){dialog.showModal();return;}owner=who();
 try{state=JSON.parse(localStorage.getItem(key())||'null');}catch{state=null;}
 if(!state||!Array.isArray(state.rows))state={template:'blank',date:$('jeTransDate').value,memo:'',rates:{},rows:[blank(),blank()],drafts:{}};
 state.drafts||={};state.rates||={};if(!definitions().some(t=>t.id===state.template))state.template='blank';
 dialog=document.createElement('dialog');dialog.id='journalGenerator258';dialog.setAttribute('aria-labelledby','generatorTitle258');
 dialog.innerHTML='<header><h3 id="generatorTitle258">Generate journal</h3><button type="button" class="je-btn je-btn-secondary" data-close>Close</button></header><div class="generator-meta258"><label>Transaction template<select class="je-select" data-template>'+definitions().map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join('')+'</select></label><label>Transaction date<input class="je-input" type="date" data-date></label><label class="generator-wide258">General description<textarea class="je-input" rows="2" data-memo></textarea></label></div><div data-rates class="generator-rates258"></div><p>Enter the business amounts below. Generate fills missing amounts and system / FX lines in this table. Book rates are checked against recorded balances; you can enter a specific historical rate when needed.</p><div class="generator-table258"><table><thead><tr><th>#</th><th>Account</th><th>Line memo</th><th>Currency</th><th>Debit</th><th>Credit</th><th>Book rate · LAK/unit</th><th></th></tr></thead><tbody></tbody></table></div><footer><button type="button" class="je-btn je-btn-secondary" data-add>Add line</button><button type="button" class="je-btn je-btn-secondary" data-generate>Generate</button><button type="button" class="je-btn je-btn-emerald" data-use disabled>Use in Post Entry</button></footer><p role="status" aria-live="polite" data-status></p>';
 document.body.append(dialog);render();
 dialog.querySelector('[data-template]').onchange=e=>selectTemplate(e.target.value);
 dialog.querySelector('[data-date]').onchange=e=>{state.date=e.target.value;invalidate();};dialog.querySelector('[data-memo]').oninput=e=>{state.memo=e.target.value;invalidate();};
 dialog.querySelector('[data-close]').onclick=()=>{revision++;persist();dialog.close();};dialog.addEventListener('cancel',()=>{revision++;persist();});
 dialog.querySelector('[data-add]').onclick=()=>{state.rows.push(blank());invalidate();renderRows();};dialog.querySelector('[data-generate]').onclick=()=>void calculate();dialog.querySelector('[data-use]').onclick=()=>void useEntry();dialog.showModal();
}
function ready(){
 const button=document.createElement('button');button.type='button';button.id='generateJournal258';button.className='je-btn je-btn-secondary';button.textContent='Generate';button.onclick=open;$('addEntryRow14271')?.after(button);
 const style=document.createElement('style');style.textContent='#journalGenerator258{width:min(1280px,calc(100vw - 24px));max-height:calc(100dvh - 24px);box-sizing:border-box;overflow:auto;border:1px solid #b9cfc2;border-radius:8px;padding:18px;background:#fff;color:#18392e}#journalGenerator258::backdrop{background:#0006}#journalGenerator258 header,#journalGenerator258 footer{display:flex;align-items:center;gap:8px;justify-content:space-between}#journalGenerator258 h3{margin:0 0 12px}#journalGenerator258 footer{justify-content:flex-end;flex-wrap:wrap;margin-top:14px}#journalGenerator258 .je-btn{height:32px;min-height:32px}#journalGenerator258 .generator-meta258{display:grid;grid-template-columns:2fr 1fr;gap:12px}#journalGenerator258 label{display:flex;flex-direction:column;gap:5px;font-size:13px;min-width:0}#journalGenerator258 .generator-wide258{grid-column:1/-1}#journalGenerator258 input,#journalGenerator258 select,#journalGenerator258 textarea{box-sizing:border-box;width:100%;color:inherit;background:#fff}#journalGenerator258 .generator-rates258{display:flex;flex-wrap:wrap;gap:12px;margin-top:12px}#journalGenerator258 .generator-rates258 label{width:180px}#journalGenerator258 p{font-size:13px;line-height:1.4}#journalGenerator258 .generator-table258{overflow:auto}#journalGenerator258 table{border-collapse:collapse;min-width:1070px;width:100%;font-size:12px}#journalGenerator258 th,#journalGenerator258 td{padding:6px;border-bottom:1px solid #d6e1da;text-align:left}#journalGenerator258 th{background:#eff5f1}#journalGenerator258 th:nth-child(2){width:29%}#journalGenerator258 th:nth-child(3){width:20%}#journalGenerator258 td input{border:0;background:transparent;padding:6px;min-width:92px}#journalGenerator258 td:nth-child(n+5) input{text-align:right}#journalGenerator258 td select{border:0;background:transparent;min-width:250px}#journalGenerator258 [data-status]{white-space:pre-wrap;color:#235d44}#journalGenerator258 [data-status].has-error258{color:#9f2e24}@media(max-width:650px){#journalGenerator258{padding:12px}#journalGenerator258 .generator-meta258{grid-template-columns:1fr}}';document.head.append(style);
 const context=()=>{button.hidden=!!window.personalJournal1437?.active;const locked=$('loginGate')&&!$('loginGate').classList.contains('is-authenticated');if(dialog&&(owner!==who()||locked||window.personalJournal1437?.active)){revision++;dialog.close();dialog.remove();dialog=null;state=null;verified='';}};
 window.addEventListener('page113',context);window.addEventListener('local-work14333',context);document.addEventListener('visibilitychange',context);new MutationObserver(context).observe($('loginGate')||document.body,{attributes:true,attributeFilter:['class','hidden']});
 // The shared editor moves into personal workspaces after page navigation.
 const card=$('journalEntry98');if(card)new MutationObserver(context).observe(card,{attributes:true,attributeFilter:['data-personal-owner1437']});
 style.textContent+='#generateJournal258[hidden]{display:none!important}';context();
}
window.GuidedJournal258={open};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();

