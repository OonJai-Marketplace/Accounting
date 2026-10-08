/* scripts/backup-validation1441.js */
/* Validate archive structure before inspection or workbook generation. No database writes. */
(()=>{'use strict';
function validate(pack){
 if(pack?.format!=='oonjai-data-113'||!pack.tables||Array.isArray(pack.tables)||typeof pack.tables!=='object')throw Error('Choose an Oon Jai application backup.');
 for(const name of ['accounts','journal_entries','journal_lines'])if(!Array.isArray(pack.tables[name]))throw Error('Backup is missing '+name+'.');
 for(const [name,rows] of Object.entries(pack.tables)){if(!Array.isArray(rows)||rows.some(r=>!r||typeof r!=='object'||Array.isArray(r)))throw Error('Invalid records in '+name+'.');const ids=rows.map(r=>r.id).filter(x=>x!=null).map(String);if(new Set(ids).size!==ids.length)throw Error('Duplicate record IDs in '+name+'.');}
 for(const [name,rows] of Object.entries(pack.auditTrail||{}))if(!Array.isArray(rows))throw Error('Invalid audit records in '+name+'.');
 const references=[['journal_lines','journal_entry_id','journal_entries'],['journal_lines','account_id','accounts'],['staff_journal_lines','staff_journal_id','staff_journals'],['vouchers14299','journal_entry_id','journal_entries'],['voucher_versions14299','voucher_id','vouchers14299'],['vouchers14299','journal_entry_id','journal_entries'],['voucher_versions14299','voucher_id','vouchers14299']];
 for(const [source,key,parent] of references){const ids=new Set((pack.tables[parent]||[]).map(r=>String(r.id)));if((pack.tables[source]||[]).some(r=>r[key]!=null&&!ids.has(String(r[key]))))throw Error('Backup contains '+source+' with missing '+parent+'. Prepare a complete backup before relying on its totals.');}
 for(const r of pack.tables.journal_lines)for(const k of ['debit','credit'])if(r[k]!=null&&(r[k]===''||!Number.isFinite(Number(r[k]))))throw Error('Backup contains an invalid journal amount.');
 return pack;
}
window.backupValidation1441={validate};
})();
;
/* scripts/cell-navigation14233.js */
/* Spreadsheet navigation commits existing cell editors; posting stays explicit. */
(()=>{'use strict';
const roots='table,[role="grid"],#simpleRows1430,#staffSingleLines,#staffDoubleLines,.audit-line-list14233,form,.tab-content,.screen,[role="dialog"],.modal-dialog,.audit-editor,dialog,#upcomingEditor92,.currency-add-bar',fields='input,select,textarea,[contenteditable="true"],[contenteditable="plaintext-only"]';let sequence=0;
function usable(n){return !n.disabled&&(!n.readOnly||n.getAttribute('role')==='combobox')&&!['hidden','button','submit','reset','file','password','radio'].includes(n.type)&&!n.closest('[hidden],[inert]')&&n.getClientRects().length>0&&getComputedStyle(n).visibility!=='hidden'}
function matrix(root){if(!root)return [];const rowSelector=root.matches('table,[role="grid"]')?'tr,[role="row"]':root.id==='simpleRows1430'?'.simple-row1430':root.id==='staffSingleLines'?'[data-staff-single]':root.id==='staffDoubleLines'?'[data-staff-double]':root.matches('.audit-line-list14233')?'.audit-line':null;if(rowSelector)return [...root.querySelectorAll(rowSelector)].filter(r=>r.closest(roots)===root).map(r=>[...r.querySelectorAll(fields)].filter(n=>usable(n)&&n.closest(roots)===root)).filter(r=>r.length);const list=[...root.querySelectorAll(fields)].filter(n=>usable(n)&&n.closest(roots)===root),rows=[];for(const n of list){const y=n.getBoundingClientRect().top,last=rows.at(-1);if(last&&Math.abs(last[0].getBoundingClientRect().top-y)<10)last.push(n);else rows.push([n])}return rows}
function saveButton(root){const context=root.closest('form,[role="dialog"],dialog,#upcomingEditor92,.currency-add-bar');if(!context||context.closest('#loginGate,#settings-recovery113,#operationalReset142,#journalEntry98')||/journal|staff|reset|recovery/i.test(context.id))return null;return [...context.querySelectorAll('button,input[type="submit"]')].find(b=>!b.disabled&&b.getClientRects().length&&!b.closest('[hidden]')&&/^(save|apply|update|create|add currency)\b/i.test((b.textContent.trim()||b.value||'').replace(/^\+\s*/,''))&&!/post|resubmit|delete|reset|archive|restore/i.test(b.textContent)&&!b.matches('.danger,.danger108,.je-btn-danger'))}

function locate(root){const anchor=root.closest('.tab-content[id],main[id],form[id],[role="dialog"][id]')||document.body,id=anchor.id,index=[...anchor.querySelectorAll(roots)].indexOf(root);return ()=>root.isConnected?root:root.id?document.getElementById(root.id):(id?document.getElementById(id):document.body)?.querySelectorAll(roots)[index]}
async function move(n,key,alreadyCommitted=false){const root=n.closest(roots);if(!root)return;const rows=matrix(root),ri=rows.findIndex(r=>r.includes(n));if(ri<0)return;const ci=rows[ri].indexOf(n),flat=rows.flat();let target;
 if(key==='ArrowUp'||key==='ArrowDown'){const next=rows[ri+(key==='ArrowDown'?1:-1)];if(next){const x=n.getBoundingClientRect().left;target=next.reduce((a,b)=>Math.abs(b.getBoundingClientRect().left-x)<Math.abs(a.getBoundingClientRect().left-x)?b:a)}}else target=flat[flat.indexOf(n)+(key==='ArrowLeft'||key==='Previous'?-1:1)];
 if(key==='Enter'&&!target){const outer=root.parentElement?.closest('form,[role="dialog"],dialog');if(outer){const all=[...outer.querySelectorAll(fields)].filter(usable);target=all[all.indexOf(n)+1]}}
 const resolve=locate(root),tr=target?rows.findIndex(r=>r.includes(target)):ri,tc=target&&tr>=0?rows[tr].indexOf(target):ci,id=target?.id;const token=++sequence;
 if(n.checkValidity&&!n.checkValidity()){n.reportValidity();return}
 if(n.type==='checkbox'&&key==='Enter')n.checked=!n.checked;
 let emitted=false;const changed=e=>{emitted=true;if(alreadyCommitted)e.stopImmediatePropagation()};n.addEventListener('change',changed,true);n.blur();if(!emitted&&!alreadyCommitted)n.dispatchEvent(new Event('change',{bubbles:true}));n.removeEventListener('change',changed,true);
 if(n.isConnected&&n.checkValidity&&!n.checkValidity()){n.focus();n.reportValidity();return}
 window.drafts1427?.flush?.();
 if(key==='Enter'&&n.dataset.inlineUser117)await window.workspaceCellCommit14233?.(n.dataset.inlineUser117,n.dataset.inlineRow117);
 if(key==='Enter'&&!target){const save=saveButton(root);if(save){if(save.form&&save.type==='submit')save.form.requestSubmit(save);else save.click();return}}
 requestAnimationFrame(()=>{if(token!==sequence)return;const host=resolve(),grid=host&&matrix(host),next=(target?.isConnected&&usable(target)?target:null)||(id&&document.getElementById(id))||grid?.[tr]?.[tc];if(next&&usable(next)){next.focus({preventScroll:true});next.scrollIntoView({block:'nearest',inline:'nearest'});if(next.tagName==='INPUT'&&!next.readOnly&&typeof next.select==='function')try{next.select()}catch{}}});
}
document.addEventListener('pointerdown',()=>sequence++,true);
document.addEventListener('keydown',e=>{if(e.isComposing||e.ctrlKey||e.metaKey||e.altKey||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'].includes(e.key))return;const n=e.target;if(!n.matches?.(fields)||!usable(n)||!n.closest(roots)||n.closest('#loginGate,#settings-recovery113,#operationalReset142,.scope-picker14233,#document-editor105'))return;if(n.matches('textarea,[contenteditable="true"],[contenteditable="plaintext-only"]')&&e.shiftKey&&e.key==='Enter')return;
 const expanded=n.getAttribute('role')==='combobox'&&n.getAttribute('aria-expanded')==='true';if(expanded){if(e.key==='Enter'){const root=n.closest(roots),resolve=locate(root),row=matrix(root),r=row.findIndex(x=>x.includes(n)),c=row[r]?.indexOf(n);setTimeout(()=>{if(n.getAttribute('aria-expanded')==='false'){const current=n.isConnected?n:matrix(resolve()||root)[r]?.[c];if(current)move(current,'Enter',true)}})}return}
 e.preventDefault();e.stopImmediatePropagation();move(n,e.shiftKey&&e.key==='Enter'?'Previous':e.key);
},true);
window.cellNavigation14233={matrix,move};
})();

;
