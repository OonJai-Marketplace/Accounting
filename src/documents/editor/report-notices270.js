/* Internal report notices belong to the editor, never the printable document. */
(()=>{'use strict';
const marker='data-report-notice270';
const notifications='.notice82,.voucher-warning1424,.tax-note102,.tax-error102,[role="status"],[role="alert"]';
function annotate(root){
 for(const node of root.querySelectorAll(notifications))if(!node.closest('table,[data-print-signatures]')&&!node.querySelector('table,form,input,select,textarea')&&!node.hidden)node.setAttribute(marker,'1');
}
const status=/^(?:draft(?:\s*[—–-]\s*not finalized)?|finalized(?: calculation)?|submitted|approved(?:_posted)?|posted|reviewed|completed?|open|closed|final approved|reviewed & forwarded; awaiting final approval|ສະບັບຮ່າງ — ຍັງບໍ່ສຳເລັດ|ສຳເລັດແລ້ວ)$/i;
const standalone=/^(?:DRAFT\s*[—–-]\s*NOT FINALIZED|FINALIZED(?: CALCULATION)?|SAMPLE\s*[—–-]\s*NOT FOR PAYMENT|ສະບັບຮ່າງ — ຍັງບໍ່ສຳເລັດ|ສຳເລັດແລ້ວ|ຕົວຢ່າງ — ບໍ່ໃຊ້ສຳລັບຈ່າຍເງິນ|Printing this voucher does not mark the salary paid or post a journal entry\.)$/i;
function split(html,existing=[],context={}){
 const root=document.createElement('div');root.innerHTML=String(html||'');annotate(root);
 const notices=Array.isArray(existing)?existing.filter(n=>typeof n==='string'&&n.trim()):[];
 const add=text=>{text=String(text||'').replace(/\s+/g,' ').trim();if(text&&!notices.some(n=>n.toLowerCase()===text.toLowerCase()))notices.push(text)};
 // Old saved copies predate explicit notice markers. Only migrate known generated
 // report headers and exact system messages; table data and user notes are retained.
 const known=context.savedReport1434||/payroll (?:calculation report|register)|salary (?:payment voucher|vouchers)|payroll voucher|account report|bank reconciliation report|period review|petty cash liquidation|daily shift cover sheet|ໃບສຳຄັນຈ່າຍເງິນເດືອນ/i.test([context.title,...[...root.querySelectorAll('h1,h2')].map(n=>n.textContent)].join(' '));
 if(known)for(const node of [...root.querySelectorAll('p')]){
  if(node.closest('table,[data-print-signatures]')||node.hasAttribute(marker))continue;
  const text=node.textContent.trim();
  if(text.includes('Report activity below may await posting.')){const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let part;while((part=walker.nextNode()))part.data=part.data.replace(/\s*Report activity below may await posting\./g,'');add('Report activity may await posting.');}
  if(standalone.test(text)||/^Source status: .+(?:PROVISIONAL — includes unposted records)?$/i.test(text)){add(text);node.remove();continue}
  const heading=node.previousElementSibling;
  const nearTitle=heading?.matches('h1,h2')||heading?.matches('p')&&heading.previousElementSibling?.matches('h1,h2');
  if(!nearTitle)continue;
  const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let part;
  while((part=walker.nextNode())){
   const bits=part.data.split(' · ');if(bits.length<2)continue;
   part.data=bits.filter(bit=>{const value=bit.trim().replace(/^Status:\s*/i,'');if(!status.test(value))return true;add(value);return false}).join(' · ');
  }
  if(!node.textContent.trim())node.remove();
 }
 for(const node of [...root.querySelectorAll('['+marker+']')]){
  if(!root.contains(node))continue;add(node.textContent);const parent=node.parentElement;node.remove();
  if(parent!==root&&parent?.matches('p')&&!parent.textContent.trim()&&!parent.querySelector('img'))parent.remove();
 }
 return {html:root.innerHTML,notices};
}
function prepare(model){if(!model)return;const result=split(model.html,model.reportNotices270,model);model.html=result.html;model.reportNotices270=result.notices;}
function draw(host,model){
 const banner=host?.querySelector('.doc-report-notices270');if(!banner)return;
 banner.replaceChildren();banner.removeAttribute('title');banner.removeAttribute('aria-label');banner.hidden=!model?.reportNotices270?.length;if(banner.hidden)return;
 const labels={'DRAFT — NOT FINALIZED':'Draft — not finalized','FINALIZED':'Finalized','SAMPLE — NOT FOR PAYMENT':'Sample — not for payment'};
 const messages=model.reportNotices270.map(message=>labels[message]||message);
 banner.textContent='· '+messages.join(' · ');
 banner.title='Internal notice (not printed)\n'+messages.join('\n');
 banner.setAttribute('aria-label','Internal notice, not printed: '+messages.join('; '));
}
window.reportNotices270={annotate,split,prepare,draw};
})();
