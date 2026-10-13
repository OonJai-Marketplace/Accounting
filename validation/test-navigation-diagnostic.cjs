const assert=require('node:assert/strict'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
  try {
    const page=await browser.newPage();
    await page.setContent('<div id="loginGate" class="is-authenticated"></div><div id="appSidebar"><div class="nav-category" data-module="settings"><button class="nav-header">Settings</button></div></div><section id="settings-business" class="tab-content">Visible controls</section>');
    await page.evaluate(()=>{
      window.startup14257={prepared:true};
      window.loadWork82=()=>new Promise(resolve=>window.releaseDiagnosticTest=resolve);
      window.switchTab=()=>{document.querySelector('.tab-content').classList.add('active');loadWork82();};
      document.querySelector('button').onclick=()=>switchTab('settings-business');
      window.originalSwitch=switchTab;
    });
    await page.addScriptTag({path:path.join(__dirname,'../tools/desktop-navigation-diagnostic.js')});
    await page.locator('button').click();
    await page.waitForFunction(()=>ojmNavDiag.latest?.clickToVisibleMs!=null);
    assert.equal(await page.evaluate(()=>ojmNavDiag.latest.clickToResponsiveMs),undefined,'visible must not imply ready while a loader is pending');
    const releaseAt=await page.evaluate(()=>{const t=performance.now();releaseDiagnosticTest();return t;});
    await page.waitForFunction(()=>ojmNavDiag.latest?.finished);
    const row=await page.evaluate(()=>ojmNavDiag.latest);
    assert(row.start+row.clickToResponsiveMs>=releaseAt-1,'responsive proxy must follow loader settlement');
    await page.evaluate(()=>ojmNavDiag.stop());
    assert(await page.evaluate(()=>switchTab===originalSwitch));
    const count=await page.evaluate(()=>ojmNavDiag.count);
    await page.locator('button').click();
    assert.equal(await page.evaluate(()=>ojmNavDiag.count),count,'stop removes click listener');
    console.log('PASS visible/async-ready distinction; original function identity and listeners restored');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
