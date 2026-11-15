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
 const icons={size:'M5 19 19 5M11 19l8-8M17 19l2-2',grip:'M8 5h1m6 0h1M8 12h1m6 0h1M8 19h1m6 0h1',edit:'M4 20l4-1L20 7l-3-3L5 16l-1 4zM14 7l3 3',add:'M12 4v16M4 12h16',layout:'M3 4h18v16H3zM10 4v16M3 12h7'};
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
 function persist(){
  if(!canView()||scope!==key())return;
  try{localStorage.setItem(scope,JSON.stringify(board))}catch{window.showCenterStatus?.('The graph layout is available for this session. Device storage could not save it.',true)}
 }
 function changed(){persist();render()}
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
   <ul>${lines.map(s=>`<li>${swatch(s)}<span>${esc(s.label)}<small>${esc(s.basis)}</small></span><strong>${esc(money(s.data.at(-1)))}</strong></li>`).join('')}</ul></div>
   <button type="button" class="graph-size" aria-label="Resize ${esc(c.title)}" title="Drag to resize. Arrow keys adjust the size. Home restores the default size.">${icon('size')}</button></article>`;
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
   const saved={...draft,title,lines:[...selected]};if(c)board.cards[board.cards.indexOf(c)]=saved;else board.cards.push(saved);
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
 // Use the corner facing the other column. The outer edge stays anchored while dragging.
 function bindSize(button){
  const card=button.closest('[data-graph-id]'),plot=card.querySelector('[data-graph-plot]');
  const grid=card.closest('.graph-board'),column=card.parentElement;
  const item=board.cards.find(c=>c.id===card.dataset.graphId);
  const main=card.classList.contains('graph-main');
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  let start=null,draft=null;
  function begin(){
   if(!canView()||scope!==key())return false;
   const stacked=getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length===1;
   const fromLeft=!stacked&&(main?board.side==='right':board.side==='left');
   const scale=grid.getBoundingClientRect().width/grid.offsetWidth||1;
   start={fromLeft,stacked,scale,available:grid.clientWidth-(stacked?0:parseFloat(getComputedStyle(grid).columnGap)),
    column:column.clientWidth,width:card.getBoundingClientRect().width/scale,height:plot.clientHeight,
    split:board.width,actor:scope};
   return true;
  }
  function preview(dx,dy){
   const wanted=start.width+(start.fromLeft?-dx:dx)/start.scale;
   let split=start.split,space=start.column;
   if(!start.stacked&&wanted>space){
    const share=wanted*100/start.available;
    split=clamp(main?share:100-share,40,75);
    space=start.available*(main?split:100-split)/100;
   }
   const width=clamp(wanted,Math.min(220,space),space);
   const height=clamp(Math.round(start.height+dy/start.scale),96,850);
   draft={widthPercent:Math.round(width*10000/space)/100,plotHeight:height,split};
   grid.style.setProperty('--graph-main',split+'fr');grid.style.setProperty('--graph-side',(100-split)+'fr');
   card.style.setProperty('--card-width',draft.widthPercent+'%');card.style.setProperty('--plot-height',height+'px');
  }
  function end(commit){
   if(!start)return;
   card.classList.remove('graph-resizing');
   if(draft&&start.actor===key()&&canView()){
    if(commit){item.widthPercent=draft.widthPercent;item.plotHeight=draft.plotHeight;board.width=draft.split;persist()}
    else{grid.style.setProperty('--graph-main',board.width+'fr');grid.style.setProperty('--graph-side',(100-board.width)+'fr');applySize(card,item)}
   }
   start=null;draft=null;
  }
  button.onpointerdown=e=>{
   if(!e.isPrimary||e.button!==0||!begin())return;
   e.preventDefault();start.x=e.clientX;start.y=e.clientY;start.pointer=e.pointerId;
   button.setPointerCapture(e.pointerId);card.classList.add('graph-resizing');
  };
  button.onpointermove=e=>{if(start?.pointer===e.pointerId)preview(e.clientX-start.x,e.clientY-start.y)};
  button.onpointerup=e=>{if(start?.pointer===e.pointerId){if(draft)preview(e.clientX-start.x,e.clientY-start.y);end(true)}};
  button.onlostpointercapture=button.onpointercancel=()=>end(false);
  button.onkeydown=e=>{
   if(start||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key)||!begin())return;
   e.preventDefault();e.stopPropagation();
   if(e.key==='Home'){delete item.widthPercent;delete item.plotHeight;applySize(card,item);start=null;persist();return}
   const step=16*start.scale;
   preview(e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0);end(true);
  };
  applySize(card,item);
 }
 function applySize(card,item){
  if(Number.isFinite(item.widthPercent))card.style.setProperty('--card-width',Math.max(1,Math.min(100,item.widthPercent))+'%');
  else card.style.removeProperty('--card-width');
  if(Number.isFinite(item.plotHeight))card.style.setProperty('--plot-height',Math.max(96,Math.min(850,item.plotHeight))+'px');
  else card.style.removeProperty('--plot-height');
 }
 function mount(parent,active){
  resize?.disconnect();resize=null;host=parent;if(!active){if(popup?.open)popup.close();return}
  const root=parent.querySelector('.graph-workspace');if(!root)return;
  root.querySelectorAll('.graph-grip').forEach(bindGrip);
  root.querySelectorAll('.graph-size').forEach(bindSize);
  root.onclick=e=>{const action=e.target.closest('[data-graph-action]')?.dataset.graphAction;if(!action||!canView())return;
   if(action==='add')edit();else if(action==='edit')edit(e.target.closest('[data-graph-id]').dataset.graphId);else if(action==='layout')layout();
  };
  root.querySelector('[data-graph-period]').onchange=e=>{board.months=Number(e.target.value);changed();void prepareRange()};
  resize=new ResizeObserver(entries=>entries.forEach(({target})=>{if(target.isConnected)drawPlot(target)}));
  root.querySelectorAll('[data-graph-plot]').forEach(n=>resize.observe(n));
 }
 return {view,mount,reset,prepareRange};
};
;
/* Oon Jai Home: figures come only from posted journals and mapped Chart of Accounts. */
(function(){'use strict';
const host=document.getElementById('dashboard');if(!host)return;
const tabs=['Home','Overview','Graphs','Finance','People','Operation','Compliance','Documents'];
const classes={income:'Income',expense:'Expenses',assets:'Assets',liabilities:'Liabilities',equity:'Equity',system:'System & mapping',other:'Other accounts'};
const groups={revenue:'Restaurant sales',otherIncome:'Non-sales income',cogs:'Cost of sales',operating:'Other expenses',support:'Owner support movement',cash:'Cash on hand',bank:'Bank accounts',...classes};
const state={tab:'Home',month:'',currency:'LAK',zoom:1,present:false,mappings:{},owner:'',lastRefresh:0};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byId=id=>document.getElementById(id);
const num=x=>Number(x)||0;
const monthNow=()=>appLocalDate().slice(0,7);
state.month=monthNow();
function owner(){return typeof liveProfile!=='undefined'&&liveProfile?.id||'guest'}
function allowed(target){return owner()!=='guest'&&canAccessAppTarget(target)}
function accounts(){return allowed('sec-chart-accounts')?(AccountingStore.accounts||[]).filter(a=>a.active!==false&&a.is_active!==false):[]}
function posted(){return allowed('dashboard')?(JournalModule.entries||[]).filter(l=>(!l.status||l.status==='posted')&&!l.voided_at&&!l.pendingSync&&!l.local14333&&(l.dbEntryId||l.source||!String(l.id||'').startsWith('OJM-000'))):[]}
function money(value,currency=state.currency){
 if(value==null)return '—';
 const symbol=({LAK:'₭',USD:'$',THB:'฿'})[currency]||currency+' ';
 const number=symbol+Math.abs(value).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
 return value<0?'('+number+')':number;
}
// Keep original currencies, account hierarchy and posting balances separate in every view.
function overview(){
 const list=accounts(),byCode=new Map(list.map(a=>[String(a.code),a])),byId=new Map(),byName=new Map();
 const entries=[],buckets=new Map();
 function add(id,row){if(!buckets.has(id))buckets.set(id,[]);buckets.get(id).push(row)}
 for(const a of list){
  const path=[a],seen=new Set([a]);let parent;
  while((parent=byCode.get(String(path[0].parentCode||'')))&&!seen.has(parent)){path.unshift(parent);seen.add(parent)}
  const type=String(a.baseType||a.type||'').toUpperCase(),root=path[0],branch=String(root.code);
  const technical=path.some(p=>p.isTechnical||p.type==='SYSTEM'||p.purpose&&p.purpose!=='regular');
  const kind=technical?'system':({ASSET:'assets',LIABILITY:'liabilities',EQUITY:'equity',DRAWING:'equity',REVENUE:'income',INCOME:'income',EXPENSE:'expense',COST:'expense'})[type]||'other';
  const row={a,root,path,kind,posting:a.isPosting!==false,sign:['LIABILITY','EQUITY','INCOME','REVENUE'].includes(type)?-1:1,opening:0,openingMonth:null,balanceChanges:new Map(),months:new Map(),lines:[]};
  entries.push(row);byId.set(String(a.id),row);byName.set(JSON.stringify([a.name,a.currency]),row);
  add(kind,row);add('branch:'+branch,row);
  if(kind==='income')add(branch==='4000'||/^(restaurant sales|sales)\b/i.test(root.name)?'revenue':'otherIncome',row);
  if(kind==='expense')add(branch==='5000'||/\bcost of (sales|goods sold)\b/i.test(root.name)?'cogs':'operating',row);
  if(kind==='equity'&&path.some(p=>String(p.code)==='3020'||/\bowner (financial )?support\b/i.test(p.name)))add('support',row);
  if(kind==='assets'&&(branch==='1000'||/\b(cash|bank|bcel)\b/i.test(root.name))){
   if(/\b(bcel|bank)\b/i.test(a.name))add('bank',row);
   else if(/\b(cash on hand|petty cash|cashier float|cash in hand)\b/i.test(a.name)||/^cash$/i.test(a.name))add('cash',row);
  }
 }
 const byAccountCode=new Map(entries.map(row=>[String(row.a.code),row]));
 const windowState=window.yearWindow14333?.state();
 const hasMonth=m=>!windowState?.available||m>=windowState.from.slice(0,7)&&m<=windowState.to.slice(0,7);
 const lines=posted();
 for(const l of lines){
  const row=byId.get(String(l.accountId))||byAccountCode.get(String(l.accountCode))||byName.get(JSON.stringify([l.account,l.currency]));
  if(!row?.posting||l.currency!==row.a.currency||!l.date)continue;
  const m=l.date.slice(0,7),net=(cents69(l.debit)-cents69(l.credit))*row.sign;
  row.balanceChanges.set(m,(row.balanceChanges.get(m)||0)+net);
  if(l.annualOpening||/^Annual opening balances |^Opening Balances$|^Year-end closing /i.test(l.generalMemo||''))continue;
  row.months.set(m,(row.months.get(m)||0)+net);row.lines.push(l);
 }
 for(const b of windowState?.opening||[]){const row=byId.get(String(b.accountId));if(row&&row.a.currency===b.currency){row.openingMonth=windowState.from.slice(0,7);row.opening+=row.sign*cents69(b.balance)}}
 return {entries,buckets,lines,hasMonth};
}
let model;
const getModel=()=>model||overview();
function rowsFor(group,m=getModel()){return m.buckets.get(group)||[]}
function flowAccount(row){return ['income','expense'].includes(row.kind)}
function valueFor(row,month,movement=flowAccount(row)){
 if(movement)return (row.months.get(month)||0)/100;
 const january=month.slice(0,4)+'-01';
 let cents=row.openingMonth>=january&&row.openingMonth<=month?row.opening:0;
 for(const [period,change] of row.balanceChanges)if(period>=january&&period<=month)cents+=change;
 return cents/100;
}
function amount(group,month=state.month,currency=state.currency){
 const m=getModel();if(!allowed('sec-chart-accounts')||!m.hasMonth(month))return null;
 return rowsFor(group,m).filter(row=>row.posting&&row.a.currency===currency).reduce((sum,row)=>sum+Math.round(valueFor(row,month,group==='support'||flowAccount(row))*100),0)/100;
}
function linesFor(group,month=state.month,currency=state.currency){return rowsFor(group).flatMap(row=>row.lines.filter(l=>l.currency===currency&&l.date.slice(0,7)===month))}
function date(x){return x?esc(formatAppDate(x)):'—'}
function labelMonth(month){const d=new Date(month+'-01T12:00:00');return Number.isNaN(d.valueOf())?month:new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Vientiane',month:'long',year:'numeric'}).format(d)}
function navigate(target){if(!allowed(target))return;if(target==='document-editor105'&&typeof openDocumentEditor105==='function')openDocumentEditor105();else if(target==='accounts-modular-container'&&typeof scrollToAccountModule==='function')scrollToAccountModule('sec-general-ledger');else if(typeof switchTab==='function')switchTab(target)}
function icon(name){const paths={home:'<path d="m3 11 9-7 9 7v9H3zM9 20v-6h6v6"/>',revenue:'<path d="M4 19V9m5 10V5m5 14v-8m5 8V3M2 21h20"/>',cogs:'<path d="M3 7h18l-2 11H5L3 7Zm3-4h12m-8 8h4"/>',operating:'<path d="M4 8h16v13H4zM4 11h16M7 4h10"/>',support:'<path d="M12 21s-9-5-9-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-9 11-9 11Z"/>',cash:'<rect x="2" y="6" width="20" height="14" rx="2"/><circle cx="12" cy="13" r="3"/>',bank:'<path d="M2 9h20L12 3 2 9Zm2 2v8m5-8v8m6-8v8m5-8v8M2 21h20"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',people:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 6a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5"/>',doc:'<path d="M6 2h8l5 5v15H6zM14 2v6h5M9 13h7m-7 4h7"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M10 2h4l1 3 3 1 3-1 2 4-2 2v3l2 2-2 4-3-1-3 1-1 2h-4l-1-2-3-1-3 1-2-4 2-2v-3L1 9l2-4 3 1 3-1z"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',zoom:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',expand:'<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>'};return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.home}</svg>`}
function metric(group){
 const rows=rowsFor(group),count=rows.filter(r=>r.posting&&r.a.currency===state.currency).length;
 return `<button type="button" class="overview-metric" data-map112="${esc(group)}"><span>${esc(groups[group])}</span><strong>${esc(money(count?amount(group):null))}</strong><small>${count} ${esc(state.currency)} account${count===1?'':'s'} <b aria-hidden="true">↗</b></small></button>`;
}
function shortcuts(items){return items.filter(([target])=>allowed(target)).map(([target,label])=>`<button type="button" data-go112="${target}">${esc(label)} ${icon('arrow')}</button>`).join('')}
function directory(title,keys){
 const active=keys.filter(k=>rowsFor(k).length);
 if(!active.length)return '';
 return `<section class="dash-card112 overview-directory"><header><div><h3>${esc(title)}</h3><small>${esc(state.currency)} · Monthly income and expenses · Month-end balances</small></div></header><div class="overview-grid">${active.map(k=>{
  const rows=rowsFor(k),name=groups[k]||rows[0].root.name;
  const total=k==='system'||k==='other'||rows.some(r=>r.kind==='system')?'':money(amount(k));
  return `<button type="button" data-map112="${esc(k)}"><span><strong>${esc(name)}</strong><small>${rows.length} chart entr${rows.length===1?'y':'ies'}</small></span><span class="overview-category-amount">${esc(total)} <b aria-hidden="true">›</b></span></button>`;
 }).join('')}</div></section>`;
}
function accountDetails(k){
 const m=getModel(),rows=rowsFor(k,m);if(!allowed('dashboard')||!allowed('sec-chart-accounts'))return;
 if(!rows.length){if(groups[k])ui108.modal(groups[k],'<p>No active accounts in this group.</p>',[{label:'Close',value:false}]);return;}
 const roots=new Map();for(const row of rows){if(!roots.has(row.root))roots.set(row.root,[]);roots.get(row.root).push(row)}
 const title=groups[k]||rows[0].root.name;
 const body=`<p>${esc(labelMonth(state.month))} · Original account currencies</p><div class="overview-details">${[...roots].map(([root,items])=>
  `<section><h4>${esc(root.code)} · ${esc(root.name)}</h4>${items.filter(r=>r.posting||r.a!==root).map(r=>{
   const v=r.posting&&m.hasMonth(state.month)?valueFor(r,state.month,k==='support'||flowAccount(r)):null;
   return `<div class="overview-detail-row"><span><small>${esc(r.a.code)}</small> ${esc(r.a.name)}</span><strong>${r.posting?esc(money(v,r.a.currency)):'Group'}</strong></div>`;
  }).join('')}</section>`).join('')}</div>`;
 ui108.modal(title,body,[{label:'Close',value:false}],true);
}
function balances(){return directory('Cash & bank accounts',['cash','bank'])}
function chart(){
 const months=Array.from({length:6},(_,i)=>{const d=new Date(state.month+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()-5+i);return d.toISOString().slice(0,7)});
 return `<section class="dash-card112"><header><div><h3>Income & expenses</h3><small>Monthly activity · ${esc(state.currency)}</small></div>${shortcuts([['report-pl','Profit & loss']])}</header><div class="dash-table-wrap112"><table><thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net result</th></tr></thead><tbody>${months.map(m=>{const i=amount('income',m),e=amount('expense',m);return `<tr><td>${esc(labelMonth(m))}</td><td>${esc(money(i))}</td><td>${esc(money(e))}</td><td>${esc(money(i===null||e===null?null:i-e))}</td></tr>`}).join('')}</tbody></table></div></section>`;
}
function upcoming(){const recurring=(window.PrivateReminders14229?.ready()?RecurringStore.items||[]:[]).filter(x=>!x.paused&&!x.is_sample&&!['rec-rent','rec-wifi'].includes(String(x.id))&&x.nextDate),scheduled=typeof getScheduledAlerts104==='function'?getScheduledAlerts104().map(x=>({memo:x.title,nextDate:x.date,currency:'',amount:null})):[];return [...recurring,...scheduled].sort((a,b)=>String(a.nextDate).localeCompare(String(b.nextDate))).slice(0,4)}
function obligations(){const list=upcoming();return `<section class="dash-card112 dash-obligations112"><header><div><h3>Upcoming Obligations</h3><small>Scheduled items and reminders</small></div><button type="button" data-go112="transactions-recurring">View all ${icon('arrow')}</button></header>${list.length?list.map(row=>`<button class="dash-upcoming-line112" type="button" data-go112="transactions-recurring"><time>${esc(date(row.nextDate))}</time><span><strong>${esc(row.memo||'Scheduled entry')}</strong><small>${esc(row.reference||'Upcoming')}</small></span><b>${row.amount==null?'Scheduled':money(num(row.amount),row.currency||state.currency)}</b></button>`).join(''):'<p class="dash-empty112">No upcoming items in the current records.</p>'}</section>`}
function submissions(){let rows=[];if(typeof reviewStaffJournals!=='undefined')rows=reviewStaffJournals.filter(x=>x.status==='submitted');const other=typeof DemoAccess!=='undefined'?DemoAccess.submissions.filter(x=>x.status==='pending'):[];return{rows,other,count:rows.length+other.length}}
function approval(){const s=submissions(),rows=[...s.rows.map(x=>({label:x.period_start?formatAppDate(x.period_start):'Journal submission',detail:'Staff journal',date:x.submitted_at,owner:(typeof liveProfiles!=='undefined'?liveProfiles.find(p=>p.id===x.owner_id)?.full_name:'')||'Sub-user'})),...s.other.map(x=>({label:x.memo||'Entry submission',detail:x.reference||'Submitted entry',date:x.submittedAt||x.date,owner:(typeof liveProfiles!=='undefined'?liveProfiles.find(p=>p.id===x.submittedBy)?.full_name:'')||'Sub-user'}))].slice(0,3);return `<section class="dash-card112 dash-approvals112"><header><div><h3>Pending Approvals <b class="dash-count112">${s.count}</b></h3><small>Sub-user entry submissions</small></div><button type="button" data-go112="user-entry-review">View all ${icon('arrow')}</button></header><div class="dash-table-wrap112"><table><thead><tr><th>Submitted by</th><th>Description</th><th>Date</th><th>Status</th></tr></thead><tbody>${rows.length?rows.map(x=>`<tr data-go112="user-entry-review" tabindex="0"><td>${esc(x.owner)}</td><td>${esc(x.label)}<small>${esc(x.detail)}</small></td><td>${date(String(x.date||'').slice(0,10))}</td><td><span class="dash-status112">Pending</span></td></tr>`).join(''):'<tr><td colspan="4">No submissions waiting for approval.</td></tr>'}</tbody></table></div></section>`}
function journal(){const seen=new Set(),rows=posted().filter(l=>l.date?.slice(0,7)===state.month).sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.created_at||'').localeCompare(String(a.created_at||''))).filter(l=>{const k=String(l.id);if(seen.has(k))return false;seen.add(k);return true}).slice(0,4);return `<section class="dash-card112 dash-journal112"><header><div><h3>Newest Journal Entries</h3><small>Posted double entries · ${esc(labelMonth(state.month))}</small></div><button type="button" data-go112="transactions-all">View all ${icon('arrow')}</button></header><div class="dash-table-wrap112"><table><thead><tr><th>Date</th><th>Entry ID</th><th>Description</th><th>Currency</th></tr></thead><tbody>${rows.length?rows.map(x=>`<tr data-go112="transactions-all" tabindex="0"><td>${date(x.date)}</td><td>${esc(x.id)}</td><td>${esc(x.generalMemo||x.memo||'Posted entry')}</td><td>${esc(x.currency)}</td></tr>`).join(''):'<tr><td colspan="4">No posted journal entries this month.</td></tr>'}</tbody></table></div></section>`}
function workLinks(title,items){const links=shortcuts(items);return links?`<section class="dash-card112"><header><h3>${title}</h3></header><div class="dash-links112">${links}</div></section>`:''}
let documents=null,documentRequest=0;
async function readDocumentIndex(){
 if(!allowed('document-editor105')||!admin82())return;
 const actor=owner(),db=ojmDb,request=++documentRequest;
 try{
  const result=await localFirst14333.loadDocuments();if(result.error)throw result.error;
  if(owner()!==actor||ojmDb!==db||request!==documentRequest)return;
  documents={rows:(result.data||[]).filter(r=>r.data?.documentKind14297!=='template').sort((a,b)=>String(b.updated_at).localeCompare(String(a.updated_at))).slice(0,5)};
 }catch{if(owner()!==actor||ojmDb!==db||request!==documentRequest)return;documents={error:'Saved documents could not be loaded.'}}
 if(state.tab==='Documents'&&host.classList.contains('active'))render();
}
function recentDocuments(){
 if(!allowed('document-editor105')||!admin82())return '';
 const list=documents?.rows;
 return `<section class="dash-card112"><header><h3>Recently saved documents</h3><button type="button" data-doc-list>Open saved documents ${icon('arrow')}</button></header>
 ${list?.length?'<ul class="overview-documents">'+list.map(r=>`<li><strong>${esc(r.data.title||'Untitled')}</strong><span>${date((r.updated_at||r.created_at||'').slice(0,10))}</span></li>`).join('')+'</ul>':`<p>${esc(documents?.error||(list?'No saved documents.':'Loading saved documents…'))}</p>`}</section>`;
}
function secondary(){
 const branches=keys=>keys.map(k=>'branch:'+k);
 switch(state.tab){
 case 'Finance':return directory('Chart of accounts',Object.keys(classes))+chart()+balances();
 case 'People':return directory('Staff & payroll accounts',branches(['1200','2200','5300']))+(allowed('user-entry-review')?approval():'')+workLinks('People & payroll',[['sub-users-workspace','Sub-users'],['payroll-overview','Payroll overview'],['payroll-employees','Employees']]);
 case 'Operation':return directory('Operating accounts',branches(['1000','1100','1300','1400','1500','2000','2300','4000','5000','5100','5400']))+(allowed('transactions-recurring')?obligations():'');
 case 'Compliance':return directory('Tax, statutory & control accounts',[...branches(['2100','5200']),'system'])+workLinks('Closing & compliance',[['period-review','Period closing'],['tax-overview','Tax & SSO'],['transactions-voided','Audit log']]);
 case 'Documents':return recentDocuments()+workLinks('Documents & reports',[['document-editor105','Document editor'],['transactions-vouchers14299','Bookkeeping documents'],['report-pl','Profit & loss'],['report-bs','Balance sheet']])+(allowed('transactions-all')?journal():'');
 }
 return '';
}
function detailedOverview(){
 const chartReady=allowed('sec-chart-accounts')&&getModel().entries.length;
 const income=amount('income'),expense=amount('expense');
 const overviewCards=chartReady?`<section class="overview-summary"><header><h2>Monthly activity</h2><small>${esc(labelMonth(state.month))} · ${esc(state.currency)}</small></header><div class="overview-metrics">${['revenue','otherIncome','cogs','operating','support'].map(metric).join('')}</div><footer class="overview-result"><span>Net income for ${esc(labelMonth(state.month))}</span><strong>${esc(money(income==null||expense==null?null:income-expense))}</strong></footer></section>`:'';
 return overviewCards+directory('Explore your accounts',Object.keys(classes))+`<div class="dash-bottom112">${allowed('transactions-all')?journal():''}${allowed('transactions-recurring')?obligations():''}</div>`;
}
function welcome(business,first,filters){
 const quick=[['journal','Open journal','doc'],['Overview','View overview','bank'],['Graphs','Compare graphs','revenue']];
 const links=quick.filter(([k])=>k==='Overview'||(k==='Graphs'?allowed('sec-chart-accounts'):allowed(k))).map(([target,label,mark])=>
  `<button type="button" ${target==='journal'?'data-go112':'data-dash-open'}="${target}">${icon(mark)} ${esc(label)}</button>`).join('');
 const financial=allowed('sec-chart-accounts')&&model.entries.length;
 const current=allowed('transactions-recurring')&&upcoming().find(row=>row.nextDate>=appLocalDate());
 const focus=current?`<button type="button" class="welcome-focus" data-go112="transactions-recurring">${icon('calendar')} <span>Next on the calendar</span> <strong>${esc(current.memo||'Scheduled entry')}</strong> <time>${date(current.nextDate)}</time></button>`:'';
 return `<section class="dash-hero112 welcome-cover">
  <img class="welcome-photo" src="assets/dashboard/vientiane-terrace.webp" width="1485" height="1059" alt="Lantern-lit garden terrace overlooking Patuxai at dusk">
  <div class="welcome-intro"><small>${esc(business)}</small><h1>${first?'Welcome back,':'Welcome to'} <span>${esc(first||business)}</span></h1>
  <p>${esc(formatAppDate(appLocalDate()))}</p><nav class="welcome-actions" aria-label="Workspace shortcuts">${links}</nav></div></section>
  ${financial?`<section class="welcome-glance"><div><h2>Month at a glance</h2>${filters}</div><dl>${[['income','Income'],['expense','Expenses']].map(([id,label])=>`<div><dt>${label}</dt><dd>${esc(money(amount(id)))}</dd></div>`).join('')}</dl></section>`:''}${focus}`;
}
const graphs=window.createLedgerGraphs({owner,allowed,state,money,esc,valueFor,flowAccount,groups,render,model:getModel});
function selectDashboardTab(tab){
 if(!tabs.includes(tab)||tab==='Graphs'&&!allowed('sec-chart-accounts'))return;
 state.tab=tab;render();
 if(tab==='Documents')void readDocumentIndex();
 if(tab==='Graphs')void graphs.prepareRange();
}
function render(){
 const actor=owner();if(state.owner!==actor){documents=null;documentRequest++;state.tab='Home';state.month=monthNow();state.currency='LAK';state.owner=actor;graphs.reset()}
 model=overview();
 try{
  state.mappings=Object.fromEntries(Object.keys(groups).map(k=>[k,rowsFor(k).filter(r=>r.posting).map(r=>String(r.a.id||r.a.code))]));
  if(state.tab==='Graphs'&&!allowed('sec-chart-accounts'))state.tab='Home';
  const signed=allowed('dashboard'),current=state.tab;
  const first=signed?String(liveProfile.full_name||'').trim().split(/\s+/)[0]:'';
  const business=signed&&BusinessSettings.current.companyName||'Oon Jai Marketplace';
  const heading=current==='Home'?(first?'Welcome back, '+first:'Welcome to '+business):current==='Operation'?'Operations':current;
  const currencyList=[...new Set(['LAK','USD','THB',...model.entries.filter(r=>r.posting).map(r=>r.a.currency),...(typeof CurrencyStore==='undefined'?[]:CurrencyStore.currencies.map(c=>c.code))])].filter(c=>c&&c!=='NA'&&c!=='__PARENT__');
  const filters=`<div class="dash-hero-controls112"><label>${icon('calendar')} Month <input type="month" data-month112 value="${esc(state.month)}"></label><label>Currency <select data-currency112>${currencyList.map(c=>`<option value="${esc(c)}" ${state.currency===c?'selected':''}>${esc(c)}</option>`).join('')}</select></label></div>`;
  host.innerHTML=`<div class="dash-shell112" data-dash-view="${esc(current)}"><nav class="dash-tabs112" role="tablist" aria-label="Overview views">${tabs.filter(t=>t!=='Graphs'||allowed('sec-chart-accounts')).map(t=>`<button role="tab" data-tab112="${t}" aria-selected="${t===current}" type="button">${t==='Operation'?'Operations':t}</button>`).join('')}</nav>
  <div class="dash-content112">${current==='Home'&&signed?welcome(business,first,filters):`<section class="dash-hero112"><div class="dash-hero-copy112"><small>${esc(business)}</small><h1>${esc(heading)}</h1><p>${current==='Home'?esc(formatAppDate(appLocalDate())):current==='Graphs'?'Account comparisons by month':esc(labelMonth(state.month))+' accounting overview'}</p></div>
  ${filters}</section>
  ${signed?(current==='Overview'?detailedOverview():current==='Graphs'?graphs.view(model):secondary()):'<p class="dash-empty112">Sign in to see your overview.</p>'}`}</div></div>`;
  graphs.mount(host,current==='Graphs'&&signed);
  host.style.setProperty('--dash-zoom112',String(state.zoom));document.body.classList.toggle('dash-active112',host.classList.contains('active'));window.updateDashboardDock112?.();
 }finally{model=null}
}
let presentationRequest=0;
function applyPresentation(on){document.body.classList.toggle('dash-present112',on);document.body.classList.toggle('workspace-full1439',on);document.getElementById('document-editor105')?.classList.remove('expanded108');updateDock()}
async function presentation(on){
 state.present=on;const request=++presentationRequest;
 // Commit the desktop rail and workspace together, before the native viewport resize.
 const coordinated=matchMedia('(min-width:641px)').matches;
 if(coordinated){document.body.classList.add('workspace-switch14327');applyPresentation(on)}
 try{if(on&&!document.fullscreenElement)await document.documentElement.requestFullscreen?.();else if(!on&&document.fullscreenElement)await document.exitFullscreen?.()}catch{/* Workspace mode remains available when browser fullscreen is unavailable. */}
 if(request!==presentationRequest)return;
 if(!coordinated)applyPresentation(state.present);
 requestAnimationFrame(()=>requestAnimationFrame(()=>{if(request===presentationRequest)document.body.classList.remove('workspace-switch14327')}));
}

