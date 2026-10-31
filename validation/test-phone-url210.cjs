const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/subusers/phone/runtime/authentication.js','utf8').split('  async function boot()')[0];
async function scenario(savedLocation,query=''){
 const owner='test-self',S={epoch:0},notices=[],redirects=[],nodes=new Map();let rendered=0;
 const data={savedAt:'2026-10-31',access:{profile:{id:owner,status:'active'}},page:'home',month:'2026-10'};
 const location={href:'https://fixture.test/Accounting/phone.html'+query,replace:url=>redirects.push(url)};
 const ctx={S,enterJob:null,enterOwner:null,record:async()=>structuredClone(data),validSession:()=>true,navigator:{onLine:true},pages:['home','accounts','post','entries','history'],today:()=> '2026-10-31',current:(id,epoch)=>S.owner===id&&S.epoch===epoch,migrateLegacy:async(id,record)=>record,
 localStorage:{getItem:key=>key==='location'?JSON.stringify(savedLocation):null},locationKey:()=> 'location',mirrorKey:()=> 'draft',normalizeDraft:value=>value,queue:()=>[],blankDraft:()=>({}),touch(){},paintConnection(){},permission:()=>true,URL,location,window:{location},$:(id)=>{if(!nodes.has(id))nodes.set(id,{hidden:false,innerHTML:''});return nodes.get(id)},render(){rendered++},drawUsers(){},access:async()=>{},phoneSyncActivity14351(){},denied:()=>false,revoke:async()=>{},notice:message=>notices.push(message),empty:x=>x,action:()=>'',sessionGate:message=>notices.push(message),structuredClone};
 vm.createContext(ctx);vm.runInContext(source,ctx);await ctx.enter({user:{id:owner},refresh_token:'test-only',access_token:'test-only',expires_at:9999999999});
 assert.deepEqual(notices,[],'startup must not confuse saved navigation with the browser URL');
 if(query==='?scan=1'){assert.deepEqual(redirects,['scan.html?capture=1']);assert.equal(rendered,0);}
 else{assert.deepEqual(redirects,[]);assert.ok(rendered>0);assert.equal(S.page,savedLocation?.page||'home');}
}
(async()=>{for(const saved of [{page:'post',month:'2026-10'},null,{page:'entries',month:'2026-09'}]){await scenario(saved);await scenario(saved,'?scan=1');}console.log('PASS normal phone startup and scanner return with missing, Post and Entries saved locations');})().catch(e=>{console.error(e);process.exitCode=1});
