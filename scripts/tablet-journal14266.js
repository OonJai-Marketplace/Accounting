/* Keep focused tablet fields above the keyboard without changing viewport scale. */
(()=>{'use strict';
 if(document.documentElement.dataset.device132!=='tablet'||!window.visualViewport)return;
 const vv=window.visualViewport;
 const editable='input:not([readonly]):not([disabled]):not([type=checkbox]):not([type=radio]):not([type=button]),textarea:not([readonly]):not([disabled]),[contenteditable="true"],[contenteditable="plaintext-only"]';
 let active=null,frame=0,baseline=vv.offsetTop+vv.height,host=null,original='';
 function reset(){if(host)host.style.paddingBottom=original;host=null;document.documentElement.removeAttribute('data-tablet-keyboard14266')}
 function scrollHost(node){return node.closest('.workspace-scroll,.modal-body,[data-scroll-host]')||document.scrollingElement||document.body}
 function reveal(){frame=0;if(!active?.isConnected||document.activeElement!==active)return;
  const bottom=vv.offsetTop+vv.height-16,top=vv.offsetTop+24,rect=active.getBoundingClientRect();
  if(rect.top>=top&&rect.bottom<=bottom)return;
  // Move only far enough to expose the input. Centering an entire journal row
  // could place the input behind Safari's browser toolbar in landscape.
  const shift=rect.bottom>bottom?rect.bottom-bottom:rect.top-top;
  if(Math.abs(shift)>2)scrollHost(active).scrollBy({top:shift,behavior:'instant'});
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(reveal)}
 function update(){const editing=active?.isConnected&&document.activeElement===active;
  if(!editing){reset();baseline=vv.offsetTop+vv.height;return}
  const keyboard=baseline-(vv.offsetTop+vv.height)>120;
  if(!keyboard){reset();return}
  const next=scrollHost(active);if(host!==next){reset();host=next;original=host.style.paddingBottom;}
  document.documentElement.setAttribute('data-tablet-keyboard14266','');
  // A keyboard-height spacer leaves a large empty band on portrait iPads.
  // Restore any old spacer immediately; scroll the actual focused input only.
  host.style.paddingBottom=original;
  schedule();
 }
 document.addEventListener('focusin',e=>{if(!e.target.matches?.(editable))return;active=e.target;reset();update();setTimeout(update,180)});
 document.addEventListener('focusout',e=>{if(e.target!==active)return;active=null;setTimeout(update,100)});
 vv.addEventListener('resize',update);vv.addEventListener('scroll',schedule);window.addEventListener('resize',update);
 window.addEventListener('orientationchange',()=>{reset();baseline=vv.offsetTop+vv.height;setTimeout(update,250)});
})();