window.workspaceFullscreen1440={toggle:()=>presentation(!state.present),set:presentation};
function updateDock(){
 const dock=byId('workspaceTools108');if(!dock)return;
 const active=host.classList.contains('active');document.body.classList.toggle('dash-active112',active);
 const editor=byId('docExpandDock112');
 if(editor){editor.hidden=true;const expanded=!!byId('document-editor105')?.classList.contains('expanded108');editor.setAttribute('aria-pressed',String(expanded));editor.title=expanded?'Retract Document Editor':'Expand Document Editor';editor.setAttribute('aria-label',editor.title);}
 for(const id of ['dashZoomOut112','dashZoomIn112']){const b=byId(id);if(b)b.hidden=!active;}
 if(owner()!=='guest')dock.hidden=false;
}
window.updateDashboardDock112=updateDock;
function addDock(){const dock=byId('workspaceTools108');if(!dock||byId('docExpandDock112'))return;const editor=document.createElement('button');editor.type='button';editor.id='docExpandDock112';editor.innerHTML=icon('expand');editor.onclick=()=>{byId('document-editor105')?.classList.toggle('expanded108');window.syncDocumentExpand112?.(byId('document-editor105')?.classList.contains('expanded108'))};dock.append(editor);updateDock()}
function zoom(delta){state.zoom=Math.max(.75,Math.min(1.5,Math.round((state.zoom+delta)*10)/10));
  host.style.setProperty('--dash-zoom112',String(state.zoom));const out=byId('dashZoomLabel112');if(out)out.textContent=Math.round(state.zoom*100)+'%'}
