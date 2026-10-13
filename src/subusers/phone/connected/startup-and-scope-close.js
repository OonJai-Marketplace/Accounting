function initializePhone1425(){
 if(!phoneLayoutReady14285||!A.ready()||!ensurePhoneOwner1427())return false;
 // Parent notifications and the readiness timer can arrive together. Initialize once
 // per identity so a late startup callback cannot replace a form or close its picker.
 if(navigationPending14285||renderedLocation14250?.session===A.session()&&document.documentElement.dataset.phoneReady14288==='true')return true;
 if(!pageAllowed1441()){
  const order=['subusers','settings'];
  const module=order.find(m=>firstModulePage(m));if(module){S.module=module;S.page=firstModulePage(module);S.user=module==='subusers'&&A.profile().role!=='admin'?A.profile().id:null}
 }
 navigate(S.module,S.page,false,true);return true;
}
async function startPhone14285(){phoneLoading14285(true,'Loading your workspace…');if(document.readyState!=='complete')await new Promise(resolve=>window.addEventListener('load',resolve,{once:true}));await document.fonts.ready;phoneLayoutReady14285=true;if(!initializePhone1425()){const readyTimer=setInterval(()=>{if(initializePhone1425())clearInterval(readyTimer)},500)}}startPhone14285();
})();

(()=>{if(parent===window)return;let last=0;for(const type of ["pointerdown","pointermove","keydown","input","wheel","touchstart"])document.addEventListener(type,()=>{if(Date.now()-last<1000)return;last=Date.now();parent.postMessage({type:"oonjai-activity1434"},location.protocol==="file:"?"*":location.origin)},{capture:true,passive:true})})();
