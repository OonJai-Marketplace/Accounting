/* Direct cell editing uses the existing workspace permissions and save RPC. */
(function(){'use strict';
const esc=v=>escapeHtml(String(v??'')),selector=(u,k)=>`[data-inline-user117="${CSS.escape(u)}"][data-inline-row117="${CSS.escape(k)}"]`;
let renderedTab='',deferred=false,saving=0;
const dirty=new Set(),inFlight=new Set();
const rowToken=(u,k)=>u+'|'+k;
const findUser=u=>availableSubUsers().find(x=>String(x.id)===String(u))||(String(liveProfile?.id)===String(u)?liveProfile:null);
function shortName(user){const parts=subUserName(user).trim().split(/\s+/);return parts.length>1?parts[0].slice(0,1)+'. '+parts.at(-1):parts[0]}
window.workspaceInlineCell117=function(user,row,field,label){
 if(row.journal_entry_id||(window.access113&&!access113.can('sub-users-workspace','edit'))){const value=field==='date'?formatAppDate(row.transaction_date):field==='description'?[row.memo,row.reference].filter(Boolean).join(' · '):field==='amount'?formatAppNumber(row.amount):field==='account'?lineAccountName(row):field==='fund'?accountLabelOnly(row.fund_account_id):row.direction==='in'?'Money In':'Money Out';return `<td data-label="${esc(label)}">${esc(value)}</td>`}
 const rules=workspaceRules(user),f=field==='date'?'transaction_date':field==='description'?'memo':field;
 const attrs=`class="inline-cell117" data-inline-user117="${esc(user.id)}" data-inline-row117="${esc(row.key)}" data-inline-field117="${f}" aria-label="${esc(label)}"`;
 let control='';
 if(['direction','account','fund'].includes(f)){
  const ids=f==='direction'?rules.directions:f==='fund'||row.direction==='in'?rules.fundIds:rules.entryIds;
  const current=f==='direction'?row.direction:f==='fund'?row.fund_account_id:row.direction==='in'?(row.fund_account_id||row.selected_account_id):(row.account_id||row.selected_account_id);
  control=`<select ${attrs}>${f==='direction'?'':'<option value="">Select '+esc(label)+'</option>'}${ids.map(id=>`<option value="${esc(id)}" ${String(id)===String(current)?'selected':''}>${esc(f==='direction'?(id==='in'?'Money In':'Money Out'):accountLabelOnly(id))}</option>`).join('')}</select>`;
 }else if(f==='transaction_date')control=`<input ${attrs} type="date" value="${esc(row.transaction_date)}">`;
 else{
  const value=f==='amount'?(Number(row.amount)>0?formatAppNumber(row.amount):''):row[f]||'';
  control=`<div ${attrs} contenteditable="plaintext-only" role="textbox" ${f==='amount'?'inputmode="decimal"':''} data-placeholder="${f==='amount'?'0':'Description'}">${esc(value)}</div>`;
  if(f==='memo')control+=`<div class="inline-cell117 inline-reference117" data-inline-user117="${esc(user.id)}" data-inline-row117="${esc(row.key)}" data-inline-field117="reference" contenteditable="plaintext-only" role="textbox" aria-label="Reference" data-placeholder="Reference (optional)">${esc(row.reference||'')}</div>`;
 }
 return `<td data-label="${esc(label)}">${control}</td>`;
};
const editorBefore=window.openWorkspaceCellEditor;window.openWorkspaceCellEditor=function(u,k,f){const n=document.querySelector(selector(u,k)+`[data-inline-field117="${f==='date'?'transaction_date':f}"]`);if(n){n.focus();return}return editorBefore(u,k,f)};
window.focusWorkspaceInline117=(u,k,f)=>document.querySelector(selector(u,k)+`[data-inline-field117="${f}"]`)?.focus();
const renderBefore=window.renderSubUserWorkspace;
window.renderSubUserWorkspace=function(...args){
 if(document.activeElement?.matches('.inline-cell117,.account-search1428')&&renderedTab===activeSubUserId){deferred=true;return}
 const staff=liveProfile&&liveProfile.role!=='admin'&&!livePermission?.can_approve;
 if(window.workspaceRequest138?.target&&liveProfile){openSubUserTabs=[{key:'user-'+liveProfile.id,userId:liveProfile.id,permanent:false}];activeSubUserId='user-'+liveProfile.id}
 else if(!staff&&liveProfile){
  const users=availableSubUsers(),allowed=new Set(users.map(u=>String(u.id)));
  openSubUserTabs=openSubUserTabs.filter(t=>!t.userId||allowed.has(String(t.userId)));
  if(!openSubUserTabs.some(t=>!t.userId))openSubUserTabs.unshift({key:'default',userId:null,permanent:true});
  for(const u of users)if(!openSubUserTabs.some(t=>String(t.userId)===String(u.id)))openSubUserTabs.push({key:'user-'+u.id,userId:String(u.id),permanent:false});
  openSubUserTabs=openSubUserTabs.filter(t=>t.userId||t.permanent);
  if(!openSubUserTabs.some(t=>t.key===activeSubUserId))activeSubUserId='default';
 }
 const out=renderBefore.apply(this,args);renderedTab=activeSubUserId;deferred=false;
 const tabs=document.getElementById('subUserWorkspaceTabs');
 tabs?.querySelectorAll('.sub-user-browser-tab').forEach((b,i)=>{const tab=openSubUserTabs[i],user=findUser(tab?.userId);b.querySelector('.sub-user-tab-close')?.remove();if(user){const n=b.querySelector('.v62-tab-label,span');if(n){n.textContent=shortName(user);n.dataset.phoneLabel=shortName(user)}b.title=subUserName(user)}});
 tabs?.querySelector('.sub-user-add-tab')?.remove();
 const post=document.querySelector('.v49-desktop-post');if(post){const p=post.querySelector('header p');if(p)p.textContent='Edit directly in each cell. Completed rows save when you leave the row or press Ctrl+Enter.'}
 return out;
};
function update(n){
 if(window.access113&&!access113.can('sub-users-workspace','edit'))return;
 const {inlineUser117:u,inlineRow117:k,inlineField117:f}=n.dataset,row=workspaceRowByKey(u,k),user=findUser(u);if(!row||!user)return;
 const rules=workspaceRules(user);let value=n.matches('input,select')?n.value:n.textContent.trim();
 if(f==='amount'){
  value=parseAppNumber(value);const valid=Number.isFinite(value)&&value>=0;n.setAttribute('aria-invalid',String(!valid));if(!valid){row.amount=NaN;return}
 }
 if(f==='direction'){
  if(!rules.directions.includes(value))return;
  row.direction=value;row.entry_kind=value==='in'?'collection':'payment';row.selected_account_id='';row.account_id='';row.fund_account_id=rules.fundIds.length===1?rules.fundIds[0]:'';
  const account=n.closest('tr').querySelector('[data-inline-field117=account]'),fund=n.closest('tr').querySelector('[data-inline-field117=fund]');
  account.innerHTML='<option value="">Select Account</option>'+(value==='in'?rules.fundIds:rules.entryIds).map(id=>`<option value="${esc(id)}">${esc(accountLabelOnly(id))}</option>`).join('');fund.value=row.fund_account_id;
 }else if(f==='account'){
  if(value&&!(row.direction==='in'?rules.fundIds:rules.entryIds).includes(value))return;
  row.selected_account_id=value;if(row.direction==='in'){row.fund_account_id=value;n.closest('tr').querySelector('[data-inline-field117=fund]').value=value}else row.account_id=value;
 }else if(f==='fund'){
  if(value&&!rules.fundIds.includes(value))return;row.fund_account_id=value;
  if(row.direction==='in'){row.selected_account_id=value;n.closest('tr').querySelector('[data-inline-field117=account]').value=value}
 }else if(f==='transaction_date'){const period=wsPeriod[u]||new Date().toISOString().slice(0,7);if(value.slice(0,7)!==period){n.value=row.transaction_date;showCenterStatus('Use a date inside the current workspace period.',true);return}row.transaction_date=value}else row[f]=value;
 if(!row.isNew){workspaceRowEdits[u]??={};workspaceRowEdits[u][row.id]=row}
 dirty.add(rowToken(u,k));
}
async function commit(u,k){
 if(window.access113&&!access113.can('sub-users-workspace','edit'))return;
 const token=rowToken(u,k);if(!dirty.has(token)||inFlight.has(token))return;
 const user=findUser(u),row=workspaceRowByKey(u,k);if(!user||!row)return;
 const rules=workspaceRules(user),account=row.selected_account_id||(row.direction==='in'?row.fund_account_id:row.account_id);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(row.transaction_date||'')||!rules.directions.includes(row.direction)||!account||!row.memo?.trim()||!Number.isFinite(Number(row.amount))||Number(row.amount)<=0||!rules.fundIds.includes(row.fund_account_id))return;
 if(!(row.direction==='in'?rules.fundIds:rules.entryIds).includes(account))return;
 row.selected_account_id=account;inFlight.add(token);saving++;
 const tr=document.querySelector(selector(u,k))?.closest('tr');if(tr){tr.dataset.saving117='1';tr.querySelectorAll('input,select').forEach(n=>n.disabled=true);tr.querySelectorAll('[contenteditable]').forEach(n=>n.contentEditable='false')}
 try{await persistWorkspaceSingleRow(user,row,rules);if(row.isNew?!pendingRowsFor(u).some(r=>r.key===k):!workspaceRowEdits[u]?.[row.id])dirty.delete(token)}
 catch(error){showCenterStatus('Entry save failed: '+error.message,true)}
 finally{inFlight.delete(token);saving--;if(tr?.isConnected){delete tr.dataset.saving117;tr.querySelectorAll('input,select').forEach(n=>n.disabled=false);tr.querySelectorAll('[role=textbox]').forEach(n=>n.contentEditable='plaintext-only')}if(!document.activeElement?.matches('.inline-cell117,.account-search1428'))renderSubUserWorkspace()}
}
document.addEventListener('input',e=>{if(e.target.matches('.inline-cell117:not(select)'))update(e.target)});
document.addEventListener('change',e=>{if(e.target.matches('select.inline-cell117'))update(e.target)});
document.addEventListener('focusout',e=>{const n=window.dropdown1434?.source(e.target)||e.target;if(!n.matches('.inline-cell117,.account-search1428'))return;const {inlineUser117:u,inlineRow117:k}=n.dataset;setTimeout(()=>{const next=document.activeElement;if(next?.matches(selector(u,k)))return;commit(u,k);if(deferred&&!saving&&!next?.matches('.inline-cell117,.account-search1428'))renderSubUserWorkspace()},0)});
document.addEventListener('keydown',e=>{const n=e.target;if(!n.matches('.inline-cell117,.account-search1428'))return;if(e.key==='Enter'&&(e.ctrlKey||e.metaKey||n.dataset.inlineField117==='amount')){e.preventDefault();n.blur();commit(n.dataset.inlineUser117,n.dataset.inlineRow117)}});
function tablet(){const touch=navigator.maxTouchPoints>1||matchMedia('(pointer:coarse)').matches;const isTablet=touch&&Math.min(screen.width,screen.height)>=600&&Math.min(innerWidth,innerHeight)>=600;document.body.classList.toggle('tablet117',isTablet);document.body.classList.toggle('tablet-portrait117',isTablet&&innerHeight>innerWidth);const guard=document.getElementById('landscape117');if(guard)guard.setAttribute('aria-hidden',String(!(isTablet&&innerHeight>innerWidth)))}
function ready(){const guard=document.createElement('section');guard.id='landscape117';guard.setAttribute('role','status');guard.innerHTML='<div><svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><rect x="9" y="22" width="62" height="40" rx="5"/><path d="M20 13A28 28 0 0 1 60 13M52 4l9 9-12 3"/><circle cx="64" cy="42" r="1"/></svg><h2>Rotate to landscape</h2><p>Turn your tablet sideways to use Oon Jai Accounting. The wider view keeps your tables and controls together.</p></div>';document.body.append(guard);tablet();window.addEventListener('resize',tablet);window.addEventListener('orientationchange',tablet);renderSubUserWorkspace()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
