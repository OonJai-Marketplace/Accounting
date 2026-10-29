import {admin,auth,connection,googleToken,hash,reply} from '../_shared/google143150.ts';
import {canonical,parts,records,unpack,compare,journal,reports,currentViews,key} from './core.mjs';
const OWNER='oonjaimarketplace@gmail.com';
const checked=(r:any)=>{if(r.error)throw Error(r.error.message);return r.data;};
const rpc=async(n:string,p:any={})=>checked(await admin.rpc(n,p));
const selectionDigest=(p:any)=>hash(canonical({year:p.year??null,scopes:p.scopes??null,owner:p.owner??null,instance:p.instance??null,tables:p.tables}));
const col=(n:number)=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
const cell=(v:any)=>v==null?{}:{userEnteredValue:typeof v==='number'?{numberValue:v}:typeof v==='boolean'?{boolValue:v}:{stringValue:String(v)}};
const quote=(s:string)=>"'"+s.replaceAll("'","''")+"'";
async function google(cfg:any){const c=await connection(cfg.connection_sheet);if(c?.email?.toLowerCase()!==OWNER)throw Error('Reconnect the Oon Jai Google account in AI Journal.');const access=await googleToken(c);
 return async(path:string,method='GET',body?:any)=>{const r=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(cfg.sheet)+path,{method,headers:{Authorization:'Bearer '+access,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(45000)});if(!r.ok){const detail=await r.json().catch(()=>({}));throw Error('Google archive request failed ('+r.status+'): '+String(detail.error?.message||'Check the connection').slice(0,500)+'. Nothing was deleted.');}return r.json();};}
