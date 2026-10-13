  function touch() {
    if (!S.owner || Date.now() - touchAt < 1000) return;
    touchAt = Date.now(); try { localStorage.setItem(activityKey(S.actor), String(touchAt)); } catch {}
  }
  function validSession(session) { return !!session?.user?.id && !!session.access_token && Number(session.expires_at) * 1000 > Date.now(); }
  function cachedSession() { try { const raw = JSON.parse(localStorage.getItem(storageKey)); return raw?.currentSession || raw?.session || raw; } catch { return null; } }
  function paintConnection() {
    const text = !navigator.onLine ? 'Offline' : S.online ? 'Online' : 'Limited connection';
    $('connection').textContent = text; $('connection').classList.toggle('offline', !navigator.onLine || !S.online);
    $('avatar').hidden = !S.owner; $('bottom').hidden = !S.owner || !permission('sub-users-workspace');
    const profile = S.data.access?.profile;
    if (profile) { $('avatar').textContent = (profile.full_name || profile.email || 'Me').split(/\s+/).map(x => x[0]).slice(0,2).join('').toUpperCase(); $('accountName').textContent = profile.full_name || profile.email; }
    $('adminNav').hidden=!isAdmin();$('userTabs').hidden=!isAdmin()||S.area!=='users';$('bottom').hidden=$('bottom').hidden||S.area!=='users';
    document.querySelector('.brand small').textContent='Marketplace';
    for(const b of $('adminNav').querySelectorAll('[data-area]'))b.classList.toggle('active',b.dataset.area===S.area);
    $('accountMenu').querySelector('[data-action=print]').hidden = !canPrint();
    for (const b of $('bottom').querySelectorAll('[data-page]')) {let badge=b.querySelector('.returned-badge14347');const count=b.dataset.page==='entries'?headers().filter(j=>j.status==='returned').length:0;if(count){if(!badge){badge=document.createElement('span');badge.className='returned-badge14347';b.append(badge)}badge.textContent=String(count);badge.setAttribute('aria-label',count+' submissions returned for correction');}else badge?.remove(); b.classList.toggle('active', b.dataset.page === S.page); b.setAttribute('aria-current', b.dataset.page === S.page ? 'page' : 'false'); }
    for(const b of $('workspace').querySelectorAll('[data-action=refresh]')){b.disabled=S.loading;b.textContent=S.loading?'Updating…':'Refresh';}
  }
  function sessionGate(message = '') {
    window.PhoneTools14242?.close();S.epoch++; S.actor=S.owner = ''; S.session = null; S.data = {}; S.directory=[];S.directoryLoading=false;S.directoryLoaded=false;S.selection=false;S.area='users';S.draft = null; S.loading = S.syncing = S.saving = S.submitting = false; refreshJob = monthJob = null; touchAt=0;
    clearTimeout(draftTimer); $('workspace').replaceChildren(); $('workspace').hidden = true; $('login').hidden = false;$('recovery').hidden=true; $('bottom').hidden = true; $('accountMenu').hidden = true; $('dialog').close(); loginMessageTarget14293().textContent = message; paintConnection(); notice();
  }
  async function revoke(error) {
    window.deviceVault14334?.revoke();
    const owner = S.owner;
    if (owner) await persist(owner,{access:null}).catch(() => {});if(S.actor&&S.actor!==owner)await persist(S.actor,{access:null,directory:[]}).catch(()=>{});
    await signout(false);
  }
  async function access() {
    if (!navigator.onLine) throw fail('You are offline. Keep gathering entries and sync them when connected.');
    if (!validSession(S.session) || Number(S.session.expires_at) * 1000 - Date.now() < 30000) {
      const owner = S.owner, epoch = S.epoch, result = await db.auth.refreshSession({refresh_token:S.session?.refresh_token});
      if (!current(owner, epoch)) throw fail('Your account changed.', 'ACCOUNT_CHANGED');
      if (result.error) throw result.error;
      if (!validSession(result.data.session) || result.data.session.user.id !== S.actor) throw fail('Sign in again.', 'ACCESS_REVOKED');
      S.session = result.data.session;
    }
    const owner = S.owner, epoch = S.epoch, value = await rpc('current_access14228');
    if (!current(owner, epoch)) throw fail('Your account changed.', 'ACCOUNT_CHANGED');
    if (value?.profile?.id !== S.actor || value.profile.status !== 'active') throw fail('Your account is no longer active.', 'ACCESS_REVOKED');
    S.data.access = value;
    if(owner!==S.actor&&!isAdmin())throw fail('Administrator access is required to open another user.','ACCESS_REVOKED');
    if (!permission('sub-users-workspace')) throw fail('Your account does not have a phone workspace. Ask the administrator to assign Sub-users Workspace access.', 'ACCESS_REVOKED');
    await persist(owner,{access:value});if(owner!==S.actor){await persist(S.actor,{access:value});const [profiles,permissions]=await Promise.all([http('profiles',{id:'eq.'+owner,select:'id,full_name,email,role,status'}),http('user_permissions',{user_id:'eq.'+owner})]);if(!current(owner,epoch))throw fail('The selected workspace changed.','ACCOUNT_CHANGED');if(profiles.data?.length!==1||profiles.data[0].id!==owner||permissions.data?.length!==1||permissions.data[0].user_id!==owner)throw fail('This sub-user is unavailable. Refresh the user list.','INVALID_RESPONSE');S.data.target={profile:profiles.data[0],permissions:permissions.data[0]};await persist(owner,{target:S.data.target});}
    S.online = true; return value;
  }
