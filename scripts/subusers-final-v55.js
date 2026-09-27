/* V55 final display polish. The data functions remain in the integrated workbench. */
(function(){
  'use strict';
  function polishWorkbench(){
    document.querySelectorAll('.v49-desktop-post-tools>span').forEach(node=>node.remove());
    document.querySelectorAll('.v49-post-tools>b').forEach(node=>{
      const value=node.textContent.trim();
      if(value&&!/^Entry ID\s*:/i.test(value))node.textContent=`Entry ID: ${value}`;
    });
  }
  const observer=new MutationObserver(polishWorkbench);
  const start=()=>{polishWorkbench();observer.observe(document.body,{childList:true,subtree:true})};
  document.addEventListener('pointerdown',event=>{
    if(event.target.closest?.('.sub-user-search-wrap'))return;
    document.querySelectorAll('#subUserSearchResults').forEach(results=>{results.hidden=true});
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
