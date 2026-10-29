// Synthetic PostgreSQL only: never connects to hosted bookkeeping data.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const mod=process.env.PGLITE_MODULE||'@electric-sql/pglite',resolved=require.resolve(mod),{PGlite}=require(mod);
const {pgcrypto}=require(process.env.PGCRYPTO_MODULE||path.join(path.dirname(resolved),'contrib/pgcrypto.cjs'));
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
(async()=>{const db=new PGlite({extensions:{pgcrypto}});try{
 await db.exec(read('validation/platform14322.sql'));
 await db.exec(read('setup/fresh/001-Install-Empty-Database.sql'));
 const compactIds=read('setup/INSTALL-COMPACT-IDS-v143.114.sql');
 await db.exec(compactIds.slice(0,compactIds.indexOf('CREATE OR REPLACE FUNCTION public.post_manual_worker14228')));
 const migration=read('supabase/migrations/20261028074535_scheduled_prepaid_posting_context_and_rates.sql');
 // The historical migration has a production-specific previous-body check.
 // This empty synthetic installation starts from a different older body;
 // install the exact reviewed schema/function statements for the local test.
 await db.exec(migration.slice(migration.indexOf('ALTER TABLE public.scheduled_journals')));
 const owner='00000000-0000-4000-8000-000000000001';
 await db.query('INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,$2,now())',[owner,'scheduler@example.invalid']);
 await db.exec(read('setup/fresh/002-Create-First-Administrator.sql').replace('00000000-0000-0000-0000-000000000000',owner));
 await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[owner,JSON.stringify({sub:owner,role:'authenticated'})]);
 await db.exec("INSERT INTO accounts(code,name,account_type,currency_code) VALUES ('5110','Fixture Wi-Fi','EXPENSE','LAK'),('1311','Fixture prepaid Wi-Fi','ASSET','LAK'),('9222','Fixture rent','EXPENSE','THB'),('1312','Fixture prepaid rent','ASSET','THB');");
 // Reuse the financial edge cases with the actual migrated function bodies,
 // redirecting their tables and sequences into this test's temporary schema.
 const names=['post_scheduled_one91','process_due_scheduled_journals91'];let sql=read('validation/test-scheduled-prepaid-posting.sql');
 for(const name of names){const actual=(await db.query('SELECT pg_get_functiondef(oid) AS body FROM pg_proc WHERE pronamespace=\'public\'::regnamespace AND proname=$1',[name])).rows[0].body;
  const body=actual.replace('public.'+name,'pg_temp.'+name).replace("SET search_path TO 'public', 'pg_temp'","SET search_path TO 'pg_temp', 'public'").replace(/public\.(scheduled_journals|journal_entries|journal_lines|scheduled_journal_occurrences|accounting_periods|audit_log|post_scheduled_one91|check_ledger_entry14228)\b/g,'pg_temp.$1').replace('public.journal_entry_number_seq','pg_temp.test_journal_seq');
  const start=sql.indexOf('CREATE OR REPLACE FUNCTION pg_temp.'+name+'('),end=sql.indexOf('$function$;',sql.indexOf('AS $function$',start))+12;
  assert(start>=0&&end>start);sql=sql.slice(0,start)+body.trimEnd()+';'+sql.slice(end);
 }
 sql=sql.replace("RAISE EXCEPTION 'Expected exactly two due postings'", "RAISE EXCEPTION 'Expected exactly two due postings: %', (SELECT json_agg(json_build_object('schedule',schedule_no,'status',status,'error',last_error)) FROM pg_temp.scheduled_journals)");
 const result=await db.exec(sql);assert(result.at(-1).rows[0].result.startsWith('PASS:'));
 assert.equal((await db.query('SELECT count(*)::int n FROM journal_entries')).rows[0].n,0);
 console.log('PASS actual migrated scheduler: authorized actor, identity restoration, due/future checks, retries, missing-rate/imbalance rejection, period lock, foreign valuation, six month-ends; no hosted writes');
}finally{await db.close()}})().catch(e=>{console.error(e);process.exitCode=1});
