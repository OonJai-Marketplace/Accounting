const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/Code.gs','utf8'),ctx);
const hash=s=>crypto.createHash('md5').update(s).digest('hex');
const plain=x=>JSON.parse(JSON.stringify(x));
assert.deepEqual(plain(ctx.periodBounds_('Year',2026,1)),{from:'2026-01-01',to:'2026-12-31'});
assert.deepEqual(plain(ctx.periodBounds_('Quarter',2026,4)),{from:'2026-10-01',to:'2026-12-31'});
assert.deepEqual(plain(ctx.periodBounds_('Month',2024,2)),{from:'2024-02-01',to:'2024-02-29'});
assert.throws(()=>ctx.periodBounds_('Quarter',2026,5));assert.throws(()=>ctx.periodBounds_('Custom',0,0,'2026-02-29','2026-03-01'));assert.throws(()=>ctx.periodBounds_('Custom',0,0,'2026-03-02','2026-03-01'));
const line=(d,id,e)=>[d,e,'posted','=literal memo','a','1000','Cash','ASSET','LAK',10,0,10,'',id,e,''];
const rows=[line('2026-01-01','l0','E1'),line('2026-02-01','l1','E1'),line('2026-02-28','l2','E2')];
const period={from:'2026-02-01',to:'2026-02-28'};
const p={version:2,...period,createdAt:'2026-10-20T00:00:00Z',rowsJson:JSON.stringify(rows),accounts:[],entryList:[['E1','E1','2026-02-01','2026-02-01',1],['E2','E2','2026-02-28','2026-02-28',1]],receipt:{lines:2,entries:2,priorLines:1,totalLines:3,firstId:'E1',lastId:'E2',firstDate:'2026-02-01',lastDate:'2026-02-28'}};p.hash=hash(p.rowsJson);
assert.equal(ctx.validatePack_(p,period,hash).length,3);
const wrong=plain(p);wrong.receipt.lines++;assert.throws(()=>ctx.validatePack_(wrong,period,hash),/counts/);
const duplicate=plain(p);duplicate.rowsJson=JSON.stringify([rows[0],rows[1],rows[1]]);duplicate.hash=hash(duplicate.rowsJson);assert.throws(()=>ctx.validatePack_(duplicate,period,hash),/Duplicate/);
const badHash=plain(p);badHash.hash='wrong';assert.throws(()=>ctx.validatePack_(badHash,period,hash),/checksum/);
const empty=plain(p);empty.rowsJson='[]';empty.hash=hash('[]');empty.entryList=[];empty.receipt={lines:0,entries:0,priorLines:0,totalLines:0,firstId:null,lastId:null,firstDate:null,lastDate:null};assert.equal(ctx.validatePack_(empty,period,hash).length,0);
// Mock the Google boundary: successful publication versus corrupt readback.
function run(corrupt){let active={getValues:()=>[['header'],['Other',1,'preserved',...Array(15).fill('')]],getSheet:()=>({setName(){},hideSheet(){}})},published=false,data=[];
const stage={getName:()=>'_Incoming_test',getMaxRows:()=>1000,setName(){},setFrozenRows(){},getRange:(r,c,n,w)=>({getValues:()=>corrupt?[]:data,setFontWeight(){return this},setBackground(){return this}})};
ctx.SpreadsheetApp={getActive:()=>({getSheetByName:()=>({}),getRangeByName:()=>active,insertSheet:()=>stage,setNamedRange:(name,range)=>{published=true;active=range;}}),flush(){}};
ctx.LockService={getDocumentLock:()=>({tryLock:()=>true,releaseLock(){}})};ctx.request_=()=>plain(p);ctx.session_=()=>'';ctx.md5_=hash;
ctx.sheetsRequest_=(path,method,body)=>{data.push(...body.values);};
if(corrupt)assert.throws(()=>ctx.importFromDatabase('Month',2026,2),/not published/);else{const result=ctx.importFromDatabase('Month',2026,2);assert.equal(result.receipt.lines,2);assert(data.some(r=>r[0]==='Other'));assert(data.some(r=>r[5]==='=literal memo'));}
assert.equal(published,!corrupt);}
run(false);run(true);
new vm.Script(fs.readFileSync(__dirname+'/Import.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1]);
console.log('PASS: year/quarter/month/custom boundaries, leap year, multi-date entries, selected vs opening counts, duplicates, hash failures, empty snapshots, raw text preservation, atomic publication and failed readback.');
