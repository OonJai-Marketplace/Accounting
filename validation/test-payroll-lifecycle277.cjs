// Isolated Postgres-compatible database. Never connects to the live ledger.
const fs=require('node:fs'),assert=require('node:assert/strict'),{PGlite}=require('@electric-sql/pglite');
const migration=fs.readFileSync('supabase/migrations/20261104092536_payroll_lifecycle277.sql','utf8');
const db=new PGlite();
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const data={month:'2026-10',status:'finalized',reference:'TEST-2026-10',rates:{LAK:1,USD:22294},rateSource:'Synthetic rate',rows:[{employeeId:'e1',input:{attendance:[{date:'2026-10-01',mark95:'0'}],advance:25}}],results:[{employeeId:'e1',adjusted:100,attendance95:[{date:'2026-10-01',leaveType:'vacation',scheduleFraction:0.5}]}],config:{workingDays:26,brackets:[]},settingsVersion:7,settingsSnapshot:{payroll:{workingDays:26}},finalizedAt:'2026-11-01',payrollTemplate1429:{lines:[]}};
async function sql(q,args=[]){return db.query(q,args)}
async function scalar(q,args=[]){return (await sql(q,args)).rows[0].v}
async function seed(n,extra={}){await sql('insert into payroll_runs(id,data,version,status) values($1,$2,1,$3)',[id(n),{...data,...extra},extra.status||'finalized']);}
async function rejected(q,args,re){await assert.rejects(()=>sql(q,args),re);}
const lines=(amount=100)=>[{account_id:id(701),currency_code:'LAK',debit:amount,credit:0},{account_id:id(702),currency_code:'LAK',debit:0,credit:amount}];
async function context(n){return scalar('select payroll_journal_context277($1) v',[id(n)]);}
async function post(n,version,date='2026-10-31',memo='',amount=100){const c=await context(n);return sql('select public.post_payroll_journal277($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) v',[id(n),version??c.record.version,date,`TEST Payroll ${c.mode==='adjustment'?'[PayrollAdjustment:'+id(n)+':'+c.correction_id+']':'[Payroll:'+id(n)+']'} ${memo}`,lines(amount),'OJM',6,c.correction_id,c.mode,c.ledger_hash]);}
async function reopen(n){const v=await scalar('select version v from payroll_runs where id=$1',[id(n)]);return scalar('select reopen_payroll277($1,$2,$3) v',[id(n),v,'Synthetic attendance correction report']);}
async function close(n){await sql("update payroll_runs set data=jsonb_set(data,'{status}','\"finalized\"'),version=version+1 where id=$1",[id(n)]);}

