  let enterAttempt=0;
  async function enter(session) {
    if(enterJob&&enterOwner===session?.user?.id)return enterJob;
    const attempt=++enterAttempt,startingEpoch=S.epoch;
    const retained=session?.user?.id&&session?.refresh_token?await record(session.user.id).catch(()=>null):null;
    if(attempt!==enterAttempt||S.epoch!==startingEpoch)return;
    const locallyVerified=retained?.access?.profile?.id===session?.user?.id&&retained?.access?.profile?.status==='active';
    if (!validSession(session)&&!locallyVerified) { sessionGate(navigator.onLine ? '' : 'Reconnect to sign in. Your saved drafts remain on this device.'); return; }
    const owner = session.user.id;
    if (enterJob && enterOwner===owner) return enterJob;
    enterOwner=owner;
    const job = (async () => {
      S.epoch++; const epoch = S.epoch;S.actor=owner;S.owner=owner; S.session=session; S.data={};S.area='users';S.selection=false;S.directory=[];S.directoryLoaded=false; S.page='home'; S.error=''; S.draft=null;
      try {
        let data = await record(owner); if (!current(owner,epoch)) return;
        S.data=data;data=await migrateLegacy(owner,data);if(!current(owner,epoch))return;S.data=data;if(isAdmin())S.directory=data.directory||[];
        let location;try{location=JSON.parse(localStorage.getItem(locationKey(owner)));}catch{}
        S.page = (location?.page||data.page)==='totals'?'history':pages.includes(location?.page||data.page) ? location?.page||data.page : 'home'; S.month = /^\d{4}-\d{2}$/.test(location?.month||data.month||'') ? location?.month||data.month : today().slice(0,7);
        let mirrored; try { mirrored=JSON.parse(localStorage.getItem(mirrorKey(owner))); } catch {}
        S.draft=normalizeDraft(mirrored || data.draft || {});
        if(queue().some(q=>q.key===S.draft.requestKey))S.draft=blankDraft();
        touch();$('login').hidden=true;$('workspace').hidden=false;paintConnection();render();drawUsers();
        if(!data.savedAt)await refresh();else {void access().then(()=>{if(current(owner,epoch))render(S.page!=='post')}).catch(e=>{if(current(owner,epoch)&&denied(e))void revoke(e)});phoneSyncActivity14351();}
      } catch(e) { if(current(owner,epoch)){notice(e.message,true);$('workspace').innerHTML=empty('Device storage could not open. Retry opening your workspace.')+action('reopen','Retry', '',true)+action('signout','Sign out');$('login').hidden=true;$('workspace').hidden=false;} }
    })().finally(()=>{if(enterJob===job)enterJob=null;});enterJob=job;return job;
  }
  async function boot() {
    if (!window.supabase || !scope || !window.OJM_SUPABASE_ANON_KEY) { sessionGate('Sign-in files could not load. Reconnect and reload this page.');return; }
    if (!db) {
      db=window.supabase.createClient(scope,window.OJM_SUPABASE_ANON_KEY,{auth:{autoRefreshToken:false,detectSessionInUrl:recovering},global:{fetch:boundedFetch}});
      await window.deviceVault14334?.attach(db);
      db.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT' && !authBusy)sessionGate();if(event==='TOKEN_REFRESHED'&&session?.user.id===S.actor)S.session=session;});
    }
    if(recovering){try{const result=await db.auth.getSession();if(result.error)throw result.error;if(!validSession(result.data.session))throw fail('This recovery link is unavailable or expired. Request another reset link.');sessionGate();$('login').hidden=true;$('recovery').hidden=false;const url=new URL(location.href);url.searchParams.delete('password-recovery');url.hash='';history.replaceState(null,'',url.href);return;}catch(e){recovering=false;sessionGate(e.message);return;}}
    const stored=cachedSession();
    if(stored?.user?.id&&stored?.refresh_token)return enter(stored);
    try { const result=await db.auth.getSession();if(result.error)throw result.error;return enter(result.data.session); }
    catch(e){sessionGate(navigator.onLine?'Sign in again. '+e.message:'Reconnect to sign in. Your drafts remain on this device.');}
  }
  async function signout(ask=true,message='') {
    const owner=S.owner,epoch=S.epoch;
    if(ask&&!await confirmDialog('Sign out?','Your saved drafts and pending entries will remain private to this account on this device.','Sign out'))return;
    if(!current(owner,epoch))return;
    saveMirror();authBusy=true;sessionGate(message);
    try{await db?.auth.signOut({scope:'local'});}catch{}finally{localStorage.removeItem(storageKey);authBusy=false;}
  }
  const reopened14348=new Set();
  const correctionKey14348=j=>S.actor+':'+S.owner+':'+j.id;
  const editable14348=j=>j.status==='draft'||j.status==='returned'&&reopened14348.has(correctionKey14348(j));
