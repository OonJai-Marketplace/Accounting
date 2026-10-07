/* Prioritize the authorized destination, then load other datasets on demand. */
(()=>{'use strict';let job;
function requirements(view){
 if(view==='settings-users'||view==='sub-users-home14229')return ['reference','profiles'];
 if(view==='document-editor105'||view==='settings-business')return ['business'];
 if(view==='settings-legal')return ['business','legal'];
 if(/sub-users-workspace|user-entry-review/.test(view))return ['reference','profiles','business'];
 if(/chart|sub-account|currency/.test(view))return ['reference'];
 if(/^settings-/.test(view))return ['business'];
 return ['reference','journal','business'];
}
function pending(show,message='Loading this area…',retry){document.body.classList.toggle('startup-pending1443',show);let box=document.getElementById('startup1443');if(!box){box=document.createElement('section');box.id='startup1443';box.setAttribute('role','status');box.innerHTML='<p></p><button type="button" class="je-btn">Retry this area</button>';document.body.append(box)}box.hidden=!show;box.querySelector('p').textContent=message;const b=box.querySelector('button');if(b){b.hidden=!retry;b.onclick=retry||null}}
function ready(){
 window.startupData1443=async function(check){const actor=liveProfile.id;const current={actor,loaded:new Map(),done:new Set()};job=current;
 const tasks={reference:()=>loadReferenceDataFromSupabase(),journal:()=>loadJournalFromSupabase(),business:()=>loadBusinessSettingsFromSupabase(),profiles:()=>loadProfilesFromSupabase(),legal:()=>loadLegalDocumentsFromSupabase(),submissions:()=>loadSubmissionsFromSupabase()};
 const run=name=>{if(!current.loaded.has(name)){const promise=Promise.resolve().then(()=>{check();if(job!==current||liveProfile?.id!==actor)throw Error('Session changed');if(name==='journal')return run('reference')}).then(tasks[name]).then(value=>{check();if(job!==current||liveProfile?.id!==actor)throw Error('Session changed');current.done.add(name);return value}).catch(e=>{current.loaded.delete(name);throw e});current.loaded.set(name,promise)}return current.loaded.get(name)};
 current.activate=async()=>{if(job!==current||liveProfile?.id!==actor)return;const view=Location69.view;window.startup14257.interactive=false;pending(true,'Loading '+(document.querySelector('.tab-content.active h2,.tab-content.active h3')?.textContent||'this area')+'…');try{const required=requirements(view);if(document.documentElement.dataset.device132==='phone')required.push('reference','profiles','business');await Promise.all([...new Set(required)].map(run));if(/sub-user|user-entry-review/.test(view)&&window.workflowReady1443)await window.workflowReady1443;check();if(job===current&&liveProfile?.id===actor&&Location69.view===view){pending(false);window.startup14257.interactive=true}}catch(e){if(job===current&&liveProfile?.id===actor&&Location69.view===view)pending(true,'This area could not load: '+e.message,()=>current.activate())}};
 // Authentication and permissions have already completed; show navigation now.
 window.releaseLogin1443?.();await current.activate();return current.done.size>0;
 };
 const change=window.switchTab;window.switchTab=function(...args){const r=change.apply(this,args);job?.activate();return r};
 const accountChange=window.scrollToAccountModule;window.scrollToAccountModule=function(...args){const r=accountChange.apply(this,args);job?.activate();return r};
}
window.startup14257={requirements};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