(async()=>{
 await db.exec(`create schema auth;create schema private;create role anon;create role authenticated;
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.actor',true),'')::uuid $$;
 create function public.is_admin() returns boolean language sql stable as $$ select auth.uid() is not null and current_setting('test.admin',true)='yes' $$;
 create function public.accounting_workspace_allowed123() returns boolean language sql stable as $$ select current_setting('test.active',true)='yes' $$;
 create function public.password_gate14257() returns void language plpgsql as $$ begin if current_setting('test.password',true)='blocked' then raise exception 'PASSWORD_CHANGE_REQUIRED';end if;end $$;
 create function public.can_action113(text,text) returns boolean language sql stable as $$ select public.is_admin() $$;
 create table accounting_periods(id uuid default gen_random_uuid() primary key,period_month date unique,status text,updated_by uuid);
 create table year_closings136(year int primary key);
 create table book_sessions136(id uuid default gen_random_uuid(),period_id uuid,status text);
 create table payroll_runs(id uuid default gen_random_uuid() primary key,period_start date,period_end date,status text,created_by uuid,approved_by uuid,created_at timestamptz default now(),data jsonb,version int,updated_at timestamptz,updated_by uuid);
 create table journal_entries(id uuid default gen_random_uuid() primary key,entry_no text,transaction_date date,memo text,status text,posted_at timestamptz default now());
 create table journal_lines(id uuid default gen_random_uuid(),journal_entry_id uuid,line_no int,account_id uuid,currency_code text,debit numeric,credit numeric,fx_rate_lak numeric,book_rate_lak numeric,line_date date);
 create table payroll_tax_settings(id boolean primary key,version int,data jsonb);
 create table audit_log(id bigserial,table_name text,record_id text,action text,old_data jsonb,new_data jsonb,reason text,actor_id uuid);
 create function public.old_guard() returns trigger language plpgsql as $$ begin return new; end $$;
 create trigger guard_record83 before insert or update on payroll_runs for each row execute function old_guard();
 create function public.post_manual_journal14228(p_transaction_date date,p_memo text,p_lines jsonb,p_prefix text,p_digits int,p_request_key text)
 returns table(entry_id uuid,entry_no text) language plpgsql set search_path=public,pg_temp as $$ declare eid uuid:=gen_random_uuid(); begin
 if exists(select 1 from jsonb_array_elements(p_lines) l group by l->>'currency_code' having sum((l->>'debit')::numeric-(l->>'credit')::numeric)<>0) then raise exception 'Unbalanced';end if;
 insert into journal_entries(id,entry_no,transaction_date,memo,status) values(eid,p_prefix||'-TEST',p_transaction_date,p_memo,'posted');
 insert into journal_lines(journal_entry_id,line_no,account_id,currency_code,debit,credit,line_date) select eid,n::int,(value->>'account_id')::uuid,value->>'currency_code',(value->>'debit')::numeric,(value->>'credit')::numeric,p_transaction_date from jsonb_array_elements(p_lines) with ordinality x(value,n);
 if position('[FAIL]' in p_memo)>0 then raise exception 'Synthetic failure after header/lines';end if;
 return query select eid,p_prefix||'-TEST';end $$;
 create function public.revise_open_journal_entry(eid uuid,reason text,p_date date,p_memo text,p_lines jsonb) returns void language plpgsql set search_path=public as $$ begin
 if exists(select 1 from accounting_periods where period_month=date_trunc('month',p_date)::date and status<>'open') then raise exception 'Closed original month';end if;
 delete from journal_lines where journal_entry_id=eid;
 insert into journal_lines(journal_entry_id,line_no,account_id,currency_code,debit,credit,line_date) select eid,n::int,(value->>'account_id')::uuid,value->>'currency_code',(value->>'debit')::numeric,(value->>'credit')::numeric,p_date from jsonb_array_elements(p_lines) with ordinality x(value,n);
 update journal_entries set memo=p_memo,transaction_date=p_date where id=eid;end $$;
 select set_config('test.actor','${id(999)}',false),set_config('test.admin','yes',false),set_config('test.active','yes',false);
 insert into accounting_periods(period_month,status) values('2026-10-01','open'),('2026-09-01','closed');`);
 for(let n=1;n<=10;n++)await seed(n,n===2?{month:'2026-09',settingsSnapshot:null}:{});
 await sql('insert into payroll_tax_settings values(true,7,$1)',[data.settingsSnapshot]);
 await db.exec(migration);
 await db.exec('create trigger check_payroll_tax_settings before insert or update on payroll_runs for each row execute function check_payroll_tax_settings()');
 const before=await scalar('select data v from payroll_runs where id=$1',[id(1)]);
 await rejected("update payroll_runs set data=jsonb_set(data,'{results,0,adjusted}','900'),version=2 where id=$1",[id(1)],/Edit payroll/);
 await rejected("select reopen_payroll277($1,99,'reason')",[id(1)],/changed/);
 assert.equal((await scalar("select reopen_payroll277($1,1,'') v",[id(7)])).data.status,'draft','open month needs no explanation');
 assert.equal(await scalar("select count(*)::int v from audit_log where record_id=$1",[id(7)]),0,'open-month editing must not create a required correction report');
 await assert.rejects(()=>reopen(2),/saved calculation rules/);
 const reopened=await reopen(1);
 assert.equal(reopened.data.status,'draft');assert.deepEqual(reopened.data.rows,before.rows);assert.deepEqual(reopened.data.rates,before.rates);
 assert.deepEqual(await scalar("select original->'data' v from private.payroll_corrections277 where run_id=$1",[id(1)]),before);
 assert.deepEqual(reopened.data.results,before.results,'retain last closed figures during correction');
 const historyWindow=await scalar("select payroll_window14334('2026-11-01','2026-11-30',0) v");assert.equal(historyWindow.carry.find(r=>r.runId===id(1)).days,0.5,'unloaded correction retains closed leave usage');assert.equal(historyWindow.index.find(r=>r.id===id(1)).status,'finalized','correction remains in closed history index');assert.deepEqual(reopened.data.payrollTemplate1429,before.payrollTemplate1429);
 await rejected("update payroll_runs set data=jsonb_set(data,'{config}','{}'),version=version+1 where id=$1",[id(1)],/original month and calculation rules/);
 await close(1);
 await assert.rejects(()=>post(1,1),/changed after preparation/);
 await assert.rejects(()=>post(1,3,'2026-11-01'),/payroll month/);
 await rejected("update payroll_runs set data=jsonb_set(data,'{journalLink1429}','{\"journalId\":\"fake\"}'),version=version+1 where id=$1",[id(1)],/payroll journal action/);
 await rejected("insert into journal_entries(transaction_date,memo,status) values('2026-10-31',$1,'posted')",[`[Payroll:${id(1)}]`],/Salary History/);
 await assert.rejects(()=>post(1,3,'2026-10-31','[FAIL]'),/Synthetic failure/);
 assert.equal(await scalar('select count(*)::int v from journal_entries'),0);
 assert.equal(await scalar('select count(*)::int v from journal_lines'),0);
 assert.equal(await scalar('select version v from payroll_runs where id=$1',[id(1)]),3);
 const success=(await post(1,3)).rows[0].v;assert.equal(success.already_posted,false);assert.equal(success.record.data.journalLink1429.journalId,success.entry_id);
 assert.equal(success.record.data.correction277.pending,false);assert.deepEqual(success.record.data.results,data.results);assert.deepEqual(success.record.data.rows,data.rows);
 const retry=(await post(1,3)).rows[0].v;assert.equal(retry.entry_id,success.entry_id);assert.equal(retry.already_posted,true);
 assert.equal(await scalar('select count(*)::int v from journal_entries'),1);
 await rejected("update payroll_runs set data=jsonb_set(data,'{payrollTemplate1429}','{}'),version=version+1 where id=$1",[id(1)],/Use Edit payroll/);
 await reopen(1);await close(1);assert.equal((await context(1)).mode,'replace');
 const replacement=(await post(1,undefined,'2026-10-30','',125)).rows[0].v;
 assert.equal(replacement.entry_id,success.entry_id,'open-month correction keeps the original journal ID');
 assert.equal(await scalar('select count(*)::int v from journal_entries'),1);
 assert.equal(await scalar('select max(debit)::int v from journal_lines where journal_entry_id=$1',[success.entry_id]),125);
 await sql("update payroll_runs set data=jsonb_set(data,'{payrollTemplate1429}','{\"name\":\"Revised layout\"}'),version=2 where id=$1",[id(3)]);
 await assert.rejects(()=>post(3,1),/changed after preparation/);
 await sql("insert into journal_entries(id,transaction_date,status,memo,entry_no) values($1,'2026-09-30','posted','Manual journal','MANUAL-1')",[id(501)]);
 await rejected('select link_payroll_journal277($1,1,$2)',[id(4),id(501)],/payroll month/);
 await sql("insert into journal_entries(id,transaction_date,status,memo,entry_no) values($1,'2026-10-31','posted','Manual journal','MANUAL-2')",[id(502)]);
 const linked=await scalar('select link_payroll_journal277($1,1,$2) v',[id(4),id(502)]);assert.equal(linked.data.journalLink1429.journalId,id(502));
 await rejected('select link_payroll_journal277($1,1,$2)',[id(5),id(502)],/already linked/);
 await sql("update accounting_periods set status='closed' where period_month='2026-10-01'");
 await rejected("select reopen_payroll277($1,1,'')",[id(6)],/accounting month is closed/);
 const originalJournal=await scalar('select to_jsonb(journal_entries) v from journal_entries where id=$1',[success.entry_id]);
 await reopen(1);await close(1);assert.equal((await context(1)).mode,'adjustment');
 await assert.rejects(()=>post(1),/open accounting month/);
 const adjustment=(await post(1,undefined,'2026-11-04','',25)).rows[0].v;
 assert.notEqual(adjustment.entry_id,success.entry_id);assert.equal(adjustment.mode,'adjustment');
 assert.deepEqual(await scalar('select to_jsonb(journal_entries) v from journal_entries where id=$1',[success.entry_id]),originalJournal,'closed original journal must not change');
 await reopen(1);await close(1);assert.equal((await context(1)).ledger.length,2,'later corrections include previous adjustment journals');
 const plan=await context(1);await sql("update journal_entries set memo=memo||' other edit' where id=$1",[adjustment.entry_id]);
 await rejected('select post_payroll_journal277($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id(1),plan.record.version,'2026-11-04',`[PayrollAdjustment:${id(1)}:${plan.correction_id}]`,lines(10),'OJM',6,plan.correction_id,plan.mode,plan.ledger_hash],/existing payroll journal changed/);
 const unchanged=await context(1),basis=unchanged.ledger.flatMap(e=>e.lines),countBefore=await scalar('select count(*)::int v from journal_entries');
 const noChange=await scalar('select post_payroll_journal277($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) v',[id(1),unchanged.record.version,'2026-11-04',`[PayrollAdjustment:${id(1)}:${unchanged.correction_id}]`,[],'OJM',6,unchanged.correction_id,unchanged.mode,unchanged.ledger_hash,basis]);
 assert.equal(noChange.report_only,true);assert.equal(await scalar('select count(*)::int v from journal_entries'),countBefore,'nonmonetary report must not create a journal');
 await reopen(1);await close(1);
 await sql('insert into year_closings136 values(2026)');await assert.rejects(()=>post(1,undefined,'2026-11-04'),/open accounting month/);await sql('delete from year_closings136');
 await sql("insert into book_sessions136(period_id,status) select id,'editing' from accounting_periods where period_month='2026-11-01'");await assert.rejects(()=>post(1,undefined,'2026-11-04'),/open accounting month/);await sql('delete from book_sessions136');
 for(const [key,value,message] of [['actor','',/administrator/],['admin','no',/administrator/],['active','no',/administrator/],['password','blocked',/PASSWORD_CHANGE_REQUIRED/]]){
  const original=await scalar("select current_setting($1,true) v",['test.'+key]);await sql('select set_config($1,$2,false)',['test.'+key,value]);
  await assert.rejects(()=>reopen(6),message);await assert.rejects(()=>post(6),message);
  await sql('select set_config($1,$2,false)',['test.'+key,original||'']);
 }
 assert.equal(await scalar("select has_function_privilege('anon','public.reopen_payroll277(uuid,integer,text)','EXECUTE') v"),false);
 assert.equal(await scalar("select has_function_privilege('authenticated','private.link_payroll277(uuid,uuid)','EXECUTE') v"),false);
 assert.equal(await scalar("select has_function_privilege('authenticated','public.post_payroll_journal277(uuid,integer,date,text,jsonb,text,integer,uuid,text,text,jsonb)','EXECUTE') v"),true);
 assert.equal(await scalar('select count(*)::int v from payroll_runs'),10,'no payroll is deleted');
 console.log('PASS isolated SQL: report reasons and original snapshots, frozen calculation rules, close/history, atomic rollback/retry, open-month same-ID revision, closed-month separate adjustment, prior adjustments, stale-version/ledger rejection, month/year/correction locks, manual-link identity and access grants. No live records used.');
 await db.close();
})().catch(async e=>{console.error(e);await db.close();process.exitCode=1});
