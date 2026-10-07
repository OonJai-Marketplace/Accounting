/* Shared presentation rules. Account data, permissions and posting remain unchanged. */
(()=>{'use strict';
 const moneyHeading=text=>/^running (?:amount|balance)$/i.test(text.trim())||/^(?:(?:opening|closing|total|base|foreign|adjusted|balance)\s+)*(?:debits?|credits?|dr|cr)(?:\b|\s|\()/i.test(text.trim())&& !/account|note|card|terms/i.test(text);
 function sizeTable(table){
  if(table.closest('#docFrame105'))return;
  const rows=[...table.rows],occupied=[],positions=new Map(),money=new Set();let columns=0;
  rows.forEach((row,ri)=>{let ci=0;for(const cell of row.cells){while(occupied[ci]>ri)ci++;const span=cell.colSpan||1;positions.set(cell,[ci,span]);for(let c=ci;c<ci+span;c++){occupied[c]=ri+(cell.rowSpan||1);if(cell.tagName==='TH'&&moneyHeading(cell.textContent))money.add(c);}ci+=span;columns=Math.max(columns,ci);}});
  // Some report generators use a TD header rather than a THEAD.
  if(!money.size&&rows[0])for(const cell of rows[0].cells){if(moneyHeading(cell.textContent)){const [start,span]=positions.get(cell);for(let c=start;c<start+span;c++)money.add(c);}}
  // Totals and nested/multi-row headings retain their merged cells.
  for(const [cell,[start,span]] of positions){const enabled=span===1&&money.has(start);if(cell.hasAttribute('data-money1439')!==enabled){if(enabled)cell.setAttribute('data-money1439','');else cell.removeAttribute('data-money1439');}if(enabled){for(const [key,value] of [['width','180px'],['min-width','180px'],['max-width','none']])if(cell.style.getPropertyValue(key)!==value)cell.style.setProperty(key,value,'important');}}
  if(money.size){table.classList.add('money-table1439');table.style.setProperty('--money-min1439',(money.size*180+(columns-money.size)*90)+'px');}
 }
 function scan(root=document){const tables=new Set();if(root.nodeType===1){const parent=root.closest('table');if(parent)tables.add(parent);}root.querySelectorAll?.('table').forEach(t=>tables.add(t));tables.forEach(sizeTable);}
 function ready(){scan();let queued=false,roots=new Set();new MutationObserver(records=>{for(const record of records){if(record.type==='characterData'){roots.add(record.target.parentElement);continue;}for(const n of record.addedNodes)if(n.nodeType===1)roots.add(n);if(record.target.closest?.('table'))roots.add(record.target);}if(queued||!roots.size)return;queued=true;requestAnimationFrame(()=>{queued=false;const current=roots;roots=new Set();current.forEach(r=>{if(r?.isConnected)scan(r)});});}).observe(document.body,{childList:true,subtree:true,characterData:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
