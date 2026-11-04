// Isolated PostgreSQL tests. No hosted credentials or financial test postings.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const mod=process.env.PGLITE_MODULE||'@electric-sql/pglite',resolved=require.resolve(mod),{PGlite}=require(mod),{pgcrypto}=require(path.join(path.dirname(resolved),'contrib/pgcrypto.cjs'));
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
require('../src/bookkeeping/journal/completion-core258.js');const G=globalThis.JournalCompletion258;
const uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
(async()=>{const db=new PGlite({extensions:{pgcrypto}});let count=0;try{
 const test=async(name,fn)=>{await fn();count++;console.log('PASS',name)};
 for(const f of ['validation/platform14322.sql','setup/fresh/001-Install-Empty-Database.sql','supabase/migrations/20261104103848_upcoming_journal_plans280.sql','supabase/migrations/20261104114420_data_check_schedules_fx281.sql','supabase/migrations/20261104120216_data_check_summary_dates281.sql']){await db.exec(read(f));if(f==='setup/fresh/001-Install-Empty-Database.sql')await db.exec('ALTER TABLE public.scheduled_journals ADD COLUMN fixed_book_rate_lak numeric, ADD COLUMN fixed_rate_currency text');}
 await db.query('INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,$2,now())',[uid(1),'checks@example.invalid']);
 await db.exec(read('setup/fresh/002-Create-First-Administrator.sql').replace('00000000-0000-0000-0000-000000000000',uid(1)));
 await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[uid(1),JSON.stringify({sub:uid(1),role:'authenticated'})]);
 const chart=[];for(const [code,currency,type,technical=false] of [
  ['1010','LAK','ASSET'],['1041','USD','ASSET'],['1220','USD','ASSET'],['1311','LAK','ASSET'],['1312','THB','ASSET'],['3010','LAK','EQUITY'],['3011','THB','EQUITY'],
  ['5110','LAK','EXPENSE'],['5111','LAK','EXPENSE'],['5119','LAK','EXPENSE'],['5419','LAK','EXPENSE'],
  ['9010','LAK','ASSET',true],['9011','USD','ASSET',true],['9290','LAK','ASSET',true],['9211','USD','EXPENSE',true],['9222','THB','EXPENSE',true]
 ]){const id=(await db.query('INSERT INTO accounts(code,name,account_type,currency_code,is_technical) VALUES($1,$1,$2,$3,$4) RETURNING id',[code,type,currency,technical])).rows[0].id;chart.push({id,code,name:code,currency,baseType:type,isTechnical:technical});}
 const acc=c=>chart.find(a=>a.code===c),line=(c,debit,credit,fx=1,book=fx)=>({account_id:acc(c).id,currency_code:acc(c).currency,debit,credit,fx_rate_lak:fx,book_rate_lak:book,description:'Synthetic line'});
 let serial=0;const insert=async(ls,date='2020-10-10')=>db.transaction(async tx=>{const id=(await tx.query("INSERT INTO journal_entries(entry_no,transaction_date,memo,status,source,posted_by) VALUES($1,$2,'Synthetic verification','posted','manual',$3) RETURNING id",['TEST'+(++serial),date,uid(1)])).rows[0].id;for(const [i,l] of ls.entries())await tx.query('INSERT INTO journal_lines(journal_entry_id,line_no,account_id,currency_code,description,debit,credit,line_date,fx_rate_lak,book_rate_lak) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,i+1,l.account_id,l.currency_code||chart.find(a=>a.id===l.account_id).currency,'Synthetic line',l.debit,l.credit,date,l.fx_rate_lak||1,l.book_rate_lak??null]);return id;});
 const check=async(month='2020-10')=>(await db.query('SELECT public.maintenance_preflight14324($1) r',[month+'-01'])).rows[0].r;
 const issuesFor=(c,id)=>c.issues.filter(i=>i.id.includes(id));
 const generate=(ls,rate=23000)=>{const r=G.complete({chart,rows:ls,rates:{USD:rate},balances:{[acc('1041').id]:{quantity:1000,rate:22500}}});assert.deepEqual(r.errors,[]);return r.rows;};
 let local,fx,settlement,transfer;
 await test('Every entry is checked; local and generated foreign expense are valid',async()=>{
  local=await insert([line('5110',100,0),line('1010',0,100)]);
  fx=await insert(generate([line('9211',100,0,23000,null),line('1041',0,100,23000,null)]));
  const c=await check();assert.equal(c.coverage.entries,2);assert.equal(c.coverage.foreign_entries,1);assert.equal(c.issues.length,0,JSON.stringify(c.issues));assert.equal(c.entry_checks.find(e=>e.id===fx).fx_expected,-50000);
 });
 await test('Same-currency settlement and transfer use saved carrying values',async()=>{
  settlement=await insert(generate([line('1220',100,0,23000,22000),line('1041',0,100,23000,null)]));
  transfer=await insert(generate([line('1041',20,0,23000,null),line('1041',0,20,23000,22500)]));
  const c=await check();assert.equal(c.issues.filter(i=>i.severity==='block').length,0,JSON.stringify(c.issues));assert.equal(c.entry_checks.find(e=>e.id===settlement).fx_expected,50000);assert.equal(c.entry_checks.find(e=>e.id===transfer).fx_expected,0);
 });
 await test('Wrong gain/loss is caught even when LAK debits and credits balance',async()=>{
  await db.transaction(async tx=>{await tx.query('UPDATE journal_lines SET credit=credit+100 WHERE journal_entry_id=$1 AND account_id=$2',[fx,acc('5419').id]);await tx.query("INSERT INTO journal_lines(journal_entry_id,line_no,account_id,currency_code,description,debit,credit,line_date,fx_rate_lak,book_rate_lak) VALUES($1,999,$2,'LAK','Synthetic wrong bridge',100,0,'2020-10-10',1,1)",[fx,acc('9010').id]);});
  let c=await check();assert(c.trial.every(t=>Number(t.difference)===0));assert(c.issues.some(i=>i.id==='fx:gain-loss:'+fx));
  await db.transaction(async tx=>{await tx.query('UPDATE journal_lines SET credit=credit-100 WHERE journal_entry_id=$1 AND account_id=$2',[fx,acc('5419').id]);await tx.query('DELETE FROM journal_lines WHERE journal_entry_id=$1 AND line_no=999',[fx]);});
 });
 await test('Detailed item dates with a summary contra line remain valid',async()=>{
  await db.exec('SET session_replication_role=replica');await db.query("UPDATE journal_lines SET line_date='2020-10-11' WHERE journal_entry_id=$1 AND debit>0",[local]);await db.exec('SET session_replication_role=origin');assert(!issuesFor(await check(),local).some(i=>i.severity==='block'));
  await db.exec('SET session_replication_role=replica');await db.query("UPDATE journal_lines SET line_date='2020-10-10' WHERE journal_entry_id=$1",[local]);await db.exec('SET session_replication_role=origin');
 });
 await test('Missing book rate is explicit evidence warning',async()=>{
  await db.query('UPDATE journal_lines SET book_rate_lak=NULL WHERE journal_entry_id=$1 AND account_id=$2',[transfer,acc('1041').id]);assert((await check()).issues.some(i=>i.id.startsWith('fx:evidence:')));
  await db.query('UPDATE journal_lines SET book_rate_lak=22500,fx_rate_lak=23000 WHERE journal_entry_id=$1 AND account_id=$2',[transfer,acc('1041').id]);
 });
 await insert([line('1311',1200,0),line('3010',0,1200)],'2020-01-01');await insert([line('1312',120000,0,677.4),line('3011',0,120000,677.4)],'2020-01-01');
 const base={kind:'amortization',title:'Test prepaid',memo:'Release prepaid',start:'2020-09-01',end:'2021-02-28',amount_basis:'total',allocation:'equal',posting_day:'last',auto_post:false,lines:[line('5110',100,0),line('1311',0,100)]};
 const save=(n,p)=>db.query('SELECT public.save_journal_plan280($1,$2)',[uid(n),p]);
 await test('Equal monthly, daily and historical foreign allocations match across years',async()=>{
  await save(100,base);await save(101,{...base,start:'2020-09-15',end:'2020-10-14',allocation:'daily'});
  await save(102,{...base,lines:[line('9222',60000,0,677.4),line('1312',0,60000,677.4),line('5119',40644000,0),line('9290',0,40644000)]});
  await save(103,{...base,start:'2020-09-01',end:'2020-11-30',lines:[line('9222',1,0,2.345),line('1312',0,1,2.345),line('5119',2.35,0),line('9290',0,2.35)]});
  const c=await check();assert(c.issues.some(i=>i.id==='schedule:plan:'+uid(100)+':1'&&i.severity==='block'));assert(!c.issues.some(i=>/^schedule:(allocation|count|definition):/.test(i.id)),JSON.stringify(c.issues));
 });
 await test('Active recurring is reviewable; future occurrences are not overdue',async()=>{
  await save(104,{...base,kind:'recurring',frequency:'monthly',lines:[line('5110',25,0),line('1010',0,25)]});
  const c=await check();assert(c.issues.some(i=>i.id==='schedule:plan:'+uid(104)+':1'&&i.severity==='warning'));assert(!c.issues.some(i=>i.id==='schedule:plan:'+uid(104)+':3'));
 });
 await test('Changed plans invalidate a closing review and paused plans require explanation',async()=>{
  const a=await check();await db.query("UPDATE private.journal_plans280 SET status='paused' WHERE id=$1",[uid(100)]);const b=await check();assert.notEqual(a.fingerprint,b.fingerprint);assert(b.issues.some(i=>i.id==='schedule:plan:'+uid(100)+':1'&&i.severity==='warning'));
  await assert.rejects(db.query("SELECT public.maintenance_finish14324('2020-10-01','period',$1,'{}')",[a.fingerprint]),/Records changed/);
 });
 await test('Removed or altered monthly allocations are detected',async()=>{
  await db.query('DELETE FROM private.journal_plan_occurrences280 WHERE plan_id=$1 AND occurrence_no=2',[uid(101)]);let c=await check();assert(c.issues.some(i=>i.id==='schedule:allocation:'+uid(101)+':2'));assert(c.issues.some(i=>i.id==='schedule:count:'+uid(101)));
 });
 await test('Legacy due amortization and reminder are included',async()=>{
  await db.exec('SET session_replication_role=replica');await db.query("INSERT INTO scheduled_journals(schedule_no,title,memo,currency_code,debit_account_id,credit_account_id,amount,frequency,day_rule,anchor_day,start_date,next_due,created_by) VALUES('SCHTEST','Old prepaid','Old release','LAK',$1,$2,50,'monthly','last_day',30,'2020-10-31','2020-10-31',$3)",[acc('5110').id,acc('1311').id,uid(1)]);
  await db.query("INSERT INTO recurring_transactions(memo,frequency,next_due_date,amount,currency_code,created_by) VALUES('Reminder','monthly','2020-10-01',10,'LAK',$1)",[uid(1)]);await db.exec('SET session_replication_role=origin');const c=await check();assert(c.issues.some(i=>i.id.startsWith('schedule:legacy:')&&i.severity==='block'));assert(c.issues.some(i=>i.id.startsWith('schedule:reminder:')&&i.severity==='warning'));
 });
 await test('Closing cannot ignore new blocking checks',async()=>{const c=await check();await assert.rejects(db.query("SELECT public.maintenance_finish14324('2020-10-01','period',$1,'{}')",[c.fingerprint]),/integrity errors/);});
 await test('Checks are read-only and repeated results have stable fingerprints',async()=>{const first=await check(),next=await check();assert.equal(first.fingerprint,next.fingerprint);assert.deepEqual(first.entry_checks,next.entry_checks);});
 await test('Migration is repeatable and private helpers are unavailable to clients',async()=>{await db.exec(read('supabase/migrations/20261104114420_data_check_schedules_fx281.sql'));await db.exec(read('supabase/migrations/20261104120216_data_check_summary_dates281.sql'));await db.exec(read('supabase/migrations/20261104120216_data_check_summary_dates281.sql'));await db.exec('SET ROLE authenticated');await assert.rejects(db.query("SELECT private.extended_check281('2020-10-01')"),/permission denied/);await db.exec('RESET ROLE');const c=await check();assert.equal(c.coverage.version,281);});
 await test('A clean review still closes and records its complete check evidence',async()=>{const c=await check('2020-08');assert(!c.issues.some(i=>i.severity==='block'),JSON.stringify(c.issues));const review={coverageConfirmed:true,acknowledgments:Object.fromEntries(c.issues.filter(i=>i.severity==='warning').map(i=>[i.id,{acknowledged:true,reason:'Verified synthetic evidence'}])),reconciliations:Object.fromEntries(c.balances.filter(b=>b.cash_candidate).map(b=>[b.id,{actual:String(b.balance),expectedBalance:String(b.balance),acknowledged:false}]))};await db.query("SELECT public.maintenance_finish14324('2020-08-01','period',$1,$2)",[c.fingerprint,review]);assert.equal((await db.query("SELECT status FROM accounting_periods WHERE period_month='2020-08-01'")).rows[0].status,'closed');});
 await test('Unauthenticated callers cannot inspect entries or schedules',async()=>{await db.query("SELECT set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims','{}',false)");await assert.rejects(check(),/administrator/);});
 console.log(count+' database checks passed');
}finally{await db.close()}})().catch(e=>{console.error(e.message,e.detail||'',e.where||'',e.stack);process.exitCode=1});
