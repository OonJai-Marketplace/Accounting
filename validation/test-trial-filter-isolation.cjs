const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const storage=new Map(),ctx=vm.createContext({console,Intl,Date,Map,Set,JSON,location:{origin:'https://fixture.invalid'},document:{addEventListener(){}},addEventListener(){},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},liveProfile:{id:'one'},escapeHtml:String,formatAppNumber:n=>n.toFixed(2),formatAppDate:String,appNumberLocale:()=> 'en-US',showCenterStatus:message=>{throw Error(message)},AccountingStore:{accounts:[{id:'cash',code:'1000',name:'Cash',currency:'LAK',isPosting:true},{id:'bank',code:'1100',name:'Bank',currency:'USD',isPosting:true}]},JournalModule:{entries:[]},ForeignFunds14386:{parentIndex:()=>()=>[]},re79:String});ctx.window=ctx;
for(const file of ['src/accounts/chart/accounts-v69.js','src/reports/financial/summary-period14331.js','src/reports/financial/monthly-trial-balance.js']){
 let source=fs.readFileSync(file,'utf8');if(file.endsWith('accounts-v69.js'))source=source.slice(0,source.indexOf('function balancesHtml69'));vm.runInContext(source,ctx);
}
ctx.Reports79={from:'2026-01-01',to:'2026-03-31',basis:'original',currency:''};
ctx.reportSort143153=()=>({direction:'asc'});
const entries=[{date:'2026-01-03',accountId:'cash',account:'Cash',accountCode:'1000',currency:'LAK',debit:100,credit:0},{date:'2026-03-03',accountId:'cash',account:'Cash',accountCode:'1000',currency:'LAK',debit:0,credit:150},{date:'2026-02-03',accountId:'bank',account:'Bank',accountCode:'1100',currency:'USD',debit:10,credit:0}],original=JSON.stringify(entries);
ctx.reportWindow143195={cachedLedger:()=>entries};
const plain=x=>JSON.parse(JSON.stringify(x));
ctx.saveMonthlyTrialPreferences({basis:'reporting',columns:'balance',accounts:[]});
assert.deepEqual(plain(ctx.monthlyTrialPreferences('report')),{columns:'full'});
let report=ctx.monthlyTrialReportModel();assert.equal(report.values.length-report.totalCount,2);assert.equal(report.subheads.length,3);assert.deepEqual(plain(report.values[0].slice(1)),['100.00','0.00','100.00','0.00','0.00','100.00','0.00','150.00','(50.00)']);
ctx.saveMonthlyTrialPreferences({columns:'balance'},'report');report=ctx.monthlyTrialReportModel();assert.equal(report.values.length-report.totalCount,2);assert.equal(report.subheads.length,1);assert.match(ctx.monthlyTrialTable(report),/Cash/);assert.match(ctx.monthlyTrialTable(report,true),/Bank/);
assert.deepEqual(plain(ctx.monthlyTrialPreferences()),{basis:'reporting',columns:'balance',accounts:[]});
ctx.saveMonthlyTrialPreferences({basis:'original',columns:'full',accounts:['cash|LAK']});
assert.equal(ctx.monthlyTrialReportModel().subheads.length,1);
ctx.Reports79.currency='USD';report=ctx.monthlyTrialReportModel();assert.equal(report.values.length-report.totalCount,1);assert.match(report.values[0][0],/Bank/);
ctx.liveProfile={id:'two'};assert.equal(ctx.monthlyTrialPreferences('report').columns,'full');assert.equal(ctx.monthlyTrialPreferences().accounts,null);
ctx.liveProfile={id:'one'};assert.equal(ctx.monthlyTrialPreferences('report').columns,'balance');assert.equal(JSON.stringify(entries),original);
console.log('PASS independent shortcut/report settings, empty shortcut selection, all report accounts, currency filtering, balances, print labels, account isolation and unchanged source rows.');
