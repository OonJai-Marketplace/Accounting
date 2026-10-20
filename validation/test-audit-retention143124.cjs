const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{
 let policy='protected',deletes=0,confirms=0,refreshes=0,message='';
 const c={console,document:{readyState:'loading',addEventListener(){}},liveProfile:{id:'admin',role:'admin'},escapeHtml:String,formatAppDate:String,auditRecordId:x=>x.id,showCenterStatus:m=>message=m,ui108:{confirm:async()=>{confirms++;return true}},loadTransactionAudit:async()=>{refreshes++},entryNumber14257:{refresh:async()=>{}},ojmDb:{rpc:async(name)=>{if(name==='audit_delete_permissions143124')return {data:[{id:'1',policy}]};if(name==='delete_one_audit1437'){deletes++;return {data:{deleted:2}}}throw Error('unexpected RPC '+name)}}};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(root+'/src/core/auth/workflows1434.js','utf8'),c);
 await c.deleteAuditRecord1434({id:'1',action:'VOID'});assert.equal(deletes,0);assert.equal(confirms,0);assert.match(message,/Protected/);
 policy='green';await c.deleteAuditRecord1434({id:'1',action:'POST'});assert.equal(deletes,1);assert.equal(confirms,1);
 policy='latest';await c.deleteAuditRecord1434({id:'1',action:'VOID'});assert.equal(deletes,2);assert.equal(confirms,2);assert.equal(refreshes,2);
 policy='protected';await c.deleteAuditRecord1434({id:'1',deletePolicy143124:'latest'});assert.equal(deletes,2,'must use current DB permission, not stale allowed UI');
 policy='latest_active';await c.deleteAuditRecord1434({id:'1',action:'UPDATE'});assert.equal(deletes,3);assert.equal(confirms,3);
 console.log('PASS protected audit never deletes; green and latest exception delete; stale permission cannot authorize deletion');
 const source=fs.readFileSync(root+'/src/bookkeeping/history/transactions-v98/audit-view.js','utf8');vm.runInContext(source.slice(0,source.indexOf('  const auditGroups14361'))+';globalThis.classify=auditKind14361',c);
 assert.equal(c.classify({action:'POST',deletePolicy143124:'green'}).tier,'green');assert.equal(c.classify({action:'VOID',deletePolicy143124:'latest'}).tier,'red');assert.equal(c.classify({action:'UPDATE',deletePolicy143124:'protected'}).tier,'orange');assert.equal(c.classify({action:'DELETE_HISTORY_REFERENCE',deletePolicy143124:'protected'}).tier,'red');
 console.log('PASS green/ orange/ red presentation and latest red exception');
})().catch(e=>{console.error(e);process.exitCode=1});
