// Exercise both public posting routes in an isolated PostgreSQL database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mod = process.env.PGLITE_MODULE || '@electric-sql/pglite';
const { PGlite } = require(mod);
const { pgcrypto } = require(path.join(path.dirname(require.resolve(mod)), 'contrib/pgcrypto.cjs'));
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

(async () => {
 const db = new PGlite({ extensions: { pgcrypto } });
 const q = async (sql, args=[]) => (await db.query(sql,args)).rows[0];
 try {
  await db.exec(read('validation/platform14322.sql'));
  await db.exec(read('setup/fresh/001-Install-Empty-Database.sql'));
  const compact = read('setup/INSTALL-COMPACT-IDS-v143.114.sql');
  await db.exec(compact.slice(0,compact.indexOf('CREATE OR REPLACE FUNCTION public.post_manual_worker14228')));
  const rates = read('supabase/migrations/20261028074535_scheduled_prepaid_posting_context_and_rates.sql');
  await db.exec(rates.slice(rates.indexOf('ALTER TABLE public.scheduled_journals')));
  await db.exec(read('supabase/migrations/20261101050511_scheduled_journal_approval225.sql'));
  await db.exec(read('setup/INSTALL-SCHEDULED-SEPARATE-NUMBERING.sql'));
  await db.exec(read('supabase/migrations/20261104103848_upcoming_journal_plans280.sql'));
  const owner='00000000-0000-4000-8000-000000000001';
  await q('INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,$2,now())',[owner,'fixture@example.invalid']);
  await db.exec(read('setup/fresh/002-Create-First-Administrator.sql').replace('00000000-0000-0000-0000-000000000000',owner));
  await q("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[owner,JSON.stringify({sub:owner,role:'authenticated'})]);
  const ids={};
  for(const [code,name,type,currency,technical] of [
    ['1310','Prepaid house rent','ASSET','LAK',false],['1311','Prepaid Wi-Fi','ASSET','LAK',false],
    ['1312','Prepaid restaurant rent','ASSET','THB',false],['5119','Restaurant rent','EXPENSE','LAK',false],
    ['9222','Rent THB','EXPENSE','THB',true],['9290','Expense mapping','ASSET','LAK',true],
    ['5110','Utilities','EXPENSE','LAK',false],['1040','Bank','ASSET','LAK',false],['3010','Opening equity','EQUITY','LAK',false]
  ]) ids[code]=(await q('INSERT INTO accounts(code,name,account_type,currency_code,is_technical) VALUES($1,$2,$3,$4,$5) RETURNING id',[code,name,type,currency,technical])).id;
  const day='2020-09-30', uid=()=>require('node:crypto').randomUUID();
  await db.exec("SET session_replication_role=replica; INSERT INTO accounting_periods(period_month,status) VALUES('2020-09-01','open'); SET session_replication_role=origin;");
  const line=(code,debit,credit,rate=1)=>({account_id:ids[code],currency_code:['1312','9222'].includes(code)?'THB':'LAK',description:'Fixture',debit,credit,fx_rate_lak:rate,book_rate_lak:rate});
  const purchase=[line('1310',100,0),line('1040',0,100)];
  const released=[line('5119',10,0),line('1310',0,10)];
  const mixed=[line('5119',8,0),line('5110',2,0),line('1310',0,10)];
  const foreign=[line('9222',1,0,670),line('1312',0,1,670),line('5119',670,0),line('9290',0,670)];
  const save=(id,kind,lines)=>q('SELECT public.save_journal_plan280($1,$2) AS result',[id,{kind,lines,start:day,end:day,amount_basis:'monthly',allocation:'equal',posting_day:'last',auto_post:false,frequency:'once',title:'Fixture',memo:'Fixture'}]);
  const post=async(id)=>(await q('SELECT public.post_journal_plan280($1,1,$2,null,null) AS result',[id,day])).result;
  const oldRecurring=uid();await save(oldRecurring,'recurring',released);
  await db.transaction(async tx=>{
   const posted=await tx.query("INSERT INTO journal_entries(entry_no,transaction_date,memo,status,source,posted_by) VALUES('AMO20-000004','2020-09-01','Historical','posted','manual',$1) RETURNING id",[owner]);
   await tx.query("INSERT INTO journal_lines(journal_entry_id,line_no,account_id,description,currency_code,debit,credit,line_date,fx_rate_lak,book_rate_lak) VALUES($1,1,$2,'Open','LAK',100,0,'2020-09-01',1,1),($1,2,$3,'Open','LAK',0,100,'2020-09-01',1,1)",[posted.rows[0].id,ids['1310'],ids['3010']]);
  });
  await q("INSERT INTO audit_log(table_name,record_id,action,old_data,actor_id) VALUES('journal_entries','past','UPDATE',$1,$2)",[{entry_no:'REC19-000009'},owner]);
  await db.exec(read('supabase/migrations/20261105112500_prepaid_and_recurring_journal_series.sql'));
  const ordinary = () => q('SELECT last_value,is_called FROM public.journal_entry_number_seq');
  const before=await ordinary();
  assert.equal((await q("SELECT count(*)::int n FROM journal_entries WHERE entry_no='AMO20-000004'")).n,1);
  await assert.rejects(save(uid(),'recurring',released),/Choose Amortization/);
  await assert.rejects(save(uid(),'recurring',foreign),/Choose Amortization/);
  const mixedId=uid(),purchaseId=uid(),nativeId=uid();
  await save(mixedId,'recurring',mixed);
  await save(purchaseId,'recurring',purchase);
  await save(nativeId,'amortization',released);
  assert.equal((await post(nativeId)).entry_no,'AMO20-000005');
  assert.equal((await post(purchaseId)).entry_no,'REC20-000010');
  assert.equal((await post(mixedId)).entry_no,'REC20-000011');
  const oldPosted=await post(oldRecurring);
  assert.equal(oldPosted.entry_no,'AMO20-000006');
  assert.equal((await post(oldRecurring)).entry_id,oldPosted.entry_id);
  const legacy=async(title,dr,cr)=>(await q("SELECT public.create_scheduled_journal92($1,'Fixture','LAK',$2,$3,10,10,'monthly',$4,null,1,false) id",[title,ids[dr],ids[cr],day])).id;
  const wifi=await legacy('Connectivity','5110','1311'),rentPayment=await legacy('Prepaid-looking title','5119','1040');
  const approve=async(id)=>(await q('SELECT public.post_scheduled_one92($1,$2,false) AS entry',[id,day])).entry;
  assert.equal(await approve(wifi),'AMO20-000007');
  assert.equal(await approve(wifi),'AMO20-000007');
  assert.equal(await approve(rentPayment),'REC20-000012');
  assert.deepEqual(await ordinary(),before);
  assert.deepEqual(await q("SELECT has_function_privilege('authenticated','private.next_plan_entry_no298(text,jsonb,date)','EXECUTE') api, has_sequence_privilege('authenticated','private.recurring_entry_seq298','USAGE') seq"),{api:false,seq:false});
  console.log('PASS audited ID history, independent AMO / REC sequences across old and new posting paths, duplicate-safe retries, two/four-line release classification, purchases and mixed journals, manual allocator and private grants.');
 } finally { await db.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
