/* Light palette navigation icons; interface behavior and permissions remain unchanged. */
(function(){
  'use strict';
  const paths={
    dashboard:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    transactions:'<path d="M7 2h8l4 4v16H5V2z"/><path d="M14 2v5h5M8 11h8M8 15h8M8 19h5"/>',
    'sub-users':'<circle cx="9" cy="7" r="3"/><path d="M2 21v-2a6 6 0 0 1 12 0v2M16 4a3 3 0 0 1 0 6m1 5a5 5 0 0 1 5 5v1"/>',
    accounts:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"/>',
    hr:'<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M2 21v-2a7 7 0 0 1 14 0v2m1-8a5 5 0 0 1 5 5v3"/>',
    payroll:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20m-15 5h4"/>',
    reports:'<path d="M3 21h18M6 18v-7m5 7V5m5 13V9m3 9v-4"/>',
    'tax-sso':'<path d="m12 2 9 4v1H3V6zM4 21h16M6 9v10m4-10v10m4-10v10m4-10v10"/>',
    inventory:'<path d="m3 6 9-4 9 4v12l-9 4-9-4zM3 6l9 4 9-4M12 10v12"/>',
    menu:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    settings:'<path d="m10 2-.5 2-1.8.8-1.9-1-2 2 1 1.9L4 9.5 2 10v4l2 .5.8 1.8-1 1.9 2 2 1.9-1 1.8.8.5 2h4l.5-2 1.8-.8 1.9 1 2-2-1-1.9.8-1.8 2-.5v-4l-2-.5-.8-1.8 1-1.9-2-2-1.9 1-1.8-.8-.5-2z"/><circle cx="12" cy="12" r="3"/>'
  };
  function syncIcons(){
    Object.entries(paths).forEach(([key,path])=>{
      const header=document.querySelector('#nav-module-'+key+' > .nav-header');
      if(!header||header.querySelector('.nav-icon100'))return;
      const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
      icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('fill','none');icon.setAttribute('stroke','currentColor');icon.setAttribute('stroke-width','1.8');icon.setAttribute('stroke-linecap','round');icon.setAttribute('stroke-linejoin','round');icon.setAttribute('aria-hidden','true');icon.classList.add('nav-icon100');icon.innerHTML=path;
      header.prepend(icon);
    });
  }
  function install(){
    syncIcons();
    let queued=false;
    new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;syncIcons()})}).observe(document.body,{subtree:true,childList:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
