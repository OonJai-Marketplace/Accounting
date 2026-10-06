/* Keep the active journal editor visible when a tablet's keyboard reduces the visual viewport. */
(()=>{'use strict';
 if(document.documentElement.dataset.device132!=='tablet'||!window.visualViewport)return;
 const vv=window.visualViewport,journal='#sub-users-workspace,#staff-journal,#journal',editable='input:not([readonly]):not([type=checkbox]):not([type=radio]),textarea,[contenteditable="true"],[contenteditable="plaintext-only"]';
 let active=null,frame=0,paddedHost=null,previousPadding='';
 function journalField(node){return node?.matches?.(editable)&&node.closest?.(journal)}
 function reveal(){frame=0;if(!journalField(active)||document.activeElement!==active)return;
  const gap=Math.max(0,innerHeight-(vv.offsetTop+vv.height));
  if(gap<120)return;
  const bottom=vv.offsetTop+vv.height-20,top=vv.offsetTop+20;
  const rect=active.getBoundingClientRect();
  if(rect.top>=top&&rect.bottom<=bottom)return;
  active.scrollIntoView({block:'nearest',inline:'nearest'});
  requestAnimationFrame(()=>{if(document.activeElement!==active)return;const r=active.getBoundingClientRect();const shift=r.bottom>bottom?r.bottom-bottom:r.top<top?r.top-top:0;if(Math.abs(shift)>2)(active.closest('.workspace-scroll')||window).scrollBy({top:shift,behavior:'instant'});});
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(reveal)}
 function resize(){const editing=journalField(active)&&document.activeElement===active,gap=editing?Math.max(0,innerHeight-(vv.offsetTop+vv.height)):0,open=gap>120;
  const host=open?(active.closest('.workspace-scroll')||document.body):null;
  if(paddedHost!==host){if(paddedHost)paddedHost.style.paddingBottom=previousPadding;paddedHost=host;previousPadding=host?.style.paddingBottom||'';}
  if(open){host.style.paddingBottom=Math.ceil(gap+24)+'px';document.documentElement.setAttribute('data-tablet-keyboard14266','');}
  if(!open)document.documentElement.removeAttribute('data-tablet-keyboard14266');
  if(open)schedule();
 }
 document.addEventListener('focusin',e=>{active=journalField(e.target)?e.target:null;resize();if(active)setTimeout(resize,180)});
 document.addEventListener('focusout',e=>{if(e.target!==active)return;active=null;setTimeout(resize,100)});
 vv.addEventListener('resize',resize);vv.addEventListener('scroll',schedule);window.addEventListener('resize',resize);
})();
