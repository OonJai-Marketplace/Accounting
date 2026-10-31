const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('phone.html','utf8'),bottom=html.split('<nav id="bottom"')[1].split('</nav>')[0];
const positions=[...bottom.matchAll(/data-(?:page|action)="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(positions,['home','accounts','post','entries','scan']);
const source=fs.readFileSync('src/subusers/phone/runtime/history-and-render.js','utf8');
const c={S:{page:'entries',limit:30,data:{months:{'2026-10':true}},month:'2026-10'},groupEntries:()=>[],queue:()=>[{status:'pending',draft:{date:'2026-10-31',memo:'Unsynced phone entry'}}],returnedReview14348:()=>'',monthControl:()=>'<input aria-label="History month">',empty:t=>t,commonActions:()=>'',esc:x=>x};vm.createContext(c);vm.runInContext(source,c);
let page=c.entries();assert.match(page,/data-page=history/);assert.match(page,/Unsynced phone entry/);assert.doesNotMatch(page,/History month/);
c.S.page='history';page=c.entries();assert.match(page,/History month/);assert.match(page,/data-page=history aria-current="page"/);assert.doesNotMatch(page,/Unsynced phone entry/);assert.match(page,/Search selected month/);
console.log('PASS five phone navigation destinations, centered Post, rightmost Scan, and Current/History within Entries with pending drafts restricted to Current');
