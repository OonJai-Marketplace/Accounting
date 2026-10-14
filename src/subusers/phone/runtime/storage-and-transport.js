  function openDB() {
    return database ??= new Promise((resolve, reject) => {
      let finished=false;
      const request=indexedDB.open('ojm-phone14242',1);
      const stop=error=>{if(finished)return;finished=true;clearTimeout(timer);reject(error)};
      const timer=setTimeout(()=>stop(fail('Device storage is unavailable. Your draft has not been saved.')),2000);
      request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('accounts'))request.result.createObjectStore('accounts')};
      request.onsuccess=()=>{if(finished){request.result.close();return}finished=true;clearTimeout(timer);const connection=request.result;connection.onversionchange=()=>{connection.close();database=null};resolve(connection)};
      request.onerror=request.onblocked=()=>stop(request.error||fail('Device storage is unavailable.'));
    }).catch(e=>{database=null;throw e;});
  }
  async function record(owner, update) {
    const recordKey=key(owner);
    const connection = await openDB();
    return new Promise((resolve, reject) => {
      const tx = connection.transaction('accounts', update ? 'readwrite' : 'readonly'), store = tx.objectStore('accounts'), request = store.get(recordKey);
      let result, timer = setTimeout(() => { try { tx.abort(); } catch {} reject(fail('Device storage did not finish. Your draft is kept.')); }, 3000);
      request.onsuccess = () => {
        try { result = (window.deviceVault14334?deviceVault14334.unpack(request.result,'ojm-phone14242:'+recordKey):request.result) || {}; if (update) { result = update(result); store.put(window.deviceVault14334?deviceVault14334.pack(result,'ojm-phone14242:'+recordKey):result, recordKey); } }
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
    } catch (e) {if([401,403].includes(status))throw Object.assign(fail('The server denied access. Sign in again.',status===403?'42501':'PGRST301'),{status});if (controller.signal.aborted && !external?.aborted) throw fail('The connection did not finish. Your draft is kept; saved entries retry automatically when connected.', 'NETWORK_TIMEOUT'); throw e; }
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
    const text = await response.text();if(!current(owner,epoch))throw fail('Your account changed while this request was loading.','ACCOUNT_CHANGED');let data=null;try{data=text?JSON.parse(text):null;}catch{throw fail('The complete response was not received. Previously downloaded records are kept.','INVALID_RESPONSE');}
    if (!response.ok) throw Object.assign(fail(data?.message || 'This request could not complete.', data?.code), {status:response.status});
    const count = response.headers.get('content-range')?.split('/')[1];
    return {data, count:count && count !== '*' ? Number(count) : null};
  }
  const rpc = async (name, body = {}) => (await http('rpc/' + name, {}, body)).data;
  async function paged(table, query, select = '*') {
    const rows = [], ids = new Set(),owner=S.owner,epoch=S.epoch; let expected = null;
    for (let offset = 0; offset < 200000; offset += 200) {
      if(!current(owner,epoch))throw fail('Your account changed while downloading.','ACCOUNT_CHANGED');
      const result = await http(table, {...query, select, order:'id.asc', limit:'200', offset:String(offset)});
      if(!current(owner,epoch))throw fail('Your account changed while downloading.','ACCOUNT_CHANGED');
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
