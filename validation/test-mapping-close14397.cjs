// Run with PGLITE_MODULE pointing to an installed @electric-sql/pglite.
// Isolated fixture only; never connects to Supabase or closes a real period.
const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const db=new PGlite();try{
 await db.exec(`
 CREATE FUNCTION require_admin136() RETURNS uuid LANGUAGE plpgsql AS $$ BEGIN
 IF current_setting('fixture.admin',true) IS DISTINCT FROM 'yes' THEN RAISE EXCEPTION 'Admin required'; END IF;
 RETURN '00000000-0000-4000-8000-000000000001'::uuid; END $$;
 CREATE TABLE accounts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),code text,name text,account_type text,currency_code text,parent_code text,is_active bool DEFAULT true,is_posting bool DEFAULT true,is_technical bool DEFAULT false,account_purpose text DEFAULT 'regular');
 CREATE TABLE accounting_periods(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),period_month date UNIQUE,status text,closed_at timestamptz,locked_at timestamptz,updated_by uuid,updated_at timestamptz);
 CREATE TABLE journal_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),entry_no text UNIQUE,transaction_date date,memo text,reference text,status text,source text,posted_by uuid,posted_at timestamptz,accounting_period_id uuid);
 CREATE TABLE journal_lines(id uuid DEFAULT gen_random_uuid(),journal_entry_id uuid,line_no integer,account_id uuid,currency_code text,debit numeric,credit numeric,line_date date,description text,base_debit numeric,base_credit numeric);
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
 INSERT INTO journal_lines(journal_entry_id,line_no,account_id,currency_code,debit,credit,line_date,base_debit,base_credit)
 SELECT e.id,v.n,a.id,a.currency_code,v.dr,v.cr,e.transaction_date,v.dr*CASE a.currency_code WHEN 'USD' THEN 22000 ELSE 1 END,v.cr*CASE a.currency_code WHEN 'USD' THEN 22000 ELSE 1 END
 FROM (VALUES ('SAMPLE-IN',1,'1018',100,0),('SAMPLE-IN',2,'9102',0,100),('SAMPLE-IN',3,'9190',2200000,0),('SAMPLE-IN',4,'4010',0,2200000),('SAMPLE-OUT',1,'5010',220000,0),('SAMPLE-OUT',2,'9290',0,220000),('SAMPLE-OUT',3,'9202',10,0),('SAMPLE-OUT',4,'1018',0,10)) v(entry,n,code,dr,cr)
 JOIN accounts a ON a.code=v.code JOIN journal_entries e ON e.entry_no=v.entry;
 `);
 await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261016103522_mapping_carry_forward14397.sql'),'utf8'));
 await assert.rejects(db.query('select year_preflight136(2026)'),/Admin required/);
 await db.exec("set fixture.admin='yes'");
 const pre=(await db.query('select year_preflight136(2026) result')).rows[0].result;assert.deepEqual(pre.blockers,[]);
 assert.equal(pre.balances.filter(b=>b.type==='SYSTEM').length,4);
 assert.equal(pre.balances.filter(b=>['REVENUE','EXPENSE'].includes(b.type)).length,2);
 await assert.rejects(db.query("select close_year136(2026,'CLOSE YEAR 2026','changed')"),/Balances changed/);
 const result=(await db.query("select close_year136(2026,'CLOSE YEAR 2026',$1) result",[pre.fingerprint])).rows[0].result;
 assert.equal(result.completed,true);assert.equal(result.closingEntries.length,1);
 assert.equal(result.balances.some(b=>['REVENUE','EXPENSE'].includes(b.type)),false);
 assert.equal(result.balances.filter(b=>b.type==='SYSTEM').length,4);
 const cash=result.balances.find(b=>b.code==='1018'),retained=result.balances.find(b=>b.code==='3110');
 assert.equal(cash.balance,90);assert.equal(cash.base_balance,1980000);assert.equal(cash.base_balance/cash.balance,22000);assert.equal(retained.balance,-1980000);assert.equal(retained.base_balance,-1980000);
 assert.equal((await db.query("select count(*)::int n from journal_lines l join accounts a on a.id=l.account_id join journal_entries e on e.id=l.journal_entry_id where e.source='system' and a.is_technical")).rows[0].n,0);
 assert.equal((await db.query("select count(*)::int n from accounting_periods where period_month<'2027-01-01' and status='locked'")).rows[0].n,12);
 assert.equal((await db.query('select count(*)::int n from accounting_operations136')).rows[0].n,0);
 await db.query("select close_year136(2026,'CLOSE YEAR 2026',$1)",[pre.fingerprint]);assert.equal((await db.query('select count(*)::int n from journal_entries')).rows[0].n,3);
 console.log('PASS isolated year close: LAK profit only, original-currency System carry, LAK carrying value/average, admin guard, stale fingerprint, locked months, idempotent close');
 }finally{await db.close()}})().catch(e=>{console.error(e);process.exitCode=1});
