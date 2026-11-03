const reportModes260={category_totals:'Consolidated — category totals',fund_dates:'Detailed — fund total once',detailed:'As entered — individual transactions'};
const eligibleReportLines260=j=>(j.lines||[]).filter(l=>!wsIsCollection(l)&&!l.journal_entry_id&&!l.voided_at&&l.status!=='voided').map((line,index)=>({line,index})).sort((a,b)=>(Number(a.line.line_no)||a.index+1)-(Number(b.line.line_no)||b.index+1)).map(x=>x.line);
const reportDate260=j=>eligibleReportLines260(j).map(l=>String(l.transaction_date)).sort().at(-1)||String(j.period_start||'').slice(0,10);
function reportItem263(line,index){
 const match=String(line.reference||'').match(/(?:^|[|·;])\s*item\s*(?:no\.?\s*)?#?\s*(\d+)(?=\s*(?:[|·;]|$))/i),item=match?Number(match[1]):Number(line.line_no);
 return Number.isSafeInteger(item)&&item>0?item:index+1;
}
function summarize(j,mode='category_totals',postingDate=reportDate260(j)){
 if(!['category_totals','fund_totals','fund_dates','consolidated','detailed'].includes(mode))throw Error('Choose a posting format.');
 const combined=['category_totals','fund_totals','fund_dates'].includes(mode),source=eligibleReportLines260(j),fundIds=new Set(source.map(l=>String(l.fund_account_id))),groups=new Map();
 if(combined&&(!/^\d{4}-\d{2}-\d{2}$/.test(postingDate)||source.some(l=>String(l.transaction_date).slice(0,7)!==postingDate.slice(0,7))||postingDate.slice(0,7)!==String(j.period_start).slice(0,7)))throw Error('Choose a journal date in the report month. Original receipt dates stay linked to the report.');
 for(const [index,l] of source.entries()){const cents=Math.round(Number(l.amount)*100);if(!Number.isSafeInteger(cents)||cents<=0)throw Error('Invalid source amount.');
  for(const fund of [false,true]){const incoming=l.direction==='in',side=fund?(incoming?'debit':'credit'):(incoming?'credit':'debit'),account=fund?l.fund_account_id:l.account_id,date=combined&&(mode!=='fund_dates'||fund||fundIds.has(String(account)))?postingDate:l.transaction_date,rate=combined&&l.currency_code==='LAK'?1:l.fx_rate_lak,bucket=mode==='category_totals'?'all':['fund_totals','fund_dates'].includes(mode)&&(fund||fundIds.has(String(account)))?'fund':mode==='consolidated'&&fund?'fund':l.id,key=[date,account,l.currency_code,side,rate||'',bucket].join('|');
   let g=groups.get(key);if(!g){g={key,fx_rate_lak:rate,account_id:account,currency_code:l.currency_code,side,line_date:date,cents:0,fund:fund||fundIds.has(String(account)),source_ids:[],references:[],memos:[],details:[],itemNumbers:[]};groups.set(key,g);}
   g.cents+=cents;if(!Number.isSafeInteger(g.cents))throw Error('Amount exceeds safe precision.');g.source_ids.push(l.id);g.references.push(String(l.workspace_entry_no||l.id));const item=reportItem263(l,index);g.itemNumbers.push(item);g.details.push(item+'. '+String(l.memo||'').trim());if(l.memo)g.memos.push(l.memo);if(l.reference)g.memos.push(l.reference);
  }
 }
 const rows=[...groups.values()].map(g=>({...g,debit:g.side==='debit'?g.cents/100:0,credit:g.side==='credit'?g.cents/100:0,source_ids:g.source_ids.sort(),description:combined&&g.fund?reportItems261(g.itemNumbers):g.details.join(' | ')}));
 return combined?rows.sort((a,b)=>Number(a.fund)-Number(b.fund)):rows;
}
function reportItems261(numbers){
 const sorted=[...new Set(numbers)].sort((a,b)=>a-b),parts=[];
 for(let i=0;i<sorted.length;i++){const start=sorted[i];let end=start;while(sorted[i+1]===end+1)end=sorted[++i];parts.push(start===end?String(start):start+'–'+end);}
 return (sorted.length===1?'Item ':'Items ')+parts.join(', ');
}
function cleanReportMemo261(value,row,j){
 const memo=String(value||''),source=eligibleReportLines260(j),linked=source.filter(l=>row.source_ids.includes(l.id));
 // References and source descriptions can themselves contain " | ". Consume
 // complete known source strings; splitting on that separator loses identity.
 const remaining=linked.map(l=>[false,true].map(dated=>[dated?formatAppDate(l.transaction_date):null,String(l.workspace_entry_no||l.id),l.memo,l.reference].filter(v=>v!==null&&v!==undefined&&v!=='').join(' · ')));let rest=memo;
 while(remaining.length){let match=null;remaining.forEach((variants,index)=>variants.forEach(part=>{if((rest===part||rest.startsWith(part+' | '))&&(!match||part.length>match.part.length))match={index,part};}));if(!match)return memo;remaining.splice(match.index,1);rest=rest===match.part?'':rest.slice(match.part.length+3);}
 return rest===''&&linked.length?row.description:memo;
}
function matchReportJournal261(j,lines,preferred,mainDate){
 const modes=[...new Set([preferred,'fund_dates','fund_totals','category_totals','detailed','consolidated'].filter(Boolean))];
 for(const mode of modes){let expected;try{expected=summarize(j,mode,mainDate)}catch{continue}if(expected.length!==lines.length)continue;
  const unused=expected.slice(),linked=[];let valid=true;
  for(const line of lines){
   const candidates=unused.filter(r=>String(r.account_id)===String(line.account_id)&&r.currency_code===line.currency_code&&(r.line_date===line.line_date||mode==='fund_dates'&&r.fund&&/^\d{4}-\d{2}-\d{2}$/.test(line.line_date)&&line.line_date.slice(0,7)===mainDate.slice(0,7))&&r.debit===line.debit&&r.credit===line.credit&&(r.currency_code==='LAK'||!r.fx_rate_lak||Number(r.fx_rate_lak)===Number(line.fx_rate_lak)));
   const hint=JSON.stringify([...(line.source_ids||[])].sort()),row=candidates.find(r=>JSON.stringify(r.source_ids)===hint)||candidates[0];
   if(!row){valid=false;break}unused.splice(unused.indexOf(row),1);linked.push({...line,description:cleanReportMemo261(line.description,row,j),source_ids:row.source_ids.slice()});
  }
  if(valid&&!unused.length)return {mode,lines:linked};
 }
 throw Error('The edited accounts, amounts, currencies or dates do not match a supported grouping of the approved report. Keep the original detail dates and approved category amounts; fund totals may use a date within the report month. Your draft is retained; Change format can preview the supported layouts.');
}
let prepared=null,posting=false;
