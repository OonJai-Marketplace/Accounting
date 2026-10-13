// Exercise the actual shared vault with a simulated wall clock (no 24-hour wait).
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('scripts/device-vault14334.js','utf8'),DAY=86400000,START=1800000000000;
const storage=()=>{const m=new Map();return {get length(){return m.size},key:i=>[...m.keys()][i],getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}};
function harness({online=true,age=0,offlineMode=false}={}){
 let now=START,reloads=0,signouts=0;const events={},docEvents={},authEvents=[],local=storage(),session=storage(),P='ojm-vault14334:'+encodeURIComponent('https://fixture.invalid')+':';
 if(offlineMode)session.setItem(P+'offline','1');
 const at=now-age;local.setItem(P+'actor:activity',at);local.setItem(P+'actor:generation','g');session.setItem(P+'session',JSON.stringify({actor:'actor',key:Buffer.alloc(32,1).toString('base64'),at,generation:'g'}));
 const ctx={window:null,location:{origin:'https://fixture.invalid',reload(){reloads++}},localStorage:local,sessionStorage:session,navigator:{onLine:online},Date:{now:()=>now},TextEncoder,TextDecoder,URL,Uint8Array,AbortSignal,console,
 crypto:require('node:crypto').webcrypto,btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),fetch:async()=>({}),setInterval:fn=>events.interval=[fn],
 document:{hidden:false,readyState:'loading',body:null,getElementById:()=>null,addEventListener:(name,fn)=>(docEvents[name]??=[]).push(fn)},
 addEventListener:(name,fn)=>(events[name]??=[]).push(fn),dispatchEvent:()=>{},Event:class{},StorageEvent:class{},OjmCipher14334:{gcm:()=>({encrypt:x=>x,decrypt:x=>x})}};
 ctx.window=ctx;ctx.parent=ctx;vm.createContext(ctx);vm.runInContext(code,ctx);
 const emit=(bag,name,event={})=>{for(const fn of bag[name]||[])fn(event)};
 const sdk={auth:{signInWithPassword:async()=>({}),getSession:async()=>({data:{session:null}}),signOut:async()=>{signouts++;emit({auth:authEvents},'auth','SIGNED_OUT');return {error:null}},updateUser:async()=>({}),onAuthStateChange:fn=>authEvents.push(fn),refreshSession:async()=>({})}};
 return {ctx,local,session,P,sdk,advance:ms=>now+=ms,at:()=>JSON.parse(session.getItem(P+'session')||'null')?.at,reloads:()=>reloads,signouts:()=>signouts,emit:(name,event)=>emit(events,name,event),visibility:()=>emit(docEvents,'visibilitychange'),auth:event=>authEvents.forEach(fn=>fn(event)),boot:()=>vm.runInContext(code,ctx)};
}
(async()=>{
for(const online of [true,false]){
 const h=harness({online});assert.equal(h.ctx.deviceVault14334.ttl,DAY);h.advance(DAY-1);h.ctx.deviceVault14334.requireKey();h.advance(1);assert.throws(()=>h.ctx.deviceVault14334.requireKey(),/expired/);assert.equal(h.reloads(),1);assert.equal(h.ctx.deviceVault14334.unlocked,false);assert.equal(h.session.getItem(h.P+'session'),null);console.log('PASS exact 24-hour boundary',online?'online':'offline');
 const a=harness({online});a.advance(1);a.emit('pointerdown',{isTrusted:true});assert.equal(a.at(),START+1,'first activity inside old 15-second throttle resets deadline');a.advance(DAY-1);a.ctx.deviceVault14334.requireKey();a.advance(1);a.emit('keydown',{isTrusted:true});assert.equal(a.ctx.deviceVault14334.unlocked,false,'activity after sleep cannot resurrect an expired session');
 const b=harness({online});await b.ctx.deviceVault14334.attach(b.sdk);b.advance(DAY/2);b.emit('pageshow');b.visibility();b.auth('TOKEN_REFRESHED');b.ctx.localStorage.setItem('background-sync','saved');b.emit('pointerdown',{isTrusted:false});assert.equal(b.at(),START,'restore, background writes, token refresh and synthetic events are not activity');b.advance(DAY/2);b.visibility();assert.equal(b.reloads(),1);console.log('PASS restore/sleep, refresh/sync isolation, trusted activity',online?'online':'offline');
 const c=harness({online,age:DAY});assert.equal(c.ctx.deviceVault14334.unlocked,false,'expired page startup requires password');assert.equal(c.session.getItem(c.P+'session'),null);
 const d=harness({online});d.advance(DAY-1);d.emit('wheel',{isTrusted:true});d.advance(DAY-1);d.ctx.deviceVault14334.requireKey();d.advance(1);d.emit('interval');assert.equal(d.reloads(),1);console.log('PASS scrolling resets deadline and periodic expiry',online?'online':'offline');
 const e=harness({online,age:DAY/2});assert.equal(e.at(),START-DAY/2,'startup must preserve activity');await e.ctx.deviceVault14334.attach(e.sdk);await e.sdk.auth.signOut({scope:'local'});assert.equal(e.signouts(),online?1:0);assert.equal(e.ctx.deviceVault14334.unlocked,false);assert.equal(e.session.getItem(e.P+'notice'),null,'manual logout has no success notification');console.log('PASS SDK sign-out / offline device lock',online?'online':'offline');
}
const knownOffline=harness({online:true,offlineMode:true});await knownOffline.ctx.deviceVault14334.attach(knownOffline.sdk);await knownOffline.sdk.auth.signOut();assert.equal(knownOffline.signouts(),0);assert.equal(knownOffline.ctx.deviceVault14334.unlocked,false);assert.equal(knownOffline.session.getItem(knownOffline.P+'notice'),null);console.log('PASS cached offline logout when the browser reports online');
console.log('PASS shared desktop/phone inactivity and logout clock regressions');
})().catch(e=>{console.error(e);process.exitCode=1});
