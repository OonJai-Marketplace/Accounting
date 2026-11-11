/* The signed file keeps exact database numeric values through browsers and Excel. */
(()=>{
'use strict';
const modules={journal:'Journal & history',staff:'Staff reports & cashier',payroll:'Payroll & attendance',tax:'Tax & SSO',vouchers:'Vouchers',reports:'Operational reports',schedules:'Scheduled occurrences',reconciliation:'Reconciliation',audit:'Audit logs & deletion history'};
const $=id=>document.getElementById(id);
function chunks(text,size){
 const out=[];
 for(let start=0;start<text.length;){
  let end=Math.min(start+size,text.length);
  if(end<text.length&&/[\uD800-\uDBFF]/.test(text[end-1]))end--;
  out.push(text.slice(start,end));start=end;
 }
 return out;
}
function rawTables(pack){
 const tables={...pack.reference,...pack.tables},attendance=[];
 for(const part of pack.attendance||[])for(const item of part.items){
  attendance.push(JSON.stringify({run_id:part.id,employee_id:item.employee,source:item.bucket,date:item.day.date,day:item.day}));
 }
 if(attendance.length)tables.attendance_days=attendance;
 return tables;
}
function viewsOf(pack){
 const views={};
 for(const [table,source] of Object.entries(rawTables(pack))){
  if(!source.length)continue;
  const rows=source.map(line=>JSON.parse(line)),widths=new Map();
  const display=v=>v==null?'':typeof v==='object'?JSON.stringify(v):v;
  for(const row of rows)for(const [field,val] of Object.entries(row)){
   const v=display(val),n=typeof v==='string'?chunks(v,30000).length:1;
   widths.set(field,Math.max(widths.get(field)||1,n));
  }
  const grid=[[...widths].flatMap(([name,n])=>Array.from({length:n},(_,i)=>i?name+' (part '+(i+1)+')':name))];
  for(const row of rows)grid.push([...widths].flatMap(([name,n])=>{
   const v=display(row[name]),parts=typeof v==='string'?chunks(v,30000):[v];
   return Array.from({length:n},(_,i)=>parts[i]??'');
  }));
  views[table]=grid;
 }
 return views;
}
async function workbook(file,pack){
 const blob=await archiveXlsx129.create({format:'oonjai-readable-194',rawValues:true,views:viewsOf(pack)});
 const zip=await JSZip.loadAsync(await blob.arrayBuffer());
 const xml=JSON.stringify(file).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 zip.file('customXml/item1.xml',new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><backup xmlns="urn:oonjai:portable:328">'+xml+'</backup>'));
 const path='xl/_rels/workbook.xml.rels';
 zip.file(path,(await zip.file(path).async('string')).replace('</Relationships>','<Relationship Id="portableBackup" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml" Target="../customXml/item1.xml"/></Relationships>'));
 return zip.generateAsync({type:'blob',compression:'DEFLATE'});
}
async function readBackup(file){
 if(!/\.xlsx$/i.test(file.name))return JSON.parse(await file.text());
 await optionalTools14335.load('zip');
 const zip=await JSZip.loadAsync(await file.arrayBuffer()),part=zip.file('customXml/item1.xml');
 if(!part)throw Error('Choose the original Raw Excel workbook or the restorable JSON downloaded here.');
 const doc=new DOMParser().parseFromString(new TextDecoder().decode(await part.async('uint8array')),'application/xml');
 if(doc.documentElement.namespaceURI!=='urn:oonjai:portable:328')throw Error('The workbook backup is unreadable.');
 return JSON.parse(doc.documentElement.textContent);
}
async function sheetRows(pack){
 const result=[],encoder=new TextEncoder(),now=new Date().toISOString();
 for(const [table,rows] of Object.entries(rawTables(pack))){
  for(const raw of rows){
   const row=JSON.parse(raw),key=(table==='attendance_days'?['run_id','employee_id','source','date']:pack.keys[table]).map(k=>row[k]);
   const id=key.length===1?String(key[0]):JSON.stringify(key);
   const bytes=await crypto.subtle.digest('SHA-256',encoder.encode(table+'\n'+raw));
   const hash=Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
   chunks(raw,28000).forEach((part,i)=>result.push(['portable-'+hash+':'+(i+1),table,'BACKUP',now,id,String(i+1),part]));
  }
 }
 return result;
}
const csv=rows=>'\ufeff'+rows.map(row=>row.map(v=>'"'+v.replaceAll('"','""')+'"').join(',')).join('\r\n');
function downloadUrl(url,name){
 const link=document.createElement('a');
 link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
}
function save(blob,name){
 const url=URL.createObjectURL(blob);
 try{downloadUrl(url,name);}finally{setTimeout(()=>URL.revokeObjectURL(url),60000);}
}
async function deletionZip(file,pack,stem){
 const raw=await workbook(file,pack),zip=new JSZip();
 zip.file(stem+'-Raw.xlsx',await raw.arrayBuffer(),{compression:'STORE'});
 zip.file(stem+'-Backup.json',new TextEncoder().encode(JSON.stringify(file)),{compression:'DEFLATE'});
 return zip.generateAsync({type:'blob',mimeType:'application/zip'});
}
function install(host,legacy){
 const section=document.createElement('section');section.id='portable328';section.className='panel113';
 section.innerHTML='<header><h2>Backup &amp; Recovery</h2></header><fieldset><legend>Period and records</legend><div class="portable-fields"><label>Period<select name="period"><option value="month">Month</option><option value="custom">Custom dates</option><option value="year">Year</option><option value="quarter">Quarter</option></select></label><label data-for="month">Month<input type="month" name="month"></label><label data-for="year quarter">Year<input type="number" name="year" min="1900" max="2200"></label><label data-for="quarter">Quarter<select name="quarter"><option>1</option><option>2</option><option>3</option><option>4</option></select></label><label data-for="custom">From<input type="date" name="from"></label><label data-for="custom">Through<input type="date" name="to"></label></div><details class="portable-modules"><summary>All modules</summary><label><input type="checkbox" data-all checked> Select all</label>'+Object.entries(modules).map(([k,v])=>'<label><input type="checkbox" data-module="'+k+'" checked> '+v+'</label>').join('')+'</details></fieldset>'+
 '<fieldset><legend>Download</legend><div class="portable-actions"><button data-act="excel">Raw Excel (.xlsx)</button><button data-act="backup">Restorable backup (.json)</button><button data-act="csv">Google Sheets (.csv)</button></div></fieldset>'+
 '<fieldset><legend>Database</legend><div class="portable-actions"><button data-act="restore">Restore from file</button><button data-act="delete" class="portable-danger">Delete selected records</button></div><p>Restore accepts an original Excel or JSON backup. Deletion first downloads a ZIP with the raw Excel data and restorable JSON. Locked periods are included. Employee records, leave requests and leave balances stay in HR. Partial payroll months remove only attendance on the selected dates.</p></fieldset><p role="status" aria-live="polite"></p>';
 host.replaceChildren(section);if(legacy)section.append(legacy);
 const get=name=>section.querySelector('[name="'+name+'"]'),msg=section.querySelector('[role=status]'),all=section.querySelector('[data-all]'),boxes=[...section.querySelectorAll('[data-module]')];
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Vientiane'}).format(new Date());
 get('month').value=today.slice(0,7);get('year').value=today.slice(0,4);get('from').value=today.slice(0,4)+'-01-01';get('to').value=today;
 function sync(e){
  section.querySelectorAll('[data-for]').forEach(n=>n.hidden=!n.dataset.for.split(' ').includes(get('period').value));
  if(e?.target===all)boxes.forEach(n=>n.checked=all.checked);
  const selected=boxes.filter(n=>n.checked);
  all.checked=selected.length===boxes.length;all.indeterminate=!!selected.length&&!all.checked;
  section.querySelector('.portable-modules summary').textContent=all.checked?'All modules':selected.length===1?modules[selected[0].dataset.module]:selected.length+' modules selected';
 }
 section.addEventListener('change',sync);sync();
 function selection(){
  const period=get('period').value,month=get('month').value,year=Number(period==='month'?month.slice(0,4):get('year').value),q=Number(get('quarter').value);
  const start=period==='month'?Number(month.slice(5)):period==='quarter'?(q-1)*3+1:1,length=period==='month'?1:period==='quarter'?3:12;
  const date=(m,d)=>new Date(Date.UTC(year,m-1,d)).toISOString().slice(0,10);
  if(period!=='custom'&&(!year||!start))throw Error('Choose a valid period.');
  const from=period==='custom'?get('from').value:date(start,1),to=period==='custom'?get('to').value:date(start+length,0);
  if(!from||!to||from>to)throw Error('Choose a valid start and end date.');
  const groups=boxes.filter(n=>n.checked).map(n=>n.dataset.module);
  if(!groups.length)throw Error('Select at least one module.');
  return {p_from:from,p_to:to,p_groups:groups};
 }
 let busy=false;
 async function action(kind,upload){
  if(busy)return;
  const actor=liveProfile?.id,db=ojmDb;
  const guard=()=>{if(!actor||actor!==liveProfile?.id||db!==ojmDb||!window.shell113?.admin())throw Error('Please sign in again as administrator.');};
  const rpc=async(action,params)=>{guard();const {data,error}=await db.rpc('portable_backup328',{p_action:action,...params});guard();if(error)throw Error(error.message);return data;};
  const fieldsets=[...section.querySelectorAll(':scope>fieldset')];
  busy=true;fieldsets.forEach(n=>n.disabled=true);msg.textContent='Working…';
  try{
   guard();
   const sel=upload?null:selection();
   const confirm=(title,html,label,danger=false)=>ui108.modal(title,html,[{label:'Cancel',value:false},{label,value:true,danger,primary:!danger}]);
   const period=r=>escapeHtml(formatAppDate(r.from))+' – '+escapeHtml(formatAppDate(r.to));
   const describe=r=>'<p>'+period(r)+' · '+r.modules.map(k=>escapeHtml(modules[k])).join(', ')+'</p>';
   if(kind==='delete'||kind==='restore'){
    const restoring=kind==='restore';
    msg.textContent=restoring?'Reading backup…':'Preparing the backup for this selection…';
    const file=restoring?await readBackup(upload):await rpc('export',sel);
    const info=await rpc('inspect',{p_file:file});
    if(!info.counts||!Object.hasOwn(info.counts,'audit_log')||Object.hasOwn(info.counts,'payroll_leave_records'))throw Error('This backup or database predates HR leave protection.');
    if(!info.total){msg.textContent='There are no matching operational records.';return;}
    const summary=describe(info)+'<p>'+info.total.toLocaleString()+' affected records.</p>';
    let agreed=false;
    if(restoring){
     agreed=await confirm('Restore backup?',summary+'<p>Existing identical records are skipped.</p>','Restore records');
    }else{
     const pack=JSON.parse(file.payload),stem='Oon-Jai-'+info.from+'-to-'+info.to;
     const name=stem+'-Before-Deletion.zip';
     msg.textContent='Creating the raw Excel and restorable JSON files…';
     const blob=await deletionZip(file,pack,stem);guard();
     const url=URL.createObjectURL(blob);
     try{
      downloadUrl(url,name);
      agreed=await confirm('Save the ZIP before deleting',summary+'<p>Check Downloads for <strong>'+name+'</strong>. The ZIP contains the raw Excel workbook and restorable JSON.</p><p><a href="'+url+'" download="'+name+'">Download the ZIP again</a></p><p>Confirm after the ZIP is saved. This permanently clears the selected records, including locked periods.</p>','ZIP saved — permanently delete',true);
     }finally{setTimeout(()=>URL.revokeObjectURL(url),60000);}
    }
    if(!agreed){msg.textContent='Cancelled.';return;}
    const result=await rpc(restoring?'restore':'delete',restoring?{p_file:file}:{...sel,p_expected:file.signature});
    msg.textContent=restoring?result.changed+' records restored. '+result.alreadyPresent+' already present.':result.changed+' records cleared.';
    window.yearWindow14333?.invalidateMemory();
    window.dispatchEvent(new CustomEvent('transactions-reset14316',{detail:{scopes:info.modules}}));
    if(result.changed){
     const saved=msg.textContent;
     try{
      await window.localFirst14333?.invalidateConfirmed();guard();
      await window.startup14257?.revalidate?.(true,{includeInboxes:false});guard();
      msg.textContent=saved;
     }catch{if(actor===liveProfile?.id&&db===ojmDb)msg.textContent=saved+' Refresh the workspace to reload reports.';}
    }
    return;
   }
   const file=await rpc('export',sel),pack=JSON.parse(file.payload);
   const stem='Oon-Jai-'+pack.from+'-to-'+pack.to;
   if(!Object.hasOwn(pack.tables,'audit_log')||Object.hasOwn(pack.tables,'payroll_leave_records'))throw Error('The database backup update is still pending.');
   if(kind==='backup'){save(new Blob([JSON.stringify(file)],{type:'application/json'}),stem+'-Backup.json');msg.textContent='Backup downloaded.';return;}
   if(kind==='excel'){const blob=await workbook(file,pack);guard();save(blob,stem+'-Raw.xlsx');msg.textContent='Raw Excel downloaded.';return;}
   if(kind==='csv'){const rows=await sheetRows(pack);guard();save(new Blob([csv(rows)],{type:'text/csv;charset=utf-8'}),stem+'-Source-Records.csv');msg.textContent='CSV downloaded.';}
  }catch(e){if(actor===liveProfile?.id&&db===ojmDb)msg.textContent=e.message||String(e);}
  finally{busy=false;fieldsets.forEach(n=>n.disabled=false);}
 }
 section.addEventListener('click',e=>{
  const kind=e.target.closest('[data-act]')?.dataset.act;if(!kind||busy)return;
  if(kind==='restore'){
   const input=document.createElement('input');input.type='file';input.accept='.json,.xlsx';
   input.onchange=()=>{if(input.files[0])void action(kind,input.files[0]);};input.click();
  }else void action(kind);
 });
}
window.portable328={install};
})();
