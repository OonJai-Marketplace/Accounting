/* Temporary runtime fixtures only; no browser, network or live database. */
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const source=p=>fs.readFileSync(p,'utf8');
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const result=v=>JSON.parse(JSON.stringify(v));
let checks=0;
async function check(name,fn){await fn();checks++;console.log('PASS',name)}
(async()=>{
const tables={budget_templates14313:[],budget_settings14313:[]},reads=[];
let form=null,rendered;
const context={console,structuredClone,crypto:require('node:crypto').webcrypto,URL,location:{href:'https://fixture.invalid/'},
 escapeHtml:escape,liveProfile:{id:'fixture-admin',role:'admin'},access113:{can:()=>true},
 Finance82:{date:'2026-10-10',recipient:'Fixture director',purpose:'Training',notes:'',lines:[],movements:[],conversions:[]},
 CurrencyStore:{currencies:[{code:'LAK'},{code:'USD'},{code:'THB'}]},Work82:{reports:[]},
 AccountingStore:{accounts:[{name:'Rent',currency:'COA_ONLY'},{name:'Utilities',currency:'COA_ONLY'}]},
 accountDataCurrencies79:()=>{throw Error('Budget request queried Chart of Accounts currencies')},
 ojmDb:{from(table){reads.push(table);const q={select:()=>q,order:()=>q,eq:()=>q,maybeSingle:()=>Promise.resolve({data:tables[table][0]||null,error:null}),then:(ok,no)=>Promise.resolve({data:tables[table],error:null}).then(ok,no)};return q}},
 document:{getElementById:()=>form,querySelector:()=>null,addEventListener(){}},addEventListener(){},
 field82:(label,name,value='',type='text',extra='')=>`<label>${label}<input name="${name}" type="${type}" value="${escape(value)}" ${extra}></label>`,
 select82:(label,name,value,options)=>`<label>${label}<select name="${name}">${options.map(([v])=>`<option>${escape(v)}</option>`).join('')}</select></label>`,
 action82:(label,fn)=>`<button onclick="${fn}">${label}</button>`,section82:(label,body,actions='')=>body+actions,
 table82:()=>'',mount82:(id,title,subtitle,body,actions)=>{rendered={id,body,actions}},
 printFinance82(){},renderWork82(){},switchTab(){},deleteWork108(){},openOperational82(){},formatAppNumber:String};
context.window=context;vm.createContext(context);
vm.runInContext(source('scripts/budget14313.js'),context);
vm.runInContext(source('scripts/budget-workflow14316.js'),context);
const budget=context.budget14313,workflow=context.budgetWorkflow14316;
await check('Fresh budget has no accounting-style categories or account currencies',()=>{
 assert.deepEqual(result(budget.categoryOptions()),[]);assert.deepEqual(result(budget.currencyOptions()),[['LAK','LAK'],['USD','USD'],['THB','THB']]);
 workflow.renderRequest();assert(!rendered.body.includes('Rent'));assert(!rendered.body.includes('Utilities'));assert(!rendered.body.includes('COA_ONLY'));
 assert.match(rendered.body,/<input name="category" type="text"[^>]*value=""[^>]*required/);
});
await check('Toolbar ends New Report, Print / PDF, Settings',()=>{
 assert(rendered.actions.indexOf('New Report')<rendered.actions.indexOf('Print / PDF'));
 assert(rendered.actions.indexOf('Print / PDF')<rendered.actions.indexOf('budget14313.settings()'));
 assert(rendered.actions.endsWith('</svg></button>'));
});
await check('Only saved budget categories and current request provide suggestions',async()=>{
 tables.budget_settings14313=[{id:true,version:1,data:{currency:'USD',categories:['Training',' Travel ','Training']}}];await budget.load(true);
 context.Finance82.lines=[{category:'Team event',description:'Fixture meal',amount:10,currency:'USD'}];
 assert.deepEqual(result(budget.categoryOptions()),[['Training','Training'],['Travel','Travel'],['Team event','Team event']]);
 assert(reads.every(t=>['budget_templates14313','budget_settings14313'].includes(t)));
});
await check('Arbitrary budget categories and historical currencies are retained safely',()=>{
 context.Finance82.lines.push({category:'Workshop <script>bad()</script>',amount:10,currency:'EUR'});
 const html=budget.categoryField();assert(html.includes('&lt;script&gt;'));assert(!html.includes('<script>'));
 assert.deepEqual(result(budget.currencyOptions()).at(-1),['EUR','EUR']);workflow.renderRequest();
 assert(!rendered.body.includes('COA_ONLY'));assert.equal(context.Finance82.lines.length,2);
});
await check('Saved suggestions can be empty without reintroducing default categories',async()=>{
 context.Finance82.lines=[];tables.budget_settings14313[0].data.categories=[];await budget.load(true);assert.deepEqual(result(budget.categoryOptions()),[]);
 const script=source('scripts/budget14313.js');assert(!script.includes("throw Error('Add at least one category.')"));
 assert(!script.includes('name="categories" rows="5" required'));assert(!script.includes("category:'Other'"));
});
await check('Budget category never receives account-picker currency symbols, even for matching names',()=>{
 assert(budget.categoryField().includes('data-plain14285'));
 const category={matches:selector=>selector==='[data-plain14285]',removeAttribute:()=>{throw Error('Category was converted into an account picker')}};
 const ctx={document:{readyState:'loading',addEventListener(){}},addEventListener(){},AccountingStore:{accounts:[{id:'Rent',name:'Rent',currency:'USD'}]},getSelectedAccountInfo:()=>{throw Error('Category looked up in Chart of Accounts')}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source('scripts/account-picker1428.js'),ctx);
 const root={matches:()=>false,querySelectorAll:selector=>selector==='input[list]'?[category]:[]};ctx.dropdown1434.enhance(root);
 assert(!category.dataset);assert(!category.className);
});
await check('Delayed settings hydration preserves typed category and selected currency',async()=>{
 const suggestions={innerHTML:''};form={dataset:{},elements:{category:{value:'New independent category'},currency:{value:'LAK'}},querySelector:()=>suggestions};
 tables.budget_settings14313[0].data.categories=['Training'];await budget.load(true);
 assert.equal(form.elements.category.value,'New independent category');assert.equal(form.elements.currency.value,'USD');assert(suggestions.innerHTML.includes('Training'));
 form.dataset.userEdited14313='1';form.elements.currency.value='THB';await budget.load(true);assert.equal(form.elements.currency.value,'THB');
});
await check('Action colors stay in approved warm families with readable white text',()=>{
 const css=source('styles/controls14317.css');const tones=[...css.matchAll(/\[data-action-tone14317=(\w+)\]\{--action-bg14317:(#[\da-f]{6});--action-edge14317:(#[\da-f]{6});--action-hover14317:(#[\da-f]{6})\}/g)];
 assert.equal(tones.length,7);const approved=new Set(['#008563','#074532','#914511','#9a6b20','#8b5e14','#8a3524','#176249']);
 const luminance=h=>{const v=h.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return v[0]*.2126+v[1]*.7152+v[2]*.0722};
 for(const [_,name,bg,edge,hover] of tones){assert(approved.has(bg),name);assert.equal(edge,bg);for(const h of [bg,hover])assert(1.05/(luminance(h)+.05)>=4.5,name+' '+h)}
 assert.match(css,/@media screen and \(min-width:641px\)/);
});
await check('Small desktop receives action colors while phone and navigation remain scoped',()=>{
 const buttons=['Templates','Add Template','New Report','Print / PDF','Settings'].map(text=>({textContent:text,title:'',dataset:{},getAttribute:()=>null,matches:()=>false,closest:()=>null}));
 const ctx={innerWidth:820,document:{readyState:'complete',documentElement:{dataset:{device132:'desktop'}},body:{},querySelectorAll:()=>buttons},MutationObserver:class{observe(){}},requestAnimationFrame:fn=>fn(),addEventListener(){}};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source('scripts/controls14317.js'),ctx);
 assert.deepEqual(buttons.map(b=>b.dataset.actionTone14317),['template','template','add','output','neutral']);
 buttons.forEach(b=>delete b.dataset.actionTone14317);ctx.document.documentElement.dataset.device132='phone';ctx.innerWidth=390;ctx.actionControls14317.decorate();assert(buttons.every(b=>!b.dataset.actionTone14317));
 ctx.innerWidth=1280;buttons[0].matches=()=>true;ctx.actionControls14317.decorate();assert(!buttons[0].dataset.actionTone14317);
});
await check('Corrected desktop assets use matching offline release versions',()=>{
 const ctx={addEventListener(){}};ctx.self=ctx;ctx.importScripts=()=>vm.runInContext(source('offline-assets14239.js'),ctx);vm.createContext(ctx);vm.runInContext(source('desktop-sw14242.js'),ctx);
 const html=source('desktop.html');for(const file of ['scripts/controls14317.js','styles/controls14317.css','scripts/budget14313.js','scripts/budget-workflow14316.js','scripts/desktop14245-6.js','scripts/offline14239.js']){
 const version=['scripts/controls14317.js','styles/controls14317.css','scripts/offline14239.js','scripts/desktop14245-6.js'].includes(file)?'143.23':'143.21';assert(html.includes(file+'?v='+version),file);assert.equal(vm.runInContext(`releaseVersion14299('${file}')`,ctx),version);
 }assert.equal(vm.runInContext("releaseVersion14299('scripts/account-picker1428.js')",ctx),'143.21');assert.equal(vm.runInContext("releaseVersion14299('scripts/installation14320.js')",ctx),'143.20');assert.equal(vm.runInContext("releaseVersion14299('scripts/phone-runtime14242.js')",ctx),'143.17');
});
console.log(`${checks} checks passed`);
})().catch(e=>{console.error(e);process.exit(1)});
