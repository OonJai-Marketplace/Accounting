const fs=require('fs'),path=require('path');
module.exports=async function(page,base,role){
await require('./cold-fixture14241.cjs')(page);
await page.route('**/*',route=>{const u=route.request().url();if(u.includes('assets/vendor/supabase.js'))return route.fulfill({contentType:'text/javascript',body:'window.supabase={createClient:()=>window.__db14231};'});if(u.startsWith(base))return route.continue();return route.abort()});
await page.goto(base+'/index.html',{waitUntil:'load'});
await page.evaluate(role=>{
 const f=__fixture,idx=role==='admin'?0:role==='manager'?1:3,me=f.profiles[idx];
 if(role==='manager')me.user_permissions.module_actions113={'sub-users-workspace':['view','edit'],'sub-users-home14229':['view'],'user-entry-review':['view','approve']};
 if(role==='staff')me.user_permissions.module_actions113={'sub-users-workspace':['view','edit']};
 Object.assign(me.user_permissions,{modules:role==='admin'?[]:['sub-users'],can_post_directly:role==='admin',can_approve:role!=='staff',can_export:role==='admin',can_void:role==='admin'});liveProfile=me;livePermission=me.user_permissions;liveProfiles=f.profiles;ojmDb=__db14231;window.ojmDb=ojmDb;
 DemoAccess.currentUser={...me,name:me.full_name,active:true};AccountingStore.accounts=f.accounts;CurrencyStore.currencies=f.tables.currencies;
 document.getElementById('loginGate').classList.add('is-authenticated');document.documentElement.classList.remove('session-checking1444');permissions1441.verified=true;
 window.__scenario='normal';const rpc=ojmDb.rpc;ojmDb.rpc=async(n,p)=>{
  if(n==='current_access14228'){if(__scenario==='access-fails')return {data:null,status:503,error:{message:'Temporary service failure',status:503}};if(__scenario==='access-denied')return {data:null,status:403,error:{code:'42501',message:'Revoked access'}};return {data:{profile:structuredClone(liveProfile),permissions:structuredClone(livePermission)},error:null};}
  if(__scenario==='home-fails'&&n==='branch_home14229')return {data:null,status:503,error:{message:'Temporary summary failure',status:503}};
  if(__scenario==='directory-fails'&&n==='review_directory14229')return {data:null,status:503,error:{message:'Temporary directory failure',status:503}};
  if(n==='review_inbox14229')return {data:structuredClone(window.__matrixReports||[]),error:null};
  return rpc(n,p);
 };
 window.__matrixReports=f.profiles.slice(1).map((u,i)=>({id:'report-'+i,owner_id:u.id,period_start:'2026-10-01',status:'draft',lines:[{id:'line-'+i,staff_journal_id:'report-'+i,transaction_date:'2026-10-01',memo:'Complete loaded record',amount:100,currency_code:f.accounts[i].currency,direction:'out',fund_account_id:f.accounts[i].id,account_id:f.accounts[3].id}]}));
 reviewStaffJournals=structuredClone(__matrixReports);applyLiveRoleAccess();
 },role);
await page.waitForTimeout(150);
};
