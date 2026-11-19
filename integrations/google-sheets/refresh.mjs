// Manual refresh. Google consent and Accounting authorization are scoped to this operation.
import {key,parts,currentViews} from '../../supabase/functions/accounting-sheet-archive/core.mjs';
import {formulaViews,formulaExpected} from '../../supabase/functions/accounting-sheet-archive/formulas.mjs';
import {router231} from '../../supabase/functions/accounting-sheet-archive/year-routing231.mjs';

const reportSources='journal_entries journal_lines accounts sub_accounts profiles staff_journals staff_journal_lines payroll_runs payroll_employees payroll_leave_records accounting_id_settings business_settings operational_reports hr_calendar_history14306 hr_calendar_events14306 hr_calendar_settings14306 tax_sso_records fund_adjustment_requests fund_adjustment_lines entry_submissions audit_log'.split(' ');
const header=['Revision part','Table','Operation','Captured UTC','Record ID','Part','Original JSON'];
const digest=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const quote=s=>"'"+s.replaceAll("'","''")+"'";
const column=n=>{let s='';for(;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s};
export function batches(rows,bytes=650000){
 const chunks=[];let start=0,size=0;
 for(let i=0;i<rows.length;i++){const len=JSON.stringify(rows[i]).length;
  if(i>start&&(size+len>bytes||i-start>=300)){chunks.push([start,i]);start=i;size=0}size+=len;
 }if(start<rows.length)chunks.push([start,rows.length]);return chunks;
}
function entered(v){
 if(v==null||v==='')return {};
 if(typeof v==='object')return {userEnteredValue:{formulaValue:v.formula}};
 return {userEnteredValue:typeof v==='number'?{numberValue:v}:typeof v==='boolean'?{boolValue:v}:{stringValue:String(v)}};
}
function put(id,rowIndex,rows,columnIndex=0){return {updateCells:{start:{sheetId:id,rowIndex,columnIndex},rows:rows.map(row=>({values:row.map(entered)})),fields:'userEnteredValue'}}}
function clear(id,r0,r1,cols){return {repeatCell:{range:{sheetId:id,startRowIndex:r0,endRowIndex:r1,startColumnIndex:0,endColumnIndex:cols},cell:{},fields:'userEnteredValue'}}}
const sheetHeaders={'Raw Data':['Table','Record ID','Part','Original JSON'],'Source Records':header};
function rowEqual(expected,actual,formula=false){
 for(let i=0;i<Math.max(expected.length,actual.length);i++){
  const x=expected[i],v=(x&&typeof x==='object')?(formula?x.formula:formulaExpected(x)):x;
  if((actual[i]??'')===(v??''))continue;
  if(!formula&&typeof v==='number'&&typeof actual[i]==='number'&&Math.abs(v-actual[i])<=0.000001)continue;
  return false;
 }return true;
}
async function googleConsent(client,email,host){
 if(!client?.endsWith('.apps.googleusercontent.com'))throw Error('Configure the company Google OAuth client in Accounting Settings.');
 if(!window.google?.accounts?.oauth2)await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=resolve;s.onerror=()=>reject(Error('Google sign-in could not load. Check the connection and retry.'));document.head.append(s)});
 return new Promise((resolve,reject)=>{
  const button=document.createElement('button');button.type='button';button.textContent='Continue with the company Google account';host.replaceChildren(button);
  const clientApp=google.accounts.oauth2.initTokenClient({client_id:client,scope:'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email',hint:email,callback:r=>r.access_token?resolve(r.access_token):reject(Error(r.error_description||'Google access was not granted.')),error_callback:e=>reject(Error(e.message||'Google account selection was closed.'))});
  button.onclick=()=>{button.disabled=true;clientApp.requestAccessToken({prompt:'select_account'})};
 });
}
async function sheetRequest(token,id,path,options={},guard){
 guard();const url='https://sheets.googleapis.com/v4/spreadsheets/'+id+path;
 for(let i=0;;i++){
  const r=await fetch(url,{...options,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},cache:'no-store'});
  if((r.status===429||r.status===503)&&i<4){await new Promise(done=>setTimeout(done,2000*2**i));guard();continue}
  const data=await r.json();if(!r.ok)throw Error(data.error?.message||'Google Sheets could not complete this request.');guard();return data;
 }
}
export async function loadSource(rpc,status){
 const inventory=await rpc(null),tables={},source=new Map();
 for(const [table,info] of Object.entries(inventory)){
  const records=[],hashes=[],stable=new Set();tables[table]=records;
  const page=Math.max(1,Math.min(250,Math.floor(700000*info.count/Math.max(1,info.bytes))));
  for(let pos=0;pos<info.count;pos+=page){
   status('Reading '+table+' · '+pos+' / '+info.count);
   const lines=await rpc(table,pos,page);
   if(lines.length!==Math.min(page,info.count-pos))throw Error('Accounting records changed. Retry the refresh.');
   for(const raw of lines){const row=JSON.parse(raw),id=key(row,table);if(stable.has(id))throw Error('Duplicate record in '+table);
    stable.add(id);const hash=await digest(raw);hashes.push(hash);records.push(row);source.set(row,{raw,id,hash});}
  }
  if(await digest(hashes.sort().join(''))!==info.hash)throw Error('Accounting changed while reading '+table+'. Retry the refresh.');
 }
 return {inventory,tables,source};
}
export function projections(tables,year){
 const subset=Object.fromEntries(reportSources.map(t=>[t,tables[t]||[]]));
 const sealed=new Set((tables.year_closings136||[]).map(r=>Number(r.year)));
 const views=formulaViews(subset,currentViews(subset,sealed,year));
 delete views['Raw Data'];
 views['Stored Files']=[['Bucket','File name','SHA-256','Bytes'],...(tables['storage.objects']||[]).map(f=>[f.bucket_id,f.name,'',Number(f.bytes)||0])];
 return views;
}
export function sourceRows(tables,source,when){
 const raw=[],history=[];
 for(const table of Object.keys(tables).sort())for(const row of tables[table]){
  const item=source.get(row);parts(item.raw).forEach((part,i)=>{
   raw.push([table,item.id,i+1,part]);history.push(['sync-'+table+'-'+item.hash+':'+(i+1),table,'SNAPSHOT',when,item.id,i+1,part]);
  });
 }return {raw,history};
}
async function refreshBook(book,token,snapshot,context){
 const {guard,status,rpc,renew}=context,now=new Date().toISOString(),year=Number(now.slice(0,4));
 if(book.year&&(snapshot.tables.year_closings136||[]).some(r=>Number(r.year)===book.year)){status(book.name+' is a sealed archive.');return 'sealed'}
 const tables=book.year?router231(snapshot.tables).select(book.year):snapshot.tables;
 const views=projections(tables,book.year||year),{raw,history}=sourceRows(tables,snapshot.source,now);
 const call=(path,options)=>sheetRequest(token,book.id,path,options,guard);
 const batch=async requests=>{await renew();return call(':batchUpdate',{method:'POST',body:JSON.stringify({requests})})};
 const values=async (t,range,mode='UNFORMATTED_VALUE')=>(await call('/values/'+encodeURIComponent(quote(t)+'!'+range)+'?valueRenderOption='+mode)).values||[];
 const meta=await call('?fields=sheets(properties(sheetId,title,gridProperties))');
 const sheets=new Map(meta.sheets.map(x=>[x.properties.title,x.properties]));
 for(const title of [...Object.keys(views),...Object.keys(sheetHeaders),'Archive Status','Import Receipt']){
  if(!sheets.has(title))throw Error(book.name+' is missing the '+title+' tab.');
 }
 for(const [name,cols] of Object.entries(sheetHeaders)){
  if(!same((await values(name,'A1:'+column(cols.length)+'1'))[0],cols))throw Error('Unexpected archive header on '+name);
 }
 const summary=sheets.get('Archive Status');
 const jobs=Object.entries(views);
 async function writeRows(title,start,rows,verifyMode='FORMULA'){
  const p=sheets.get(title),width=rows.reduce((n,r)=>Math.max(n,r.length),0);
  const all=batches(rows);for(const [from,to] of all){
   const requests=[];const needed=start+to;
   if(needed>p.gridProperties.rowCount){requests.push({appendDimension:{sheetId:p.sheetId,dimension:'ROWS',length:needed-p.gridProperties.rowCount}});p.gridProperties.rowCount=needed}
   if(width>p.gridProperties.columnCount){requests.push({appendDimension:{sheetId:p.sheetId,dimension:'COLUMNS',length:width-p.gridProperties.columnCount}});p.gridProperties.columnCount=width}
   requests.push(put(p.sheetId,start+from,rows.slice(from,to)));await batch(requests);
   const got=await values(title,'A'+(start+from+1)+':'+column(width)+(start+to),verifyMode);
   if(got.length!==to-from||got.some((r,i)=>!rowEqual(rows[from+i],r,verifyMode==='FORMULA')))throw Error('Readback differs on '+title+' at row '+(start+from+1));
  }
 }
 await batch([put(summary.sheetId,13,[['Refresh in progress. Retry if interrupted.']],1)]);
 // Immutable revisions are appended and read back first. Interrupted attempts retain previously verified source.
 const sourceTitle='Source Records',known=(await values(sourceTitle,'A2:A'+sheets.get(sourceTitle).gridProperties.rowCount)).map(r=>r[0]||'');
 const keys=new Set(known),missing=history.filter(r=>!keys.has(r[0]));
 if(missing.length){status(book.name+' · Source Records');await writeRows(sourceTitle,known.length+1,missing,'UNFORMATTED_VALUE')}
 // A complete verified raw snapshot precedes any changes to reporting rows.
 const stage='_Raw_refresh_'+crypto.randomUUID().replaceAll('-','').slice(0,12);
 await batch([{addSheet:{properties:{title:stage,hidden:true,gridProperties:{rowCount:raw.length+1,columnCount:4}}}}]).then(res=>sheets.set(stage,res.replies[0].addSheet.properties));
 let complete=false;
 try{
  status(book.name+' · Verifying raw records');const grid=[sheetHeaders['Raw Data'],...raw];await writeRows(stage,0,grid,'UNFORMATTED_VALUE');
  for(const [name,rows] of jobs){
   status(book.name+' · '+name);const target=sheets.get(name),temp='_Report_refresh_'+crypto.randomUUID().replaceAll('-','').slice(0,12);
   // The scratch tab inherits the report's formatting. Existing report rows survive a failed stage.
   const dupe=await batch([{duplicateSheet:{sourceSheetId:target.sheetId,newSheetName:temp}}]);
   const p=dupe.replies[0].duplicateSheet.properties;sheets.set(temp,p);
   try{
    const width=Math.max(rows[0].length,1),used=Math.min(width,p.gridProperties.columnCount);
    await batch([{updateSheetProperties:{properties:{sheetId:p.sheetId,hidden:true},fields:'hidden'}},clear(p.sheetId,0,p.gridProperties.rowCount,used)]);
    await writeRows(temp,0,rows);
    const commit=[],bounds={startRowIndex:0,endRowIndex:rows.length,startColumnIndex:0,endColumnIndex:width};
    for(const [dimension,requested,existing] of [['ROWS',rows.length,target.gridProperties.rowCount],['COLUMNS',width,target.gridProperties.columnCount]]){
     if(requested>existing)commit.push({appendDimension:{sheetId:target.sheetId,dimension,length:requested-existing}});
    }
    commit.push(clear(target.sheetId,0,Math.max(rows.length,target.gridProperties.rowCount),width),
     {copyPaste:{source:{sheetId:p.sheetId,...bounds},destination:{sheetId:target.sheetId,...bounds},pasteType:'PASTE_NORMAL'}},
     {deleteSheet:{sheetId:p.sheetId}});
    await batch(commit);sheets.delete(temp);
   }finally{if(sheets.has(temp))await batch([{deleteSheet:{sheetId:p.sheetId}}]).catch(()=>{})}
  }
  // Verify the published calculations after all their source tabs are current.
  const checkViews=['Journal','Current Year Journal','Open Years Journal','General Ledger','Trial Balance','Income Statement','Balance Sheet','Monthly Results','Accounts','Sub-accounts','Sub-user Reports','Sub-user Activity','Staff','Attendance','Payroll','Budget Requests','HR Events','Audit Log','Stored Files'];
  for(const name of checkViews){
   const expected=views[name],width=expected[0].length;status(book.name+' · Checking '+name);
   for(const [a,b] of batches(expected)){
    const got=await values(name,'A'+(a+1)+':'+column(width)+b);
    if(got.length!==b-a||got.some((r,i)=>!rowEqual(expected[a+i],r)))throw Error('Published values differ on '+name+'. The refresh is incomplete.');
   }
  }
  if(!same(await rpc(null),snapshot.inventory))throw Error('Accounting changed during delivery. Retry before relying on the refreshed reports.');
  const rawSheet=sheets.get('Raw Data'),stageId=sheets.get(stage).sheetId;
  if(grid.length>rawSheet.gridProperties.rowCount)await batch([{appendDimension:{sheetId:rawSheet.sheetId,dimension:'ROWS',length:grid.length-rawSheet.gridProperties.rowCount}}]);
  for(const [a,b] of batches(grid)){
   const bounds={startRowIndex:a,endRowIndex:b,startColumnIndex:0,endColumnIndex:4};
   await batch([{copyPaste:{source:{sheetId:stageId,...bounds},destination:{sheetId:rawSheet.sheetId,...bounds},pasteType:'PASTE_VALUES'}}]);
   const copied=await values('Raw Data','A'+(a+1)+':D'+b);if(copied.length!==b-a||copied.some((r,i)=>!rowEqual(grid[a+i],r)))throw Error('Raw Data did not verify after copying.');
  }
  const counts=[...Object.values(tables)].reduce((n,r)=>n+r.length,0),rangeEnd=known.length+missing.length;
  const checks=[put(summary.sheetId,2,[[book.year||year],[(tables.journal_entries||[]).length],[(tables.journal_lines||[]).length],[Object.keys(tables).length],[now],['Manual full refresh with readback.']],1),
   put(summary.sheetId,13,[[counts+' business records verified.'],[rangeEnd]],1),put(sheets.get('Import Receipt').sheetId,1,[[book.year||year],[(tables.journal_entries||[]).length],[(tables.journal_lines||[]).length],[now]],1)];
  if(rawSheet.gridProperties.rowCount>grid.length)checks.push(clear(rawSheet.sheetId,grid.length,rawSheet.gridProperties.rowCount,4));
  await batch(checks);complete=true;
 }finally{await batch([{deleteSheet:{sheetId:sheets.get(stage).sheetId}}]).catch(()=>{});}
 return complete?'verified':'incomplete';
}
export async function refreshArchives(db,guard,host){
 const rpc=async(table,offset=0,limit=50)=>{guard();const r=await db.rpc('accounting_archive_read',{p_table:table,p_offset:offset,p_limit:limit});guard();if(r.error)throw Error(r.error.message);return r.data};
 const dest=await db.rpc('accounting_archive_destinations');guard();if(dest.error)throw Error(dest.error.message);
 const books=dest.data;if(!Array.isArray(books)||books.length!==2||!books.some(b=>b.year)||!books.some(b=>!b.year))throw Error('The company archive destinations are incomplete.');
 const config=await rpc('@config'),token=await googleConsent(config.client,config.email,host);guard();
 const identity=await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:'Bearer '+token}}).then(r=>r.json());
 if(identity.email_verified!==true||String(identity.email).toLowerCase()!==config.email.toLowerCase())throw Error('Choose the company Google account '+config.email+'.');
 const status=text=>{guard();host.textContent=text},id=crypto.randomUUID();let renewed=0;
 const lease=async action=>{guard();const r=await db.rpc('accounting_archive_job',{p_operation:id,p_action:action});guard();
  if(r.error)throw Error(r.error.message);if(!r.data)throw Error('Another archive refresh is active. Retry after it finishes.');renewed=Date.now()};
 const renew=async()=>{if(Date.now()-renewed>60000)await lease('renew')};
 await lease('start');try{
  const read=async(...args)=>{await renew();return rpc(...args)};
  const snapshot=await loadSource(read,status),done=[];
  for(const book of books){const result=await refreshBook(book,token,snapshot,{rpc:read,guard,status,renew});done.push(book.name+' '+result)}
  status(done.join(' · '));
 }finally{await lease('finish').catch(()=>{})}
}
