const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
(async()=>{
 const db=new PGlite();
 try{
  await db.exec(`CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.actor',true),'')::uuid $$;
CREATE ROLE anon; CREATE ROLE authenticated;
CREATE TABLE accounts(id uuid PRIMARY KEY,name text,code text);
CREATE TABLE journal_entries(id uuid PRIMARY KEY,entry_no text,transaction_date date,memo text,status text,source text,reference text,created_at timestamptz,updated_at timestamptz);
CREATE TABLE journal_lines(id uuid PRIMARY KEY,journal_entry_id uuid,account_id uuid,line_no integer,line_date date,description text,currency_code text,debit numeric,credit numeric,fx_rate_lak numeric,book_rate_lak numeric,base_debit numeric,base_credit numeric);
INSERT INTO accounts VALUES ('00000000-0000-4000-8000-000000000001','Cash','1010');
INSERT INTO journal_entries VALUES ('00000000-0000-4000-8000-000000000002','OJM260001','2026-01-31','January receipts','posted','manual','ANNUAL-OPENING-2026',now(),now());
INSERT INTO journal_lines VALUES ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001',1,'2026-01-09','First receipt','LAK',100,0,1,null,100,0),('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001',2,'2026-01-16','Second receipt','LAK',0,100,1,null,0,100);
SET test.actor='00000000-0000-4000-8000-000000000005';`);
  // Load the previous canonical annual-opening definition to prove the migration changes only the requested field and cache revision.
  const previous=fs.readFileSync('supabase/migrations/20261019055657_annual_opening143109.sql','utf8');
  const start=previous.indexOf('CREATE OR REPLACE FUNCTION public.journal_window14333');
  const body=previous.slice(start).match(/^[\s\S]*?END \$function\$/)[0]+';';
  await db.exec(body);
  await db.exec(fs.readFileSync('supabase/migrations/20261019112028_journal_line_order143118.sql','utf8'));
  const read=async(from='2026-01-01',offset=0)=>(await db.query('select public.journal_window14333($1,$2,$3) as result',[from,'2026-12-31',offset])).rows[0].result;
  const before=await read(),beforeOpening=await read('2026-01-12');
  const migration=fs.readdirSync('supabase/migrations').find(n=>n.endsWith('_journal_posting_date143182.sql'));assert(migration,'posting-date migration must be present');
  await db.exec(fs.readFileSync(path.join('supabase/migrations',migration),'utf8'));
  const after=await read(),afterOpening=await read('2026-01-12');
  assert.deepEqual(after.rows.map(l=>l.postingDate),['2026-01-31','2026-01-31']);
  assert.deepEqual(after.rows.map(({postingDate,...row})=>row),before.rows,'receipt dates, memo, account, annualOpening and valuations remain unchanged');
  assert.deepEqual(after.opening,before.opening);assert.deepEqual(afterOpening.opening,beforeOpening.opening,'intra-year opening calculation is unchanged');
  assert.equal(after.revision,'posting-date143182:'+before.revision,'old cached rows must be invalidated once');
  assert.equal((await read('2026-01-01',1)).rows.length,1,'paging remains unchanged');
  await db.exec("SET test.actor=''");await assert.rejects(read(),/Sign in required/);
  console.log('PASS journal window postingDate, unchanged receipts/valuations/openings/paging, cache refresh and authentication guard');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
