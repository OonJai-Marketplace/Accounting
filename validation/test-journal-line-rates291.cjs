const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const text=file=>fs.readFileSync(file,'utf8');
const accounts={USD:{id:'usd',currency:'USD'},THB:{id:'thb',currency:'THB'},LAK:{id:'lak',currency:'LAK'}};
const events=new WeakMap();
function element(){const node={dataset:{},children:[],validity:{valid:true},isConnected:true,disabled:false,hidden:false,value:'',type:'text',
 addEventListener(name,fn){let list=events.get(this)||{};(list[name]||=[]).push(fn);events.set(this,list);},
 dispatch(name){for(const fn of events.get(this)?.[name]||[])fn();},setAttribute(){},setCustomValidity(s){this.validity.valid=!s;},
 append(n){n.parentElement=this;this.children.push(n);},insertBefore(n){this.children.push(n);},querySelector(s){return s==='.line-rate291'?this.children.find(n=>n.className==='line-rate291'):null;}};
 return node;
}
const body={rows:[]},head=element(),app={classList:{contains:()=>false,toggle(){}}},date={value:'2026-03-01'};
const dom={readyState:'loading',addEventListener(){},createElement:element,getElementById(id){return {jeLinesBody:body,jeHeaderRow:head,jeTransDate:date,jeMultipleDates:{checked:false}}[id];}};
const entries=[{id:'A',dbEntryId:'a',date:'2026-02-01',accountId:'usd',currency:'USD',debit:100,credit:0,fx_rate_lak:22000},{id:'B',dbEntryId:'b',date:'2026-02-15',accountId:'usd',currency:'USD',debit:100,credit:0,fx_rate_lak:23000}];
const ctx={window:{yearWindow14333:{state:()=>({from:'2026-01-01',to:'2026-12-31',opening:[]})}},document:dom,JournalModule:{entries},ApplicationSettings:{system:{}},getSelectedAccountInfo:v=>accounts[v],JournalFX14383:{lineRate:r=>r.dataset.fxRate14383||r.dataset.inheritedFx294||null,base:(l,side)=>l[side]*l.fx_rate_lak,rate:()=>22550},requestAnimationFrame(){}};
vm.createContext(ctx);vm.runInContext(text('src/shared/formatting/numbers.js'),ctx);vm.runInContext(text('src/bookkeeping/journal/account-rates143186.js'),ctx);
function row(currency,data={}){const r=element();r.dataset=data;r.acc={value:currency};r.querySelector=s=>s==='.je-line-acc'?r.acc:null;return r;}
let r=row('USD');body.rows=[r];const sync=()=>ctx.window.AccountRates143186.syncLineRates(app);sync();
assert.equal(r.dataset.bookRate14383,'22500');const [fx,book]=r.children.map(c=>c.children[0]);assert.equal(book.value,'22,500');
date.value='2026-02-02';sync();assert.equal(r.dataset.bookRate14383,'22000');
book.value='22001.123456789';book.dispatch('input');book.dispatch('blur');fx.value='22999';fx.dispatch('input');sync();
assert.equal(r.dataset.bookRate14383,'22001.123456789');assert.equal(r.dataset.fxRate14383,'22999');
r.acc.value='THB';sync();assert.equal(r.dataset.bookRate14383,undefined);assert.equal(r.dataset.fxRate14383,undefined);
r.acc.value='LAK';sync();assert.equal(book.disabled,true);
r=row('USD',{bookRate14383:'22111.985664',fxRate14383:'22112',savedRate291:'1'});body.rows=[r];sync();assert.equal(r.dataset.bookRate14383,'22111.985664');assert.equal(r.children[1].children[0].value,'22,111.99');
r=row('USD',{savedRate291:'1'});body.rows=[r];sync();assert.equal(r.dataset.bookRate14383,undefined);
console.log('PASS account/date averages, manual override, saved precision, currency change, missing balances and historical blank rates');
