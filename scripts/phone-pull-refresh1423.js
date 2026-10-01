/* Pull down from the top of a phone screen to reload live application data. */
(()=>{'use strict';
 let start=0,tracking=false,loading=false;
 const indicator=document.createElement('div');indicator.className='pull-refresh1423';indicator.setAttribute('role','status');indicator.setAttribute('aria-live','polite');indicator.textContent='Pull down to refresh';document.body.append(indicator);
 const top=()=>window.scrollY<=2 && (document.scrollingElement?.scrollTop||0)<=2;
 document.addEventListener('touchstart',e=>{tracking=!loading&&top()&&!e.target.closest('input,textarea,select,[contenteditable],.drawer-backdrop');start=tracking?e.touches[0].clientY:0},{passive:true});
 document.addEventListener('touchmove',e=>{if(!tracking)return;const distance=e.touches[0].clientY-start;if(distance<0){tracking=false;indicator.classList.remove('visible');return}if(!top()){tracking=false;return}if(distance>12){if(e.cancelable)e.preventDefault();indicator.classList.add('visible');indicator.textContent=distance>75?'Release to refresh':'Pull down to refresh'}},{passive:false});
 document.addEventListener('touchend',async e=>{if(!tracking)return;const distance=e.changedTouches[0].clientY-start;tracking=false;if(distance<75){indicator.classList.remove('visible');return}loading=true;indicator.textContent='Refreshing…';try{await parent.PhoneApp132.refresh();window.phoneRefresh132?.();indicator.textContent='Updated';}catch(err){indicator.textContent='Could not refresh. Pull down to try again.';}finally{setTimeout(()=>{indicator.classList.remove('visible');loading=false},1100)}},{passive:true});
 document.addEventListener('touchcancel',()=>{tracking=false;indicator.classList.remove('visible')},{passive:true});
})();
