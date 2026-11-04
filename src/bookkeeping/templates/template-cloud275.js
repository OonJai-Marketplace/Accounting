/* Private, revision-checked template recovery. Financial journals are never touched. */
(()=>{'use strict';
const key=TemplateStore.key,numberKey=key+':numbers143125',metaKey=key+':cloud275',backupKey=key+':recovery275';
const empty=()=>({templates:[],numbers:{next:1,ids:{}}});
const canonical=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const equal=(a,b)=>canonical(a)===canonical(b);
const when=value=>Number.isFinite(Date.parse(value))?(typeof formatAppDate==='function'?formatAppDate(value)+' '+new Date(value).toLocaleTimeString():new Date(value).toLocaleString()):value;
let flight=null,timer=null,state={owner:'',message:'Cloud copy not checked.',conflict:null};
function guard(owner){if(!owner||TemplateStore.actor()!==owner||window.deviceVault14334&&(!deviceVault14334.unlocked||deviceVault14334.actor&&deviceVault14334.actor!==owner))throw Error('Account locked or changed. Reopen Templates after signing in.');}
function validate(value){
 if(!value||!Array.isArray(value.templates)||!value.numbers?.ids||!Number.isSafeInteger(value.numbers.next)||value.numbers.next<1)throw Error('Invalid template backup; the saved copies have been retained.');
 const ids=new Set(),numbers=new Set();
 for(const t of value.templates){if(!t||typeof t.id!=='string'||!t.id||ids.has(t.id)||!t.deleted&&(typeof t.name!=='string'||!Array.isArray(t.lines)))throw Error('Invalid or duplicate template identity.');ids.add(t.id);}
 for(const [id,n] of Object.entries(value.numbers.ids)){if(!id||!Number.isSafeInteger(n)||n<1||n>=value.numbers.next||numbers.has(n))throw Error('Invalid or duplicate permanent template number.');numbers.add(n);}
 return value;
}
function snapshot(){return validate({templates:JSON.parse(localStorage.getItem(key)||'[]'),numbers:JSON.parse(localStorage.getItem(numberKey)||'{"next":1,"ids":{}}')});}
function missingContent(data=snapshot()){const present=new Set(data.templates.map(t=>t.id));return Object.entries(data.numbers.ids).filter(([id])=>id.startsWith('tpl-')&&!present.has(id)).map(([id,number])=>({id,number}));}
function retainedCopies(){const backups=JSON.parse(localStorage.getItem(backupKey)||'[]'),previous=localStorage.getItem(key+':previous274');if(previous)backups.unshift({at:'Previous device save',data:{templates:JSON.parse(previous)}});return backups;}
function recoverMissingRetained(owner){
 const before=snapshot(),missing=missingContent(before),copies=retainedCopies(),restored=[];
 for(const {id} of missing){const candidates=new Map();for(const backup of copies)for(const item of backup.data?.templates||[])if(item.id===id&&!item.deleted&&typeof item.name==='string'&&Array.isArray(item.lines)&&item.lines.length)candidates.set(canonical(item),item);if(candidates.size===1)restored.push(structuredClone([...candidates.values()][0]));}
 if(restored.length){install(owner,{templates:[...before.templates,...restored],numbers:before.numbers},before);}
 return restored.length;
}
function metadata(){const raw=localStorage.getItem(metaKey);if(!raw)return {version:0,base:empty()};const m=JSON.parse(raw);if(!Number.isSafeInteger(m.version)||m.version<0)throw Error('Invalid template sync metadata. Saved copies are retained.');validate(m.base);return m;}
function merge(base,local,remote,choices={}){
 [base,local,remote].forEach(validate);
 const by=x=>new Map(x.templates.map(t=>[t.id,t])),b=by(base),l=by(local),r=by(remote),templates=[],conflicts=[];
 for(const id of new Set([...b.keys(),...l.keys(),...r.keys()])){
  const before=b.get(id),left=l.get(id),right=r.get(id);let selected;
  if(equal(left,right))selected=left;
  else if(equal(left,before))selected=right;
  else if(equal(right,before))selected=left;
  else if(choices[id]==='device')selected=left;
  else if(choices[id]==='cloud')selected=right;
  else {conflicts.push({id,device:left,cloud:right});continue;}
  if(selected)templates.push(selected);else if(before)templates.push({id,deleted:true});
 }
 const ids={...remote.numbers.ids},used=new Map(Object.entries(ids).map(([id,n])=>[n,id]));let numberConflict=false;
 for(const [id,n] of Object.entries(local.numbers.ids)){
  if(Object.hasOwn(ids,id)&&ids[id]!==n||used.has(n)&&used.get(n)!==id){numberConflict=true;continue;}
  ids[id]=n;used.set(n,id);
 }
 return {data:{templates,numbers:{next:Math.max(local.numbers.next,remote.numbers.next),ids}},conflicts,numberConflict};
}
function announce(owner,message,conflict=null){guard(owner);state={owner,message,conflict};paint();}
function status(){const owner=TemplateStore.actor();if(state.owner!==owner)return 'Cloud copy not checked.';return state.message;}
function paint(){const node=document.getElementById('templateCloudStatus275');if(node)node.textContent=status();const review=document.getElementById('templateConflict275');if(review)review.hidden=!(state.owner===TemplateStore.actor()&&state.conflict);}
function writeVerified(k,value){const raw=JSON.stringify(value);localStorage.setItem(k,raw);if(localStorage.getItem(k)!==raw)throw Error('The device save could not be verified.');}
function archive(owner,data){guard(owner);const previous=JSON.parse(localStorage.getItem(backupKey)||'[]');previous.unshift({at:new Date().toISOString(),data});writeVerified(backupKey,previous.slice(0,8));}
function install(owner,data,expected){
 guard(owner);if(!equal(snapshot(),expected))throw Error('Templates changed on this device during sync. Retry to merge the latest copy.');
 if(TemplateStore.owner===owner&&TemplateStore.loaded&&JSON.stringify(TemplateStore.templates)!==TemplateStore.baseline&&!(TemplateStore.baseline===null&&TemplateStore.templates.length===0))throw Error('Finish the open template edit before syncing.');
 const oldTemplates=localStorage.getItem(key),oldNumbers=localStorage.getItem(numberKey);
 if(equal(data,expected))return;
 archive(owner,expected);
 try{writeVerified(numberKey,data.numbers);writeVerified(key,data.templates);}catch(e){try{if(oldNumbers===null)localStorage.removeItem(numberKey);else localStorage.setItem(numberKey,oldNumbers);if(oldTemplates===null)localStorage.removeItem(key);else localStorage.setItem(key,oldTemplates);}catch{}throw e;}
 TemplateStore.loaded=false;TemplateStore.load();
}
async function sync(options={}){
 const owner=TemplateStore.actor();try{guard(owner);}catch{return false;}
 if(flight?.owner===owner)return flight.promise;
 const job={owner};flight=job;
 job.promise=(async()=>{
  try{
   if(navigator.onLine===false)throw Error('Offline. Device copy retained; cloud confirmation pending.');
   if(typeof ojmDb==='undefined'||!ojmDb)throw Error('Cloud connection is not ready. Device copy retained.');
   if(!TemplateStore.load())return false;
   if(JSON.stringify(TemplateStore.templates)!==TemplateStore.baseline&&!(TemplateStore.baseline===null&&TemplateStore.templates.length===0))throw Error('Finish the open template edit before syncing.');
   const recovered=recoverMissingRetained(owner);
   announce(owner,'Checking saved templates…');
   const client=ojmDb,local=snapshot(),meta=metadata();
   const result=await client.from('journal_template_collections275').select('data,version,updated_at').eq('owner_id',owner).maybeSingle();guard(owner);if(client!==ojmDb)throw Error('Connection changed; retry template sync.');if(result.error)throw result.error;
   const remote=result.data,server=remote?validate(remote.data):empty();
   if(meta.version&&(!remote||remote.version<meta.version))throw Error('Cloud revision is older than the verified copy. Both copies have been retained.');
   if(options.expected&&(!equal(options.expected.local,local)||!equal(options.expected.server,server)))throw Error('A saved copy changed during review. Check again before choosing a version.');
   const merged=merge(meta.base,local,server,options.choices);
   if(merged.conflicts.length||merged.numberConflict){announce(owner,merged.numberConflict?'Permanent template numbers conflict. Both copies retained for review.':'Templates changed on two devices. Choose the version to keep.',{...merged,local,server,version:remote?.version||0});return false;}
   // Old browsers may not yet have numbered every custom template.
   for(const t of merged.data.templates)if(!Object.hasOwn(merged.data.numbers.ids,t.id))merged.data.numbers.ids[t.id]=merged.data.numbers.next++;
   let confirmed=remote;
   if(!equal(merged.data,server)){
    const values={data:merged.data,version:(remote?.version||0)+1};
    const query=remote?client.from('journal_template_collections275').update(values).eq('owner_id',owner).eq('version',remote.version):client.from('journal_template_collections275').insert({owner_id:owner,...values});
    const saved=await query.select('data,version,updated_at').maybeSingle();guard(owner);if(client!==ojmDb)throw Error('Connection changed; recheck cloud confirmation.');
    if(saved.error)throw saved.error;if(!saved.data||!equal(saved.data.data,merged.data))throw Error('Cloud copy changed during saving. Device copy retained; retry to merge.');confirmed=saved.data;
   }
   // Do not erase edits that arrived while the cloud request was in flight.
   install(owner,merged.data,local);
   writeVerified(metaKey,{version:confirmed?.version||0,base:merged.data,at:confirmed?.updated_at||new Date().toISOString()});
   const missing=missingContent(merged.data);
   announce(owner,(recovered?'Recovered '+recovered+' custom template(s) from retained device copies. ':'')+'Device and cloud copies confirmed'+(confirmed?.updated_at?' · '+when(confirmed.updated_at):'.')+(missing.length?' · '+missing.length+' old custom template numbers have no saved content. Open Recover templates to trace them.':''));return true;
  }catch(e){if(TemplateStore.actor()===owner&&(!window.deviceVault14334||deviceVault14334.unlocked)){state={owner,message:'Device data retained; cloud pending: '+(e.message||String(e)),conflict:null};paint();}return false;}
  finally{if(flight===job)flight=null;}
 })();return job.promise;
}
function queue(){clearTimeout(timer);const owner=TemplateStore.actor();state={owner,message:'Saved on this device; cloud confirmation pending.',conflict:null};paint();timer=setTimeout(()=>{if(TemplateStore.actor()===owner)void sync();},800);}
async function check(){await sync();await renderTemplateManager();}
function decorate(host){
 const box=document.createElement('div');box.className='template-item-actions';
 const statusNode=document.createElement('p');statusNode.id='templateCloudStatus275';statusNode.className='je-subtitle';statusNode.setAttribute('role','status');statusNode.textContent=status();host.prepend(statusNode);
 for(const [label,action,id] of [['Check cloud copy',check],['Recover templates',recover],['Export templates',exportCopy],['Import templates',importCopy],['Review conflict',review,'templateConflict275']]){const b=document.createElement('button');b.type='button';b.className='je-btn je-btn-secondary';b.textContent=label;b.onclick=()=>Promise.resolve().then(action).catch(e=>showAppNotification('Templates',e.message,true));if(id)b.id=id;box.append(b);}statusNode.after(box);paint();
}
function exportCopy(){guard(TemplateStore.actor());const blob=new Blob([JSON.stringify({format:'oonjai-templates-275',owner:TemplateStore.actor(),...snapshot()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='oonjai-templates.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function restoreOne(item,asCopy=false){
 const owner=TemplateStore.actor();guard(owner);TemplateStore.load();const before=snapshot(),id=asCopy?'tpl-'+crypto.randomUUID():item.id;
 if(!await ui117.confirm((asCopy?'Create a new numbered copy of':'Restore')+' template “'+item.name+'”?'))return;
 guard(owner);if(!equal(before,snapshot()))throw Error('Templates changed during recovery. Reopen the recovery list.');
 const previous=structuredClone(TemplateStore.templates);archive(owner,before);
 TemplateStore.templates=TemplateStore.templates.filter(t=>t.id!==id);TemplateStore.templates.push({...structuredClone(item),id,deleted:false,builtin:false});
 try{await ensureTemplateNumbers143125();await TemplateStore.save();}catch(e){TemplateStore.templates=previous;throw e;}
 await renderTemplateManager();
}
function recoveryList(candidates,title){
 const owner=TemplateStore.actor();guard(owner);const host=document.getElementById('templateManagerList');host.replaceChildren();const h=document.createElement('p');h.textContent=title;host.append(h);
 const back=document.createElement('button');back.className='je-btn je-btn-secondary';back.textContent='Back to templates';back.onclick=renderTemplateManager;host.append(back);
 const cloud=document.createElement('button');cloud.className='je-btn je-btn-secondary';cloud.textContent='Restore verified cloud copy';cloud.onclick=()=>restoreCloud().catch(e=>showAppNotification('Recovery paused',e.message,true));host.append(cloud);
 for(const {item,copy=false,label='Saved copy'} of candidates){if(item.deleted)continue;const row=document.createElement('div');row.className='template-item';const text=document.createElement('div');text.textContent=item.name+' · '+item.lines.length+' lines · '+label;const detail=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent='View accounts and descriptions';pre.textContent=JSON.stringify(item,null,2);detail.append(summary,pre);text.append(detail);const b=document.createElement('button');b.className='je-btn je-btn-secondary';b.textContent=copy?'Import as new template':'Restore this version';b.onclick=async()=>{try{guard(owner);await restoreOne(item,copy);}catch(e){showAppNotification('Recovery paused',e.message,true);}};row.append(text,b);host.append(row);}
 if(!candidates.length){const p=document.createElement('p');p.textContent='No previous templates were found on this browser. Open the original signed-in browser to sync its retained copy, or import a template backup.';host.append(p);}
}
function recover(){guard(TemplateStore.actor());const current=snapshot(),items=[],seen=new Set();const previous=localStorage.getItem(key+':previous274');const backups=JSON.parse(localStorage.getItem(backupKey)||'[]');if(previous)backups.unshift({at:'Previous local save',data:{templates:JSON.parse(previous)}});
 for(const backup of backups)for(const item of backup.data.templates||[]){const signature=canonical(item);if(!item.deleted&&!seen.has(signature)&&!current.templates.some(t=>equal(t,item))){seen.add(signature);const n=backup.data.numbers?.ids?.[item.id],existing=current.numbers.ids[item.id];items.push({item,copy:!Number.isSafeInteger(existing)||!!(n&&n!==existing),label:when(backup.at)});}}
 recoveryList(items,'Choose a retained version. Recovery does not change journal entries.');
 const missing=missingContent(current);if(missing.length){const p=document.createElement('p');p.textContent='Trace: custom template '+missing.map(x=>'#'+x.number+' ('+x.id+')').join(', ')+' still has a permanent number, but its accounts and memos are missing from the current copy. Numbers are reserved. This browser’s previous save and retained versions were checked. A built-in starter is not the recovered original.';document.getElementById('templateManagerList').append(p);}
}
function importCopy(){const owner=TemplateStore.actor();guard(owner);const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{try{guard(owner);const file=input.files[0];if(!file)return;if(file.size>2097152)throw Error('Template backup exceeds 2 MB.');const data=JSON.parse(await file.text());guard(owner);if(data.format!=='oonjai-templates-275')throw Error('Choose an Oon Jai template export.');validate(data);recoveryList(data.templates.filter(t=>!t.deleted).map(item=>({item,copy:true,label:'Imported copy · new ID and number'})),'Review the backup. Selected templates are imported as new copies; existing IDs and numbers are preserved.');}catch(e){showAppNotification('Import paused',e.message,true);}};input.click();}
async function restoreCloud(){
 const owner=TemplateStore.actor();guard(owner);const keys=[key,numberKey,metaKey],before=keys.map(k=>localStorage.getItem(k)),client=ojmDb;
 const result=await client.from('journal_template_collections275').select('data,version,updated_at').eq('owner_id',owner).maybeSingle();guard(owner);if(client!==ojmDb)throw Error('Connection changed.');if(result.error)throw result.error;if(!result.data)throw Error('No verified cloud copy exists for this account yet. The device data has been retained.');
 const data=validate(result.data.data);if(!await ui117.confirm('Restore the verified cloud list ('+data.templates.filter(t=>!t.deleted).length+' custom templates) on this device? The current device data will be retained in recovery.'))return false;
 guard(owner);if(keys.some((k,i)=>localStorage.getItem(k)!==before[i]))throw Error('Device templates changed during review. Reopen recovery.');
 let valid;try{valid=snapshot();}catch{}
 if(valid)archive(owner,valid);else writeVerified(key+':damaged275',{at:new Date().toISOString(),templates:before[0],numbers:before[1],metadata:before[2]});
 try{writeVerified(numberKey,data.numbers);writeVerified(key,data.templates);writeVerified(metaKey,{version:result.data.version,base:data,at:result.data.updated_at});}
 catch(e){for(let i=0;i<keys.length;i++)try{if(before[i]===null)localStorage.removeItem(keys[i]);else localStorage.setItem(keys[i],before[i]);}catch{}throw e;}
 TemplateStore.loaded=false;TemplateStore.load();announce(owner,'Verified cloud copy restored; previous device data retained.');await renderTemplateManager();return true;
}
function renderFailure(host,error){
 host.replaceChildren();const p=document.createElement('p');p.textContent=error.message+' Saved data has been retained.';host.append(p);
 const button=document.createElement('button');button.className='je-btn je-btn-secondary';button.textContent='Restore verified cloud copy';button.onclick=()=>restoreCloud().catch(e=>showAppNotification('Recovery paused',e.message,true));host.append(button);
}
async function review(){
 const owner=TemplateStore.actor();guard(owner);const conflict=state.owner===owner&&state.conflict;if(!conflict)return;
 const host=document.getElementById('templateManagerList');host.replaceChildren();
 if(conflict.numberConflict){
  const p=document.createElement('p');p.textContent='These devices assigned different permanent numbers. Export this device copy first. You can keep the cloud list, retaining the device list in recovery, then import selected device templates as new numbered copies.';host.append(p);
  for(const [label,action] of [['Export device copy',exportCopy],['Keep cloud list and retain device recovery',async()=>{
   if(!await ui117.confirm('Use the cloud template list on this device? The current list will be retained in Recover templates. Existing cloud numbers will stay unchanged.'))return;guard(owner);
   const result=await ojmDb.from('journal_template_collections275').select('data,version,updated_at').eq('owner_id',owner).maybeSingle();guard(owner);if(result.error)throw result.error;
   if(!result.data||!equal(result.data.data,conflict.server)||!equal(snapshot(),conflict.local))throw Error('A saved copy changed. Check cloud copy again.');
   install(owner,conflict.server,conflict.local);writeVerified(metaKey,{version:result.data.version,base:conflict.server,at:result.data.updated_at});announce(owner,'Cloud list restored; previous device templates retained in recovery.');await renderTemplateManager();
  }],['Back',renderTemplateManager]]){const b=document.createElement('button');b.className='je-btn je-btn-secondary';b.textContent=label;b.onclick=()=>Promise.resolve().then(action).catch(e=>showAppNotification('Template conflict',e.message,true));host.append(b);}return;
 }
 const choices={};
 for(const item of conflict.conflicts){const box=document.createElement('div'),p=document.createElement('p');p.textContent='Choose the saved version of '+(item.device?.name||item.cloud?.name||item.id);box.append(p);
  for(const choice of ['device','cloud']){const detail=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent=choice==='device'?'This device':'Cloud';pre.textContent=JSON.stringify(item[choice]||{id:item.id,deleted:true},null,2);detail.append(summary,pre);box.append(detail);}
  const select=document.createElement('select');for(const [value,label] of [['','Choose version'],['device','Keep device'],['cloud','Keep cloud']]){const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o);}select.onchange=()=>{choices[item.id]=select.value;};box.append(select);host.append(box);
 }
 const save=document.createElement('button');save.className='je-btn je-btn-emerald';save.textContent='Save reviewed versions';save.onclick=async()=>{try{guard(owner);if(conflict.conflicts.some(x=>!choices[x.id]))throw Error('Choose a version for every conflicting template.');archive(owner,conflict.local);archive(owner,conflict.server);await sync({choices,expected:conflict});await renderTemplateManager();}catch(e){showAppNotification('Template conflict',e.message,true);}};host.append(save);
}
window.TemplateCloud275={sync,queue,decorate,status,merge,validate,recover,restoreOne,restoreCloud,renderFailure,snapshot,missingContent,recoverMissingRetained};
window.addEventListener('online',()=>void sync());
window.addEventListener('session-online14333',()=>void sync());
window.addEventListener('idle-sync14341',()=>void sync());
})();
