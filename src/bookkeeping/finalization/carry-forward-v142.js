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
 const rows=[...new Map(state.rows.map(r=>[Number(r.year),r])).values()].sort((a,b)=>b.year-a.year).slice(0,1);
 host.innerHTML='<header><h3>Year-end carry-forward</h3><button type="button" class="je-btn je-btn-secondary" data-refresh-carry '+(state.loading?'disabled':'')+'>Refresh</button></header>'+
 (state.loading&&!state.loaded?'<p role="status">Loading saved carry-forward records…</p>':state.error?'<p role="alert">Unable to load carry-forward records: '+esc(state.error)+'. Use Refresh to try again.</p>':!state.loaded?'<p role="status">Loading saved carry-forward records…</p>':!rows.length?'<p>No completed year-end closing records are available.</p>':
 rows.map(r=>{
 const year=Number(r.year),balances=Array.isArray(r.balances)?r.balances:[],totals=Object.create(null);
 const lines=balances.map(b=>{const n=Number(b.balance);if(!Number.isFinite(n))throw Error('Invalid saved opening balance');const c=String(b.currency||'');totals[c]??={debit:0,credit:0};totals[c].debit+=Math.max(n,0);totals[c].credit+=Math.max(-n,0);return '<tr><td>'+esc(b.code)+' · '+esc(b.name)+'</td><td>'+esc(c)+'</td><td>'+amount(Math.max(n,0))+'</td><td>'+amount(Math.max(-n,0))+'</td><td>'+(b.base_balance==null&&c!=='LAK'?'Rate missing':amount(c==='LAK'?n:b.base_balance))+'</td><td>'+(c==='LAK'?'1':n&&b.base_balance!=null&&Number(b.base_balance)/n>0?esc(Number(b.base_balance/n).toLocaleString('en-US',{maximumFractionDigits:8})):n===0&&Number(b.base_balance)?'Residual LAK value — review':'—')+'</td></tr>';}).join('');
 return '<details data-carry-year="'+year+'" '+(open.has(String(year))?'open':'')+'><summary><strong>Latest closing: '+year+'</strong><span>'+esc(formatAppDate((year+1)+'-01-01'))+' · '+balances.length+' account balances</span></summary><div class="carry-content142"><p>Source: completed '+year+' year-end closing'+(r.closed_at?' · Closed '+esc(formatAppDate(r.closed_at,true)):'')+'. Read-only saved checkpoint.</p><div class="table-container"><table><thead><tr><th>Account</th><th>Currency</th><th>Debit</th><th>Credit</th><th>LAK carrying balance</th><th>LAK / unit</th></tr></thead><tbody>'+lines+'</tbody><tfoot>'+Object.entries(totals).map(([c,t])=>'<tr><th>Total</th><th>'+esc(c)+'</th><th>'+amount(t.debit)+'</th><th>'+amount(t.credit)+'</th><th colspan="2"></th></tr>').join('')+'</tfoot></table></div>'+(!balances.length?'<p>No nonzero opening balances were saved for this closing.</p>':'')+'<p>Related closing journal reference: <strong>YEAR-CLOSE-'+year+'-[currency]</strong> · '+esc(formatAppDate(year+'-12-31'))+'</p></div></details>';
 }).join(''));
 host.querySelector('[data-refresh-carry]').onclick=()=>load(true);

}
async function load(force=false){
 if(!syncOwner())return;if(state.loading||state.loaded&&!force){render();return;}
 if(typeof ojmDb==='undefined'||!ojmDb)return;
 const request=++state.request,owner=state.owner,client=ojmDb;state.loading=true;state.error='';render();
 try{const read=async()=>{const result=await client.from('year_closings136').select('year,closed_at,balances,closing_entries').order('year',{ascending:false}).limit(1);if(result.error)throw result.error;if(!Array.isArray(result.data))throw Error('Saved closing records could not be read.');return {data:result.data}};const result=window.offline14239?await offline14239.snapshot('carry-forward-latest14370',read):await read();
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
window.carryForward142={load,render};
})()