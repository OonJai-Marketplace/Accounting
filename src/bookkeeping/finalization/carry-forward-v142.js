/* Read-only presentation of saved year-end checkpoints. Never enters JournalModule. */
(function(){
'use strict';
const state={owner:null,client:null,rows:[],loaded:false,loading:false,error:'',request:0};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const profile=()=>typeof liveProfile==='undefined'?null:liveProfile;
const amount=n=>typeof formatAppNumber==='function'?formatAppNumber(n):Number(n).toLocaleString();
function syncOwner(){const p=profile(),key=p?.id+'|'+p?.role+'|'+(window.workspaceRequest138?.target||'');const client=typeof ojmDb==='undefined'?null:ojmDb;if(state.owner!==key||state.client!==client){state.owner=key;state.client=client;state.rows=[];state.loaded=false;state.loading=false;state.error='';state.request++;document.getElementById('carryForward142')?.remove();}return p?.role==='admin';}
function render(){
 if(!syncOwner())return;
 const card=document.querySelector('#transactions-all > .je-card,#journalHistory14316 > .je-card');if(!card)return;
 let host=document.getElementById('carryForward142');if(!host){host=document.createElement('section');host.id='carryForward142';card.append(host);}
 if(card.lastElementChild!==host)card.append(host);
 const signature=JSON.stringify([state.loading,state.loaded,state.error]);if(host.carryRows142===state.rows&&host.dataset.carryState142===signature)return;host.carryRows142=state.rows;host.dataset.carryState142=signature;
 const open=new Set([...host.querySelectorAll('[data-carry-year][open]')].map(d=>d.dataset.carryYear));
 const rows=[...new Map(state.rows.map(r=>[Number(r.year),r])).values()].sort((a,b)=>b.year-a.year);
 host.innerHTML='<header><h3>Year-end records</h3><button type="button" class="je-btn je-btn-secondary" data-refresh-carry '+(state.loading?'disabled':'')+'>Refresh</button></header>'+
 (state.loading&&!state.loaded?'<p role="status">Loading saved year-end records…</p>':state.error?'<p role="alert">Unable to load year-end records: '+esc(state.error)+'. Use Refresh to try again.</p>':!state.loaded?'<p role="status">Loading saved year-end records…</p>':!rows.length?'<p>No completed year-end closing records are available.</p>':
 rows.map(r=>{
 const year=Number(r.year),balances=Array.isArray(r.balances)?r.balances:[],totals=Object.create(null);
 const lines=balances.map(b=>{const n=Number(b.balance);if(!Number.isFinite(n))throw Error('Invalid saved opening balance');const c=String(b.currency||'');totals[c]??={debit:0,credit:0};totals[c].debit+=Math.max(n,0);totals[c].credit+=Math.max(-n,0);return '<tr><td>'+esc(b.code)+' · '+esc(b.name)+'</td><td>'+esc(c)+'</td><td>'+amount(Math.max(n,0))+'</td><td>'+amount(Math.max(-n,0))+'</td><td>'+(b.base_balance==null&&c!=='LAK'?'Rate missing':amount(c==='LAK'?n:b.base_balance))+'</td><td>'+(c==='LAK'?'1':n&&b.base_balance!=null&&Number(b.base_balance)/n>0?esc(Number(b.base_balance/n).toLocaleString('en-US',{maximumFractionDigits:8})):n===0&&Number(b.base_balance)?'Residual LAK value — review':'—')+'</td></tr>';}).join('');
 return '<details data-carry-year="'+year+'" '+(open.has(String(year))?'open':'')+'><summary><strong>Closed year: '+year+'</strong><span>'+esc(formatAppDate(year+'-12-31'))+' · '+balances.length+' account balances</span></summary><div class="carry-content142"><p>Source: completed '+year+' year-end closing'+(r.closed_at?' · Closed '+esc(formatAppDate(r.closed_at,true)):'')+'. Read-only saved checkpoint.</p><div class="table-container"><table><thead><tr><th>Account</th><th>Currency</th><th>Debit</th><th>Credit</th><th>LAK carrying balance</th><th>LAK / unit</th></tr></thead><tbody>'+lines+'</tbody><tfoot>'+Object.entries(totals).map(([c,t])=>'<tr><th>Total</th><th>'+esc(c)+'</th><th>'+amount(t.debit)+'</th><th>'+amount(t.credit)+'</th><th colspan="2"></th></tr>').join('')+'</tfoot></table></div>'+(!balances.length?'<p>No nonzero balances were saved for this closing.</p>':'')+'<button type="button" class="je-btn je-btn-secondary" data-print-year143112="'+year+'">Print Report</button><p>Review this saved report before manually entering next year’s opening balances.</p></div></details>';
 }).join(''));
 host.querySelector('[data-refresh-carry]').onclick=()=>load(true);
 host.querySelectorAll('[data-print-year143112]').forEach(b=>b.onclick=()=>printRecord(state.rows.find(r=>String(r.year)===b.dataset.printYear143112)));

}
async function load(force=false){
 if(!syncOwner())return;if(state.loading||state.loaded&&!force){render();return;}
 if(typeof ojmDb==='undefined'||!ojmDb)return;
 const request=++state.request,owner=state.owner,client=ojmDb;state.loading=true;state.error='';render();
 try{const read=async()=>{const result=await client.from('year_closings136').select('year,closed_at,balances,closing_entries').order('year',{ascending:false}).limit(300);if(result.error)throw result.error;if(!Array.isArray(result.data))throw Error('Saved closing records could not be read.');return {data:result.data}};const result=window.offline14239?await offline14239.snapshot('year-end-reports143112',read):await read();
 syncOwner();if(request!==state.request||owner!==state.owner)return;
 if(result.error)throw Error(result.error.message||'Request failed');
 const records=result.data||[];
 if(records.some(r=>!Number.isInteger(Number(r.year))||!Array.isArray(r.balances)||r.balances.some(b=>!Number.isFinite(Number(b.balance)))))throw Error('Saved closing record has an invalid format');
 state.rows=records;state.loaded=true;
 }catch(e){if(request!==state.request||owner!==state.owner)return;state.rows=[];state.loaded=false;state.error=e.message||'Request failed';}
 finally{if(request===state.request&&owner===state.owner){state.loading=false;render();}}
}
const previous=window.renderAllTransactionsTable;
window.renderAllTransactionsTable=function(...args){const result=previous.apply(this,args);render();load();return result;};
window.addEventListener('page113',()=>{syncOwner();if(document.querySelector('.tab-content.active')?.id==='transactions-all')load();});
window.addEventListener('focus',()=>{if(document.querySelector('.tab-content.active')?.id==='transactions-all')load(true);});
function reportHTML(record){
 const totals={},rows=record.balances||[];let base=0,missing=false;
 const body=rows.map(b=>{const n=Number(b.balance),c=b.currency,v=c==='LAK'?n:b.base_balance;totals[c]??={dr:0,cr:0};totals[c].dr+=Math.max(n,0);totals[c].cr+=Math.max(-n,0);if(v==null)missing=true;else base+=Number(v);return '<tr><td>'+esc(b.code+' · '+b.name)+'</td><td>'+esc(b.type||'')+'</td><td>'+esc(c)+'</td><td>'+amount(Math.max(n,0))+'</td><td>'+amount(Math.max(-n,0))+'</td><td>'+(v==null?'Missing':amount(v))+'</td><td>'+(c==='LAK'?'1':n&&v!=null&&Number(v)/n>0?esc(Number(v/n).toLocaleString('en-US',{maximumFractionDigits:8})):'—')+'</td></tr>'}).join('');
 return '<p>Saved year-end balances for review and manual opening entry. This report does not post or transfer any amounts to the next year.</p>'+(record.closed_at?'<p>Closed: '+esc(formatAppDate(record.closed_at,true))+'</p>':'')+'<table><thead><tr><th>Account</th><th>Type</th><th>CCY</th><th>Debit</th><th>Credit</th><th>LAK balance</th><th>LAK / unit</th></tr></thead><tbody>'+body+'</tbody></table>'+(!rows.length?'<p>No posted balances for this year.</p>':'')+'<h3>Currency totals</h3><table><thead><tr><th>CCY</th><th>Debit</th><th>Credit</th><th>Difference</th></tr></thead><tbody>'+Object.entries(totals).map(([c,t])=>'<tr><td>'+esc(c)+'</td><td>'+amount(t.dr)+'</td><td>'+amount(t.cr)+'</td><td>'+amount(t.dr-t.cr)+'</td></tr>').join('')+'</tbody></table><p>Net LAK balance (debit positive): '+(missing?'Incomplete saved valuations':amount(base))+'.</p><p>Income and expense balances are included for the annual review; they are not next-year opening balances. Verify asset, liability, equity and system balances before recording the new opening journal.</p>';
}
function printRecord(record){if(!syncOwner()||!record)return;return print82('Year-end Balance Report',reportHTML(record),String(record.year));}
window.carryForward142={load,render,reportHTML,printRecord};
})()
