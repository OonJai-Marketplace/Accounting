const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'../scripts/private-reminders14229.js'),'utf8');
async function login(role){
 const calls=[],notices=[];
 const ctx={
  liveProfile:null,location:{origin:'https://example.test'},
  window:{access113:{can:()=>true},addEventListener:()=>{},resetRecurringForm:()=>{},updateHeaderNotices104:()=>{}},
  document:{readyState:'complete',querySelector:()=>null,getElementById:()=>null},
  RecurringStore:{items:[],pendingReminders:[]},
  renderRecurringTransactions:()=>{},renderRecurringWarnings:()=>{},
  showCenterStatus:message=>notices.push(message),
  ojmDb:{rpc:async name=>{calls.push(name);return {error:{message:'Not permitted'}}}},
  sessionStorage:{getItem:()=>null},
  loadLiveProfile:async()=>{ctx.liveProfile={id:'person-1',role}},
 };
 ctx.window.loadLiveProfile=ctx.loadLiveProfile;
 vm.runInNewContext(source,ctx);
 await ctx.window.loadLiveProfile();
 return {calls,notices};
}
(async()=>{
 const staff=await login('staff');
 assert.deepEqual(staff.calls,[]);
 assert.deepEqual(staff.notices,[]);
 const admin=await login('admin');
 assert.deepEqual(admin.calls,['reminder_load14229']);
 assert.match(admin.notices[0],/Your reminders could not load/);
 console.log('PASS staff login skips administrator reminder load; administrator errors remain visible');
})().catch(e=>{console.error(e);process.exitCode=1});
