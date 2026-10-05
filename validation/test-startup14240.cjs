const vm=require('vm'),fs=require('fs'),assert=require('assert/strict');
(async()=>{
const classes=new Set(),children=new Map(),box={hidden:true,classList:{toggle(){}},querySelector(s){if(!children.has(s))children.set(s,{classList:{toggle(){}}});return children.get(s)}};
const document={readyState:'complete',body:{classList:{toggle(n,v){v?classes.add(n):classes.delete(n)},contains:n=>classes.has(n)},append(){}},getElementById:()=>box};
let releaseLegal;const legal=new Promise(r=>releaseLegal=r),done=async()=>{};
const context={document,liveProfile:{id:'actor'},Location69:{view:'dashboard'},loadReferenceDataFromSupabase:done,loadJournalFromSupabase:done,loadBusinessSettingsFromSupabase:done,loadSubmissionsFromSupabase:done,loadProfilesFromSupabase:done,loadLegalDocumentsFromSupabase:()=>legal,showCenterStatus(){},setTimeout,clearTimeout};
context.window=context;context.workflowReady1443=Promise.resolve();context.switchTab=view=>context.Location69.view=view;vm.createContext(context);vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../scripts/startup1443.js'),'utf8'),context);
await context.startupData1443(()=>{});assert(!classes.size);context.switchTab('journal');await new Promise(setImmediate);assert(!classes.size,'Unrelated legal loading must not hide journal');context.switchTab('settings-business');assert(classes.has('startup-pending1443'));context.switchTab('dashboard');assert(!classes.size,'Returning to loaded tab must remove blocker');releaseLegal();await new Promise(setImmediate);assert(!classes.size);console.log('PASS Unrelated background loads do not block tab navigation; selected data stays gated');
})().catch(e=>{console.error(e);process.exitCode=1});
