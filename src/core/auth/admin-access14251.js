/* Administrator role policy. Server authorization remains authoritative. */
(()=>{'use strict';
const actions=['view','edit','export','approve','post','void'];
const validId=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const postingAccounts=()=> (AccountingStore.accounts||[]).filter(a=>a&&a.active!==false&&a.isActive!==false&&a.is_active!==false&&a.isPosting!==false&&a.is_posting!==false);
const accounts=()=>postingAccounts().filter(a=>validId(a.id));
const ids=()=>[...new Set(accounts().map(a=>a.id))];
// Startup/demo chart rows have codes, but no database IDs. Never save partial grants.
const chartReady=()=>postingAccounts().length>0&&postingAccounts().every(a=>validId(a.id));
const modules=()=>APP_PERMISSION_TREE.flatMap(p=>p.children.map(([id])=>p.id+':'+id));
const matrix=()=>Object.fromEntries(APP_PERMISSION_TREE.flatMap(p=>p.children.map(([id])=>[id,[...actions]])));
const isAdmin=u=>u?.role==='admin'&&(!u.status||u.status==='active');
const editorAdmin=()=>document.getElementById('userAccessType')?.value==='admin';
const pending=new Map();let lastError='';
function effective(user,base={}){if(!isAdmin(user))return base;const all=ids();return {...base,job_title:base.job_title??user.user_permissions?.job_title??'',user_id:user.id,user_type:'admin',modules:modules(),module_actions113:matrix(),can_approve:true,can_post_directly:true,can_void:true,can_export:true,can_manage_data:true,allow_any_account:true,assigned_fund_account_ids:all,allowed_account_ids:all,destination_account_ids:all,allowed_directions:['out','in'],allow_multiple_funds:true};}
function complete(p){const all=ids();return all.length&&['can_approve','can_post_directly','can_void','can_export','can_manage_data'].every(k=>p[k]===true)&&['assigned_fund_account_ids','destination_account_ids'].every(k=>all.every(id=>(p[k]||[]).includes(id)))&&p.allow_multiple_funds===true&&['in','out'].every(d=>(p.allowed_directions||[]).includes(d));}
async function sync(owner){
 const actor=liveProfile,session=window.PhoneApp132?.session();if(!isAdmin(actor)||!validId(owner)||!chartReady()||owner!==actor.id||navigator.onLine===false||window.permissions1441?.verified===false||!ojmDb)return;
 const user=owner===actor.id?actor:(liveProfiles||[]).find(u=>u.id===owner);if(!isAdmin(user)||!ids().length)return;
 const base=owner===actor.id?livePermission||{}:user.user_permissions||{};if(complete(base))return;if(pending.has(owner))return pending.get(owner);
 const task=(async()=>{let title=base.job_title??user.user_permissions?.job_title;if(title==null){const saved=await ojmDb.from('user_permissions').select('job_title').eq('user_id',owner).maybeSingle();if(saved.error)throw Error(saved.error.message);title=saved.data?.job_title??'';}const p=effective(user,{...base,job_title:title,fund_allocations:base.fund_allocations||[],entry_prefix:base.entry_prefix||'SJR',entry_initials:base.entry_initials||workspaceUserInitials(user),entry_digits:base.entry_digits||4});
  const request=ojmDb.rpc('admin_save_access1441',{p_user:owner,p_name:user.full_name,p_role:'admin',p_permissions:p});
  let timer;const result=await Promise.race([request,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Administrator account access could not finish syncing. Please reconnect and retry.')),12000)})]).finally(()=>clearTimeout(timer));
  if(result.error)throw Error(result.error.message);if(result.data?.user_id!==owner||result.data?.saved!==true)throw Error('Administrator account access was not confirmed by the server.');
  if(liveProfile?.id!==actor.id||!isAdmin(liveProfile)||window.PhoneApp132?.session()!==session)return;
  if(owner===actor.id)livePermission={...p};const stored=liveProfiles.find(u=>u.id===owner);if(stored)stored.user_permissions={...p};
  lastError='';window.PhoneApp132?.loadWorkspace(owner,true).catch(()=>{});
 })().finally(()=>pending.delete(owner));pending.set(owner,task);return task;
}
const remembered=new WeakMap();
function editorPolicy(){
 const type=document.getElementById('userAccessType');if(!type||!document.getElementById('modalUserAccess')?.classList.contains('active'))return;
 const admin=editorAdmin(),controls=document.querySelectorAll('#userPermissionGrid input,#userFundAccountGrid input,#userAccountAccessGrid input,#permissionMultipleFunds,#permissionApprove,#permissionDirectPost,#permissionVoid,#permissionExport,#permissionManageData,#permissionAllowIn,#permissionAllowOut,#userTransactionActivity');
 for(const n of controls){if(admin){if(!remembered.has(n))remembered.set(n,{checked:n.checked,disabled:n.disabled,type:n.type,name:n.getAttribute('name'),value:n.value});if(n.tagName==='SELECT')n.value='both';else{if(n.type==='radio'){n.type='checkbox';n.removeAttribute('name')}n.checked=n.closest('#userFundAccountGrid,#userAccountAccessGrid')?validId(n.value):true;n.indeterminate=false;}n.disabled=true;}else if(remembered.has(n)){const old=remembered.get(n);n.disabled=old.disabled;if(n.tagName==='SELECT')n.value=old.value;else{n.type=old.type;n.checked=old.checked;if(old.name!==null)n.setAttribute('name',old.name);else n.removeAttribute('name');}remembered.delete(n);}}
 let notice=document.getElementById('adminRoleNotice14251');if(!notice){notice=document.createElement('p');notice.id='adminRoleNotice14251';notice.className='settings-compact-note';type.closest('.settings-field')?.after(notice);}notice.hidden=!admin;if(admin&&notice.textContent!=='Administrator: all modules and all active posting accounts are available automatically.')notice.textContent='Administrator: all modules and all active posting accounts are available automatically.';
 if(admin)for(const id of ['userModuleAccessSummary','userAccountAssignmentSummary']){const n=document.getElementById(id);if(n&&n.textContent!=='All access · Administrator')n.textContent='All access · Administrator';}
}
function ready(){
 const rules=window.workspaceRules;window.workspaceRules=function(user){const r=rules(user);if(!isAdmin(user))return r;const p=effective(user,r.permission);return {...r,administrator:true,permission:p,fundIds:p.assigned_fund_account_ids,entryIds:p.destination_account_ids,directions:p.allowed_directions,multiple:true};};
 const value=access113.editorValue,list=access113.editorModules,can=access113.editorCan;
 access113.editorValue=()=>editorAdmin()?matrix():value();access113.editorModules=()=>editorAdmin()?modules():list();access113.editorCan=(...args)=>editorAdmin()?true:can(...args);
 const open=window.openUserAccessEditor;window.openUserAccessEditor=function(id=''){for(const n of document.querySelectorAll('#modalUserAccess input,#modalUserAccess select,#modalAccessPicker input,#modalAccessPicker select')){const old=remembered.get(n);if(!old)continue;n.disabled=old.disabled;if(n.tagName==='SELECT')n.value=old.value;else{n.type=old.type;n.checked=old.checked;if(old.name!==null)n.setAttribute('name',old.name);else n.removeAttribute('name');}remembered.delete(n);}open(id);const user=liveProfiles.find(u=>u.id===id);if(isAdmin(user))document.getElementById('userAccessType').value='admin';editorPolicy();};
 const summary=window.updateUserAccessSummaries;window.updateUserAccessSummaries=function(...args){summary(...args);editorPolicy();};
 document.getElementById('userAccessType')?.addEventListener('change',editorPolicy);
 const save=window.saveUserAccess;window.saveUserAccess=async function(...args){if(editorAdmin()&&!chartReady()){args[0]?.preventDefault();showCenterStatus('Accounts are still loading. Please try saving again when they finish.',true);return;}editorPolicy();const result=await save.apply(this,args);if(!document.getElementById('modalUserAccess')?.classList.contains('active'))await permissions1441.verify();return result;};
 const staff=window.staffSave14228;window.staffSave14228=async function(payload){await sync(payload.p_owner);return staff(payload);};
 const pulse=()=>{if(document.hidden||document.getElementById('modalUserAccess')?.classList.contains('active')||!isAdmin(liveProfile)||!livePermission||!document.getElementById('loginGate')?.classList.contains('is-authenticated'))return;sync(liveProfile.id).catch(e=>{if(lastError!==e.message){lastError=e.message;showCenterStatus(e.message,true);}});};
 window.adminAccess14251={effective,sync,editorPolicy};setInterval(pulse,15000);window.addEventListener('focus',pulse);window.addEventListener('online',pulse);setTimeout(pulse,1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();

