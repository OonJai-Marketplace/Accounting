/* Pull down from the top of a phone screen to reload live application data. */
(()=>{'use strict';
 let start=0,tracking=false,loading=false,distance=0;
 const indicator=document.createElement('div');indicator.className='pull-refresh1423';indicator.setAttribute('role','status');indicator.setAttribute('aria-label','Refreshing');indicator.hidden=true;indicator.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>';document.body.append(indicator);
 const top=()=>window.scrollY<=2 && (document.scrollingElement?.scrollTop||0)<=2;
 const hide=()=>{indicator.hidden=true;indicator.classList.remove('visible','loading');indicator.style.removeProperty('--pull-turn')};
 document.addEventListener('touchstart',e=>{tracking=!loading&&e.touches.length===1&&top()&&!e.target.closest('input,textarea,select,[contenteditable],.drawer-backdrop');distance=0;start=tracking?e.touches[0].clientY:0},{passive:true});
 document.addEventListener('touchmove',e=>{if(!tracking)return;distance=e.touches[0].clientY-start;if(distance<0||!top()||e.touches.length!==1){tracking=false;hide();return}if(distance>12){if(e.cancelable)e.preventDefault();indicator.hidden=false;indicator.classList.add('visible');indicator.style.setProperty('--pull-turn',Math.min(distance*3,300)+'deg')}else hide()},{passive:false});
 document.addEventListener('touchend',async()=>{if(!tracking)return;tracking=false;if(distance<75){hide();return}loading=true;indicator.hidden=false;indicator.classList.add('visible','loading');try{await parent.PhoneApp132.refresh();window.phoneRefresh132?.()}catch(err){parent.showCenterStatus?.('Could not update the data. Please try again.',true)}finally{hide();loading=false}},{passive:true});
 document.addEventListener('touchcancel',()=>{tracking=false;if(!loading)hide()},{passive:true});
})();
