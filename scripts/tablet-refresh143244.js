/* The tablet workspace is a nested scroller; Safari's page gesture cannot refresh it. */
(()=>{'use strict';
 if(document.documentElement.dataset.device132!=='tablet')return;
 const excluded='input,textarea,select,button,a,[contenteditable],dialog,[role=dialog],[role=listbox],.account-list1428,.modal-backdrop,.ui-overlay108,.submission-compare-overlay';
 let gesture=null,busy=false,timer,indicator,copy,updateButton;
 const actor=()=>typeof liveProfile==='undefined'?'':liveProfile?.id||'';
 const identity=()=>[actor(),typeof ojmDb==='undefined'?null:ojmDb,window.personalJournal1437?.owner||window.workspaceRequest138?.target||''];
 const same=key=>identity().every((v,i)=>v===key[i]);
 function hide(){clearTimeout(timer);if(indicator)indicator.hidden=true;}
 function status(message,host,loading=false){
  if(!indicator){const style=document.createElement('style');style.textContent='#tabletRefresh143244{position:fixed;z-index:14000;display:flex;align-items:center;gap:8px;max-width:calc(100vw - 32px);padding:9px 14px;border:1px solid #96b5a5;border-radius:24px;background:#fffdf7;color:#174c3b;box-shadow:0 3px 12px #123c2b26;font:14px/1.4 Arial,sans-serif;pointer-events:none;box-sizing:border-box}#tabletRefresh143244[hidden]{display:none}#tabletRefresh143244 [data-spin]{width:15px;height:15px;flex:none;border:2px solid #c8ddd0;border-top-color:#176249;border-radius:50%;animation:tabletRefresh244 1s linear infinite}#tabletRefresh143244 [data-spin][hidden]{display:none}#tabletRefresh143244 button{pointer-events:auto;border:0;border-radius:12px;padding:4px 8px;background:#176249;color:white;font:inherit;white-space:nowrap}#tabletRefresh143244 button[hidden]{display:none}@keyframes tabletRefresh244{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){#tabletRefresh143244 [data-spin]{animation:none}}';document.head.append(style);
   indicator=document.createElement('div');indicator.id='tabletRefresh143244';indicator.setAttribute('role','status');indicator.setAttribute('aria-live','polite');indicator.innerHTML='<span data-spin aria-hidden="true" hidden></span><span data-copy></span><button type="button" hidden>View update</button>';document.body.append(indicator);copy=indicator.querySelector('[data-copy]');updateButton=indicator.querySelector('button');updateButton.onclick=()=>{hide();window.offline14239?.open()};
  }
  clearTimeout(timer);indicator.hidden=false;if(copy.textContent!==message)copy.textContent=message;indicator.querySelector('[data-spin]').hidden=!loading;updateButton.hidden=true;
  const rect=host.getBoundingClientRect(),vv=window.visualViewport,left=Math.max(rect.left,vv?.offsetLeft||0),right=Math.min(rect.right,(vv?.offsetLeft||0)+(vv?.width||innerWidth));
  indicator.style.top=Math.max(rect.top,vv?.offsetTop||0)+12+'px';indicator.style.left=(left+right)/2+'px';indicator.style.transform='translateX(-50%)';
 }
 function nestedScroller(target,host){for(let n=target;n&&n!==host;n=n.parentElement){if(n.scrollHeight>n.clientHeight+2&&/auto|scroll/.test(getComputedStyle(n).overflowY))return true}return false;}
 function blocked(){return !!document.querySelector('dialog[open],.modal-backdrop.active,.ui-overlay108,.account-list1428')||document.body.classList.contains('nav-drawer-open');}
 function cancel(){gesture=null;if(!busy)hide();}
 async function refresh(host,key){
  if(busy||!same(key))return;
  if(navigator.onLine===false){status('Offline — your saved work is still on this device.',host);timer=setTimeout(hide,4500);return;}
  if(window.workspaceRequest138?.target){status('Return to your own account to refresh saved records.',host);timer=setTimeout(hide,4500);return;}
  if(!window.idleSync14341?.run||!window.startup14257?.prepared||window.startup14257?.preparing){status('The workspace is still loading. Try again shortly.',host);timer=setTimeout(hide,3500);return;}
  busy=true;status('Refreshing…',host,true);
  try{
   window.drafts1427?.flush?.();
   const results=await Promise.allSettled([window.idleSync14341.run(false,{trigger:'pull-refresh'}),window.offline14239?.checkForUpdates?.()]);
   if(!same(key))return;
   const issue=results.find(r=>r.status==='rejected'),overview=window.idleSync14341.overview?.();
   if(issue||overview?.problem||overview?.session?.refreshProblem)throw Error(issue?.reason?.message||overview?.problem||overview?.session?.refreshProblem);
   const state=window.offline14239?.state?.();
   status(overview?.pending?'Refreshed — some saved work still needs syncing.':'Refreshed',host);
   if(state?.availableShell){copy.textContent+=' · Update '+state.availableShell+' available';updateButton.hidden=false;timer=setTimeout(hide,10000);}
   else{if(state?.updateMessage?.includes('could not be reached'))copy.textContent+=' · Update check unavailable';timer=setTimeout(hide,3500);}
  }catch(e){if(same(key)){status('Refresh could not finish. '+e.message,host);timer=setTimeout(hide,7000);}}
  finally{busy=false;if(!same(key))hide();}
 }
 document.addEventListener('touchstart',e=>{
  gesture=null;if(busy||!actor()||e.touches.length!==1||blocked()||e.target.closest?.(excluded))return;
  const host=e.target.closest?.('.workspace-scroll');if(!host||host.scrollTop>1||nestedScroller(e.target,host)||String(window.getSelection?.()||''))return;
  const t=e.touches[0];gesture={host,key:identity(),x:t.clientX,y:t.clientY,distance:0};
 },{passive:true});
 document.addEventListener('touchmove',e=>{
  if(!gesture)return;if(e.touches.length!==1||!same(gesture.key)||blocked()||gesture.host.scrollTop>1){cancel();return}
  const t=e.touches[0],dy=t.clientY-gesture.y,dx=Math.abs(t.clientX-gesture.x);
  if(dy< -8||dx>20&&dx>Math.abs(dy)){cancel();return}
  gesture.distance=Math.max(0,dy);
  if(dy>12&&dy>dx){if(e.cancelable)e.preventDefault();status(dy>=90?'Release to refresh':'Pull down to refresh',gesture.host);}
 },{passive:false});
 document.addEventListener('touchend',e=>{const g=gesture;gesture=null;if(!g)return;const t=e.changedTouches[0],dy=t?t.clientY-g.y:0;hide();if(!e.touches.length&&g.distance>=90&&dy>=90&&g.host.scrollTop<=1&&same(g.key)&&!blocked())void refresh(g.host,g.key);},{passive:true});
 document.addEventListener('touchcancel',cancel,{passive:true});window.addEventListener('page113',cancel);window.addEventListener('orientationchange',cancel);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel()});
})();
