import test from 'node:test';
import assert from 'node:assert/strict';
import {receiptStatus226} from '../supabase/functions/scanner-integration/receipt-status226.mjs';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
function client(tables,fail=false){
 const calls=[];
 return {calls,from(table){
  let filters=[],start=0,end=499,fields='';const q={
   select(value){fields=value;assert(!/pages|pdf|owner/.test(value),'status does not read images or storage locations');return q},
   in(k,v){filters.push(r=>v.includes(r[k]));return q},is(k,v){filters.push(r=>(r[k]??null)===v);return q},
   or(value){assert(!/[^a-z0-9_,.{}-]/i.test(value));const clauses=[...value.matchAll(/(journal_ids|staff_line_ids)\.ov\.\{([^}]*)\}/g)].map(m=>[m[1],m[2].split(',')]);filters.push(r=>clauses.some(([k,ids])=>(r[k]||[]).some(x=>ids.includes(x))));return q},
   order(){return q},range(a,b){start=a;end=b;return q},
   then(resolve,reject){calls.push({table,fields,start});return Promise.resolve(fail?{error:{message:'Offline'}}:{data:(tables[table]||[]).filter(r=>r.readable!==false&&filters.every(f=>f(r))).slice(start,end+1).map(r=>Object.fromEntries(fields.split(',').map(k=>[k,r[k]])))}).then(resolve,reject)}
  };return q;
 }};
}
test('direct, inherited and sibling receipts; missing, unresolved and reused identities',async()=>{
 const user=client({
  journal_entries:[{id:id(1),entry_no:'DIRECT'},{id:id(2),entry_no:'INHERITED'},{id:id(3),entry_no:'MISSING'},{id:id(4),entry_no:'REUSED'},{id:id(5),entry_no:'DENIED',readable:false}],
  staff_journal_lines:[{id:id(11),staff_journal_id:id(50),workspace_entry_no:'STAFF-1',journal_entry_id:id(2)},{id:id(12),staff_journal_id:id(50),workspace_entry_no:'STAFF-1',journal_entry_id:id(2)},{id:id(13),staff_journal_id:id(51),workspace_entry_no:'STAFF-1',journal_entry_id:null}],
  scanner_documents208:[{id:id(80),journal_ids:[id(1)],staff_line_ids:[]},{id:id(81),journal_ids:[],staff_line_ids:[id(12)]},{id:id(82),journal_ids:[id(3)],superseded_by218:id(83)},{id:id(84),journal_ids:[id(99)]},{id:id(85),journal_ids:[id(3)],readable:false}]
 });
 const result=await receiptStatus226(user,{entries:['DIRECT','INHERITED','MISSING','REUSED','DENIED','UNSAVED'],staffLines:[id(11),id(13),id(14)]});
 assert.deepEqual(result.entries.map(r=>r.hasDocuments),[true,true,false,false,null,null]);
 assert.deepEqual(result.staffLines.map(r=>r.hasDocuments),[true,false,null]);
 assert.equal(JSON.stringify(result).includes(id(12)),false,'linked source IDs are not disclosed');
 assert(user.calls.length<=5,'one page of IDs uses a few batch reads');
});
test('complete pagination and bounded document queries include later sibling lines',async()=>{
 const staff=Array.from({length:501},(_,i)=>({id:id(1000+i),staff_journal_id:id(50),workspace_entry_no:'STAFF-1'}));
 const user=client({staff_journal_lines:staff,scanner_documents208:[{id:id(90),staff_line_ids:[id(1500)]}]});
 const result=await receiptStatus226(user,{staffLines:[id(1000)]});
 assert.equal(result.staffLines[0].hasDocuments,true);
 assert(user.calls.some(c=>c.table==='staff_journal_lines'&&c.start===500));
 assert.equal(user.calls.filter(c=>c.table==='scanner_documents208').length,6);
});
test('errors and invalid requests cannot masquerade as no documents',async()=>{
 await assert.rejects(()=>receiptStatus226(client({},true),{entries:['ID']}),/Offline/);
 await assert.rejects(()=>receiptStatus226(client({}),{entries:Array(101).fill('ID')}),/100/);
 await assert.rejects(()=>receiptStatus226(client({}),{staffLines:['not-a-uuid']}),/Invalid/);
 assert.deepEqual(await receiptStatus226(client({}),{}),{entries:[],staffLines:[]});
});
