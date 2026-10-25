/* Fit the existing reporting tree; scaling never changes the app or its cards. */
(()=>{'use strict';
const states=new Map();let queued=false;
const desktop=()=>innerWidth>640&&document.documentElement.dataset.device132!=='phone';
function paint(s,scale,fit=false){
 if(!s.viewport.isConnected||!s.viewport.clientWidth||!desktop())return;
 const pane=s.viewport.closest('.settings-stack-main143176');if(pane){const available=Math.max(180,Math.min(620,pane.getBoundingClientRect().bottom-s.viewport.getBoundingClientRect().top-16));s.viewport.style.height=Math.floor(available)+'px';}
 const width=s.tree.scrollWidth,height=s.tree.scrollHeight;if(!width||!height)return;
 const old=s.scale||1,cx=(s.viewport.scrollLeft+s.viewport.clientWidth/2)/old,cy=(s.viewport.scrollTop+s.viewport.clientHeight/2)/old;
 s.scale=fit?Math.min(1,(s.viewport.clientWidth-24)/width,(s.viewport.clientHeight-24)/height):Math.max(.02,Math.min(2,scale));s.fit=fit;
 s.tree.style.transform=`scale(${s.scale})`;s.stage.style.width=Math.ceil(width*s.scale)+'px';s.stage.style.height=Math.ceil(height*s.scale)+'px';
 s.range.value=String(Math.round(s.scale*100));s.percent.textContent=Math.round(s.scale*100)+'%';
 s.viewport.scrollLeft=fit?0:Math.max(0,cx*s.scale-s.viewport.clientWidth/2);s.viewport.scrollTop=fit?0:Math.max(0,cy*s.scale-s.viewport.clientHeight/2);
}
function mount(host=document.getElementById('settings-organization14229')){
 const viewport=host?.querySelector('.organization-scroll14231');if(!viewport||!desktop()||states.has(viewport))return;
 const controls=document.createElement('div');controls.className='organization-zoom-controls143180';controls.setAttribute('aria-label','Organization chart zoom');
 controls.innerHTML='<button type="button" class="je-btn je-btn-secondary" data-zoom="fit">Fit all</button><button type="button" class="je-btn je-btn-secondary" data-zoom="out" aria-label="Zoom out">−</button><input type="range" min="2" max="200" step="1" aria-label="Chart zoom percentage"><output aria-live="polite">100%</output><button type="button" class="je-btn je-btn-secondary" data-zoom="in" aria-label="Zoom in">+</button><button type="button" class="je-btn je-btn-secondary" data-zoom="actual">100%</button>';
 const stage=document.createElement('div'),tree=document.createElement('div');stage.className='organization-zoom-stage143180';tree.className='organization-zoom-tree143180';tree.append(...viewport.childNodes);stage.append(tree);viewport.append(stage);viewport.before(controls);viewport.classList.add('organization-zoom-viewport143180');viewport.tabIndex=0;viewport.setAttribute('aria-label','Organization chart. Use zoom controls, then scroll to inspect.');
 const s={viewport,stage,tree,controls,range:controls.querySelector('input'),percent:controls.querySelector('output'),scale:1,fit:true};states.set(viewport,s);
 controls.onclick=e=>{const action=e.target.closest('[data-zoom]')?.dataset.zoom;if(action)paint(s,action==='actual'?1:s.scale*(action==='in'?1.25:.8),action==='fit');};s.range.oninput=()=>paint(s,Number(s.range.value)/100);
 s.resize=new ResizeObserver(()=>paint(s,s.scale,s.fit));s.resize.observe(viewport);requestAnimationFrame(()=>paint(s,1,true));
}
function refresh(){queued=false;for(const [viewport,s] of states){if(!viewport.isConnected||!desktop()){s.resize.disconnect();if(viewport.isConnected){viewport.replaceChildren(...s.tree.childNodes);s.controls.remove();viewport.classList.remove('organization-zoom-viewport143180');viewport.style.removeProperty('height');viewport.removeAttribute('tabindex');viewport.removeAttribute('aria-label');}states.delete(viewport);}}mount();for(const s of states.values())paint(s,s.scale,s.fit);}
function schedule(){if(!queued){queued=true;requestAnimationFrame(refresh);}}
window.OrganizationZoom143180={mount,refresh:schedule};
window.addEventListener('page113',()=>{if(document.getElementById('settings-organization14229')?.classList.contains('active'))for(const s of states.values())s.fit=true;schedule();});window.addEventListener('resize',schedule);
new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['data-device132']});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
})();
