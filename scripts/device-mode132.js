/* Measured v130 desktop at 1280px: sidebar 238px, workspace 1042px.
   Tablet removes the sidebar from normal flow and zooms the unchanged workspace. */
(()=>{const touch=navigator.maxTouchPoints>1,coarse=matchMedia('(pointer:coarse)').matches,small=Math.min(screen.width||innerWidth,screen.height||innerHeight);const tablet=(coarse||touch&&/Mac|iPad/.test(navigator.platform))&&small>=600,phone=!tablet&&(small<600&&(coarse||touch)||innerWidth<600);const root=document.documentElement;root.dataset.device132=tablet?'tablet':phone?'phone':'desktop';if(!tablet)return;
// Preserve the desktop workspace and let the browser scale its fixed layout viewport.
const workspaceWidth=1280;root.style.setProperty('--tablet-workspace132',workspaceWidth+'px');
function zoom(){const landscape=matchMedia('(orientation:landscape)').matches;const width=landscape?Math.max(screen.width,screen.height):Math.min(screen.width,screen.height);const scale=Math.min(1,width/workspaceWidth);root.dataset.tabletZoom132=String(scale);document.querySelector('meta[name=viewport]').content=`width=${workspaceWidth}, initial-scale=${scale}, minimum-scale=0.25, maximum-scale=5, user-scalable=yes`;}
zoom();window.addEventListener('orientationchange',()=>setTimeout(zoom,100));screen.orientation?.addEventListener('change',zoom);
})();
