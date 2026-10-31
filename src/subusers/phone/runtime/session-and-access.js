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
    $('adminNav').hidden=!isAdmin();$('userTabs').hidden=true;$('bottom').hidden=$('bottom').hidden||S.area!=='users';
    document.querySelector('.brand small').textContent='Marketplace';
    for(const b of $('adminNav').querySelectorAll('[data-area]'))b.classList.toggle('active',b.dataset.area===S.area);
    for (const b of $('bottom').querySelectorAll('[data-page]')) {let badge=b.querySelector('.returned-badge14347');const count=b.dataset.page==='entries'?headers().filter(j=>j.status==='returned').length:0;if(count){if(!badge){badge=document.createElement('span');badge.className='returned-badge14347';b.append(badge)}badge.textContent=String(count);badge.setAttribute('aria-label',count+' submissions returned for correction');}else badge?.remove(); b.classList.toggle('active', b.dataset.page === S.page); b.setAttribute('aria-current', b.dataset.page === S.page ? 'page' : 'false'); }
    for(const b of $('workspace').querySelectorAll('[data-action=refresh]')){b.disabled=S.loading;b.textContent=S.loading?'Updating…':'Refresh';}
  }
  function sessionGate(message = '') {
    window.PhoneTools14242?.close();S.epoch++; S.actor=S.owner = ''; S.session = null; S.data = {}; S.directory=[];S.directoryLoading=false;S.directoryLoaded=false;S.selection=false;S.area='users';S.draft = null; S.loading = S.syncing = S.saving = S.submitting = false; refreshJob = monthJob = enterJob = null;enterOwner=''; touchAt=0;
    clearTimeout(draftTimer); $('workspace').replaceChildren(); $('workspace').hidden = true; $('login').hidden = false;$('recovery').hidden=true; $('bottom').hidden = true; $('accountMenu').hidden = true; $('dialog').close(); loginMessageTarget14293().textContent = message; paintConnection(); notice();
  }
  async function revoke(error) {
    window.deviceVault14334?.revoke();
    const owner = S.owner,actor=S.actor,epoch=S.epoch;
    if (owner) await persist(owner,{access:null}).catch(() => {});if(!current(owner,epoch))return;if(actor&&actor!==owner)await persist(actor,{access:null,directory:[]}).catch(()=>{});if(!current(owner,epoch))return;
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
    if(owner!==S.actor)throw fail('Use your laptop to open another user’s workspace.','ACCESS_REVOKED');
    if (!permission('sub-users-workspace')) throw fail('Your account does not have a phone workspace. Ask the administrator to assign Sub-users Workspace access.', 'ACCESS_REVOKED');
    await persist(owner,{access:value});if(!current(owner,epoch))throw fail('Your account changed.','ACCOUNT_CHANGED');
    if(!current(owner,epoch))throw fail('Your account changed.','ACCOUNT_CHANGED');S.online = true; return value;
  }
