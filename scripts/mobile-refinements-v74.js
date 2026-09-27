/* Shared mobile repairs; comparison remains an admin transaction-review action. */
(()=>{
 const media=matchMedia('(max-width:1024px)');
 function sync(){
  document.querySelectorAll('#subUserWorkspacePanel .compare-shortcut,.v56-employee-records .compare-shortcut').forEach(n=>n.remove());
  if(!media.matches)return;
  document.querySelectorAll('.v49-post-tools>b').forEach(id=>{if(id.dataset.stacked)return;const value=id.textContent.replace(/^Entry ID:\s*/,'');id.dataset.stacked='1';const label=document.createElement('span'),number=document.createElement('span');label.textContent='Entry ID';number.textContent=value;id.replaceChildren(label,number)});
  document.querySelectorAll('.v56-balance-formula>strong').forEach(total=>{if(total.dataset.aligned)return;const value=total.textContent.replace(/^(Tracked balance:\s*|=\s*)/,'');total.dataset.aligned='1';total.dataset.labeled='1';const label=document.createElement('span'),amount=document.createElement('b');label.textContent='Tracked balance: ';amount.textContent=value;total.replaceChildren(label,amount)});
  const input=document.getElementById('recurringNextDate');if(input){let wrap=input.closest('.tx74-date-wrap');if(!wrap){wrap=document.createElement('div');wrap.className='tx74-date-wrap';input.before(wrap);wrap.append(input);const hint=document.createElement('span');hint.className='tx74-date-placeholder';wrap.append(hint)}const hint=wrap.querySelector('span'),format=ApplicationSettings.system?.dateFormat||'DD/MM/YYYY';if(hint.textContent!==format)hint.textContent=format;hint.hidden=!!input.value;wrap.classList.toggle('empty',!input.value)}
  const tabs=document.getElementById('subUserWorkspaceTabs');if(document.body.classList.contains('subusers-workspace-active')&&tabs&&!tabs.querySelector('.sub-user-mobile-menu')){const b=document.createElement('button');b.type='button';b.className='sub-user-mobile-menu';b.setAttribute('aria-label','Open main navigation');b.innerHTML='<span></span><span></span><span></span>';b.onclick=()=>toggleMobileNavigation();tabs.prepend(b)}
 }
 const previous=window.mobilePolish73;window.mobilePolish73=()=>{previous?.();sync()};
 document.addEventListener('change',sync);document.addEventListener('input',sync);media.addEventListener('change',sync);
 // A selected source can have several linked journal rows; show all, never guess a pair by position.
 window.openMobileComparison74=function(row){
  const source=document.getElementById('submissionComparisonOverlay');if(!media.matches||!source)return false;
  const ids=(row?.dataset.links||'').split(' ').filter(Boolean),sections=[...source.querySelectorAll('.submission-compare-grid>section')];
  document.getElementById('tx74Comparison')?.remove();const overlay=document.createElement('div');overlay.id='tx74Comparison';overlay.className='tx72-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Entry comparison');
  overlay.innerHTML='<section class="tx72-sheet"><header><h2>Entry comparison</h2><button type="button">Close</button></header><div class="tx74-comparison-body"></div></section>';
  const body=overlay.querySelector('.tx74-comparison-body');sections.forEach(section=>{const table=section.querySelector('table');if(!table)return;const headers=[...table.querySelectorAll('thead th')].map(n=>n.textContent.trim());const rows=[...table.querySelectorAll('tbody tr[data-links]')].filter(r=>r===row||ids.some(id=>(r.dataset.links||'').split(' ').includes(id)));const h=document.createElement('h3');h.textContent=section.querySelector('h4')?.textContent||'Entry';body.append(h);if(!rows.length){const p=document.createElement('p');p.textContent=ids.length?'No linked journal lines for this source.':'No source link is recorded. Review this line manually.';body.append(p);return}const record={lines:rows.map(r=>[...r.cells].map((cell,i)=>({label:headers[i]||'Details',value:cell.textContent.trim(),cell})))};const fields=document.createElement('div');fields.innerHTML=fields73(record,0);fields.querySelectorAll('[data-description]').forEach(button=>{button.style.whiteSpace='normal';button.onclick=()=>{button.style.whiteSpace=button.style.whiteSpace==='normal'?'nowrap':'normal'}});body.append(fields)});
  overlay.querySelector('button').onclick=()=>overlay.remove();overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};document.body.append(overlay);return true;
 };
 document.addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('tx74Comparison')?.remove()});
 const start=()=>{sync();new MutationObserver(changes=>{if(changes.some(c=>c.addedNodes.length))requestAnimationFrame(sync)}).observe(document.body,{childList:true,subtree:true})};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
