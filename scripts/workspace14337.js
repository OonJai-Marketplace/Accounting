/* Requested workspace organization. Existing records and calculation rules are retained. */
(()=>{'use strict';
const $=id=>document.getElementById(id),esc=v=>escapeHtml(String(v??''));
let upcoming='recurring',summaryGeneration=0;
function upcomingTabs(){
 const root=$('transactions-recurring');if(!root)return;
 let bar=$('upcomingTabs14337');if(!bar){bar=document.createElement('nav');bar.id='upcomingTabs14337';bar.className='workspace-tabs14337';bar.setAttribute('aria-label','Upcoming sections');bar.setAttribute('role','tablist');bar.innerHTML=[['recurring','Recurring'],['amortization','Amortization'],['todos','To-do List']].map(([id,label])=>'<button type="button" role="tab" data-upcoming14337="'+id+'">'+label+'</button>').join('');root.prepend(bar);bar.onclick=e=>{const b=e.target.closest('[data-upcoming14337]');if(b){upcoming=b.dataset.upcoming14337;upcomingTabs()}};bar.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const buttons=[...bar.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);if(i<0)return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowRight'?1:buttons.length-1))%buttons.length;buttons[next].click();buttons[next].focus()});}
 const banner=root.querySelector(':scope>.area-banner113');if(banner&&!window.workspaceConsistency14343&&bar.previousElementSibling!==banner)banner.after(bar);
 const title=banner?.querySelector('h1 span:last-child');if(title&&title.textContent!=='Upcoming Transactions')title.textContent='Upcoming Transactions';
 for(const node of root.children){if(node===bar||node===banner||node.matches('script,style,.module-header,#categoryTabShell,#settingsSections14335,.sub-user-tabs-shell,.sticky-tabs14344'))continue;const key=['amortizationPlans280','legacyAmortization280'].includes(node.id)?'amortization':node.id==='todos136'?'todos':node.id==='upcomingEvents14306'?'calendar':'recurring';if(node.dataset.upcomingPanel14337!==key)node.dataset.upcomingPanel14337=key;}
 if(root.dataset.upcoming14337!==upcoming)root.dataset.upcoming14337=upcoming;
 bar.querySelectorAll('button').forEach(b=>{const active=b.dataset.upcoming14337===upcoming;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1});
 const heading=[...root.querySelectorAll('[data-upcoming-panel14337=recurring] h3')].find(n=>n.textContent.trim()==='Upcoming');if(heading)heading.textContent='Recurring Transaction';
}
function mountReconciliation(panel=$('user-entry-review')){
 if(!panel)return;let work=$('reconciliationWork14337');if(!work){work=document.createElement('section');work.id='reconciliationWork14337';work.hidden=true;panel.append(work)}
 const host=$('reconciliationList71');if(host&&host.parentElement!==work)work.append(host);
 const report=$('report-reconciliation');if(report&&!$('reconciliationSummary14337')){const summary=document.createElement('section');summary.id='reconciliationSummary14337';summary.className='module-card';report.append(summary)}
}
function closeReconciliationHistory(){
 const panel=$('reconciliationLocalHistory');if(panel)panel.remove();
 const list=$('reconciliationList71');if(list)list.hidden=false;
}
function reconciliationHistory(){
 if(!window.access113?.can('report-reconciliation')||!window.access113.can('user-entry-review'))return;
 const list=$('reconciliationList71');if(!list||!list.closest('.tab-content.active'))return;
 closeReconciliationHistory();
 const panel=document.createElement('section');panel.id='reconciliationLocalHistory';panel.className='module-card';
 list.after(panel);list.hidden=true;void summary(panel);
}
async function summary(destination){
 mountReconciliation();const node=destination||$('reconciliationSummary14337'),owner=reportOwner71(),generation=++summaryGeneration;if(!node||!reportPermission71())return;
 try{const all=await reconciliationRecords305();if(owner!==reportOwner71()||generation!==summaryGeneration)return;const rows=latestReconciliations306(all.filter(r=>r.owner===owner&&reconciliationRecorded71(r)));
 node.innerHTML='<div class="je-card-header"><div><h3>Reconciliation Reports</h3><p>Saved results for open and closed books. Choose accounts and dates to export a summary, ledger details and signatories.</p></div><div class="module-actions71"><button type="button" class="je-btn je-btn-secondary" data-rec-print14337>Export / Print</button></div></div>'+reconciliationSummary306(rows)+(rows.length?'<section data-rec-ledgers307><h3>Ledger details</h3>'+rows.map(r=>'<details class="rec-section71"><summary>'+esc(reconciliationAccountLabel306(r,true))+' · '+esc(reconciliationPeriod306(r.from,r.to))+'</summary>'+reconciliationReportContent306([r],{summary:false,ledger:true})+'</details>').join('')+'</section>':'<p>No saved reconciliations.</p>');
 if(destination){const back=document.createElement('button');back.type='button';back.className='je-btn je-btn-secondary';back.textContent='Back to Reconcile';back.onclick=closeReconciliationHistory;node.querySelector('.module-actions71').prepend(back);}
 node.querySelector('[data-rec-print14337]').onclick=()=>reconciliationExport306();
 }catch(e){if(owner===reportOwner71()&&generation===summaryGeneration){node.textContent='Reconciliation summaries could not load: '+e.message;if(destination){const b=document.createElement('button');b.type='button';b.className='je-btn je-btn-secondary';b.textContent='Back to Reconcile';b.onclick=closeReconciliationHistory;node.append(b);}}}
}
function ready(){
 mountReconciliation();upcomingTabs();
 const render=window.renderReconciliationList71;window.renderReconciliationList71=async function(...args){mountReconciliation();await render.apply(this,args);const title=$('reconciliationList71')?.querySelector('h3');if(title)title.textContent='Reconciliation';if($('report-reconciliation')?.classList.contains('active'))await summary()};
 const recRender=window.renderReport71;window.renderReport71=function(...args){const result=recRender.apply(this,args),overlay=$('recOverlay71');if(overlay)overlay.dataset.originTab14337=document.querySelector('.tab-content.active')?.id||'user-entry-review';window.exportCenter14337?.combine(overlay);return result};
 const create=window.createReconciliation71;window.createReconciliation71=function(...args){if(!access113.can('user-entry-review'))return showCenterStatus('Journal review access is required to open Reconcile.',true);if(!$('user-entry-review')?.classList.contains('active')){switchTab('user-entry-review');budgetWorkflow14316.finalization('reconciliation')}return create.apply(this,args)};
 let queued=false;const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;upcomingTabs()})});if($('transactions-recurring'))observer.observe($('transactions-recurring'),{childList:true,subtree:true});
 document.addEventListener('click',e=>{if(e.target.closest('[data-todo-target1438],[data-todo-target1443],[data-notice1443]')){upcoming='todos';upcomingTabs()}},true);
 window.addEventListener('page113',()=>{if(!$('user-entry-review')?.classList.contains('active'))closeReconciliationHistory();const overlay=$('recOverlay71');if(overlay)overlay.style.display=$(overlay.dataset.originTab14337)?.classList.contains('active')?'':'none';upcomingTabs();if($('report-reconciliation')?.classList.contains('active'))void summary()});
}
window.workspace14337={get section(){return upcoming},mountReconciliation,summary,reconciliationHistory,closeReconciliationHistory,upcomingTabs,showSection(key){upcoming=['todos','amortization'].includes(key)?key:'recurring';upcomingTabs()},showTodos(){upcoming='todos';upcomingTabs()}};
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
