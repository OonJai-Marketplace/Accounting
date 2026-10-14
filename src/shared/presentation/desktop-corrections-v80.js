/* Desktop refinements; original mobile DOM text is restored at the breakpoint. */
const desktop80=matchMedia('(min-width:768px)');
let historyQuery80='';
function historyFilter80(scope=document){
 const q=historyQuery80.trim().toLowerCase();desktopNodes80(scope,'#archiveMonths67 .clustered-journal-table tbody').forEach(body=>{const groups=new Map();let key='';for(const row of body.rows){key=row.dataset.entryId||key||String(groups.size);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row)}for(const rows of groups.values()){const show=!q||rows.some(r=>r.textContent.toLowerCase().includes(q));rows.forEach(r=>r.hidden=!show)}});
}
// Mutation passes stay within changed panels; initial and breakpoint passes remain complete.
function desktopNodes80(scope,selector){return [...(scope.matches?.(selector)?[scope]:[]),...scope.querySelectorAll(selector)]}
function desktopMutationRoots80(records){
 const roots=new Set();
 for(const record of records){
  const target=record.target.nodeType===1?record.target:record.target.parentElement;
  const panel=target?.closest('.tab-content');
  if(panel){roots.add(panel);continue}
  if(target&&target!==document.body&&target!==document.documentElement)roots.add(target);
  for(const node of record.addedNodes)if(node.nodeType===1)roots.add(node);
 }
 return [...roots].filter(root=>root.isConnected&&![...roots].some(other=>other!==root&&other.contains(root)));
}
function polishDesktop80(scope=document){
 const all=selector=>desktopNodes80(scope,selector),one=selector=>all(selector)[0];
 const desktop=desktop80.matches;
 all('.final-record-count').forEach(n=>{const label=n.querySelector('small'),count=n.querySelector('b');if(!label||!count)return;if(desktop){if(!label.dataset.original80)label.dataset.original80=label.textContent;const adjustment=/change/i.test(label.dataset.original80);const text=Number(count.textContent)===1?(adjustment?'change':'entry'):(adjustment?'changes':'entries');if(label.textContent!==text)label.textContent=text}else if(label.dataset.original80){label.textContent=label.dataset.original80;delete label.dataset.original80}});
 const search=one('#archiveMonths67 .history-header14342 input[type=search]');if(search){if(search.value!==historyQuery80&&document.activeElement!==search)search.value=historyQuery80;search.oninput=e=>{historyQuery80=e.target.value;historyFilter80(scope)};historyFilter80(scope)}
 if(desktop){const n=one('#reminderUnit');if(n){const width=((n.selectedOptions[0]?.textContent.length||12)+5)+'ch';if(n.style.width!==width)n.style.width=width}}
 all('.ledger-summary71').forEach(summary=>{if(summary.classList.contains('aligned85')||summary.querySelector('.ledger-side80'))return;const stats=summary.querySelectorAll('.ledger-stat71'),closing=stats[stats.length-1]?.querySelector('strong');if(!closing)return;const text=closing.textContent,side=text.match(/\b(DR|CR)\b/)?.[1]||'—';const extra=document.createElement('span');extra.className='ledger-stat71 ledger-side80';extra.innerHTML='<small>Balance side</small><strong>'+side+'</strong>';stats[0].after(extra);closing.className='ledger-closing-original80';const amount=document.createElement('strong');amount.className='ledger-side80';amount.textContent=text.replace(/\s+(DR|CR)$/,'');closing.after(amount)});
 all('button.tab-btn,.category-tab').forEach(n=>{if(n.textContent.trim()==='System Accounts & Mapping'&&desktop){n.dataset.systemTitle80='true';n.textContent='System Accounts'}else if(n.dataset.systemTitle80&&!desktop){n.textContent='System Accounts & Mapping';delete n.dataset.systemTitle80}});
 const mapping=one('.system-content71');if(mapping&&/System Posting Mappings/.test(mapping.textContent)){mapping.classList.add('system-mapping80');mapping.nextElementSibling?.classList.add('system-mapping80');const h=mapping.parentElement.querySelector('h3');if(h){const text=desktop?'System Accounts':'System Accounts & Mapping';if(h.textContent!==text)h.textContent=text}}
}
document.addEventListener('click',event=>{if(!desktop80.matches)return;const field=event.target.closest('input[type=date],input[type=month]');if(field&&!field.disabled&&!field.readOnly&&!field.hasAttribute('onclick'))try{field.showPicker?.()}catch(_){} });
document.addEventListener('change',event=>{if(event.target.id==='reminderUnit')polishDesktop80()});
let pending80=false,full80=false;const dirty80=new Set();function schedule80(records){if(Array.isArray(records)){for(const root of desktopMutationRoots80(records))dirty80.add(root)}else full80=true;if(pending80||!full80&&!dirty80.size)return;pending80=true;requestAnimationFrame(()=>{pending80=false;const roots=full80?[document]:[...dirty80].filter(n=>n.isConnected);full80=false;dirty80.clear();for(const root of roots)polishDesktop80(root)})}
desktop80.addEventListener('change',schedule80);document.addEventListener('DOMContentLoaded',()=>{polishDesktop80();new MutationObserver(schedule80).observe(document.body,{childList:true,subtree:true})})