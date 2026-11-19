const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom'),fixture=require('./payroll-lifecycle-fixture277.cjs');
async function main(){
 const c={ApplicationSettings:{payroll:{}},beforeEmployment234:()=>false,mark:a=>a.mark,window:{hrCalendar14306:{day:d=>({fraction:d.endsWith('01')?.5:1})}}};
 vm.createContext(c);vm.runInContext(fs.readFileSync('src/bridges/hr-payroll/attendance-v96/approved-leave-and-days.js','utf8'),c);
 const leave={from:'2026-10-01',to:'2026-10-02',days:1.5,dayFractions:[1,.5]},row={employee:{},input:{attendance:[{date:leave.from,mark:'EX'}]}};
 assert.equal(c.remainingLeave105({},row,leave),.5);delete leave.dayFractions;assert.equal(c.remainingLeave105({},row,leave),1);
 const dom=new JSDOM(fixture.html,{url:'https://fixture.test',runScripts:'dangerously',pretendToBeVisual:true}),w=dom.window;
 try{
  w.eval('('+fixture.baseSetup.toString()+')();('+fixture.setup.toString()+')();');fixture.scripts().forEach(s=>w.eval(s));
  const wait=()=>new Promise(r=>setTimeout(r,30));await wait();
  const data={month:w.Work82.run.month,employeeId:w.Work82.run.rows[0].employeeId,status:'approved',paid:'no',days:.5};
  w.ui117.confirm=async()=>{w.Work82.leaves.push({id:'leave-test',data});return true};
  await w.saveRun82(true);assert.equal(w.Work82.run.status,'draft');assert.match(w.document.getElementById('qa-status').textContent,/Approved leave or the work calendar changed/);
  w.ui117.confirm=async()=>true;let reads=0;w.hrCalendar14306.snapshot=()=>({settings:{},events:[],capturedAt:String(++reads)});
  await w.saveRun82(true);assert.equal(w.Work82.run.status,'finalized');assert.equal(w.Work82.run.leaveSnapshot[0].days,.5);
 }finally{dom.window.close()}
 console.log('PASS approved and legacy day fractions, concurrent approval, captured calendar timestamp and successful retry.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
