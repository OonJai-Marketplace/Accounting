/* Reveal the focused field inside its scroller, above the real visible keyboard
   and journal actions. Do not move focus or refit the page while typing. */
(()=>{'use strict';
 if(document.documentElement.dataset.device132!=='tablet'||!window.visualViewport)return;
 const vv=window.visualViewport,root=document.documentElement,viewport=window.tabletViewport132;
 const editable='input:not([readonly]):not([disabled]):not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=button]),textarea:not([readonly]):not([disabled]),[contenteditable="true"],[contenteditable="plaintext-only"]';
 let active=null,frame=0,host=null,original='',priority='',basePadding=0;
 let keyboardOpen=false,previousHeight=vv.height,previousScale=vv.scale;
 function reset(){if(host)host.style.setProperty('padding-bottom',original,priority);host=null;root.removeAttribute('data-tablet-keyboard14266')}
 function scrollHost(node){return node.closest('.workspace-scroll,.modal-body,[data-scroll-host]')||document.scrollingElement||document.body}
 function actions(node){return node?.closest('#journalEntry98,.workspace-journal-entry-card')?.querySelector(':scope>.je-actions-bar')}
 function reveal(){frame=0;if(!viewport.state.keyboard||viewport.hasTextSelection()||!active?.isConnected||document.activeElement!==active)return;
  const scroller=scrollHost(active),hostRect=scroller.getBoundingClientRect(),bar=actions(active);
  const visibleBottom=Math.min(vv.offsetTop+vv.height,hostRect.bottom);
  const visibleTop=Math.max(vv.offsetTop,hostRect.top);
  const barRect=bar?.getBoundingClientRect();
  // Only the part of the action bar inside the visible workspace can cover a row.
  const bottom=(barRect?.bottom>visibleTop?Math.min(visibleBottom,barRect.top):visibleBottom)-16;
  let top=visibleTop+16;
  for(const n of scroller.querySelectorAll('.sticky-tabs14344')){const r=n.getBoundingClientRect();if(r.top<=top&&r.bottom<bottom)top=Math.max(top,r.bottom+8)}
  let rect=active.getBoundingClientRect();
  if(bottom<=top)return;
  // Keep a short input or memo fully visible. In a taller memo, follow the caret.
  if(rect.height>bottom-top && active.isContentEditable){
   const selection=window.getSelection?.();
   if(selection?.rangeCount && active.contains(selection.anchorNode)){
    const caret=selection.getRangeAt(0).getBoundingClientRect();
    if(caret.height)rect=caret;
   }
  }
  const shift=rect.bottom>bottom?Math.max(0,Math.min(rect.bottom-bottom,rect.top-top)):rect.top<top?rect.top-top:0;
  if(Math.abs(shift)>2)scroller.scrollBy({top:shift,behavior:'instant'});
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(reveal)}
 function update(focusChanged=false){
  const keyboard=viewport.state.keyboard;
  const newlyCovered=keyboard&&(!keyboardOpen||(previousScale===vv.scale&&previousHeight-vv.height>1));
  keyboardOpen=keyboard;previousHeight=vv.height;previousScale=vv.scale;
  if(!keyboard){reset();return}
  root.setAttribute('data-tablet-keyboard14266','');
  const visibleBottom=vv.offsetTop+vv.height;
  if(!active?.isConnected||document.activeElement!==active)return;
  const next=scrollHost(active);if(host!==next){if(host)host.style.setProperty('padding-bottom',original,priority);host=next;original=host.style.getPropertyValue('padding-bottom');priority=host.style.getPropertyPriority('padding-bottom');basePadding=parseFloat(getComputedStyle(host).paddingBottom)||0;}
  const covered=host.matches('.workspace-scroll')?0:Math.max(0,host.getBoundingClientRect().bottom-visibleBottom);
  const padding=host.matches('.workspace-scroll')?'0px':(basePadding+covered+16)+'px';
  if(host.style.getPropertyValue('padding-bottom')!==padding||host.style.getPropertyPriority('padding-bottom')!=='important')host.style.setProperty('padding-bottom',padding,'important');
  if(focusChanged||newlyCovered)schedule();
 }
 document.addEventListener('focusin',e=>{if(!e.target.matches?.(editable))return;active=e.target;viewport.update();update(true)});
 document.addEventListener('focusout',e=>{if(e.target!==active)return;setTimeout(()=>{active=document.activeElement?.matches?.(editable)?document.activeElement:null;update()},0)});
 window.addEventListener('tabletviewport132',()=>update());
 window.tabletJournal14266={reveal:()=>update(true)};
})();
