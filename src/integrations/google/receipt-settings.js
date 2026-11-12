/* Company receipt folder and Google account settings. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const identity=()=>typeof liveProfile==='undefined'?'':liveProfile?.id||'';
const defaults=()=>({});
let settingsPanel,sharedSettings=null,sharedOwner='',sharedLoaded=false,linkEditorOwner='',loading=null;
function online(){if(!navigator.onLine||window.offline14239?.offline()||window.sessionCache14333?.localMode)throw Error('Connect online to manage Google Drive.');}
function message(text){const node=settingsPanel?.querySelector('[data-drive-status]');if(node)node.textContent=text;}
async function readQuery(query){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);try{return await query.abortSignal(controller.signal);}finally{clearTimeout(timer);}}
function renderSettings(){
 if(!settingsPanel||linkEditorOwner&&linkEditorOwner===identity())return;
 const owner=identity(),cfg=sharedOwner===owner&&sharedSettings||{};
 const canEdit=()=>!!owner&&owner===identity()&&sharedLoaded&&sharedOwner===owner&&liveProfile.role==='admin'&&access113.can('settings-accounting','edit');
 settingsPanel.innerHTML='<p data-drive-status role="status"></p>';
 window.ReceiptDriveSettings228.mount(settingsPanel,{cfg,canEdit,
  editing:value=>{linkEditorOwner=value?owner:'';},finish:text=>{linkEditorOwner='';renderSettings();if(text)message(text);},
  load:async()=>{if(!canEdit())throw Error('Administrator settings access is required.');online();const db=ojmDb,r=await readQuery(db.from('budget_settings14313').select('data').eq('id',true).maybeSingle(),'Receipt destination check');if(!canEdit()||db!==ojmDb)throw Error('Account changed. Reopen settings.');if(r.error)throw r.error;return r.data?.data?.googleSheets143129||defaults();},
  request:async(action,args={})=>{if(!canEdit())throw Error('Administrator settings access is required.');online();const db=ojmDb,session=await db.auth.getSession();if(session.error||session.data.session?.user?.id!==owner)throw Error('Sign in again to manage Google Drive.');const response=await fetch(OJM_SUPABASE_URL+'/functions/v1/accounting-documents',{method:'POST',headers:{Authorization:'Bearer '+session.data.session.access_token,apikey:OJM_SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({action,...args}),signal:AbortSignal.timeout(35000)}),value=await response.json();if(!canEdit()||db!==ojmDb)throw Error('Account changed. Reopen settings.');if(!response.ok||value.error)throw Error(value.error||'Google Drive connection failed.');return value;}
 });
}
function enter(){
 const owner=identity(),db=typeof ojmDb==='undefined'?null:ojmDb;
 if(sharedOwner!==owner){sharedOwner=owner;sharedLoaded=false;sharedSettings=null;linkEditorOwner='';renderSettings();}
 if(!$('settings-accounting')?.classList.contains('active')||!owner||!db||liveProfile.role!=='admin'||sharedLoaded||loading?.owner===owner)return;
 const job={owner};loading=job;
 void (async()=>{try{
  const result=await readQuery(db.from('budget_settings14313').select('data').eq('id',true).maybeSingle());
  if(owner!==identity()||db!==ojmDb||loading!==job)return;
  if(result.error)throw result.error;
  sharedSettings=result.data?.data?.googleSheets143129||{};sharedLoaded=true;renderSettings();
 }catch(error){if(owner===identity())message(error.message);}finally{if(loading===job)loading=null;}})();
}
function ready(){
 settingsPanel=document.createElement('section');settingsPanel.id='googleSheets143129';settingsPanel.className='settings-module94';settingsPanel.hidden=true;
 $('settings-accounting')?.append(settingsPanel);renderSettings();window.addEventListener('page113',enter);enter();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
