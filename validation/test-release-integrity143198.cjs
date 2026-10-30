const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const release=JSON.parse(fs.readFileSync('release-version.json')),read=p=>fs.readFileSync(p,'utf8');
assert.deepEqual(release,JSON.parse(read('data/release-notes.json')));
for(const file of ['desktop-sw14242.js','phone-sw.js'])assert.equal(read(file).match(/const VERSION='([^']+)'/)[1],release.version,file+' must identify the announced release');
assert.equal(read('scripts/offline14239.js').match(/const SHELL_VERSION='([^']+)'/)[1],release.version);
assert.equal(read('scripts/update14390.js').match(/let VERSION='([^']+)'/)[1],release.version);
const files=vm.runInNewContext(read('desktop-sw14242.js').match(/const FILES=(\[[\s\S]*?\n\]);/)[1]);
for(const file of files)assert.ok(fs.existsSync(file.split('?')[0]),'missing offline asset '+file);
const byPath=new Map(files.map(f=>[f.split('?')[0],f]));
for(const html of ['desktop.html','phone.html','phone-accounting.html','archive.html','setup.html','recovery.html']){
 for(const m of read(html).matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)\?v=[^"']+)["']/g)){
  if(byPath.has(m[1].split('?')[0]))assert.ok(files.includes(m[1]),html+' references uncached version '+m[1]);
 }
}
assert.ok(!files.some(f=>/^(release-version\.json|update\.html|scripts\/update14390\.js)/.test(f)),'recovery entry and release check must bypass old offline caches');
console.log('PASS announced version, both offline workers, updater, app and all cached HTML asset references agree; every offline file exists');
