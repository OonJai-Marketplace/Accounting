// Run with PGLITE_MODULE pointing to an installed @electric-sql/pglite.
// Isolated fixture only; never connects to Supabase or closes a real period.
const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const db=new PGlite();try{
 await db.exec(`
 CREATE FUNCTION require_admin136() RETURNS uuid LANGUAGE plpgsql AS $$ BEGIN
 IF current_setting('fixture.admin',true) IS DISTINCT FROM 'yes' THEN RAISE EXCEPTION 'Admin required'; END IF;
 RETURN '00000000-0000-4000-8000-000000000001'::uuid; END $$;
 CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '00000000-0000-4000-8000-000000000001'::uuid $$; CREATE FUNCTION is_admin() RETURNS bool LANGUAGE sql AS $$ SELECT current_setting('fixture.admin',true)='yes' $$; CREATE ROLE anon; CREATE ROLE authenticated; CREATE FUNCTION backup_export113(date,date) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
 CREATE TABLE accounts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),code text,name text,account_type text,currency_code text,parent_code text,is_active bool DEFAULT true,is_posting bool DEFAULT true,is_technical bool DEFAULT false,account_purpose text DEFAULT 'regular');
 CREATE TABLE accounting_periods(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),period_month date UNIQUE,status text,closed_at timestamptz,locked_at timestamptz,updated_by uuid,updated_at timestamptz);
 CREATE TABLE journal_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),entry_no text UNIQUE,transaction_date date,memo text,reference text,status text,source text,posted_by uuid,posted_at timestamptz,accounting_period_id uuid);
 CREATE TABLE journal_lines(id uuid DEFAULT gen_random_uuid(),journal_entry_id uuid,line_no integer,account_id uuid,currency_code text,debit numeric,credit numeric,line_date date,description text,fx_rate_lak numeric(24,10),book_rate_lak numeric(24,10),base_debit numeric GENERATED ALWAYS AS (CASE WHEN currency_code='LAK' THEN debit ELSE round(debit*coalesce(book_rate_lak,fx_rate_lak),2) END) STORED,base_credit numeric GENERATED ALWAYS AS (CASE WHEN currency_code='LAK' THEN credit ELSE round(credit*coalesce(book_rate_lak,fx_rate_lak),2) END) STORED);
 CREATE TABLE year_closings136(year integer PRIMARY KEY,actor uuid,balances jsonb,closing_entries jsonb,anchor_entry uuid);
 CREATE TABLE book_sessions136(period_id uuid,status text);
 CREATE TABLE entry_submissions(transaction_date date,status text);
 CREATE TABLE staff_journals(period_start date,status text);
 CREATE TABLE audit_reviews136(period_id uuid,status text);
 CREATE TABLE period_findings(accounting_period_id uuid,status text);
 CREATE TABLE payroll_runs(period_start date,status text);
 CREATE TABLE accounting_operations136(backend int,transaction_id bigint,actor uuid);
 CREATE TABLE accounting_id_settings(id bool,journal_prefix text,journal_digits int);
 INSERT INTO accounting_id_settings VALUES(true,'JRN',6);
 CREATE SEQUENCE journal_entry_number_seq;
 INSERT INTO accounts(code,name,account_type,currency_code,parent_code,is_technical,account_purpose) VALUES
 ('1018','Cash USD','ASSET','USD','1000',false,'regular'),
 ('3110','Retained LAK','EQUITY','LAK','3100',false,'regular'),
 ('4010','Sales LAK','REVENUE','LAK','4000',false,'regular'),
 ('5010','Expense LAK','EXPENSE','LAK','5000',false,'regular'),
 ('9102','Sales USD Mapping','REVENUE','USD','9100',true,'mapping'),
 ('9202','Expense USD Mapping','EXPENSE','USD','9200',true,'mapping'),
 ('9190','Revenue Offset LAK','REVENUE','LAK','9100',true,'mapping'),
 ('9290','Expense Offset LAK','EXPENSE','LAK','9200',true,'mapping');
 INSERT INTO accounting_periods(period_month,status) VALUES('2026-01-01','locked');
 INSERT INTO journal_entries(entry_no,transaction_date,status) VALUES('SAMPLE-IN','2026-01-10','posted'),('SAMPLE-OUT','2026-01-11','posted');
 INSERT INTO journal_lines(journal_entry_id,line_no,account_id,currency_code,debit,credit,line_date,fx_rate_lak,book_rate_lak)
 SELECT e.id,v.n,a.id,a.currency_code,v.dr,v.cr,e.transaction_date,CASE a.currency_code WHEN 'USD' THEN 22000 ELSE 1 END,NULL
 FROM (VALUES ('SAMPLE-IN',1,'1018',100,0),('SAMPLE-IN',2,'9102',0,100),('SAMPLE-IN',3,'9190',2200000,0),('SAMPLE-IN',4,'4010',0,2200000),('SAMPLE-OUT',1,'5010',220000,0),('SAMPLE-OUT',2,'9290',0,220000),('SAMPLE-OUT',3,'9202',10,0),('SAMPLE-OUT',4,'1018',0,10)) v(entry,n,code,dr,cr)
 JOIN accounts a ON a.code=v.code JOIN journal_entries e ON e.entry_no=v.entry;
 `);
 await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261017145427_report_archive_integrity143106.sql'),'utf8'));
 await assert.rejects(db.query('select year_preflight136(2026)'),/Admin required/);
 await db.exec("set fixture.admin='yes'");
 await db.exec(`
 INSERT INTO accounts(code,name,account_type,currency_code,parent_code) VALUES ('4020','Legacy USD revenue','REVENUE','USD','4000'),('3120','Retained USD','EQUITY','USD','3100'),('1020','Residual USD','ASSET','USD','1000');
 INSERT INTO journal_entries(entry_no,transaction_date,status) VALUES ('LEGACY','2026-01-12','posted'),('RESIDUAL-IN','2026-01-13','posted'),('RESIDUAL-OUT','2026-01-14','posted');
 INSERT INTO journal_lines(journal_entry_id,line_no,account_id,currency_code,debit,credit,line_date,fx_rate_lak)
 SELECT e.id,v.n,a.id,'USD',v.dr,v.cr,e.transaction_date,v.rate FROM (VALUES ('LEGACY',1,'1018',10,0,25000),('LEGACY',2,'4020',0,10,25000),('RESIDUAL-IN',1,'1020',1,0,22000),('RESIDUAL-IN',2,'9102',0,1,22000),('RESIDUAL-OUT',1,'9102',1,0,23000),('RESIDUAL-OUT',2,'1020',0,1,23000)) v(entry,n,code,dr,cr,rate) JOIN accounts a ON a.code=v.code JOIN journal_entries e ON e.entry_no=v.entry;
 `);
 await db.exec("update journal_lines set fx_rate_lak=null where account_id=(select id from accounts where code='4020')");
 const missing=(await db.query('select year_preflight136(2026) result')).rows[0].result;assert(missing.blockers.some(x=>/missing saved LAK/.test(x)));await assert.rejects(db.query("select close_year136(2026,'CLOSE YEAR 2026',$1)",[missing.fingerprint]),/checks failed/);
 await db.exec("update journal_lines set fx_rate_lak=25000 where account_id=(select id from accounts where code='4020')");
 const pre=(await db.query('select year_preflight136(2026) result')).rows[0].result;assert.deepEqual(pre.blockers,[]);
 assert.equal(pre.balances.filter(b=>b.type==='SYSTEM').length,4);
 assert.equal(pre.balances.filter(b=>['REVENUE','EXPENSE'].includes(b.type)).length,3);
 await assert.rejects(db.query("select close_year136(2026,'CLOSE YEAR 2026','changed')"),/Balances changed/);
 const result=(await db.query("select close_year136(2026,'CLOSE YEAR 2026',$1) result",[pre.fingerprint])).rows[0].result;
 assert.equal(result.completed,true);assert.equal(result.closingEntries.length,2);
 assert.equal(result.balances.some(b=>['REVENUE','EXPENSE'].includes(b.type)),false);
 assert.equal(result.balances.filter(b=>b.type==='SYSTEM').length,4);const residual=result.balances.find(b=>b.code==='1020');assert.equal(residual.balance,0);assert.equal(residual.base_balance,-1000);const usdRetained=result.balances.find(b=>b.code==='3120');assert.equal(usdRetained.balance,-10);assert.equal(usdRetained.base_balance,-250000);
 const cash=result.balances.find(b=>b.code==='1018'),retained=result.balances.find(b=>b.code==='3110');
 assert.equal(cash.balance,100);assert.equal(cash.base_balance,2230000);assert.equal(cash.base_balance/cash.balance,22300);assert.equal(retained.balance,-1980000);assert.equal(retained.base_balance,-1980000);
 assert.equal((await db.query("select count(*)::int n from journal_lines l join accounts a on a.id=l.account_id join journal_entries e on e.id=l.journal_entry_id where e.source='system' and a.is_technical")).rows[0].n,0);
 assert.equal((await db.query("select count(*)::int n from accounting_periods where period_month<'2027-01-01' and status='locked'")).rows[0].n,12);
 assert.equal((await db.query('select count(*)::int n from accounting_operations136')).rows[0].n,0);
 await db.query("select close_year136(2026,'CLOSE YEAR 2026',$1)",[pre.fingerprint]);assert.equal((await db.query('select count(*)::int n from journal_entries')).rows[0].n,7);
 console.log('PASS isolated year close including foreign P&L carrying rates, missing-rate blocker, zero-unit residual LAK checkpoint: LAK profit only, original-currency System carry, LAK carrying value/average, admin guard, stale fingerprint, locked months, idempotent close');
 const pack=(await db.query("select backup_export143106('2027-01-01','2027-12-31') result")).rows[0].result;assert.equal(pack.ledgerOpening143106.complete,true);assert.equal(pack.ledgerOpening143106.balances.find(b=>b.account_id===cash.account_id).base_balance,2230000);
 console.log('PASS archive export includes original-currency and LAK opening balances from the same database snapshot');
 await db.exec(`
 CREATE TABLE audit_log(id uuid DEFAULT gen_random_uuid(),table_name text,record_id text,detail jsonb);
 CREATE TABLE record_deletions108(id uuid DEFAULT gen_random_uuid(),table_name text,record_id uuid,record_data jsonb);
 CREATE TABLE staff_journal_lines(journal_entry_id uuid);
 CREATE TRIGGER purge_voided AFTER DELETE ON audit_log FOR EACH ROW EXECUTE FUNCTION purge_voided_after_audit14260();
 INSERT INTO journal_entries(entry_no,transaction_date,status) VALUES('VOID-ARCHIVE','2027-01-10','voided');
 INSERT INTO journal_lines(journal_entry_id,line_no,account_id,currency_code,debit,credit,fx_rate_lak,book_rate_lak) SELECT e.id,1,a.id,'USD',5,0,25000,23000 FROM journal_entries e,accounts a WHERE e.entry_no='VOID-ARCHIVE' AND a.code='1018';
 INSERT INTO audit_log(table_name,record_id,detail) SELECT 'journal_entries',id::text,'{"reason":"fixture void"}' FROM journal_entries WHERE entry_no='VOID-ARCHIVE';
 CREATE FUNCTION archive_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Archive unavailable'; END $$;
 CREATE TRIGGER archive_fail BEFORE INSERT ON record_deletions108 FOR EACH ROW EXECUTE FUNCTION archive_fail();
 `);
 await assert.rejects(db.query('delete from audit_log'),/Archive unavailable/);assert.equal((await db.query('select count(*)::int n from audit_log')).rows[0].n,1);assert.equal((await db.query("select count(*)::int n from journal_entries where entry_no='VOID-ARCHIVE'")).rows[0].n,1);
 await db.exec('drop trigger archive_fail on record_deletions108; delete from audit_log');const archived=(await db.query('select record_data from record_deletions108')).rows[0].record_data;assert.equal(archived.entry.entry_no,'VOID-ARCHIVE');assert.equal(archived.lines[0].book_rate_lak,23000);assert.equal(archived.lines[0].base_debit,115000);assert.equal(archived.accounts[0].code,'1018');assert.equal((await db.query("select count(*)::int n from journal_entries where entry_no='VOID-ARCHIVE'")).rows[0].n,0);
 await db.exec("set fixture.admin='no'");await assert.rejects(db.query("select backup_export143106('2027-01-01','2027-12-31')"),/Administrator access/);
 console.log('PASS voided journal archive includes full entry, lines, rates and account snapshot; failed archiving rolls back deletion; archive export denies non-admin');
 }finally{await db.close()}})().catch(e=>{console.error(e.message,e.detail||'',e.where||'');process.exitCode=1});
