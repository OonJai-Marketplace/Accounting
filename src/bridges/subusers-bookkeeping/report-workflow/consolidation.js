const reportModes260={category_totals:'Consolidated — category totals',fund_totals:'Detailed — fund total once',detailed:'As entered — individual transactions'};
const eligibleReportLines260=j=>(j.lines||[]).filter(l=>!wsIsCollection(l)&&!l.journal_entry_id&&!l.voided_at&&l.status!=='voided').map((line,index)=>({line,index})).sort((a,b)=>(Number(a.line.line_no)||a.index+1)-(Number(b.line.line_no)||b.index+1)).map(x=>x.line);
const reportDate260=j=>eligibleReportLines260(j).map(l=>String(l.transaction_date)).sort().at(-1)||String(j.period_start||'').slice(0,10);
function summarize(j,mode='category_totals',postingDate=reportDate260(j)){
 if(!['category_totals','fund_totals','consolidated','detailed'].includes(mode))throw Error('Choose a posting format.');
 const combined=['category_totals','fund_totals'].includes(mode),source=eligibleReportLines260(j),fundIds=new Set(source.map(l=>String(l.fund_account_id))),groups=new Map();
 if(combined&&(!/^\d{4}-\d{2}-\d{2}$/.test(postingDate)||source.some(l=>String(l.transaction_date).slice(0,7)!==postingDate.slice(0,7))||postingDate.slice(0,7)!==String(j.period_start).slice(0,7)))throw Error('Choose a journal date in the report month. Original receipt dates stay linked to the report.');
 for(const l of source){const cents=Math.round(Number(l.amount)*100);if(!Number.isSafeInteger(cents)||cents<=0)throw Error('Invalid source amount.');
  for(const fund of [false,true]){const incoming=l.direction==='in',side=fund?(incoming?'debit':'credit'):(incoming?'credit':'debit'),account=fund?l.fund_account_id:l.account_id,date=combined?postingDate:l.transaction_date,rate=combined&&l.currency_code==='LAK'?1:l.fx_rate_lak,bucket=mode==='category_totals'?'all':mode==='fund_totals'&&(fund||fundIds.has(String(account)))?'fund':mode==='consolidated'&&fund?'fund':l.id,key=[date,account,l.currency_code,side,rate||'',bucket].join('|');
   let g=groups.get(key);if(!g){g={key,fx_rate_lak:rate,account_id:account,currency_code:l.currency_code,side,line_date:date,cents:0,fund:fund||fundIds.has(String(account)),source_ids:[],references:[],memos:[],details:[]};groups.set(key,g);}
   g.cents+=cents;if(!Number.isSafeInteger(g.cents))throw Error('Amount exceeds safe precision.');g.source_ids.push(l.id);g.references.push(String(l.workspace_entry_no||l.id));g.details.push([combined?formatAppDate(l.transaction_date):null,String(l.workspace_entry_no||l.id),l.memo,l.reference].filter(v=>v!==null&&v!==undefined&&v!=='').join(' · '));if(l.memo)g.memos.push(l.memo);if(l.reference)g.memos.push(l.reference);
  }
 }
 const rows=[...groups.values()].map(g=>({...g,debit:g.side==='debit'?g.cents/100:0,credit:g.side==='credit'?g.cents/100:0,source_ids:g.source_ids.sort(),description:g.details.join(' | ')}));
 return combined?rows.sort((a,b)=>Number(a.fund)-Number(b.fund)):rows;
}
let prepared=null,posting=false;
