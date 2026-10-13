function call(fn){try{const result=fn();if(result?.then)result.catch(e=>parent.showCenterStatus(e.message,true));setTimeout(()=>refresh(),250);return result}catch(e){parent.showCenterStatus(e.message,true)}}
let workspaceOpen14238=0,navigationPending14285=false,phoneLayoutReady14285=false;
const positionKey14285=()=>[S.module,S.user||'home',S.page].join(':');
function samePhoneLocation14285(){return renderedLocation14250?.session===A.session()&&renderedLocation14250.module===S.module&&renderedLocation14250.page===S.page&&String(renderedLocation14250.user)===String(S.user)}
function rememberPhonePosition14285(){
 if(!phoneDrafts1427.ui||!samePhoneLocation14285())return;
 const ui=phoneDrafts1427.ui,types=document.querySelector('main.screen:not(.hidden) .account-types14253');
 const tabs=$('phoneUserTabs14236'),prior=ui.positions[positionKey14285()]||{};
 // During reload/backgrounding an iframe can lose its layout before pagehide.
 // Keep the last visible position instead of recording a collapsed strip as zero.
 if(tabs?.clientWidth>0)ui.userTabs=tabs.scrollLeft;
 ui.positions[positionKey14285()]={y:document.documentElement.clientWidth>0?scrollY:prior.y||0,types:types?.clientWidth>0?types.scrollLeft:prior.types||0};
 if(S.user)ui.accounts[S.user]=S.accountType14253||'';
 const team=$('phoneTeam14227')?._team14227;if(team)ui.team={...team.state};
}
function restorePhonePosition14285(root){
 const ui=phoneDrafts1427.ui||{},position=ui.positions?.[positionKey14285()]||{};
 if($('phoneUserTabs14236'))$('phoneUserTabs14236').scrollLeft=ui.userTabs||0;
 const types=root.querySelector('.account-types14253');if(types)types.scrollLeft=position.types||0;
 window.scrollTo(0,position.y||0);
}
let positionTimer14285;document.addEventListener('scroll',()=>{clearTimeout(positionTimer14285);positionTimer14285=setTimeout(()=>persistPhoneDraft1427(),120)},{capture:true,passive:true});
function phoneLoading14285(show,message='Loading this workspace…',retry){
 let box=$('phoneLoading14285');if(!box){box=document.createElement('section');box.id='phoneLoading14285';box.className='phone-loading14285';box.setAttribute('role','status');box.innerHTML='<span class="loading-orbit14285" aria-hidden="true">'+Array.from({length:6},(_,i)=>'<i style="--i:'+i+'"><b></b></i>').join('')+'</span><p></p><button class="btn" type="button" hidden>Try again</button>';document.body.append(box)}
 box.hidden=!show;box.querySelector('p').textContent=message;box.querySelector('.loading-orbit14285').hidden=!!retry;const button=box.querySelector('button');button.hidden=!retry;button.onclick=retry||null;document.querySelector('.app').inert=show;document.querySelector('.app').setAttribute('aria-busy',String(show));
}
async function navigate(module,page='home',capture=true,restore=false){
 const opening=++workspaceOpen14238,who=A.session();window.PhoneAccountPicker14227?.close(false,false);closeAccount1424();closeConnection14248();$('workspaceNotice14236')?.remove();
 if(capture)capturePhoneDraft1427();
 const before={module:S.module,page:S.page,user:S.user};S.module=module;S.page=page;if(module==='subusers'&&!A.allowed('sub-users-workspace')&&A.teamHomeAllowed())S.user=null;
 if(module==='subusers'&&!S.user&&A.profile()?.role!=='admin'&&!A.teamHomeAllowed())S.user=A.profile().id;
 if(!pageAllowed1441()){Object.assign(S,before);parent.showCenterStatus('This area is not included in your permissions.',true);return false;}
 if(!restore){S.search='';S.ledgerAccount14248=null;}S.entryLimit14237=30;last='';
 persistPhoneDraft1427();navigationPending14285=true;
 const target=module==='subusers'&&!S.user?'sub-users-home14229':module==='settings'?'settings-users':'sub-users-workspace';
 const needsLoad=module==='subusers'&&(!S.user||!A.workspaceState(S.user).loaded);
 if(needsLoad)phoneLoading14285(true);
 try{
  if(module==='subusers'){if(S.user)await A.loadWorkspace(S.user);else if(A.teamHomeAllowed())await A.loadHome();}
  if(who!==A.session()||opening!==workspaceOpen14238)return false;
  navigationPending14285=false;phoneLoading14285(false);
  if(!render())return false;
  if(restore&&S.page==='accounts'&&S.ledgerAccount14248)loadLedger14248();
  if(module==='settings'&&A.allowed(target))A.navigate(target);
  return true;
 }catch(e){
  if(who!==A.session()||opening!==workspaceOpen14238)return false;
  navigationPending14285=false;phoneLoading14285(false);render();
  workspaceNotice14236('Unable to load this workspace. '+(e.message||'Please reconnect.'),()=>navigate(module,page,false,true));return false;
 }
}
const modulePages={dashboard:[['home','dashboard']],transactions:[['journal','journal'],['history','transactions-all'],['review','user-entry-review'],['upcoming','transactions-recurring'],['closing','period-review'],['audit','transactions-voided']],accounts:[['ledger','sec-general-ledger'],['trial','trial-balance'],['balances','account-balances'],['chart','sec-chart-accounts']],subusers:[['home','sub-users-workspace'],['home','sub-users-home14229']],settings:[['home','settings-users']]};
const firstModulePage=m=>['subusers','settings'].includes(m)&&modulePages[m]?.find(([,target])=>A.allowed(target))?.[0];
window.switchModule=m=>{toggleDrawer(false);if(m==='subusers'&&!A.allowed('sub-users-workspace')&&A.teamHomeAllowed())S.user=null;const page=firstModulePage(m);if(page)navigate(m,page)};
window.settingsGo=p=>navigate('settings',p==='access'?'users':p);window.dashGo=p=>navigate('dashboard',p);window.txGo=p=>navigate('transactions',p);window.accGo=p=>navigate('accounts',p);window.go=p=>navigate('subusers',p);
window.chooseWorkspace=async id=>{
 capturePhoneDraft1427();
 if(id==='home'&&!A.teamHomeAllowed())return;
 const who=A.session(),opening=++workspaceOpen14238;phoneLoading14285(true,'Opening workspace…');
 try{
  if(id!=='home'&&!A.users().some(u=>String(u.id)===String(id)))await A.ensureUser(id);
  if(who!==A.session()||opening!==workspaceOpen14238)return;
  S.user=id==='home'?null:String(id);const draft=phoneDrafts1427.staff[S.user];S.staffDraft=draft?.data||null;S.editingStaff=!!draft?.editing;S.accountType14253=phoneDrafts1427.ui?.accounts?.[S.user]||'';S.page='home';
  document.getElementById('workspaceNotice14236')?.remove();await navigate('subusers','home',false);
 }catch(e){if(who===A.session()&&opening===workspaceOpen14238){phoneLoading14285(false);workspaceNotice14236('Unable to open this workspace. '+(e.message||'Please try again.'),id)}}
};
function workspaceNotice14236(message,retry){
 document.getElementById('workspaceNotice14236')?.remove();const box=document.createElement('div');box.id='workspaceNotice14236';box.className='card';box.setAttribute('role',retry?'alert':'status');box.textContent=message;
 if(retry){const b=document.createElement('button');b.type='button';b.className='btn';b.textContent='Try again';b.onclick=typeof retry==='function'?retry:()=>chooseWorkspace(retry);box.append(b);}
 document.querySelector('main.screen:not(.hidden)')?.prepend(box);
}
function workspaceTabs14236(){
 let tabs=$('phoneUserTabs14236');if(!tabs){tabs=document.createElement('nav');tabs.id='phoneUserTabs14236';tabs.setAttribute('aria-label','Sub-user workspaces');document.querySelector('.top').after(tabs);tabs.addEventListener('click',e=>{const b=e.target.closest('[data-phone-user14236]');if(b)chooseWorkspace(b.dataset.phoneUser14236);});}
 tabs.hidden=S.module!=='subusers'||A.profile()?.role!=='admin';if(tabs.hidden)return;
 const label=u=>{const parts=String(u.full_name||u.name||u.email||'User').trim().split(/\s+/);return parts.length>1?parts[0][0]+'. '+parts.at(-1):parts[0];};
 const items=[...(A.teamHomeAllowed()?[{id:'home',text:'Home',name:'Sub-users Home'}]:[]),...A.workspaceUsers().filter(u=>u.can_open!==false&&A.allowed('sub-users-workspace')).map(u=>({id:String(u.id),text:label(u),name:'Open '+(u.full_name||u.name||u.email||'User')+' workspace'}))];
 const left=tabs.scrollLeft,existing=new Map([...tabs.children].map(n=>[n.dataset.phoneUser14236,n]));
 items.forEach((item,index)=>{let button=existing.get(item.id);if(!button){button=document.createElement('button');button.type='button';button.dataset.phoneUser14236=item.id;}if(button.textContent!==item.text)button.textContent=item.text;button.setAttribute('aria-label',item.name);if(String(S.user||'home')===item.id)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');if(tabs.children[index]!==button)tabs.insertBefore(button,tabs.children[index]||null);existing.delete(item.id)});
 for(const button of existing.values())button.remove();tabs.scrollLeft=left;
}

window.toggleDrawer=force=>{const open=force===undefined?!$('drawerBackdrop').classList.contains('open'):force;$('drawerBackdrop').classList.toggle('open',open);document.querySelector('.brand')?.setAttribute('aria-expanded',String(open));if(open)$('drawerBackdrop').querySelector('button:not([hidden])')?.focus({preventScroll:true});else document.querySelector('.brand')?.focus({preventScroll:true})};

function nav(){workspaceTabs14236();const me=A.profile();if(!$('menuDocuments1443')){const b=document.createElement('button');b.id='menuDocuments1443';b.innerHTML=icon('file')+' Document Editor';b.onclick=()=>{toggleDrawer(false);A.documents()};$('menuSettings').before(b);}const tabs=$('workspaceTabs');tabs.querySelectorAll('[data-workspace]').forEach(n=>n.remove());tabs.classList.toggle('hidden',S.module!=='accounts');document.body.dataset.module=S.module;document.body.dataset.teamMain=String(S.module==='subusers'&&!S.user);
['transactionTabLabel','dashboardTabLabel','accountsTabLabel','settingsTabLabel'].forEach((id,i)=>$(id).classList.add('hidden'));document.querySelectorAll('nav.bottom').forEach(n=>n.classList.add('hidden'));const target=S.module==='settings'?$('settingsNav'):S.module==='dashboard'?$('dashboardNav'):S.module==='transactions'?$('transactionNav'):S.module==='accounts'?$('accountsNav'):document.querySelector('nav.bottom');target?.classList.remove('hidden');target?.querySelectorAll('button').forEach(b=>b.classList.toggle('active',Object.values(b.dataset).includes(S.page)));document.querySelectorAll('[data-acc-top]').forEach(b=>b.classList.toggle('active',b.dataset.accTop===S.page));
['Dashboard','Transactions','Accounts','Subusers'].forEach((n,i)=>{const b=$('menu'+n);b.classList.toggle('active',S.module===['dashboard','transactions','accounts','subusers'][i]);b.hidden=!firstModulePage(['dashboard','transactions','accounts','subusers'][i])});$('menuSettings').hidden=!firstModulePage('settings')||me?.role!=='admin';$('menuSettings').lastChild.textContent='Sub-user settings';$('menuDocuments1443').hidden=!A.allowed('document-editor105');
 const txTargets={journal:'journal',upcoming:'transactions-recurring',review:'user-entry-review',closing:'period-review',history:'transactions-all',audit:'transactions-voided'},accTargets={ledger:'sec-general-ledger',trial:'trial-balance',balances:'account-balances',chart:'sec-chart-accounts'};
 document.querySelectorAll('[data-tx]').forEach(b=>b.hidden=!A.allowed(txTargets[b.dataset.tx]));
 document.querySelectorAll('[data-acc],[data-acc-top]').forEach(b=>b.hidden=!A.allowed(accTargets[b.dataset.acc||b.dataset.accTop]));
 document.querySelectorAll('[data-go]').forEach(b=>b.hidden=!S.user||!A.allowed('sub-users-workspace'));
 document.querySelectorAll('[data-settings]').forEach(b=>b.hidden=b.dataset.settings!=='profile'&&!A.allowed('settings-users'));
 $('menuSettings').classList.toggle('active',S.module==='settings');const p=document.querySelector('.profile');p.querySelector('b').textContent=me?.full_name||'Account';p.querySelector('small').textContent=me?.role==='admin'?'Administrator':(A.rules(me?.id)?.permission?.job_title||'Staff Member');p.querySelector('.avatar').textContent=(me?.full_name||'').split(' ').map(x=>x[0]).slice(0,2).join('');p.setAttribute('role','button');p.tabIndex=0;p.setAttribute('aria-haspopup','true');p.onclick=toggleAccount1424;p.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleAccount1424()}};}