async function read(g:any,title:string,rows:number,width:number){if(rows>100000)throw Error('Archive read exceeds capacity. Cleanup is blocked.');const r=await g('/values/'+encodeURIComponent(quote(title)+'!A1:'+col(width-1)+Math.max(rows,1))+'?valueRenderOption=UNFORMATTED_VALUE');return r.values||[];}
async function metadata(g:any){return (await g('?fields=sheets.properties')).sheets.map((s:any)=>s.properties);}
function normalized(rows:any[],width:number){return rows.map(r=>Array.from({length:width},(_,i)=>r[i]??''));}
async function liveBatch(g:any,meta:any[],views:any){
 const requests:any[]=[{updateSpreadsheetProperties:{properties:{timeZone:'Asia/Vientiane'},fields:'timeZone'}}],ranges:string[]=[],expected:any[]=[];let next=194000000;
 for(const [title,values]of Object.entries(views) as any){
  if(/History|^Source Records$/.test(title))throw Error('Live batch cannot edit history');
  const width=Math.max(1,...values.map((r:any[])=>r.length)),height=Math.max(1,values.length);
  if(height>100000||width>80||values.some((r:any[])=>r.some(v=>typeof v==='string'&&v.length>49000)))throw Error('Workbook capacity exceeded; cleanup is blocked.');
  let tab=meta.find(t=>t.title===title);if(!tab){while(meta.some(t=>t.sheetId===next))next++;tab={sheetId:next++,title,gridProperties:{rowCount:Math.max(100,height),columnCount:Math.max(26,width)}};meta.push(tab);requests.push({addSheet:{properties:tab}});}
  const rowCount=Math.max(height,tab.gridProperties.rowCount),columnCount=Math.max(width,tab.gridProperties.columnCount);
  requests.push({updateSheetProperties:{properties:{sheetId:tab.sheetId,gridProperties:{rowCount,columnCount,frozenRowCount:1}},fields:'gridProperties.rowCount,gridProperties.columnCount,gridProperties.frozenRowCount'}});
  requests.push({unmergeCells:{range:{sheetId:tab.sheetId}}});
  requests.push({updateCells:{range:{sheetId:tab.sheetId,startRowIndex:0,endRowIndex:rowCount,startColumnIndex:0,endColumnIndex:columnCount},rows:values.map((r:any[])=>({values:r.map(cell)})),fields:'userEnteredValue'}});
  requests.push({repeatCell:{range:{sheetId:tab.sheetId},cell:{userEnteredFormat:{numberFormat:{type:'NUMBER',pattern:'#,##0.00########'},backgroundColor:{red:1,green:1,blue:1},textFormat:{fontFamily:'Arial',fontSize:10,foregroundColor:{red:0,green:0,blue:0}},wrapStrategy:'CLIP'}},fields:'userEnteredFormat'}});
  requests.push({repeatCell:{range:{sheetId:tab.sheetId,startRowIndex:0,endRowIndex:1},cell:{userEnteredFormat:{backgroundColor:{red:.9,green:.94,blue:.91},textFormat:{bold:true},wrapStrategy:'WRAP'}},fields:'userEnteredFormat.backgroundColor,userEnteredFormat.textFormat.bold,userEnteredFormat.wrapStrategy'}});
  requests.push({updateDimensionProperties:{range:{sheetId:tab.sheetId,dimension:'COLUMNS',startIndex:0,endIndex:width},properties:{pixelSize:155},fields:'pixelSize'}});
  requests.push({updateDimensionProperties:{range:{sheetId:tab.sheetId,dimension:'ROWS',startIndex:0,endIndex:1},properties:{pixelSize:42},fields:'pixelSize'}});
  for(let i=0;i<width;i++)if(/description|memo|Notes|Status|Saved value/i.test(String(values[0]?.[i])))requests.push({updateDimensionProperties:{range:{sheetId:tab.sheetId,dimension:'COLUMNS',startIndex:i,endIndex:i+1},properties:{pixelSize:310},fields:'pixelSize'}});
  for(let i=0;i<width;i++)if(/^(Year|Part|Record parts|Employees|Days)$/.test(String(values[0]?.[i]))||(['Home','Dashboard','Archive Status','Checks','Payroll Check'].includes(title)&&i===1))requests.push({repeatCell:{range:{sheetId:tab.sheetId,startColumnIndex:i,endColumnIndex:i+1},cell:{userEnteredFormat:{numberFormat:{type:'NUMBER',pattern:'0'}}},fields:'userEnteredFormat.numberFormat'}});
  if(title==='Raw Data')requests.push({updateDimensionProperties:{range:{sheetId:tab.sheetId,dimension:'COLUMNS',startIndex:3,endIndex:4},properties:{pixelSize:600},fields:'pixelSize'}});
  ranges.push(quote(title)+'!A1:'+col(width-1)+height);expected.push({values,width,title});
 }
 if(JSON.stringify(requests).length>8*1024*1024)throw Error('Archive live batch is too large; cleanup remains blocked.');
 await g(':batchUpdate','POST',{requests});
 const result=await g('/values:batchGet?valueRenderOption=UNFORMATTED_VALUE&'+ranges.map(r=>'ranges='+encodeURIComponent(r)).join('&'));
 for(let i=0;i<expected.length;i++){const e=expected[i];if(canonical(normalized(result.valueRanges[i].values||[],e.width))!==canonical(normalized(e.values,e.width)))throw Error(e.title+' readback mismatch');}
}
async function write(g:any,meta:any[],title:string,values:any[],immutable=false){
 if(!immutable&&/History|^Source Records$/.test(title))throw Error('Live writes cannot target history.');
 const width=Math.max(1,...values.map(r=>r.length)),height=Math.max(1,values.length);if(height>100000||width>80)throw Error('Workbook capacity exceeded. Nothing was deleted.');
 for(const row of values)for(const value of row)if(typeof value==='string'&&value.length>49000)throw Error('A report cell exceeds capacity; source JSON is preserved separately.');
 let tab=meta.find(t=>t.title===title);
 if(immutable&&tab){const existing=await read(g,title,Math.max(height,tab.gridProperties.rowCount),width);if(canonical(normalized(existing,width))!==canonical(normalized(values,width)))throw Error(title+' already exists with different content; history was preserved.');return tab;}
 const requests:any[]=[];
 if(!tab){let sheetId=194500000;while(meta.some(t=>t.sheetId===sheetId))sheetId++;tab={sheetId,title,gridProperties:{rowCount:Math.max(100,height),columnCount:Math.max(26,width),frozenRowCount:1}};requests.push({addSheet:{properties:tab}});meta.push(tab);}
 const rowCount=Math.max(height,tab.gridProperties.rowCount),columnCount=Math.max(width,tab.gridProperties.columnCount);
 if(rowCount!==tab.gridProperties.rowCount||columnCount!==tab.gridProperties.columnCount)requests.push({updateSheetProperties:{properties:{sheetId:tab.sheetId,gridProperties:{rowCount,columnCount}},fields:'gridProperties.rowCount,gridProperties.columnCount'}});
 // Only live sheets may be cleared; history is created once and never overwritten.
 requests.push({updateCells:{range:{sheetId:tab.sheetId,startRowIndex:0,endRowIndex:rowCount,startColumnIndex:0,endColumnIndex:columnCount},rows:values.map(r=>({values:r.map(cell)})),fields:'userEnteredValue'}});
 requests.push({updateSheetProperties:{properties:{sheetId:tab.sheetId,gridProperties:{frozenRowCount:1}},fields:'gridProperties.frozenRowCount'}});
 requests.push({repeatCell:{range:{sheetId:tab.sheetId,startRowIndex:0,endRowIndex:1},cell:{userEnteredFormat:{backgroundColor:{red:.9,green:.94,blue:.91},textFormat:{bold:true,foregroundColor:{red:.1,green:.2,blue:.15}}}},fields:'userEnteredFormat'}});
 if(immutable)requests.push({addProtectedRange:{protectedRange:{range:{sheetId:tab.sheetId},description:'Closed year history. Automatic sync never edits this sheet.',warningOnly:false,editors:{users:[OWNER]}}}});
 await g(':batchUpdate','POST',{requests});
 const saved=await read(g,title,height,width);if(canonical(normalized(saved,width))!==canonical(normalized(values,width)))throw Error(title+' readback does not match. Cleanup is blocked.');
 return tab;
}
async function append(g:any,meta:any[],title:string,headers:string[],newRows:any[]){let tab=meta.find(t=>t.title===title);if(!tab){tab=await write(g,meta,title,[headers],true);}
 const saved=await read(g,title,tab.gridProperties.rowCount,headers.length),seen=new Map();
 if(canonical(saved[0])!==canonical(headers))throw Error(title+' headings changed. Saving stopped to preserve history.');
 for(const row of saved.slice(1)){if(!row[0]||seen.has(String(row[0])))throw Error(title+' contains missing or duplicate revision IDs.');seen.set(String(row[0]),row);}
 const missing:any[]=[];for(const row of newRows){const old=seen.get(String(row[0]));if(old&&canonical(normalized([old],headers.length)[0])!==canonical(normalized([row],headers.length)[0]))throw Error('Saved archive revision differs: '+row[0]);if(!old){missing.push(row);seen.set(String(row[0]),row);}}
 if(!missing.length)return;
 const start=saved.length,end=start+missing.length,req:any[]=[];if(end>100000)throw Error('Source history exceeds capacity. Cleanup is blocked.');
 if(end>tab.gridProperties.rowCount)req.push({updateSheetProperties:{properties:{sheetId:tab.sheetId,gridProperties:{rowCount:end}},fields:'gridProperties.rowCount'}});
 req.push({updateCells:{start:{sheetId:tab.sheetId,rowIndex:start,columnIndex:0},rows:missing.map(r=>({values:r.map(cell)})),fields:'userEnteredValue'}});
 await g(':batchUpdate','POST',{requests:req});tab.gridProperties.rowCount=Math.max(end,tab.gridProperties.rowCount);
 const readback=(await read(g,title,end,headers.length)).slice(start);if(canonical(normalized(readback,headers.length))!==canonical(normalized(missing,headers.length)))throw Error('Archive append verification failed.');
}
async function sync(){const lease=crypto.randomUUID(),job=await rpc('sheet_archive_job194',{p_lease:lease});if(!job)return {busy:true};const ids=job.queue.map((q:any)=>q.id);
 try{const g=await google(job.config),meta=await metadata(g);
  const rows=job.queue.flatMap((q:any)=>parts(canonical(q.record)).map((part:string,i:number)=>[q.id+':'+(i+1),q.table_name,q.operation,q.captured_at,key(q.record,q.table_name),i+1,part]));
  await append(g,meta,'Source Records',['Revision part','Table','Operation','Captured UTC','Record ID','Part','Original JSON'],rows);
  for(const y of job.years.filter((y:any)=>!y.sealed_at)){
   const history=[['Table','Record ID','Part','Original JSON'],...records(y.snapshot)],digest=await hash(canonical(history));
   const tab=await write(g,meta,'Records History '+y.year,history,true);
   await write(g,meta,'Journal History '+y.year,journal(y.snapshot,new Set([y.year])),true);
   const views=reports(y.snapshot,new Set([y.year]));for(const [name,data]of Object.entries(views))if(name!=='Journal')await write(g,meta,name+' History '+y.year,data as any[],true);
   await append(g,meta,'Journal History',['Year','Closed UTC','Archived UTC','Journal tab','Records tab','SHA-256','Record parts'],[[String(y.year),y.closed_at,y.closed_at,'Journal History '+y.year,'Records History '+y.year,digest,history.length-1]]);
   await rpc('sheet_archive_seal194',{p_year:y.year,p_digest:digest,p_rows:history.length,p_sheet_id:tab.sheetId});y.sealed_at=new Date().toISOString();
  }
  const sealed=new Set(job.years.filter((y:any)=>y.sealed_at).map((y:any)=>y.year));
  const currentYear=Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Vientiane',year:'numeric'}).format(new Date()));
  const views=currentViews(job.tables,sealed,currentYear);
  await append(g,meta,'Journal History',['Year','Closed UTC','Archived UTC','Journal tab','Records tab','SHA-256','Record parts'],[]);
  const overview=[['Accounting Web','Status'],['Google account',OWNER],['Current year',currentYear],['Database journal entries',job.tables.journal_entries?.length||0],['Database journal lines',job.tables.journal_lines?.length||0],['Business tables',Object.keys(job.tables).length],['Last successful save UTC',new Date().toISOString()],['Saving','Database changes trigger saving. No repeating full-workbook polling.'],['History','Full-year closure creates fixed values. Subsequent database changes cannot overwrite those tabs.'],['Cleanup','Fresh comparison and a second confirmation are required. A mismatch blocks deletion.'],['Report basis','Posted records, original currency and saved LAK valuations; technical mapping accounts excluded from profit and loss.'],['Source Records','Append-only record revisions; deletion records preserve the last database value.'],['Scope','Business data only. Login credentials, OAuth tokens and recovery secrets are excluded.']];
  views.Home=overview;views.Dashboard=overview;views['Archive Status']=overview;views['Import Receipt']=[['Live database copy','Value'],['Current year',currentYear],['Journal entries',job.tables.journal_entries?.length||0],['Journal lines',job.tables.journal_lines?.length||0],['Saved UTC',new Date().toISOString()]];views.Import=[['Accounting workbook','Current workflow'],['Source','Saved database changes update this workbook automatically.'],['Review','Use the website for journal posting and approval.'],['Archive','Close the entire year in the website to save fixed History.']];
  await liveBatch(g,meta,views);
  await rpc('sheet_archive_finish194',{p_lease:lease,p_ids:ids,p_error:null});return {saved:true,events:ids.length,tables:Object.keys(job.tables).length};
 }catch(e){await rpc('sheet_archive_finish194',{p_lease:lease,p_ids:[],p_error:String(e.message)});throw e;}
}
async function historyFor(g:any,state:any,year:number){const y=state.years.find((y:any)=>y.year===year);if(!y?.sealed_at)throw Error('Year '+year+' is not fully closed and verified in Google Sheets History.');const meta=await metadata(g),tab=meta.find((t:any)=>t.title==='Records History '+year);if(!tab)throw Error('The saved year history tab is missing.');const rows=await read(g,tab.title,Math.max(y.rows,tab.gridProperties.rowCount),4),digest=await hash(canonical(rows));return {tables:unpack(rows.slice(1)),differences:digest===y.digest?[]:[{table:tab.title,id:String(year),field:'SHA-256',database:y.digest,sheet:digest,kind:'history_changed'}]};}
async function checkHistoryReports(g:any,tables:any,year:number){const views=reports(tables,new Set([year])),meta=await metadata(g),diff:any[]=[];
 for(const [name,values]of Object.entries(views) as any){const title=name+' History '+year,tab=meta.find((t:any)=>t.title===title);if(!tab){diff.push({table:title,id:'',field:'sheet',database:'Saved report',sheet:null,kind:'missing_sheet'});continue;}
  const width=Math.max(...values.map((r:any[])=>r.length)),actual=await read(g,title,Math.max(values.length,tab.gridProperties.rowCount),width),db=normalized(values,width),saved=normalized(actual,width);
  for(let r=0;r<Math.max(db.length,saved.length);r++)for(let c=0;c<width;c++)if(canonical(db[r]?.[c]??'')!==canonical(saved[r]?.[c]??''))diff.push({table:title,id:String(r+1),field:col(c),database:db[r]?.[c]??'',sheet:saved[r]?.[c]??'',kind:'report_cell_differs'});
 }return diff;}
