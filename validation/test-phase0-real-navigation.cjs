/* Real sidebar input, real bundled SDK, local synthetic database only.
 * PHASE0_ROOT may point to main; the diagnostic itself is always from this tree.
 */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const create = require('./phase0-browser-fixture.cjs');
const cpu = Number(process.env.PHASE0_CPU || 1), sized = process.env.PHASE0_SIZED === '1';
const repeats = Number(process.env.PHASE0_REPEATS || 3);
const output = process.env.PHASE0_RESULTS || '/tmp/phase0-real-navigation.json';
const uid = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
function populate(fixture) {
  for (let i = 0; i < 133; i++) fixture.tables.accounts.push({...fixture.accounts[0], id:uid(1000+i), code:String(6000+i), name:'Synthetic account '+i});
  fixture.journal = Array.from({length:1000}, (_,i) => ({id:'synthetic-'+Math.floor(i/2), date:'2026-10-05', accountId:uid(i%2?101:110), account:'Synthetic account', currency:'LAK', debit:i%2?0:100, credit:i%2?100:0, archived:false, memo:'Synthetic row', generalMemo:'Synthetic journal'}));
  fixture.tables.payroll_employees = Array.from({length:10}, (_,i) => ({id:uid(5000+i), data:{name:'Synthetic worker '+i, code:'E'+i, active:true, currency:'LAK', salary:3500000}}));
}
function profileSummary(profile) {
  const nodes = new Map(profile.nodes.map(n => [n.id,n]));
  const parents = new Map(profile.nodes.flatMap(n => (n.children || []).map(id => [id,n.id]))), totals = new Map();
  (profile.samples || []).forEach((id,i) => {
    // Attribute native calls to their nearest application frame, not test code.
    while (id) {
      const frame = nodes.get(id).callFrame;
      if (/^http:\/\/127\.0\.0\.1/.test(frame.url)) {
        const key = [frame.functionName || '(anonymous)',new URL(frame.url).pathname,frame.lineNumber+1].join(':');
        totals.set(key,(totals.get(key)||0)+(profile.timeDeltas[i]||0)/1000); break;
      }
      id = parents.get(id);
    }
  });
  return [...totals].sort((a,b)=>b[1]-a[1]).slice(0,25).map(([functionSource,sampledMs])=>({functionSource,sampledMs:Math.round(sampledMs)}));
}
(async () => {
  const f = await create(), measurements = [], errors = [];
  let results;
  try {
    const {page,context,login} = await f.open();
    page.on('pageerror', e => errors.push(e.message));
    if (sized) populate(f.fixture);
    const install = fs.readFileSync(path.join(__dirname,'../tools/desktop-navigation-diagnostic.js'),'utf8');
    await page.addInitScript("addEventListener('load',()=>{window.__diagOriginals={switchTab,fetch,get:IDBObjectStore.prototype.get};\n"+install+"\n},{once:true});");
    await page.evaluate(() => { window.__diagOriginals = {switchTab,fetch,get:IDBObjectStore.prototype.get}; });
    await page.addScriptTag({path:path.join(__dirname,'../tools/desktop-navigation-diagnostic.js')});
    await login(); await page.waitForFunction(() => offline14239.state().shellReady);
    await page.waitForTimeout(500);
    const preload = await page.evaluate(() => ({prepared:startup14257.prepared,
      stages:Object.fromEntries(['reference','business','profiles','journal','payroll','documents'].map(n=>[n,startup14257.isPrepared?.(n) ?? null])),
      accounts:AccountingStore.accounts.length, journalLines:JournalModule.entries.length, employees:Work82.employees.length,
      spans:ojmNavDiag.report().unassignedSpans.filter(s=>/^load/.test(s.name))}));
    assert(preload.prepared); assert(Object.values(preload.stages).every(v=>v===null||v===true));
    if (sized) { assert.equal(preload.accounts,137); assert.equal(preload.journalLines,1000); assert.equal(preload.employees,10); }
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
    await cdp.send('Profiler.enable'); await cdp.send('Profiler.start');
    for (const offline of [false,true]) {
      await context.setOffline(offline);
      for (let repeat=0; repeat<repeats; repeat++) for (const [module,target] of [
        ['settings','settings-business'],['transactions','journal'],['sub-users','sub-users-home14229'],['hr','payroll-employees'],['payroll','payroll-overview']
      ]) {
        const before = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
        const requestStart = f.requests.length, count = await page.evaluate(()=>ojmNavDiag.count);
        await page.locator('#nav-module-'+module+' .nav-header').click();
        await page.waitForFunction(count => ojmNavDiag.count>count&&!!ojmNavDiag.latest?.finished,count,{timeout:20000});
        // Bounded observation tail captures later observer work separately from ready time.
        await page.waitForTimeout(200);
        const after = (await cdp.send('Performance.getMetrics')).metrics;
        const row = await page.evaluate(()=>ojmNavDiag.report().navigations.at(-1));
        assert.equal(row.active,target); assert.equal(row.online,!offline); assert(!row.timedOut);
        assert(row.clickToVisibleMs>=0 && row.clickToResponsiveMs>=row.clickToVisibleMs);
        const metrics = Object.fromEntries(after.filter(x=>/^(TaskDuration|ScriptDuration|LayoutDuration|RecalcStyleDuration)$/.test(x.name)).map(x=>[x.name,Math.round((x.value-before[x.name])*10000)/10]));
        measurements.push({offline,repeat,module,...row,observationWindowMetricsMs:metrics,requests:f.requests.slice(requestStart)});
      }
    }
    const profile = (await cdp.send('Profiler.stop')).profile;
    const diagnostic = await page.evaluate(()=>ojmNavDiag.report());
    assert(!JSON.stringify(diagnostic).includes('fixture-only'),'diagnostic must not contain credentials');
    assert(!JSON.stringify(diagnostic).includes('Synthetic worker'),'diagnostic must not contain employee data');
    assert(!JSON.stringify(diagnostic).includes('Synthetic journal'),'diagnostic must not contain financial data');
    const restored = await page.evaluate(()=>{ojmNavDiag.stop();return switchTab===__diagOriginals.switchTab&&fetch===__diagOriginals.fetch&&IDBObjectStore.prototype.get===__diagOriginals.get;});
    assert(restored,'stop must restore original functions');
    // Navigation still functions after removing the diagnostic.
    await page.locator('#nav-module-settings .nav-header').click();
    assert.equal(await page.locator('.tab-content.active').getAttribute('id'),'settings-business');
    assert.deepEqual(errors,[]);
    results = {fixture:sized?'137 accounts, 1000 journal lines, 10 employees':'4 accounts, empty journal/payroll',cpuSlowdown:cpu,repeats,
      scope:'Local synthetic server; real sidebar clicks; no production account. Metrics include the observation tail and overlap; do not sum function spans.',
      environment:diagnostic.environment,preload,measurements,profile:profileSummary(profile),errors,
      passed:['login preparation and memory verified','real sidebar route targets online/offline','separate visible/responsive proxies','diagnostic privacy checks','instrumentation removal','navigation after removal']};
    fs.writeFileSync(output,JSON.stringify(results,null,2));
    console.log('PASS',results.passed.join('; '));
    for (const offline of [false,true]) {
      const rows=measurements.filter(r=>r.offline===offline),quantile=(key,q)=>rows.map(r=>r[key]).sort((a,b)=>a-b)[Math.ceil(rows.length*q)-1];
      console.log(offline?'offline':'online',JSON.stringify({count:rows.length,visibleMedianMs:quantile('clickToVisibleMs',.5),visibleP95Ms:quantile('clickToVisibleMs',.95),responsiveMedianMs:quantile('clickToResponsiveMs',.5),responsiveP95Ms:quantile('clickToResponsiveMs',.95)}));
    }
  } finally { await f.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
