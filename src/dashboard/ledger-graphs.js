/* Editable graph boards use posted ledger figures in the selected account currency. */
window.createLedgerGraphs=function(context){
 'use strict';
 const {owner,allowed,state,money,esc,valueFor,flowAccount,groups,render,model}=context;
 const presets={
  performance:{name:'Income & expenses',lines:['income','expense']},
  sales:{name:'Sources of income',lines:['revenue','otherIncome']},
  costs:{name:'Cost of sales & other expenses',lines:['cogs','operating']},
  position:{name:'Financial position',lines:['assets','liabilities','equity']},
  cash:{name:'Cash & bank balances',lines:['cash','bank']},
  result:{name:'Net income',lines:['net']}
 };
 const palette=['#186448','#ad5628','#365b9e','#89529a','#247483','#865819','#a54763','#545bbe'];
 const icons={grip:'M8 5h1m6 0h1M8 12h1m6 0h1M8 19h1m6 0h1',edit:'M4 20l4-1L20 7l-3-3L5 16l-1 4zM14 7l3 3',add:'M12 4v16M4 12h16',layout:'M3 4h18v16H3zM10 4v16M3 12h7'};
 const icon=name=>`<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="${name==='grip'?3:1.7}" stroke-linecap="round" stroke-linejoin="round"><path d="${icons[name]}"/></svg>`;
 const make=(preset,id=crypto.randomUUID())=>({id,title:presets[preset].name,lines:[...presets[preset].lines]});
 const defaults=()=>({months:6,side:'right',width:63,cards:[make('performance','main'),make('cash','cash'),make('position','position')]});
 let board=null,scope='',resize=null,popup=null,plots=new Map(),sequence=0,drag=null,host=null;
 const key=()=>['ojm-graph-layout-v1',window.OJM_SUPABASE_URL||location.origin,owner()].join(':');
 const canView=()=>allowed('dashboard')&&allowed('sec-chart-accounts');
 function reset(){popup?.close();resize?.disconnect();plots.clear();board=null;scope='';sequence++;drag=null}
 function settings(){
  if(scope===key()&&board)return board;
  scope=key();board=defaults();
  try{
   const saved=JSON.parse(localStorage.getItem(scope));
   if(saved&&Array.isArray(saved.cards)){
    const ids=new Set();
    board.cards=saved.cards.filter(c=>c&&typeof c.id==='string'&&!ids.has(c.id)&&ids.add(c.id)&&typeof c.title==='string'&&Array.isArray(c.lines)).map(c=>({...c,lines:[...new Set(c.lines.filter(l=>typeof l==='string'))]}));
    if([3,6,12].includes(saved.months))board.months=saved.months;
    if(saved.side==='left')board.side='left';
    if(Number.isFinite(saved.width))board.width=Math.max(40,Math.min(75,saved.width));
   }
  }catch{}
  return board;
 }
 function changed(){
  if(!canView()||scope!==key())return;
  try{localStorage.setItem(scope,JSON.stringify(board))}catch{window.showCenterStatus?.('The graph layout is available for this session. Device storage could not save it.',true)}
  render();
 }
 function periods(end,count){
  const last=new Date(end+'-01T12:00:00Z');
  return Array.from({length:count},(_,i)=>new Date(Date.UTC(last.getUTCFullYear(),last.getUTCMonth()+i+1-count,1)).toISOString().slice(0,7));
 }
 async function prepareRange(){
  if(!canView()||state.tab!=='Graphs')return;
  const request=++sequence,actor=owner(),end=state.month,start=periods(end,settings().months)[0],win=window.yearWindow14333;
  const current=()=>actor===owner()&&request===sequence&&state.tab==='Graphs'&&canView();
  if(!win)return;
  try{
   const w=win.state();
   if(!w.available||!win.loading&&w.from.slice(0,7)<=start&&w.to.slice(0,7)>=end)return;
   await win.ensure(start,end);
   if(current())render();
  }catch(error){if(current())window.showCenterStatus?.(error.message,true)}
 }
 const monthly='Monthly activity',closing='Month-end balance';
 function choices(m){
  const list=new Map();
  const summary=(id,section,basis)=>list.set(id,{id,label:groups[id]||'Net income',section,basis,rows:m.buckets.get(id)||[]});
  for(const id of ['income','revenue','otherIncome','cogs','operating','expense','net'])summary(id,'Income statement',monthly);
  for(const id of ['assets','liabilities','equity','cash','bank'])summary(id,'Balance sheet',closing);
  summary('support','Equity movements',monthly);
  const parents=new Map();
  for(const row of m.entries.filter(r=>r.posting)){
   for(const a of row.path.slice(0,-1)){if(!parents.has(a))parents.set(a,[]);parents.get(a).push(row)}
   const id='account:'+String(row.a.id||row.a.code);
   list.set(id,{id,label:row.a.code+' · '+row.a.name,section:'Individual accounts',basis:flowAccount(row)?monthly:closing,currency:row.a.currency,rows:[row]});
  }
  for(const [a,rows] of parents){
   const id='group:'+String(a.id||a.code);
   list.set(id,{id,label:a.code+' · '+a.name,section:'Account groups',basis:flowAccount(rows[0])?monthly:closing,rows});
  }
  return list;
 }
 function values(item,months,m){
  if(!item)return months.map(()=>null);
  const scoped=rows=>rows.filter(r=>r.posting&&r.a.currency===state.currency);
  const part=(rows,period,basis)=>rows.reduce((n,r)=>n+Math.round(valueFor(r,period,basis===monthly)*100),0);
  const rows=scoped(item.rows);
  if(item.id==='net'){
   const income=scoped(m.buckets.get('income')||[]),expense=scoped(m.buckets.get('expense')||[]);
   return months.map(p=>m.hasMonth(p)&&(income.length||expense.length)?(part(income,p,monthly)-part(expense,p,monthly))/100:null);
  }
  return months.map(p=>rows.length&&m.hasMonth(p)?part(rows,p,item.basis)/100:null);
 }
 const seriesColor=i=>palette[i]||`hsl(${Math.round((i*137.5)%360)} 52% 36%)`;
 const dash=i=>['','7 3','2 3','10 3 2 3'][i%4];
 const shortMonth=(p,year=false)=>new Date(p+'-01T12:00:00Z').toLocaleDateString('en-GB',{month:'short',...(year?{year:'2-digit'}:{}),timeZone:'UTC'});
 function swatch(s){return `<svg aria-hidden="true" viewBox="0 0 24 8"><path d="M1 4H23" fill="none" stroke="${s.color}" stroke-width="3" stroke-dasharray="${s.dash}"/></svg>`}
 function card(c,main,context){
  const {months,m,catalog}=context;
  const lines=c.lines.map((id,i)=>{
   const item=catalog.get(id);
   return {label:item?.label||'Unavailable account',basis:item?.basis||'',color:seriesColor(i),dash:dash(i),data:values(item,months,m)};
  });
  plots.set(c.id,{months,lines,active:months.length-1});
  return `<article class="ledger-graph ${main?'graph-main':'graph-small'}" data-graph-id="${esc(c.id)}">
   <header><div class="graph-title"><button type="button" class="graph-grip" aria-label="Move ${esc(c.title)}" title="Drag to move or click for placement" data-graph-action="move">${icon('grip')}</button><h3>${esc(c.title)}</h3></div>
   <button type="button" class="graph-edit" aria-label="Edit ${esc(c.title)}" data-graph-action="edit">${icon('edit')} Edit</button></header>
   <div class="graph-plot" data-graph-plot aria-label="${esc(c.title)} monthly line graph"></div>
   <div class="graph-readout"><div><span data-graph-month>${shortMonth(months.at(-1),true)}</span><span>${esc(state.currency)}</span></div>
   <ul>${lines.map(s=>`<li>${swatch(s)}<span>${esc(s.label)}<small>${esc(s.basis)}</small></span><strong>${esc(money(s.data.at(-1)))}</strong></li>`).join('')}</ul></div></article>`;
 }
 function view(m){
  const b=settings();plots=new Map();
  const months=periods(state.month,b.months),context={months,m,catalog:choices(m)};
  const primary=b.cards[0],secondary=b.cards.slice(1);
  const missing=months.some(p=>!m.hasMonth(p));
  return `<section class="graph-workspace"><header class="graph-toolbar"><h2>Comparison board</h2>
   <div><label>Period <select data-plain14285 data-graph-period>${[3,6,12].map(n=>`<option value="${n}" ${n===b.months?'selected':''}>${n} months</option>`).join('')}</select></label>
   <button type="button" data-graph-action="layout">${icon('layout')} Layout</button>
   <button type="button" data-graph-action="add">${icon('add')} Add graph</button></div></header>
   ${missing?'<p class="graph-empty" role="status">Some months are outside the journal currently loaded on this device.</p>':''}
   ${primary?`<div class="graph-board ${b.side==='left'?'main-left':''} ${secondary.length?'':'single'}" style="--graph-main:${b.width}fr;--graph-side:${100-b.width}fr">
   <div class="graph-primary">${card(primary,true,context)}</div><div class="graph-stack">${secondary.map(c=>card(c,false,context)).join('')}</div></div>`:
   '<p class="graph-empty">Add a graph to start a comparison.</p>'}</section>`;
 }
 function drawPlot(node){
  const chart=plots.get(node.closest('[data-graph-id]').dataset.graphId);if(!chart)return;
  const w=node.clientWidth,h=node.clientHeight;if(w<20||h<20)return;
  const {months,lines}=chart,known=lines.flatMap(s=>s.data.filter(v=>v!==null));
  if(!known.length){node.innerHTML='<p class="graph-empty">No figures for the selected lines, period and currency.</p>';return;}
  const min=known.reduce((v,n)=>Math.min(v,n),0),max=known.reduce((v,n)=>Math.max(v,n),0);
  const rough=(max-min||1)/3,base=10**Math.floor(Math.log10(rough)),step=([1,2,2.5,5,10].find(v=>v*base>=rough)||10)*base;
  const lo=Math.floor(min/step)*step,hi=Math.ceil(max/step)*step||(!min?step:0);
  const top=10,bottom=h-24,left=52,right=w-12;
  const x=i=>left+(right-left)*i/(months.length-1),y=v=>bottom-(v-lo)*(bottom-top)/(hi-lo);
  const compact=new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:2});
  const axis=[];for(let i=0;i<=Math.round((hi-lo)/step);i++){const n=lo+i*step;axis.push(`<path d="M${left} ${y(n)}H${right}" class="graph-gridline"/><text x="${left-6}" y="${y(n)+4}" text-anchor="end">${esc(compact.format(n))}</text>`)}
  const stride=Math.max(1,Math.ceil(months.length*42/(right-left)));
  const labels=months.map((p,i)=>(i%stride===0&&i<months.length-(stride>1?1:0)||i===months.length-1)?`<text x="${x(i)}" y="${h-6}" text-anchor="${i===0?'start':i===months.length-1?'end':'middle'}">${shortMonth(p)}</text>`:'').join('');
  const paths=lines.map(s=>{
   let path='',connected=false,points='';
   s.data.forEach((value,i)=>{if(value===null){connected=false;return;}path+=(connected?'L':'M')+x(i)+' '+y(value)+' ';connected=true;points+=`<circle cx="${x(i)}" cy="${y(value)}" r="2.6" fill="${s.color}"/>`});
   return `<path d="${path}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-dasharray="${s.dash}"/>${points}`;
  }).join('');
  node.innerHTML=`<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">${axis.join('')}${labels}${paths}<line class="graph-cursor" y1="${top}" y2="${bottom}" x1="${x(chart.active)}" x2="${x(chart.active)}"/></svg>`;
  node.tabIndex=0;node.setAttribute('role','slider');node.setAttribute('aria-label','Inspection month');node.setAttribute('aria-valuemin','1');node.setAttribute('aria-valuemax',String(months.length));
  function inspect(index){
   const i=Math.max(0,Math.min(months.length-1,index));chart.active=i;
   const cursor=node.querySelector('.graph-cursor');cursor.setAttribute('x1',x(i));cursor.setAttribute('x2',x(i));
   const readout=node.nextElementSibling;readout.querySelector('[data-graph-month]').textContent=shortMonth(months[i],true);
   readout.querySelectorAll('li strong').forEach((el,j)=>el.textContent=money(lines[j].data[i]));
   node.setAttribute('aria-valuenow',String(i+1));node.setAttribute('aria-valuetext',shortMonth(months[i],true)+', '+lines.map(l=>l.label+' '+money(l.data[i])).join(', '));
  }
  const inspectEvent=e=>{const rect=node.getBoundingClientRect();inspect(Math.round(((e.clientX-rect.left)*w/rect.width-left)*(months.length-1)/(right-left)))};
  node.onpointermove=e=>{if(e.pointerType==='mouse')inspectEvent(e)};node.onclick=inspectEvent;
  node.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();inspect(e.key==='Home'?0:e.key==='End'?months.length-1:chart.active+(e.key==='ArrowLeft'?-1:1))}};
  inspect(chart.active);
 }
 function dialog(title,content,done,submitLabel='Save'){
  const previous=document.activeElement,actor=owner(),originalScope=scope;
  const d=document.createElement('dialog');popup?.close();popup=d;d.className='graph-dialog';d.setAttribute('aria-label',title);
  d.innerHTML=`<form><header><h2>${esc(title)}</h2><button type="button" data-close aria-label="Close">×</button></header><div class="graph-form">${content}</div><footer><button type="button" data-close>Cancel</button><button type="submit">${esc(submitLabel)}</button></footer></form>`;
  document.body.append(d);
  d.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>d.close());
  d.querySelector('form').onsubmit=e=>{e.preventDefault();if(actor!==owner()||originalScope!==key()||!canView()){d.close();return;}if(done(d)!==false){d.close();changed()}};
  const gate=document.getElementById('loginGate');
  const guard=new MutationObserver(()=>{if(actor!==owner()||!canView()||!gate?.classList.contains('is-authenticated'))d.close()});
  if(gate)guard.observe(gate,{attributes:true,attributeFilter:['class']});
  d.addEventListener('close',()=>{guard.disconnect();d.remove();if(popup===d)popup=null;if(previous?.isConnected)previous.focus();else host?.querySelector('[data-graph-action="add"]')?.focus()},{once:true});
  d.showModal();return d;
 }
 function edit(id){
  const c=board.cards.find(v=>v.id===id),draft=c?{...c,lines:[...c.lines]}:make('performance'),catalog=choices(model()),selected=new Set(draft.lines);
  const form=`<label>Graph title<input name="title" maxlength="90" required value="${esc(draft.title)}"></label>
   <label>Report preset<select data-plain14285 name="preset"><option value="">Custom comparison</option>${Object.entries(presets).map(([k,v])=>`<option value="${k}">${esc(v.name)}</option>`).join('')}</select></label>
   <label>Find lines<input type="search" data-graph-search placeholder="Search report lines, account codes or names"></label><div class="graph-line-head"><strong>Lines on this graph</strong><span data-count></span></div>
   <div class="graph-options"></div><p data-error role="alert"></p>`;
  const d=dialog(c?'Edit graph':'Add graph',form,root=>{
   const title=root.querySelector('[name=title]').value.trim();
   if(!title||!selected.size){root.querySelector('[data-error]').textContent=title?'Select at least one line.':'Enter a graph title.';return false}
   const saved={id:draft.id,title,lines:[...selected]};if(c)board.cards[board.cards.indexOf(c)]=saved;else board.cards.push(saved);
  },c?'Save graph':'Add graph');
  const f=d.querySelector('form'),options=d.querySelector('.graph-options'),search=d.querySelector('[data-graph-search]');
  const all=[...catalog.values()];
  for(const id of selected)if(!catalog.has(id))all.push({id,label:'Unavailable account',section:'Saved lines',basis:''});
  const count=()=>d.querySelector('[data-count]').textContent=selected.size+' selected';
  const paint=()=>{
   const query=search.value.trim().toLowerCase();let html='';
   for(const group of ['Income statement','Balance sheet','Equity movements','Account groups','Individual accounts','Saved lines']){
    const items=all.filter(o=>o.section===group&&(!o.currency||o.currency===state.currency||selected.has(o.id))&&(o.label+' '+o.section).toLowerCase().includes(query));
    if(items.length)html+=`<fieldset><legend>${group}</legend>${items.map(o=>`<label><input type="checkbox" value="${esc(o.id)}" ${selected.has(o.id)?'checked':''}><span>${esc(o.label)}<small>${esc([o.currency,o.basis].filter(Boolean).join(' · '))}</small></span></label>`).join('')}</fieldset>`;
   }
   options.innerHTML=html||'<p>No matching lines.</p>';count();
  };
  f.elements.preset.value=Object.keys(presets).find(k=>JSON.stringify(presets[k].lines)===JSON.stringify(draft.lines))||'';
  f.elements.preset.onchange=()=>{const p=presets[f.elements.preset.value];if(!p)return;selected.clear();p.lines.forEach(k=>selected.add(k));f.elements.title.value=p.name;search.value='';paint()};
  search.oninput=paint;options.onchange=e=>{const input=e.target;if(input.checked)selected.add(input.value);else selected.delete(input.value);f.elements.preset.value='';d.querySelector('[data-error]').textContent='';count()};paint();
 }
 function layout(){
  const d=dialog('Board layout',`<label>Main graph position<select data-plain14285 name="side"><option value="right">Right</option><option value="left">Left</option></select></label>
   <label>Main graph width <output>${board.width}%</output><input name="width" type="range" min="40" max="75" value="${board.width}"></label>`,root=>{const f=root.querySelector('form');board.side=f.elements.side.value;board.width=Number(f.elements.width.value)});
  const f=d.querySelector('form');f.elements.side.value=board.side;f.elements.width.oninput=()=>d.querySelector('output').textContent=f.elements.width.value+'%';
 }
 function move(id){
  const index=board.cards.findIndex(c=>c.id===id);
  if(index<0)return;
  const d=dialog('Place graph',`<label>${esc(board.cards[index].title)}<select data-plain14285 name="position">${board.cards.map((c,i)=>`<option value="${i}">${i?'Small graph '+i:'Main graph'}</option>`).join('')}</select></label><button type="button" class="graph-remove">Remove graph</button>`,root=>{
   const to=Number(root.querySelector('[name=position]').value);board.cards.splice(to,0,board.cards.splice(index,1)[0]);
  },'Apply');
  d.querySelector('select').value=String(index);
  d.querySelector('.graph-remove').onclick=()=>{if(scope!==key()||!canView())return;board.cards.splice(index,1);d.close();changed()};
 }
 function bindGrip(button){
  const card=button.closest('[data-graph-id]');
  let suppress=false;
  button.onpointerdown=e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,id:card.dataset.graphId,active:false};button.setPointerCapture(e.pointerId)};
  button.onpointermove=e=>{
   if(!drag||drag.id!==card.dataset.graphId)return;
   if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6)drag.active=true;
   if(!drag.active)return;card.classList.add('graph-dragging');
   const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-graph-id]');
   host.querySelectorAll('.graph-drop').forEach(n=>n.classList.remove('graph-drop'));
   if(target&&target!==card)target.classList.add('graph-drop');
  };
  function end(e,cancel=false){
   if(!drag)return;const active=drag.active;drag=null;card.classList.remove('graph-dragging');
   host.querySelectorAll('.graph-drop').forEach(n=>n.classList.remove('graph-drop'));
   if(!active||cancel)return;
   suppress=true;
   const to=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-graph-id]')?.dataset.graphId;
   if(!to||to===card.dataset.graphId||!canView())return;
   const source=board.cards.findIndex(c=>c.id===card.dataset.graphId),target=board.cards.findIndex(c=>c.id===to);
   if(source>=0&&target>=0){[board.cards[source],board.cards[target]]=[board.cards[target],board.cards[source]];changed()}
  }
  button.onpointerup=end;button.onpointercancel=e=>end(e,true);
  button.onclick=e=>{e.stopPropagation();if(suppress){suppress=false;return}move(card.dataset.graphId)};
 }
 function mount(parent,active){
  resize?.disconnect();resize=null;host=parent;if(!active){if(popup?.open)popup.close();return}
  const root=parent.querySelector('.graph-workspace');if(!root)return;
  root.querySelectorAll('.graph-grip').forEach(bindGrip);
  root.onclick=e=>{const action=e.target.closest('[data-graph-action]')?.dataset.graphAction;if(!action||!canView())return;
   if(action==='add')edit();else if(action==='edit')edit(e.target.closest('[data-graph-id]').dataset.graphId);else if(action==='layout')layout();
  };
  root.querySelector('[data-graph-period]').onchange=e=>{board.months=Number(e.target.value);changed();void prepareRange()};
  resize=new ResizeObserver(entries=>entries.forEach(({target})=>{if(target.isConnected)drawPlot(target)}));
  root.querySelectorAll('[data-graph-plot]').forEach(n=>resize.observe(n));
 }
 return {view,mount,reset,prepareRange};
};
