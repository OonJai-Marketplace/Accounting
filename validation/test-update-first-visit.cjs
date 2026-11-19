/* Exercise Settings > Website Update with a previous shell controlling the tab. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const { chromium } = require('playwright');

const read = path => fs.readFileSync(path,'utf8');
const worker = read('desktop-sw14242.js');
const version = worker.match(/const VERSION='([^']+)'/)[1];
const prior = '0.0';
let published = false;
const notes = {version,changes:[]};
const settings = `<!doctype html><button id="open">Website Update</button>
<script>
let latest='';
window.offline14239={
 state:()=>({appVersion:'${prior}',availableShell:latest,releaseNotes:{changes:[]}}),
 checkForUpdates:async()=>{latest=(await(await fetch('release-version.json')).json()).version;}
};
</script><script src="scripts/header-profile-v104.js"></script>
<script>document.getElementById('open').onclick=()=>websiteUpdates143103.open();</script>`;
const server = http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname;
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.json')?'application/json':'text/html');
  if(p==='/desktop-sw14242.js')return res.end(published?worker:worker.replace(version,prior));
  if(p==='/settings')return res.end(settings);
  if(p==='/release-version.json')return res.end(JSON.stringify(notes));
  if(['/update.html','/scripts/update14390.js','/scripts/header-profile-v104.js'].includes(p))return res.end(read(p.slice(1)));
  if(p==='/desktop.html')return res.end('<h1>Workspace</h1>');
  res.end('/* local update fixture */');
});

async function visit(browser,base,stall){
  published=false;
  const context=await browser.newContext();
  try{
    const page=await context.newPage();
    const updaterVisits=[];
    page.on('framenavigated',frame=>{
      if(frame===page.mainFrame()&&new URL(frame.url()).pathname==='/update.html')updaterVisits.push(frame.url());
    });
    if(stall)await page.addInitScript(version=>{
      if(location.pathname!=='/update.html')return;
      const register=ServiceWorkerContainer.prototype.register;
      ServiceWorkerContainer.prototype.register=function(...args){
        if(sessionStorage.getItem('hold-first-visit')==='yes'){
          // Model the reported 0% screen while the initial attachment is held.
          window.setTimeout(()=>this.dispatchEvent(new MessageEvent('message',{
            data:{type:'ojm-shell-progress',version,completed:0,total:333}
          })),0);
          return new Promise(resolve=>{
            window.finishRegistration=()=>resolve(register.apply(this,args));
          });
        }
        return register.apply(this,args);
      };
      if(!new URL(location.href).searchParams.has('resumeUpdate'))sessionStorage.setItem('hold-first-visit','yes');
      const timer=window.setTimeout;
      window.setTimeout=(cb,ms,...args)=>timer(cb,ms===15000?500:ms,...args);
    },version);
    await page.goto(base+'/settings');
    await page.evaluate(async prior=>{
      localStorage.setItem('test-draft','keep');
      await navigator.serviceWorker.register('desktop-sw14242.js?v='+prior);
      await navigator.serviceWorker.ready;
    },prior);
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    published=true;
    await page.getByRole('button',{name:'Website Update'}).click();
    await page.getByRole('link',{name:'Download update'}).click();
    if(stall){
      await page.getByText(/0% · 333 files remaining/).waitFor();
      await page.waitForURL('**/*resumeUpdate=*');
      await page.getByText(/0% · 333 files remaining/).waitFor();
      await page.waitForTimeout(800);
      assert.equal(updaterVisits.length,2,'persistent delay must not cause a restart loop');
      // Let the recovered attachment complete, like a delayed browser registration.
      await page.evaluate(()=>window.finishRegistration());
    }
    await page.waitForURL('**/desktop.html?v='+version,{timeout:30000});
    assert.equal(await page.getByRole('heading').textContent(),'Workspace');
    assert.equal(updaterVisits.length,stall?2:1);
    if(stall)assert.equal(new URL(updaterVisits[1]).searchParams.get('resumeUpdate'),version);
    assert.equal(await page.evaluate(()=>localStorage.getItem('test-draft')),'keep');
    console.log('PASS first in-app Update '+(stall?'recovers once from stalled attachment':'starts directly')+' and opens the verified release');
  }finally{await context.close();}
}
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--no-zygote','--disable-dev-shm-usage']});
  try{
    const base='http://127.0.0.1:'+server.address().port;
    await visit(browser,base,false);
    await visit(browser,base,true);
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exit(1);});
