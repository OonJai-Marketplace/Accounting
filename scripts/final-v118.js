/* Consolidated feedback and tablet navigation; preserve existing save semantics. */
(function(){'use strict';
let timer;const $=s=>document.querySelector(s);const noticeQueue1440=[];
function notificationKind14231(message,kind,pending){
 if(pending)return 'pending';if(kind===true)return 'error';if(['success','warning','error','info'].includes(kind))return kind;
 const text=String(message||'');
 if(/failed|could not|not confirmed|unavailable|denied|invalid|incorrect|not permitted|not included in your permissions|not saved|error|rejected|needs confirmation/i.test(text))return 'error';
 if(/session (?:expired|ending|ended)|signed out.*(?:inactiv|timeout)|warning|needs attention|taking longer|unfinished|before retrying/i.test(text))return 'warning';
 if(/\b(?:saved|confirmed|completed|successful(?:ly)?|downloaded|restored|posted|approved|removed|updated)\b/i.test(text))return 'success';
 return 'info';
}
function notificationIcon14231(kind){const paths={success:'M5 12l4 4L19 6',warning:'M12 3 2 21h20zM12 9v5M12 17v1',error:'M6 6l12 12M18 6 6 18',info:'M12 10v7M12 7v1'};return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(kind==='info'||kind==='error'?'<circle cx="12" cy="12" r="9"/>':'')+'<path d="'+paths[kind]+'"/></svg>'}
function dismissNotice(n){
 clearTimeout(timer);
 n.hidden=true;
 n.dataset.persistent1440='';
 const next=noticeQueue1440.shift();
 if(next)notify(...next,true);
}
function scheduleDismiss(n){
 clearTimeout(timer);
 if(n.hidden||!n.dismissAfter)return;
 if(!n.querySelector('button').hidden&&n.matches(':focus-within, :hover'))return;
 timer=setTimeout(()=>dismissNotice(n),n.dismissAfter);
}
function notify(message,error=false,pending=false,queued=false){
 const quiet=window.actionFeedback14296;if(quiet?.routine(String(message||''),error)){quiet.local(String(message||''));const pendingBox=document.getElementById('status118');if(!quiet.isBusy?.()&&pendingBox?.classList.contains('pending')){clearTimeout(timer);pendingBox.hidden=true;const next=noticeQueue1440.shift();if(next)notify(...next,true)}return}
 const text=String(message||''),workspace=/^Viewing .+ workspace as Administrator\./.test(text),inside=()=>document.getElementById('sub-users-workspace')?.classList.contains('active');if(workspace&&!inside())return;
 if(workspace){const host=$('#subUserWorkspacePanel');if(!host)return;let note=$('#workspaceContext14284');if(!note){note=document.createElement('div');note.id='workspaceContext14284';note.setAttribute('role','note');const header=host.querySelector('.v49-desktop-user-heading');if(header)header.after(note);else host.prepend(note)}if(note.textContent!==text)note.textContent=text;return}
 pending=pending||(!error&&/^(?:Loading|Checking|Fetching|Preparing|Signing in|Updating workspace)(?:\b|…)/i.test(text));
 if(window.actionFeedback14296){if(pending){actionFeedback14296.pending(text);return}actionFeedback14296.finishPending();}
 const kind=notificationKind14231(text,error,pending);let n=$('#status118');
 if(!n){n=document.createElement('div');n.id='status118';n.innerHTML='<span class="status-motion118" aria-hidden="true"></span><span class="status-copy118"></span><button type="button" class="status-close1440" aria-label="Close notification">Close</button>';document.body.append(n);
 n.querySelector('button').onclick=()=>dismissNotice(n);
 for(const event of ['pointerenter','focusin'])n.addEventListener(event,()=>{if(!n.querySelector('button').hidden)clearTimeout(timer)});
 for(const event of ['pointerleave','focusout'])n.addEventListener(event,()=>queueMicrotask(()=>scheduleDismiss(n)));
 n.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();n.querySelector('button').click()}});}
 if(pending&&!n.hidden&&n.dataset.persistent1440==='true')return;
 if(!queued&&!n.hidden&&n.dataset.persistent1440==='true'&&text&&(n.dataset.message14296||n.querySelector('.status-copy118').textContent)!==text){if(!noticeQueue1440.some(x=>x[0]===text))noticeQueue1440.push([text,error,pending]);return;}
 clearTimeout(timer);$('#centerStatusToast')?.remove();const priority=kind==='error'||kind==='warning';
 n.className=kind;n.dataset.workspace14232=String(workspace);n.dataset.kind14231=kind;n.dataset.persistent1440=String(priority);n.setAttribute('role',kind==='error'||kind==='warning'?'alert':'status');n.setAttribute('aria-live',pending?'off':kind==='error'?'assertive':'polite');n.setAttribute('aria-label',pending?'Loading':'Notification');n.querySelector('.status-copy118').textContent=pending?'':text;n.dataset.message14296=text;
 if(!pending&&/Connection required(?:\.|:|$)/i.test(text)){
  const copy=n.querySelector('.status-copy118'),title=document.createElement('strong'),list=document.createElement('ul');
  title.textContent='Connection required';
  const body=text.replace(/^.*?Connection required(?:[.:]\s*|$)/i,'');
  const sentences=body.replace(/([.!?])\s+(?=[A-Z])/g,'$1;').split(/;\s*/);
  for(const sentence of sentences.filter(Boolean)){
   const li=document.createElement('li');
   li.textContent=sentence.charAt(0).toUpperCase()+sentence.slice(1);
   list.append(li);
  }
  copy.replaceChildren(title,list);
 }
 const motion=n.querySelector('.status-motion118');motion.innerHTML=pending?(window.loading1444?.markup()||''):notificationIcon14231(kind);n.querySelector('button').hidden=!(priority||text.length>140);n.hidden=!text;
 n.dismissAfter=kind==='success'?2400:4500;
 if(priority||text.length>140)n.dismissAfter=Math.min(20000,Math.max(8000,text.length*50));
 if(pending)n.dismissAfter=0;
 scheduleDismiss(n);
}
window.addEventListener('page113',()=>{if(document.getElementById('sub-users-workspace')?.classList.contains('active'))return;for(let i=noticeQueue1440.length-1;i>=0;i--)if(/^Viewing .+ workspace as Administrator\./.test(noticeQueue1440[i][0]))noticeQueue1440.splice(i,1);const n=$('#status118');if(n?.dataset.workspace14232==='true')n.querySelector('button').click()});
window.status118={clear:()=>{window.actionFeedback14296?.finishPending();clearTimeout(timer);noticeQueue1440.length=0;const n=$('#status118');if(n){n.hidden=true;n.dataset.persistent1440=''}$('#centerStatusToast')?.remove()},pending:m=>notify(m,false,true),done:m=>notify(m,'success'),warning:m=>notify(m,'warning'),info:m=>notify(m,'info'),error:m=>notify(m,true)};window.showCenterStatus=(message,error=false)=>notify(message,error);window.showAppNotification=(title,message,error=false)=>typeof message==='string'?notify(title+': '+message,error):notify(title,Boolean(message));
const seen=new WeakMap();let queued=false;
function viewport(){const v=window.visualViewport,root=document.documentElement;root.style.setProperty('--view-left118',(v?.offsetLeft||0)+'px');root.style.setProperty('--view-top118',(v?.offsetTop||0)+'px');root.style.setProperty('--view-width118',(v?.width||innerWidth)+'px');root.style.setProperty('--view-height118',(v?.height||innerHeight)+'px');root.style.setProperty('--view-center-x118',((v?.offsetLeft||0)+(v?.width||innerWidth)/2)+'px');root.style.setProperty('--view-center-y118',((v?.offsetTop||0)+(v?.height||innerHeight)/2)+'px')}
function polish(){queued=false;document.querySelectorAll('.tab-content.active .history-actions95').forEach(n=>{const parent=n.parentElement;if(parent?.classList.contains('pay-group-body95')&&n!==parent.lastElementChild)parent.append(n)});
 document.querySelectorAll('.tab-content.active .pay-group95>summary>span:last-child:not([data-summary118])').forEach(n=>{n.dataset.summary118='1';const parts=n.textContent.split(' · ');n.classList.add('pay-summary118');n.replaceChildren(...parts.map(t=>{const item=document.createElement('span'),small=document.createElement('small'),strong=document.createElement('strong');const m=t.match(/^([\d,.]+)\s+(.+)$/);small.textContent=m?m[2]:/draft|finalized|pending/i.test(t)?'Status':t==='Sample'?'Mode':'Scope';strong.textContent=m?m[1]:t;item.append(small,strong);return item}))});
 const avatar=$('#headerAccountInitials'),trigger=$('#headerAccountTrigger');if(avatar&&trigger&&avatar.parentElement!==trigger)trigger.prepend(avatar);
 document.querySelectorAll('[role=status],[role=alert]').forEach(n=>{if(n.closest('#status118,#loginGate,.pos118,.discard-confirm1440'))return;const panel=n.closest('.tab-content');if(panel&&!panel.classList.contains('active'))return;const text=n.textContent.trim(),previous=seen.get(n);if(previous===text||!text)return;const eligible=n.getAttribute('role')==='alert'||n.matches('.status113,[data-quote-status117]')||n.closest('form')&&/saved|failed|could not|invalid|error|success|downloaded|imported/i.test(text);if(!eligible||n.closest('[hidden]')||!n.getClientRects().length)return;seen.set(n,text);notify(text,n.getAttribute('role')==='alert'||n.classList.contains('error')||/failed|could not|invalid|error/i.test(text),/…$/.test(text));});
}
function schedule(){if(!queued){queued=true;requestAnimationFrame(polish)}}
function ready(){viewport();window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);window.addEventListener('resize',viewport);window.addEventListener('page113',schedule);polish();new MutationObserver(records=>{if(records.some(r=>{const n=r.target.nodeType===1?r.target:r.target.parentElement;const panel=n?.closest('.tab-content');return !n?.closest('#status118')&&(!panel||panel.classList.contains('active'))}))schedule()}).observe(document.body,{childList:true,subtree:true,characterData:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
