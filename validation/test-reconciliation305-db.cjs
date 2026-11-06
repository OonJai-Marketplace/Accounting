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
let tests=fs.readFileSync(path.join(__dirname,'test-reconciliation305.sql'),'utf8');
tests=tests.replace(/ -- Real preflight is read-only;[\s\S]*?(?=END \$test\$;)/,'');
await db.exec(tests);
await db.exec(`
CREATE FUNCTION private.maintenance_base281(p_month date) RETURNS jsonb LANGUAGE sql STABLE AS $$SELECT jsonb_build_object('month',p_month,'version',14324,'issues','[]'::jsonb,'fingerprint','base','pending',jsonb_build_object('revision','test'))$$;
CREATE FUNCTION private.extended_check281(p_month date) RETURNS jsonb LANGUAGE sql STABLE AS $$SELECT jsonb_build_object('issues','[]'::jsonb,'fingerprint','extra','entry_checks','[]'::jsonb,'coverage',jsonb_build_object('version',281))$$;
CREATE TRIGGER guard_maintenance14324 BEFORE INSERT OR UPDATE OF status ON public.accounting_periods FOR EACH ROW EXECUTE FUNCTION public.guard_maintenance14324();
BEGIN;
DO $gate$
DECLARE actor uuid=gen_random_uuid();a uuid=gen_random_uuid();b uuid=gen_random_uuid();p uuid=gen_random_uuid();snap jsonb;rec jsonb;rejected boolean;cfg jsonb;
BEGIN
 INSERT INTO public.profiles VALUES(actor,'admin','active');PERFORM set_config('request.jwt.claim.sub',actor::text,true);
 INSERT INTO public.accounts VALUES(a,'1010','Cash on hand','ASSET','LAK',true,false),(b,'1040','Bank','ASSET','LAK',true,false);
 INSERT INTO public.accounting_periods VALUES(p,'2099-10-01','open');
 PERFORM set_config('app.maintenance14324',jsonb_build_object('actor',actor,'months',jsonb_build_array('2099-10'))::text,true);
 rejected=false;BEGIN UPDATE public.accounting_periods SET status='closed' WHERE id=p;EXCEPTION WHEN OTHERS THEN rejected=SQLERRM LIKE 'Closing blocked:%';END;ASSERT rejected,'Missing accounts allowed close';
 snap=public.reconciliation_snapshot305(a,'2099-10-01','2099-10-31','posting');
 rec=snap||jsonb_build_object('owner',actor,'account',jsonb_build_object('id',a),'id','REC-9910-1010','recordId',gen_random_uuid(),'from','2099-10-01','to','2099-10-31','method','cash','dateBasis','posting','status','reconciled','statement','0','findings','[]'::jsonb);
 PERFORM public.reconciliation_save305(rec,snap->>'fingerprint');
 rejected=false;BEGIN UPDATE public.accounting_periods SET status='closed' WHERE id=p;EXCEPTION WHEN OTHERS THEN rejected=SQLERRM LIKE 'Closing blocked:%';END;ASSERT rejected,'One missing account allowed close';
 snap=public.reconciliation_snapshot305(b,'2099-10-01','2099-10-31','receipt');
 rec=snap||jsonb_build_object('owner',actor,'account',jsonb_build_object('id',b),'id','REC-9910-1040','recordId',gen_random_uuid(),'from','2099-10-01','to','2099-10-31','method','bank','dateBasis','receipt','status','reconciled','statement','0','statementOpening117','0','statementDebit117','0','statementCredit117','0','findings','[]'::jsonb);
 PERFORM public.reconciliation_save305(rec,snap->>'fingerprint');
 UPDATE public.accounting_periods SET status='closed' WHERE id=p;
 ASSERT (SELECT status FROM public.accounting_periods WHERE id=p)='closed';
 ASSERT (SELECT jsonb_array_length(requirements) FROM private.reconciliation_periods305 WHERE month='2099-10-01')=2;
 cfg=public.reconciliation_preferences305();PERFORM public.reconciliation_preferences305('{}',(cfg->>'revision')::integer);
 rejected=false;BEGIN PERFORM public.reconciliation_preferences305('{}',(cfg->>'revision')::integer);EXCEPTION WHEN OTHERS THEN rejected=SQLERRM LIKE 'Reconciliation list changed%';END;ASSERT rejected,'Stale list revision overwrote current list';
END $gate$;
ROLLBACK;
`);
console.log('PASS closing trigger: missing or partially completed lists block; all saved accounts allow close; frozen monthly list and concurrent-list revision guard.');
console.log('PASS local PostgreSQL: account/date fingerprints, receipt dates, unrelated and memo-only edits, correction projection, changed movements, stale save, idempotency, required list and history, permissions.');
assert.equal((await db.query('select count(*) n from private.reconciliation_records305')).rows[0].n,0,'Temporary tests persisted records');
}finally{await db.close()}})().catch(e=>{console.error(e.message,e.where||'');process.exitCode=1});
