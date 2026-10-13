/* Temporary, opt-in DevTools snippet. Never loaded by the application.
 * Records timings/counts only, with no request bodies, tokens, storage keys or
 * financial records. Reload or call ojmNavDiag.stop() to remove instrumentation.
 */
(() => {
  'use strict';
  window.ojmNavDiag?.stop();
  const runtimeFeatures = {
    preparedStageProbe: typeof window.startup14257?.isPrepared === 'function',
    payrollMemoryGuard: typeof window.loadWork82 === 'function' && /\bmemoryKey\b/.test(Function.prototype.toString.call(window.loadWork82))
  };
  const started = performance.now(), rows = [], spans = [], observations = [];
  const undo = [], observers = [], frames = new Set(), timers = new Set();
  const clock = () => performance.now();
  const round = n => Math.round(n * 10) / 10;
  const keep = (list, value, max = 6000) => { list.push(value); if (list.length > max) list.shift(); };
  const path = value => { try { const u = new URL(value, location.href); return u.pathname; } catch { return ''; } };
  const active = () => document.querySelector('.tab-content.active');
  const navigation = node => node?.closest?.('#appSidebar .nav-header,#appSidebar .tab-btn,#categoryTabs button');
  let running = true, current, pointer, serial = 0;
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (running) fn(); }, ms); timers.add(id); return id; };
  const frame = fn => { const id = requestAnimationFrame(t => { frames.delete(id); if (running) fn(t); }); frames.add(id); };
  const channel = new MessageChannel(), probes = new Map();
  channel.port1.onmessage = event => { const fn = probes.get(event.data); probes.delete(event.data); if (running) fn?.(); };
  function probe(fn) { const id = ++serial; probes.set(id, fn); channel.port2.postMessage(id); }
  function begin(kind, name) {
    const span = {kind, name, start: clock(), navigation: current?.id || null};
    keep(spans, span); return span;
  }
  function finish(span) { span.end = clock(); span.ms = round(span.end - span.start); }
  function wrap(object, name, kind = 'function') {
    const original = object?.[name]; if (typeof original !== 'function') return;
    function measured(...args) {
      if (!running) return original.apply(this, args);
      const span = begin(kind, name);
      if (name === 'switchTab' && current && typeof args[0] === 'string') current.target = args[0];
      try {
        const result = original.apply(this, args); span.syncMs = round(clock() - span.start);
        if (result && typeof result.then === 'function') result.then(() => finish(span), () => { span.failed = true; finish(span); });
        else finish(span);
        return result;
      } catch (error) { span.failed = true; finish(span); throw error; }
    }
    object[name] = measured;
    undo.push(() => { if (object[name] === measured) object[name] = original; });
  }
  for (const name of ['activateCategory','switchTab','scrollToAccountModule',
    'loadReferenceDataFromSupabase','loadBusinessSettingsFromSupabase','loadProfilesFromSupabase',
    'loadJournalFromSupabase','loadWork82','loadSubmissionsFromSupabase','loadLegalDocumentsFromSupabase',
    'renderWork82','renderJournalHistoryTable','renderAllTransactionsTable','renderNewTransactionsTable',
    'refreshAllTables','polish69','sizeCurrencyTables69','saveLocation69']) wrap(window, name);
  // Observe actual network calls without reading headers, queries or responses.
  const originalFetch = window.fetch;
  function measuredFetch(...args) {
    if (!running) return originalFetch.apply(this, args);
    const endpoint = path(typeof args[0] === 'string' || args[0] instanceof URL ? args[0] : args[0]?.url);
    const span = begin('fetch', endpoint.startsWith('/rest/v1/') || endpoint.includes('/rest/v1/') ? endpoint : 'non-database request');
    try { const result = originalFetch.apply(this, args); result.then(r => { span.status = r.status; finish(span); }, () => { span.failed = true; finish(span); }); return result; }
    catch (error) { span.failed = true; finish(span); throw error; }
  }
  window.fetch = measuredFetch; undo.push(() => { if (window.fetch === measuredFetch) window.fetch = originalFetch; });
  for (const method of ['get','getAll','getKey','getAllKeys','count','openCursor','openKeyCursor']) {
    const original = IDBObjectStore.prototype[method]; if (!original) continue;
    function measuredRead(...args) {
      if (!running) return original.apply(this, args);
      const span = begin('indexedDB', method);
      try {
        const request = original.apply(this, args);
        // A cursor span measures its first result, not the complete iteration.
        request.addEventListener('success', () => finish(span), {once: true});
        request.addEventListener('error', () => { span.failed = true; finish(span); }, {once: true});
        return request;
      } catch (error) { span.failed = true; finish(span); throw error; }
    }
    IDBObjectStore.prototype[method] = measuredRead;
    undo.push(() => { if (IDBObjectStore.prototype[method] === measuredRead) IDBObjectStore.prototype[method] = original; });
  }
  // Encryption is timed without inspecting its arguments or resulting data.
  wrap(globalThis.crypto?.subtle, 'decrypt', 'crypto');
  wrap(globalThis.crypto?.subtle, 'encrypt', 'crypto');
  const supported = globalThis.PerformanceObserver?.supportedEntryTypes || [];
  for (const type of ['longtask','event','long-animation-frame','resource']) {
    if (!supported.includes(type)) continue;
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.startTime < started) continue;
        if (type === 'event' && !['click','pointerdown','pointerup','keydown'].includes(entry.name)) continue;
        if (type === 'resource' && !['fetch','xmlhttprequest'].includes(entry.initiatorType)) continue;
        const value = {type, start: entry.startTime, ms: round(entry.duration)};
        if (type === 'event') Object.assign(value, {name: entry.name, inputDelayMs: round(entry.processingStart - entry.startTime), handlerMs: round(entry.processingEnd - entry.processingStart), interactionId: entry.interactionId});
        if (type === 'resource') Object.assign(value, {name: path(entry.name), transferSize: entry.transferSize});
        if (type === 'long-animation-frame') Object.assign(value, {
          blockingMs: round(entry.blockingDuration),
          renderingMs: entry.renderStart ? round(entry.startTime + entry.duration - entry.renderStart) : null,
          scripts: (entry.scripts || []).map(s => ({source: path(s.sourceURL), function: s.sourceFunctionName, ms: round(s.duration), forcedLayoutMs: round(s.forcedStyleAndLayoutDuration)}))
        });
        keep(observations, value);
      }
    });
    observer.observe(type === 'event' ? {type, durationThreshold: 16} : {type}); observers.push(observer);
  }
  function visible(row) {
    const node = active();
    return node && (!row.target || node.id === row.target) && node.getClientRects().length > 0 &&
      !document.body.classList.contains('startup-pending1443') &&
      document.getElementById('loginGate')?.classList.contains('is-authenticated');
  }
  function pending(row) { return spans.some(s => s.navigation === row.id && !s.end); }
  function click(event) {
    const button = navigation(event.target); if (!event.isTrusted || !button) return;
    if (current && !current.finished) { current.finished = clock(); current.superseded = true; }
    const now = clock(), eventStart = event.timeStamp <= now && event.timeStamp >= 0 ? event.timeStamp : now;
    const row = {id: rows.length ? rows.at(-1).id + 1 : 1, start: eventStart, captured: now,
      inputDelayToCaptureMs: round(now - eventStart), from: active()?.id || '',
      module: button.closest('.nav-category')?.dataset.module || '', online: navigator.onLine,
      pointerStart: pointer?.button === button && now - pointer.time < 5000 ? pointer.time : null,
      preloaded: !!window.startup14257?.prepared};
    current = row; keep(rows, row, 100);
    let previous = now, goodFrames = 0, armed = false;
    function sample() {
      if (current !== row || row.finished) return;
      const time = clock(), gap = time - previous; previous = time;
      if (time - row.start > 15000) { row.timedOut = true; row.active = active()?.id; row.finished = time; return; }
      row.maxFrameGapMs = Math.max(row.maxFrameGapMs || 0, round(gap));
      if (visible(row)) {
        if (!armed) {
          armed = true;
          // Two rAFs are a paint opportunity estimate, not a physical screen measurement.
          frame(() => {
            if (current !== row || row.finished || !visible(row)) { armed = false; return; }
            row.clickToVisibleMs = round(clock() - row.start);
            if (row.pointerStart != null) row.pointerToVisibleMs = round(clock() - row.pointerStart);
            const sent = clock();
            probe(() => { row.afterPaintTaskDelayMs = round(clock() - sent); row.firstResponseProbeMs = round(clock() - row.start); });
          });
        }
        goodFrames = !pending(row) && gap <= 50 ? goodFrames + 1 : 0;
        if (row.clickToVisibleMs != null && goodFrames >= 2) {
          const sent = clock();
          probe(() => {
            if (current !== row || row.finished) return;
            if (clock() - sent > 50 || pending(row) || !visible(row)) { goodFrames = 0; frame(sample); return; }
            row.clickToResponsiveMs = round(clock() - row.start);
            row.active = active()?.id; row.finished = clock();
          }); return;
        }
      } else goodFrames = 0;
      frame(sample);
    }
    frame(sample);
  }
  const down = event => { if (event.isTrusted && navigation(event.target)) pointer = {button: navigation(event.target), time: event.timeStamp}; };
  window.addEventListener('pointerdown', down, true); window.addEventListener('click', click, true);
  undo.push(() => { window.removeEventListener('pointerdown', down, true); window.removeEventListener('click', click, true); });
  function report() {
    const markers = [...document.scripts].map(s => s.getAttribute('src')).filter(s => /(?:startup14257|local-first14333|device-vault14334)/.test(s || ''));
    return {schema: 1, note: 'Paint and responsiveness are observable proxies; pending work includes only instrumented calls. Nested spans overlap and must not be summed. CDP/DevTools trace is needed for full CPU and rendering attribution.',
      environment: {url: location.origin + location.pathname, capturedAt: new Date().toISOString(), userAgent: navigator.userAgent,
        viewport: [innerWidth, innerHeight], devicePixelRatio, visibility: document.visibilityState,
        serviceWorker: navigator.serviceWorker?.controller ? path(navigator.serviceWorker.controller.scriptURL) : null,
        configuredBranch: window.OJM_DEPLOYMENT?.site?.branch || null, scriptMarkers: markers, runtimeFeatures,
        revisionHint: markers.length === 3 && markers.every(s => s.includes('v=143.50')) ? 'development correction asset markers (not commit proof)' : 'production/older/mixed markers: check against repository',
        domNodes: document.getElementsByTagName('*').length, supportedPerformanceEntries: supported},
      navigations: rows.map(row => ({...row, spans: spans.filter(s => s.navigation === row.id), observations: observations.filter(o => o.start < (row.finished || clock()) && o.start + o.ms >= row.start)})),
      unassignedSpans: spans.filter(s => !s.navigation), observations};
  }
  const api = {report, get count() { return rows.length; }, get latest() { return current ? {...current} : null; }, table() { console.table(rows.map(r => ({from:r.from, to:r.active || r.target, online:r.online, visibleMs:r.clickToVisibleMs, responsiveMs:r.clickToResponsiveMs, pointerVisibleMs:r.pointerToVisibleMs, timedOut:!!r.timedOut}))); },
    download() { const url = URL.createObjectURL(new Blob([JSON.stringify(report(), null, 2)], {type:'application/json'})); const a = document.createElement('a'); a.href = url; a.download = 'oonjai-navigation-diagnostic.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); },
    stop() { running = false; if (current && !current.finished) { current.stopped = true; current.finished = clock(); } frames.forEach(cancelAnimationFrame); timers.forEach(clearTimeout); observers.forEach(o => o.disconnect()); undo.reverse().forEach(fn => fn()); channel.port1.close(); channel.port2.close(); probes.clear(); }
  };
  window.ojmNavDiag = api;
  later(() => api.stop(), 10 * 60 * 1000);
  console.info('Navigation diagnostic active for this tab for up to 10 minutes. Navigate normally, then ojmNavDiag.table() or ojmNavDiag.download(). Reload or ojmNavDiag.stop() removes it.');
})();
