/* Shared period calendar. Specific transaction dates keep the single-date picker. */
(()=>{'use strict';
const clean=values=>[...new Set((values||[]).filter(v=>/^\d{4}-(0[1-9]|1[0-2])$/.test(v)))].sort();
const current=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')};
const monthLabel=value=>{const [y,m]=value.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('en',{month:'short',year:'numeric'})};
const yearMonths=y=>Array.from({length:12},(_,i)=>y+'-'+String(i+1).padStart(2,'0'));
const end=value=>{const [y,m]=value.split('-').map(Number);return value+'-'+new Date(y,m,0).getDate()};
function label(values){const list=clean(values);if(!list.length)return 'All months';if(list.length===1)return monthLabel(list[0]);const [y,m]=list[0].split('-').map(Number);if(list.length===12&&list.every((v,i)=>v===yearMonths(y)[i]))return String(y);if(list.length===3&&(m-1)%3===0&&list.every((v,i)=>v===y+'-'+String(m+i).padStart(2,'0')))return 'Q'+(1+(m-1)/3)+' '+y;return list.length+' selected months'}
let active=null;
function position(){
 if(!active)return;const {button,panel}=active;if(!button.isConnected)return close();
 const rect=button.getBoundingClientRect(),bounds=panel.getBoundingClientRect(),viewport=window.visualViewport;
 const left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0,width=viewport?.width||innerWidth,height=viewport?.height||innerHeight;
 panel.style.left=Math.max(left+8,Math.min(rect.left,left+width-bounds.width-8))+'px';
 panel.style.top=Math.max(top+8,Math.min(rect.bottom+4,top+height-bounds.height-8))+'px';
}

function close(focus=false){if(!active)return;const {button,panel}=active;panel.remove();button.setAttribute('aria-expanded','false');active=null;if(focus&&button.isConnected)button.focus({preventScroll:true})}
function open(button,values,onChange,options={}){
 if(active?.button===button)return close(true);close();let selected=new Set(clean(values)),year=Number(([...selected][0]||current()).slice(0,4)),mode=options.mode||'monthly';
 if(!['monthly','quarterly','yearly','custom'].includes(mode))mode='monthly';
 const panel=document.createElement('div');panel.className='oj-date-popup104 summary-period14331';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Select reporting period');panel.tabIndex=-1;active={button,panel};button.setAttribute('aria-expanded','true');document.body.append(panel);
 const validDate=value=>/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
 let from=validDate(options.from)?options.from:([...selected][0]||current())+'-01',to=validDate(options.to)?options.to:end([...selected].at(-1)||current());
 const apply=(list,kind=mode)=>{const months=clean(list),meta={mode:kind,year,from:kind==='custom'?from:months.length?months[0]+'-01':'',to:kind==='custom'?to:months.length?end(months.at(-1)):''};if(kind==='custom'&&(!validDate(from)||!validDate(to)||from>to)){panel.querySelector('[role=status]').textContent='Choose a valid start and end date.';return}close(true);onChange(months,meta)};
 function draw(){
 const heading=mode==='yearly'?(year-5)+'–'+(year+6):year;
 let grid='';if(mode==='monthly')grid='<div class="oj-date-grid104 month">'+yearMonths(year).map((value,i)=>'<button type="button" data-month="'+value+'" aria-pressed="'+selected.has(value)+'">'+new Date(year,i,1).toLocaleDateString('en',{month:'short'})+'</button>').join('')+'</div>';
 if(mode==='quarterly')grid='<div class="oj-date-grid104 quarter">'+[0,1,2,3].map(q=>'<button type="button" data-quarter="'+q+'" aria-pressed="'+(selected.size===3&&yearMonths(year).slice(q*3,q*3+3).every(m=>selected.has(m)))+'"><strong>Q'+(q+1)+'</strong><small>'+['Jan–Mar','Apr–Jun','Jul–Sep','Oct–Dec'][q]+'</small></button>').join('')+'</div>';
 if(mode==='yearly')grid='<div class="oj-date-grid104 month">'+Array.from({length:12},(_,i)=>year-5+i).map(y=>'<button type="button" data-year="'+y+'" aria-pressed="'+(selected.size===12&&yearMonths(y).every(m=>selected.has(m)))+'">'+y+'</button>').join('')+'</div>';
 if(mode==='custom')grid='<div class="period-range14331"><label>From<input type="date" data-from value="'+(from||'')+'"></label><label>Through<input type="date" data-to value="'+(to||'')+'"></label></div>';
 panel.innerHTML='<div class="oj-date-head104"><button type="button" data-step="-1" aria-label="Previous year">‹</button><strong>'+heading+'</strong><button type="button" data-step="1" aria-label="Next year">›</button></div>'+grid+'<div class="period-modes14331" role="group" aria-label="Calendar view">'+['monthly','quarterly','yearly',...(options.custom?['custom']:[])].map(m=>'<button type="button" data-mode="'+m+'" aria-pressed="'+(mode===m)+'">'+m[0].toUpperCase()+m.slice(1)+'</button>').join('')+'</div><div class="oj-date-footer104"><button type="button" data-now>This month</button><button type="button" data-all>All months</button><button type="button" data-clear>Clear</button></div><footer><span role="status">'+(selected.size?selected.size+' selected':'All months')+'</span><button type="button" data-apply>Apply</button></footer>';
 const validQuarter=selected.size===3&&[0,1,2,3].some(q=>yearMonths(year).slice(q*3,q*3+3).every(m=>selected.has(m))),validYear=selected.size===12&&yearMonths(Number([...selected][0]?.slice(0,4))).every(m=>selected.has(m));panel.querySelector('[data-apply]').disabled=mode==='quarterly'?!validQuarter:mode==='yearly'?!validYear:false;if(panel.querySelector('[data-apply]').disabled)panel.querySelector('[role=status]').textContent=mode==='quarterly'?'Choose a quarter':'Choose a year';
 const redrawFocus=selector=>{draw();position();panel.querySelector(selector)?.focus({preventScroll:true})};
 panel.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{year+=Number(b.dataset.step)*(mode==='yearly'?12:1);year=Math.max(1900,Math.min(9993,year));redrawFocus('[data-step="'+b.dataset.step+'"]')});
 panel.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;redrawFocus('[data-mode="'+mode+'"]')});
 panel.querySelectorAll('[data-month]').forEach(b=>b.onclick=()=>{selected.has(b.dataset.month)?selected.delete(b.dataset.month):selected.add(b.dataset.month);b.setAttribute('aria-pressed',String(selected.has(b.dataset.month)));panel.querySelector('[role=status]').textContent=selected.size?selected.size+' selected':'All months'});
 panel.querySelectorAll('[data-quarter]').forEach(b=>b.onclick=()=>{selected=new Set(yearMonths(year).slice(Number(b.dataset.quarter)*3,Number(b.dataset.quarter)*3+3));redrawFocus('[data-quarter="'+b.dataset.quarter+'"]')});
 panel.querySelectorAll('[data-year]').forEach(b=>b.onclick=()=>{selected=new Set(yearMonths(Number(b.dataset.year)));redrawFocus('[data-year="'+b.dataset.year+'"]')});
 if(mode==='custom'){panel.querySelector('[data-from]').onchange=e=>from=e.target.value;panel.querySelector('[data-to]').onchange=e=>to=e.target.value}
 panel.querySelector('[data-now]').onclick=()=>apply([current()],'monthly');panel.querySelector('[data-all]').title=options.allMonthsYear?'All months in '+year:'All available months';panel.querySelector('[data-all]').onclick=()=>apply(options.allMonthsYear?yearMonths(year):[],options.allMonthsYear?'yearly':'all');panel.querySelector('[data-clear]').onclick=()=>{selected.clear();from=to='';redrawFocus('[data-clear]')};panel.querySelector('[data-apply]').onclick=()=>apply([...selected]);
 }
 draw();position();panel.querySelector('[aria-pressed=true], [data-month]')?.focus({preventScroll:true});panel.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close(true)}if(e.key==='Tab'){const list=[...panel.querySelectorAll('button:not(:disabled),input:not(:disabled)')],index=list.indexOf(document.activeElement);if(e.shiftKey&&index<=0){e.preventDefault();list.at(-1).focus()}else if(!e.shiftKey&&index===list.length-1){e.preventDefault();list[0].focus()}}};
}
document.addEventListener('pointerdown',e=>{if(active&&!active.panel.contains(e.target)&&!active.button.contains(e.target))close()},true);window.addEventListener('page113',()=>close());window.addEventListener('resize',position);window.visualViewport?.addEventListener('resize',position);window.visualViewport?.addEventListener('scroll',position);
window.summaryPeriod14331={clean,current,label,monthLabel,yearMonths,end,open,close};
})();
