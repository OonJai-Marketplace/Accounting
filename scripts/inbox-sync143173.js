/* One incremental Google check shared by both inboxes, independent of the active tab. */
(()=>{'use strict';
const consumers=new Map();let owner='',client=null,generation=0,job=null,lastCheck=0,sheet='',error='';
let snapshots={journal:null,hr:null};
const identity=()=>typeof liveProfile==='undefined'?'':liveProfile?.id||'';
const allowed=()=>identity()&&typeof ojmDb!=='undefined'&&ojmDb&&window.access113?.can('journal','post');
function reset(){owner=identity();client=typeof ojmDb==='undefined'?null:ojmDb;generation++;job=null;lastCheck=0;sheet='';error='';snapshots={journal:null,hr:null};for(const c of consumers.values())c.reset?.();}
function session(){if(owner!==identity()||client!==(typeof ojmDb==='undefined'?null:ojmDb))reset();}
function snapshot(name){session();return snapshots[name];}
function merge(previous,delta){if(!delta)return null;const groups=new Map(previous?.groups||[]),hashes={...(previous?.hashes||{})};const keep=new Set(delta.ids);for(const id of groups.keys())if(!keep.has(id)){groups.delete(id);delete hashes[id];}for(const item of delta.changed){groups.set(item.id,item.rows);hashes[item.id]=item.hash;}return {header:delta.header,groups,hashes,rows:[delta.header,...[...groups.values()].flat()],records:delta.records||[]};}
async function deliver(){const gen=generation,actor=owner;const results=await Promise.allSettled([...consumers].map(async([name,c])=>{if(gen!==generation||actor!==identity()||name==='hr'&&liveProfile?.role!=='admin')return;const s=snapshots[name];if(s)try{await c.receive(s,{sheet,owner:actor,generation:gen});}catch(e){if(gen===generation&&actor===identity())c.error?.(e.message||String(e));throw e;}}));if(gen===generation&&actor===identity()){const failures=results.filter(r=>r.status==='rejected');if(failures.length)error=failures.map(r=>r.reason.message||String(r.reason)).join('; ');}}
async function check(force=false){session();if(!allowed()||!navigator.onLine||window.sessionCache14333?.localMode||window.offline14239?.offline?.())return;if(job)return job;if(!force&&Date.now()-lastCheck<30000)return;
 const actor=owner,db=client,gen=generation,current=()=>actor===identity()&&db===ojmDb&&gen===generation;lastCheck=Date.now();
 const task=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),35000);try{
 const auth=await db.auth.getSession();if(!current())return;const token=auth.data?.session?.access_token;if(!token)throw Error('Sign in again to sync inboxes.');
 const response=await fetch('https://nhjsesfhapnjtwlxvirm.supabase.co/functions/v1/google-journal-bridge',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action:'inboxes-read',sheet,hashes:{journal:snapshots.journal?.hashes||{},hr:snapshots.hr?.hashes||{}},hrVersions:consumers.get('hr')?.versions?.()||{}}),signal:controller.signal});
 const result=await response.json();if(!current())return;if(!response.ok||result.error)throw Error(result.error||'Google inbox sync failed.');
 if(sheet&&sheet!==result.sheet){snapshots={journal:null,hr:null};for(const c of consumers.values())c.reset?.();}sheet=result.sheet;
 snapshots={journal:merge(snapshots.journal,result.journal),hr:merge(snapshots.hr,result.hr)};error='';await deliver();if(!current())return;window.refreshNotices1443?.();
 }catch(e){if(current()){error=e.message||String(e);for(const c of consumers.values())c.error?.(error);}}finally{clearTimeout(timer);}})();job=task;try{await task;}finally{if(job===task)job=null;}}
window.AIInboxSync143173={check,snapshot,reset,register(name,consumer){consumers.set(name,consumer);},get state(){session();return {owner,sheet,error,lastCheck,busy:!!job};}};
setInterval(()=>void check(),30000);setInterval(()=>{const before=owner;session();if(before!==owner)void check();},1500);
for(const event of ['page113','focus','online'])window.addEventListener(event,()=>void check());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void check();});
})();
;
