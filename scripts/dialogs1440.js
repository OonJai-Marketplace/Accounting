/* Scoped keyboard behavior for account, user, schedule and to-do editors only. */
(()=>{'use strict';const entries=new Map();let serial=0;
const visible=n=>n?.isConnected&&!!n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('[hidden]');
function controls(root){return [...root.querySelectorAll('button,input,select,textarea,a[href],[tabindex]')].filter(n=>visible(n)&&!n.disabled&&n.tabIndex>=0&&!n.matches('.account-source1428,input[type=hidden]'));}
function detach(root){const item=entries.get(root);if(!item)return;entries.delete(root);item.abort.abort();if(visible(item.prior))item.prior.focus({preventScroll:true});}
function requestClose(root){const item=entries.get(root);if(!item)return;
 if(item.dirty?.()){
  let prompt=root.querySelector('.discard-confirm1440');if(!prompt){prompt=document.createElement('section');prompt.className='discard-confirm1440';prompt.setAttribute('role','alert');prompt.innerHTML='<p>Discard your unsaved changes?</p><button type="button" data-keep1440>Keep editing</button><button type="button" data-discard1440>Discard changes</button>';item.dialog.append(prompt);prompt.querySelector('[data-keep1440]').onclick=()=>{prompt.remove();item.focus()};prompt.querySelector('[data-discard1440]').onclick=()=>{item.close();detach(root)};}
  prompt.querySelector('[data-keep1440]').focus();return;
 }
 item.close();detach(root);
}
function attach(root,options={}){
 if(!root)return;if(entries.has(root))return;const dialog=root.querySelector('[role=dialog],.modal-dialog,.scheduled-dialog91,.todo-form1438')||root;
 const prior=document.activeElement,abort=new AbortController(),title=dialog.querySelector('h1,h2,h3,h4');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.tabIndex=-1;
 if(title){title.id||='dialogTitle1440-'+(++serial);dialog.setAttribute('aria-labelledby',title.id)}else dialog.setAttribute('aria-label','Editor');
 const focus=()=>{window.dropdown1434?.enhance(dialog);if(options.focus)options.focus();else (controls(dialog).find(n=>n.matches('input,textarea,select'))||controls(dialog)[0]||dialog).focus({preventScroll:true});};
 entries.set(root,{...options,dialog,prior,abort,focus});root.addEventListener('click',e=>{if(e.target===root)requestClose(root)},{signal:abort.signal});
 requestAnimationFrame(()=>{if(entries.has(root)&&visible(root))focus()});
}
function top(){return [...entries].filter(([r])=>visible(r)).at(-1)}
document.addEventListener('keydown',e=>{
 const item=top();if(!item)return;const [root,state]=item;
 // Let an existing inner confirmation dialog handle its own keys.
 if(document.querySelector('.ui-overlay108,.confirm-overlay117'))return;
 if(e.key==='Escape'){
  const picker=document.querySelector('.account-list1428');if(picker){e.preventDefault();e.stopImmediatePropagation();window.dropdown1434.close(true);return;}
  e.preventDefault();e.stopImmediatePropagation();requestClose(root);
 }else if(e.key==='Tab'){
  const all=controls(state.dialog),first=all[0],last=all.at(-1);if(!first){e.preventDefault();state.dialog.focus();return;}
  if(!root.contains(document.activeElement)||e.shiftKey&&document.activeElement===first||!e.shiftKey&&document.activeElement===last){e.preventDefault();(e.shiftKey?last:first).focus();}
 }
},true);
new MutationObserver(()=>{for(const [root] of entries)if(!visible(root))detach(root)}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
window.dialogs1440={attach,detach,requestClose};
})();
