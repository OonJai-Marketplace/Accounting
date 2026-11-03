/* Keep tablet inputs and their account list in the visible keyboard viewport. */
(()=>{'use strict';
 if(document.documentElement.dataset.device132!=='tablet'||!window.visualViewport)return;
 const vv=window.visualViewport;
 const editable='input:not([readonly]):not([disabled]):not([type=checkbox]):not([type=radio]):not([type=button]),textarea:not([readonly]):not([disabled]),[contenteditable="true"],[contenteditable="plaintext-only"]';
 let active=null,frame=0,baseline=vv.height,host=null,original='',priority='',basePadding=0;
 function reset(){if(host)host.style.setProperty('padding-bottom',original,priority);host=null;document.documentElement.removeAttribute('data-tablet-keyboard14266')}
 function scrollHost(node){return node.closest('.workspace-scroll,.modal-body,[data-scroll-host]')||document.scrollingElement||document.body}
 function reveal(){frame=0;if(!active?.isConnected||document.activeElement!==active)return;
  const bottom=vv.offsetTop+vv.height-16,top=vv.offsetTop+24,rect=active.getBoundingClientRect();
  const list=active.getAttribute('aria-expanded')==='true'?Math.min(220,Math.max(0,vv.height-rect.height-64)):0;
  const targetBottom=bottom-list;
  const shift=rect.bottom>targetBottom?Math.min(rect.bottom-targetBottom,rect.top-top):rect.top<top?rect.top-top:0;
  if(Math.abs(shift)>2)scrollHost(active).scrollBy({top:shift,behavior:'instant'});
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(reveal)}
 function update(){baseline=Math.max(baseline,vv.height);const editing=active?.isConnected&&document.activeElement===active;
  if(!editing){reset();return}
  const occluded=Math.max(0,baseline-vv.height);
  if(occluded<=120){reset();return}
  const next=scrollHost(active);if(host!==next){reset();host=next;original=host.style.getPropertyValue('padding-bottom');priority=host.style.getPropertyPriority('padding-bottom');basePadding=parseFloat(getComputedStyle(host).paddingBottom)||0;}
  document.documentElement.setAttribute('data-tablet-keyboard14266','');
  host.style.setProperty('padding-bottom',(basePadding+occluded)+'px','important');schedule();
 }
 document.addEventListener('focusin',e=>{if(!e.target.matches?.(editable))return;active=e.target;if(active.closest?.('#journalEntry98')&&active.matches('input[type=text],input[type=search],textarea'))active.setAttribute('autocomplete','off');update();setTimeout(update,180)});
 document.addEventListener('focusout',e=>{if(e.target!==active)return;setTimeout(()=>{if(document.activeElement?.matches?.(editable))active=document.activeElement;else active=null;update()},100)});
 vv.addEventListener('resize',update);vv.addEventListener('scroll',schedule);window.addEventListener('resize',update);
 window.addEventListener('orientationchange',()=>{reset();baseline=vv.height;setTimeout(()=>{baseline=Math.max(vv.height,window.innerHeight||0);update()},250)});
 window.tabletJournal14266={reveal:()=>{update();schedule()}};
})();
