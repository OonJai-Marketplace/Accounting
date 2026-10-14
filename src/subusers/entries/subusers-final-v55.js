/* V55 final display polish. The data functions remain in the integrated workbench. */
(function(){
  'use strict';
  function polishWorkbench(root=document){
    const all=selector=>[...(root.matches?.(selector)?[root]:[]),...root.querySelectorAll(selector)];
    all('.v49-desktop-post-tools>span').forEach(node=>node.remove());
    all('.v49-post-tools>b').forEach(node=>{
      const value=node.textContent.trim();
      if(value&&!/^Entry ID\s*:/i.test(value))node.textContent=`Entry ID: ${value}`;
    });
  }
  const observer=new MutationObserver(records=>{
    const roots=new Set();for(const record of records){const target=record.target.nodeType===1?record.target:record.target.parentElement;const tools=target?.closest('.v49-post-tools,.v49-desktop-post-tools');if(tools)roots.add(tools);for(const node of record.addedNodes)if(node.nodeType===1)roots.add(node)}
    for(const root of roots){let parent=root.parentElement;while(parent&&!roots.has(parent))parent=parent.parentElement;if(root.isConnected&&!parent)polishWorkbench(root)}
  });
  const start=()=>{polishWorkbench();observer.observe(document.body,{childList:true,subtree:true})};
  document.addEventListener('pointerdown',event=>{
    if(event.target.closest?.('.sub-user-search-wrap'))return;
    document.querySelectorAll('#subUserSearchResults').forEach(results=>{results.hidden=true});
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})()