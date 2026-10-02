/* Version 83: legacy payroll schema compatibility, explicit examples and table alignment. */
const repairUrl83='setup/SETUP-GUIDE-v142.20.txt';
loadWork82=async function(force=false){
 if(!admin82()||!ojmDb||Work82.loading)return;
 if(Work82.loaded&&Work82.owner===liveProfile.id&&!force)return;
 const owner=liveProfile.id;Work82.loading=true;Work82.owner=owner;const failures=[];
 const results=await Promise.all(Object.entries(tables82).map(async([key,table])=>{
  try{const pages=[];for(let offset=0;;offset+=500){const page=await ojmDb.from(table).select('*').order('updated_at',{ascending:false}).order('id').range(offset,offset+499);if(page.error)throw page.error;pages.push(...(page.data||[]));if((page.data||[]).length<500)break}const r={data:pages};
   const rows=r.data||[],valid=rows.filter(x=>x.data&&typeof x.data==='object'&&(key!=='runs'||Array.isArray(x.data.rows)));
   if(key==='runs')Work82.legacyRuns83=rows.length-valid.length;
   return [key,valid];
  }catch(e){failures.push(table+': '+(e.message||'Could not load'));return [key,null]}
 }));
 if(liveProfile?.id!==owner){Work82.loading=false;return}
 results.forEach(([key,data])=>{if(data)Work82[key]=data});Work82.error=failures.join(' · ');Work82.loaded=!failures.length;Work82.loading=false;renderWork82();
};
storageNotice82=function(){return Work82.error?`<div class="notice82 warn82"><strong>Payroll storage needs repair.</strong><p>${esc82(Work82.error)}</p><p>The original payroll table needs additional columns. Run the complete version 83 SQL in the existing Supabase project's SQL Editor, check its result, then click Reload Records. This preserves existing payroll records and adds the requested examples.</p><a href="${repairUrl83}" download>Download payroll repair + two sample months</a>${action82('Reload Records','loadWork82(true)')}</div>`:Work82.loading?'<p class="notice82">Loading saved payroll records…</p>':''};
const renderBefore83=renderWork82;renderWork82=function(){renderBefore83();if(!desktop80.matches||!admin82())return;const id=document.querySelector('.tab-content.active')?.id;if(!['payroll-overview','payroll-history','report-payroll','payroll-employees','payroll-entries'].includes(id))return;const host=document.querySelector('#'+id+' .work82');if(!host)return;
 if(['payroll-overview','payroll-history','report-payroll'].includes(id)){
  const missing=PayrollSamples83.runs.filter(s=>!Work82.runs.some(r=>r.data.reference===s.data.reference));
  if(missing.length){const box=document.createElement('div');box.className='samples83';box.innerHTML=section82('PDF Sample Payroll — Preview',`<p class="notice82">These are examples, not paid or finalized payroll. August uses the supplied PDF inputs. September repeats them only to demonstrate a second month. Calculations use your current Settings; no saved settings are replaced.</p>`+table82(['Month','Reference','Employees','Status','Action'],[...missing].reverse().map(r=>[esc82(r.data.month),esc82(r.data.reference),r.data.rows.length,'Sample · not yet saved',action82('Open Sample',`previewRun83('${r.id}')`)])));host.append(box)}
  if(Work82.legacyRuns83){const note=document.createElement('p');note.className='notice82';note.textContent=Work82.legacyRuns83+' original-format payroll record(s) are preserved in the database. This screen lists the new payroll snapshots; original records have not been converted or deleted.';host.append(note)}
 }
 if(id==='payroll-entries'&&Work82.run?.isSample){const note=document.createElement('p');note.className='notice82 warn82';note.textContent='SAMPLE PAYROLL — '+Work82.run.notes;host.querySelector('header').after(note);host.querySelectorAll('button[onclick="saveRun82(true)"]').forEach(n=>n.remove());if(Work82.run.previewOnly83){host.querySelectorAll('button[onclick="saveRun82(false)"]').forEach(n=>n.remove());const p=document.createElement('p');p.className='notice82';p.innerHTML=`This is an unsaved preview. <a href="${repairUrl83}" download>Run the repair and sample SQL</a> to add both examples to Payroll History and Payroll Reports.`;host.append(p)}}
 host.querySelectorAll('a[href="setup/SETUP-GUIDE-v142.20.txt"]').forEach(a=>a.href=repairUrl83);alignTableHeaders83(host);
};
function previewRun83(id){const s=PayrollSamples83.runs.find(r=>r.id===id);if(!s)return;Work82.runRecord=null;Work82.run={...structuredClone(s.data),previewOnly83:true};switchTab('payroll-entries')}
const saveRunBefore83=saveRun82;saveRun82=function(finalize=false){if(Work82.run?.previewOnly83)return showCenterStatus('Install the repair and sample SQL to save these examples.',true);if(finalize&&Work82.run?.isSample)return showCenterStatus('A sample cannot be finalized as actual payroll. Create a real payroll run after reviewing your employee records.',true);return saveRunBefore83(finalize)};
const employeeFormBefore83=employeeForm82;employeeForm82=function(record){return employeeFormBefore83(record).replace('<div class="form-actions82">',`<div class="fields82">${check82('Sample employee — excluded from normal new payroll','isSample',record?.data?.isSample||false)}</div><div class="form-actions82">`)};
function alignTableHeaders83(root=document){root.querySelectorAll('table thead th,table thead td').forEach(n=>{if(n.closest('#document-editor105'))return;n.style.setProperty('text-align','left','important');n.style.setProperty('font-weight','700','important')})}
function alignAllHeaders83(){alignTableHeaders83()}
let headerPending83=false;function scheduleHeaders83(){if(headerPending83)return;headerPending83=true;requestAnimationFrame(()=>{headerPending83=false;alignAllHeaders83()})}
document.addEventListener('DOMContentLoaded',()=>{alignAllHeaders83();new MutationObserver(scheduleHeaders83).observe(document.body,{childList:true,subtree:true});renderWork82()});
window.addEventListener('beforeprint',alignAllHeaders83);
