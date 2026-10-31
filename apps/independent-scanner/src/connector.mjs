export function storageConfig(input) {
  const url = new URL(input.url);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw Error('Use the HTTPS project URL without a path.');
  const key = String(input.key || '').trim(), bucket = String(input.bucket || '').trim();
  if (!key || key.startsWith('sb_secret_')) throw Error('Use a publishable key, never a server secret.');
  if (key.split('.').length === 3) {
    let claims; try { claims = JSON.parse(atob(key.split('.')[1].replaceAll('-', '+').replaceAll('_', '/'))); } catch { throw Error('Invalid publishable key.'); }
    if (claims.role !== 'anon') throw Error('Use a client publishable key, never a privileged token.');
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/.test(bucket)) throw Error('Enter the storage bucket name.');
  return { url: url.origin, key, bucket };
}

export function createStorageConnector(config, request = fetch) {
  const c = storageConfig(config);
  let session;
  async function call(path, options = {}) {
    const r = await request(c.url + path, { ...options, headers: { apikey: c.key, ...(session ? { Authorization: 'Bearer ' + session.access_token } : {}), ...options.headers }, signal: AbortSignal.timeout(60000), redirect: 'error' });
    if (!r.ok) { const error = await r.json().catch(() => ({})); throw Error(String(error.message || error.msg || error.error_description || 'Storage request failed (' + r.status + ').').slice(0,200)); }
    return r;
  }
  return {
    async signIn(email, password) {
      session = null;
      const r = await call('/auth/v1/token?grant_type=password', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password})});
      const value = await r.json();
      if (!value.access_token || !/^[\da-f-]{36}$/i.test(value.user?.id || '')) throw Error('Sign-in was not confirmed.');
      session = value;
      return value.user.id;
    },
    async upload(document, pdf, manifest, readPreview) {
      if (!session) throw Error('Sign in to your storage connection first.');
      const root = session.user.id + '/' + document.id + '/' + document.revision;
      const prefix = '/storage/v1/object/' + encodeURIComponent(c.bucket) + '/';
      // New version paths are immutable: retries can confirm existing bytes, never overwrite a newer revision.
      async function put(path, body, type) {
        const digest = async blob => [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('');
        const expected = await digest(body);
        try { await call(prefix + path, {method:'POST',headers:{'Content-Type':type,'x-upsert':'false'},body}); }
        catch (error) {
          // Confirm a retry by downloading and comparing the complete object, not merely trusting a duplicate response.
          let existing; try { existing = await call(prefix + path); } catch { throw error; }
          if (await digest(await existing.blob()) !== expected) throw Error('An existing file differs from this version. Save another revision.');
        }
        return {path,sha256:expected};
      }
      const pdfFile = await put(root + '/document.pdf', pdf, 'application/pdf');
      const pages = [];
      for (const page of manifest.pages) {
        const image = await readPreview(page.id);
        const object = await put(root + '/' + page.id + '.jpg', image, 'image/jpeg');
        pages.push({...page,preview:object});
      }
      const record = {...manifest,provider:'supabase',project:c.url,bucket:c.bucket,pdf:pdfFile,pages};
      await put(root + '/manifest.json', new Blob([JSON.stringify(record)],{type:'application/json'}), 'application/json');
      return record;
    },
    signOut() { session = null; }
  };
}
