/* Payroll document fields: preserve saved figures; edit names on their lines. */
(()=>{'use strict';
const number='[data-payroll-number273]',name='[data-payroll-signature-name273]';
function isPayroll(model){return model?.category==='Payroll'&&(/^(Payroll Calculation Report|Salary Vouchers|Payroll Vouchers)(?:\s|$)/i.test(model.title||'')||model.source==='payroll-entries'||model.payrollVouchers);}
function prepare(model){
 if(!isPayroll(model))return;
 const root=document.createElement('div');root.innerHTML=model.html||'';
 if(!model.payrollVouchers&&/Payroll Calculation Report/i.test(model.title||'')){for(const row of root.querySelector('table')?.querySelectorAll('tbody tr')||[]){const cell=row.cells[0];if(cell&&/^(?:OJM?[-\s]*)?[A-Z]{1,4}[-\s]?\d{1,5}\s*·\s*\S/.test(cell.textContent.trim())){const walker=document.createTreeWalker(cell,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode())if(node.nodeValue.trim()){node.nodeValue=node.nodeValue.replace(/^(\s*)(?:OJM?[-\s]*)?([A-Z]{1,4})[-\s]?(\d{1,5})(?=\s*·)/,'$1OJM-$2$3');break;}}}}
 // The approved report generator aligns calculated columns right. Migrate the
 // saved presentation in place; never regenerate it from newer payroll data.
 for(const cell of root.querySelectorAll('td')){
  if(cell.style.textAlign!=='right'&&!cell.matches(number))continue;
  cell.dataset.payrollNumber273='1';cell.setAttribute('contenteditable','false');
  cell.title='Calculated in Payroll';
  const text=cell.textContent.trim(),symbols={USD:'$',LAK:'₭',THB:'฿',EUR:'€'};
  const prefixed=text.match(/^(USD|LAK|THB|EUR)(?=\s+[−-]?[\d.,]+$)/);
  if(prefixed){const walker=document.createTreeWalker(cell,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode())if(node.nodeValue.includes(prefixed[1])){node.nodeValue=node.nodeValue.replace(prefixed[1],symbols[prefixed[1]]);break;}}
  else if(model.payrollVouchers&&/^[−-]?[\d.,]+$/.test(text)&&symbols[cell.nextElementSibling?.textContent.trim()])cell.prepend(symbols[cell.nextElementSibling.textContent.trim()]+' ');
  const header=cell.closest('table')?.querySelector('thead tr')?.cells[cell.cellIndex];
  if(header)header.dataset.payrollNumberHeader273='1';
 }
 // Voucher receiver identity and its existing per-employee chooser are retained.
 // The calculation report's freely entered signatories are editable on the line.
 if(!model.payrollVouchers)for(const group of root.querySelectorAll('[data-print-signatures]')){
  [...group.children].forEach((column,index)=>{
   if(column.querySelector(name))return;
   const line=column.children[0],oldName=column.children[1];
   if(!line||!oldName||!line.style.borderBottom)return;
   const field=document.createElement('span');field.dataset.payrollSignatureName273=String(index);
   field.setAttribute('contenteditable','true');field.style.cssText='display:block;width:100%;min-height:1.2em;line-height:1.2;font-size:10pt';
   field.innerHTML=oldName.innerHTML.trim()||'<br>';
   line.dataset.payrollSignatureLine273='1';
   line.style.display='flex';line.style.alignItems='flex-end';line.style.paddingBottom='1mm';
   line.append(field);oldName.remove();
  });
 }
 model.html=root.innerHTML;
}
function names(model){
 if(!isPayroll(model)||model.payrollVouchers)return null;
 const root=document.createElement('div');root.innerHTML=model.html||'';
 const fields=[...root.querySelector('[data-print-signatures]')?.querySelectorAll(name)||[]];
 return fields.length?{prepared:fields[0]?.textContent.trim()||'',receiver:fields[1]?.textContent.trim()||'',approver:fields[2]?.textContent.trim()||''}:null;
}
function intersects(range,root){
 if(!range||!root)return false;
 const anchor=range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentElement;
 if(anchor?.closest(number))return true;
 if(range.collapsed)return false;
 return [...root.querySelectorAll(number)].some(n=>{try{return range.intersectsNode(n)}catch{return false}});
}
function blocked(doc,event){
 const root=doc.getElementById('body105');if(!root?.querySelector(number))return false;
 if(event?.target?.closest?.(number))return true;
 for(const target of event?.getTargetRanges?.()||[]){const range=doc.createRange();try{range.setStart(target.startContainer,target.startOffset);range.setEnd(target.endContainer,target.endOffset);if(intersects(range,root))return true}catch{}}
 const selection=doc.getSelection();return !!selection?.rangeCount&&intersects(selection.getRangeAt(0),root);
}
function stop(event,doc,status){if(!blocked(doc,event))return false;event?.preventDefault();status?.('Calculated figures stay unchanged. Edit them in Payroll, then generate a new report.');return true;}
function focusName(event,doc){
 const line=event.target.closest?.('[data-payroll-signature-line273]'),field=line?.querySelector(name);if(!field)return;
 const selection=doc.getSelection();if(field.contains(selection?.anchorNode))return;
 field.focus({preventScroll:true});const range=doc.createRange();range.selectNodeContents(field);range.collapse(false);selection.removeAllRanges();selection.addRange(range);
}
const css='[data-payroll-signature-line273]{align-items:flex-end}[data-payroll-number273]{cursor:default}[data-payroll-signature-name273]:focus{outline:1px solid #008563;outline-offset:2px}@media print{[data-payroll-signature-name273]:focus{outline:0}}';
window.payrollFields273={prepare,names,blocked,stop,focusName,css};
})();
