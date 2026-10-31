'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
function routing(file,ua,query='',touch=0,worker=''){
 let destination='';const location={href:'https://fixture.test/Accounting/'+file+query,search:query,hash:'',replace:u=>destination=u};
 const window={},navigator={userAgent:ua,maxTouchPoints:touch,serviceWorker:{controller:{scriptURL:worker}}};const code=[...read(file).matchAll(/<script>([\s\S]*?)<\/script>/g)][file==='desktop.html'?0:1][1];
 vm.runInNewContext(code,{window,navigator,location,URL,URLSearchParams});return destination;
}
async function ownOnly(admin){
 const tabs={hidden:false,replaceChildren(){this.cleared=true;}},S={actor:'self',owner:'self',area:'users',directory:[],directoryLoading:false,epoch:1};let lists=0,opened=0;
 const ctx={S,$:()=>tabs,isAdmin:()=>admin,access:async()=>{},rpc:async name=>{assert.equal(name,'review_directory14229');lists++;return [{id:'self'},{id:'other'}];},persist:async()=>{},fail:message=>Error(message),current:(owner,epoch)=>S.owner===owner&&S.epoch===epoch,render(){},notice(){},denied:()=>false,revoke:async()=>{},saveMirror(){},paintConnection(){},window:{PhoneTools14242:{open:async area=>{assert.equal(area,'settings');opened++;},close(){}}},document:{},navigator:{onLine:true},record:async()=>({}),esc:x=>x,money(){},permission(){return true;},http(){},paged(){},confirmDialog(){},ambiguous(){},boundedFetch(){},scope:'https://fixture.test',db:{},URL};
 vm.createContext(ctx);vm.runInContext(read('src/subusers/phone/runtime/workspace-selection.js'),ctx);
 await ctx.loadDirectory();assert.equal(lists,0,'no directory preload in workspace');
 await assert.rejects(ctx.selectUser('other'),/laptop/);assert.equal(S.owner,'self');
 ctx.drawUsers();assert.equal(tabs.hidden,true);assert.equal(tabs.cleared,true);
 await ctx.openArea('documents');assert.equal(opened,0,'no company document workspace on phones');
 await ctx.openArea('settings');assert.equal(lists,admin?1:0);assert.equal(opened,admin?1:0);assert.equal(S.owner,'self');
 await ctx.openArea('users');assert.equal(S.area,'users');assert.equal(S.owner,'self');
}
(async()=>{
 for(const ua of ['Mozilla iPhone','Mozilla Android Mobile'])for(const file of ['index.html','desktop.html']){const url=new URL(routing(file,ua));assert.equal(url.pathname,'/Accounting/phone.html');assert.equal(url.searchParams.get('staff'),'1');}
 for(const ua of ['Mozilla Windows','Mozilla iPad','Mozilla Android'])assert.equal(routing('desktop.html',ua),'','laptop and tablet retain full app');
 assert.ok(read('desktop.html').indexOf("new URL('phone.html'")<read('desktop.html').indexOf('scripts/system-diagnostics'));
 assert.ok(!read('phone.html').includes('location.replace("desktop.html'));
 assert.ok(!read('src/subusers/phone/runtime/authentication.js').includes('data.directory'));
 assert.ok(!read('src/subusers/phone/runtime/data-loading.js').includes('loadDirectory'));
 assert.ok(!read('src/subusers/phone/runtime/home-and-accounts.js').includes('data-owner'));
 assert.ok(!read('src/subusers/phone/runtime/report-printing.js').includes('openTools'));
 for(const [ua,touch] of [['Mozilla iPad',5],['Mozilla Macintosh',5],['Mozilla Android',5]])for(const file of ['index.html','phone.html']){const url=new URL(routing(file,ua,'?staff=1',touch,'https://fixture.test/Accounting/phone-sw.js'));assert.equal(url.pathname,'/Accounting/desktop.html','tablets retain full app even with old phone installation');}
 assert.ok(!read('phone.html').includes('data-action="print"'));
 assert.ok(!read('src/subusers/phone/runtime/home-and-accounts.js').includes("action('print'"));
 let message='';const guard={notice:v=>message=v,window:{print:()=>assert.fail('phone must never invoke print')}};vm.createContext(guard);vm.runInContext(read('src/subusers/phone/runtime/report-printing.js'),guard);await guard.printReport();assert.match(message,/tablet/);
 const tools={window:{},document:{addEventListener(){}}};vm.createContext(tools);vm.runInContext(read('src/subusers/phone/phone-tools14242.js'),tools);await assert.rejects(tools.window.PhoneTools14242.open('documents',{state:()=>({admin:true})}),/settings only/);await assert.rejects(tools.window.PhoneTools14242.open('settings',{state:()=>({admin:false})}),/settings only/);
 assert.ok(!read('src/subusers/phone/phone-tools14242.js').includes('.print('));
 assert.ok(read('phone.html').includes("location.assign('scan.html')"));
 await ownOnly(false);await ownOnly(true);
 console.log('PASS phone-first routing before desktop startup, laptop/tablet unchanged, own account for both roles, no directory preload, no cross-user switch, admin-only on-demand settings, phone printing blocked, scanner preserved, tablet routing recovered');
})().catch(e=>{console.error(e);process.exitCode=1;});
