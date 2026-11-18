/* One status check per login, plus explicit Check connection. No traffic observer or polling. */
(() => {
  'use strict';
  let owner='', state={kind:'unknown',at:null}, openPanel=()=>false;
  const messages={
    unknown:['Database not checked','Check the connection to view the current database status.',''],
    healthy:['Database is connected','Use Sync Now to send pending changes when ready.',''],
    paused:['Database is paused','Open your Supabase project and select Resume project. After it finishes, return here and press Check connection.','red'],
    pending:['Database is restarting','Open your Supabase project to view progress. When it is ready, return here and press Check connection.','red'],
    unavailable:['Cannot connect to database','Check your internet connection or open your Supabase project to view its status. Then press Check connection.','red'],
    offline:['No internet connection','Reconnect to the internet, then press Check connection.','red'],
    access:['Database access denied','Sign in online again, then press Check connection.','red'],
    limited:['Database requests limited','Wait a moment, then press Check connection.','red']
  };
  function emit(){window.dispatchEvent(new Event('supabase-health461'));}
  function beginLogin(id){
    if(!id || owner===id)return false;
    owner=id;state={kind:'unknown',at:null};emit();return true;
  }
  function endLogin(){if(!owner)return;owner='';state={kind:'unknown',at:null};emit();}
  function classify(result){
    if(result.offline)return 'offline';
    const error=result.error;
    if(!error && result.status>=200 && result.status<300)return 'healthy';
    const body=JSON.stringify(error||{}).slice(0,16384);
    // A generic network error must never be falsely described as a paused project.
    if(/\b(?:project|database)\s+(?:is\s+|has been\s+)?(?:currently\s+)?(?:paused|inactive)\b|"status"\s*:\s*"(?:INACTIVE|PAUSED)"/i.test(body))return 'paused';
    if(/"status"\s*:\s*"(?:RESTORING|COMING_UP|GOING_DOWN|PAUSING)"/i.test(body))return 'pending';
    if(result.status===401 || result.status===403)return 'access';
    if(result.status===429)return 'limited';
    return 'unavailable';
  }
  function record(id,result){
    if(!owner || id!==owner)return;
    state={kind:classify(result),at:new Date().toISOString()};emit();
  }
  function presentation(){let [title,detail,tone]=messages[state.kind];if(tone==='red')detail+=' Locally saved work stays on this device until you reconnect and sync.';return {title,detail,tone};}
  function notices(id){
    const p=presentation();
    return id===owner && p.tone==='red'?[{noticeId:'supabase-status461',type:'Database',title:p.title,detail:p.detail,target:'supabase-status461',critical:true,priority:100,persistent:true}]:[];
  }
  function dashboardURL(){
    try {
      const host=new URL(window.OJM_SUPABASE_URL).hostname;
      const ref=host.match(/^([a-z0-9]{20})\.supabase\.co$/)?.[1];
      return ref?'https://supabase.com/dashboard/project/'+ref:'https://supabase.com/dashboard';
    }catch{return 'https://supabase.com/dashboard';}
  }
  // Browser offline events are local signals, not another Supabase request.
  window.addEventListener('offline',()=>{if(owner)record(owner,{offline:true});});
  window.supabaseHealth461=Object.freeze({beginLogin,endLogin,record,presentation,notices,dashboardURL,current:()=>({...state}),setOpen:fn=>{openPanel=fn;},open:()=>openPanel()});
})();
