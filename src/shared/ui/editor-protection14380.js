/* Backdrop clicks never dismiss editable dialogs. Explicit dismissal checks edits. */
(()=>{'use strict';
const selector='dialog,.modal-backdrop,[class*="overlay"],[class*="Overlay"],[role="dialog"],[aria-modal="true"]';
const fields='input:not([type=hidden]):not([type=button]):not([type=submit]):not([type=reset]):not([readonly]):not([disabled]),textarea:not([readonly]):not([disabled]),select:not([disabled]),[contenteditable="true"]';
const states=new WeakMap(),replaying=new WeakSet();
const visible=n=>n?.isConnected&&!n.hidden&&!!n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden';
function rootOf(node){let root=node?.closest?.(selector);if(!root)return null;let parent=root.parentElement?.closest(selector);while(parent){root=parent;parent=root.parentElement?.closest(selector)}return root;}
const editable=root=>!!root?.querySelector(fields);
const snapshot=root=>JSON.stringify([...root.querySelectorAll(fields)].map(n=>[n.id,n.name,n.type==='checkbox'||n.type==='radio'?n.checked:n.isContentEditable?n.innerHTML:n.value]));
function track(root){if(!visible(root)||!editable(root))return;let state=states.get(root);if(!state){state={base:snapshot(root),changed:false,confirming:false};states.set(root,state)}return state;}
function scan(node){if(node.nodeType!==1)return;for(const n of [node,...node.querySelectorAll(selector)]){const root=rootOf(n);if(root)track(root)}}
function stop(e){e.preventDefault();e.stopImmediatePropagation();}
function dismissButton(root){return [...root.querySelectorAll('button,[role=button],a')].find(isDismiss);}
function isDismiss(n){const text=(n.getAttribute('aria-label')||n.title||n.textContent||'').trim();return /^(close|cancel|discard(?: changes)?|×|✕|✖|x)$/i.test(text)||n.matches('[data-dismiss],.modal-close-x')||/\bclose[A-Z]|\bcloseModal\(/.test(n.getAttribute('onclick')||'');}
async function confirm(root,button,state){if(state.confirming)return;state.confirming=true;try{const discard=await ui108.modal('Unsaved changes','<p>Discard your unsaved changes?</p>',[{label:'Keep Editing',value:false,primary:true},{label:'Discard Changes',value:true}]);if(discard&&visible(root)){state.changed=false;state.base=snapshot(root);replaying.add(button);try{button.click()}finally{replaying.delete(button)}}}finally{state.confirming=false}}
for(const type of ['pointerdown','mousedown','touchstart','click'])window.addEventListener(type,e=>{
 const root=rootOf(e.target);if(!root||!editable(root))return;const state=track(root);
 const outside=e.target===root&&(root.tagName!=='DIALOG'||(()=>{const r=root.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom})());
 if(outside){stop(e);return;}
 if(type!=='click')return;const b=e.target.closest('button,[role=button],a');if(!b||replaying.has(b)||!isDismiss(b))return;
 if(state?.changed&&snapshot(root)!==state.base){stop(e);void confirm(root,b,state)}
},true);
for(const type of ['input','change'])window.addEventListener(type,e=>{const root=rootOf(e.target);if(root&&editable(root)){const state=track(root);if(state)state.changed=true}},true);
window.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const all=[...document.querySelectorAll(selector)].filter(visible),top=rootOf(all.at(-1));if(!top||!editable(top))return;if(document.querySelector('.account-list1428'))return;stop(e);dismissButton(top)?.click()},true);
window.addEventListener('cancel',e=>{const root=rootOf(e.target);if(editable(root)){stop(e);dismissButton(root)?.click()}},true);
function ready(){scan(document.body);new MutationObserver(records=>{for(const r of records){if(r.type==='attributes'){const root=rootOf(r.target);if(root&&!visible(root))states.delete(root);else if(root)track(root)}else for(const n of r.addedNodes)scan(n)}}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','open','style']})}
window.editorProtection14380={rootOf,editable};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
