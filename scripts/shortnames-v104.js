/* Compact employee labels in tables; the employee records keep their full names. */
(function(){
 'use strict';
 let queued=false;
 function shorten(name){const words=String(name||'').trim().split(/\s+/).filter(Boolean);return words.length>1?`${words[0][0]}. ${words[words.length-1]}`:name}
 function update(){queued=false;if(typeof Work82==='undefined')return;const names=Work82.employees.map(row=>row.data?.name).filter(Boolean).sort((a,b)=>b.length-a.length);if(!names.length)return;
  for(const cell of document.querySelectorAll('.tab-content table td,.tab-content table th')){
   if(cell.closest('#headerNotices104,#document-editor105'))continue;
   const walker=document.createTreeWalker(cell,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode())){
    if(node.parentElement?.closest('button,input,select,textarea,option,script,style'))continue;
    const original=node.textContent,trimmed=original.trim();if(!trimmed)continue;
    const name=names.find(full=>trimmed===full);if(!name)continue;
    const compact=shorten(name);if(compact===name)continue;node.textContent=original.replace(name,compact);if(!cell.title)cell.title=name;
   }
  }
 }
 function schedule(){if(!queued){queued=true;requestAnimationFrame(update)}}
 const install=()=>{document.addEventListener('click',schedule,true);new MutationObserver(schedule).observe(document.querySelector('.workspace-scroll')||document.body,{subtree:true,childList:true});schedule()};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
