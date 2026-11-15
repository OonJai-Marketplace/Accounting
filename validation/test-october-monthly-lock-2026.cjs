// Local PostgreSQL only. Synthetic periods, actors and journals exercise the lock
// transition, the unchanged year-end boundary and dated, account-specific checks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const original = read('setup/fresh/001-Install-Empty-Database.sql');
const chart = read('supabase/migrations/20261114225500_apply_reviewed_foreign_accounts.sql');
function definition(sql, name, delimiter) {
  const start = sql.toLowerCase().indexOf('function ' + name.toLowerCase() + '(');
  assert.notEqual(start, -1, name);
  const prefix = sql.lastIndexOf('\n', start) + 1;
  const body = sql.indexOf(delimiter,start);
  assert.notEqual(body,-1,name);
  const end = sql.indexOf(delimiter,body + delimiter.length);
  assert.notEqual(end, -1, name);
  return sql.slice(prefix, end + delimiter.length) + ';';
}

(async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create schema auth; create schema private;
      create role anon; create role authenticated; create role service_role;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('test.actor',true),'')::uuid $$;
      create function public.accounting_workspace_allowed123() returns boolean language sql as $$ select true $$;
      create function public.password_change_required14257() returns boolean language sql as $$ select false $$;
      create function public.has_user_permission(text) returns boolean language sql as $$ select true $$;
      create function public.can_action113(text,text) returns boolean language sql as $$ select true $$;
      create function public.schedule_admin91() returns boolean language sql as $$ select true $$;
      create function public.internal_operation136() returns boolean language sql as $$ select false $$;
      create table public.profiles(id uuid primary key,role text,status text);
      create table public.accounting_periods(id uuid primary key,period_month date unique,status text,
        closed_at timestamptz,locked_at timestamptz,updated_at timestamptz,updated_by uuid);
      create table public.year_closings136(year integer primary key);
      create table public.accounts(id uuid primary key,code text,is_active boolean,is_posting boolean,currency_code text);
      create table public.journal_entries(id uuid primary key,entry_no text,status text,transaction_date date,memo text);
      create table public.journal_lines(id uuid,account_id uuid,journal_entry_id uuid,line_no int,line_date date,
        debit numeric,credit numeric,base_debit numeric,base_credit numeric);
      create table public.book_sessions136(id uuid primary key,period_id uuid,owner_id uuid,status text,operations jsonb,original jsonb);
      create table public.scheduled_journal_occurrences(id uuid primary key,journal_entry_id uuid,reviewed_at timestamptz,reviewed_by uuid);
      create table public.audit_log(table_name text,record_id text,action text,old_data jsonb,new_data jsonb,reason text,actor_id uuid);
      create table private.fx_reclass_journals_2026(entry_no text primary key,entry_id uuid,period_month date,
        original_header jsonb,original_lines jsonb,proposed_lines jsonb,original_evidence jsonb);
      create table private.fx_reclass_receipts_2026(entry_no text,session_id uuid,actor_id uuid,applied_at timestamptz);
      create table private.reconciliation_periods305(month date primary key);
      create table private.test_reports(id text primary key,complete boolean);
      create function private.reconciliation_check305(date) returns jsonb language sql stable as $$
        select jsonb_build_object('complete',count(*)=8 and bool_and(complete),'items',jsonb_agg(
          jsonb_build_object('reportId',id,'complete',complete) order by id)) from private.test_reports $$;
      create function private.fx_reclass_fingerprints_2026(date,uuid) returns jsonb language sql stable as $$
        select jsonb_build_object('test',md5(coalesce(sum(debit-credit),0)::text)) from public.journal_lines $$;
      create function public.maintenance_preflight14324(date) returns jsonb language sql stable as $$
        select jsonb_build_object('reconciliation305',private.reconciliation_check305($1),'issues','[]'::jsonb,
           'fingerprint','fixture','decisions319','{}'::jsonb) $$;
      create function public.maintenance_finish14324(p_month date,p_kind text,p_fingerprint text,p_review jsonb,p_status text,p_session uuid)
      returns jsonb language plpgsql as $$
      begin
        update public.accounting_periods set status=p_status,updated_by=auth.uid(),updated_at=now(),closed_at=now() where period_month=p_month;
        return jsonb_build_object('month',p_month,'status',p_status);
      end $$;
    `);
    for (const table of ['private.journal_plans280','private.journal_plan_occurrences280','public.scheduled_journals',
        'public.recurring_transactions','public.staff_journals','public.staff_journal_lines','public.payroll_runs',
        'public.entry_submissions','public.period_findings','public.audit_reviews136','private.reconciliation_settings305',
        'private.reconciliation_records305','private.monthly_closing_decisions319']) {
      await db.exec('create table ' + table + '(id uuid)');
    }
    for (const name of ['public.require_admin136','public.book_snapshot136','public.ledger_boundary136','public.finish_book_session136']) {
      await db.exec(definition(original, name, '$function$'));
    }
    for (const name of ['private.fx_reclass_values_2026','private.fx_reclass_live_lines_2026','private.fx_reclass_verify_result_2026',
        'public.prepare_foreign_journal_month_2026','public.foreign_account_review_2026']) {
      await db.exec(definition(chart, name, '$$'));
    }
    await db.exec(read('supabase/migrations/20261115045915_restore_mistaken_october_monthly_lock.sql'));
    await db.exec(read('supabase/migrations/20261115050426_post_reviewed_october_and_november_rent.sql'));
    await db.exec(`
      create trigger ledger_boundary136 before update or delete on public.accounting_periods for each row execute function public.ledger_boundary136();
      create trigger ledger_boundary136 before update or delete on public.journal_entries for each row execute function public.ledger_boundary136();
      insert into public.profiles values
        ('00000000-0000-4000-8000-000000000001','admin','active'),
        ('00000000-0000-4000-8000-000000000002','admin','active'),
        ('00000000-0000-4000-8000-000000000003','staff','active');
      insert into public.accounting_periods values
        ('00000000-0000-4000-8000-000000000010','2026-10-01','locked','2026-11-09T09:56Z','2026-11-09T10:00Z',now(),
         '00000000-0000-4000-8000-000000000001'),
        (gen_random_uuid(),'2025-12-01','locked','2026-01-01','2026-01-01',now(),'00000000-0000-4000-8000-000000000001');
      insert into private.reconciliation_periods305 values('2026-10-01');
      insert into private.test_reports select 'test-'||g,true from generate_series(1,8) g;
      insert into public.journal_entries values(gen_random_uuid(),'TEST01','posted','2026-10-07','Source memo');
    `);
    const actor = async n => db.query("select set_config('test.actor',$1,false)", ['00000000-0000-4000-8000-00000000000' + n]);
    const call = () => db.query('select public.restore_october_monthly_close_2026() saved');
    await actor(1);
    await assert.rejects(db.exec("update public.accounting_periods set status='closed' where period_month='2026-10-01'"), /Locked periods are final/);
    await assert.rejects(db.exec("update public.journal_entries set memo='Other'"), /cannot be changed directly/);
    await db.exec('insert into public.year_closings136 values(2026)');
    await assert.rejects(call(), /not the original October monthly lock/);
    await db.exec('delete from public.year_closings136');
    await actor(2);
    await assert.rejects(call(), /not the original October monthly lock/);
    await actor(3);
    await assert.rejects(call(), /active administrator/);
    await actor(1);
    await db.exec("update private.test_reports set complete=false where id='test-1'");
    await assert.rejects(call(), /eight saved October reconciliations/);
    assert.equal((await db.query('select count(*) n from private.october_monthly_lock_release_2026')).rows[0].n, 0);
    await db.exec("update private.test_reports set complete=true");
    assert.equal((await call()).rows[0].saved.status, 'closed');
    assert.equal((await call()).rows[0].saved.alreadyRestored, true);
    const proof = (await db.query(`
      select p.closed_at=(r.previous_period->>'closed_at')::timestamptz as retained,
             p.locked_at is null as released
      from public.accounting_periods p join private.october_monthly_lock_release_2026 r on r.period_id=p.id
      where p.period_month='2026-10-01'`)).rows[0];
    assert.deepEqual(proof, {retained:true,released:true});
    assert.equal((await db.query("select count(*) n from public.audit_log where action='MONTHLY_LOCK_RELEASE'")).rows[0].n,1);
    await assert.rejects(db.exec("update public.accounting_periods set status='open' where period_month='2026-10-01'"),/correction session/);
    await assert.rejects(db.exec("update public.accounting_periods set status='closed' where period_month='2025-12-01'"), /Locked periods are final/);
    await assert.rejects(db.query("select public.post_approved_october_and_november_2026()"), /list of eight approved journals changed/);
    assert.equal((await db.query("select private.reviewed_chart_memo_2026('AMO26-000003','House rent. Former journal ID OJM260377.') m")).rows[0].m,'House rent.');
    assert.equal((await db.query("select private.reviewed_chart_memo_2026('TEST','House rent. Former journal ID OJM260377.') m")).rows[0].m,'House rent. Former journal ID OJM260377.');
    assert.equal((await db.query("select has_function_privilege('anon','public.restore_october_monthly_close_2026()','execute') ok")).rows[0].ok,false);
    assert.equal((await db.query("select has_table_privilege('authenticated','private.october_chart_posting_2026','insert') ok")).rows[0].ok,false);
    console.log('PASS historical monthly lock, annual finality, actor and genuine report checks, atomic failure, stable close date, private receipts and idempotency.');
  } finally { await db.close(); }
})().catch(error => { console.error(error.message, error.where||''); process.exitCode=1; });
