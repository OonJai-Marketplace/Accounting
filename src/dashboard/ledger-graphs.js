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
 const types={line:'Line',smooth:'Smooth line (wave)',area:'Area',bar:'Vertical bars',horizontal:'Horizontal bars'};
 const intervals={daily:'Daily',weekly:'Weekly',monthly:'Monthly'};
 const make=(preset,id=crypto.randomUUID())=>({id,title:presets[preset].name,type:'line',interval:'monthly',lines:[...presets[preset].lines]});
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
    board.cards=saved.cards.filter(c=>c&&typeof c.id==='string'&&!ids.has(c.id)&&ids.add(c.id)&&typeof c.title==='string'&&Array.isArray(c.lines)).map(c=>({...c,type:types[c.type]?c.type:'line',interval:intervals[c.interval]?c.interval:'monthly',lines:[...new Set(c.lines.filter(l=>typeof l==='string'))]}));
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
 function timePoints(interval){
  const month=state.month,[year,mm]=month.split('-').map(Number),last=new Date(Date.UTC(year,mm,0)).getUTCDate();
  const date=d=>month+'-'+String(d).padStart(2,'0');
  if(interval==='monthly')return periods(month,settings().months).map(m=>({month:m,from:m+'-01',to:m+'-31',label:shortMonth(m,true),short:shortMonth(m)}));
  const points=[];
  for(let day=1;day<=last;){
   // Calendar weeks run Monday–Sunday and are clipped to the selected month.
   const weekday=new Date(date(day)+'T12:00:00Z').getUTCDay();
   const end=interval==='weekly'?Math.min(last,day+(7-weekday)%7):day;
   const label=interval==='weekly'?day+'–'+end+' '+shortMonth(month,true):day+' '+shortMonth(month,true);
   points.push({month,from:date(day),to:date(end),label,short:interval==='weekly'?day+'–'+end:String(day)});day=end+1;
  }
  return points;
 }
 function values(item,points,m,interval){
  if(!item)return points.map(()=>null);
  const scoped=rows=>rows.filter(r=>r.posting&&r.a.currency===state.currency);
  function amount(row,point,movement){
   if(interval==='monthly')return Math.round(valueFor(row,point.month,movement)*100);
   if(movement)return [...row.days].reduce((n,[date,value])=>n+(date>=point.from&&date<=point.to?value:0),0);
   const january=point.month.slice(0,4)+'-01';
   let cents=row.openingMonth>=january&&row.openingMonth<=point.month?row.opening:0;
   for(const [date,value] of row.balanceDays)if(date>=january+'-01'&&date<=point.to)cents+=value;
   return cents;
  }
  const part=(rows,point,basis)=>rows.reduce((n,r)=>n+amount(r,point,basis===monthly),0),rows=scoped(item.rows);
  if(item.id==='net'){
   const income=scoped(m.buckets.get('income')||[]),expense=scoped(m.buckets.get('expense')||[]);
   return points.map(p=>m.hasMonth(p.month)&&(income.length||expense.length)?(part(income,p,monthly)-part(expense,p,monthly))/100:null);
  }
  return points.map(p=>rows.length&&m.hasMonth(p.month)?part(rows,p,item.basis)/100:null);
 }
 const seriesColor=i=>palette[i]||`hsl(${Math.round((i*137.5)%360)} 52% 36%)`;
 const dash=i=>['','7 3','2 3','10 3 2 3'][i%4];
 const shortMonth=(p,year=false)=>new Date(p+'-01T12:00:00Z').toLocaleDateString('en-GB',{month:'short',...(year?{year:'2-digit'}:{}),timeZone:'UTC'});
 function swatch(s){return `<svg aria-hidden="true" viewBox="0 0 24 8"><path d="M1 4H23" fill="none" stroke="${s.color}" stroke-width="3" stroke-dasharray="${s.dash}"/></svg>`}
 function card(c,main,context){
  const {m,catalog}=context,interval=c.interval||'monthly',points=timePoints(interval),type=c.type||'line';
  const lines=c.lines.map((id,i)=>{
   const item=catalog.get(id);
   const basis=item?.basis===monthly?({daily:'Daily activity',weekly:'Weekly activity',monthly})[interval]:({daily:'Day-end balance',weekly:'Week-end balance',monthly:closing})[interval];
   return {label:item?.label||'Unavailable account',basis:item?basis:'',color:seriesColor(i),dash:dash(i),data:values(item,points,m,interval)};
  });
  plots.set(c.id,{points,lines,type,active:points.length-1});
  return `<article class="ledger-graph ${main?'graph-main':'graph-small'}" data-graph-id="${esc(c.id)}">
   <header><div class="graph-title"><button type="button" class="graph-grip" aria-label="Move ${esc(c.title)}" title="Drag to move or click for placement" data-graph-action="move">${icon('grip')}</button><h3>${esc(c.title)}</h3></div>
   <button type="button" class="graph-edit" aria-label="Settings for ${esc(c.title)}" data-graph-action="edit">${icon('edit')} Settings</button></header>
   <div class="graph-plot" data-graph-plot aria-label="${esc(c.title)} ${interval} ${esc(types[type])} graph"></div>
   <div class="graph-readout"><div><span data-graph-month>${esc(points.at(-1).label)}</span><span>${esc(state.currency)} · ${intervals[interval]}</span></div>
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
  const {points,lines,type}=chart,known=lines.flatMap(s=>s.data.filter(v=>v!==null));
  if(!known.length){node.innerHTML='<p class="graph-empty">No figures for the selected lines, period and currency.</p>';return;}
  const horizontal=type==='horizontal',bars=horizontal||type==='bar';
  const min=known.reduce((v,n)=>Math.min(v,n),0),max=known.reduce((v,n)=>Math.max(v,n),0);
  const rough=(max-min||1)/3,base=10**Math.floor(Math.log10(rough)),step=([1,2,2.5,5,10].find(v=>v*base>=rough)||10)*base;
  const lo=Math.floor(min/step)*step,hi=Math.ceil(max/step)*step||(!min?step:0);
  const top=10,bottom=h-24,left=52,right=w-12,count=points.length;
  const pos=i=>horizontal?top+(bottom-top)*(i+.5)/count:bars?left+(right-left)*(i+.5)/count:left+(right-left)*i/Math.max(1,count-1);
  const value=v=>horizontal?left+(v-lo)*(right-left)/(hi-lo):bottom-(v-lo)*(bottom-top)/(hi-lo);
  const compact=new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:2}),axis=[];
  for(let i=0;i<=Math.round((hi-lo)/step);i++){
   const n=lo+i*step,v=value(n),label=esc(compact.format(n));
   axis.push(horizontal?`<path d="M${v} ${top}V${bottom}" class="graph-gridline"/><text x="${v}" y="${h-6}" text-anchor="middle">${label}</text>`:`<path d="M${left} ${v}H${right}" class="graph-gridline"/><text x="${left-6}" y="${v+4}" text-anchor="end">${label}</text>`);
  }
  const stride=Math.max(1,Math.ceil(count*(horizontal?18:42)/(horizontal?bottom-top:right-left)));
  const labels=points.map((p,i)=>(i%stride===0&&i<count-(stride>1?1:0)||i===count-1)?(horizontal?`<text x="${left-6}" y="${pos(i)+4}" text-anchor="end">${esc(p.short)}</text>`:`<text x="${pos(i)}" y="${h-6}" text-anchor="${i===0?'start':i===count-1?'end':'middle'}">${esc(p.short)}</text>`):'').join('');
  const paths=lines.map((s,j)=>{
   if(bars){
    const band=(horizontal?bottom-top:right-left)/count*.8,size=band/lines.length;
    return s.data.map((v,i)=>{
     if(v===null)return '';const p=pos(i)-band/2+j*size,z=value(0),end=value(v);
     const attrs=horizontal?`x="${Math.min(z,end)}" y="${p}" width="${Math.abs(end-z)}" height="${size*.9}"`:`x="${p}" y="${Math.min(z,end)}" width="${size*.9}" height="${Math.abs(end-z)}"`;
     return `<rect ${attrs} fill="${s.color}" opacity=".9"><title>${esc(points[i].label+' · '+s.label+' '+money(v))}</title></rect>`;
    }).join('');
   }
   const segments=[];let segment=[];
   s.data.forEach((v,i)=>{if(v===null){if(segment.length)segments.push(segment);segment=[]}else segment.push([pos(i),value(v)])});if(segment.length)segments.push(segment);
   return segments.map(pts=>{
    let path='M'+pts[0].join(' ');
    for(let i=1;i<pts.length;i++){
     const [x0,y0]=pts[i-1],[x1,y1]=pts[i],mid=(x0+x1)/2;
     path+=type==='smooth'||type==='area'?` C${mid} ${y0} ${mid} ${y1} ${x1} ${y1}`:` L${x1} ${y1}`;
    }
    const area=type==='area'?`<path d="${path} L${pts.at(-1)[0]} ${value(0)} L${pts[0][0]} ${value(0)} Z" fill="${s.color}" opacity=".14"/>`:'';
    return area+`<path d="${path}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-dasharray="${s.dash}"/>`+pts.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.6" fill="${s.color}"/>`).join('');
   }).join('');
  }).join('');
  node.innerHTML=`<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">${axis.join('')}${labels}${paths}<line class="graph-cursor"/></svg>`;
  node.tabIndex=0;node.setAttribute('role','slider');node.setAttribute('aria-label','Inspection period');node.setAttribute('aria-valuemin','1');node.setAttribute('aria-valuemax',String(count));
  function inspect(index){
   const i=Math.max(0,Math.min(count-1,index));chart.active=i;
   const cursor=node.querySelector('.graph-cursor'),v=pos(i);
   for(const [k,n] of Object.entries(horizontal?{x1:left,x2:right,y1:v,y2:v}:{x1:v,x2:v,y1:top,y2:bottom}))cursor.setAttribute(k,n);
   const readout=node.nextElementSibling;readout.querySelector('[data-graph-month]').textContent=points[i].label;
   readout.querySelectorAll('li strong').forEach((el,j)=>el.textContent=money(lines[j].data[i]));
   node.setAttribute('aria-valuenow',String(i+1));node.setAttribute('aria-valuetext',points[i].label+', '+lines.map(l=>l.label+' '+money(l.data[i])).join(', '));
  }
  const inspectEvent=e=>{const r=node.getBoundingClientRect(),v=horizontal?(e.clientY-r.top)*h/r.height:(e.clientX-r.left)*w/r.width,start=horizontal?top:left,span=horizontal?bottom-top:right-left;inspect(Math.round((v-start)/span*(bars?count:count-1)-(bars?.5:0)))};
  node.onpointermove=e=>{if(e.pointerType==='mouse')inspectEvent(e)};node.onclick=inspectEvent;
  node.onkeydown=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();inspect(e.key==='Home'?0:e.key==='End'?count-1:chart.active+(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1))}};
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
   <div class="graph-settings-row"><label>Graph type<select data-plain14285 name="type">${Object.entries(types).map(([k,v])=>`<option value="${k}" ${k===draft.type?'selected':''}>${v}</option>`).join('')}</select></label>
   <label>Group by<select data-plain14285 name="interval">${Object.entries(intervals).map(([k,v])=>`<option value="${k}" ${k===draft.interval?'selected':''}>${v}</option>`).join('')}</select></label></div>
   <p class="graph-period-help">Daily and weekly use the selected month. Monthly uses the board’s comparison period. Weeks run Monday–Sunday.</p>
   <label>Report preset<select data-plain14285 name="preset"><option value="">Custom comparison</option>${Object.entries(presets).map(([k,v])=>`<option value="${k}">${esc(v.name)}</option>`).join('')}</select></label>
   <label>Find lines<input type="search" data-graph-search placeholder="Search report lines, account codes or names"></label><div class="graph-line-head"><strong>Lines on this graph</strong><span data-count></span></div>
   <div class="graph-options"></div><p data-error role="alert"></p>`;
  const d=dialog(c?'Graph settings':'Add graph',form,root=>{
   const title=root.querySelector('[name=title]').value.trim();
   if(!title||!selected.size){root.querySelector('[data-error]').textContent=title?'Select at least one line.':'Enter a graph title.';return false}
   const saved={...draft,title,type:root.querySelector('[name=type]').value,interval:root.querySelector('[name=interval]').value,lines:[...selected]};if(c)board.cards[board.cards.indexOf(c)]=saved;else board.cards.push(saved);
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
