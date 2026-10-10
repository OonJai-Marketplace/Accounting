/* Keep the desktop/tablet action dock alongside the end of the active module. */
(()=>{'use strict';
const moduleSelector='section,article,.table-container,.v49-card,.th-panel,.table-module109,.je-card,.fund-summary113,.fund-result113,.area-banner113';
let frame=0,observed=null;
const resize=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;
function visible(element){
 const box=element.getBoundingClientRect(),style=getComputedStyle(element);
 return box.width>0&&box.height>0&&style.display!=='none'&&style.visibility!=='hidden'&&!['fixed','absolute'].includes(style.position);
}
function edge(module){
 // The tab itself may fill the viewport even when its last card ends halfway down.
 const cards=[...module.querySelectorAll(moduleSelector)].filter(visible);
 const leaves=cards.filter(card=>!cards.some(other=>other!==card&&card.contains(other)));
 const elements=leaves.length?leaves:[...module.children].filter(visible);
 let last=null;
 for(const element of elements){const box=element.getBoundingClientRect();if(!last||box.bottom>last.bottom+1||Math.abs(box.bottom-last.bottom)<=1&&box.right>last.right)last=box;}
 return last||module.getBoundingClientRect();
}
function place(){
 frame=0;
 const dock=document.getElementById('workspaceTools108');
 if(!dock)return;
 if(document.documentElement.dataset.device132!=='desktop'||document.body.classList.contains('restaurant-active1432')||document.body.classList.contains('subuser-expanded1438')){
  dock.style.removeProperty('--module-dock-bottom14269');dock.style.removeProperty('--module-dock-right14269');return;
 }
 const module=document.querySelector('.workspace-scroll .tab-content.active');
 if(module!==observed){if(observed)resize?.unobserve(observed);observed=module;if(observed)resize?.observe(observed);}
 if(!module||!visible(module))return;
 const physical=edge(module),scale=window.desktopScale14320?.scale||1,rect={bottom:physical.bottom/scale,right:physical.right/scale},vv=scale===1?window.visualViewport:null,layoutWidth=innerWidth/scale,layoutHeight=innerHeight/scale;
 const viewportBottom=vv?vv.offsetTop+vv.height:layoutHeight;
 const viewportRight=vv?vv.offsetLeft+vv.width:layoutWidth;
 const height=dock.getBoundingClientRect().height/scale||48;
 const bottom=Math.max(12,Math.min(layoutHeight-height-48,layoutHeight-Math.min(rect.bottom-12,viewportBottom-12)));
 const right=Math.max(12,Math.min(layoutWidth-48,layoutWidth-Math.min(rect.right-12,viewportRight-12)));
 const b=`${Math.round(bottom)}px`,r=`${Math.round(right)}px`;
 if(dock.style.getPropertyValue('--module-dock-bottom14269')!==b)dock.style.setProperty('--module-dock-bottom14269',b);
 if(dock.style.getPropertyValue('--module-dock-right14269')!==r)dock.style.setProperty('--module-dock-right14269',r);
}
function schedule(){if(!frame)frame=requestAnimationFrame(place)}
function ready(){
 schedule();window.addEventListener('page113',schedule);window.addEventListener('resize',schedule);window.addEventListener('desktopscale14320',schedule);
 window.addEventListener('scroll',schedule,true);
 window.visualViewport?.addEventListener('resize',schedule);
 window.visualViewport?.addEventListener('scroll',schedule);
 const root=document.querySelector('.workspace-scroll');
 if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','style']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
