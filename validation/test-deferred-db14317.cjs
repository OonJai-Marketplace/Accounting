// Isolated PostgreSQL (PGlite) fixture; never connects to the live database.
const fs=require('fs'),assert=require('assert/strict');const {PGlite}=require(process.env.PGLITE_MODULE||'/tmp/oonjai-db-test/node_modules/@electric-sql/pglite');
const uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
(async()=>{const db=new PGlite();await db.exec(`
CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY,banned_until timestamptz);CREATE TABLE auth.sessions(user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('app.actor',true),'')::uuid$$;
CREATE TABLE profiles(id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,full_name text,email text,role text,status text);
CREATE TABLE user_permissions(user_id uuid PRIMARY KEY REFERENCES profiles(id),allowed_directions text[],assigned_fund_account_ids uuid[],destination_account_ids uuid[],allowed_account_ids uuid[]);
CREATE TABLE staff_journals(id uuid PRIMARY KEY,owner_id uuid REFERENCES profiles(id),period_start date,period_end date,status text,submitted_at timestamptz,reviewed_by uuid,reviewed_at timestamptz,updated_at timestamptz,return_note text);
CREATE TABLE staff_journal_lines(id uuid PRIMARY KEY,staff_journal_id uuid REFERENCES staff_journals(id),workspace_entry_no text,transaction_date date,direction text,fund_account_id uuid,account_id uuid,memo text,reference text,amount numeric,currency_code text,entry_kind text,journal_entry_id uuid);
CREATE TABLE approved_reports1443(journal_id uuid PRIMARY KEY REFERENCES staff_journals(id),snapshot jsonb);
CREATE TABLE journal_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),entry_no text,transaction_date date,memo text,status text,source text,posted_by uuid,posted_at timestamptz);
CREATE TABLE journal_lines(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),journal_entry_id uuid REFERENCES journal_entries(id),line_no integer,account_id uuid,description text,currency_code text,debit numeric,credit numeric,line_date date);
CREATE TABLE accounting_periods(period_month date,status text);
CREATE TABLE operation_receipts14228(actor_id uuid,request_key text,operation text,payload jsonb,result jsonb,PRIMARY KEY(actor_id,request_key));
CREATE TABLE audit_log(table_name text,record_id text,action text,new_data jsonb,reason text,actor_id uuid);
CREATE SEQUENCE journal_entry_number_seq;
CREATE FUNCTION is_admin() RETURNS boolean LANGUAGE sql AS $$SELECT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin' AND status='active')$$;
CREATE FUNCTION can_action113(text,text DEFAULT 'view') RETURNS boolean LANGUAGE sql AS $$SELECT is_admin() OR $1='sub-users-workspace'$$;
CREATE FUNCTION can_workspace113(uuid) RETURNS boolean LANGUAGE sql AS $$SELECT is_admin() OR $1=auth.uid()$$;
CREATE FUNCTION report_access1443(uuid) RETURNS boolean LANGUAGE sql AS $$SELECT can_workspace113($1)$$;
CREATE FUNCTION has_user_permission(text) RETURNS boolean LANGUAGE sql AS $$SELECT is_admin()$$;
CREATE FUNCTION assert_final_review14229(uuid) RETURNS void LANGUAGE plpgsql AS $$BEGIN IF NOT EXISTS(SELECT 1 FROM approved_reports1443 WHERE journal_id=$1) THEN RAISE EXCEPTION 'Not approved';END IF;END$$;
CREATE FUNCTION validate_journal14228(date,text,jsonb) RETURNS void LANGUAGE plpgsql AS $$BEGIN IF EXISTS(SELECT 1 FROM jsonb_array_elements($3) x GROUP BY x->>'currency_code' HAVING sum((x->>'debit')::numeric)<>sum((x->>'credit')::numeric)) THEN RAISE EXCEPTION 'Unbalanced';END IF;END$$;
`);
const security=fs.readFileSync('setup/INSTALL-SECURITY-v142.28.sql','utf8');for(const name of ['post_manual_worker14228','submit_staff_journal']){const start=security.indexOf('CREATE OR REPLACE FUNCTION public.'+name+'('),end=security.indexOf('CREATE OR REPLACE FUNCTION',start+10);let sql=security.slice(start,end<0?undefined:end);const dollar=sql.includes('$function$')?'$function$':'$$';sql=sql.slice(0,sql.indexOf(dollar+';',sql.indexOf(dollar)+dollar.length)+dollar.length+1);await db.exec(sql);}
await db.exec(fs.readFileSync('setup/INSTALL-WORKFLOW-v142.53.sql','utf8'));
await db.query("SELECT set_config('app.actor',$1,false)",[uid(1)]);
for(const [n,role,status]of[[1,'admin','active'],[2,'submitter','active'],[3,'admin','active'],[4,'submitter','inactive']]){await db.query('INSERT INTO auth.users(id) VALUES($1)',[uid(n)]);await db.query('INSERT INTO profiles(id,full_name,role,status) VALUES($1,$2,$3,$4)',[uid(n),'User '+n,role,status]);}
await db.query('INSERT INTO user_permissions VALUES($1,$2,$3,$4,$4)',[uid(2),['in','out'],[uid(10)],[uid(11),uid(12)]]);
async function seed(n){await db.query("INSERT INTO staff_journals(id,owner_id,period_start,period_end,status) VALUES($1,$2,'2026-10-01','2026-10-31','draft')",[uid(n),uid(2)]);for(const [i,account,amount,kind]of[[1,11,100,'payment'],[2,11,200,'payment'],[3,12,50,'payment'],[4,10,1000,'collection']]){await db.query("INSERT INTO staff_journal_lines VALUES($1,$2,$3,'2026-10-05',$4,$5,$6,$7,'receipt', $8,'LAK',$9,NULL)",[uid(n*10+i),uid(n),'RYAN-'+i,kind==='collection'?'in':'out',uid(10),uid(account),'Original detail '+i,amount,kind]);}}
await seed(100);const type=(await db.query('SELECT id FROM report_types14253 LIMIT 1')).rows[0].id;
await db.query('SELECT submit_report14253($1,$2)',[uid(100),[type]]);assert.equal((await db.query('SELECT report_types14253 FROM staff_journals WHERE id=$1',[uid(100)])).rows[0].report_types14253.length,1);
async function approve(n){await db.query("INSERT INTO approved_reports1443 SELECT $1,jsonb_build_object('journal',to_jsonb(j)||jsonb_build_object('lines',(SELECT jsonb_agg(to_jsonb(l)) FROM staff_journal_lines l WHERE staff_journal_id=j.id)),'user',jsonb_build_object('full_name','Ryan')) FROM staff_journals j WHERE id=$1",[uid(n)]);}
await approve(100);
const lines=n=>[{account_id:uid(10),currency_code:'LAK',debit:0,credit:350,source_ids:[1,2,3].map(i=>uid(n*10+i)),description:'Fund summary / report'},{account_id:uid(11),currency_code:'LAK',debit:300,credit:0,source_ids:[1,2].map(i=>uid(n*10+i)),description:'Food / report'},{account_id:uid(12),currency_code:'LAK',debit:50,credit:0,source_ids:[3].map(i=>uid(n*10+i)),description:'Transport / report'}];
async function post(n,rows=lines(n),date='2026-10-31'){return (await db.query('SELECT post_summary14253($1,$2,$3,$4,$5,$6) result',[uid(n),date,'Monthly report — October 2026',JSON.stringify(rows),'OJM',6])).rows[0].result;}
const checks=[];async function check(name,f){await f();checks.push({name,passed:true});console.log('PASS',name);}

await db.exec(`
CREATE TABLE book_sessions136(id uuid PRIMARY KEY,month date);
CREATE FUNCTION set_accounting_period_status(p_month date,p_status text) RETURNS void LANGUAGE plpgsql AS $$BEGIN
 IF p_status='locked' AND NOT EXISTS(SELECT 1 FROM accounting_periods WHERE period_month=p_month AND status='closed') THEN RAISE EXCEPTION 'Close period first';END IF;
 IF EXISTS(SELECT 1 FROM accounting_periods WHERE period_month=p_month) THEN UPDATE accounting_periods SET status=p_status WHERE period_month=p_month;ELSE INSERT INTO accounting_periods VALUES(p_month,p_status);END IF;END$$;
CREATE FUNCTION finish_book_session136(p_session uuid,p_cancel boolean) RETURNS void LANGUAGE plpgsql AS $$BEGIN IF NOT p_cancel THEN PERFORM set_accounting_period_status((SELECT month FROM book_sessions136 WHERE id=p_session),'closed');END IF;END$$;
CREATE FUNCTION close_year136(p_year integer,p_confirmation text,p_fingerprint text) RETURNS void LANGUAGE plpgsql AS $$BEGIN IF p_fingerprint<>'current' THEN RAISE EXCEPTION 'Year changed';END IF;UPDATE accounting_periods SET status='locked' WHERE extract(year from period_month)=p_year;END$$;
`);
const migration=fs.readFileSync('setup/INSTALL-DEFERRED-SUBMISSIONS-v143.17.sql','utf8');await db.exec(migration);await db.exec(migration);
const pending=async month=>(await db.query('SELECT period_pending14317($1) result',[month])).rows[0].result;
await check('Closing preflight lists exact dated unposted reports',async()=>{const p=await pending('2026-10-01');assert.equal(p.items.length,1);assert.equal(p.items[0].count,4);assert.equal(p.items[0].from,'2026-10-05');assert.equal(p.items[0].status,'submitted');assert.equal((await pending('2026-11-01')).items.length,0)});
await check('Direct closing and unacknowledged overrides are rejected',async()=>{const p=await pending('2026-10-01');await assert.rejects(db.query("SELECT set_accounting_period_status('2026-10-01','closed')"),/acknowledgment/);await assert.rejects(db.query("SELECT set_period_status14317('2026-10-01','closed',$1,false)",[p.revision]),/Acknowledge/);assert.equal((await db.query('SELECT count(*)::int n FROM accounting_periods')).rows[0].n,0)});
await check('Changed pending data requires a new acknowledgment',async()=>{const p=await pending('2026-10-01');await db.query("UPDATE staff_journal_lines SET memo='New detail' WHERE id=$1",[uid(1001)]);await assert.rejects(db.query("SELECT set_period_status14317('2026-10-01','closed',$1,true)",[p.revision]),/changed/);await db.query("UPDATE staff_journal_lines SET memo='Original detail 1' WHERE id=$1",[uid(1001)])});
await check('Acknowledged close and lock retain unaccepted reports and record the audit',async()=>{let p=await pending('2026-10-01');await db.query("SELECT set_period_status14317('2026-10-01','closed',$1,true)",[p.revision]);assert.equal((await db.query("SELECT status FROM accounting_periods WHERE period_month='2026-10-01'")).rows[0].status,'closed');assert.equal((await db.query('SELECT status FROM staff_journals WHERE id=$1',[uid(100)])).rows[0].status,'submitted');await db.query("SELECT set_period_status14317('2026-10-01','locked',$1,true)",[p.revision]);assert.equal((await db.query("SELECT count(*)::int n FROM audit_log WHERE reason LIKE 'Acknowledged%'")).rows[0].n,2)});
await check('Deferred summaries post into the next open period with original dates and IDs',async()=>{const result=await post(100,lines(100),'2026-11-01');assert(result.entry_id);assert.equal((await db.query('SELECT transaction_date::text FROM journal_entries WHERE id=$1',[result.entry_id])).rows[0].transaction_date,'2026-11-01');const sources=(await db.query('SELECT DISTINCT source_date::text FROM journal_sources14253')).rows;assert.equal(sources.length,1);assert.equal(sources[0].source_date,'2026-10-05');assert.equal((await db.query('SELECT count(*)::int n FROM journal_sources14253')).rows[0].n,6);assert.deepEqual(await post(100,lines(100),'2026-11-01'),result)});
await check('Closed target periods and backdating remain blocked',async()=>{await seed(200);await db.query('SELECT submit_report14253($1,$2)',[uid(200),[type]]);await approve(200);await assert.rejects(post(200,lines(200),'2026-09-01'),/later open/);await assert.rejects(post(200),/closed/);const p=await pending('2026-11-01');await db.query("SELECT set_period_status14317('2026-11-01','closed',$1,false)",[p.revision]);await assert.rejects(post(200,lines(200),'2026-11-01'),/closed/)});
await check('Open source months keep their original posting month',async()=>{await db.query("INSERT INTO accounting_periods VALUES('2026-12-01','open')");await seed(300);await db.query("UPDATE staff_journals SET period_start='2026-12-01',period_end='2026-12-31' WHERE id=$1",[uid(300)]);await db.query('SELECT submit_report14253($1,$2)',[uid(300),[type]]);await approve(300);await assert.rejects(post(300,lines(300),'2027-01-01'),/original reporting/)});
await check('Correction-session close uses the same acknowledgment and retains pending reports',async()=>{
 await db.query("INSERT INTO book_sessions136 VALUES($1,'2026-10-01')",[uid(900)]);const p=await pending('2026-10-01');await assert.rejects(db.query("SELECT finish_book_session14317($1,'2026-09-01',$2,true)",[uid(900),p.revision]),/month changed/);await db.query("SELECT finish_book_session14317($1,'2026-10-01',$2,true)",[uid(900),p.revision]);assert.equal((await db.query('SELECT status FROM staff_journals WHERE id=$1',[uid(200)])).rows[0].status,'submitted');
});
await check('Year closing retains the installed fingerprint check and all month acknowledgments',async()=>{
 const a={};for(let m=1;m<=12;m++){const key='2026-'+String(m).padStart(2,'0'),p=await pending(key+'-01');a[key]={revision:p.revision,acknowledged:p.items.length>0}}
 await assert.rejects(db.query("SELECT close_year14317(2026,'CLOSE YEAR 2026','stale',$1)",[a]),/Year changed/);await db.query("SELECT close_year14317(2026,'CLOSE YEAR 2026','current',$1)",[a]);assert((await db.query('SELECT status FROM accounting_periods')).rows.every(r=>r.status==='locked'));
});
await check('Sub-users cannot acknowledge or close accounting periods',async()=>{await db.query("SELECT set_config('app.actor',$1,false)",[uid(2)]);await assert.rejects(pending('2026-10-01'),/administrator/);await assert.rejects(db.query("SELECT set_period_status14317('2026-10-01','locked','fake',true)"),/administrator/);await db.query("SELECT set_config('app.actor',$1,false)",[uid(1)])});
fs.writeFileSync('validation/deferred-db14317.json',JSON.stringify(checks,null,2));await db.close();
})().catch(e=>{console.error(e);process.exit(1)});
