import { parse } from 'npm:node-html-parser@7.0.1';

// BCEL publishes public rates. This function uses no accounting tables or credentials.
const page = 'https://www.bcel.com.la/bcel/exchange-rate.html';
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}
function readRates(html: string, day: string, requestedRound: string | null) {
  const doc = parse(html);
  const table = doc.querySelector('table#fxRateAll tbody');
  const label = doc.querySelectorAll('label strong').map(el => el.text.trim()).find(text => /^Date\s*:/i.test(text));
  if (!table || label === undefined) throw Error('BCEL’s exchange-rate table could not be verified.');
  const published = label.replace(/^Date\s*:\s*/i, '');
  const rows = table.querySelectorAll('tr').filter(row => row.querySelector('td[data-title]'));
  if (!published || published !== day || !rows.length) return {status: 'unavailable', date: day};
  const options = doc.querySelectorAll('#round option');
  const rounds = options.map(el => el.getAttribute('value') || '').filter(value => /^[1-9]\d*$/.test(value));
  const round = options.find(el => el.hasAttribute('selected'))?.getAttribute('value') || (rounds.length === 1 ? rounds[0] : '');
  if (!rounds.includes(round)) throw Error('BCEL’s published round could not be verified.');
  if (requestedRound && round !== requestedRound) return {status: 'unavailable', date: day};
  const quotes = rows.map(row => {
    function field(name: string) {
      const cell = row.querySelector('td[data-title="' + name + '"]');
      if (!cell) throw Error('BCEL’s rate columns have changed.');
      return cell.text.replace(/\s+/g, ' ').trim();
    }
    function rate(name: string) {
      const value = field(name);
      if (/^[-–—]$/.test(value)) return null;
      if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(value)) throw Error('BCEL returned an unrecognized rate.');
      return value; // Preserve every decimal and the bank's published precision.
    }
    const code = field('Currency Code'), name = field('Foreign Currencies');
    if (!code || !name) throw Error('A BCEL currency row is incomplete.');
    return {code, name, note: rate('NOTE'), bill: rate('BILL'), eft: rate('EFT'), sell: rate('Sell Rates')};
  });
  return {status: 'published', date: published, round, rounds, quotes, checkedAt: new Date().toISOString()};
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, {status: 204, headers});
  if (req.method !== 'GET') return json({error: 'Use GET.'}, 405);
  const params = new URL(req.url).searchParams;
  const day = params.get('date') || '', round = params.get('round');
  const stamp = Date.parse(day + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(stamp) || new Date(stamp).toISOString().slice(0,10) !== day || (round !== null && !/^[1-9]\d{0,3}$/.test(round))) return json({error: 'Choose a valid date and round.'}, 400);
  const url = new URL(page);
  url.searchParams.set('exDate', day);
  url.searchParams.set('lang', 'en');
  try {
    // Selecting a round on BCEL's own page posts to its detail view.
    const options: RequestInit = {redirect: 'error', signal: AbortSignal.timeout(15000), headers: {Accept: 'text/html'}};
    if (round) {
      options.method = 'POST';
      options.body = new URLSearchParams({exDate: day, round});
      options.headers = {Accept: 'text/html', Cookie: 'Language=en'};
    }
    const response = await fetch(round ? new URL('detail-exchange-rate', page) : url, options);
    if (!response.ok) return json({error: 'BCEL is unavailable. Try Refresh in a moment.'}, 502);
    return json(readRates(await response.text(), day, round));
  } catch (error) {
    console.warn('BCEL lookup:', error instanceof Error ? error.message : 'unavailable');
    return json({error: 'Could not confirm the rates with BCEL. Try Refresh or open the source.'}, 502);
  }
});