async function diffReport(g:any,state:any,result:any){const meta=await metadata(g),rows=[['Result','Table','Record ID','Field','Database value','Google Sheets value'],...result.differences.flatMap((d:any)=>{const a=parts(canonical(d.database)??'null'),b=parts(canonical(d.sheet)??'null');return Array.from({length:Math.max(a.length,b.length)},(_,i)=>[d.kind,d.table,d.id,d.field+(Math.max(a.length,b.length)>1?' · part '+(i+1):''),a[i]||'',b[i]||'']);})];if(rows.length===1)rows.push(['MATCH','','','','All selected records match','Fresh readback completed']);await write(g,meta,'Cleanup Comparison',rows);return result;}
async function verifyReset(a:any,body:any,state:any){const g=await google(state.config);const p=checked(await a.user.rpc('scoped_reset_backup14232',{p_scopes:body.scopes}));
 if(body.pack&&(canonical(body.pack.tables)!==canonical(p.tables)||canonical(body.pack.scopes)!==canonical(p.scopes)))throw Error('Selected records changed after your backup. Prepare and review the selection again.');
 // This is a read-only comparison. Never repair a mismatch by overwriting history during verification.
 const meta=await metadata(g),raw=meta.find((t:any)=>t.title==='Raw Data');if(!raw)throw Error('The first complete archive save has not finished.');
 let current:any;try{current=unpack((await read(g,'Raw Data',raw.gridProperties.rowCount,4)).slice(1));}catch(e){const result={match:false,counts:[],differences:[{table:'Raw Data',id:'',field:'saved records',database:'Readable complete record parts',sheet:String(e.message),kind:'saved_records_unreadable'}]};await diffReport(g,state,result);return {...result,pack:p};}
 const result=compare(p.tables,current,{bidirectional:false});
 for(const year of new Set((p.tables.journal_entries||[]).map((e:any)=>Number(e.transaction_date.slice(0,4))))){
  let historical:any;try{const h=await historyFor(g,state,Number(year));historical=h.tables;result.differences.push(...h.differences,...await checkHistoryReports(g,historical,Number(year)));}catch(e){result.differences.push({table:'journal_entries',id:String(year),field:'year closure',database:'Selected for deletion',sheet:e.message,kind:'history_not_verified'});continue;}
  const entries=(p.tables.journal_entries||[]).filter((e:any)=>Number(e.transaction_date.slice(0,4))===year),entryIDs=new Set(entries.map((e:any)=>e.id));
  const db={journal_entries:entries,journal_lines:(p.tables.journal_lines||[]).filter((l:any)=>entryIDs.has(l.journal_entry_id))};
  const he=(historical.journal_entries||[]).filter((e:any)=>Number(e.transaction_date.slice(0,4))===year),hids=new Set(he.map((e:any)=>e.id));
  const h={journal_entries:he,journal_lines:(historical.journal_lines||[]).filter((l:any)=>hids.has(l.journal_entry_id))};result.differences.push(...compare(db,h).differences);
 }
 result.match=!result.differences.length;await diffReport(g,state,result);
 if(!result.match)return {...result,pack:p};
 return {...result,pack:p,digest:await selectionDigest(p)};
}
async function verifyYear(a:any,body:any,state:any){const g=await google(state.config),year=Number(body.year);if(!Number.isInteger(year)||year<1900||year>2198)throw Error('Choose a valid closed year.');
 const p=checked(await a.user.rpc('sheet_archive_year_pack194',{p_year:year}));let historical:any;
 try{historical=await historyFor(g,state,year);}catch(e){const r={match:false,counts:[],differences:[{table:'Records History '+year,id:String(year),field:'saved records',database:'Readable complete history',sheet:e.message,kind:'history_unreadable'}]};await diffReport(g,state,r);return {...r,pack:p};}
 const selected=await rpc('sheet_archive_history_selection194',{p_snapshot:historical.tables,p_year:year});
 const result=compare(p.tables,selected);result.differences.push(...historical.differences,...await checkHistoryReports(g,historical.tables,year));result.match=!result.differences.length;await diffReport(g,state,result);
 return {...result,pack:p,digest:result.match?await selectionDigest(p):null};
}
async function excelBackup(a:any,body:any,state:any){const mode=body.mode==='year'?'year':'reset',verified=mode==='year'?await verifyYear(a,body,state):await verifyReset(a,body,state);if(!verified.match)return verified;
 const full=await rpc('sheet_archive_snapshot194');const equality=compare(verified.pack.tables,full,{bidirectional:false});if(!equality.match)throw Error('Database changed during backup preparation. Run the comparison again.');
 const tables={...full,...verified.pack.tables};
 if(mode==='year'){
  const keep=new Set(Object.keys(verified.pack.tables));for(const t of ['journal_entries','journal_lines','payroll_runs','payroll_lines','staff_journals','staff_journal_lines','payroll_leave_records','tax_sso_records','entry_submissions','fund_adjustment_requests','fund_adjustment_lines','workspace_notifications','operational_reports','scheduled_journal_occurrences'])if(!keep.has(t))tables[t]=[];
 }
 const year=mode==='year'?Number(body.year):Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Vientiane',year:'numeric'}).format(new Date()));
 const views=currentViews(tables,new Set(),year);views['Archive Status']=[['Database Excel backup','Value'],['Source','Supabase — direct database snapshot'],['Created UTC',new Date().toISOString()],['Selected year',mode==='year'?year:'Selected reset modules'],['Selection SHA-256',verified.digest],['History check','Matched Google Sheets before generating this separate backup']];
 const token=await rpc('sheet_archive_excel194',{p_actor:a.id,p_mode:mode,p_digest:verified.digest});return {match:true,digest:verified.digest,backupToken:token,views,counts:verified.counts,differences:[],filename:'Oon_Jai_Database_Backup_'+(mode==='year'?year:'Selected')+'_'+new Date().toISOString().slice(0,10)+'.xlsx'};
}
Deno.serve(async(req:Request)=>{if(req.method==='OPTIONS')return reply({});try{
 const body=await req.json(),token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
 if(body.action==='sync'&&token&&token===await rpc('google_poll_key143150'))return reply(await sync());
 const a=await auth(req,true),state=await rpc('sheet_archive_state194');
 if(body.action==='status')return reply(state);
 if(body.action==='sync')return reply(await sync());
 if(body.action==='verify-reset')return reply(await verifyReset(a,body,state));
 if(body.action==='verify-year')return reply(await verifyYear(a,body,state));
 if(body.action==='prepare-excel')return reply(await excelBackup(a,body,state));
 if(body.action==='confirm-reset'){
  if(body.confirmation!=='DELETE VERIFIED DATABASE RECORDS')throw Error('Enter the additional confirmation phrase.');
  const verified=await verifyReset(a,body,state);if(!verified.match)return reply(verified);
  if(!body.digest||verified.digest!==body.digest)throw Error('Database records changed after comparison. Review the new comparison before confirming.');
  if(body.backupSaved!==true||!body.backupToken)throw Error('Download the Excel backup and confirm that you saved it first.');
  await rpc('sheet_archive_excel194',{p_actor:a.id,p_mode:'reset',p_digest:verified.digest,p_token:body.backupToken});
  await rpc('sheet_archive_permit194',{p_actor:a.id,p_mode:'reset',p_pack:verified.pack,p_digest:verified.digest});
  const result=checked(await a.user.rpc('scoped_reset14232',{p_backup:verified.pack,p_apply:true,p_confirmation:'RESET SELECTED DATA'}));
  return reply(result);
 }
 if(body.action==='confirm-year'){
  const verified=await verifyYear(a,body,state);if(!verified.match)return reply(verified);
  if(body.confirmation!=='DELETE VERIFIED YEAR '+body.year||verified.digest!==body.digest)throw Error('The comparison or confirmation changed. Prepare a fresh backup.');
  if(body.backupSaved!==true||!body.backupToken)throw Error('Save the readable Excel backup before confirming.');
  await rpc('sheet_archive_excel194',{p_actor:a.id,p_mode:'year',p_digest:verified.digest,p_token:body.backupToken});
  const token=await rpc('sheet_archive_permit194',{p_actor:a.id,p_mode:'year',p_pack:verified.pack,p_digest:verified.digest});
  return reply(checked(await a.user.rpc('sheet_archive_delete_year194',{p_token:token,p_confirmation:body.confirmation})));
 }
 throw Error('Unsupported archive action');
 }catch(e){return reply({error:String(e.message)},400);}});
