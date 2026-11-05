/* Processing feedback follows the real operation, including filters and delayed navigation. */
(()=>{'use strict';const active=new Set();let control=null,legacyEnd=null;
function local(message,button){const item=[...active].at(-1);button=button||item?.button;if(!button?.isConnected)return;const host=button.closest('.settings-field,form,.panel113,.je-card')||button.parentElement;let n=host.querySelector(':scope > .action-result14296');if(!n){n=document.createElement('p');n.className='action-result14296';n.setAttribute('role','status');host.append(n)}n.textContent=message;}
const dialogSelector='dialog[open],.ui-overlay108,.voucher-modal14299:not([hidden]),.discard-confirm1440,.custom-alert-overlay,.modal-backdrop.active,.modal-overlay.active,.scheduled-overlay91,.pay-overlay95,.rec-overlay71,.tx72-overlay,.submission-compare-overlay,.workspace-cell-overlay,.save-overlay14234';
let knownDialogs=new Set(),lastTop=null;
function dialogs(){return [...document.querySelectorAll(dialogSelector)].filter(n=>n.isConnected&&!n.hidden&&n.getClientRects().length);}
function paint(){let box=document.getElementById('actionProgress14343');if(!box){box=document.createElement('div');box.id='actionProgress14343';box.setAttribute('role','status');box.setAttribute('aria-live','polite');box.setAttribute('popover','manual');box.innerHTML='<span class="action-spin14296" aria-hidden="true"></span><span></span>';document.body.append(box)}
 const visible=[...active].filter(x=>x.ready&&![...x.waiting].some(d=>knownDialogs.has(d))),show=visible.length>0&&!document.body.classList.contains('startup-pending1443')&&!document.querySelector('#loginGate:not(.is-authenticated),#startup1443:not([hidden]),#deviceLock14334'),top=[...knownDialogs].at(-1)||null;
 const message=visible.at(-1)?.message||'';if(box.lastElementChild.textContent!==message)box.lastElementChild.textContent=message;
 if(box.hidden===show)box.hidden=!show;
 if(typeof box.showPopover==='function'){try{if(box.matches(':popover-open')&&(!show||lastTop!==top))box.hidePopover();if(show&&!box.matches(':popover-open'))box.showPopover();}catch{}}
 else {const host=top?.tagName==='DIALOG'?top:document.body;if(box.parentNode!==host)host.append(box);}
 lastTop=top;
}
function dialogChange(){const current=new Set(dialogs());for(const dialog of current)if(!knownDialogs.has(dialog)){for(const item of active)if(!item.button||!dialog.contains(item.button))item.waiting.add(dialog);}knownDialogs=current;paint();}
function begin(button,message='Processing…'){const item={button,message,oldBusy:button?.getAttribute?.('aria-busy'),waiting:new Set(),ready:false};const delay=setTimeout(()=>{item.ready=true;paint()},150);if(button?.setAttribute)button.setAttribute('aria-busy','true');active.add(item);paint();let ended=false;return()=>{if(ended)return;ended=true;clearTimeout(delay);active.delete(item);if(button?.setAttribute&&![...active].some(x=>x.button===button)){if(item.oldBusy==null||item.oldBusy==='true')button.removeAttribute('aria-busy');else button.setAttribute('aria-busy',item.oldBusy)}paint()}}
const frame=()=>new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));
async function run(fn,button=control||document.activeElement,message){const owner=typeof liveProfile==='undefined'?null:liveProfile?.id;const end=begin(button,message);try{await frame();if((typeof liveProfile==='undefined'?null:liveProfile?.id)!==owner)throw Error('Your account changed. Repeat the action in the current account.');return await fn()}finally{end()}}
function routine(){return false}
function pending(message){if(active.size){const item=[...active].at(-1);item.message=message;paint();return}legacyEnd=begin(control||document.activeElement,message)}
function finishPending(){legacyEnd?.();legacyEnd=null}

function wrap(object,name,label){if(['saveWork82','runAction82'].includes(name))return;const fn=object?.[name];if(typeof fn!=='function'||fn.feedback14343)return;let task;const wrapped=function(...args){if(fn.constructor.name!=='AsyncFunction'&&!control&&!args.some(a=>['click','change','submit'].includes(a?.type)))return fn.apply(this,args);args[0]?.preventDefault?.();if(task&&!['reportSet79','selectReviewPeriod','loadEntryForEdit','openSavedReport71'].includes(name))return task;const event=args.find(a=>a?.submitter||a?.target?.nodeType),button=event?.submitter||event?.target||control||document.activeElement;const blocked=window.closingEligibility14346?.forAction(name,args,button);if(blocked){showCenterStatus(blocked,true);return false}const pending=run(()=>fn.apply(this,args),button,label).finally(()=>{if(task===pending)task=null});task=pending;return pending};wrapped.feedback14343=true;object[name]=wrapped;}
function ready(){
 knownDialogs=new Set(dialogs());
 new MutationObserver(records=>{if(records.some(r=>!r.target.closest?.('#actionProgress14343')&&(r.type==='attributes'||[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(n.matches?.(dialogSelector)||n.querySelector?.(dialogSelector))))))dialogChange();}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','hidden','class']});
 for(const name of ['saveRecurringTransaction','saveScheduled91','saveUserAccess','saveBusinessSettings','saveSettingsGroup','handleAccountFormSubmit','handleSubAccountFormSubmit','saveWork82','runAction82','saveAccountingIdSettingsToDatabase','savePrintSettingsToDatabase','uploadLegalDocuments','changePeriodStatus','finishEditing69','loadEntryForEdit','selectReviewPeriod','reportSet79','createReconciliation71','openSavedReport71'])wrap(window,name,/Period|Editing/.test(name)?'Processing book…':/reportSet|ReviewPeriod/.test(name)?'Loading selected records…':'Processing…');
 // Property handlers cover dynamically created actions as well as module object methods.
 // Inline globals above and shared filter loaders cover handlers that do not return promises.
 for(const type of ['click','change','submit'])document.addEventListener(type,event=>{
  const node=type==='click'?event.target.closest?.('button'):event.target;if(!node)return;const early=window.closingEligibility14346?.forAction('',[],node);if(early){event.preventDefault();event.stopImmediatePropagation();showCenterStatus(early,true);return}control=node;queueMicrotask(()=>{if(control===node)control=null});
  const property='on'+type;
  for(const match of (node.getAttribute(property)||'').matchAll(/\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\(/g)){const path=match[1].split('.');let obj=window;const name=path.pop();for(const key of path)obj=obj?.[key];if(obj?.[name]?.constructor?.name==='AsyncFunction')wrap(obj,name,type==='change'?'Loading selected records…':'Processing…');}
  const fn=node[property];if(typeof fn!=='function'||fn.feedback14343||node.hasAttribute(property))return;
  const wrapped=function(...args){if(wrapped.pending&&type!=='change')return false;let end;const message=type==='change'?'Loading selected records…':'Processing…';if(fn.constructor.name==='AsyncFunction')end=begin(node,message);let result;try{result=fn.apply(this,args)}catch(e){end?.();throw e}if(result?.then){end||=begin(node,message);wrapped.pending=true;return Promise.resolve(result).finally(()=>{wrapped.pending=false;end()})}end?.();return result};wrapped.feedback14343=true;node[property]=wrapped;
 },true);
}
window.actionFeedback14296={begin,run,wrap,local,routine,pending,finishPending,isBusy:()=>active.size>0};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();})();
