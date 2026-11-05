/* Render the shipped app with synthetic accounts and real browser resize events. */
const assert=require('node:assert/strict');
const fixture=require('./phase0-browser-fixture.cjs');
process.env.PHASE0_DEVICE='tablet';

async function rotations(page,session,owner){
 for(const [width,height] of [[834,1112],[1194,744],[834,1112],[1024,768]]){
  const landscape=width>height;
  await session.send('Emulation.setDeviceMetricsOverride',{
   width,height,screenWidth:width,screenHeight:height,mobile:true,deviceScaleFactor:2,
   screenOrientation:{type:landscape?'landscapePrimary':'portraitPrimary',angle:landscape?90:0}
  });
  await page.waitForFunction(({width,landscape})=>{
   const state=window.tabletViewport132?.state;
   return state?.width===width && state.landscape===landscape;
  },{width,landscape});
  const rects=await page.evaluate(()=>{
   const rail=document.querySelector('#appSidebar'),main=document.querySelector('.main-content-area');
   const visible=n=>n.getBoundingClientRect().width>0 && n.getBoundingClientRect().height>0;
   return {rail:rail.getBoundingClientRect().width,right:main.getBoundingClientRect().right*visualViewport.scale,
    owner:document.querySelector('#sub-users-workspace.active')?activeSubUserTab()?.userId:null,
    menu:rail.querySelector('.nav-rail-toggle291').getAttribute('aria-expanded'),
    duplicated:document.querySelectorAll('#tabletHeader14353,#tabletMenu99,#tabletMenu118,#rotateTablet99,#landscape117').length,
    bannerIcon:[...document.querySelectorAll('.tab-content.active .area-banner113 :is(.banner-icon113,.banner-art113)')].some(visible),
    legacyToggle:visible(document.querySelector('#mobileMenuToggle')),
    active:document.querySelector('.tab-content.active')?.id};
  });
  assert.equal(rects.duplicated,0);assert.equal(rects.legacyToggle,false);assert.equal(rects.rail,52);
  assert(Math.abs(rects.right-width)<2,rects.active+' does not fill '+width);
  if(owner){assert.equal(rects.owner,owner,'rotation changed selected workspace');assert.equal(rects.bannerIcon,false);}
  assert.equal(rects.menu,'false');
  await page.getByRole('button',{name:'Expand navigation',exact:true}).click();
  assert.equal(await page.locator('#appSidebar').evaluate(n=>n.getBoundingClientRect().width),238);
  // Leave the drawer open. The next rotation must reset both its width and its accessible state.
 }
 await page.getByRole('button',{name:'Collapse navigation',exact:true}).click();
}

(async()=>{
 const fx=await fixture();
 try {
  const admin=await fx.open();await admin.login();
  const session=await admin.context.newCDPSession(admin.page);
  await admin.page.evaluate(()=>{switchTab('journal');document.querySelector('#jeGeneralMemo').value='Draft through rotation';});
  await rotations(admin.page,session);
  assert.equal(await admin.page.locator('#jeGeneralMemo').inputValue(),'Draft through rotation');
  await admin.page.evaluate(()=>switchTab('sub-users-home14229'));
  const cashier=await admin.page.evaluate(()=>availableSubUsers().find(u=>u.full_name==='Gee Ann').id);
  await admin.page.locator('[data-team-user14230="'+cashier+'"]:visible').first().click();
  await admin.page.waitForSelector('#personalWorkspace1437');
  await rotations(admin.page,session,cashier);await admin.context.close();

  const staff=await fx.open('desktop','staff');
  await staff.page.locator('#loginEmail').fill(await staff.page.evaluate(()=>__fixture.profiles.find(u=>u.full_name==='Gee Ann').email));
  await staff.page.locator('#loginPassword').fill('fixture-only');await staff.page.locator('#loginForm button[type=submit]').click();
  await staff.page.waitForFunction(()=>window.startup14257?.prepared && typeof liveProfile!=='undefined' && liveProfile?.id===__fixture.profiles.find(u=>u.full_name==='Gee Ann').id);
  await staff.page.evaluate(()=>{switchTab('sub-users-workspace');openWorkspaceUser(liveProfile.id);});
  await staff.page.waitForSelector('#personalWorkspace1437');
  await rotations(staff.page,await staff.context.newCDPSession(staff.page),cashier);
  await staff.context.close();
  console.log('PASS repeated portrait/landscape rotations in Journal, admin review of cashier, and cashier own account');
 } finally {await fx.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
