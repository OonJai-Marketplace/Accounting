/* Keep tablet inputs and their account list in the visible keyboard viewport. */
(()=>{'use strict';
 if(document.documentElement.dataset.device132!=='tablet'||!window.visualViewport)return;
 const vv=window.visualViewport;
 const editable='input:not([readonly]):not([disabled]):not([type=checkbox]):not([type=radio]):not([type=button]),textarea:not([readonly]):not([disabled]),[contenteditable="true"],[contenteditable="plaintext-only"]';
 let active=null,frame=0,baseline=vv.height*(vv.scale||1),baselineWidth=vv.width*(vv.scale||1),host=null,original='',priority='',basePadding=0;
 function reset(){if(host)host.style.setProperty('padding-bottom',original,priority);host=null;document.documentElement.removeAttribute('data-tablet-keyboard14266')}
 function scrollHost(node){return node.closest('.workspace-scroll,.modal-body,[data-scroll-host]')||document.scrollingElement||document.body}
 function reveal(){frame=0;if(!active?.isConnected||document.activeElement!==active)return;
  const hostRect=scrollHost(active).getBoundingClientRect(),bottom=Math.min(vv.offsetTop+vv.height,hostRect.bottom)-16,top=Math.max(vv.offsetTop,hostRect.top)+16,rect=active.getBoundingClientRect();
  // A visible field stays in place. The picker independently chooses above or
  // below; reserving a whole list below pushed account fields behind headers.
  const shift=rect.bottom>bottom?Math.max(0,Math.min(rect.bottom-bottom,rect.top-top)):rect.top<top?rect.top-top:0;
  if(Math.abs(shift)>2)scrollHost(active).scrollBy({top:shift,behavior:'instant'});
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(reveal)}
 function update(){const scale=vv.scale||1,height=vv.height*scale,width=vv.width*scale,editing=active?.isConnected&&document.activeElement===active;
  if(Math.abs(width-baselineWidth)>3){baselineWidth=width;baseline=height;}
  baseline=Math.max(baseline,height);
  if(!editing){reset();baseline=height;return}
  const occluded=Math.max(0,baseline-height);
  if(occluded<=120){reset();return}
  const next=scrollHost(active);if(host!==next){reset();host=next;original=host.style.getPropertyValue('padding-bottom');priority=host.style.getPropertyPriority('padding-bottom');basePadding=parseFloat(getComputedStyle(host).paddingBottom)||0;}
  document.documentElement.setAttribute('data-tablet-keyboard14266','');
  host.style.setProperty('padding-bottom',(basePadding+occluded/scale)+'px','important');schedule();
 }
 document.addEventListener('focusin',e=>{if(!e.target.matches?.(editable))return;active=e.target;if(active.closest?.('#journalEntry98')&&active.matches('input[type=text],input[type=search],textarea'))active.setAttribute('autocomplete','off');update();setTimeout(update,180)});
 document.addEventListener('focusout',e=>{if(e.target!==active)return;setTimeout(()=>{if(document.activeElement?.matches?.(editable))active=document.activeElement;else active=null;update()},100)});
 vv.addEventListener('resize',update);vv.addEventListener('scroll',schedule);window.addEventListener('resize',update);
 window.addEventListener('orientationchange',()=>{reset();setTimeout(()=>{baselineWidth=vv.width*(vv.scale||1);baseline=vv.height*(vv.scale||1);update()},250)});
 window.tabletJournal14266={reveal:()=>{update();schedule()}};
})();