function profileDock(){const dock=byId('workspaceTools108');if(!dock||byId('dashProfile112'))return;const button=document.createElement('button');button.id='dashProfile112';button.type='button';button.title='Account profile';button.setAttribute('aria-label','Account profile');button.innerHTML='<span>OJ</span>';button.onclick=()=>{const menu=byId('headerAccountDropdown');if(menu){menu.hidden=!menu.hidden;button.setAttribute('aria-expanded',String(!menu.hidden));if(!menu.hidden){const b=(window.desktopScale14320?.rect(button)||button.getBoundingClientRect());menu.style.position='fixed';menu.style.left='auto';menu.style.right=((window.desktopScale14320?.width||innerWidth)-b.right)+'px';menu.style.bottom=((window.desktopScale14320?.height||innerHeight)-b.top+8)+'px';menu.style.top='auto';menu.style.zIndex='3000'}}else byId('headerAccountTrigger')?.click()};dock.append(button);const existingMenu=byId('headerAccountDropdown');if(existingMenu)document.body.append(existingMenu);function identity(){const avatar=byId('headerAccountInitials');button.innerHTML=avatar?.innerHTML||'<span>OJ</span>';button.hidden=owner()==='guest';button.title=(typeof liveProfile!=='undefined'&&liveProfile?.full_name)||'Account profile'}identity();setInterval(identity,30000)}
window.syncDocumentExpand112=()=>updateDock();
function refresh(){if(!host.classList.contains('active'))return;render()}
function install(){profileDock();addDock();render();new MutationObserver(updateDock).observe(host,{attributes:true,attributeFilter:['class']});document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&state.present)presentation(false)});host.addEventListener('click',e=>{const shortcut=e.target.closest('[data-dash-open]');if(shortcut)return selectDashboardTab(shortcut.dataset.dashOpen);if(e.target.closest('[data-doc-list]')&&allowed('document-editor105')&&admin82())return openDocumentEditor105({list:true});const t=e.target.closest('[data-tab112],[data-go112],[data-map112]');if(!t)return;if(t.dataset.tab112){selectDashboardTab(t.dataset.tab112)}else if(t.dataset.map112)accountDetails(t.dataset.map112);else if(t.dataset.go112)navigate(t.dataset.go112)});host.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('tr[data-go112]')){e.preventDefault();navigate(e.target.dataset.go112)}});host.addEventListener('change',e=>{if(e.target.matches('[data-month112]')){state.month=e.target.value||monthNow();const selected=state.month,actor=owner();render();if(state.tab==='Graphs'){void graphs.prepareRange();return;}window.yearWindow14333?.ensure(selected,selected).then(()=>{if(owner()===actor&&state.month===selected)refresh()}).catch(error=>showCenterStatus(error.message,true))}if(e.target.matches('[data-currency112]')){state.currency=e.target.value;render()}});const previous=window.switchTab;if(typeof previous==='function')window.switchTab=function(id,...rest){const r=previous.call(this,id,...rest);if(id==='dashboard'&&!window.workspaceViews14364?.reuseView(id)){render();addDock()}else updateDock();return r};document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.present)presentation(false);if(e.key==='Escape'&&byId('document-editor105')?.classList.contains('expanded108')){byId('document-editor105').classList.remove('expanded108');updateDock()}});setInterval(()=>{if(owner()!==state.owner||state.tab!=='Graphs'&&host.classList.contains('active')&&Date.now()-state.lastRefresh>20000){state.lastRefresh=Date.now();refresh()}},2000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.dashboardWarm112={tabs,render,amount,linesFor,state,mapDialog:accountDetails};
})();
