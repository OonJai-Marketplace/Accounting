import {admin,auth,connection,googleToken,reply} from '../_shared/google143150.ts';

const headers=['Revision part','Table','Operation','Captured UTC','Record ID','Part','Original JSON'];
const columns="'Source Records'!A:G";
async function lease(token:string,release=false){
 const result=await admin.rpc('portable_sheet_lease328',{p_token:token,p_release:release});
 if(result.error)throw Error(result.error.message);
 return result.data;
}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return reply({});
 const token=crypto.randomUUID();let held=false;
 try{
  await auth(req,true);
  const {rows}=await req.json();
  if(!Array.isArray(rows)||!rows.length||rows.length>500||rows.some((r:unknown)=>!Array.isArray(r)||r.length!==7||
   !/^portable-[0-9a-f]{64}:\d+$/.test(String(r[0]))||r[2]!=='BACKUP'||String(r[6]).length>28000))throw Error('Choose an accounting Sheets archive file.');
  const cfg=await lease(token);held=true;
  const saved=await connection(cfg.connection);
  if(!saved)throw Error('Connect the company Google archive account in Settings.');
  const access=await googleToken(saved);
  const api=async(path:string,body?:object)=>{
   const result=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(cfg.sheet)+path,{
    method:body?'POST':'GET',headers:{Authorization:'Bearer '+access,'Content-Type':'application/json'},
    body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(25000)});
   const data=await result.json();
   if(!result.ok)throw Error(data.error?.message||'Google Sheets could not process the append.');
   return data;
  };
  const read=async(range:string)=>(await api('/values/'+encodeURIComponent(range)+'?valueRenderOption=UNFORMATTED_VALUE')).values||[];
  const head=await read("'Source Records'!A1:G1");
  if(JSON.stringify(head[0])!==JSON.stringify(headers))throw Error('The Source Records headings do not match the archive format.');
  const index=new Set((await read("'Source Records'!A2:A")).map((r:unknown[])=>String(r[0])));
  const additions=rows.filter((r:string[])=>{if(index.has(r[0]))return false;index.add(r[0]);return true;});
  if(additions.length){
   const result=await api('/values/'+encodeURIComponent(columns)+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS&includeValuesInResponse=true',{values:additions});
   const actual=result.updates?.updatedData?.values;
   if(!actual||JSON.stringify(actual)!==JSON.stringify(additions))throw Error('Google did not confirm every appended cell. Retry the same file to check the saved rows.');
  }
  return reply({added:additions.length,existing:rows.length-additions.length,sheet:cfg.sheet});
 }catch(error){return reply({error:error instanceof Error?error.message:String(error)},400);}
 finally{if(held)await lease(token,true).catch(()=>{});}
});
