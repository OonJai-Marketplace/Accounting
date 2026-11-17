// Created only when the bank tab is opened. The lookup does not read or write the books.
function createBcelRatePanel(dialog, preferenceKey, valid) {
 const defaults = 'https://www.bcel.com.la/bcel/exchange-rate.html?lang=en';
 const today = new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Vientiane'}).format(new Date());
 const panel = dialog.querySelector('#fx-bank-panel');
 const settingsKey = preferenceKey + ':bcel-source', cacheKey = preferenceKey + ':bcel-quotes';
 function saved(key) { try { return localStorage.getItem(key); } catch { return null; } }
 function sourceUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !['www.bcel.com.la','bcel.com.la'].includes(url.hostname) || url.port || url.username || url.password || url.pathname.replace(/\/{2,}/g,'/') !== '/bcel/exchange-rate.html') throw Error('Use BCEL’s official HTTPS exchange-rate page.');
  const source = new URL(defaults);
  if (url.searchParams.get('lang') === 'la') source.searchParams.set('lang','la');
  const d = url.searchParams.get('exDate'), r = url.searchParams.get('round');
  if (d) {
   const time = Date.parse(d + 'T00:00:00Z');
   if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(time) || new Date(time).toISOString().slice(0,10) !== d || d > today) throw Error('Use a BCEL link with a valid rate date.');
   source.searchParams.set('exDate',d);
  }
  if (r) {
   if (!/^[1-9]\d{0,3}$/.test(r)) throw Error('Use a valid BCEL round number.');
   source.searchParams.set('round',r);
  }
  return source;
 }
 let source;
 try { source = sourceUrl(saved(settingsKey) || defaults); } catch { source = new URL(defaults); }
 let cache;
 try { cache = JSON.parse(saved(cacheKey)); } catch {}
 if (!Array.isArray(cache)) cache = [];
 let request = null;
 panel.innerHTML = `<form class="fx-source" hidden><label>BCEL source link<input name="source" type="url" required></label><div class="watch-toolbar"><button type="button" data-cancel>Cancel</button><button type="submit">Save source</button></div><small role="status"></small></form>
 <div class="fx-filters"><label>Rate date<input type="date" name="date" required></label><label>Round<select name="round"></select></label><a data-source-link target="_blank" rel="noopener noreferrer">View BCEL source ↗</a></div>
 <p data-bank-status role="status"></p><div class="watch-scroll" data-quotes></div>`;
 const form = panel.querySelector('form'), day = panel.querySelector('[name=date]'), round = panel.querySelector('[name=round]');
 const sourceLink = panel.querySelector('[data-source-link]'), status = panel.querySelector('[data-bank-status]'), result = panel.querySelector('[data-quotes]');
 const settingsButton = dialog.querySelector('[data-bank-settings]');
 day.max = today;
 function rounds(available, selected) {
  round.replaceChildren(new Option('Latest',''), ...available.map(n => new Option(n,n)));
  round.value = selected;
 }
 function resetDate() {
  day.value = source.searchParams.get('exDate') || today;
  const initial = source.searchParams.get('round') || '';
  rounds(initial ? [initial] : [], initial);
 }
 function updateLink(effectiveRound) {
  const link = new URL(source);
  if (day.value) link.searchParams.set('exDate',day.value); else link.searchParams.delete('exDate');
  if (effectiveRound) link.searchParams.set('round',effectiveRound); else link.searchParams.delete('round');
  sourceLink.href = link.href;
 }
 function render(data, fromCache) {
  rounds(data.rounds, round.value);
  updateLink(data.round);
  const checked = new Date(data.checkedAt);
  const checkedDate = checked.toLocaleDateString('sv-SE',{timeZone:'Asia/Vientiane'});
  const checkedTime = checked.toLocaleTimeString('en-GB',{timeZone:'Asia/Vientiane',hour:'2-digit',minute:'2-digit'});
  status.textContent = `${formatAppDate(data.date)} · Round ${data.round} · LAK per foreign unit · ${fromCache ? 'Saved copy, checked' : 'Checked'} ${formatAppDate(checkedDate)} ${checkedTime} (Laos)`;
  const esc = v => escapeHtml(String(v ?? '—'));
  const rows = data.quotes.map(q => `<tr><th scope="row">${esc(q.code)}<small>${esc(q.name)}</small></th>${[q.note,q.bill,q.eft,q.sell].map(v => '<td>'+esc(v)+'</td>').join('')}</tr>`);
  result.innerHTML = '<table aria-label="BCEL exchange rates in Lao kip"><thead><tr><th scope="col">Currency</th><th scope="col">Buy · Note</th><th scope="col">Buy · Bill</th><th scope="col">Buy · EFT</th><th scope="col">Sell</th></tr></thead><tbody>'+rows.join('')+'</tbody></table>';
 }
 function cancel() { request?.abort(); request = null; }
 async function load(refresh = false) {
  cancel(); if (!valid() || panel.hidden) return;
  const date = day.value, choice = round.value;
  const cacheId = date + '/' + choice;
  const cached = cache.find(item => item?.key === cacheId && item.data?.date === date && Array.isArray(item.data.quotes) && Array.isArray(item.data.rounds));
  result.replaceChildren(); updateLink(choice);
  if (!day.validity.valid) { status.textContent = 'Choose a rate date through today.'; return; }
  if (cached && !refresh) { render(cached.data, true); return; }
  if (!navigator.onLine) {
   if (cached) render(cached.data, true);
   status.textContent = cached ? status.textContent+' · Offline' : 'Offline. No saved BCEL rate for this date and round.';
   return;
  }
  const controller = new AbortController(); request = controller;
  const timeout = setTimeout(() => controller.abort(), 25000);
  const current = () => request === controller && valid() && !panel.hidden;
  status.textContent = 'Checking BCEL…';
  try {
   const endpoint = new URL(window.OJM_SUPABASE_URL + '/functions/v1/bcel-rates');
   endpoint.searchParams.set('date', date);
   if (choice) endpoint.searchParams.set('round', choice);
   // Only the public project key is used for public bank data.
   const key = window.OJM_SUPABASE_ANON_KEY;
   const response = await fetch(endpoint, {signal:controller.signal, cache:'no-store', headers:{apikey:key, Authorization:'Bearer '+key}});
   if (!response.ok) throw Error('The lookup is unavailable.');
   const data = await response.json();
   if (!current()) return;
   if (data.status === 'unavailable' && data.date === date) {
    cache = cache.filter(item => item?.key !== cacheId);
    try { localStorage.setItem(cacheKey,JSON.stringify(cache)); } catch {}
    status.textContent = 'No confirmed BCEL rate for '+formatAppDate(date)+(choice ? ', round '+choice : '')+'.'; return;
   }
   if (data.status !== 'published' || data.date !== date || (choice && data.round !== choice) || !data.quotes?.length || !data.rounds?.includes(data.round)) throw Error('Unconfirmed result.');
   render(data, false);
   cache = [{key:cacheId,data}, ...cache.filter(item => item?.key !== cacheId)].slice(0,16);
   try { localStorage.setItem(cacheKey,JSON.stringify(cache)); } catch { /* The online result is still available. */ }
  } catch {
   if (!current()) return;
   if (cached) render(cached.data, true);
   status.textContent = (cached ? status.textContent+' · ' : '')+'Could not reach or verify BCEL. Try Refresh or View BCEL source.';
  } finally { clearTimeout(timeout); if (request === controller) request = null; }
 }
 function toggleSettings(open) {
  form.hidden = !open; settingsButton.setAttribute('aria-expanded',String(open));
  if (open) { form.elements.source.value = source.href; form.querySelector('small').textContent = ''; form.elements.source.focus(); }
  else settingsButton.focus();
 }
 settingsButton.onclick = () => toggleSettings(form.hidden);
 form.querySelector('[data-cancel]').onclick = () => toggleSettings(false);
 form.onsubmit = event => {
  event.preventDefault(); if (!valid()) return;
  let next;
  try { next = sourceUrl(form.elements.source.value.trim()); }
  catch (e) { form.querySelector('small').textContent = e.message || 'Use BCEL’s official exchange-rate link.'; return; }
  try { localStorage.setItem(settingsKey,next.href); } catch { form.querySelector('small').textContent = 'This device could not save the source.'; return; }
  source = next; resetDate(); toggleSettings(false); load();
 };
 day.onchange = () => { rounds([], ''); load(); };
 round.onchange = () => load();
 dialog.querySelector('[data-bank-refresh]').onclick = () => load(true);
 resetDate();
 return {load, cancel};
}
