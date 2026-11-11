/* Keep one desktop layout viewport on tablets. Safari owns rotation and pinch
   zoom; never rewrite its initial scale in response to a viewport resize. */
(()=>{'use strict';
 const ua=navigator.userAgent||'',platform=navigator.platform||'';
 const smallTouchScreen=navigator.maxTouchPoints>0&&Math.min(screen.width,screen.height)<=600;
 const desktopIPhone=smallTouchScreen&&/Macintosh/i.test(ua);
 const ipad=/iPad/i.test(ua)||!desktopIPhone&&/Mac/i.test(platform)&&navigator.maxTouchPoints>1;
 const android=/Android/i.test(ua),phone=/iPhone|iPod/i.test(ua)||android&&/Mobile/i.test(ua),tablet=ipad||android&&!phone;
 // Chrome on an Android handset sends a Linux desktop identity for Desktop site.
 // Keep its desktop workspace wide enough for the journal columns and allow pinch zoom.
 const touchDesktop=smallTouchScreen||navigator.maxTouchPoints>0&&window.matchMedia?.('(pointer:coarse)').matches;
 const desktopOnHandset=!phone&&!tablet&&(desktopIPhone||touchDesktop&&/Linux/i.test(ua)&&/Chrome\//.test(ua));
 if(desktopOnHandset){const meta=document.querySelector('meta[name=viewport]');if(meta)meta.content='width=1280, minimum-scale=0.1, maximum-scale=5, user-scalable=yes';}
 const root=document.documentElement;root.dataset.device132=tablet?'tablet':phone?'phone':'desktop';
 function laptopLayout(){document.body?.classList.toggle('compact-laptop14362',!tablet&&!phone&&innerWidth<=1100)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',laptopLayout,{once:true});else laptopLayout();
 window.addEventListener('resize',laptopLayout);if(!tablet)return;
 const designWidth=1280,heights=new Map();let frame=0,state=null,awaitingRefit=false;
 const editing=()=>!!document.activeElement?.matches?.('input:not([readonly]):not([disabled]):not([type=button]):not([type=checkbox]):not([type=radio]),textarea:not([readonly]),[contenteditable="true"],[contenteditable="plaintext-only"]');
 function landscape(){const type=screen.orientation?.type;if(type)return type.startsWith('landscape');if(typeof window.orientation==='number')return Math.abs(window.orientation)===90;return screen.width>screen.height}
 function set(name,value){if(root.style.getPropertyValue(name)!==value)root.style.setProperty(name,value)}
 function update(){
  frame=0;const v=window.visualViewport,scale=v?.scale||1;
  const width=Math.round(v?.width>0?v.width*scale:landscape()?Math.max(screen.width,screen.height):Math.min(screen.width,screen.height));
  // A width change identifies rotation or Split View. A pinch only changes the
  // visual viewport and scale together, leaving their product unchanged.
  const targetScale=width/designWidth;
  const widthChanged=state && Math.abs(width-state.width)>2;
  let fitScale=state?.fitScale||targetScale;
  if(widthChanged){
   // Safari may report the new window width before it refits the page.
   // Keep the user's existing magnification and fill the new visible width.
   const retainedScale=Math.abs(scale-state.scale)<0.005;
   awaitingRefit=ipad && retainedScale && Math.abs(fitScale-targetScale)>0.005;
   if(!awaitingRefit)fitScale=targetScale;
  }
  if(awaitingRefit && Math.abs(scale-targetScale)<0.005){
   awaitingRefit=false;
   fitScale=targetScale;
  }
  const layoutWidth=Math.round(width/fitScale);
  const physicalHeight=(v?.height||innerHeight)*scale,isLandscape=landscape(),key=(isLandscape?'l':'p')+width;
  const screenHeight=isLandscape?Math.min(screen.width,screen.height):Math.max(screen.width,screen.height);
  let normalHeight=heights.get(key)||(state?.keyboard?Math.max(physicalHeight,screenHeight-state.chromeHeight):physicalHeight);
  const keyboard=!!((editing()||state?.keyboard)&&normalHeight-physicalHeight>120);
  if(!keyboard){normalHeight=physicalHeight;heights.set(key,normalHeight)}
  state={width,scale,layoutWidth,fitScale,height:normalHeight/fitScale,keyboard,landscape:isLandscape,chromeHeight:Math.max(0,screenHeight-normalHeight)};
  root.dataset.tabletZoom132=String(fitScale);root.dataset.tabletOrientation132=isLandscape?'landscape':'portrait';
  set('--tablet-workspace132',layoutWidth+'px');set('--tablet-height285',state.height+'px');
  const mainHeight=keyboard?Math.min(state.height,(v?.offsetTop||0)+(v?.height||innerHeight)):state.height;
  set('--tablet-main-height285',mainHeight+'px');
  // The iPad keyboard can cover the journal actions. Keep their sticky anchor at
  // the full-height workspace bottom while the scrollable editing area shrinks.
  if(ipad)set('--tablet-actions-inset285',(mainHeight-state.height)+'px');
  // Undo only the initial fit for typography. Pinch zoom still magnifies text.
  set('--tablet-text-scale285',String(1/fitScale));
  window.dispatchEvent(new CustomEvent('tabletviewport132',{detail:state}));
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(update)}
 window.tabletViewport132={get state(){return state},landscape,update:schedule};
 const meta=document.querySelector('meta[name=viewport]');
 if(meta)meta.content='width=1280, minimum-scale=0.25, maximum-scale=5, user-scalable=yes';
 // A deliberate pinch is independent of the browser's delayed rotation refit.
 document.addEventListener('touchstart',e=>{if(e.touches.length>1)awaitingRefit=false},{passive:true});
 window.addEventListener('pageshow',schedule);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
 update();window.addEventListener('resize',schedule);window.addEventListener('orientationchange',schedule);
 screen.orientation?.addEventListener('change',schedule);window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
 document.addEventListener('DOMContentLoaded',schedule,{once:true});
})();
