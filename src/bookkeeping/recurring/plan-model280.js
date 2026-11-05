/* Pure schedule preview. The database independently validates and allocates it. */
((root)=>{'use strict';
const G=()=>root.JournalCompletion258,round=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
const iso=d=>d.toISOString().slice(0,10),date=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))throw Error('Choose a valid date.');const d=new Date(s+'T12:00:00Z');if(iso(d)!==s)throw Error('Choose a valid date.');return d;};
const month=s=>s.slice(0,7)+'-01',last=s=>iso(new Date(Date.UTC(date(s).getUTCFullYear(),date(s).getUTCMonth()+1,0,12)));
function step(start,frequency,i){const d=date(start),day=d.getUTCDate();if(frequency==='weekly')d.setUTCDate(day+i*7);else{d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+i*({monthly:1,quarterly:3,yearly:12}[frequency]||0));d.setUTCDate(Math.min(day,Number(last(iso(d)).slice(-2))));}return iso(d);}
function dates(config){
 const {kind,start,end}=config;date(start);date(end);if(end<start)throw Error('The end date must follow the start date.');if(kind!=='amortization'&&!['once','weekly','monthly','quarterly','yearly'].includes(config.frequency))throw Error('Choose the frequency.');const out=[];
 if(kind==='amortization'){
  for(let i=0;i<600;i++){const m=step(month(start),'monthly',i);if(m>month(end))return out;const a=start>m?start:m,b=end<last(m)?end:last(m);out.push({date:config.posting_day==='first'?m:last(m),weight:config.allocation==='daily'?Math.round((date(b)-date(a))/86400000)+1:1,period:m});}
 }else for(let i=0;i<600;i++){const d=step(start,config.frequency,i);if(d>end)return out;out.push({date:d,weight:1,period:month(d)});if(config.frequency==='once')return out;}
 throw Error('Use a schedule with fewer than 600 occurrences.');
}
function prepaidAsset(a){
 const parent=a?.parentCode||a?.parent_code;
 return G().type(a)==='ASSET'&&!G().technical(a)&&a.isPosting!==false&&a.is_posting!==false&&
  (parent?String(parent)==='1300':/^13\d{2}$/.test(String(a.code)));
}
function prepaidPair(expense,prepaid){
 const g=G(),c=g.currency(expense);
 return g.type(expense)==='EXPENSE'&&prepaidAsset(prepaid)&&c===g.currency(prepaid)&&(!g.technical(expense)||c!=='LAK');
}
function checkAmortization(normalized,chart){
  const prepaid=normalized.filter(l=>l.credit>0&&prepaidAsset(chart.find(a=>a.id===l.account_id)));
  if(prepaid.length!==1)throw Error('Use one prepaid asset credit per amortization plan. Prepare the expense release with Generate first.');
  if(normalized.some(l=>G().fund(chart.find(a=>a.id===l.account_id))||String(chart.find(a=>a.id===l.account_id).code)==='5419'))throw Error('Amortization releases a prepaid balance. Remove cash, bank and exchange gain/loss lines.');
  const p=prepaid[0],same=normalized.filter(l=>l.currency_code===p.currency_code),expense=same.find(l=>l.debit>0);
  if(same.length!==2||!expense||normalized.length!==(p.currency_code==='LAK'?2:4))throw Error('Use one expense and one prepaid asset, plus the two LAK mapping lines for foreign prepaids.');
  const a=chart.find(a=>a.id===expense.account_id);
  if(p.currency_code==='LAK'){if(G().type(a)!=='EXPENSE'||G().technical(a))throw Error('Choose the expense account for this prepaid release.');}
  else{const m=G().registry(chart).maps.get(a.id);if(!m?.actual||!m.offset||G().type(m.actual)!=='EXPENSE')throw Error('Choose a supported expense mapping for the prepaid currency.');
   const actual=normalized.find(l=>l.account_id===m.actual.id),offset=normalized.find(l=>l.account_id===m.offset.id);
   if(!actual?.debit||!offset?.credit||Math.abs(actual.debit-round(p.credit*p.book_rate_lak))>.01||expense.book_rate_lak!==p.book_rate_lak)throw Error('The LAK expense and mapping must use the prepaid’s recorded book rate. Run Generate with that rate.');
  }
}
function prepare(lines,chart,kind){
 if(lines.length<2)throw Error('Enter at least two journal lines first.');
 const normalized=lines.map((l,i)=>{const a=chart.find(a=>a.id===l.account_id);if(!G().available(a))throw Error('Choose the account on line '+(i+1)+'.');const debit=Number(l.debit||0),credit=Number(l.credit||0),c=G().currency(a),r=c==='LAK'?1:Number(l.book_rate_lak||l.fx_rate_lak);
  if(!Number.isFinite(debit)||!Number.isFinite(credit)||debit<0||credit<0||!(debit>0||credit>0)||debit>0&&credit>0||Math.abs(round(debit)-debit)>1e-8||Math.abs(round(credit)-credit)>1e-8)throw Error('Enter one positive debit or credit on line '+(i+1)+'.');
  if(!(r>0)||!Number.isFinite(r)||r>1e9)throw Error('Enter the recorded book rate on line '+(i+1)+'.');if(debit+credit>9e12)throw Error('The amount is too large for a plan.');
  return {account_id:a.id,currency_code:c,description:String(l.description??l.line_memo??''),debit,credit,fx_rate_lak:kind==='amortization'?r:Number(l.fx_rate_lak||r),book_rate_lak:r};
 });
 for(const c of new Set(normalized.map(l=>l.currency_code)))if(Math.abs(normalized.filter(l=>l.currency_code===c).reduce((n,l)=>n+l.debit-l.credit,0))>.004)throw Error(c+' debits and credits must balance.');
 if(kind==='amortization')checkAmortization(normalized,chart);
 if(kind==='recurring'){
  let release=false;
  if(normalized.length===2){
   const dr=normalized.find(l=>l.debit>0),cr=normalized.find(l=>l.credit>0);
   release=prepaidPair(chart.find(a=>a.id===dr?.account_id),chart.find(a=>a.id===cr?.account_id));
  }else if(normalized.length===4&&normalized.some(l=>l.currency_code!=='LAK'&&l.credit>0&&prepaidAsset(chart.find(a=>a.id===l.account_id)))&&normalized.every(l=>l.fx_rate_lak===l.book_rate_lak)){
   try{checkAmortization(normalized,chart);release=true;}catch{/* Other balanced four-line journals can recur. */}
  }
  if(release)throw Error('Choose Amortization for this prepaid expense release.');
 }
 return normalized;
}
function preview(config,source,chart){
 const lines=prepare(source,chart,config.kind),periods=dates(config),totalWeight=periods.reduce((n,p)=>n+p.weight,0),total=config.kind==='amortization'&&config.amount_basis==='total';let used=0;
 if(lines.some(l=>(l.debit+l.credit)*(total?1:periods.length)>9e12))throw Error('The plan total is too large. Use a shorter schedule.');
 return periods.map((p,index)=>{const before=used;used+=p.weight;let allocated=lines.map(l=>({...l,debit:total?round(round(l.debit*used/totalWeight)-round(l.debit*before/totalWeight)):l.debit,credit:total?round(round(l.credit*used/totalWeight)-round(l.credit*before/totalWeight)):l.credit}));
  if(config.kind==='amortization'){
   const foreign=allocated.find(l=>l.credit>0&&l.currency_code!=='LAK');
   if(foreign){const original=lines.find(l=>l.account_id===foreign.account_id),a=allocated.find(l=>l.debit>0&&l.currency_code==='LAK'),c=allocated.find(l=>l.credit>0&&l.currency_code==='LAK');const basis=total?original.credit:round(original.credit*periods.length),previous=total?round(basis*before/totalWeight):round(original.credit*index),cumulative=total?round(basis*used/totalWeight):round(original.credit*(index+1));a.debit=c.credit=round(round(cumulative*foreign.book_rate_lak)-round(previous*foreign.book_rate_lak));
    // Allocate the historical LAK cents cumulatively too. A tiny effective-rate
    // rounding adjustment keeps the foreign ledger and its LAK mapping identical.
    if(round(foreign.credit*foreign.book_rate_lak)!==a.debit){const r=Number((a.debit/foreign.credit).toFixed(10));if(round(foreign.credit*r)!==a.debit)throw Error('This allocation needs a smaller amount or fewer rate decimals.');for(const l of allocated.filter(l=>l.currency_code!=='LAK'))l.book_rate_lak=l.fx_rate_lak=r;}
   }
  }
  return {...p,index,lines:allocated};
 });
}
root.JournalPlanModel280={dates,preview,prepare,prepaidPair,step,last,month,round};
})(globalThis);
