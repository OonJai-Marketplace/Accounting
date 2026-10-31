import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {createHash} from 'node:crypto';
import * as core from '../supabase/functions/accounting-sheet-archive/core.mjs';
import * as formulas from '../supabase/functions/accounting-sheet-archive/formulas.mjs';
const hash=async s=>createHash('sha256').update(s).digest('hex');
const tables={accounts:[{id:'a',code:'1000',name:'Cash',currency_code:'LAK',account_type:'ASSET',account_purpose:'regular'}],journal_entries:[{id:'e',entry_no:'TEST-2025',transaction_date:'2025-01-01',status:'posted'}],journal_lines:[{id:'l',journal_entry_id:'e',account_id:'a',currency_code:'LAK',debit:10,credit:0}],profiles:[],payroll_employees:[],payroll_runs:[],sub_accounts:[]};
const pack={year:2025,tables:{journal_entries:tables.journal_entries,journal_lines:tables.journal_lines}};
let full=structuredClone(tables),sheets=[],fail=false,handler,deletions=0,tokens=0;
const props=()=>sheets.map(s=>s.properties);
function values(range){const m=range.match(/^'((?:''|[^'])+)'!A(\d+):([A-Z]+)(\d+)$/);assert(m,range);const name=m[1].replaceAll("''", "'"),width=[...m[3]].reduce((a,c)=>a*26+c.charCodeAt(0)-64,0),tab=sheets.find(s=>s.properties.title===name);if(!tab)throw Error('Missing sheet '+name);const rows=tab.rows.slice(Number(m[2])-1,Number(m[4])).map(r=>{const a=r.slice(0,width);while(a.length&&(a.at(-1)===''||a.at(-1)==null))a.pop();return a});while(rows.length&&!rows.at(-1).length)rows.pop();return rows;}
async function g(path,method='GET',body){
 if(path==='?fields=sheets.properties')return {sheets:sheets.map(s=>({properties:s.properties}))};
 if(path.startsWith('/values:batchGet?'))return {valueRanges:new URLSearchParams(path.split('?')[1]).getAll('ranges').map(r=>({values:values(r)}))};
 if(path.startsWith('/values/'))return {values:values(decodeURIComponent(path.slice(8).split('?')[0]))};
 assert.equal(path,':batchUpdate');const draft=structuredClone(sheets);if(fail){fail=false;throw Error('Simulated atomic request failure');}
 for(const request of body.requests){
  if(request.addSheet){const p=structuredClone(request.addSheet.properties);assert(!draft.some(s=>s.properties.title===p.title));draft.push({properties:p,rows:[],protected:false});}
  if(request.updateSheetProperties){const p=request.updateSheetProperties.properties,tab=draft.find(s=>s.properties.sheetId===p.sheetId);tab.properties={...tab.properties,...p,gridProperties:{...tab.properties.gridProperties,...p.gridProperties}};}
  if(request.updateCells){const x=request.updateCells,q=x.range||x.start,tab=draft.find(s=>s.properties.sheetId===q.sheetId),start=q.startRowIndex??q.rowIndex??0;
   if(x.range)tab.rows=[];
   x.rows.forEach((r,i)=>{tab.rows[start+i]=(r.values||[]).map(c=>{const v=c.userEnteredValue;return v?.stringValue??v?.numberValue??v?.boolValue??''})});}
  if(request.addProtectedRange)draft.find(s=>s.properties.sheetId===request.addProtectedRange.protectedRange.range.sheetId).protected=true;
 }
 sheets=draft;return {};
}
const cfg={connection_sheet:'synthetic',sheet:'synthetic'},state={config:cfg,years:[]};
const calls=[];
const user={rpc:async(name,args)=>{calls.push(name);if(name==='sheet_archive_year_pack194')return {data:pack};if(name==='scoped_reset_backup14232')return {data:{...pack,scopes:['journal']}};if(name==='sheet_archive_delete_year194'){deletions++;return {data:{mode:'cleared'}};}throw Error(name)}};
const admin={rpc:async(name,args)=>{calls.push(name);if(name==='sheet_archive_state194')return {data:state};if(name==='sheet_archive_history_selection194')return {data:pack.tables};if(name==='sheet_archive_snapshot194')return {data:full};if(name==='sheet_archive_excel194'){tokens++;return {data:'token'};}if(name==='sheet_archive_permit194')return {data:'permit'};throw Error(name)}};
const env={...core,...formulas,admin,auth:async req=>{if(req.headers.get('authorization')!=='Bearer valid')throw Error('Unauthorized');return {id:'admin',user}},connection:async()=>({email:'oonjaimarketplace@gmail.com'}),googleToken:async()=> 'synthetic',hash,reply:(data,status=200)=>new Response(JSON.stringify(data),{status}),fetch:async(url,options={})=>{const path=url.slice(url.indexOf('/spreadsheets/synthetic')+'/spreadsheets/synthetic'.length);try{return new Response(JSON.stringify(await g(path,options.method,options.body?JSON.parse(options.body):undefined)),{status:200})}catch(e){return new Response(JSON.stringify({error:{message:e.message}}),{status:400})}},Deno:{serve:fn=>handler=fn}};
const code=stripTypeScriptTypes(fs.readFileSync('supabase/functions/accounting-sheet-archive/index.ts','utf8').replace(/^import .*;\n/gm,''));
const api=await new Function('env',`return (async()=>{const {${Object.keys(env).join(',')}}=env;${code};return {write,append,liveBatch,verifyYear,verifyReset,excelBackup,selectionDigest,rowRequests,sendBatches,sameCells};})()`)(env);
// Creation, values and protection must all succeed together. A failed first write can be retried.
fail=true;await assert.rejects(api.write(g,props(),'Test History',[['Header'],['Saved']],true),/Simulated/);assert.equal(sheets.length,0);
await api.write(g,props(),'Test History',[['Header'],['Saved']],true);assert(sheets[0].protected);await api.write(g,props(),'Test History',[['Header'],['Saved']],true);
await assert.rejects(api.write(g,props(),'Test History',[['Header'],['Changed']],true),/different content/);assert.equal(sheets[0].rows[1][0],'Saved');
// Saved revision corruption blocks append; it is never repaired by silently overwriting history.
await api.append(g,props(),'Source Records',['Revision','Data'],[['1','original']]);sheets.find(s=>s.properties.title==='Source Records').rows.push(['1','duplicate']);await assert.rejects(api.append(g,props(),'Source Records',['Revision','Data'],[['2','next']]),/duplicate/);
sheets=[];const recordRows=[['Table','Record ID','Part','Original JSON'],...core.records(tables)];await api.write(g,props(),'Records History 2025',recordRows,true);
for(const [name,rows]of Object.entries(core.reports(tables,new Set([2025]))))await api.write(g,props(),name+' History 2025',rows,true);
state.years=[{year:2025,sealed_at:'2026-01-01',digest:await hash(core.canonical(recordRows)),rows:recordRows.length}];
let verification=await api.verifyYear({user},{year:2025},state);assert(verification.match);
const backup=await api.excelBackup({id:'admin',user},{mode:'year',year:2025},state);assert(backup.match);assert.equal(backup.views.Journal[1][9],10);assert.equal(tokens,1);
full.journal_lines[0].debit=11;await assert.rejects(api.excelBackup({id:'admin',user},{mode:'year',year:2025},state),/changed during backup/);assert.equal(tokens,1);full=structuredClone(tables);
const savedJournal=sheets.find(s=>s.properties.title==='Journal History 2025');savedJournal.rows[1][9]=99;verification=await api.verifyYear({user},{year:2025},state);assert(!verification.match);assert(verification.differences.some(d=>d.kind==='report_cell_differs'));assert.equal(savedJournal.rows[1][9],99);sheets.find(s=>s.properties.title==='Journal History 2025').rows[1][9]=10;
async function request(body,authorization='Bearer valid'){const r=await handler(new Request('https://test.invalid',{method:'POST',headers:{authorization,'content-type':'application/json'},body:JSON.stringify(body)}));return {status:r.status,body:await r.json()};}
assert.equal((await request({action:'status'},'')).status,400);
assert.equal((await request({action:'confirm-year',year:2025,confirmation:'DELETE VERIFIED YEAR 2025',digest:backup.digest,backupSaved:false,backupToken:'token'})).status,400);assert.equal(deletions,0);
assert.equal((await request({action:'confirm-year',year:2025,confirmation:'DELETE VERIFIED YEAR 2025',digest:'stale',backupSaved:true,backupToken:'token'})).status,400);assert.equal(deletions,0);
assert.equal((await request({action:'confirm-year',year:2025,confirmation:'DELETE VERIFIED YEAR 2025',digest:backup.digest,backupSaved:true,backupToken:'token'})).status,200);assert.equal(deletions,1);
console.log('PASS actual Edge code: atomic history write/retry, immutable history, duplicate revision block, exact reports/records checks, fresh database Excel, auth, stale digest and saved-file gate.');

const bigRows=Array.from({length:120},(_,i)=>[i,'x'.repeat(28000)]);const chunks=api.rowRequests(1,bigRows,5);assert(chunks.length>1);assert.equal(chunks[0].updateCells.start.rowIndex,5);assert.equal(chunks.reduce((n,r)=>n+r.updateCells.rows.length,0),120);let count=0;await api.sendBatches(async(path,method,body)=>{assert(JSON.stringify(body).length<2000000);count++;},chunks);assert(count>1);console.log('PASS bounded large-payload requests without losing or duplicating rows');

assert(api.sameCells([[1,null],[]],[[1,'']],2));assert(!api.sameCells([[1,'x']],[[1,'']],2));assert(!api.sameCells([['1']],[[1]],1));assert(!api.sameCells([[1]],[[1],[2]],1));
