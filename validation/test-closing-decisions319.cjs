// Isolated PostgreSQL database. The public preflight/finish definitions are installed from the repository.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
(async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create schema private; create schema auth; create role anon; create role authenticated;
   create function auth.uid() returns uuid language sql as $$select '00000000-0000-0000-0000-000000000001'::uuid$$;
   create table public.accounts(id uuid primary key,code text,account_type text,is_technical boolean,currency_code text);
   create table public.journal_entries(id uuid primary key,status text,transaction_date date,memo text,reference text);
   create table public.journal_lines(id uuid primary key,journal_entry_id uuid,account_id uuid,line_date date,debit numeric,credit numeric);
   create table public.staff_journals(id uuid primary key);create table public.staff_journal_lines(id uuid primary key,staff_journal_id uuid,transaction_date date,journal_entry_id uuid,amount numeric);
   create table public.audit_log(table_name text,record_id text,action text,new_data jsonb,reason text,actor_id uuid);`);
  for(const t of ['private.journal_plans280','private.journal_plan_occurrences280','public.scheduled_journals','public.scheduled_journal_occurrences','public.recurring_transactions','public.accounting_periods','public.payroll_runs','public.entry_submissions','public.period_findings','public.audit_reviews136','private.reconciliation_settings305','private.reconciliation_records305','private.reconciliation_periods305'])await db.exec('create table '+t+'(id uuid);');
  await db.exec(`create table public.book_sessions136(id uuid,period_id uuid,status text);
   alter table public.accounting_periods add column period_month date;
   create table input_data(checkup jsonb);
   create function private.maintenance_base281(date) returns jsonb language sql as $$select checkup from public.input_data$$;
   create function private.extended_check281(date) returns jsonb language sql as $$select '{"issues":[],"fingerprint":"fixture"}'::jsonb$$;
   create function private.reconciliation_check305(date) returns jsonb language sql as $$select '{"issues":[]}'::jsonb$$;
   create function public.set_period_status14317(date,text,text,boolean) returns jsonb language sql as $$select '{}'::jsonb$$;`);
  const installed=read('setup/INSTALL-RECONCILIATION-v143.305.sql');
  for(const name of ['maintenance_preflight14324','maintenance_finish14324']){
   const start=installed.indexOf('CREATE OR REPLACE FUNCTION public.'+name+'(');
   const end=name==='maintenance_finish14324'?'END $function$':'END $$';
   await db.exec(installed.slice(start,installed.indexOf(end,start)+end.length)+';');
  }
  const migration=read('supabase/migrations/20261109083320_monthly_closing_acknowledgments319.sql');
  await db.exec(migration); await db.exec(migration);
  const id='00000000-0000-0000-0000-000000000003',report='report:'+id,fx='fx:unverified:'+id,clearing='clearing:'+id;
  await db.query('insert into staff_journals values($1)',[id]);
  await db.query("insert into staff_journal_lines values($1,$1,'2026-01-01',null,12)",[id]);
  await db.query("insert into journal_entries values($1,'posted','2026-01-01','source one')",[id]);
  const base={fingerprint:'original',pending:{revision:'test'},issues:[report,fx,clearing].map(id=>({id,title:'Fixture',severity:'warning',detail:'Finding'})),balances:[{id,balance:20,currency:'LAK',account_type:'ASSET',account_purpose:'clearing'}]};
  await db.query('insert into input_data values($1)',[JSON.stringify(base)]);
  const pre=async date=>(await db.query('select public.maintenance_preflight14324($1) c',[date])).rows[0].c;
  const close=(date,c,reasons)=>db.query("select public.maintenance_finish14324($1,'period',$2,$3,'closed')",[date,c.fingerprint,JSON.stringify({coverageConfirmed:true,decisionRevision319:c.decisionRevision319,acknowledgments:reasons})]);
  const reason={acknowledged:true,reason:'Checked supporting detail'};
  const answers={[report]:reason,[fx]:reason,[clearing]:{...reason,allowCarry:true}};
  const jan=await pre('2026-01-01');
  await assert.rejects(close('2026-01-01',jan,{}),/Acknowledge and explain/);
  await close('2026-01-01',jan,answers);
  const feb=await pre('2026-02-01');
  for(const d of Object.values(feb.decisions319))assert.equal(d.saved.reason,reason.reason);
  assert.equal(feb.decisions319[clearing].saved.allowCarry,true);
  await assert.rejects(close('2026-01-01',jan,answers),/Saved reasons changed/);
  await db.query('update staff_journal_lines set amount=13');
  await db.query("update journal_entries set memo='changed source'");
  base.balances[0].balance=30;await db.query('update input_data set checkup=$1',[JSON.stringify(base)]);
  const changed=await pre('2026-02-01');
  assert.equal(changed.decisions319[report].saved,undefined);
  assert.equal(changed.decisions319[fx].saved,undefined);
  assert.equal(changed.decisions319[clearing].saved.allowCarry,true);
  base.balances[0].balance=-30;await db.query('update input_data set checkup=$1',[JSON.stringify(base)]);
  assert.equal((await pre('2026-02-01')).decisions319[clearing].saved,undefined);
  await assert.rejects(close('2026-02-01',await pre('2026-02-01'),{...answers,[fx]:{...reason,allowCarry:true}}),/exception is unavailable/);
  assert.equal((await db.query("select count(*) n from audit_log")).rows[0].n,1);
  assert.equal((await db.query("select has_table_privilege('authenticated','private.monthly_closing_decisions319','SELECT') permitted")).rows[0].permitted,false);
  console.log('PASS monthly decision retention, changed sources, debit/credit scope, stale review rejection, atomic rollback and restricted access');
 }finally{await db.close()}
})().catch(e=>{console.error(e.message,e.where||'');process.exitCode=1});
