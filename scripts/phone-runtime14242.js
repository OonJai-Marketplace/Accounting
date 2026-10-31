/* Journal description links */
/* Portable description links. The existing text fields remain the durable value;
   only [label](https://source) is interpreted, never HTML or executable URLs. */
(()=>{'use strict';if(window.JournalMemoLinks143187)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function url(value){const text=String(value||'').trim();if(!/^https?:\/\//i.test(text)||/[\u0000-\u0020\u007f]/.test(text))return '';try{const u=new URL(text);return ['http:','https:'].includes(u.protocol)&&u.hostname&&!u.username&&!u.password?u.href:'';}catch{return '';}}
const label=v=>String(v).replace(/\\/g,'\\\\').replace(/[\[\]]/g,'\\$&');
function link(text,href){const safe=url(href);if(!safe)throw Error('Enter a full http:// or https:// link.');return '['+label(text)+']('+safe.replace(/[()]/g,c=>c==='('? '%28':'%29')+')';}
function parts(value){const text=String(value??''),out=[],re=/\[((?:\\[\\\[\]]|[^\]\\\r\n])+)\]\((https?:\/\/[^\s()]+)\)/gi;let at=0,m;while((m=re.exec(text))){const href=url(m[2]);if(!href)continue;if(m.index>at)out.push({text:text.slice(at,m.index)});out.push({text:m[1].replace(/\\([\\\[\]])/g,'$1'),href});at=re.lastIndex;}if(at<text.length)out.push({text:text.slice(at)});return out;}
function html(value){return parts(value).map(p=>p.href?'<a class="journal-source-link143187" href="'+esc(p.href)+'" target="_blank" rel="noopener noreferrer" title="'+esc(p.href)+'">'+esc(p.text)+'</a>':esc(p.text).replace(/\r?\n/g,'<br>')).join('');}
function plain(value){return parts(value).map(p=>p.href?p.text+' ('+p.href+')':p.text).join('');}
window.journalMemoHtml143187=html;
function forLine(line){const memo=String(line.memo||line.description||line.generalMemo||''),seen=new Set(parts(memo).filter(p=>p.href).map(p=>p.href));const extra=parts(line.generalMemo||'').filter(p=>p.href&&!seen.has(p.href));return memo+(extra.length?'\n'+extra.map(p=>link(p.text,p.href)).join(' · '):'');}
window.journalMemoValue143187=forLine;

// Cover read-only descriptions copied into legacy views and document previews.
// Never walk editing controls, attributes or existing links.
function decorate(root){if(!root||root.closest?.('script,style,textarea,select,option,button,a,pre,code,[contenteditable],.memo-link-editor143187,dialog#memoLinkDialog143187'))return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.data.includes('](')&&!n.parentElement?.closest('script,style,textarea,select,option,button,a,pre,code,[contenteditable],.memo-link-editor143187,#memoLinkDialog143187')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT});const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const n of nodes){if(!parts(n.data).some(p=>p.href))continue;const t=document.createElement('template');t.innerHTML=html(n.data);n.replaceWith(t.content);}
}
const selector='#jeGeneralMemo,.je-line-memo,#simpleRows1430 [data-simple="memo"],#aiPreparation143160 input[data-field="description"],#aiPreparation143160 input[data-field="line_memo"]';
const editors=new WeakMap();let seq=0;
function serialize(root){let text='';for(const n of root.childNodes){if(n.nodeType===3)text+=n.data;else if(n.nodeType===1){if(n.tagName==='BR')text+='\n';else if(n.tagName==='A'&&url(n.getAttribute('href'))&&n.textContent)text+=link(n.textContent,n.getAttribute('href'));else{if(['DIV','P'].includes(n.tagName)&&text&&!text.endsWith('\n'))text+='\n';text+=serialize(n);}}}return text;}
function rangeFor(editor){const sel=getSelection();if(sel.rangeCount&&editor.contains(sel.anchorNode)&&editor.contains(sel.focusNode))return sel.getRangeAt(0).cloneRange();const r=document.createRange();r.selectNodeContents(editor);r.collapse(false);return r;}
function restore(r){const s=getSelection();s.removeAllRanges();s.addRange(r);}
function insert(editor,markup,range){editor.focus();restore(range);document.execCommand('insertHTML',false,markup);editor.dispatchEvent(new Event('input',{bubbles:true}));}
function dialog(state){const {field,editor}=state;if(field.disabled||field.readOnly)return;document.getElementById('memoLinkDialog143187')?.close();const original=field.value,actor=typeof liveProfile==='undefined'?null:liveProfile?.id;
 let applied=false;let range=rangeFor(editor),node=range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentElement,anchor=node.closest?.('a');if(!editor.contains(anchor))anchor=null;if(anchor){range=document.createRange();range.selectNode(anchor);}
 const d=document.createElement('dialog');d.id='memoLinkDialog143187';d.setAttribute('aria-labelledby','memoLinkTitle143187');d.innerHTML='<form><h3 id="memoLinkTitle143187">'+(anchor?'Edit link':'Insert link')+'</h3><label>Display text<input name="label" required autocomplete="off"></label><label>Link URL<input name="url" type="url" required placeholder="https://" autocomplete="off"></label><p role="alert"></p><footer><button type="button" class="je-btn" data-cancel>Cancel</button>'+(anchor?'<button type="button" class="je-btn" data-remove>Remove link</button>':'')+'<button type="submit" class="je-btn je-btn-emerald">Save link</button></footer></form>';
 const name=d.querySelector('[name=label]'),href=d.querySelector('[name=url]'),error=d.querySelector('[role=alert]');name.value=anchor?.textContent||range.toString();href.value=anchor?.href||'';
 const valid=()=>{if(!field.isConnected||field.disabled||field.readOnly||field.value!==original||(typeof liveProfile==='undefined'?null:liveProfile?.id)!==actor){error.textContent='The entry changed. Close this dialog and open the link again.';return false;}return true;};
 d.querySelector('form').onsubmit=e=>{e.preventDefault();if(!valid())return;try{const text=name.value.trim();if(!text)throw Error('Enter display text.');const value=link(text,href.value);applied=true;d.close();insert(editor,html(value),range);}catch(e){error.textContent=e.message;}};
 d.querySelector('[data-remove]')?.addEventListener('click',()=>{if(!valid())return;applied=true;d.close();editor.focus();restore(range);document.execCommand('unlink',false);editor.dispatchEvent(new Event('input',{bubbles:true}));});d.querySelector('[data-cancel]').onclick=()=>d.close();d.addEventListener('close',()=>{d.remove();if(field.isConnected&&!applied){editor.focus();restore(range);}});document.body.append(d);d.showModal();(name.value?href:name).focus();
}
function enhance(field){if(editors.has(field)||!['INPUT','TEXTAREA'].includes(field.tagName))return;const wrap=document.createElement('span'),editor=document.createElement('span'),button=document.createElement('button');wrap.className='memo-link-editor143187';editor.className='memo-link-text143187';editor.id='memoLinkText143187-'+(++seq);editor.setAttribute('role','textbox');editor.setAttribute('aria-multiline','true');editor.setAttribute('aria-label',field.getAttribute('aria-label')||(field.id==='jeGeneralMemo'?'General description':'Line memo'));editor.dataset.placeholder=field.placeholder||'';button.type='button';button.className='je-btn memo-link-button143187 no-print';button.textContent='↗';button.title='Insert or edit link (Ctrl+K / ⌘K)';button.setAttribute('aria-label','Insert or edit link');
 field.before(wrap);wrap.append(field,editor,button);field.classList.add('memo-link-value143187');field.tabIndex=-1;field.setAttribute('aria-hidden','true');const proto=Object.getOwnPropertyDescriptor(field.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value');let rawValue=proto.get.call(field);const initial=field.getAttribute('value');if(initial&&initial.replace(/[\r\n]/g,'')===rawValue)rawValue=initial;const state={field,editor,button};editors.set(field,state);
 const draw=()=>{editor.innerHTML=html(rawValue).replace(/\n/g,'<br>');},sync=()=>{editor.contentEditable=String(!field.disabled&&!field.readOnly);editor.setAttribute('aria-disabled',String(field.disabled));button.disabled=field.disabled||field.readOnly;};
 Object.defineProperty(field,'value',{configurable:true,get(){return rawValue},set(v){rawValue=String(v??'');proto.set.call(this,rawValue);draw();}});const focus=field.focus.bind(field);field.focus=options=>editor.isConnected?editor.focus(options):focus(options);field.blur=()=>editor.blur();field.select=()=>{editor.focus();const r=document.createRange();r.selectNodeContents(editor);restore(r);};
 editor.addEventListener('input',e=>{e.stopPropagation();rawValue=serialize(editor);proto.set.call(field,rawValue);field.dispatchEvent(new Event('input',{bubbles:true}));});editor.addEventListener('blur',()=>field.dispatchEvent(new Event('change',{bubbles:true})));
 editor.addEventListener('paste',e=>{e.preventDefault();const text=e.clipboardData?.getData('text/plain')||'';insert(editor,html(text).replace(/\n/g,'<br>'),rangeFor(editor));});editor.addEventListener('drop',e=>e.preventDefault());
 for(const type of ['copy','cut'])editor.addEventListener(type,e=>{const r=rangeFor(editor);if(r.collapsed||!e.clipboardData)return;const fragment=r.cloneContents();e.clipboardData.setData('text/plain',serialize(fragment));e.preventDefault();if(type==='cut')insert(editor,'',r);});
 editor.addEventListener('click',e=>{const a=e.target.closest('a');if(a&&(e.ctrlKey||e.metaKey)){e.preventDefault();window.open(a.href,'_blank','noopener,noreferrer');}});
 button.addEventListener('pointerdown',e=>e.preventDefault());button.onclick=()=>dialog(state);draw();sync();new MutationObserver(sync).observe(field,{attributes:true,attributeFilter:['disabled','readonly']});
}
function scan(root){if(root.nodeType!==1&&root.nodeType!==9)return;if(root.matches?.(selector))enhance(root);root.querySelectorAll?.(selector).forEach(enhance);decorate(root);}
function ready(){const style=document.createElement('style');style.textContent=`.journal-source-link143187{color:#1465a8;text-decoration:underline;overflow-wrap:anywhere}.memo-link-editor143187{display:flex;align-items:flex-start;gap:4px;min-width:0;width:100%}.memo-link-value143187{display:none!important}.memo-link-text143187{display:block;flex:1;min-width:0;min-height:32px;padding:6px 8px;border:1px solid #cbd5e1;border-radius:4px;white-space:pre-wrap;overflow-wrap:anywhere;background:transparent;font:inherit;line-height:1.4}.memo-link-text143187:empty:before{content:attr(data-placeholder);color:#64748b}.memo-link-text143187:focus{outline:1px solid #60a5fa}.memo-link-text143187[aria-disabled=true]{opacity:.6}td .memo-link-text143187{border:0;border-radius:0;padding:4px}.memo-link-button143187{height:32px!important;min-height:32px!important;width:32px;padding:0!important;flex:0 0 32px}#memoLinkDialog143187{border:1px solid #cbd5e1;border-radius:10px;padding:20px;max-width:440px;width:calc(100% - 32px);color:#18392e}#memoLinkDialog143187::backdrop{background:#0006}#memoLinkDialog143187 label{display:block;margin:12px 0}#memoLinkDialog143187 input{display:block;width:100%;padding:8px;box-sizing:border-box}#memoLinkDialog143187 footer{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}#memoLinkDialog143187 [role=alert]{color:#b91c1c} @media print{.memo-link-button143187{display:none!important}.journal-source-link143187{color:inherit}}`;document.head.append(style);
 scan(document.body);const pending=new Set();let timer;new MutationObserver(records=>{for(const r of records){if(r.type==='characterData'){if(r.target.parentElement&&!r.target.parentElement.closest('.memo-link-editor143187'))pending.add(r.target.parentElement);}else for(const n of r.addedNodes){if(n.nodeType===1&&!n.closest('.memo-link-editor143187'))pending.add(n);else if(n.nodeType===3&&n.parentElement&&!n.parentElement.closest('.memo-link-editor143187'))pending.add(n.parentElement);}}if(pending.size&&!timer)timer=setTimeout(()=>{timer=null;for(const n of pending)if(n.isConnected)scan(n);pending.clear();},0);}).observe(document.body,{childList:true,subtree:true,characterData:true});
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&!e.altKey){const wrap=e.target.closest?.('.memo-link-editor143187'),field=wrap?.querySelector(selector);if(field){e.preventDefault();e.stopImmediatePropagation();dialog(editors.get(field));}}},true);
 // A saved link opens independently of row navigation or entry selection.
 document.addEventListener('click',e=>{if(e.target.closest?.('a.journal-source-link143187')&&!e.target.closest('[contenteditable]'))e.stopPropagation();},true);
}
window.JournalMemoLinks143187={html,plain,parts,link,url,forLine,decorate,enhance,scan,field:n=>n?.closest?.('.memo-link-editor143187')?.querySelector(selector)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
;
/* Calendar defaults use the device's local civil day, matching native date inputs.
   ISO timestamps remain UTC for storage, audit events and synchronization. */
function appLocalDate(date=new Date()) {
  const pad=value=>String(value).padStart(2,'0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
}

/* Independent, own-account phone workspace. No desktop runtime or business modules. */
(() => {
  'use strict';
  const VERSION = '143.215', $ = id => document.getElementById(id);
  const scope = String(window.OJM_SUPABASE_URL || ''), today = () => appLocalDate();
  const pages = ['home', 'accounts', 'post', 'entries', 'history'];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const symbol = c => ({NA:'▦',Parent:'▦',PARENT:'▦',LAK:'₭', USD:'$', THB:'฿'}[c] || c || '');
  const money = (n, c) => symbol(c) + ' ' + Number(n || 0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
  const action = (name, text, extra = '', primary = false) => `<button type="button" class="btn${primary ? ' primary' : ''}" data-action="${name}" ${extra}>${text}</button>`;
  const empty = text => `<p class="empty">${esc(text)}</p>`;
  const S = {actor:'',owner:'', session:null, epoch:0, data:{}, directory:[],directoryLoading:false,selection:false,area:'users',page:'home', month:today().slice(0,7), limit:30, loading:false, syncing:false, saving:false, online:navigator.onLine, shellReady:false, draft:null, error:''};
  let db, database, refreshJob, monthJob, enterJob, enterOwner, authBusy = false, draftTimer, touchAt = 0;
  const storageKey = 'sb-' + new URL(scope || location.origin).hostname.split('.')[0] + '-auth-token';
  let recovering=new URL(location.href).searchParams.has('password-recovery')||/(?:^|[#&])type=recovery(?:&|$)/.test(location.hash);
  const key = id => scope + (window.accountingReset143108?.suffix()||'') + ':phone14242:' + (S.actor&&S.actor!==id?S.actor+':':'') + id;
  const mirrorKey = id => key(id) + ':draft', activityKey = id => key(id) + ':activity', locationKey=id=>key(id)+':location';
  const current = (owner, epoch) => S.owner === owner && S.epoch === epoch;
  const fail = (message, code = '') => Object.assign(Error(message), {code});
  const denied = e => ['42501','ACCESS_REVOKED','PGRST301','PGRST302'].includes(e?.code) || [401,403].includes(Number(e?.status));
  const ambiguous = e => !e?.status || Number(e.status) >= 500 || ['NETWORK_TIMEOUT','INVALID_RESPONSE'].includes(e.code);
  let noticeTimer14246;function notice(message = '', error = false) {if(!error&&/^(?:Entry saved on this device\.|All device entries were confirmed\.|Offline\. Downloaded records|You are offline\. Your device entries)/.test(message)){paintConnection();return;}const box=$('notice');clearTimeout(noticeTimer14246);box.replaceChildren();box.classList.toggle('error',error);if(!message)return;const copy=document.createElement('span');copy.textContent=message;box.append(copy);const close=document.createElement('button');close.type='button';close.textContent='Close';close.setAttribute('aria-label','Close notification');close.onclick=()=>notice();box.append(close);if(!error)noticeTimer14246=setTimeout(()=>notice(),4500);}
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
  const accounts = () => {const ids=new Set(accountIds());return (S.data.accounts || []).filter(a => ids.has(a.id));};
  const funds = () => {const ids=new Set(rules().fundIds);return (S.data.funds || []).filter(f => ids.has(f.account_id));};
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
  const deviceDelta14333=id=>queue().filter(q=>!Object.values(S.data.months||{}).some(m=>(m.lines||[]).some(l=>String(l.editor_group1437||'').startsWith(q.key+':')))).flatMap(q=>q.params.p_items||[]).filter(l=>l.fund===id).reduce((n,l)=>n+(l.direction==='in'?1:-1)*Number(l.amount||0),0);
  const balance = f => Number(f.closing || 0) + Number(f.draft_in || 0) - Number(f.draft_out || 0)+deviceDelta14333(f.account_id);
  function blankDraft() { const r = rules(); return {mode:'single', date:today(), memo:'', reference:'', requestKey:'phone-' + crypto.randomUUID(), editIds:[], single:[{direction:r.directions[0] || 'out', source:r.fundIds.length === 1 ? r.fundIds[0] : '', affected:'', amount:'', memo:''}], lines:[{account:'',debit:'',credit:'',memo:''},{account:'',debit:'',credit:'',memo:''}]}; }
  function normalizeDraft(value){const d={...blankDraft(),...value};d.single=Array.isArray(d.single)&&d.single.length?d.single:blankDraft().single;d.lines=Array.isArray(d.lines)&&d.lines.length?d.lines:blankDraft().lines;return d;}
  const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
  function payloadDraft(p){return normalizeDraft({mode:'single',date:p.p_items[0].date,memo:p.p_snapshot.memo||p.p_items[0].memo,reference:p.p_snapshot.reference||'',requestKey:p.p_key,editIds:p.p_edit_ids||[],single:p.p_items.map(l=>({direction:l.direction,source:l.fund,affected:l.account,amount:String(l.amount),memo:l.memo||''}))});}
  async function migrateLegacy(owner,data){
    if(window.accountingReset143108?.enabled())return data;
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
  function saveDraftLater() { saveMirror(); clearTimeout(draftTimer); const owner = S.owner, epoch=S.epoch,draft = structuredClone(S.draft); draftTimer = setTimeout(() => {if(current(owner,epoch))persist(owner,{draft}).catch(e => {if(current(owner,epoch))notice(e.message,true)})}, 150); }
  // Reuse the approved login gate and shared six-marble animation on phones.
  function releasePhoneLogin210() {
    document.documentElement.classList.remove('session-checking1444');
    $('loginGate').classList.remove('busy99');$('loginProgress99').hidden=true;
    $('loginForm').removeAttribute('aria-busy');$('loginForm').querySelector('[type=submit]').disabled=false;
  }
  window.releaseLogin1443=releasePhoneLogin210;
  window.phoneLogin210={
    start(){document.documentElement.classList.remove('session-checking1444');$('loginGate').classList.remove('is-authenticated');$('loginGate').classList.add('busy99');$('loginProgress99').innerHTML=window.loading1444.markup();$('loginProgress99').hidden=false;$('loginForm').setAttribute('aria-busy','true');$('loginForm').querySelector('[type=submit]').disabled=true;},
    show(){releasePhoneLogin210();$('loginGate').classList.remove('is-authenticated');},
    finish(){releasePhoneLogin210();$('loginGate').classList.add('is-authenticated');}
  };
  async function phonePasswordReset210(){
    const input=$('loginEmail'),email=input.value.trim(),button=$('phoneForgotPassword210'),message=loginMessageTarget14293();
    if(authBusy||button.disabled)return;
    if(!email||!input.checkValidity()){message.textContent='Enter a valid email address first.';input.focus();return;}
    button.disabled=true;
    try{
      if(!db)throw Error('Authentication is still loading. Try again in a moment.');
      const url=new URL(String(window.OJM_PUBLIC_APP_URL||localStorage.getItem('ojm_public_app_url105')||window.location.href).trim());
      if(url.protocol!=='https:'||/^(?:localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(url.hostname)||/\.(?:local|localhost)$/i.test(url.hostname)||/(?:stackblitz|webcontainer|codesandbox)/i.test(url.hostname))throw Error('Open the published HTTPS app to request a password reset.');
      url.username='';url.password='';url.hash='';url.search='';url.searchParams.set('password-recovery','1');
      const result=await db.auth.resetPasswordForEmail(email,{redirectTo:url.href});if(result.error)throw result.error;
      message.textContent='If this account exists, check its recovery email and open the secure link.';
    }catch(e){message.textContent=e.message||'Recovery could not be requested. Try again.';}
    finally{button.disabled=false;}
  }
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
    for (const b of $('bottom').querySelectorAll('[data-page]')) {let badge=b.querySelector('.returned-badge14347');const count=b.dataset.page==='entries'?headers().filter(j=>j.status==='returned').length:0;if(count){if(!badge){badge=document.createElement('span');badge.className='returned-badge14347';b.append(badge)}badge.textContent=String(count);badge.setAttribute('aria-label',count+' submissions returned for correction');}else badge?.remove(); b.classList.toggle('active', b.dataset.page === (S.page==='history'?'entries':S.page)); b.setAttribute('aria-current', b.dataset.page === (S.page==='history'?'entries':S.page) ? 'page' : 'false'); }
    for(const b of $('workspace').querySelectorAll('[data-action=refresh]')){b.disabled=S.loading;b.textContent=S.loading?'Updating…':'Refresh';}
  }
  function sessionGate(message = '') {
    window.PhoneTools14242?.close();S.epoch++; S.actor=S.owner = ''; S.session = null; S.data = {}; S.directory=[];S.directoryLoading=false;S.directoryLoaded=false;S.selection=false;S.area='users';S.draft = null; S.loading = S.syncing = S.saving = S.submitting = false; refreshJob = monthJob = enterJob = null;enterOwner=''; touchAt=0;
    window.phoneLogin210?.show();clearTimeout(draftTimer); $('workspace').replaceChildren(); $('workspace').hidden = true; $('loginForm').hidden = false;$('phoneRecoveryForm').hidden=true; $('bottom').hidden = true; $('accountMenu').hidden = true; $('dialog').close(); loginMessageTarget14293().textContent = message; paintConnection(); notice();
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
  const monthRevision14359=(month,list)=>JSON.stringify(list.filter(j=>String(j.period_start).slice(0,7)===month));
  async function getMonth(month, batchHeaders = headers()) {
    const ids = batchHeaders.filter(j => String(j.period_start).slice(0,7) === month && j.owner_id === S.owner).map(j => j.id);
    const result = ids.length ? await paged('staff_journal_lines', {staff_journal_id:'in.(' + ids.join(',') + ')'}) : [];
    const allowed=new Set(ids);
    if (result.some(l => !allowed.has(l.staff_journal_id) || !l.transaction_date || !Number.isFinite(Number(l.amount)))) throw fail('This period returned incomplete records.', 'INVALID_RESPONSE');
    return {lines:result, savedAt:Date.now(), batchIds:ids,revision14359:monthRevision14359(month,batchHeaders)};
  }
  async function refresh() {
    if (!S.owner || S.owner!==S.actor) return;
    if (refreshJob) return refreshJob;
    const owner = S.owner, epoch = S.epoch, month = S.month; S.loading = true; paintConnection();
    refreshJob = (async () => {
      try {
        await access();if(!current(owner,epoch))return;
        const confirmedKeys=new Set(queue().filter(q=>q.status==='confirmed').map(q=>q.key));const ids = accountIds();
        const [rawAccounts, ownFunds, ownHeaders] = await Promise.all([
          ids.length ? paged('accounts', {id:'in.(' + ids.join(',') + ')'}, 'id,code,name,currency_code,is_posting,is_active') : [],
          rpc('fund_balances136',{p_owner:owner,p_month:null}),
          paged('staff_journals',{owner_id:'eq.' + owner}, 'id,owner_id,period_start,status,submitted_at,return_note,updated_at,report_types14253,reconciliation14345')
        ]);
        if (!current(owner, epoch)) return;
        if (!Array.isArray(ownFunds) || ownFunds.some(f => !rules().fundIds.includes(f.account_id)) || ownHeaders.some(j => j.owner_id !== owner)) throw fail('The workspace response was incomplete.', 'INVALID_RESPONSE');
        const months={...S.data.months},year=today().slice(0,4),needed=new Set([month,...Array.from({length:12},(_,i)=>year+'-'+String(i+1).padStart(2,'0')),...ownHeaders.filter(j=>['draft','returned'].includes(j.status)).map(j=>String(j.period_start).slice(0,7))]);
        for(const m of needed){if(ownHeaders.some(j=>String(j.period_start).slice(0,7)===m&&['draft','returned'].includes(j.status))||months[m]?.revision14359!==monthRevision14359(m,ownHeaders))months[m]=await getMonth(m,ownHeaders);if(!current(owner,epoch))return;}
        const patch = {accounts:rawAccounts.map(a => ({...a,currency:a.currency_code,isPosting:a.is_posting!==false,isActive:a.is_active!==false})),funds:ownFunds,headers:ownHeaders,months,savedAt:Date.now()};
        const stored = await record(owner, old => ({...old,...patch,queue:(old.queue||[]).filter(q=>!confirmedKeys.has(q.key)), months:{...old.months,...months}, pendingSubmit:old.pendingSubmit && ['submitted','approved','posted'].includes(ownHeaders.find(j => j.id === old.pendingSubmit.id)?.status) ? null : old.pendingSubmit}));
        if (!current(owner, epoch)) return;
        S.data = stored; S.error = ''; S.online = true;
        // Routine refresh is silent; connection and queue state remain visible.
        render(S.page !== 'post' || !$('postForm'));

      } catch (e) {
        if (!current(owner, epoch)) return;
        if (denied(e)) await revoke(e);
        else { S.online = false; S.error = e.message; notice((S.data.savedAt ? 'Showing downloaded records. ' : '') + e.message, true); render(S.page !== 'post'); }
      } finally { if (current(owner,epoch)) { S.loading = false; refreshJob = null; paintConnection(); } }
    })();
    return refreshJob;
  }
  async function loadMonth() {
    if (!S.owner || !permission('sub-users-workspace') || !navigator.onLine || S.data.months?.[S.month]) return;
    const owner = S.owner, epoch = S.epoch, month = S.month;
    const task = (async () => {
      try { await access();if(!current(owner,epoch))return;const result = await getMonth(month);if(!current(owner,epoch))return;const stored = await record(owner, old => ({...old, months:{...old.months,[month]:result}})); if (current(owner,epoch)) { S.data.months=stored.months; S.online=true; S.error=''; if(S.month===month)render(); } }
      catch (e) { if (!current(owner,epoch)) return; if (denied(e)) await revoke(e); else { S.online=false; S.error=e.message; notice('Downloaded records are kept. '+e.message,true); if(S.month===month)render(); } }
      finally { if(monthJob===task)monthJob=null;if(current(owner,epoch))paintConnection(); }
    })(); monthJob=task;return task;
  }
  function drawUsers(){const host=$('userTabs');host.replaceChildren();host.hidden=true;}
  async function loadDirectory(verify=true){
    if(!isAdmin()||S.area!=='settings'||S.directoryLoading)return;const actor=S.actor;S.directoryLoading=true;
    try{if(verify)await access();if(S.actor!==actor)return;if(!isAdmin())throw fail('Administrator access required.','ACCESS_REVOKED');const users=await rpc('review_directory14229');if(S.actor!==actor||!isAdmin())return;
      if(!Array.isArray(users)||users.some(u=>!u.id)||new Set(users.map(u=>u.id)).size!==users.length)throw fail('The complete sub-user list was not received.','INVALID_RESPONSE');
      S.directory=users;S.directoryLoaded=true;await persist(actor,{directory:users});if(S.actor!==actor)return;drawUsers();if(S.area==='users'&&!S.selection&&S.page==='home')render();
    }catch(e){if(S.actor===actor){if(denied(e))await revoke(e);else if(e.code!=='ACCOUNT_CHANGED'){notice('Downloaded sub-users are kept. '+e.message,true);if(S.area==='users'&&!S.selection)render();}}}
    finally{if(S.actor===actor)S.directoryLoading=false;}
  }
  async function selectUser(owner){if(owner!==S.actor)throw fail('Use your laptop to open another user’s workspace.');S.area='users';S.page='home';render();}
  let toolsJob;
  async function openTools(area,report){
    if(area!=='settings'||!isAdmin())return;
    const owner=S.owner,epoch=S.epoch,actor=S.actor;saveMirror();S.area=area;paintConnection();if(!S.directoryLoaded)await loadDirectory();if(!current(owner,epoch)||S.area!==area)return;if(!window.PhoneTools14242){$('workspace').innerHTML=action('tool-back','Back')+empty('Opening '+(area==='settings'?'sub-user settings':'document editor')+'…');toolsJob ||= new Promise((resolve,reject)=>{const script=document.createElement('script'),stop=()=>{clearTimeout(timer);toolsJob=null;script.remove();if('caches'in window)void caches.open('ojm-phone-shell-'+VERSION).then(c=>c.delete(script.src)).catch(()=>{});reject(fail('This area has not downloaded yet. Reconnect and retry.'));},timer=setTimeout(stop,10000);script.src='scripts/phone-tools14242.js?v='+VERSION;script.onload=()=>{if(window.PhoneTools14242){clearTimeout(timer);resolve();}else stop();};script.onerror=stop;document.head.append(script);});await toolsJob;}
    if(!current(owner,epoch)||S.actor!==actor||S.area!==area)return;
    const api={state:()=>({actor:S.actor,owner:S.owner,admin:isAdmin(),profile:S.data.access?.profile,target:S.data.target?.profile,directory:S.directory,online:navigator.onLine}),esc,money,notice,permission,access,rpc,http,paged,refreshUsers:()=>loadDirectory(),selectUser,back:()=>{S.area='users';window.PhoneTools14242?.close();render();drawUsers();},saveDevice:(patch)=>persist(S.actor,patch),device:()=>record(S.actor),confirm:confirmDialog,revoke,denied,ambiguous,request:boundedFetch,session:()=>S.session,scope,anon:window.OJM_SUPABASE_ANON_KEY,resetPassword:async email=>{if(!current(owner,epoch)||S.actor!==actor)throw fail('Account changed.','ACCOUNT_CHANGED');await access();if(!current(owner,epoch)||S.actor!==actor)throw fail('Account changed.','ACCOUNT_CHANGED');if(!isAdmin())throw fail('Administrator access required.');const configured=String(window.OJM_PUBLIC_APP_URL||'').trim(),url=new URL('phone.html',configured||location.href);if(url.protocol!=='https:'||/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(url.hostname))throw fail('Open the published HTTPS website to request a password reset.');url.search='?password-recovery=1';url.hash='';const result=await db.auth.resetPasswordForEmail(email,{redirectTo:url.href});if(result.error)throw result.error;}};
    await window.PhoneTools14242.open(area,api,report);
  }
  async function openArea(area){if(area==='users'){S.area='users';S.page='home';window.PhoneTools14242?.close();render();drawUsers();}else if(area==='settings'&&isAdmin())await openTools(area);}
  let enterAttempt=0;
  async function enter(session) {
    if(enterJob&&enterOwner===session?.user?.id)return enterJob;
    const attempt=++enterAttempt,startingEpoch=S.epoch;
    const retained=session?.user?.id&&session?.refresh_token?await record(session.user.id).catch(()=>null):null;
    if(attempt!==enterAttempt||S.epoch!==startingEpoch)return;
    const locallyVerified=retained?.access?.profile?.id===session?.user?.id&&retained?.access?.profile?.status==='active';
    // A locked device has no session until its saved password unlocks the vault.
    // Do not block that valid offline sign-in with an unsolicited error dialog.
    if (!validSession(session)&&!locallyVerified) { sessionGate(session?.user?.id&&!navigator.onLine ? 'Reconnect to verify this session. Your saved drafts remain on this device.' : ''); return; }
    const owner = session.user.id;window.phoneLogin210?.start();
    if (enterJob && enterOwner===owner) return enterJob;
    enterOwner=owner;
    const job = (async () => {
      S.epoch++; const epoch = S.epoch;S.actor=owner;S.owner=owner; S.session=session; S.data={};S.area='users';S.selection=false;S.directory=[];S.directoryLoaded=false; S.page='home'; S.error=''; S.draft=null;
      try {
        let data = await record(owner); if (!current(owner,epoch)) return;
        S.data=data;data=await migrateLegacy(owner,data);if(!current(owner,epoch))return;S.data=data;S.directory=[];
        let savedLocation;try{savedLocation=JSON.parse(localStorage.getItem(locationKey(owner)));}catch{}
        S.page = (savedLocation?.page||data.page)==='totals'?'history':pages.includes(savedLocation?.page||data.page) ? savedLocation?.page||data.page : 'home'; S.month = /^\d{4}-\d{2}$/.test(savedLocation?.month||data.month||'') ? savedLocation?.month||data.month : today().slice(0,7);
        let mirrored; try { mirrored=JSON.parse(localStorage.getItem(mirrorKey(owner))); } catch {}
        S.draft=normalizeDraft(mirrored || data.draft || {});
        if(queue().some(q=>q.key===S.draft.requestKey))S.draft=blankDraft();
        touch();if(new URL(window.location.href).searchParams.get('scan')==='1'&&permission('sub-users-workspace')){window.location.replace('scan.html?capture=1');return;}$('loginForm').hidden=true;$('workspace').hidden=false;paintConnection();render();drawUsers();
        if(!data.savedAt)await refresh();else {void access().then(()=>{if(current(owner,epoch))render(S.page!=='post')}).catch(e=>{if(current(owner,epoch)&&denied(e))void revoke(e)});phoneSyncActivity14351();}
        if(current(owner,epoch))window.phoneLogin210?.finish();
      } catch(e) { if(current(owner,epoch)){window.phoneLogin210?.finish();notice(e.message,true);$('workspace').innerHTML=empty('Device storage could not open. Retry opening your workspace.')+action('reopen','Retry', '',true)+action('signout','Sign out');$('loginForm').hidden=true;$('workspace').hidden=false;} }
    })().finally(()=>{if(enterJob===job)enterJob=null;});enterJob=job;return job;
  }
  async function boot() {
    if (!window.supabase || !scope || !window.OJM_SUPABASE_ANON_KEY) { sessionGate('Sign-in files could not load. Reconnect and reload this page.');return; }
    await window.deviceVault14334?.ready;
    if (!db) {
      db=window.supabase.createClient(scope,window.OJM_SUPABASE_ANON_KEY,{auth:{autoRefreshToken:false,detectSessionInUrl:recovering},global:{fetch:boundedFetch}});
      try{await window.deviceVault14334?.attach(db);}catch(e){db=null;sessionGate(e.message||'Sign-in storage could not open. Reload and try again.');return;}
      db.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT' && !authBusy)sessionGate();if(event==='TOKEN_REFRESHED'&&session?.user.id===S.actor)S.session=session;});
    }
    if(recovering){try{const result=await db.auth.getSession();if(result.error)throw result.error;if(!validSession(result.data.session))throw fail('This recovery link is unavailable or expired. Request another reset link.');sessionGate();$('loginForm').hidden=true;$('phoneRecoveryForm').hidden=false;const url=new URL(location.href);url.searchParams.delete('password-recovery');url.hash='';history.replaceState(null,'',url.href);return;}catch(e){recovering=false;sessionGate(e.message);return;}}
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
  function returnedReview14348(){if(S.page!=='entries')return '';const returned=headers().filter(j=>j.status==='returned'&&!reopened14348.has(correctionKey14348(j)));return returned.length?'<section class="card"><h2>Review <span class="returned-badge14347">'+returned.length+'</span></h2>'+returned.map((j,i)=>'<article><p><strong>'+esc(j.period_start)+'</strong></p><p>'+esc(j.return_note||'Returned for correction')+'</p>'+action('reopen-correction','Reopen for correction','data-index="'+i+'"')+'</article>').join('')+'</section>':'';}
  function groupEntries() {
    const visible=S.printing14294?monthHeaders():S.page==='entries'?headers().filter(editable14348):monthHeaders().filter(j=>!['draft','returned'].includes(j.status));
    const batches=new Map(visible.map(j=>[j.id,j])),groups=new Map();
    const rows=S.page==='entries'?Object.values(S.data.months||{}).flatMap(m=>m.lines||[]):lines();
    for(const l of rows.filter(l=>batches.has(l.staff_journal_id)&&!l.voided_at&&l.status!=='voided')){const groupKey=l.staff_journal_id+':'+(l.editor_group1437||l.id);if(!groups.has(groupKey))groups.set(groupKey,{batch:batches.get(l.staff_journal_id),lines:[]});groups.get(groupKey).lines.push(l);}
    return [...groups.values()].sort((a,b)=>Number(b.batch.status==='returned')-Number(a.batch.status==='returned')||String(b.lines[0].transaction_date).localeCompare(String(a.lines[0].transaction_date)));
  }
  function monthControl(){return `<header class="phone-history-header14359"><strong>${esc(new Date(S.month+'-01T12:00:00Z').toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}))}</strong><label class="no-print"><input id="month" aria-label="History month" type="month" value="${esc(S.month)}"></label></header>`;}
  function commonActions(){return `<div class="actions no-print">${action('submit',S.submitting?'Submitting…':'Submit',S.submitting?'disabled':'',true)}${action('refresh',S.loading?'Updating…':'Refresh',S.loading?'disabled':'')}</div>`;}
  const visualIcon = type => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+({wallet:'M3 6h18v14H3z M3 6V3h14v3 M16 12h5',plus:'M12 4v16 M4 12h16',book:'M4 3h16v18H4z M8 7h8 M8 11h8 M8 15h5',chart:'M4 20V10 M10 20V4 M16 20v-9 M22 20H2'}[type]||'M3 10l9-7 9 7v11h-6v-6H9v6H3z')+'"/></svg>';
  const progress = (remaining,total) => total>0?Math.max(0,Math.min(100,remaining/total*100)):0;
  function fundCards(){return funds().map(f=>{const total=Number(f.opening||0)+Number(f.received||0),remaining=balance(f);return `<section class="card fund-card1425"><div class="row"><h2>${accountTitle(f.account_id)}</h2></div><small>Remaining Funds</small><strong class="fund-amount132 ${remaining<0?'negative':''}">${money(remaining,f.currency)}</strong><div class="bar"><i style="width:${progress(remaining,total)}%"></i></div><div class="row"><small>${money(remaining,f.currency)} remaining</small><small>${money(total,f.currency)} total</small></div><div class="grid fund-detail1425"><div><small>Funds received</small><b>${money(f.received,f.currency)}</b></div><div><small>Used / handed over</small><b>${money(Number(f.used||0)+Number(f.handover||0),f.currency)}</b></div></div><p class="muted">Available balance includes saved entries awaiting review. ${queue().length?'Includes device entries awaiting sync.':''}</p></section>`;}).join('')||empty(S.data.savedAt?'No fund accounts are assigned to you.':'Your assigned funds have not downloaded yet.');}
  function home(){
    const metrics={};for(const f of funds()){const m=metrics[f.currency]||={remaining:0,total:0,used:0};m.remaining+=balance(f);m.total+=Number(f.opening||0)+Number(f.received||0);m.used+=Number(f.used||0)+Number(f.handover||0);}
    return `<div class="card hero funds-hero1425"><div class="row"><b>Remaining Funds</b></div>${Object.entries(metrics).map(([c,m])=>`<strong>${money(m.remaining,c)}</strong>`).join('')||'<strong>—</strong>'}<small>Across assigned accounts</small></div>`+Object.entries(metrics).map(([c,m])=>{const p=progress(m.remaining,m.total);return `<div class="fund-summary1425"><div><small>${Math.round(p)}%</small><div class="bar"><i style="width:${p}%"></i></div><b>${money(m.remaining,c)}</b><small>Remaining</small></div><div><small>${Math.round(100-p)}%</small><div class="bar spent1425"><i style="width:${100-p}%"></i></div><b>${money(m.used,c)}</b><small>Spent / handed over</small></div><div>${visualIcon('chart')}<b>${money(m.total,c)}</b><small>Available funds</small></div></div>`;}).join('')+`<div class="grid quick-tiles1425">${[['Post','Record an expense','post','plus'],['Accounts','View accounts','accounts','wallet'],['Entries','Unsubmitted entries','entries','book'],['History','Submitted reports','history','chart']].map(([t,d,page,k])=>`<button type="button" class="tile" data-go="${page}"><b>${t}</b><small>${d}</small><span class="tile-arrow" aria-hidden="true">›</span></button>`).join('')}</div>${monthControl()}<p class="muted">${lines().length} entries this period · ${monthHeaders().filter(j=>j.status==='submitted').length} waiting for review · ${queue().length} waiting to sync</p>${commonActions()}${S.data.pendingSubmit?'<p class="submit-note">The last submission needs confirmation. Refresh records before retrying.</p>':''}<div class="muted">${funds().map(f=>accountTitle(f.account_id)).join(' · ')}</div>`;
  }
  function options(ids,selected='') { return '<option value="">Choose account</option>'+accounts().filter(a=>ids.includes(a.id)&&a.isPosting!==false&&a.isActive!==false).map(a=>`<option value="${esc(a.id)}" ${a.id===selected?'selected':''}>${esc(symbol(a.currency)+' '+a.code+' — '+cleanName(a.id))}</option>`).join(''); }
  function field(label,input){return `<div class="field"><label>${label}${input}</label></div>`;}
  function post() {
    if(!permission('sub-users-workspace','edit'))return '<h1>Post entry</h1>'+empty('Posting is not enabled for this account.');
    if(!S.data.savedAt)return '<h1>Post entry</h1>'+empty('Download your assigned accounts once before gathering entries offline.')+action('refresh','Try loading accounts','',true);
    S.draft ||= blankDraft();const d=S.draft,r=rules(),disabled=S.saving?'disabled':'';
    const controls=`<div class="switches"><button type="button" data-action="mode" ${disabled}>${d.mode==='double'?'Single entry':'Double entry'} ⇄</button>${d.mode==='single'?`<button type="button" data-action="direction" class="direction-${d.single[0]?.direction==='in'?'in':'out'}" ${disabled||r.directions.length<2?'disabled':''}>${d.single[0]?.direction==='in'?'Money In':'Money Out'} ⇄</button>`:''}</div>`;
    const single=d.single.map((l,i)=>`<section class="line staff-single-line14225" data-line="${i}">${i?`<div class="row"><strong>Entry ${i+1} · ${l.direction==='in'?'Money In':'Money Out'}</strong><button type="button" class="remove" data-action="remove-line" data-index="${i}" ${disabled}>Remove</button></div>`:''}${field('Account / fund',`<select data-field="source" data-index="${i}" ${disabled}>${options(r.fundIds,l.source)}</select>`)}<div class="grid">${field('Category',`<select data-field="affected" data-index="${i}" ${disabled}>${options(r.entryIds.filter(id=>!l.source||currency(id)===currency(l.source)),l.affected)}</select>`)}${field('Amount',`<input data-field="amount" data-index="${i}" inputmode="decimal" value="${esc(l.amount)}" ${disabled}>`)}</div>${field('Line memo (optional)',`<input data-field="memo" data-index="${i}" value="${esc(l.memo)}" ${disabled}>`)}</section>`).join('');
    const double=d.lines.map((l,i)=>`<section class="line staff-double-line14225"><div class="staff-account-row14225"><span class="staff-line-number14225">${i+1}</span>${field('Account',`<select data-field="account" data-index="${i}" ${disabled}>${options(accountIds(),l.account)}</select>`)}<button type="button" class="remove" data-action="remove-line" data-index="${i}" aria-label="Remove line ${i+1}" ${disabled}>×</button></div><div class="grid">${field('Debit',`<input data-field="debit" data-index="${i}" inputmode="decimal" value="${esc(l.debit)}" ${disabled}>`)}${field('Credit',`<input data-field="credit" data-index="${i}" inputmode="decimal" value="${esc(l.credit)}" ${disabled}>`)}</div>${field('Line memo (optional)',`<input data-field="memo" data-index="${i}" value="${esc(l.memo)}" ${disabled}>`)}</section>`).join('');
    const description=field('Description',`<input data-field="memo" value="${esc(d.memo)}" ${disabled}>`);
    return `<h1>${d.editIds?.length?'Edit Entry':'Post Entry'}</h1><form id="postForm">${controls}<div class="grid staff-date14225">${field('Date',`<input type="date" data-field="date" value="${esc(d.date)}" ${disabled}>`)}${field('Reference (optional)',`<input data-field="reference" value="${esc(d.reference)}" ${disabled}>`)}</div>${d.mode==='double'?description+double:single+description}${action('add-line',d.mode==='double'?'Add Line':'Add another entry line',disabled)}<p id="entryValidation" class="preview" aria-live="polite"></p><div class="actions">${action('clear-draft','Clear',disabled)}<button type="submit" class="btn primary" ${disabled}>${S.saving?'Saving…':navigator.onLine?(d.mode==='double'?'Post Entry':'Save Entry'):'Save on device'}</button></div></form>`;
  }

  function entries(){const groups=groupEntries(),pending=S.page==='history'?[]:queue();return '<h1>Entries</h1><nav class=entry-tabs212 aria-label="Entry views"><button type=button data-page=entries aria-current="'+(S.page==='entries'?'page':'false')+'">Current</button><button type=button data-page=history aria-current="'+(S.page==='history'?'page':'false')+'">History</button></nav>'+returnedReview14348()+(S.page==='history'?monthControl()+'<input id=historySearch14359 type=search placeholder="Search this month" aria-label="Search selected month"><p class=history-summary14359>'+groups.length+' entries · '+new Set(groups.map(g=>g.batch.id)).size+' submitted reports</p>':'')+pending.map(q=>`<section class="card queue-item"><div class="row"><strong>Saved on this device</strong><span class="status">${q.status==='uncertain'?'Needs confirmation':q.status==='blocked'?'Needs attention':'Pending sync'}</span></div><p>${esc(q.draft.date)} · ${esc(q.draft.memo)}</p><p class="muted">${esc(q.message||'Saved entries sync automatically when connected. Submission is available after all entries are confirmed.')}</p></section>`).join('')+groups.slice(0,S.limit).map((g,i)=>{const first=g.lines[0],canEdit=['draft','returned'].includes(g.batch.status)&&permission('sub-users-workspace','edit'),amounts=new Map();for(const l of g.lines){const c=l.currency_code||currency(l.fund_account_id);amounts.set(c,(amounts.get(c)||0)+Number(l.amount));}return `<details class="entry" data-group="${esc(first.id)}"><summary class="entry-heading"><span class="entry-copy"><small>${esc(first.transaction_date)}</small><b>${esc(first.editor_snapshot1437?.memo||first.memo||cleanName(first.account_id))}</b></span><span class="entry-value"><span class="amount">${[...amounts].map(([c,n])=>esc(money(n,c))).join(' · ')}</span><span class="status ${esc(g.batch.status)}">${esc(g.batch.status)}</span></span><span class="entry-chevron" aria-hidden="true">⌄</span></summary><div class="entry-body">${g.lines.map(l=>`<p><strong>${l.direction==='in'?'Money In':'Money Out'} · ${esc(money(l.amount,l.currency_code||currency(l.fund_account_id)))}</strong><br>${accountTitle(l.fund_account_id)}<br>${l.direction==='out'?accountTitle(l.account_id)+'<br>':''}${esc(l.memo)}${l.reference?'<br>Reference: '+esc(l.reference):''}</p>`).join('')}<button type="button" class="scan-support-link208" data-scan-line208="${esc(first.id)}">Documents</button>${S.page==='history'?submissionReconciliation14345.summary(g.batch):''}${g.batch.return_note?'<p>Review note: '+esc(g.batch.return_note)+'</p>':''}${canEdit?`<div class="actions no-print">${action('edit','Edit',`data-index="${i}"`)}${permission('sub-users-workspace','void')?action('void','Void',`data-index="${i}"`):''}</div>`:''}</div></details>`;}).join('')+(groups.length>S.limit?action('more','Show more'):'')+(!groups.length&&!pending.length?empty(S.data.months?.[S.month]?'No saved entries in this period.':'This period has not downloaded yet.'):'')+commonActions();}
  function render(force=true) {
    paintConnection();if(!S.owner)return;
    if(S.area!=='users')return;
    if(!permission('sub-users-workspace')){$('workspace').innerHTML=empty(S.error||'Checking your account access…')+action('refresh','Retry loading','',true)+action('signout','Sign out');return;}
    if(!force && S.page==='post')return;
    const content={home,accounts:()=>'<h1>My accounts</h1>'+fundCards(),post,entries,history:entries};
    $('workspace').innerHTML=content[S.page]();
    const m=$('month');if(m)m.onchange=()=>{if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(m.value))return;S.month=m.value;S.limit=30;rememberLocation();void persist(S.owner,{month:S.month});render();void loadMonth();};
    const search=$('historySearch14359');if(search)search.oninput=()=>{const q=search.value.trim().toLowerCase();$('workspace').querySelectorAll('details.entry').forEach(row=>row.hidden=!!q&&!row.textContent.toLowerCase().includes(q))};
    const form=$('postForm');if(form){form.addEventListener('input',captureDraft);form.addEventListener('change',captureDraft);form.onsubmit=e=>{e.preventDefault();void saveEntry();};updateValidation();}
  }
  async function openScanner209(settings=false){
    if(!S.owner||S.owner!==S.actor||!permission('sub-users-workspace')||S.saving||S.submitting)return;
    const owner=S.owner,epoch=S.epoch;
    clearTimeout(draftTimer);
    // Await durable storage before leaving an unfinished journal form.
    if(S.draft){await persist(owner,{draft:structuredClone(S.draft),page:S.page});if(!current(owner,epoch))return;saveMirror();}
    rememberLocation();touch();
    location.assign(settings?'scan.html?settings=1':'scan.html?capture=1');
  }
  function navigate(page){if(!pages.includes(page)||!S.owner||!permission('sub-users-workspace'))return;if(S.page==='post')saveMirror();S.page=page;rememberLocation();$('accountMenu').hidden=true;touch();void persist(S.owner,{page}).catch(()=>{});render();}
  function captureDraft(e){const n=e.target;if(!n.dataset.field||S.saving)return;const field=n.dataset.field;if(n.dataset.index!==undefined)S.draft[S.draft.mode==='double'?'lines':'single'][Number(n.dataset.index)][field]=n.value;else S.draft[field]=n.value;saveDraftLater();updateValidation();}
  function updateValidation(){if(!$('entryValidation')||!S.draft)return;try{const {items}=StaffEntry14225.prepare(S.draft,accounts(),rules());const sums=new Map();for(const l of items){const c=currency(l.fund);sums.set(c,(sums.get(c)||0)+l.amount);}$('entryValidation').textContent=items.length+' complete '+(items.length===1?'entry':'entries')+' · '+[...sums].map(([c,n])=>money(n,c)).join(' · '); }catch(e){$('entryValidation').textContent=e.message;}}
  let pendingDialog14370=null;
  function phoneDialog14370(draw,read){
    if(pendingDialog14370)pendingDialog14370(false);
    const dialog=$('dialog');dialog.onclose=null;dialog.close();$('dialogBody').onchange=null;
    return new Promise(resolve=>{
      const finish=value=>{if(pendingDialog14370!==finish)return;pendingDialog14370=null;dialog.onclose=null;$('dialogBody').onchange=null;resolve(value)};
      pendingDialog14370=finish;
      try{draw();dialog.returnValue='cancel';dialog.onclose=()=>{if(!dialog.open)finish(dialog.returnValue==='yes'?read():false)};dialog.showModal();}
      catch(error){pendingDialog14370=null;dialog.onclose=null;$('dialogBody').onchange=null;throw error;}
    });
  }
  function confirmDialog(title,text,label='Continue',input=false){return phoneDialog14370(()=>{$('dialogBody').innerHTML='<h2>'+esc(title)+'</h2><p>'+esc(text)+'</p>'+(input?'<label>Reason<textarea id="dialogReason" required></textarea></label>':'');$('dialogButtons').innerHTML='<button class="btn" value="cancel">Cancel</button><button class="btn primary" value="yes">'+esc(label)+'</button>';},()=>input?$('dialogReason').value.trim():true);}
  function chooseReportTypes14294(types,month){return phoneDialog14370(()=>{$('dialogBody').innerHTML='<h2>Submit for review</h2><p>'+esc(month)+'</p>'+submissionReconciliation14345.types(types,'phoneReportTypes14346');$('dialogButtons').innerHTML='<button class="btn" value="cancel">Cancel</button><button class="btn primary" value="yes" disabled>Submit</button>';const submit=$('dialogButtons').querySelector('[value=yes]');submissionReconciliation14345.bindTypes($('dialogBody'));$('dialogBody').onchange=()=>{submit.disabled=!$('dialogBody').querySelector('input:checked')};},()=>{const chosen=[...$('dialogBody').querySelectorAll('input:checked')].map(n=>n.value);return chosen.length?chosen:false});}
  async function saveEntry(){
    if(S.saving||!permission('sub-users-workspace','edit'))return;
    const owner=S.owner,epoch=S.epoch;S.saving=true;
    for(const input of $('postForm')?.querySelectorAll('input,select,textarea,button')||[])input.disabled=true;
    try{
      const draft=structuredClone(S.draft),prepared=StaffEntry14225.prepare(draft,accounts(),rules());
      prepared.snapshot.correction_journal14347=draft.correction_journal14347||null;
      const item={owner,key:draft.requestKey,draft,params:{p_owner:owner,p_key:draft.requestKey,p_items:prepared.items,p_snapshot:prepared.snapshot,p_edit_ids:draft.editIds||[]},status:'pending',createdAt:Date.now()};
      clearTimeout(draftTimer);saveMirror();
      const stored=await record(owner,old=>{const all=old.queue||[];const previous=all.find(q=>q.key===item.key);if(previous&&JSON.stringify(previous.params)!==JSON.stringify(item.params))throw fail('This save reference is already in use. Sync the pending entry before making another change.');return {...old,queue:previous?all:[...all,item],draft:null};});
      if(!current(owner,epoch))return;S.data=stored;S.draft=blankDraft();saveMirror();S.saving=false;notice('Entry saved on this device.');render();
      if(navigator.onLine)await sync();
    }catch(e){if(current(owner,epoch))notice(e.message,true);}
    finally{if(current(owner,epoch)){S.saving=false;paintConnection();if(S.page==='post')render();}}
  }
  async function updateQueue(owner,keyValue,patch,remove=false){return record(owner,old=>({...old,queue:(old.queue||[]).flatMap(q=>q.key!==keyValue?[q]:remove?[]:[{...q,...patch}])}));}
  async function sync({automatic=false}={}){
    if(S.syncing||!S.owner)return;if(!navigator.onLine){notice('You are offline. Your device entries are kept.');return;}
    const owner=S.owner,epoch=S.epoch;S.syncing=true;paintConnection();
    const run=async()=>{
      try{
        if(!current(owner,epoch))return;await access();if(!current(owner,epoch))return;if(!permission('sub-users-workspace','edit'))throw fail('Posting is no longer enabled for this account.');
        const stored=await record(owner);if(!current(owner,epoch))return;S.data.queue=stored.queue||[];
        for(const q of queue().filter(q=>q.status!=='confirmed')){
          if(!current(owner,epoch)||automatic&&!phoneSyncIdle14351())return;
          try{
            if(q.params.p_owner!==owner||q.owner!==owner)throw fail('This entry belongs to a different account.');
            if(q.legacy){for(const date of new Set(q.params.p_items.map(l=>l.date))){const draft=payloadDraft({...q.params,p_items:q.params.p_items.filter(l=>l.date===date)});StaffEntry14225.prepare(draft,accounts(),rules());}}else StaffEntry14225.prepare(q.draft,accounts(),rules());
            const response=await rpc('save_staff_editor1437',q.params);
            if(!Array.isArray(response?.line_ids)||response.line_ids.length!==q.params.p_items.length||response.line_ids.some(id=>!id)||new Set(response.line_ids).size!==response.line_ids.length)throw fail('The complete save was not confirmed. Retry with the same reference.','INVALID_RESPONSE');
            const next=await updateQueue(owner,q.key,{status:'confirmed',receipt:response},false);clearLegacy(q);if(current(owner,epoch))S.data.queue=next.queue;
          }catch(e){if(!current(owner,epoch))return;const next=await updateQueue(owner,q.key,{status:ambiguous(e)?'uncertain':'blocked',message:e.message});if(current(owner,epoch))S.data.queue=next.queue;throw e;}
        }
        if(current(owner,epoch)){S.online=true;notice('All device entries were confirmed.');if(!automatic||phoneSyncIdle14351())await refresh();}
      }catch(e){if(!current(owner,epoch))return;if(denied(e))await revoke(e);else{S.online=false;notice('Pending entries are kept with their original save references. '+e.message,true);}}
    };
    try{if(navigator.locks)await navigator.locks.request('ojm-phone-sync:'+key(owner),{ifAvailable:true},lock=>lock?run():notice('Another tab is syncing this account.'));else await run();}
    finally{if(current(owner,epoch)){S.syncing=false;paintConnection();if(S.page!=='post')render();}}
  }
  async function chooseReconciliation14345(batch){const owner=S.owner,epoch=S.epoch;const c=await rpc('submission_context14345',{p_journal:batch.id});if(!current(owner,epoch))return false;return new Promise(resolve=>{const dialog=$('dialog');dialog.close();$('dialogBody').innerHTML='<h2>Confirm remaining funds</h2>'+submissionReconciliation14345.fields(c);$('dialogButtons').innerHTML='<button class="btn" value="cancel">Cancel</button><button class="btn primary" value="yes" disabled>Submit</button>';submissionReconciliation14345.bind($('dialogBody'),$('dialogButtons').querySelector('[value=yes]'));dialog.onclose=()=>{if(dialog.returnValue!=='yes'){resolve(false);return;}try{resolve({context:c,actuals:submissionReconciliation14345.answers($('dialogBody'))})}catch(e){notice(e.message,true);resolve(false)}};dialog.returnValue='cancel';dialog.showModal()})}
  async function submit(){if(S.submitting)return;const owner=S.owner,epoch=S.epoch;S.submitting=true;render(S.page!=='post');try{return await submitPeriod();}finally{if(current(owner,epoch)){S.submitting=false;render(S.page!=='post');}}}
  async function submitPeriod(){
    if(!permission('sub-users-workspace','edit')){notice('Submission is not enabled for this account.',true);return;}
    if(queue().length||S.syncing||S.saving||draftFilled()){notice('Save or clear your current draft, then sync all device entries before submitting.',true);return;}
    if(!navigator.onLine){notice('Reconnect before submitting. Your entries remain saved on this device.',true);return;}
    const owner=S.owner,epoch=S.epoch,month=S.month;await refresh();if(!current(owner,epoch)||!S.online||S.month!==month)return;
    const candidates=monthHeaders().filter(j=>editable14348(j)&&lines().some(l=>l.staff_journal_id===j.id));
    if(!candidates.length){notice('There are no saved entries ready to submit in this period.');return;}
    const available=(await http('report_types14253',{select:'id,name,active',active:'eq.true',order:'name.asc'})).data||[];
    if(!current(owner,epoch)||S.month!==month)return;
    if(!available.length){notice('Ask the administrator to add an active report type.',true);return;}
    const chosen=await chooseReportTypes14294(available,month);if(!chosen)return;
    if(!current(owner,epoch)||S.month!==month||draftFilled())return;
    const alreadyPending=await record(owner);if(!current(owner,epoch))return;if((alreadyPending.queue||[]).length){notice('Another tab has pending entries. Sync them before submitting.',true);return;}
    try{
      await access();if(!current(owner,epoch)||S.month!==month)return;
      for(const batch of candidates){
        const review=await chooseReconciliation14345(batch);if(!review||!current(owner,epoch))return;
        const pending=await persist(owner,{pendingSubmit:{id:batch.id,month,createdAt:Date.now()}});if(!current(owner,epoch))return;S.data=pending;
        const result=await rpc('submit_reconciled14345',{p_journal:batch.id,p_types:chosen,p_as_of:review.context.asOf,p_fingerprint:review.context.fingerprint,p_actuals:review.actuals});if(!current(owner,epoch))return;if(result?.status!=='submitted')throw Error('Submission was not confirmed.');
        reopened14348.delete(correctionKey14348(batch));notice('Submitted for review.');
        const stored=await record(owner,old=>({...old,headers:(old.headers||[]).map(j=>j.id===batch.id?{...j,...result}:j),pendingSubmit:null}));if(!current(owner,epoch))return;S.data=stored;
      }
      notice('Submitted for review.');render();void refresh();
    }catch(e){if(!current(owner,epoch))return;if(denied(e))await revoke(e);else{if(!ambiguous(e)){const stored=await persist(owner,{pendingSubmit:null});if(!current(owner,epoch))return;S.data=stored}notice('Submission was not confirmed. Refresh to check its status before retrying. '+e.message,true);render();}}
  }
  async function edit(index){const owner=S.owner,epoch=S.epoch;const g=groupEntries()[index];if(!g||!permission('sub-users-workspace','edit')||!editable14348(g.batch))return;
    if(queue().some(q=>q.params.p_edit_ids.some(id=>g.lines.some(l=>l.id===id)))){notice('Sync the pending change to this entry first.',true);return;}
    if(draftFilled()&&!await confirmDialog('Replace the current draft?','Save the current draft first if you need to keep it.','Replace'))return;
    if(!current(owner,epoch))return;
    const first=g.lines[0],saved=first.editor_snapshot1437,r=rules();let d;
    const normalize=rows=>rows.map(l=>JSON.stringify([l.date,l.direction,l.fund,l.account,Number(l.amount),l.memo])).sort().join('|');
    const actual=g.lines.map(l=>({date:l.transaction_date,direction:l.direction,fund:l.fund_account_id,account:l.account_id,amount:l.amount,memo:l.memo}));
    if(saved?.components1437&&normalize(actual)===normalize(saved.components1437.filter(l=>l.date===first.transaction_date))){d={...blankDraft(),mode:saved.mode,date:first.transaction_date,memo:saved.memo,reference:saved.reference||'',single:structuredClone(saved.single||[]),lines:(saved.rows||[]).map(l=>({account:accounts().find(a=>a.code+' — '+a.name===l.account||a.id===l.account)?.id||'',debit:l.dr||'',credit:Object.values(l.credits||{}).find(x=>Number(x)>0)||'',memo:l.memo||''}))};}
    else d={...blankDraft(),date:first.transaction_date,memo:first.memo,reference:first.reference||'',single:g.lines.map(l=>({direction:l.direction,source:l.fund_account_id,affected:l.direction==='in'&&l.account_id===l.fund_account_id?r.counterpart:l.account_id,amount:String(l.amount),memo:l.memo||''}))};
    d.correction_journal14347=g.batch.status==='returned'?g.batch.id:null;d.editIds=g.lines.map(l=>l.id);S.draft=d;saveDraftLater();navigate('post');
  }
  async function voidEntry(index){const g=groupEntries()[index];if(!g||!permission('sub-users-workspace','void')||!editable14348(g.batch))return;
    if(!navigator.onLine||queue().length){notice('Sync pending entries and reconnect before voiding.',true);return;}
    const owner=S.owner,epoch=S.epoch,reason=await confirmDialog('Void this entry?','All lines in this entry will be voided together.','Void',true);if(!reason||!current(owner,epoch))return;
    try{await access();if(!current(owner,epoch))return;await rpc('void_staff_editor1437',{p_owner:owner,p_ids:g.lines.map(l=>l.id),p_reason:reason});if(!current(owner,epoch))return;notice('Entry voided.');await refresh();}catch(e){if(current(owner,epoch)){if(denied(e))await revoke(e);else notice('The result needs confirmation. Refresh before retrying. '+e.message,true);}}
  }
  // Guard stale controls from earlier cached phone releases. Reports stay in the full tablet/desktop app.
  async function printReport(){notice('Use a tablet, iPad or desktop to print reports.');}
  function connectionDialog(){const dialog=$('dialog');dialog.close();dialog.classList.add('phone-connection14246');$('dialogBody').innerHTML='<h2>Connection & sync</h2><p>Saved entries sync automatically. Unfinished form edits stay on this device until saved.</p><section class="sync-section14246"><h3>Connection</h3><p>'+esc(navigator.onLine?(S.online?'Online':'Limited connection'):'Offline')+'</p></section><section class="sync-section14246"><h3>Website files</h3><p>'+esc(S.shellReady?'Downloaded for reopening without connection.':'Still preparing for offline reopening.')+'</p></section><section class="sync-section14246"><h3>Device entries · '+queue().length+'</h3>'+(queue().map(q=>'<article class="sync-entry14246"><strong>'+esc(q.draft.date+' · '+q.draft.memo)+'</strong><p>'+esc(q.status==='uncertain'?'Needs confirmation':q.status==='blocked'?'Needs attention':'Waiting to sync')+'</p>'+(q.message?'<p>'+esc(q.message)+'</p>':'')+'<small>Reference: '+esc(q.key)+'</small></article>').join('')||'<p>No device entries waiting to sync.</p>')+'</section>';$('dialogButtons').innerHTML='<button class="btn" value="close">Close</button>';dialog.onclose=()=>dialog.classList.remove('phone-connection14246');dialog.showModal();}
  async function handle(name,index){const owner=S.owner,epoch=S.epoch;try{
    if(name==='scan'||name==='scan-settings')return await openScanner209(name==='scan-settings');
    if(name==='reopen-correction'){const j=headers().filter(j=>j.status==='returned'&&!reopened14348.has(correctionKey14348(j)))[index];if(j&&permission('sub-users-workspace','edit')){reopened14348.add(correctionKey14348(j));render();}return;}if(name==='tool-back'){S.area='users';window.PhoneTools14242?.close();render();drawUsers();return;}if(name==='reopen')return await boot();if(name==='directory-refresh')return await loadDirectory();if(name==='signout')return await signout();if(name==='refresh')return await refresh();if(name==='sync')return await sync();if(name==='submit')return await submit();if(name==='print')return await printReport();if(name==='edit')return await edit(index);if(name==='void')return await voidEntry(index);if(name==='more'){S.limit+=30;render();return;}
    if(S.page!=='post'||S.saving||!S.draft)return;
    if(name==='mode')S.draft.mode=S.draft.mode==='single'?'double':'single';
    if(name==='direction'){const direction=S.draft.single[0]?.direction==='in'?'out':'in';if(!rules().directions.includes(direction))return;for(const l of S.draft.single){l.direction=direction;if(!rules().entryIds.includes(l.affected))l.affected='';}}
    if(name==='add-line')S.draft[S.draft.mode==='double'?'lines':'single'].push(S.draft.mode==='double'?{account:'',debit:'',credit:'',memo:''}:{direction:S.draft.single[0]?.direction||rules().directions[0],source:'',affected:'',amount:'',memo:''});
    if(name==='remove-line'){const rows=S.draft[S.draft.mode==='double'?'lines':'single'];if(rows.length<=(S.draft.mode==='double'?2:1)){notice('Keep at least '+(S.draft.mode==='double'?'two journal lines.':'one entry line.'),true);return;}rows.splice(index,1);}
    if(name==='clear-draft'){if(draftFilled()&&!await confirmDialog('Clear the draft?','This only clears the unfinished form. Saved and pending entries are kept.','Clear'))return;if(!current(owner,epoch))return;S.draft=blankDraft();}
    saveDraftLater();render();
  }catch(e){if(current(owner,epoch))notice(e.message,true);}}
  document.addEventListener('click',e=>{const owner=e.target.closest('[data-owner]'),area=e.target.closest('[data-area]');if(owner){void selectUser(owner.dataset.owner).catch(e=>notice(e.message,true));return;}if(area){void openArea(area.dataset.area).catch(e=>notice(e.message,true));return;}const page=e.target.closest('[data-page],[data-go]');if(page)return navigate(page.dataset.page||page.dataset.go);const b=e.target.closest('[data-action]');if(b&&!b.disabled){e.preventDefault();void handle(b.dataset.action,Number(b.dataset.index||0)).catch(e=>notice(e.message,true));}});
  $('phoneForgotPassword210').onclick=phonePasswordReset210;
  $('loginForm').onsubmit=async e=>{
    e.preventDefault();if(authBusy)return;authBusy=true;window.phoneLogin210.start();loginMessageTarget14293().textContent='';
    try{
      if(!db)throw Error('Authentication is still loading. Try again in a moment.');
      const result=await db.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});
      if(result.error)throw result.error;$('loginPassword').value='';
      // Vault sign-in reloads with its unlocked session; keep the same overlay until navigation.
      if(!window.deviceVault14334)await enter(result.data.session);
    }catch(e){releasePhoneLogin210();loginMessageTarget14293().textContent=e.message;}
    finally{authBusy=false;}
  };
  $('phoneRecoveryForm').onsubmit=async e=>{e.preventDefault();if(authBusy)return;const recoveryActor=S.session?.user?.id,password=$('recoveryPassword').value;if(password!==$('recoveryConfirm').value){$('recoveryStatus').textContent='The passwords do not match.';return;}authBusy=true;const button=e.target.querySelector('button');button.disabled=true;$('recoveryStatus').textContent='Updating password…';try{const result=await db.auth.updateUser({password});if(S.session?.user?.id!==recoveryActor)return;if(result.error)throw result.error;$('recoveryPassword').value=$('recoveryConfirm').value='';recovering=false;await signout(false,'Password updated. Sign in with your new password.');}catch(e){$('recoveryStatus').textContent=e.message;}finally{authBusy=false;button.disabled=false;}};
  $('dialog').addEventListener('click',e=>{const dialog=$('dialog');if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close('cancel');});
  $('avatar').onclick=()=>{$('accountMenu').hidden=!$('accountMenu').hidden;$('avatar').setAttribute('aria-expanded',String(!$('accountMenu').hidden));};$('connection').onclick=connectionDialog;
  document.addEventListener('click',e=>{if(!e.target.closest('#avatar,#accountMenu'))$('accountMenu').hidden=true;});
  for(const event of ['pointerdown','keydown','input','touchstart','wheel'])document.addEventListener(event,touch,{passive:true,capture:true});
  document.addEventListener('keydown',e=>{if(e.isComposing||S.page!=='post'||!e.target.closest('#postForm'))return;const inputs=[...$('postForm').querySelectorAll('input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')],i=inputs.indexOf(e.target);if(e.key==='Enter'&&e.target.tagName!=='TEXTAREA'){e.preventDefault();saveDraftLater();inputs[i+1]?.focus();}});
  window.addEventListener('pagehide',saveMirror);document.addEventListener('visibilitychange',()=>{if(document.hidden)saveMirror();else phoneSyncActivity14351();});
  window.addEventListener('online',()=>{S.online=true;paintConnection();phoneSyncActivity14351();});window.addEventListener('offline',()=>{S.online=false;paintConnection();notice('Offline. Downloaded records and your drafts remain available.');});
  window.addEventListener('storage',e=>{if(e.key===storageKey){const session=cachedSession();if(!session?.user||session.user.id!==S.actor){saveMirror();sessionGate();void boot();}else S.session=session;}});
  let pullStart=null;document.addEventListener('touchstart',e=>{if(window.scrollY===0&&!e.target.closest('input,textarea,select,dialog'))pullStart=e.touches[0].clientY;},{passive:true});document.addEventListener('touchend',e=>{if(pullStart!==null&&e.changedTouches[0].clientY-pullStart>90&&S.page!=='post')void refresh();pullStart=null;},{passive:true});
  const icons={camera:'M3 7h4l2-3h6l2 3h4v14H3z M16 14a4 4 0 1 1-8 0 4 4 0 0 1 8 0',home:'M3 10l9-7 9 7v11h-6v-6H9v6H3z',wallet:'M3 6h18v14H3z M3 6V3h14v3 M16 12h5',plus:'M12 4v16 M4 12h16',book:'M4 3h16v18H4z M8 7h8 M8 11h8 M8 15h5',chart:'M4 20V10 M10 20V4 M16 20v-9 M22 20H2'};for(const node of document.querySelectorAll('[data-icon]'))node.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+icons[node.dataset.icon]+'"/></svg>';
  if(window.ReceiptNative214?.available){S.shellReady=true;paintConnection();}else if('serviceWorker'in navigator){navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='ojm-phone-ready'&&e.data.version===VERSION){S.shellReady=true;paintConnection();}});window.addEventListener('load',()=>{navigator.serviceWorker.register('phone-sw.js?v='+VERSION,{scope:'./',updateViaCache:'none'}).then(reg=>{if(reg.active)reg.active.postMessage({type:'ojm-phone-status'});}).catch(()=>notice('Offline reopening is not ready yet. Continue online and reconnect to finish downloading the phone files.',true));},{once:true});}
  window.PhoneWorkspace14242={version:VERSION,ready:()=>!!S.owner&&permission('sub-users-workspace'),offlineReady:()=>S.shellReady,documentSession:async()=>{if(S.owner!==S.actor||!permission('sub-users-workspace'))throw Error('Open your own workspace first.');if(!validSession(S.session)||Number(S.session.expires_at)*1000-Date.now()<30000)await access();return S.session;},refresh,navigate};
  // This standalone runtime has one timer; it is not loaded alongside the desktop coordinator.
  let phoneSyncLast14351=Date.now(),phoneSyncTimer14351;
  const phoneSyncIdle14351=()=>Date.now()-phoneSyncLast14351>=120000;
  function phoneSyncActivity14351(){phoneSyncLast14351=Date.now();clearTimeout(phoneSyncTimer14351);phoneSyncTimer14351=setTimeout(async()=>{if(!phoneSyncIdle14351()||!S.owner||!navigator.onLine||S.syncing||S.saving||S.loading||authBusy)return;if(queue().some(q=>q.status!=='confirmed'))await sync({automatic:true});else await refresh();},120000);}
  for(const type of ['pointerdown','pointermove','keydown','input','touchstart','wheel','scroll'])document.addEventListener(type,phoneSyncActivity14351,{passive:true,capture:true});
  window.addEventListener('focus',phoneSyncActivity14351);phoneSyncActivity14351();
  void boot();
})();
