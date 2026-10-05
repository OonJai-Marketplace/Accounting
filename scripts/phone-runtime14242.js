/* Independent, own-account phone workspace. No desktop runtime or business modules. */
(() => {
  'use strict';
  const VERSION = '142.46', $ = id => document.getElementById(id);
  const scope = String(window.OJM_SUPABASE_URL || ''), today = () => new Date().toLocaleDateString('en-CA');
  const pages = ['home', 'accounts', 'post', 'entries', 'totals'];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const symbol = c => ({LAK:'₭', USD:'$', THB:'฿'}[c] || c || '');
  const money = (n, c) => symbol(c) + ' ' + Number(n || 0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
  const action = (name, text, extra = '', primary = false) => `<button type="button" class="btn${primary ? ' primary' : ''}" data-action="${name}" ${extra}>${text}</button>`;
  const empty = text => `<p class="empty">${esc(text)}</p>`;
  const S = {actor:'',owner:'', session:null, epoch:0, data:{}, directory:[],directoryLoading:false,selection:false,area:'users',page:'home', month:today().slice(0,7), limit:30, loading:false, syncing:false, saving:false, online:navigator.onLine, shellReady:false, draft:null, error:''};
  let db, database, refreshJob, monthJob, enterJob, enterOwner, authBusy = false, draftTimer, touchAt = 0;
  const storageKey = 'sb-' + new URL(scope || location.origin).hostname.split('.')[0] + '-auth-token';
  let recovering=new URL(location.href).searchParams.has('password-recovery')||/(?:^|[#&])type=recovery(?:&|$)/.test(location.hash);
  const key = id => scope + ':phone14242:' + (S.actor&&S.actor!==id?S.actor+':':'') + id;
  const mirrorKey = id => key(id) + ':draft', activityKey = id => key(id) + ':activity', locationKey=id=>key(id)+':location';
  const current = (owner, epoch) => S.owner === owner && S.epoch === epoch;
  const fail = (message, code = '') => Object.assign(Error(message), {code});
  const denied = e => ['42501','ACCESS_REVOKED','PGRST301','PGRST302'].includes(e?.code) || [401,403].includes(Number(e?.status));
  const ambiguous = e => !e?.status || Number(e.status) >= 500 || ['NETWORK_TIMEOUT','INVALID_RESPONSE'].includes(e.code);
  let noticeTimer14246;function notice(message = '', error = false) {const box=$('notice');clearTimeout(noticeTimer14246);box.replaceChildren();box.classList.toggle('error',error);if(!message)return;const copy=document.createElement('span');copy.textContent=message;box.append(copy);const close=document.createElement('button');close.type='button';close.textContent='Close';close.setAttribute('aria-label','Close notification');close.onclick=()=>notice();box.append(close);if(!error)noticeTimer14246=setTimeout(()=>notice(),4500);}
  function openDB() {
    return database ??= new Promise((resolve, reject) => {
      const request = indexedDB.open('ojm-phone14242', 1), timer = setTimeout(() => reject(fail('Device storage is unavailable. Your draft has not been saved.')), 2000);
      request.onupgradeneeded = () => request.result.createObjectStore('accounts');
      request.onsuccess = () => { clearTimeout(timer); resolve(request.result); };
      request.onerror = request.onblocked = () => { clearTimeout(timer); reject(request.error || fail('Device storage is unavailable.')); };
    }).catch(e=>{database=null;throw e;});
  }
  async function record(owner, update) {
    const recordKey=key(owner);
    const connection = await openDB();
    return new Promise((resolve, reject) => {
      const tx = connection.transaction('accounts', update ? 'readwrite' : 'readonly'), store = tx.objectStore('accounts'), request = store.get(recordKey);
      let result, timer = setTimeout(() => { try { tx.abort(); } catch {} reject(fail('Device storage did not finish. Your draft is kept.')); }, 3000);
      request.onsuccess = () => {
        try { result = request.result || {}; if (update) { result = update(result); store.put(result, recordKey); } }
        catch (e) { try { tx.abort(); } catch {} reject(e); }
      };
      tx.oncomplete = () => { clearTimeout(timer); resolve(result); };
      tx.onerror = tx.onabort = () => { clearTimeout(timer); reject(tx.error || fail('Device storage could not save this change.')); };
    });
  }
  async function persist(owner, patch) { return record(owner, old => ({...old, ...patch})); }
  async function boundedFetch(input, init = {}) {
    const controller = new AbortController(), external = init.signal || (input instanceof Request ? input.signal : null);
    const abort = () => controller.abort(external?.reason);
    if (external?.aborted) abort(); else external?.addEventListener('abort', abort, {once:true});
    let status=0;const timer = setTimeout(() => controller.abort(fail('The connection did not finish. Your saved records and drafts are kept.', 'NETWORK_TIMEOUT')), 10000);
    try {
      const response = await fetch(input, {...init, signal:controller.signal});status=response.status;const body = await response.text();
      if (body && /json/i.test(response.headers.get('content-type') || '')) {
        try { JSON.parse(body); } catch { throw fail('The complete response was not received. Previously downloaded records are kept.', 'INVALID_RESPONSE'); }
      }
      return new Response(body || null, {status:response.status, statusText:response.statusText, headers:response.headers});
    } catch (e) {if([401,403].includes(status))throw Object.assign(fail('The server denied access. Sign in again.',status===403?'42501':'PGRST301'),{status});if (controller.signal.aborted && !external?.aborted) throw fail('The connection did not finish. Your draft is kept; use Sync now to retry.', 'NETWORK_TIMEOUT'); throw e; }
    finally { clearTimeout(timer); external?.removeEventListener('abort', abort); }
  }
  async function http(path, query = {}, body, options = {}) {
    if (!S.owner || !S.session?.access_token) throw fail('Sign in again to continue.', 'ACCESS_REVOKED');
    const owner = S.owner, epoch = S.epoch, url = new URL('/rest/v1/' + path, scope);
    for (const [name, value] of Object.entries(query)) url.searchParams.set(name, value);
    const headers = {apikey:window.OJM_SUPABASE_ANON_KEY, Authorization:'Bearer ' + S.session.access_token, 'Content-Type':'application/json', Prefer:options.returning?'count=exact,return=representation':'count=exact'};
    const response = await boundedFetch(url.href, {method:options.method || (body === undefined ? 'GET' : 'POST'), headers, ...(body === undefined ? {} : {body:JSON.stringify(body)})});
    if (!current(owner, epoch)) throw fail('Your account changed while this request was loading.', 'ACCOUNT_CHANGED');
    if([401,403].includes(response.status))throw Object.assign(fail('The server denied access. Sign in again.',response.status===403?'42501':'PGRST301'),{status:response.status});
    const text = await response.text();let data=null;try{data=text?JSON.parse(text):null;}catch{throw fail('The complete response was not received. Previously downloaded records are kept.','INVALID_RESPONSE');}
    if (!response.ok) throw Object.assign(fail(data?.message || 'This request could not complete.', data?.code), {status:response.status});
    const count = response.headers.get('content-range')?.split('/')[1];
    return {data, count:count && count !== '*' ? Number(count) : null};
  }
  const rpc = async (name, body = {}) => (await http('rpc/' + name, {}, body)).data;
  async function paged(table, query, select = '*') {
    const rows = [], ids = new Set(); let expected = null;
    for (let offset = 0; offset < 200000; offset += 200) {
      const result = await http(table, {...query, select, order:'id.asc', limit:'200', offset:String(offset)});
      if (!Array.isArray(result.data) || result.data.length > 200) throw fail('Records were incomplete. Refresh to try again.', 'INVALID_RESPONSE');
      if (result.count !== null) {
        if (!Number.isInteger(result.count) || result.count < 0 || expected !== null && expected !== result.count) throw fail('Records changed while downloading. Refresh to try again.', 'INVALID_RESPONSE');
        expected = result.count;
      }
      for (const row of result.data) { if (!row?.id || ids.has(row.id)) throw fail('Records changed while downloading. Refresh to try again.', 'INVALID_RESPONSE'); ids.add(row.id); rows.push(row); }
      if (expected !== null ? rows.length >= expected : result.data.length < 200) {
        if (expected !== null && rows.length !== expected) throw fail('The complete set of records was not received.', 'INVALID_RESPONSE');
        return rows;
      }
      if (!result.data.length) throw fail('The complete set of records was not received.', 'INVALID_RESPONSE');
    }
    throw fail('This period has too many records to download at once. Previously saved records are kept.', 'INVALID_RESPONSE');
  }
  function permission(target, verb = 'view') {
    const access = S.data.access; if (!access?.profile || access.profile.id !== S.actor || access.profile.status !== 'active') return false;
    if (access.profile.role === 'admin') return true;
    const p = access.permissions || {}, matrix = p.module_actions113;
    if (matrix) return (matrix[target] || []).includes('view') && (matrix[target] || []).includes(verb);
    const parent = target.startsWith('sub-users-') ? 'sub-users' : target === 'document-editor105' ? 'transactions' : 'settings';
    const view = (p.modules || []).some(m => m === target || m === parent || m === 'all:' + parent || m.endsWith(':' + target));
    return view && (verb === 'view' || !!p[{edit:'can_manage_data', export:'can_export', void:'can_void'}[verb]]);
  }
  function rules() {
    const p = (S.owner!==S.actor?S.data.target?.permissions:S.data.access?.permissions) || {};
    return {directions:(p.allowed_directions?.length ? p.allowed_directions : ['out']).filter(x => ['in','out'].includes(x)), fundIds:(p.assigned_fund_account_ids || []).filter(Boolean), entryIds:(p.destination_account_ids?.length ? p.destination_account_ids : p.allowed_account_ids || []).filter(Boolean), counterpart:p.money_in_counterpart_account_id || '', multiple:!!p.allow_multiple_funds};
  }
  const isAdmin=()=>S.data.access?.profile?.id===S.actor&&S.data.access.profile.status==='active'&&S.data.access.profile.role==='admin';
  const targetName=()=>S.owner===S.actor?S.data.access?.profile?.full_name:S.data.target?.profile?.full_name;
  const accountIds = () => [...new Set([...rules().fundIds, ...rules().entryIds, rules().counterpart].filter(Boolean))];
  const accounts = () => (S.data.accounts || []).filter(a => accountIds().includes(a.id));
  const funds = () => (S.data.funds || []).filter(f => rules().fundIds.includes(f.account_id));
  const headers = () => (S.data.headers || []).filter(j => j.owner_id === S.owner);
  const monthHeaders = () => headers().filter(j => String(j.period_start).slice(0,7) === S.month);
  const lines = () => {
    const allowed = new Set(monthHeaders().map(j => j.id));
    return (S.data.months?.[S.month]?.lines || []).filter(l => allowed.has(l.staff_journal_id) && !l.voided_at && l.status !== 'voided');
  };
  const queue = () => (S.data.queue || []).filter(q => q.owner === S.owner);
  const name = id => accounts().find(a => a.id === id)?.name || funds().find(a => a.account_id === id)?.name || 'Previously assigned account';
  const currency = id => accounts().find(a => a.id === id)?.currency || funds().find(a => a.account_id === id)?.currency || '';
  function cleanName(id) { const n = name(id), c = currency(id); return c ? n.replace(new RegExp('\\s*(?:[–-]\\s*)?\\(?\\b' + c.replace(/[^A-Z]/g,'') + '\\b\\)?\\s*$','i'), '') : n; }
  const accountTitle = id => `<span class="currency">${esc(symbol(currency(id)))}</span>${esc(cleanName(id))}`;
  const balance = f => Number(f.closing || 0) + Number(f.draft_in || 0) - Number(f.draft_out || 0);
  function blankDraft() { const r = rules(); return {mode:'single', date:today(), memo:'', reference:'', requestKey:'phone-' + crypto.randomUUID(), editIds:[], single:[{direction:r.directions[0] || 'out', source:r.fundIds.length === 1 ? r.fundIds[0] : '', affected:r.directions[0] === 'in' ? r.counterpart : '', amount:'', memo:''}], lines:[{account:'',debit:'',credit:'',memo:''},{account:'',debit:'',credit:'',memo:''}]}; }
  function normalizeDraft(value){const d={...blankDraft(),...value};d.single=Array.isArray(d.single)&&d.single.length?d.single:blankDraft().single;d.lines=Array.isArray(d.lines)&&d.lines.length?d.lines:blankDraft().lines;return d;}
  const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
  function payloadDraft(p){return normalizeDraft({mode:'single',date:p.p_items[0].date,memo:p.p_snapshot.memo||p.p_items[0].memo,reference:p.p_snapshot.reference||'',requestKey:p.p_key,editIds:p.p_edit_ids||[],single:p.p_items.map(l=>({direction:l.direction,source:l.fund,affected:l.direction==='in'?rules().counterpart:l.account,amount:String(l.amount),memo:l.memo||''}))});}
  async function migrateLegacy(owner,data){
    // Read only this account's earlier phone draft and immutable staff save requests.
    const offlinePrefix='ojm-offline14239:'+scope+':'+S.actor+':entry:',savePrefix='ojm_staff_save14228:'+scope+':'+S.actor+':',jobs=[];
    for(const storage of [localStorage,sessionStorage])for(let i=0;i<storage.length;i++){
      const sourceKey=storage.key(i);if(!sourceKey.startsWith(offlinePrefix)&&!sourceKey.startsWith(savePrefix)||sourceKey.endsWith(':error'))continue;
      let value;try{value=JSON.parse(storage.getItem(sourceKey));}catch{throw fail('An earlier device entry could not be read. Keep this browser data and recover that entry before continuing.');}
      if(sourceKey.startsWith(offlinePrefix)&&(value?.actor!==S.actor||value.status==='synced'))continue;
      const p=sourceKey.startsWith(offlinePrefix)?value.payload:value;if(p?.p_owner!==owner||!p.p_key)continue;
      if(!Array.isArray(p.p_items)||!p.p_items.length||canonical(p.p_items)!==canonical(p.p_snapshot?.components1437))throw fail('An earlier device entry is incomplete. Keep this browser data and recover that entry before continuing.');
      jobs.push({owner,key:p.p_key,params:p,draft:payloadDraft(p),legacy:true,status:'uncertain',createdAt:Date.parse(value.created)||Date.now(),legacySources:[{storage:storage===localStorage?'local':'session',key:sourceKey}]});
    }
    let previousDraft;
    if(!data.legacyDraftImported&&!data.draft&&!localStorage.getItem(mirrorKey(owner))){try{previousDraft=JSON.parse(localStorage.getItem('ojm_phone_draft1427:'+scope+':'+S.actor))?.staff?.[owner]?.data;}catch{}}
    if(!jobs.length&&!previousDraft)return data;
    return record(owner,old=>{const all=[...(old.queue||[])],seen={...old.legacyReferences};for(const job of jobs){const present=all.find(q=>q.key===job.key);if(present){if(canonical(present.params)!==canonical(job.params))throw fail('An earlier save reference has conflicting entries. Keep both copies for recovery.');present.legacySources=[...(present.legacySources||[]),...job.legacySources];}else if(!seen[job.key])all.push(job);seen[job.key]=true;}
      return {...old,queue:all,legacyReferences:seen,...(previousDraft&&!old.legacyDraftImported&&!old.draft?{draft:normalizeDraft(previousDraft),legacyDraftImported:true}:{})};});
  }
  function clearLegacy(q){for(const source of q.legacySources||[]){try{const storage=source.storage==='session'?sessionStorage:localStorage,value=JSON.parse(storage.getItem(source.key));if((value?.payload||value)?.p_key===q.key){storage.removeItem(source.key);storage.removeItem(source.key+':error');}}catch{}}}
  const draftFilled = () => !!S.draft && (!!S.draft.memo || !!S.draft.reference || !!S.draft.editIds?.length || (S.draft.mode === 'double' ? S.draft.lines.some(l => l.account || l.debit || l.credit || l.memo) : S.draft.single.some(l => l.amount || l.memo || l.affected && l.direction !== 'in')));
  function saveMirror() { if (!S.owner || !S.draft) return; try { localStorage.setItem(mirrorKey(S.owner), JSON.stringify(S.draft)); } catch { notice('This browser could not keep the draft. Keep this page open until you can save it.', true); } }
  function rememberLocation(){if(!S.owner)return;try{localStorage.setItem(locationKey(S.owner),JSON.stringify({page:S.page,month:S.month}));}catch{}}
  function saveDraftLater() { saveMirror(); clearTimeout(draftTimer); const owner = S.owner, draft = structuredClone(S.draft); draftTimer = setTimeout(() => persist(owner,{draft}).catch(e => notice(e.message,true)), 150); }
  function touch() {
    if (!S.owner || Date.now() - touchAt < 1000) return;
    touchAt = Date.now(); try { localStorage.setItem(activityKey(S.actor), String(touchAt)); } catch {}
  }
  function validSession(session) { return !!session?.user?.id && !!session.access_token && Number(session.expires_at) * 1000 > Date.now(); }
  function cachedSession() { try { const raw = JSON.parse(localStorage.getItem(storageKey)); return raw?.currentSession || raw?.session || raw; } catch { return null; } }
  function paintConnection() {
    const pending = queue().length, text = S.syncing ? 'Syncing…' : !navigator.onLine ? 'Offline' : S.online ? 'Online' : 'Limited';
    $('connection').textContent = text + (pending ? ' · ' + pending + ' pending' : ''); $('connection').classList.toggle('offline', !navigator.onLine || !S.online);
    $('avatar').hidden = !S.owner; $('bottom').hidden = !S.owner || !permission('sub-users-workspace');
    const profile = S.data.access?.profile;
    if (profile) { $('avatar').textContent = (profile.full_name || profile.email || 'Me').split(/\s+/).map(x => x[0]).slice(0,2).join('').toUpperCase(); $('accountName').textContent = profile.full_name || profile.email; }
    $('adminNav').hidden=!isAdmin();$('userTabs').hidden=!isAdmin()||S.area!=='users';$('bottom').hidden=$('bottom').hidden||S.area!=='users';
    document.querySelector('.brand small').textContent='Marketplace';
    for(const b of $('adminNav').querySelectorAll('[data-area]'))b.classList.toggle('active',b.dataset.area===S.area);
    $('accountMenu').querySelector('[data-action=print]').hidden = !canPrint();
    for (const b of $('bottom').querySelectorAll('[data-page]')) { b.classList.toggle('active', b.dataset.page === S.page); b.setAttribute('aria-current', b.dataset.page === S.page ? 'page' : 'false'); }
    for(const b of $('workspace').querySelectorAll('[data-action=refresh]')){b.disabled=S.loading;b.textContent=S.loading?'Updating…':'Refresh';}
  }
  function sessionGate(message = '') {
    window.PhoneTools14242?.close();S.epoch++; S.actor=S.owner = ''; S.session = null; S.data = {}; S.directory=[];S.directoryLoading=false;S.directoryLoaded=false;S.selection=false;S.area='users';S.draft = null; S.loading = S.syncing = S.saving = S.submitting = false; refreshJob = monthJob = null; touchAt=0;
    clearTimeout(draftTimer); $('workspace').replaceChildren(); $('workspace').hidden = true; $('login').hidden = false;$('recovery').hidden=true; $('bottom').hidden = true; $('accountMenu').hidden = true; $('dialog').close(); $('loginError').textContent = message; paintConnection(); notice();
  }
  async function revoke(error) {
    const owner = S.owner;
    if (owner) await persist(owner,{access:null}).catch(() => {});if(S.actor&&S.actor!==owner)await persist(S.actor,{access:null,directory:[]}).catch(()=>{});
    await signout(false, 'Please sign in again. ' + (error.message || 'Current access is unavailable.'));
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
  async function getMonth(month, batchHeaders = headers()) {
    const ids = batchHeaders.filter(j => String(j.period_start).slice(0,7) === month && j.owner_id === S.owner).map(j => j.id);
    const result = ids.length ? await paged('staff_journal_lines', {staff_journal_id:'in.(' + ids.join(',') + ')'}) : [];
    if (result.some(l => !ids.includes(l.staff_journal_id) || !l.transaction_date || !Number.isFinite(Number(l.amount)))) throw fail('This period returned incomplete records.', 'INVALID_RESPONSE');
    return {lines:result, savedAt:Date.now(), batchIds:ids};
  }
  async function refresh() {
    if (!S.owner) return;
    if (refreshJob) return refreshJob;
    const owner = S.owner, epoch = S.epoch, month = S.month; S.loading = true; paintConnection();
    refreshJob = (async () => {
      try {
        await access();
        if(isAdmin()){paintConnection();drawUsers();if(S.area==='users'&&!S.selection&&S.page==='home')render();if(!S.directoryLoaded&&!S.directoryLoading)void loadDirectory(false);}
        const ids = accountIds();
        const [rawAccounts, ownFunds, ownHeaders] = await Promise.all([
          ids.length ? paged('accounts', {id:'in.(' + ids.join(',') + ')'}, 'id,code,name,currency_code,is_posting,is_active') : [],
          rpc('fund_balances136',{p_owner:owner,p_month:null}),
          paged('staff_journals',{owner_id:'eq.' + owner}, 'id,owner_id,period_start,status,submitted_at,return_note,updated_at')
        ]);
        if (!current(owner, epoch)) return;
        if (!Array.isArray(ownFunds) || ownFunds.some(f => !rules().fundIds.includes(f.account_id)) || ownHeaders.some(j => j.owner_id !== owner)) throw fail('The workspace response was incomplete.', 'INVALID_RESPONSE');
        const loadedMonth = await getMonth(month, ownHeaders);
        if (!current(owner, epoch)) return;
        const months = {...S.data.months, [month]:loadedMonth};
        const patch = {accounts:rawAccounts.map(a => ({...a,currency:a.currency_code,isPosting:a.is_posting!==false,isActive:a.is_active!==false})),funds:ownFunds,headers:ownHeaders,months,savedAt:Date.now()};
        const stored = await record(owner, old => ({...old,...patch, months:{...old.months,[month]:loadedMonth}, pendingSubmit:old.pendingSubmit && ['submitted','approved','posted'].includes(ownHeaders.find(j => j.id === old.pendingSubmit.id)?.status) ? null : old.pendingSubmit}));
        if (!current(owner, epoch)) return;
        S.data = stored; S.error = ''; S.online = true;
        notice(queue().length ? 'Entries saved on this device are waiting for Sync now.' : 'Your records are up to date.');
        render(S.page !== 'post' || !$('postForm'));
        void http('session_policy1443',{select:'timeout_minutes,warning_minutes',id:'eq.true'}).then(async result => {
          const policy = result.data?.[0]; if (!current(owner,epoch) || !policy) return;
          if (Number.isInteger(Number(policy.timeout_minutes)) && Number(policy.timeout_minutes) >= 5 && Number(policy.timeout_minutes) <= 480) { S.data.policy = policy; await persist(owner,{policy}); }
        }).catch(() => {});
      } catch (e) {
        if (!current(owner, epoch)) return;
        if (denied(e)) await revoke(e);
        else { S.online = false; S.error = e.message; notice((S.data.savedAt ? 'Showing downloaded records. ' : '') + e.message, true); render(S.page !== 'post'); }
      } finally { if (current(owner,epoch)) { S.loading = false; refreshJob = null; paintConnection(); } }
    })();
    return refreshJob;
  }
  async function loadMonth() {
    if (!S.owner || !permission('sub-users-workspace') || !navigator.onLine) return;
    const owner = S.owner, epoch = S.epoch, month = S.month;
    const task = (async () => {
      try { await access(); const result = await getMonth(month); const stored = await record(owner, old => ({...old, months:{...old.months,[month]:result}})); if (current(owner,epoch)) { S.data.months=stored.months; S.online=true; S.error=''; if(S.month===month)render(); } }
      catch (e) { if (!current(owner,epoch)) return; if (denied(e)) await revoke(e); else { S.online=false; S.error=e.message; notice('Downloaded records are kept. '+e.message,true); if(S.month===month)render(); } }
      finally { if(monthJob===task)monthJob=null;paintConnection(); }
    })(); monthJob=task;return task;
  }
  function drawUsers(){
    const host=$('userTabs');if(!isAdmin()){host.replaceChildren();host.hidden=true;return;}
    host.innerHTML=S.directory.map(u=>{const words=(u.full_name||u.email||'User').trim().split(/\s+/),label=words.length>1?words.slice(0,-1).map(w=>w[0]+'.').join(' ')+' '+words.at(-1):words[0];return `<button type="button" data-owner="${esc(u.id)}" class="${S.selection&&S.owner===u.id?'active':''}" title="${esc(u.full_name||u.email)}">${esc(label)}</button>`;}).join('');host.hidden=S.area!=='users';
  }
  async function loadDirectory(verify=true){
    if(!isAdmin()||S.directoryLoading)return;const actor=S.actor;S.directoryLoading=true;
    try{if(verify)await access();if(!isAdmin())throw fail('Administrator access required.','ACCESS_REVOKED');const users=await rpc('review_directory14229');if(S.actor!==actor||!isAdmin())return;
      if(!Array.isArray(users)||users.some(u=>!u.id)||new Set(users.map(u=>u.id)).size!==users.length)throw fail('The complete sub-user list was not received.','INVALID_RESPONSE');
      S.directory=users;S.directoryLoaded=true;await persist(actor,{directory:users});drawUsers();if(S.area==='users'&&!S.selection&&S.page==='home')render();
    }catch(e){if(S.actor===actor){if(denied(e))await revoke(e);else if(e.code!=='ACCOUNT_CHANGED'){notice('Downloaded sub-users are kept. '+e.message,true);if(S.area==='users'&&!S.selection)render();}}}
    finally{if(S.actor===actor)S.directoryLoading=false;}
  }
  async function selectUser(owner){
    if(!isAdmin())throw fail('Administrator access required.');const user=S.directory.find(u=>u.id===owner);if(!user)throw fail('Refresh the sub-user list first.');if(S.saving||S.syncing||S.submitting){notice('Let the current save finish before switching users.',true);return;}
    saveMirror();clearTimeout(draftTimer);window.PhoneTools14242?.close();const accessValue=S.data.access;S.epoch++;const epoch=S.epoch;S.owner=owner;S.area='users';S.selection=true;S.loading=false;refreshJob=monthJob=null;S.data={access:accessValue,target:owner===S.actor?null:{profile:user,permissions:user.user_permissions||{}}};S.draft=null;S.page='home';notice();render();drawUsers();
    try{let data=await record(owner);if(!current(owner,epoch))return;S.data={...data,access:accessValue,target:owner===S.actor?null:(data.target||{profile:user,permissions:user.user_permissions||{}})};data=await migrateLegacy(owner,S.data);if(!current(owner,epoch))return;S.data=data;
      let mirrored;try{mirrored=JSON.parse(localStorage.getItem(mirrorKey(owner)));}catch{}S.draft=normalizeDraft(mirrored||data.draft||{});if(queue().some(q=>q.key===S.draft.requestKey))S.draft=blankDraft();S.page=pages.includes(data.page)?data.page:'home';S.month=/^\d{4}-(0[1-9]|1[0-2])$/.test(data.month||'')?data.month:today().slice(0,7);touch();render();drawUsers();void refresh();
    }catch(e){if(current(owner,epoch))notice(e.message,true);}
  }
  let toolsJob;
  async function openTools(area,report){
    if(area==='settings'&&!isAdmin()||area==='documents'&&!permission('document-editor105'))return;
    saveMirror();S.area=area;paintConnection();if(!window.PhoneTools14242){$('workspace').innerHTML=action('tool-back','Back')+empty('Opening '+(area==='settings'?'sub-user settings':'document editor')+'…');toolsJob ||= new Promise((resolve,reject)=>{const script=document.createElement('script'),stop=()=>{clearTimeout(timer);toolsJob=null;script.remove();if('caches'in window)void caches.open('ojm-phone-shell-'+VERSION).then(c=>c.delete(script.src)).catch(()=>{});reject(fail('This area has not downloaded yet. Reconnect and retry.'));},timer=setTimeout(stop,10000);script.src='scripts/phone-tools14242.js?v='+VERSION;script.onload=()=>{if(window.PhoneTools14242){clearTimeout(timer);resolve();}else stop();};script.onerror=stop;document.head.append(script);});await toolsJob;}
    if(!S.owner||S.area!==area)return;
    const api={state:()=>({actor:S.actor,owner:S.owner,admin:isAdmin(),profile:S.data.access?.profile,target:S.data.target?.profile,directory:S.directory,online:navigator.onLine}),esc,money,notice,permission,access,rpc,http,paged,refreshUsers:()=>loadDirectory(),selectUser,back:()=>{S.area='users';window.PhoneTools14242?.close();render();drawUsers();},saveDevice:(patch)=>persist(S.actor,patch),device:()=>record(S.actor),confirm:confirmDialog,revoke,denied,ambiguous,request:boundedFetch,session:()=>S.session,scope,anon:window.OJM_SUPABASE_ANON_KEY,resetPassword:async email=>{await access();if(!isAdmin())throw fail('Administrator access required.');const configured=String(window.OJM_PUBLIC_APP_URL||'').trim(),url=new URL('phone.html',configured||location.href);if(url.protocol!=='https:'||/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(url.hostname))throw fail('Open the published HTTPS website to request a password reset.');url.search='?password-recovery=1';url.hash='';const result=await db.auth.resetPasswordForEmail(email,{redirectTo:url.href});if(result.error)throw result.error;}};
    await window.PhoneTools14242.open(area,api,report);
  }
  async function openArea(area){if(!isAdmin())return;if(area==='users'){const wasUsers=S.area==='users';S.area='users';window.PhoneTools14242?.close();if(wasUsers){S.selection=false;S.page='home';}render();drawUsers();if(!S.directoryLoaded)void loadDirectory();}else await openTools(area);}
  async function enter(session) {
    if (!validSession(session)) { sessionGate(navigator.onLine ? 'Please sign in.' : 'Reconnect to sign in. Your saved drafts remain on this device.'); return; }
    const owner = session.user.id;
    if (enterJob && enterOwner===owner) return enterJob;
    enterOwner=owner;
    const job = (async () => {
      S.epoch++; const epoch = S.epoch;S.actor=owner;S.owner=owner; S.session=session; S.data={};S.area='users';S.selection=false;S.directory=[];S.directoryLoaded=false; S.page='home'; S.error=''; S.draft=null;
      try {
        let data = await record(owner); if (!current(owner,epoch)) return;
        S.data=data;data=await migrateLegacy(owner,data);if(!current(owner,epoch))return;S.data=data;if(isAdmin())S.directory=data.directory||[];
        const active = Number(localStorage.getItem(activityKey(owner)) || 0), minutes = Number(data.policy?.timeout_minutes || 60);
        if (active && Date.now()-active >= minutes*60000) { await signout(false,'Your session expired after inactivity. Sign in again to continue.');return; }
        let location;try{location=JSON.parse(localStorage.getItem(locationKey(owner)));}catch{}
        S.page = pages.includes(location?.page||data.page) ? location?.page||data.page : 'home'; S.month = /^\d{4}-\d{2}$/.test(location?.month||data.month||'') ? location?.month||data.month : today().slice(0,7);
        let mirrored; try { mirrored=JSON.parse(localStorage.getItem(mirrorKey(owner))); } catch {}
        S.draft=normalizeDraft(mirrored || data.draft || {});
        if(queue().some(q=>q.key===S.draft.requestKey))S.draft=blankDraft();
        touch();$('login').hidden=true;$('workspace').hidden=false;paintConnection();render();drawUsers();
        void refresh();
      } catch(e) { if(current(owner,epoch)){notice(e.message,true);$('workspace').innerHTML=empty('Device storage could not open. Retry opening your workspace.')+action('reopen','Retry', '',true)+action('signout','Sign out');$('login').hidden=true;$('workspace').hidden=false;} }
    })().finally(()=>{if(enterJob===job)enterJob=null;});enterJob=job;return job;
  }
  async function boot() {
    if (!window.supabase || !scope || !window.OJM_SUPABASE_ANON_KEY) { sessionGate('Sign-in files could not load. Reconnect and reload this page.');return; }
    if (!db) {
      db=window.supabase.createClient(scope,window.OJM_SUPABASE_ANON_KEY,{auth:{autoRefreshToken:false,detectSessionInUrl:recovering},global:{fetch:boundedFetch}});
      db.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT' && !authBusy)sessionGate();if(event==='TOKEN_REFRESHED'&&session?.user.id===S.actor)S.session=session;});
    }
    if(recovering){try{const result=await db.auth.getSession();if(result.error)throw result.error;if(!validSession(result.data.session))throw fail('This recovery link is unavailable or expired. Request another reset link.');sessionGate();$('login').hidden=true;$('recovery').hidden=false;const url=new URL(location.href);url.searchParams.delete('password-recovery');url.hash='';history.replaceState(null,'',url.href);return;}catch(e){recovering=false;sessionGate(e.message);return;}}
    const stored=cachedSession();
    if(validSession(stored))return enter(stored);
    try { const result=await db.auth.getSession();if(result.error)throw result.error;return enter(result.data.session); }
    catch(e){sessionGate(navigator.onLine?'Sign in again. '+e.message:'Reconnect to sign in. Your drafts remain on this device.');}
  }
  async function signout(ask=true,message='') {
    if(ask&&!await confirmDialog('Sign out?','Your saved drafts and pending entries will remain private to this account on this device.','Sign out'))return;
    saveMirror();authBusy=true;sessionGate(message);
    try{await db?.auth.signOut({scope:'local'});}catch{}finally{localStorage.removeItem(storageKey);authBusy=false;}
  }
  function groupEntries() {
    const batches=new Map(monthHeaders().map(j=>[j.id,j])),groups=new Map();
    for(const l of lines()){const groupKey=l.staff_journal_id+':'+(l.editor_group1437||l.id);if(!groups.has(groupKey))groups.set(groupKey,{batch:batches.get(l.staff_journal_id),lines:[]});groups.get(groupKey).lines.push(l);}
    return [...groups.values()].sort((a,b)=>String(b.lines[0].transaction_date).localeCompare(String(a.lines[0].transaction_date)));
  }
  function monthControl(){return `<label class="no-print">Period<input id="month" type="month" value="${esc(S.month)}"></label>`;}
  function commonActions(){return `<div class="actions no-print">${action('submit',S.submitting?'Submitting…':'Submit',S.submitting?'disabled':'',true)}${canPrint()?action('print','Print report'):''}${action('refresh',S.loading?'Updating…':'Refresh',S.loading?'disabled':'')}</div>`;}
  const visualIcon = type => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+({wallet:'M3 6h18v14H3z M3 6V3h14v3 M16 12h5',plus:'M12 4v16 M4 12h16',book:'M4 3h16v18H4z M8 7h8 M8 11h8 M8 15h5',chart:'M4 20V10 M10 20V4 M16 20v-9 M22 20H2'}[type]||'M3 10l9-7 9 7v11h-6v-6H9v6H3z')+'"/></svg>';
  const progress = (remaining,total) => total>0?Math.max(0,Math.min(100,remaining/total*100)):0;
  function fundCards(){return funds().map(f=>{const total=Number(f.opening||0)+Number(f.received||0),remaining=balance(f);return `<section class="card fund-card1425"><div class="row"><span class="round gold">${visualIcon('wallet')}</span><h2>${accountTitle(f.account_id)}</h2></div><small>Remaining Funds</small><strong class="fund-amount132 ${remaining<0?'negative':''}">${money(remaining,f.currency)}</strong><div class="bar"><i style="width:${progress(remaining,total)}%"></i></div><div class="row"><small>${money(remaining,f.currency)} remaining</small><small>${money(total,f.currency)} total</small></div><div class="grid fund-detail1425"><div><small>Funds received</small><b>${money(f.received,f.currency)}</b></div><div><small>Used / handed over</small><b>${money(Number(f.used||0)+Number(f.handover||0),f.currency)}</b></div></div><p class="muted">Available balance includes saved entries awaiting review. ${queue().length?'Device entries awaiting sync are not included.':''}</p></section>`;}).join('')||empty(S.data.savedAt?'No fund accounts are assigned to you.':'Your assigned funds have not downloaded yet.');}
  function home(){
    if(isAdmin()&&!S.selection)return `<div class="team-home14227"><header class="th-head"><h2>Sub-users</h2></header><section class="th-panel"><header><h3>User workspaces</h3></header>${S.directory.map(u=>`<button type="button" class="user-row th-button th-user" data-owner="${esc(u.id)}"><span class="th-avatar">${esc((u.full_name||u.email||'U').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join(''))}</span><span class="th-user-copy"><strong>${esc(u.full_name||u.email)}</strong><small>${esc(u.user_permissions?.job_title||u.status||'')}</small></span><span class="th-open">Open ›</span></button>`).join('')||empty(S.directoryLoading?'Loading sub-users…':'The sub-user list has not downloaded yet.')}</section>${action('directory-refresh','Refresh sub-users')}</div>`;
    const metrics={};for(const f of funds()){const m=metrics[f.currency]||={remaining:0,total:0,used:0};m.remaining+=balance(f);m.total+=Number(f.opening||0)+Number(f.received||0);m.used+=Number(f.used||0)+Number(f.handover||0);}
    return `<div class="card hero funds-hero1425"><div class="row"><span class="round">${visualIcon('wallet')}</span><b>Remaining Funds</b></div>${Object.entries(metrics).map(([c,m])=>`<strong>${money(m.remaining,c)}</strong>`).join('')||'<strong>—</strong>'}<small>Across assigned accounts</small></div>`+Object.entries(metrics).map(([c,m])=>{const p=progress(m.remaining,m.total);return `<div class="fund-summary1425"><div><small>${Math.round(p)}%</small><div class="bar"><i style="width:${p}%"></i></div><b>${money(m.remaining,c)}</b><small>Remaining</small></div><div><small>${Math.round(100-p)}%</small><div class="bar spent1425"><i style="width:${100-p}%"></i></div><b>${money(m.used,c)}</b><small>Spent / handed over</small></div><div>${visualIcon('chart')}<b>${money(m.total,c)}</b><small>Available funds</small></div></div>`;}).join('')+`<div class="grid quick-tiles1425">${[['Post','Record an expense','post','plus'],['Accounts','View accounts','accounts','wallet'],['Entries','See all entries','entries','book'],['Totals','View summaries','totals','chart']].map(([t,d,page,k])=>`<button type="button" class="tile" data-go="${page}"><span class="round ${page==='accounts'?'orange':page==='totals'?'gold':''}">${visualIcon(k)}</span><b>${t}</b><small>${d}</small><span class="tile-arrow" aria-hidden="true">›</span></button>`).join('')}</div><div class="recent1425"><div class="row"><h2>Recent Expenses</h2><button type="button" class="btn" data-go="entries">View all</button></div>${lines().slice().sort((a,b)=>String(b.transaction_date).localeCompare(String(a.transaction_date))).slice(0,3).map(l=>`<div class="list"><span class="round orange">${visualIcon('book')}</span><div class="desc"><b>${esc(l.memo||cleanName(l.account_id))}</b><small>${esc(l.transaction_date)}</small></div><div class="right money">${money(l.amount,l.currency_code||currency(l.fund_account_id))}</div></div>`).join('')||'<p>No entries yet.</p>'}</div>${monthControl()}<p class="muted">${lines().length} entries this period · ${monthHeaders().filter(j=>j.status==='submitted').length} waiting for review · ${queue().length} waiting to sync</p>${commonActions()}${S.data.pendingSubmit?'<p class="submit-note">The last submission needs confirmation. Refresh records before retrying.</p>':''}<div class="muted">${funds().map(f=>accountTitle(f.account_id)).join(' · ')}</div>`;
  }
  function options(ids,selected='') { return '<option value="">Choose account</option>'+accounts().filter(a=>ids.includes(a.id)&&a.isPosting!==false&&a.isActive!==false).map(a=>`<option value="${esc(a.id)}" ${a.id===selected?'selected':''}>${esc(symbol(a.currency)+' '+a.code+' — '+cleanName(a.id))}</option>`).join(''); }
  function field(label,input){return `<div class="field"><label>${label}${input}</label></div>`;}
  function post() {
    if(!permission('sub-users-workspace','edit'))return '<h1>Post entry</h1>'+empty('Posting is not enabled for this account.');
    if(!S.data.savedAt)return '<h1>Post entry</h1>'+empty('Download your assigned accounts once before gathering entries offline.')+action('refresh','Try loading accounts','',true);
    S.draft ||= blankDraft();const d=S.draft,r=rules(),disabled=S.saving?'disabled':'';
    const controls=`<div class="switches"><button type="button" data-action="mode" ${disabled}>${d.mode==='double'?'Double entry':'Single entry'} ⇄</button>${d.mode==='single'?`<button type="button" data-action="direction" class="direction-${d.single[0]?.direction==='in'?'in':'out'}" ${disabled||r.directions.length<2?'disabled':''}>${d.single[0]?.direction==='in'?'Money In':'Money Out'} ⇄</button>`:''}</div>`;
    const single=d.single.map((l,i)=>`<section class="line staff-single-line14225" data-line="${i}">${i?`<div class="row"><strong>Entry ${i+1} · ${l.direction==='in'?'Money In':'Money Out'}</strong><button type="button" class="remove" data-action="remove-line" data-index="${i}" ${disabled}>Remove</button></div>`:''}${field('Account / fund',`<select data-field="source" data-index="${i}" ${disabled}>${options(r.fundIds,l.source)}</select>`)}<div class="grid">${field('Category',`<select data-field="affected" data-index="${i}" ${disabled||l.direction==='in'?'disabled':''}>${options(l.direction==='in'?[r.counterpart]:r.entryIds,l.direction==='in'?r.counterpart:l.affected)}</select>`)}${field('Amount',`<input data-field="amount" data-index="${i}" inputmode="decimal" value="${esc(l.amount)}" ${disabled}>`)}</div>${field('Line memo (optional)',`<input data-field="memo" data-index="${i}" value="${esc(l.memo)}" ${disabled}>`)}</section>`).join('');
    const double=d.lines.map((l,i)=>`<section class="line staff-double-line14225"><div class="staff-account-row14225"><span class="staff-line-number14225">${i+1}</span>${field('Account',`<select data-field="account" data-index="${i}" ${disabled}>${options(accountIds(),l.account)}</select>`)}<button type="button" class="remove" data-action="remove-line" data-index="${i}" aria-label="Remove line ${i+1}" ${disabled}>×</button></div><div class="grid">${field('Debit',`<input data-field="debit" data-index="${i}" inputmode="decimal" value="${esc(l.debit)}" ${disabled}>`)}${field('Credit',`<input data-field="credit" data-index="${i}" inputmode="decimal" value="${esc(l.credit)}" ${disabled}>`)}</div>${field('Line memo (optional)',`<input data-field="memo" data-index="${i}" value="${esc(l.memo)}" ${disabled}>`)}</section>`).join('');
    const description=field('Description',`<input data-field="memo" value="${esc(d.memo)}" ${disabled}>`);
    return `<h1>${d.editIds?.length?'Edit Entry':'Post Entry'}</h1><form id="postForm">${controls}<div class="grid staff-date14225">${field('Date',`<input type="date" data-field="date" value="${esc(d.date)}" ${disabled}>`)}${field('Reference (optional)',`<input data-field="reference" value="${esc(d.reference)}" ${disabled}>`)}</div>${d.mode==='double'?description+double:single+description}${action('add-line',d.mode==='double'?'Add Line':'Add another entry line',disabled)}<p id="entryValidation" class="preview" aria-live="polite"></p><div class="actions">${action('clear-draft','Clear',disabled)}<button type="submit" class="btn primary" ${disabled}>${S.saving?'Saving…':navigator.onLine?(d.mode==='double'?'Post Entry':'Save Entry'):'Save on device'}</button></div></form>`;
  }

  function totals(){
    const sums=new Map();for(const l of lines()){const c=l.currency_code||currency(l.fund_account_id);if(!sums.has(c))sums.set(c,{in:0,out:0});sums.get(c)[l.direction==='in'?'in':'out']+=Number(l.amount||0);}
    for(const f of funds())if(!sums.has(f.currency))sums.set(f.currency,{in:0,out:0});
    return '<h1>Totals</h1>'+monthControl()+[...sums].map(([c,n])=>{
      const assigned=funds().filter(f=>f.currency===c),available=assigned.reduce((v,f)=>v+balance(f),0),downloaded=!!S.data.months?.[S.month];
      return `<section class="totals-section"><h2>${esc(c)} · ${downloaded?'Recorded in '+esc(S.month):'Period not downloaded'}</h2><div class="grid totals-reference">${[['Money In',downloaded?n.in:null,'plus','green'],['Money Out',downloaded?n.out:null,'book','warm'],['Net movement',downloaded?n.in-n.out:null,'chart','gold'],['Available now',available,'wallet','forest']].map(([label,amount,icon,tone])=>`<div class="metric ${tone}"><span class="round">${visualIcon(icon)}</span><div><small>${label}</small><strong>${amount===null?'—':money(amount,c)}</strong></div></div>`).join('')}</div>${assigned.length?`<div class="card balance-breakdown"><h2>Current account balances</h2>${assigned.map(f=>`<div class="balance-row"><div class="row"><b>${accountTitle(f.account_id)}</b><strong>${money(balance(f),c)}</strong></div><div class="bar"><i style="width:${progress(balance(f),Number(f.opening||0)+Number(f.received||0))}%"></i></div></div>`).join('')}</div>`:''}</section>`;
    }).join('')+(!sums.size?empty('No downloaded entries for this period.'):'')+`<p class="muted totals-note">Recorded movement uses saved entries in ${esc(S.month)}. Current balances include entries awaiting review. Device entries awaiting sync are excluded.</p>`+commonActions();
  }
  function entries(){const groups=groupEntries(),pending=queue();return '<h1>Entries</h1>'+monthControl()+pending.map(q=>`<section class="card queue-item"><div class="row"><strong>Saved on this device</strong><span class="status">${q.status==='uncertain'?'Needs confirmation':q.status==='blocked'?'Needs attention':'Pending sync'}</span></div><p>${esc(q.draft.date)} · ${esc(q.draft.memo)}</p><p class="muted">${esc(q.message||'Use Sync now when connected. Submission is available after all entries are confirmed.')}</p></section>`).join('')+(pending.length?action('sync',S.syncing?'Syncing…':'Sync now',S.syncing||!navigator.onLine?'disabled':'',true):'')+groups.slice(0,S.limit).map((g,i)=>{const first=g.lines[0],canEdit=['draft','returned'].includes(g.batch.status)&&permission('sub-users-workspace','edit'),amounts=new Map();for(const l of g.lines){const c=l.currency_code||currency(l.fund_account_id);amounts.set(c,(amounts.get(c)||0)+Number(l.amount));}return `<details class="entry" data-group="${esc(first.id)}"><summary class="entry-heading"><span class="entry-icon round ${first.direction==='in'?'':'orange'}">${visualIcon(first.direction==='in'?'wallet':'book')}</span><span class="entry-copy"><small>${esc(first.transaction_date)}</small><b>${esc(first.editor_snapshot1437?.memo||first.memo||cleanName(first.account_id))}</b></span><span class="entry-value"><span class="amount">${[...amounts].map(([c,n])=>esc(money(n,c))).join(' · ')}</span><span class="status ${esc(g.batch.status)}">${esc(g.batch.status)}</span></span><span class="entry-chevron" aria-hidden="true">⌄</span></summary><div class="entry-body">${g.lines.map(l=>`<p><strong>${l.direction==='in'?'Money In':'Money Out'} · ${esc(money(l.amount,l.currency_code||currency(l.fund_account_id)))}</strong><br>${accountTitle(l.fund_account_id)}<br>${l.direction==='out'?accountTitle(l.account_id)+'<br>':''}${esc(l.memo)}${l.reference?'<br>Reference: '+esc(l.reference):''}</p>`).join('')}${g.batch.return_note?'<p>Review note: '+esc(g.batch.return_note)+'</p>':''}${canEdit?`<div class="actions no-print">${action('edit','Edit',`data-index="${i}"`)}${permission('sub-users-workspace','void')?action('void','Void',`data-index="${i}"`):''}</div>`:''}</div></details>`;}).join('')+(groups.length>S.limit?action('more','Show more'):'')+(!groups.length&&!pending.length?empty(S.data.months?.[S.month]?'No saved entries in this period.':'This period has not downloaded yet.'):'')+commonActions();}
  function render(force=true) {
    paintConnection();if(!S.owner)return;
    if(S.area!=='users')return;
    if(!permission('sub-users-workspace')){$('workspace').innerHTML=empty(S.error||'Checking your account access…')+action('refresh','Retry loading','',true)+action('signout','Sign out');return;}
    if(!force && S.page==='post')return;
    const content={home,accounts:()=>'<h1>My accounts</h1>'+fundCards(),post,entries,totals};
    $('workspace').innerHTML=content[S.page]();
    const m=$('month');if(m)m.onchange=()=>{if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(m.value))return;S.month=m.value;S.limit=30;rememberLocation();void persist(S.owner,{month:S.month});render();void loadMonth();};
    const form=$('postForm');if(form){form.addEventListener('input',captureDraft);form.addEventListener('change',captureDraft);form.onsubmit=e=>{e.preventDefault();void saveEntry();};updateValidation();}
  }
  function navigate(page){if(!pages.includes(page)||!S.owner||!permission('sub-users-workspace'))return;if(S.page==='post')saveMirror();S.page=page;rememberLocation();$('accountMenu').hidden=true;touch();void persist(S.owner,{page}).catch(()=>{});render();}
  function captureDraft(e){const n=e.target;if(!n.dataset.field||S.saving)return;const field=n.dataset.field;if(n.dataset.index!==undefined)S.draft[S.draft.mode==='double'?'lines':'single'][Number(n.dataset.index)][field]=n.value;else S.draft[field]=n.value;saveDraftLater();updateValidation();}
  function updateValidation(){if(!$('entryValidation')||!S.draft)return;try{const {items}=StaffEntry14225.prepare(S.draft,accounts(),rules());const sums=new Map();for(const l of items){const c=currency(l.fund);sums.set(c,(sums.get(c)||0)+l.amount);}$('entryValidation').textContent=items.length+' complete '+(items.length===1?'entry':'entries')+' · '+[...sums].map(([c,n])=>money(n,c)).join(' · '); }catch(e){$('entryValidation').textContent=e.message;}}
  function confirmDialog(title,text,label='Continue',input=false){return new Promise(resolve=>{const dialog=$('dialog');dialog.close();$('dialogBody').innerHTML='<h2>'+esc(title)+'</h2><p>'+esc(text)+'</p>'+(input?'<label>Reason<textarea id="dialogReason" required></textarea></label>':'');$('dialogButtons').innerHTML='<button class="btn" value="cancel">Cancel</button><button class="btn primary" value="yes">'+esc(label)+'</button>';dialog.onclose=()=>resolve(dialog.returnValue==='yes'?(input?$('dialogReason').value.trim():true):false);dialog.returnValue='cancel';dialog.showModal();});}
  async function saveEntry(){
    if(S.saving||!permission('sub-users-workspace','edit'))return;
    const owner=S.owner,epoch=S.epoch;S.saving=true;
    for(const input of $('postForm')?.querySelectorAll('input,select,textarea,button')||[])input.disabled=true;
    try{
      const draft=structuredClone(S.draft),prepared=StaffEntry14225.prepare(draft,accounts(),rules());
      const item={owner,key:draft.requestKey,draft,params:{p_owner:owner,p_key:draft.requestKey,p_items:prepared.items,p_snapshot:prepared.snapshot,p_edit_ids:draft.editIds||[]},status:'pending',createdAt:Date.now()};
      clearTimeout(draftTimer);saveMirror();
      const stored=await record(owner,old=>{const all=old.queue||[];const previous=all.find(q=>q.key===item.key);if(previous&&JSON.stringify(previous.params)!==JSON.stringify(item.params))throw fail('This save reference is already in use. Sync the pending entry before making another change.');return {...old,queue:previous?all:[...all,item],draft:null};});
      if(!current(owner,epoch))return;S.data=stored;S.draft=blankDraft();saveMirror();S.saving=false;notice('Entry saved on this device.');render();
      if(navigator.onLine)await sync();
    }catch(e){if(current(owner,epoch))notice(e.message,true);}
    finally{if(current(owner,epoch)){S.saving=false;paintConnection();if(S.page==='post')render();}}
  }
  async function updateQueue(owner,keyValue,patch,remove=false){return record(owner,old=>({...old,queue:(old.queue||[]).flatMap(q=>q.key!==keyValue?[q]:remove?[]:[{...q,...patch}])}));}
  async function sync(){
    if(S.syncing||!S.owner)return;if(!navigator.onLine){notice('You are offline. Your device entries are kept.');return;}
    const owner=S.owner,epoch=S.epoch;S.syncing=true;paintConnection();
    const run=async()=>{
      try{
        await access();if(!permission('sub-users-workspace','edit'))throw fail('Posting is no longer enabled for this account.');
        const stored=await record(owner);if(!current(owner,epoch))return;S.data.queue=stored.queue||[];
        for(const q of queue()){
          if(!current(owner,epoch))return;
          try{
            if(q.params.p_owner!==owner||q.owner!==owner)throw fail('This entry belongs to a different account.');
            if(q.legacy){for(const date of new Set(q.params.p_items.map(l=>l.date))){const draft=payloadDraft({...q.params,p_items:q.params.p_items.filter(l=>l.date===date)});StaffEntry14225.prepare(draft,accounts(),rules());}}else StaffEntry14225.prepare(q.draft,accounts(),rules());
            const response=await rpc('save_staff_editor1437',q.params);
            if(!Array.isArray(response?.line_ids)||response.line_ids.length!==q.params.p_items.length||response.line_ids.some(id=>!id)||new Set(response.line_ids).size!==response.line_ids.length)throw fail('The complete save was not confirmed. Retry with the same reference.','INVALID_RESPONSE');
            const next=await updateQueue(owner,q.key,{},true);clearLegacy(q);if(current(owner,epoch))S.data.queue=next.queue;
          }catch(e){if(!current(owner,epoch))return;const next=await updateQueue(owner,q.key,{status:ambiguous(e)?'uncertain':'blocked',message:e.message});if(current(owner,epoch))S.data.queue=next.queue;throw e;}
        }
        if(current(owner,epoch)){S.online=true;notice('All device entries were confirmed.');await refresh();}
      }catch(e){if(!current(owner,epoch))return;if(denied(e))await revoke(e);else{S.online=false;notice('Pending entries are kept with their original save references. '+e.message,true);}}
    };
    try{if(navigator.locks)await navigator.locks.request('ojm-phone-sync:'+key(owner),{ifAvailable:true},lock=>lock?run():notice('Another tab is syncing this account.'));else await run();}
    finally{if(current(owner,epoch)){S.syncing=false;paintConnection();if(S.page!=='post')render();}}
  }
  async function submit(){if(S.submitting)return;S.submitting=true;render(S.page!=='post');try{return await submitPeriod();}finally{S.submitting=false;render(S.page!=='post');}}
  async function submitPeriod(){
    if(!permission('sub-users-workspace','edit')){notice('Submission is not enabled for this account.',true);return;}
    if(queue().length||S.syncing||S.saving||draftFilled()){notice('Save or clear your current draft, then sync all device entries before submitting.',true);return;}
    if(!navigator.onLine){notice('Reconnect before submitting. Your entries remain saved on this device.',true);return;}
    const owner=S.owner,epoch=S.epoch,month=S.month;await refresh();if(!current(owner,epoch)||!S.online||S.month!==month)return;
    const candidates=monthHeaders().filter(j=>['draft','returned'].includes(j.status)&&lines().some(l=>l.staff_journal_id===j.id));
    if(!candidates.length){notice('There are no saved entries ready to submit in this period.');return;}
    if(!await confirmDialog('Submit for review?','Submit '+month+' and lock all saved entries in this period for review?','Submit'))return;
    if(!current(owner,epoch)||S.month!==month||draftFilled())return;
    const alreadyPending=await record(owner);if((alreadyPending.queue||[]).length){notice('Another tab has pending entries. Sync them before submitting.',true);return;}
    try{
      await access();
      for(const batch of candidates){
        S.data=await persist(owner,{pendingSubmit:{id:batch.id,month,createdAt:Date.now()}});
        await rpc('submit_staff_journal',{p_journal_id:batch.id});
        const stored=await record(owner,old=>({...old,headers:(old.headers||[]).map(j=>j.id===batch.id?{...j,status:'submitted',submitted_at:new Date().toISOString()}:j),pendingSubmit:null}));if(!current(owner,epoch))return;S.data=stored;
      }
      notice('Submitted for review.');render();void refresh();
    }catch(e){if(!current(owner,epoch))return;if(denied(e))await revoke(e);else{if(!ambiguous(e))S.data=await persist(owner,{pendingSubmit:null});notice('Submission was not confirmed. Refresh to check its status before retrying. '+e.message,true);render();}}
  }
  async function edit(index){const g=groupEntries()[index];if(!g||!permission('sub-users-workspace','edit')||!['draft','returned'].includes(g.batch.status))return;
    if(queue().some(q=>q.params.p_edit_ids.some(id=>g.lines.some(l=>l.id===id)))){notice('Sync the pending change to this entry first.',true);return;}
    if(draftFilled()&&!await confirmDialog('Replace the current draft?','Save the current draft first if you need to keep it.','Replace'))return;
    const first=g.lines[0],saved=first.editor_snapshot1437,r=rules();let d;
    const normalize=rows=>rows.map(l=>JSON.stringify([l.date,l.direction,l.fund,l.account,Number(l.amount),l.memo])).sort().join('|');
    const actual=g.lines.map(l=>({date:l.transaction_date,direction:l.direction,fund:l.fund_account_id,account:l.account_id,amount:l.amount,memo:l.memo}));
    if(saved?.components1437&&normalize(actual)===normalize(saved.components1437.filter(l=>l.date===first.transaction_date))){d={...blankDraft(),mode:saved.mode,date:first.transaction_date,memo:saved.memo,reference:saved.reference||'',single:structuredClone(saved.single||[]),lines:(saved.rows||[]).map(l=>({account:accounts().find(a=>a.code+' — '+a.name===l.account||a.id===l.account)?.id||'',debit:l.dr||'',credit:Object.values(l.credits||{}).find(x=>Number(x)>0)||'',memo:l.memo||''}))};}
    else d={...blankDraft(),date:first.transaction_date,memo:first.memo,reference:first.reference||'',single:g.lines.map(l=>({direction:l.direction,source:l.fund_account_id,affected:l.direction==='in'?r.counterpart:l.account_id,amount:String(l.amount),memo:l.memo||''}))};
    d.editIds=g.lines.map(l=>l.id);S.draft=d;saveDraftLater();navigate('post');
  }
  async function voidEntry(index){const g=groupEntries()[index];if(!g||!permission('sub-users-workspace','void')||!['draft','returned'].includes(g.batch.status))return;
    if(!navigator.onLine||queue().length){notice('Sync pending entries and reconnect before voiding.',true);return;}
    const owner=S.owner,epoch=S.epoch,reason=await confirmDialog('Void this entry?','All lines in this entry will be voided together.','Void',true);if(!reason||!current(owner,epoch))return;
    try{await access();await rpc('void_staff_editor1437',{p_owner:owner,p_ids:g.lines.map(l=>l.id),p_reason:reason});notice('Entry voided.');await refresh();}catch(e){if(current(owner,epoch)){if(denied(e))await revoke(e);else notice('The result needs confirmation. Refresh before retrying. '+e.message,true);}}
  }
  function canPrint(){return permission('sub-users-workspace')&&(permission('document-editor105','export')||permission('sub-users-workspace','export'));}
  async function printReport(){if(!canPrint()){notice('Printing is not enabled for this account.',true);return;}if(queue().length||draftFilled()||!S.data.months?.[S.month]){notice('Finish your draft and sync pending entries before printing a complete report.',true);return;}
    const title=(targetName()||'My workspace')+' · '+S.month,rows=lines(),html='<h1>'+esc(title)+'</h1><table><thead><tr><th>Date</th><th>Entry</th><th>Amount</th><th>Memo</th></tr></thead><tbody>'+rows.map(l=>'<tr><td>'+esc(l.transaction_date)+'</td><td>'+esc(l.direction==='in'?'Money In':'Money Out')+'<br>'+esc(name(l.fund_account_id))+(l.direction==='out'?'<br>'+esc(name(l.account_id)):'')+'</td><td>'+esc(money(l.amount,l.currency_code||currency(l.fund_account_id)))+'</td><td>'+esc(l.memo)+(l.reference?'<br>'+esc(l.reference):'')+'</td></tr>').join('')+'</tbody></table><p>Downloaded records as of '+esc(new Date(S.data.months[S.month].savedAt).toLocaleString())+'. This document is a working copy.</p>';
    if(permission('document-editor105'))await openTools('documents',{title,html,category:'Sub-users',savedReport1434:true,sourceJournal1434:monthHeaders().length===1?monthHeaders()[0].id:undefined});else{const previous=S.page,oldLimit=S.limit;S.page='entries';S.limit=Infinity;render();window.print();S.page=previous;S.limit=oldLimit;render();}
  }
  function connectionDialog(){const dialog=$('dialog');dialog.close();dialog.classList.add('phone-connection14246');$('dialogBody').innerHTML='<h2>Connection & sync</h2><section class="sync-section14246"><h3>Connection</h3><p>'+esc(navigator.onLine?(S.online?'Online':'Limited connection'):'Offline')+'</p></section><section class="sync-section14246"><h3>Website files</h3><p>'+esc(S.shellReady?'Downloaded for reopening without connection.':'Still preparing for offline reopening.')+'</p></section><section class="sync-section14246"><h3>Device entries · '+queue().length+'</h3>'+(queue().map(q=>'<article class="sync-entry14246"><strong>'+esc(q.draft.date+' · '+q.draft.memo)+'</strong><p>'+esc(q.status==='uncertain'?'Needs confirmation':q.status==='blocked'?'Needs attention':'Waiting to sync')+'</p>'+(q.message?'<p>'+esc(q.message)+'</p>':'')+'<small>Reference: '+esc(q.key)+'</small></article>').join('')||'<p>No device entries waiting to sync.</p>')+'</section>';$('dialogButtons').innerHTML=action('sync','Sync now',S.syncing||!navigator.onLine||!queue().length?'disabled':'',true)+'<button class="btn" value="close">Close</button>';dialog.onclose=()=>dialog.classList.remove('phone-connection14246');dialog.showModal();}
  async function handle(name,index){try{
    if(name==='tool-back'){S.area='users';window.PhoneTools14242?.close();render();drawUsers();return;}if(name==='reopen')return boot();if(name==='directory-refresh')return loadDirectory();if(name==='signout')return signout();if(name==='refresh')return refresh();if(name==='sync')return sync();if(name==='submit')return submit();if(name==='print')return printReport();if(name==='edit')return edit(index);if(name==='void')return voidEntry(index);if(name==='more'){S.limit+=30;render();return;}
    if(S.page!=='post'||S.saving||!S.draft)return;
    if(name==='mode')S.draft.mode=S.draft.mode==='single'?'double':'single';
    if(name==='direction'){const direction=S.draft.single[0]?.direction==='in'?'out':'in';if(!rules().directions.includes(direction))return;for(const l of S.draft.single){l.direction=direction;l.affected=direction==='in'?rules().counterpart:'';}}
    if(name==='add-line')S.draft[S.draft.mode==='double'?'lines':'single'].push(S.draft.mode==='double'?{account:'',debit:'',credit:'',memo:''}:{direction:S.draft.single[0]?.direction||rules().directions[0],source:'',affected:S.draft.single[0]?.direction==='in'?rules().counterpart:'',amount:'',memo:''});
    if(name==='remove-line'){const rows=S.draft[S.draft.mode==='double'?'lines':'single'];if(rows.length<=(S.draft.mode==='double'?2:1)){notice('Keep at least '+(S.draft.mode==='double'?'two journal lines.':'one entry line.'),true);return;}rows.splice(index,1);}
    if(name==='clear-draft'){if(draftFilled()&&!await confirmDialog('Clear the draft?','This only clears the unfinished form. Saved and pending entries are kept.','Clear'))return;S.draft=blankDraft();}
    saveDraftLater();render();
  }catch(e){notice(e.message,true);}}
  document.addEventListener('click',e=>{const owner=e.target.closest('[data-owner]'),area=e.target.closest('[data-area]');if(owner){void selectUser(owner.dataset.owner).catch(e=>notice(e.message,true));return;}if(area){void openArea(area.dataset.area).catch(e=>notice(e.message,true));return;}const page=e.target.closest('[data-page],[data-go]');if(page)return navigate(page.dataset.page||page.dataset.go);const b=e.target.closest('[data-action]');if(b&&!b.disabled){e.preventDefault();void handle(b.dataset.action,Number(b.dataset.index||0)).catch(e=>notice(e.message,true));}});
  $('loginForm').onsubmit=async e=>{e.preventDefault();if(authBusy)return;if(!navigator.onLine){$('loginError').textContent='Reconnect to sign in. Existing drafts remain on this device.';return;}authBusy=true;const button=$('loginForm').querySelector('button');button.disabled=true;$('loginError').textContent='Signing in…';try{const result=await db.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});if(result.error)throw result.error;$('loginPassword').value='';await enter(result.data.session);}catch(e){$('loginError').textContent=e.message;}finally{authBusy=false;button.disabled=false;}};
  $('phoneRecoveryForm').onsubmit=async e=>{e.preventDefault();if(authBusy)return;const password=$('recoveryPassword').value;if(password!==$('recoveryConfirm').value){$('recoveryStatus').textContent='The passwords do not match.';return;}authBusy=true;const button=e.target.querySelector('button');button.disabled=true;$('recoveryStatus').textContent='Updating password…';try{const result=await db.auth.updateUser({password});if(result.error)throw result.error;$('recoveryPassword').value=$('recoveryConfirm').value='';recovering=false;await signout(false,'Password updated. Sign in with your new password.');}catch(e){$('recoveryStatus').textContent=e.message;}finally{authBusy=false;button.disabled=false;}};
  $('avatar').onclick=()=>{$('accountMenu').hidden=!$('accountMenu').hidden;$('avatar').setAttribute('aria-expanded',String(!$('accountMenu').hidden));};$('connection').onclick=connectionDialog;
  document.addEventListener('click',e=>{if(!e.target.closest('#avatar,#accountMenu'))$('accountMenu').hidden=true;});
  for(const event of ['pointerdown','keydown','input','touchstart','wheel'])document.addEventListener(event,touch,{passive:true,capture:true});
  document.addEventListener('keydown',e=>{if(S.page!=='post'||!e.target.closest('#postForm'))return;const inputs=[...$('postForm').querySelectorAll('input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')],i=inputs.indexOf(e.target);if(e.key==='Enter'&&e.target.tagName!=='TEXTAREA'){e.preventDefault();saveDraftLater();inputs[i+1]?.focus();}});
  window.addEventListener('pagehide',saveMirror);document.addEventListener('visibilitychange',()=>{if(document.hidden)saveMirror();else if(S.owner&&navigator.onLine)void refresh();});
  window.addEventListener('online',()=>{S.online=true;paintConnection();if(S.owner)void refresh();});window.addEventListener('offline',()=>{S.online=false;paintConnection();notice('Offline. Downloaded records and your drafts remain available.');});
  window.addEventListener('storage',e=>{if(e.key===storageKey){const session=cachedSession();if(!session?.user||session.user.id!==S.actor){saveMirror();sessionGate();void boot();}else S.session=session;}});
  setInterval(()=>{if(!S.owner)return;const active=Number(localStorage.getItem(activityKey(S.actor))||touchAt);if(Date.now()-active>=Number(S.data.policy?.timeout_minutes||60)*60000)void signout(false,'Your session expired after inactivity. Sign in again to continue.');},15000);
  let pullStart=null;document.addEventListener('touchstart',e=>{if(window.scrollY===0&&!e.target.closest('input,textarea,select,dialog'))pullStart=e.touches[0].clientY;},{passive:true});document.addEventListener('touchend',e=>{if(pullStart!==null&&e.changedTouches[0].clientY-pullStart>90&&S.page!=='post')void refresh();pullStart=null;},{passive:true});
  const icons={home:'M3 10l9-7 9 7v11h-6v-6H9v6H3z',wallet:'M3 6h18v14H3z M3 6V3h14v3 M16 12h5',plus:'M12 4v16 M4 12h16',book:'M4 3h16v18H4z M8 7h8 M8 11h8 M8 15h5',chart:'M4 20V10 M10 20V4 M16 20v-9 M22 20H2'};for(const node of document.querySelectorAll('[data-icon]'))node.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+icons[node.dataset.icon]+'"/></svg>';
  if('serviceWorker'in navigator){navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='ojm-phone-ready'&&e.data.version===VERSION){S.shellReady=true;paintConnection();}});window.addEventListener('load',()=>{navigator.serviceWorker.register('phone-sw.js?v='+VERSION,{scope:'./',updateViaCache:'none'}).then(reg=>{if(reg.active)reg.active.postMessage({type:'ojm-phone-status'});}).catch(()=>notice('Offline reopening is not ready yet. Continue online and reconnect to finish downloading the phone files.',true));},{once:true});}
  window.PhoneWorkspace14242={version:VERSION,ready:()=>!!S.owner&&permission('sub-users-workspace'),offlineReady:()=>S.shellReady,refresh,navigate};
  void boot();
})();