function closeAccount1424(){document.getElementById('phoneAccount1424')?.remove();document.querySelector('.profile')?.setAttribute('aria-expanded','false')}
function toggleAccount1424(){if(document.getElementById('phoneAccount1424')){closeAccount1424();return}const menu=document.createElement('div');menu.id='phoneAccount1424';menu.className='phone-account1424';menu.setAttribute('aria-label','Account controls');const items=[...(A.profile()?.role==='admin'? [['Sub-users',()=>chooseWorkspace('home')]]:[]),...(A.allowed('sub-users-workspace')?[['Assigned Account Ledger',()=>{S.user=S.user||A.profile().id;const draft=phoneDrafts1427.staff[S.user];S.staffDraft=draft?.data||null;S.editingStaff=!!draft?.editing;return navigate('subusers','ledger')}]]:[]),['My profile',()=>navigate('settings','profile')],['Settings',()=>navigate('settings','home')],['Refresh',()=>{capturePhoneDraft1427();parent.location.reload()}],['Sign out',()=>call(()=>A.logout())]].filter(([label])=>label==='Document Editor'?A.allowed('document-editor105'):label==='Report History'?A.allowed('sub-users-workspace'):label==='Settings'?A.profile()?.role==='admin'&&A.allowed('settings-users'):true);items.forEach(([label,fn])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{closeAccount1424();fn()};menu.append(b)});document.querySelector('.app').append(menu);const bounds=document.querySelector('.app').getBoundingClientRect();menu.style.right=Math.max(12,innerWidth-bounds.right+12)+'px';document.querySelector('.profile').setAttribute('aria-expanded','true');menu.querySelector('button').focus({preventScroll:true})}
document.addEventListener('click',e=>{if(!e.target.closest('.profile,#phoneAccount1424'))closeAccount1424()});document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeAccount1424();document.querySelector('.profile').focus({preventScroll:true})}});
