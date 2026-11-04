/* Reveal the focused field inside its scroller, above the real visible keyboard
   and journal actions. Do not move focus or refit the page while typing. */
(()=>{'use strict';
 if(document.documentElement.dataset.device132!=='tablet'||!window.visualViewport)return;
 const vv=window.visualViewport,root=document.documentElement;
 const editable='input:not([readonly]):not([disabled]):not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=button]),textarea:not([readonly]):not([disabled]),[contenteditable="true"],[contenteditable="plaintext-only"]';
 let active=null,frame=0,host=null,original='',priority='',basePadding=0;
 function reset(){if(host)host.style.setProperty('padding-bottom',original,priority);host=null;root.removeAttribute('data-tablet-keyboard14266');root.style.setProperty('--tablet-actions-inset285','0px')}
 function scrollHost(node){return node.closest('.workspace-scroll,.modal-body,[data-scroll-host]')||document.scrollingElement||document.body}
 function actions(node){return node?.closest('#journalEntry98,.workspace-journal-entry-card')?.querySelector(':scope>.je-actions-bar')}
 function reveal(){frame=0;if(!active?.isConnected||document.activeElement!==active)return;
  const scroller=scrollHost(active),hostRect=scroller.getBoundingClientRect(),bar=actions(active);
  const bottom=Math.min(vv.offsetTop+vv.height,hostRect.bottom)-(bar?.getBoundingClientRect().height||0)-16;
  let top=Math.max(vv.offsetTop,hostRect.top)+16;
  for(const n of scroller.querySelectorAll('.sticky-tabs14344')){const r=n.getBoundingClientRect();if(r.top<=top&&r.bottom<bottom)top=Math.max(top,r.bottom+8)}
  let rect=active.getBoundingClientRect();
  const selection=window.getSelection?.();if(active.isContentEditable&&selection?.rangeCount&&active.contains(selection.anchorNode)){const caret=selection.getRangeAt(0).getBoundingClientRect();if(caret.height)rect=caret}
  if(bottom<=top)return;
  const shift=rect.bottom>bottom?Math.max(0,Math.min(rect.bottom-bottom,rect.top-top)):rect.top<top?rect.top-top:0;
  if(Math.abs(shift)>2)scroller.scrollBy({top:shift,behavior:'instant'});
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(reveal)}
 function update(){
  const keyboard=window.tabletViewport132?.state?.keyboard;
  if(!keyboard){reset();return}
  root.setAttribute('data-tablet-keyboard14266','');
  const visibleBottom=vv.offsetTop+vv.height;
  root.style.setProperty('--tablet-actions-inset285','0px');
  if(!active?.isConnected||document.activeElement!==active)return;
  const next=scrollHost(active);if(host!==next){if(host)host.style.setProperty('padding-bottom',original,priority);host=next;original=host.style.getPropertyValue('padding-bottom');priority=host.style.getPropertyPriority('padding-bottom');basePadding=parseFloat(getComputedStyle(host).paddingBottom)||0;}
  const covered=host.matches('.workspace-scroll')?0:Math.max(0,host.getBoundingClientRect().bottom-visibleBottom);
  host.style.setProperty('padding-bottom',host.matches('.workspace-scroll')?'0px':(basePadding+covered+16)+'px','important');schedule();
 }
 document.addEventListener('focusin',e=>{if(!e.target.matches?.(editable))return;active=e.target;window.tabletViewport132?.update();update();schedule()});
 document.addEventListener('focusout',e=>{if(e.target!==active)return;setTimeout(()=>{active=document.activeElement?.matches?.(editable)?document.activeElement:null;update()},0)});
 window.addEventListener('tabletviewport132',update);vv.addEventListener('scroll',()=>{update();schedule()});
 window.tabletJournal14266={reveal:()=>{update();schedule()}};
})();
