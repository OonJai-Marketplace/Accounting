const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');const fs=require('fs');const assert=require('node:assert/strict');
(async()=>{
const db=new PGlite();await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA private;CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.actor',true),'')::uuid $$;
CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT auth.uid()='00000000-0000-4000-8000-000000000001'::uuid $$;
CREATE FUNCTION public.active_account14228() RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
CREATE FUNCTION public.accounting_workspace_allowed123() RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
CREATE FUNCTION public.password_change_required14257() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
CREATE TABLE public.audit_log(id bigserial primary key,table_name text,record_id text,action text,old_data jsonb,new_data jsonb,reason text,actor_id uuid,created_at timestamptz default now());
CREATE TABLE public.workspace_actor_audit138(id uuid default gen_random_uuid() primary key,actor_id uuid,effective_user_id uuid,operation text,table_name text,row_id text,before_data jsonb,after_data jsonb,created_at timestamptz default now());
CREATE TABLE public.record_deletions108(id uuid default gen_random_uuid() primary key,table_name text,record_id uuid,record_data jsonb,deleted_at timestamptz default now(),deleted_by uuid);
CREATE TABLE public.accounting_periods(id uuid default gen_random_uuid() primary key,period_month date,status text,closed_at timestamptz,locked_at timestamptz);
CREATE TABLE public.book_sessions136(id uuid default gen_random_uuid() primary key,period_id uuid,created_at timestamptz,finished_at timestamptz,status text);
CREATE TABLE public.journal_entries(id uuid default gen_random_uuid() primary key,transaction_date date,status text);
SELECT set_config('request.actor','00000000-0000-4000-8000-000000000001',false);
INSERT INTO accounting_periods(period_month,status,closed_at) VALUES ('2026-11-01','open',null),('2026-10-01','closed','2026-11-01');
`);
await db.exec(fs.readFileSync(require('node:path').join(__dirname,'../supabase/migrations/20261118092603_audit_open_closed_policy.sql'),'utf8'));
await db.exec(fs.readFileSync(require('node:path').join(__dirname,'../supabase/migrations/20261118094600_audit_policy_helper_access.sql'),'utf8'));
assert.equal((await db.query("select has_function_privilege('authenticated','public.audit_code143324(text,text,jsonb,jsonb,text)','execute') allowed")).rows[0].allowed,false);
await db.exec(`CREATE TRIGGER keep_important_audit313 BEFORE INSERT OR UPDATE ON audit_log FOR EACH ROW EXECUTE FUNCTION private.keep_important_audit313();
CREATE TRIGGER protect_audit_delete143124 BEFORE DELETE ON audit_log FOR EACH ROW EXECUTE FUNCTION private.protect_audit_delete143124();
CREATE TRIGGER protect_audit_delete143124 BEFORE DELETE ON record_deletions108 FOR EACH ROW EXECUTE FUNCTION private.protect_audit_delete143124();
CREATE TRIGGER protect_audit_delete143124 BEFORE DELETE ON workspace_actor_audit138 FOR EACH ROW EXECUTE FUNCTION private.protect_audit_delete143124();`);
const classify=async(a,old,nw,closed)=>(await db.query(`select public.audit_classify469($1,'journal_entries',$2,$3,'test',$4) code`,[a,old,nw,closed])).rows[0].code;
const old={transaction_date:'2026-11-05',memo:'Original',lines:[{account_id:'cash',debit:100,credit:0},{account_id:'sale',debit:0,credit:100}]};
const amount={...old,lines:old.lines.map(l=>({...l,debit:l.debit*2,credit:l.credit*2}))};
const reclass={...old,lines:old.lines.map(l=>({...l,account_id:l.account_id==='sale'?'other':l.account_id}))};
for(const [action,nw,openCode,closedCode] of [['UPDATE',amount,'O1','R2'],['UPDATE',reclass,'O5','R8'],['UPDATE',{...old,memo:'Updated'},'O3','O3'],['UPDATE',{...old,transaction_date:'2026-11-10'},'O3','O3'],['UPDATE',{...old,lines:old.lines.map(l=>({...l,description:'Memo'}))},'O3','O3'],['DELETE',null,'O4','R1'],['VOID',null,'O4','R5']]){
 assert.equal(await classify(action,old,nw,false),openCode);assert.equal(await classify(action,old,nw,true),closedCode);
}
assert.equal(await classify('UPDATE',old,{...old,lines:[...old.lines].reverse()},true),'O3');
assert.equal(await classify('INSERT',null,old,false),null);
const swap={...old,lines:old.lines.map((l,i)=>({...l,account_id:old.lines[1-i].account_id}))};
assert.equal(await classify('UPDATE',old,swap,true),'R8');
assert.equal(await classify('UPDATE',old,swap,false),'O5');
assert.equal((await db.query("select audit_classify469('REOPEN_BOOK','accounting_periods',null,$1,'',true) code",[old])).rows[0].code,'O3');
assert.equal(await classify('UPDATE',{amount:100,fund_account_id:'cash'},{amount:100,fund_account_id:'bank'},true),'R8');
const insert=async(old,nw,action='UPDATE',record='fixture')=>(await db.query(`insert into audit_log(table_name,record_id,action,old_data,new_data,reason,actor_id) values ('journal_entries',$1,$2,$3,$4,'test',auth.uid()) returning *`,[record,action,old,nw])).rows[0];
const open=await insert(old,amount);assert.equal(open.book_closed469,false);
const closed=await insert({...old,transaction_date:'2026-10-05'},{...amount,transaction_date:'2026-10-05'});assert.equal(closed.book_closed469,true);
const note=await insert({...old,transaction_date:'2026-10-05'},{...old,transaction_date:'2026-10-05',memo:'A detail'});assert.equal(note.book_closed469,true);
await assert.rejects(db.query('delete from audit_log where id=$1',[closed.id]),/Red audit evidence/);
const preview=await db.query(`select audit_cleanup313('record',current_date,'audit_log',$1,false,null) r`,[String(open.id)]);assert.equal(preview.rows[0].r.count,1);
const cleared=await db.query(`select audit_cleanup313('record',current_date,'audit_log',$1,true,$2) r`,[String(open.id),preview.rows[0].r.expected]);assert.equal(cleared.rows[0].r.deleted,1);
assert.equal((await db.query(`select count(*)::int n from audit_log where action='AUDIT_LOG_CLEARED'`)).rows[0].n,1);
assert.equal((await db.query(`select count(*)::int n from audit_log where id=$1`,[closed.id])).rows[0].n,1);
await db.query(`delete from audit_log where id=$1`,[note.id]);
assert.equal((await db.query(`select count(*)::int n from audit_log where action='AUDIT_LOG_CLEARED'`)).rows[0].n,2);
await db.exec(`update accounting_periods set status='open' where period_month='2026-10-01';`);
const reopened=await insert({...old,transaction_date:'2026-10-05'},{...reclass,transaction_date:'2026-10-05'});assert.equal(reopened.book_closed469,true);
const page=(await db.query(`select audit_page143198() r`)).rows[0].r;assert.equal(page.counts.red,2);assert.equal(page.counts.orange,2);

// A later close must not change the severity of an earlier active-book edit.
const retained=await insert(old,amount,'UPDATE','retained');
await db.exec(`update accounting_periods set status='closed',closed_at=now() where period_month='2026-11-01'`);
assert.equal((await db.query('select book_closed469 from audit_log where id=$1',[retained.id])).rows[0].book_closed469,false);
// Updating caller-supplied classification cannot downgrade a retained red event.
await db.query('update audit_log set book_closed469=false where id=$1',[closed.id]);
assert.equal((await db.query('select book_closed469 from audit_log where id=$1',[closed.id])).rows[0].book_closed469,true);
// Deletion history participates in the same preview/confirmation flow.
await db.exec(`insert into accounting_periods(period_month,status) values ('2027-01-01','open')`);
const deletedRecord=(await db.query(`insert into record_deletions108(table_name,record_id,record_data) values ('journal_entries',gen_random_uuid(),'{"transaction_date":"2027-01-03"}') returning id`)).rows[0].id;
const dp=(await db.query(`select audit_cleanup313('record',current_date,'record_deletions108',$1,false,null) r`,[deletedRecord])).rows[0].r;
assert.equal(dp.count,1);
assert.equal((await db.query(`select audit_cleanup313('record',current_date,'record_deletions108',$1,true,$2) r`,[deletedRecord,dp.expected])).rows[0].r.deleted,1);
// Any change after preview invalidates that deletion confirmation.
const pending=(await db.query(`select audit_cleanup313('record',current_date,'audit_log',$1,false,null) r`,[String(retained.id)])).rows[0].r;
await db.query('update audit_log set reason=$2 where id=$1',[retained.id,'changed since preview']);
await assert.rejects(db.query(`select audit_cleanup313('record',current_date,'audit_log',$1,true,$2)`,[String(retained.id),pending.expected]),/list changed/);
// Simulate the legacy purge hook: audit-only clearing must suppress journal deletion.
await db.exec(`create function private.qa_legacy_purge() returns trigger language plpgsql as $$ begin if current_setting('app.audit_log_only313',true)='on' then return old;end if;delete from journal_entries where id::text=old.record_id;return old;end $$;create trigger qa_legacy_purge after delete on audit_log for each row execute function private.qa_legacy_purge();`);
const jid=(await db.query(`insert into journal_entries(transaction_date,status) values ('2027-01-03','voided') returning id`)).rows[0].id;
const voidLog=await insert({...old,transaction_date:'2027-01-03'},null,'VOID',jid);
await db.query('delete from audit_log where id=$1',[voidLog.id]);
assert.equal((await db.query('select count(*)::int n from journal_entries where id=$1',[jid])).rows[0].n,1);
await db.exec(`select set_config('request.actor','00000000-0000-4000-8000-000000000002',false)`);
await assert.rejects(db.query(`select audit_cleanup313('month')`),/Administrator access/);
console.log('PASS SQL migration, active/closed/reopened classification, reordering, memo/date edits, red retention, orange cleanup, deletion receipts, paging and administrator guards');await db.close();
})().catch(e=>{console.error(e);process.exitCode=1});
