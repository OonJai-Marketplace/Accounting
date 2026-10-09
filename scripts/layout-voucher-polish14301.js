/* Focused desktop/tablet alignment, document-table controls, and stable audit presentation. */
(()=>{'use strict';
let queued=false;
const $=(s,r=document)=>r.querySelector(s);
const all=(s,r=document)=>[...r.querySelectorAll(s)];

function printButton(id,host){
 let button=$(`[data-print-page14301="${id}"]`,host);
 if(button)return button;
 button=document.createElement('button');button.type='button';button.className='je-btn je-btn-secondary report-action14300';button.dataset.printPage14301=id;button.textContent='Print / Preview';
 button.onclick=()=>{if(!document.getElementById(id)?.classList.contains('active'))switchTab(id);window.copyReportToEditor105?.()};
 return button;
}
function pageHeaders(){
 const audit=$('#transactions-voided .je-card-header');
 if(audit){let actions=$('.page-header-actions14301',audit);if(!actions){actions=document.createElement('div');actions.className='page-header-actions14301';audit.append(actions)}const search=$('#auditSearch69')?.closest('label');if(search&&search.parentElement!==actions)actions.append(search);const print=printButton('transactions-voided',actions);if(print.parentElement!==actions)actions.append(print)}
 const toolbar=$('#period-review .period-review-toolbar');
 if(toolbar){let actions=$('.page-header-actions14301',toolbar);if(!actions){actions=document.createElement('div');actions.className='page-header-actions14301';toolbar.append(actions)}const picker=$('.period-review-picker',toolbar),year=$('#yearClose136',toolbar);picker?.querySelector('label')?.remove();if(picker&&picker.parentElement!==actions)actions.append(picker);if(year&&year.parentElement!==actions)actions.append(year);const print=printButton('period-review',actions);if(print.parentElement!==actions)actions.append(print)}
 for(const header of [audit,toolbar])if(header)for(const button of all('button',header))if(!button.closest('.page-header-actions14301')&&/^(print|preview|open in document)/i.test(button.textContent.trim()))button.remove();
 for(const source of all('#transactions-voided>.doc-source-action105,#period-review>.doc-source-action105'))source.remove();
}
function periodRows(){
 for(const actions of all('#periodTransactionsBody .transaction-review-actions')){
  const voids=all('button',actions).filter(b=>b.textContent.trim()==='Void');voids.slice(1).forEach(b=>b.remove());
  const edits=all('button',actions).filter(b=>b.textContent.trim()==='Edit');edits.slice(1).forEach(b=>b.remove());
 }
 for(const row of all('#periodTransactionsBody tr[data-entry-id]')){
  if(row.dataset.periodDescription14301)return;
  const previous=row.previousElementSibling;if(previous?.dataset.entryId===row.dataset.entryId)continue;
  const entries=typeof JournalModule!=='undefined'?JournalModule.entries||[]:[],entry=entries.find(x=>String(x.id)===String(row.dataset.entryId));
  const general=String(entry?.generalMemo||entry?.general_description||entry?.generalDescription||'').trim();if(!general)continue;
  const memo=row.cells[3];if(!memo)continue;const note=document.createElement('div');note.className='period-general14301';note.innerHTML='<strong>General description</strong><span></span>';note.lastElementChild.textContent=general;memo.prepend(note);row.dataset.periodDescription14301='1';
 }
}
function selectTablePanel(sidebar,index=0){const tabs=all('[data-table-panel14301]',sidebar);tabs.forEach(b=>{const selected=Number(b.dataset.tablePanel14301)===index;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1});all('.doc-table-controls1424>fieldset',sidebar).forEach((field,i)=>field.hidden=i!==index)}
function tableTools(){
 const host=$('#document-editor105');if(!host)return;
 host.querySelector('.doc-title105>h2')?.remove();
 const save=host.querySelector('[data-doc-action="voucher-save14299"]'),voucher=window.documentWorkspace105?.voucher;
 let badge=host.querySelector('.voucher-mode14303');if(voucher){if(!badge){badge=document.createElement('strong');badge.className='voucher-mode14303';host.querySelector('.doc-title105')?.prepend(badge)}const label=voucher.kind==='H'?'Handwritten Voucher · Blank fields':'Editor Voucher · Automatic totals';if(badge.textContent!==label)badge.textContent=label}else badge?.remove();
 if(save){const title=host.querySelector('.doc-title105');if(title&&save.parentElement!==title)title.append(save)}
 const sidebar=$('#docTableSidebar14298',host);if(!sidebar)return;const controls=$('.doc-table-controls1424',sidebar);if(!controls||controls.dataset.organized14301)return;
 controls.dataset.organized14301='1';const fields=all(':scope>fieldset',controls),labels=['Insert','Structure','Size','Borders','Selected Cell'];
 const tabs=document.createElement('div');tabs.className='doc-table-tabs14301';tabs.setAttribute('role','tablist');[0,2,3,1,4].forEach(i=>{const label=labels[i];const b=document.createElement('button');b.type='button';b.dataset.tablePanel14301=i;b.textContent=label;b.setAttribute('role','tab');b.onclick=()=>selectTablePanel(sidebar,i);tabs.append(b)});controls.before(tabs);
 fields[4]?.querySelector('legend')?.replaceChildren('Selected Cell');
 for(const small of all('small',controls))small.remove();
 const structure=fields[1];if(structure){const originalRow=$('[data-doc-action="add-row"]',structure),originalCol=$('[data-doc-action="add-col"]',structure);originalRow?.setAttribute('hidden','');originalCol?.setAttribute('hidden','');const add=document.createElement('div');add.className='doc-structure-add14301';add.innerHTML='<label>Quantity<input type="number" min="1" max="50" value="1" data-structure-count14301></label><button type="button" data-add-rows14301>Add Rows</button><button type="button" data-add-columns14301>Add Columns</button>';const repeat=button=>{const count=Math.max(1,Math.min(50,Number($('[data-structure-count14301]',structure)?.value)||1));for(let i=0;i<count;i++)button?.click()};$('[data-add-rows14301]',add).onclick=()=>repeat(originalRow);$('[data-add-columns14301]',add).onclick=()=>repeat(originalCol);structure.prepend(add)}
 selectTablePanel(sidebar,0);
}
function connection(){
 const source=$('.area-banner113>.connection14239,.dash-hero112>.connection14239');let button=$('#connectionFloat14301');
 if(!button){button=document.createElement('button');button.id='connectionFloat14301';button.type='button';button.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0M9 16a5 5 0 0 1 6 0M12 20h.01"/></svg>';button.onclick=()=>$('.area-banner113>.connection14239,.dash-hero112>.connection14239')?.click();document.body.append(button)}
 const dock=$('#workspaceTools108');if(dock&&dock.firstElementChild!==button)dock.prepend(button);
 const state=source?.dataset.state||(!navigator.onLine?'offline':'online'),label=source?.textContent?.trim()||(!navigator.onLine?'Offline':'Online');button.dataset.state=state;button.title=label;button.setAttribute('aria-label',label+' connection status');
 const tile=$('.logo-tile113');if(tile){let dot=$('.connection-logo14301',tile);if(!dot){dot=document.createElement('span');dot.className='connection-logo14301';dot.setAttribute('aria-hidden','true');tile.append(dot)}dot.dataset.state=state}
}
function polish(){queued=false;const blank=$('#voucherBlank14299');if(blank&&blank.textContent!=='Open Handwritten Draft')blank.textContent='Open Handwritten Draft';pageHeaders();periodRows();tableTools();connection()}
function schedule(){if(!queued){queued=true;requestAnimationFrame(polish)}}
document.addEventListener('click',event=>{
 const table=event.target.closest('[data-doc-action="table109"]');if(table)setTimeout(()=>{const sidebar=$('#docTableSidebar14298');if(sidebar)selectTablePanel(sidebar,0)},0);
},true);
window.addEventListener('connection14239',schedule);window.addEventListener('online',schedule);window.addEventListener('offline',schedule);
document.addEventListener('DOMContentLoaded',()=>{polish();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})},{once:true});
})();
