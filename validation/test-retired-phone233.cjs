const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),retired=JSON.parse(read('validation/retired-phone233.json'));
for(const file of [...Object.keys(retired.outputs),...retired.sources])assert.equal(fs.existsSync(path.join(root,file)),false,file);
const manifest=JSON.parse(read('src/manifest.json'));
for(const file of retired.retainedSharedSources)assert(Object.values(manifest.outputs).some(parts=>parts.some(p=>p.source===file)),'shared source '+file+' must remain');
const shipped=[...fs.readdirSync(root).filter(f=>/\.(js|html)$/.test(f)),...fs.readdirSync(path.join(root,'scripts')).filter(f=>f.endsWith('.js')).map(f=>'scripts/'+f)];
for(const file of shipped){const source=read(file);for(const dead of Object.keys(retired.outputs))assert(!source.includes(dead),file+' still loads '+dead);}
const legacy=read('phone-accounting.html'),code=legacy.match(/<script>([\s\S]*?)<\/script>/)[1];
for(const input of ['https://app.test/Accounting/phone-accounting.html','https://app.test/Accounting/phone-accounting.html?from=old&type=recovery#access_token=fixture']){
 let target;const u=new URL(input);vm.runInNewContext(code,{URL,location:{href:u.href,search:u.search,hash:u.hash,replace:v=>target=v}});const redirected=new URL(target);
 assert.equal(redirected.pathname,'/Accounting/phone.html');assert.equal(redirected.searchParams.get('staff'),'1');assert.equal(redirected.hash,u.hash);for(const [k,v] of u.searchParams)assert.equal(redirected.searchParams.get(k),v);
}
assert(!/localStorage|sessionStorage|indexedDB/.test(legacy),'redirect must not delete device work');
assert(read('src/subusers/phone/runtime/draft-persistence.js').includes('ojm_phone_draft1427:'),'retain legacy draft import');
assert(read('src/core/navigation/phone-bridge132.js').includes('window.PhoneApp132='),'desktop helper API remains');
assert(!read('src/core/navigation/phone-bridge132.js').includes("createElement('iframe')"));
console.log('PASS retired embedded UI has no shipped consumers; old links redirect with parameters; shared helpers and draft recovery remain');
