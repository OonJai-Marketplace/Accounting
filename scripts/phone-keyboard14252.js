/* Fit the embedded phone workspace to the top-level visible viewport. */
(()=>{'use strict';
const root=document.documentElement,viewport=window.visualViewport;
if(!viewport)return;
const style=document.createElement('style');style.textContent='html[data-device132="phone"][data-keyboard14252] #connectedPhone132{top:var(--keyboard-top14252)!important;bottom:auto!important;height:var(--keyboard-height14252)!important}';document.head.append(style);
let queued=0,reveal=false;const bound=new WeakSet();
const editable=n=>n?.matches?.('textarea,input:not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]),[contenteditable="true"]');
function keepVisible(doc,top,bottom){const n=doc.activeElement;if(!editable(n))return;const row=n.closest('tr,.simple-row1430,.staff-account-row14225,.workspace-single-row')||n;const r=row.getBoundingClientRect();if(r.bottom>bottom||r.top<top){row.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});requestAnimationFrame(()=>{const after=n.getBoundingClientRect();if(after.bottom>bottom||after.top<top)(n.closest('.workspace-scroll')||doc.scrollingElement||doc.body).scrollBy({top:after.bottom>bottom?after.bottom-bottom+12:after.top-top-12,behavior:'instant'})})}}
function fit(){queued=0;const phone=root.dataset.device132==='phone',open=phone&&Math.abs(viewport.scale-1)<.05&&innerHeight-viewport.height>120;
 root.toggleAttribute('data-keyboard14252',open);
 if(open){root.style.setProperty('--keyboard-top14252',viewport.offsetTop+'px');root.style.setProperty('--keyboard-height14252',viewport.height+'px');}
 else{root.style.removeProperty('--keyboard-top14252');root.style.removeProperty('--keyboard-height14252');}
 if(reveal&&phone){reveal=false;requestAnimationFrame(()=>{const frame=document.getElementById('connectedPhone132');if(document.activeElement===frame&&frame?.contentDocument){const doc=frame.contentDocument,nav=[...doc.querySelectorAll('nav.bottom')].find(n=>n.getClientRects().length),header=doc.querySelector('.top');keepVisible(doc,(header?.getBoundingClientRect().bottom||0)+12,(nav?.getBoundingClientRect().top||frame.clientHeight)-12);}else keepVisible(document,viewport.offsetTop+16,viewport.offsetTop+viewport.height-80);});}
}
function schedule(show=false){reveal=reveal||show;if(!queued)queued=requestAnimationFrame(fit);}
function bind(doc){if(!doc||bound.has(doc))return;bound.add(doc);doc.addEventListener('focusin',()=>schedule(true));doc.addEventListener('input',()=>schedule(true));}
function attach(){const frame=document.getElementById('connectedPhone132');if(!frame)return;if(!bound.has(frame)){bound.add(frame);frame.addEventListener('load',()=>{bind(frame.contentDocument);schedule(true);});}bind(frame.contentDocument);}
bind(document);attach();new MutationObserver(attach).observe(document.body,{childList:true});
viewport.addEventListener('resize',()=>schedule(true));viewport.addEventListener('scroll',()=>schedule());window.addEventListener('resize',()=>schedule(true));window.addEventListener('pageshow',()=>schedule(true));schedule();
})();
