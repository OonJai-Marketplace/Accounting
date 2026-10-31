/* Independent, own-account phone workspace. No desktop runtime or business modules. */
(() => {
  'use strict';
  const VERSION = '143.216', $ = id => document.getElementById(id);
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
