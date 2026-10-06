/* Keep the desktop-sized canvas on tablets and fit it to the screen.
   Widen the canvas only when the physical screen is larger. */
(()=>{const touch=navigator.maxTouchPoints>1,coarse=matchMedia('(pointer:coarse)').matches,small=Math.min(screen.width||innerWidth,screen.height||innerHeight);const tablet=(coarse||touch&&/Mac|iPad/.test(navigator.platform))&&small>=600,phone=!tablet&&(small<600&&(coarse||touch)||innerWidth<600);const root=document.documentElement;root.dataset.device132=tablet?'tablet':phone?'phone':'desktop';if(!tablet)return;
// Fit the desktop canvas to the tablet's oriented screen width.
const workspaceWidth=1280;let fittedWidth=0,queued=false;
// visualViewport changes when Safari/Chrome adjusts its visual zoom during a
// journal mode switch. The screen's oriented width is stable for the whole page.
function availableWidth(){const landscape=matchMedia('(orientation:landscape)').matches;return landscape?Math.max(screen.width,screen.height):Math.min(screen.width,screen.height)}
function zoom(){const width=availableWidth();if(Math.abs(width-fittedWidth)<3)return;fittedWidth=width;const layoutWidth=Math.max(workspaceWidth,width),scale=width/layoutWidth;root.style.setProperty('--tablet-workspace132',layoutWidth+'px');root.dataset.tabletZoom132=String(scale);document.querySelector('meta[name=viewport]').content=`width=${layoutWidth}, initial-scale=${scale}, minimum-scale=0.25, maximum-scale=5, user-scalable=yes`;}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;zoom()})}
zoom();window.addEventListener('orientationchange',()=>setTimeout(zoom,100));screen.orientation?.addEventListener('change',schedule);window.addEventListener('resize',schedule);
})();
