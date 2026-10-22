/* Focus notification destination without changing existing notice navigation. */
(()=>{'use strict';
const focusClass='ojm-notice-target143139';
const css=document.createElement('style');css.textContent='@keyframes ojmNoticeOrange143139{0%,100%{outline-color:#ed8a19}50%{outline-color:transparent}}.'+focusClass+'{outline:3px solid #ed8a19!important;outline-offset:4px!important;animation:ojmNoticeOrange143139 .65s 8!important;scroll-margin-top:110px!important}';document.head.append(css);
let previous;
function emphasize(node,scroll=true){if(!node||!node.isConnected||!node.getClientRects().length)return;previous?.classList.remove(focusClass);previous=node;if(scroll)node.scrollIntoView({behavior:'smooth',block:'center'});node.classList.remove(focusClass);void node.offsetWidth;node.classList.add(focusClass);setTimeout(()=>node.classList.remove(focusClass),5200)}
document.addEventListener('click',event=>{
 const item=event.target.closest('#headerNoticeList104 [data-target]');
 if(!item)return;
 const destination=item.dataset.target;
 const owner=typeof liveProfile==='undefined'?null:liveProfile?.id;
 const current=()=>owner===(typeof liveProfile==='undefined'?null:liveProfile?.id);
 let noticeId='';
 try{const key=JSON.parse(item.dataset.noticeKey143125||'[]');noticeId=String(key[1]||'')}catch{}
 if(destination==='ai-journal'){
   setTimeout(()=>{if(!current())return;window.DriveDrafts143128?.scrollToTop?.();const target=document.querySelector('#gptDrafts143129 .je-card-header');emphasize(target,false)},250);
   return;
 }
 if(destination==='website-update'){setTimeout(()=>{if(!current())return;emphasize(document.getElementById('websiteUpdates143103')||document.getElementById('websiteUpdateCheck143103'))},250);return}
 setTimeout(()=>{
 if(!current())return;
 const specific=noticeId&&[...document.querySelectorAll('[data-notice-id],[data-id],[data-entry-id]')].find(n=>[n.dataset.noticeId,n.dataset.id,n.dataset.entryId].includes(noticeId));
 const root=document.getElementById(destination);
 emphasize(specific||root?.querySelector('.area-banner113 + .je-card,.module-card,.settings-section-card,[role="dialog"],button')||root);
 },280);
},true);
window.ojmNoticeFocus143139={emphasize};
})();