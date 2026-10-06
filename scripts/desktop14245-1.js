/* scripts/device-mode132.js */
/* Measured v130 desktop at 1280px: sidebar 238px, workspace 1042px.
   Tablet removes the sidebar from normal flow and zooms the unchanged workspace. */
(()=>{const touch=navigator.maxTouchPoints>1,coarse=matchMedia('(pointer:coarse)').matches,small=Math.min(screen.width||innerWidth,screen.height||innerHeight);const tablet=(coarse||touch&&/Mac|iPad/.test(navigator.platform))&&small>=600,phone=!tablet&&(small<600&&(coarse||touch)||innerWidth<600);const root=document.documentElement;root.dataset.device132=tablet?'tablet':phone?'phone':'desktop';if(!tablet)return;
// Preserve the desktop layout, fitting its full width to the browser's available space.
const workspaceWidth=1280;root.style.setProperty('--tablet-workspace132',workspaceWidth+'px');let fittedWidth=0,queued=false;
function availableWidth(){const landscape=matchMedia('(orientation:landscape)').matches,screenWidth=landscape?Math.max(screen.width,screen.height):Math.min(screen.width,screen.height),v=window.visualViewport,visible=v?.width*v?.scale;return Number.isFinite(visible)&&visible>=500&&visible<=screenWidth+2?Math.min(screenWidth,visible):screenWidth}
function zoom(){const width=availableWidth();if(Math.abs(width-fittedWidth)<3)return;fittedWidth=width;const scale=Math.min(1,width/workspaceWidth);root.dataset.tabletZoom132=String(scale);document.querySelector('meta[name=viewport]').content=`width=${workspaceWidth}, initial-scale=${scale}, minimum-scale=0.25, maximum-scale=5, user-scalable=yes`;}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;zoom()})}
zoom();window.addEventListener('orientationchange',()=>setTimeout(zoom,100));screen.orientation?.addEventListener('change',schedule);window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);
})();

;
/* scripts/loading1444.js */
/* One loading mark for sign-in, session restoration and workspace data. */
(()=>{'use strict';
window.loading1444={markup:()=>'<span class="loading-orbit1444" aria-hidden="true">'+Array.from({length:6},(_,i)=>'<i style="--i:'+i+'"><b></b></i>').join('')+'</span>'};
const q=new URLSearchParams(location.search),h=new URLSearchParams(location.hash.slice(1));
if(!q.has('password-recovery')&&q.get('type')!=='recovery'&&h.get('type')!=='recovery'&&!q.has('error_description')&&!h.has('error_description'))document.documentElement.classList.add('session-checking1444');
})();

;

