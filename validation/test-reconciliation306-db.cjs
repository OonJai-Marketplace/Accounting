// Local PostgreSQL/WASM only. All accounts, journals and reports are synthetic.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
(async()=>{const db=new PGlite();try{
await db.exec(`CREATE SCHEMA private;CREATE SCHEMA auth;CREATE ROLE anon;CREATE ROLE authenticated;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
CREATE FUNCTION public.accounting_workspace_allowed123() RETURNS boolean LANGUAGE sql STABLE AS $$SELECT true$$;
CREATE TABLE public.profiles(id uuid PRIMARY KEY,role text,status text);
CREATE TABLE public.accounts(id uuid PRIMARY KEY,code text,name text,account_type text,currency_code text,is_posting boolean,is_technical boolean);
CREATE TABLE public.journal_entries(id uuid PRIMARY KEY,entry_no text,transaction_date date,memo text,reference text,status text);
CREATE TABLE public.journal_lines(id uuid PRIMARY KEY,journal_entry_id uuid,account_id uuid,currency_code text,debit numeric,credit numeric,line_date date,description text);
CREATE TABLE public.accounting_periods(id uuid PRIMARY KEY,period_month date,status text);
CREATE TABLE public.book_sessions136(id uuid PRIMARY KEY,period_id uuid,owner_id uuid,status text,operations jsonb,created_at timestamptz);
`);
await db.exec(fs.readFileSync(path.join(__dirname,'../setup/INSTALL-RECONCILIATION-v143.305.sql'),'utf8'));
await db.exec(fs.readFileSync(path.join(__dirname,'../setup/INSTALL-RECONCILIATION-v143.306.sql'),'utf8'));
await db.exec(fs.readFileSync(path.join(__dirname,'test-reconciliation306.sql'),'utf8'));
console.log('PASS open-book workspace, completed accounts per month, duplicate prevention, same-record edits, edit audit, stale edits, retry, closed/locked restrictions and private permissions.');
}finally{await db.close()}})().catch(e=>{console.error(e.message,e.where||'');process.exitCode=1});
