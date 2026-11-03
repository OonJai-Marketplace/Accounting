/* Keep the desktop-sized canvas on tablets and fit it to the screen.
   Widen the canvas only when the physical screen is larger. */
(()=>{const ua=navigator.userAgent,platform=navigator.platform,touch=navigator.maxTouchPoints>0,small=Math.min(screen.width||innerWidth,screen.height||innerHeight);const ipad=/iPad/i.test(ua)||/Mac/i.test(platform)&&navigator.maxTouchPoints>1,android=/Android/i.test(ua),phone=/iPhone|iPod/i.test(ua)||android&&/Mobile/i.test(ua),tablet=ipad||android&&!phone;const root=document.documentElement;root.dataset.device132=tablet?'tablet':phone?'phone':'desktop';function laptopLayout(){document.body?.classList.toggle('compact-laptop14362',!tablet&&!phone&&innerWidth<=1100)}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',laptopLayout,{once:true});else laptopLayout();window.addEventListener('resize',laptopLayout);if(!tablet)return;
// Fit the desktop canvas to the tablet's oriented screen width.
const workspaceWidth=1280;let fittedWidth=0,queued=false;
// Width × visual scale is the browser's available width before pinch zoom.
// Unlike the CSS orientation query it does not flip when a keyboard shortens
// the viewport, and it also respects iPad Split View.
function availableWidth(){const v=window.visualViewport,visible=v?.width*(v?.scale||1);if(visible>0)return Math.round(visible);const type=screen.orientation?.type,angle=window.orientation;const landscape=type?type.startsWith('landscape'):typeof angle==='number'?Math.abs(angle)===90:screen.width>screen.height;return landscape?Math.max(screen.width,screen.height):Math.min(screen.width,screen.height)}
function zoom(){const width=availableWidth();if(Math.abs(width-fittedWidth)<3)return;fittedWidth=width;const layoutWidth=Math.max(workspaceWidth,width),scale=width/layoutWidth;root.style.setProperty('--tablet-workspace132',layoutWidth+'px');root.dataset.tabletZoom132=String(scale);document.querySelector('meta[name=viewport]').content=`width=${layoutWidth}, initial-scale=${scale}, minimum-scale=0.25, maximum-scale=5, user-scalable=yes`;}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;zoom()})}
zoom();window.addEventListener('orientationchange',()=>setTimeout(zoom,100));screen.orientation?.addEventListener('change',schedule);window.addEventListener('resize',schedule);
})();
