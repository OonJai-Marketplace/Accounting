/* Capitalize application/report headings without changing body text or editable documents. */
(()=>{'use strict';
const selector='h1,h2,h3,h4,h5,h6,th,legend,[role="heading"],.final-section-title,.doc-table-panel-title113';
const title=value=>String(value??'').replace(/(^|[\s/·–—:(\[])([a-z])/g,(_,prefix,letter)=>prefix+letter.toUpperCase());
function apply(root=document){const headings=[...(root.matches?.(selector)?[root]:[]),...root.querySelectorAll(selector)];for(const heading of headings){if(heading.closest('#document-editor105,[contenteditable="true"],[data-preserve-heading-case]'))continue;const walker=document.createTreeWalker(heading,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){if(node.parentElement?.closest('button,input,textarea,select,script,style,code,pre,[contenteditable="true"]'))continue;const value=title(node.data);if(value!==node.data)node.data=value;}}}
function html(value){const template=document.createElement('template');template.innerHTML=value;apply(template.content);return template.innerHTML}
window.headingCase14297={title,apply,html};
function ready(){apply();const pending=new Set();let queued=false;new MutationObserver(records=>{for(const record of records){if(record.type==='characterData'){const heading=record.target.parentElement?.closest(selector);if(heading)pending.add(heading)}else for(const node of record.addedNodes)if(node.nodeType===1)pending.add(node)}if(!pending.size||queued)return;queued=true;queueMicrotask(()=>{queued=false;const nodes=[...pending];pending.clear();for(const node of nodes)if(node.isConnected)apply(node)})}).observe(document.body,{subtree:true,childList:true,characterData:true});document.addEventListener('beforeprint',()=>apply());}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
