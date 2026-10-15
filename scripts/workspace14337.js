/* Requested workspace organization. Existing records and calculation rules are retained. */
(()=>{'use strict';
const $=id=>document.getElementById(id),esc=v=>escapeHtml(String(v??''));
let upcoming='recurring',summaryGeneration=0;
function upcomingTabs(){
 const root=$('transactions-recurring');if(!root)return;
 let bar=$('upcomingTabs14337');if(!bar){bar=document.createElement('nav');bar.id='upcomingTabs14337';bar.className='workspace-tabs14337';bar.setAttribute('aria-label','Upcoming sections');bar.setAttribute('role','tablist');bar.innerHTML=[['recurring','Recurring'],['scheduled','Scheduled'],['todos','To-dos'],['calendar','Calendar']].map(([id,label])=>'<button type="button" role="tab" data-upcoming14337="'+id+'">'+label+'</button>').join('');root.prepend(bar);bar.onclick=e=>{const b=e.target.closest('[data-upcoming14337]');if(b){upcoming=b.dataset.upcoming14337;upcomingTabs()}};bar.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const buttons=[...bar.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);if(i<0)return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?3:(i+(e.key==='ArrowRight'?1:3))%4;buttons[next].click();buttons[next].focus()});}
 const banner=root.querySelector(':scope>.area-banner113');if(banner&&!window.workspaceConsistency14343&&bar.previousElementSibling!==banner)banner.after(bar);
 const title=banner?.querySelector('h1 span:last-child');if(title&&title.textContent!=='Upcoming Transactions')title.textContent='Upcoming Transactions';
 for(const node of root.children){if(node===bar||node===banner||node.matches('script,style,.module-header,#categoryTabShell,#settingsSections14335,.sub-user-tabs-shell,.sticky-tabs14344'))continue;const key=node.id==='scheduledJournals91'?'scheduled':node.id==='todos136'?'todos':node.id==='upcomingEvents14306'?'calendar':'recurring';if(node.dataset.upcomingPanel14337!==key)node.dataset.upcomingPanel14337=key;}
 if(root.dataset.upcoming14337!==upcoming)root.dataset.upcoming14337=upcoming;
 bar.querySelectorAll('button').forEach(b=>{const active=b.dataset.upcoming14337===upcoming;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1});
 const heading=[...root.querySelectorAll('[data-upcoming-panel14337=recurring] h3')].find(n=>n.textContent.trim()==='Upcoming');if(heading)heading.textContent='Recurring Transaction';
}
function mountReconciliation(panel=$('user-entry-review')){
 if(!panel)return;let work=$('reconciliationWork14337');if(!work){work=document.createElement('section');work.id='reconciliationWork14337';work.hidden=true;panel.append(work)}
 const host=$('reconciliationList71');if(host&&host.parentElement!==work)work.append(host);
 const report=$('report-reconciliation');if(report&&!$('reconciliationSummary14337')){const summary=document.createElement('section');summary.id='reconciliationSummary14337';summary.className='module-card';report.append(summary)}
}
async function summary(){
 mountReconciliation();const node=$('reconciliationSummary14337'),owner=reportOwner71(),generation=++summaryGeneration;if(!node||!reportPermission71())return;
 try{const all=await reportStore71('readonly',s=>s.getAll());if(owner!==reportOwner71()||generation!==summaryGeneration)return;const rows=all.filter(r=>r.owner===owner).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
 node.innerHTML='<div class="je-card-header"><div><h3>Reconciliation Summary</h3><p>Saved reconciliation results. Prepare and complete reconciliations in Bookkeeping → Finalization.</p></div><div class="module-actions71"><button type="button" class="je-btn je-btn-secondary" data-rec-print14337>Export / Print</button></div></div><div class="table-container"><table><thead><tr><th>Account</th><th>Currency</th><th>Period</th><th>Book balance</th><th>Adjusted statement</th><th>Difference</th><th>Status</th><th>Report</th></tr></thead><tbody>'+rows.map(r=>{const c=reportCalculation71(r);return '<tr><td>'+esc(r.account.name)+'</td><td>'+esc(r.currency)+'</td><td>'+esc(formatAppDate(r.from)+' – '+formatAppDate(r.to))+'</td><td>'+money69(r.closing)+'</td><td>'+(c.adjusted===null?'—':money69(c.adjusted))+'</td><td>'+(c.difference===null?'—':money69(c.difference))+'</td><td>'+esc(r.status)+'</td><td>'+(r.status==='reconciled'?'<button type="button" class="je-btn je-btn-secondary" data-rec-view14337="'+esc(r.id)+'">View</button>':'Draft')+'</td></tr>'}).join('')+'</tbody></table></div>'+(rows.length?'':'<p>No saved reconciliations.</p>');
 node.querySelector('[data-rec-print14337]').onclick=()=>print82('Reconciliation Summary',documentWorkspace105.copySource(node),'');node.querySelectorAll('[data-rec-view14337]').forEach(b=>b.onclick=()=>openSavedReport71(encodeURIComponent(b.dataset.recView14337)));
 }catch(e){if(owner===reportOwner71()&&generation===summaryGeneration)node.textContent='Reconciliation summaries could not load: '+e.message}
}
function tabletHeader(){

 const main=document.querySelector('.main-content-area'),menu=$('mobileMenuToggle');if(!main||!menu)return;
 let header=$('tabletHeader14353');if(!header){header=document.createElement('header');header.id='tabletHeader14353';header.className='no-print';header.innerHTML='<div class="tablet-navigation14353"><nav aria-label="Main workspaces"></nav></div>';main.prepend(header);header.querySelector('nav').onclick=e=>{const button=e.target.closest('[data-tablet-target]');if(button){const module=button.dataset.tabletTarget.replace('nav-module-','');if(['transactions','settings'].includes(module)&&window.groupedNavigation14378)groupedNavigation14378.openMenu(module,button);else $(button.dataset.tabletTarget)?.querySelector('.nav-header')?.click();}};}
 const bar=header.querySelector('.tablet-navigation14353');if(menu.parentElement!==bar)bar.prepend(menu);
 const categories=[...document.querySelectorAll('#appSidebar .nav-category')].filter(n=>!n.hidden&&getComputedStyle(n).display!=='none');
 const label=node=>{const copy=node.cloneNode(true);copy.querySelectorAll('.nav-icon113,.nav-icon100,.arrow,.nav-count14311').forEach(n=>n.remove());return copy.textContent.trim();};
 const current=categories.find(n=>n.querySelector('.nav-header[aria-current="page"]'))||categories.find(n=>n.dataset.module===document.querySelector('.tab-content.active')?.dataset.module);
 const nav=header.querySelector('nav'),signature=categories.map(n=>n.id+':'+(n===current)+':'+label(n.querySelector('.nav-header'))).join('|');
 if(nav.dataset.signature!==signature){nav.dataset.signature=signature;nav.replaceChildren(...categories.map(category=>{const source=category.querySelector('.nav-header'),button=document.createElement('button'),name=label(source);button.type='button';button.dataset.tabletTarget=category.id;button.title=name;button.setAttribute('aria-label',name);if(category===current)button.setAttribute('aria-current','page');const icon=source.querySelector('.nav-icon113');if(icon)button.append(icon.cloneNode(true));else button.textContent=name;return button;}));}
}
function tablet(){const root=document.documentElement;const isTablet=root.dataset.device132==='tablet';if(!isTablet||root.dataset.device132==='phone')return;root.classList.toggle('tablet-landscape14337',matchMedia('(orientation:landscape)').matches);root.classList.toggle('tablet-portrait14337',!matchMedia('(orientation:landscape)').matches);document.body.classList.remove('sidebar-open','nav-drawer-open');$('appSidebar')?.classList.remove('mobile-open');$('mobileMenuToggle')?.setAttribute('aria-expanded','false');tabletHeader();requestAnimationFrame(tabletHeader);}
function ready(){
 mountReconciliation();upcomingTabs();tablet();
 const render=window.renderReconciliationList71;window.renderReconciliationList71=async function(...args){mountReconciliation();await render.apply(this,args);const title=$('reconciliationList71')?.querySelector('h3');if(title)title.textContent='Reconciliation';if($('report-reconciliation')?.classList.contains('active'))await summary()};
 const recRender=window.renderReport71;window.renderReport71=function(...args){const result=recRender.apply(this,args),overlay=$('recOverlay71');if(overlay)overlay.dataset.originTab14337=document.querySelector('.tab-content.active')?.id||'user-entry-review';window.exportCenter14337?.combine(overlay);return result};
 const create=window.createReconciliation71;window.createReconciliation71=function(...args){if(!access113.can('user-entry-review'))return showCenterStatus('Finalization access is required to reconcile accounts.',true);if(!$('user-entry-review')?.classList.contains('active')){switchTab('user-entry-review');budgetWorkflow14316.finalization('reconciliation')}return create.apply(this,args)};
 let queued=false;const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;upcomingTabs()})});if($('transactions-recurring'))observer.observe($('transactions-recurring'),{childList:true,subtree:true});
 document.addEventListener('click',e=>{if(e.target.closest('[data-todo-target1438],[data-todo-target1443],[data-notice1443]')){upcoming='todos';upcomingTabs()}},true);
 window.addEventListener('page113',()=>{const overlay=$('recOverlay71');if(overlay)overlay.style.display=$(overlay.dataset.originTab14337)?.classList.contains('active')?'':'none';upcomingTabs();tablet();if($('report-reconciliation')?.classList.contains('active'))void summary()});window.addEventListener('resize',tablet);window.addEventListener('orientationchange',tablet);
}
window.workspace14337={get section(){return upcoming},mountReconciliation,summary,upcomingTabs,showSection(key){upcoming=key;upcomingTabs()},showTodos(){upcoming='todos';upcomingTabs()}};
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
