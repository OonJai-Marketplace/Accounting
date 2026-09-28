/* v101: attendance settings navigation, visual alignment and current-table audit view. */
(function(){
'use strict';
const $=id=>document.getElementById(id),safe=value=>escapeHtml(String(value??''));
let audit=false,renderQueued=false,rendering=false,lastView=null,lastKey='';
function active(){return document.querySelector('.tab-content.active')}
function groupTables(card){return [...card.querySelectorAll('table')].filter(t=>!t.parentElement.closest('table')&&t.closest('details:not(.row-menu99)')===card)}
function groups(view){return [...view.querySelectorAll('details:not(.row-menu99)')].filter(d=>!d.parentElement?.closest('details:not(.row-menu99)')&&groupTables(d).length)}
function normalize(s){return String(s||'').trim().replace(/\s+/g,' ').toUpperCase()}
function showAuditChanges(panel,label){$('auditChanges101')?.remove();const overlay=document.createElement('div');overlay.id='auditChanges101';overlay.className='pay-overlay95';overlay.innerHTML='<section class="pay-dialog95 audit-changes-dialog101" role="dialog" aria-modal="true"><header><h3>Audit changes — '+safe(label)+'</h3><button type="button" aria-label="Close">×</button></header><div class="audit-changes-body101"></div></section>';const content=panel.cloneNode(true);content.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));overlay.querySelector('.audit-changes-body101').append(content);document.body.append(overlay);overlay.querySelector('header button').onclick=()=>overlay.remove();overlay.querySelector('header button').focus()}
function renderAudit(){renderQueued=false;if(rendering)return;rendering=true;try{
 const view=active();if(lastView&&lastView!==view){lastView.querySelectorAll('.audit-hidden101').forEach(n=>n.classList.remove('audit-hidden101'));lastView.querySelector('#auditFlat101')?.remove();lastKey=''}lastView=view;
 const previous=view?.querySelector('#auditFlat101');if(!audit||!view){previous?.remove();view?.querySelectorAll('.audit-hidden101').forEach(n=>n.classList.remove('audit-hidden101'));lastKey='';return}
 const cards=groups(view);if(!cards.length){previous?.remove();lastKey='';return}
 const sources=cards.flatMap(card=>groupTables(card).map(table=>({card,table})));
 const key=view.id+'|'+sources.map(({card,table})=>card.querySelector('summary')?.textContent.trim().slice(0,40)+'-'+table.tBodies[0]?.rows.length).join('|');if(key===lastKey&&previous)return;lastKey=key;
 const schemas=sources.map(({table})=>[...table.tHead?.rows[table.tHead.rows.length-1]?.cells||[]].map((c,i)=>normalize(c.textContent)||'COLUMN '+(i+1)));
 const sameSchema=schemas.every(columns=>columns.join('|')===schemas[0].join('|'));
 const names=sameSchema?schemas[0].filter(name=>name!=='COLUMN 1'):['Record','Details'];
 const hasChanges=sources.some(({table})=>table.querySelector('.audit-detail-row'));if(hasChanges)names.push('Change details');
 if(!names.length){previous?.remove();return}
 const host=document.createElement('div');host.id='auditFlat101';host.className='audit-flat101';if(!sameSchema)host.classList.add('audit-compact102');host.setAttribute('aria-label','Audit table for '+(view.id||'current area'));
 const flat=document.createElement('table');flat.innerHTML='<thead><tr><th scope="col">Source</th>'+names.map(n=>'<th scope="col">'+safe(n)+'</th>').join('')+'</tr></thead><tbody></tbody>';const body=flat.tBodies[0];
 sources.forEach(({card,table},sourceIndex)=>{
  const label=card.querySelector('summary strong')?.textContent.trim()||card.querySelector('summary')?.textContent.trim().slice(0,80)||'Records';
  const local=schemas[sourceIndex];
  [...table.tBodies].flatMap(b=>[...b.rows]).filter(row=>!row.classList.contains('audit-detail-row')).forEach(row=>{
   const copy=body.insertRow();copy.insertCell().textContent=label;
   const values=[...row.cells].map((cell,i)=>({name:local[i],cell})).filter(x=>x.name&&x.name!=='COLUMN 1');
   if(sameSchema){names.filter(name=>name!=='Change details').forEach(name=>{const dest=copy.insertCell();dest.innerHTML=values.find(x=>x.name===name)?.cell.innerHTML||'';dest.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));dest.querySelectorAll('input,textarea,select').forEach(n=>n.disabled=true)})}
   else {const record=values.find(x=>/^(?:ID|ENTRY ID|ENTRY #|REFERENCE|EMPLOYEE|DATE|PERIOD)$/.test(x.name)&&x.cell.textContent.trim())||values.find(x=>x.cell.textContent.trim());copy.insertCell().textContent=record?.cell.textContent.trim()||'—';const details=copy.insertCell();details.className='audit-fields102';values.forEach(({name,cell})=>{const field=document.createElement('div'),key=document.createElement('b'),value=document.createElement('span');key.textContent=name;value.textContent=cell.textContent.trim()||'—';field.append(key,value);details.append(field)})}
   if(hasChanges){const cell=copy.insertCell();cell.className='audit-change101';const detail=row.nextElementSibling?.classList.contains('audit-detail-row')?row.nextElementSibling:null;if(detail){const button=document.createElement('button');button.type='button';button.textContent='View';button.title='View all changes for this record';button.onclick=()=>showAuditChanges(detail.querySelector('.audit-detail-panel')||detail,label);cell.append(button)}else cell.textContent='—'}
   copy.setAttribute('tabindex','0');copy.setAttribute('aria-label',label+' record');
  });
 });
 host.append(flat);previous?.remove();sources[0].card.before(host);cards.forEach(card=>card.classList.add('audit-hidden101'));
 }finally{rendering=false}}
function scheduleAudit(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(renderAudit)}
function toggleAudit(){audit=!audit;document.body.classList.toggle('audit-on101',audit);$('auditMode101')?.setAttribute('aria-pressed',String(audit));scheduleAudit()}
function installToolbar(){const shell=$('categoryTabShell');if(!shell||$('topTools101'))return;const tools=document.createElement('div');tools.id='topTools101';tools.className='no-print';tools.innerHTML='<button type="button" id="upcomingBell101" title="Upcoming transaction reminders" aria-label="Upcoming transaction reminders"><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></button><button type="button" id="auditMode101" aria-pressed="false" title="Combine this area’s grouped tables">Audit</button>';shell.append(tools);$('upcomingBell101').onclick=()=>switchTab('transactions-recurring');$('auditMode101').onclick=toggleAudit;
 document.addEventListener('click',e=>{if(!audit||e.target.closest('button,a,input,select,textarea,summary'))return;const row=e.target.closest('.tab-content.active table tbody tr');if(!row||row.closest('.clustered-journal-table'))return;row.closest('tbody')?.querySelectorAll('.audit-selected101').forEach(n=>n.classList.remove('audit-selected101'));row.classList.add('audit-selected101');e.stopPropagation()},true);
 document.addEventListener('keydown',e=>{if(!audit||!['Enter',' '].includes(e.key)||!e.target.matches('#auditFlat101 tbody tr:not(.audit-source101)'))return;e.preventDefault();e.target.click()});
 new MutationObserver(changes=>{if(!audit)return;if(changes.every(m=>m.target.closest?.('#auditFlat101')||[...m.addedNodes,...m.removedNodes].every(n=>n.id==='auditFlat101')))return;scheduleAudit()}).observe(document.querySelector('.workspace-scroll')||document.body,{childList:true,subtree:true});
 document.addEventListener('click',e=>{if(e.target.closest('.tab-btn,.category-tab,.nav-header'))scheduleAudit()},true);
}
function showLogo(data){let image=$('companyLogo101');if(!image){image=document.createElement('img');image.id='companyLogo101';image.alt='Company logo';document.querySelector('.sidebar-brand')?.prepend(image)}if(image){image.hidden=!data;image.src=data||''}const preview=$('logoPreview101');if(preview){preview.hidden=!data;preview.src=data||''}}
function updateBrand(value){const brand=document.querySelector('.sidebar-brand h2');if(brand)brand.textContent=value?.companyName||AccountingStore.companyName||'Oon Jai Marketplace';showLogo(localStorage.getItem('ojm_company_logo101')||'')}
function installBrand(){document.querySelector('.sidebar-brand .brand-icon-emblem')?.remove();updateBrand(BusinessSettings.current);
 const original=window.renderBusinessIdentity;window.renderBusinessIdentity=function(value,...rest){const result=original.apply(this,[value,...rest]);updateBrand(value);return result};
 const form=document.querySelector('#settings-system .app-settings-form');if(!form||$('companyLogoSettings101'))return;
 const block=document.createElement('div');block.id='companyLogoSettings101';block.className='settings-field';block.innerHTML='<label for="companyLogoUpload101">Company logo (PNG)</label><input type="file" id="companyLogoUpload101" accept="image/png,.png"><img id="logoPreview101" alt="Selected company logo" hidden><button type="button" class="je-btn je-btn-secondary" id="removeLogo101">Remove Logo</button><small>Saved to the database in v113. The company name comes from Business Information.</small>';
 form.querySelector('.settings-form-actions')?.before(block);showLogo(localStorage.getItem('ojm_company_logo101')||'');
 $('companyLogoUpload101').onchange=e=>{const file=e.target.files?.[0];if(!file)return;if(file.type!=='image/png'||file.size>512*1024){showCenterStatus('Select a PNG logo under 512 KB.',true);e.target.value='';return}const reader=new FileReader();reader.onload=()=>{try{localStorage.setItem('ojm_company_logo101',reader.result);showLogo(reader.result);showCenterStatus('Company logo saved on this browser.')}catch(_){showCenterStatus('The browser could not save the image. Choose a smaller PNG.',true)}};reader.readAsDataURL(file)};
 $('removeLogo101').onclick=()=>{localStorage.removeItem('ojm_company_logo101');showLogo('');$('companyLogoUpload101').value='';showCenterStatus('Company logo removed.')};
}
function renameHr(){const header=$('nav-module-hr')?.querySelector('.nav-header');if(header)[...header.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE&&/\bHR\b/.test(n.textContent)).forEach(n=>n.textContent=n.textContent.replace(/\bHR\b/,'Human Resources'))}
function install(){installToolbar();installBrand();renameHr();const sidebar=$('appSidebar');if(sidebar)new MutationObserver(renameHr).observe(sidebar,{childList:true,subtree:true});scheduleAudit()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
