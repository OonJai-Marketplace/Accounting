/* Synthetic PostgreSQL checks for ID ownership, correction, receipt and rollback. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {PGlite} = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const migration = fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261111055606_journal_number_consistency.sql'),'utf8');
const section = (begin,end) => migration.slice(migration.indexOf(begin),end ? migration.indexOf(end,migration.indexOf(begin)) : undefined);
(async()=>{
 const db=new PGlite();
 try {
  await db.exec(`
   CREATE SCHEMA private; CREATE SCHEMA auth; CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT '00000000-0000-4000-8000-000000000001'::uuid$$;
   CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql AS $$SELECT true$$;
   CREATE FUNCTION public.can_action113(text,text) RETURNS boolean LANGUAGE sql AS $$SELECT true$$;
   CREATE TABLE journal_entries (id uuid primary key default gen_random_uuid(),entry_no text unique,status text default 'posted');
   CREATE TABLE journal_lines(id uuid default gen_random_uuid(),journal_entry_id uuid,line_no int,account_id uuid,debit numeric,credit numeric,currency_code text,description text,line_date date,fx_rate_lak numeric,book_rate_lak numeric);
   CREATE TABLE vouchers14299(id uuid primary key default gen_random_uuid(),journal_entry_id uuid,status text,data jsonb,version int,updated_at timestamptz);
   CREATE TABLE voucher_versions14299(voucher_id uuid,version int,data jsonb,reason text,changed_by uuid);
   CREATE TABLE audit_log(table_name text,record_id text,action text,old_data jsonb,new_data jsonb,reason text,actor_id uuid);
   CREATE TABLE operation_receipts14228(request_key text,actor_id uuid,result jsonb);
   CREATE TABLE entry_prefix_reservations(stem text primary key,owner_key text);
   CREATE TABLE private.reusable_journal_ids143120(entry_no text);
   CREATE FUNCTION private.reusable_journal_ids143120(text,date,int) RETURNS TABLE(number bigint, entry_no text) LANGUAGE sql AS $$ SELECT NULL::bigint,NULL::text WHERE false $$;
   CREATE TABLE private.journal_number_aliases298(former_no text primary key,entry_id uuid,replacement_no text unique,changed_by uuid);
   CREATE FUNCTION private.prepaid_release_lines298(jsonb) RETURNS boolean LANGUAGE sql AS $$ SELECT $1='[true]'::jsonb $$;
   INSERT INTO journal_entries(entry_no) VALUES ('OJM260376'),('AMO26-000003'),('AUTO260009'),('OJM260378');
   INSERT INTO private.journal_number_aliases298 SELECT 'OJM260377',id,entry_no,auth.uid() FROM journal_entries WHERE entry_no='AMO26-000003';
  `);
  await db.exec(section('CREATE TABLE private.journal_number_reviews335','DO $upgrade$'));
  await db.exec(section('CREATE FUNCTION private.finish_number_review335','DO $upgrade$'));
  await db.exec('CREATE TRIGGER aliases BEFORE INSERT OR UPDATE OF entry_no ON journal_entries FOR EACH ROW EXECUTE FUNCTION private.reserve_journal_alias298()');
  const scalar=async(sql,params=[])=>Object.values((await db.query(sql,params)).rows[0])[0];
  const next=(stem,family)=>scalar("SELECT entry_no FROM private.posting_number335($1,'2026-11-04',4,$2,false)",[stem,family]);
  const before=await next('OJM',''); assert.equal(before,'OJM260379');
  for(const [stem,family,wanted] of [['AUTO','','AUTO260010'],['OJM','payroll','PAY26-000001'],['OJM','staff','SUB26-000001'],['OJM','review','ADJ26-000001'],['OJM','amortization','AMO26-000004'],['OJM','recurring','REC26-000001']]){
   assert.equal(await next(stem,family),wanted);await db.query('INSERT INTO journal_entries(entry_no) VALUES ($1)',[wanted]);
   assert.equal(await next('OJM',''),before);
  }
  assert.equal(await scalar("SELECT private.next_plan_entry_no298('recurring','[true]','2026-11-04')"),'AMO26-000005');
  const id=await scalar("SELECT id FROM journal_entries WHERE entry_no='OJM260378'");
  await db.query("INSERT INTO journal_lines(journal_entry_id,line_no,debit,credit,currency_code,description) VALUES ($1,1,200000,0,'LAK','Fixture event'),($1,2,0,200000,'LAK','Fixture event')",[id]);
  const original=(await db.query('SELECT * FROM journal_lines ORDER BY line_no')).rows;
  const voucher=await scalar(`INSERT INTO vouchers14299(journal_entry_id,status,data,version) VALUES ($1,'linked','{"id_format":{"scheme":"shared245"},"journal":{"entry_no":"OJM260378"},"pdf":"fixture"}',3) RETURNING id`,[id]);
  await db.query(`INSERT INTO private.journal_number_reviews335(entry_id,from_no,to_no,voucher_id,line_hash)
   SELECT $1,'OJM260378','OJM260377',$2,md5(jsonb_agg(jsonb_build_array(l.id,l.line_no,l.account_id,l.debit,l.credit,l.currency_code,l.description,l.line_date,l.fx_rate_lak,l.book_rate_lak) ORDER BY l.line_no)::text) FROM journal_lines l`,[id,voucher]);
  await assert.rejects(db.query("INSERT INTO journal_entries(entry_no) VALUES ('OJM260377')"),/reserved/);
  await db.query("INSERT INTO journal_entries(entry_no) VALUES ('OJM260379')");
  for(let i=0;i<2;i++)assert.equal(await scalar("SELECT private.finish_number_review335($1,'Correct journal ID to OJM260377')",[id]),'OJM260377');
  assert.equal(await next('OJM',''),'OJM260378');assert.deepEqual((await db.query('SELECT * FROM journal_lines ORDER BY line_no')).rows,original);
  assert.deepEqual((await db.query("SELECT journal_entry_id,version,data->>'pdf' pdf,data#>>'{journal,entry_no}' journal FROM vouchers14299")).rows[0],{journal_entry_id:id,version:4,pdf:'fixture',journal:'OJM260377'});
  assert.equal(await scalar('SELECT count(*)::int FROM voucher_versions14299'),1);
  await db.exec(`CREATE FUNCTION private.post_batch335(text,text,jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
   DECLARE receipt jsonb;no text;entry uuid;BEGIN SELECT result INTO receipt FROM operation_receipts14228 WHERE request_key=$2;
   IF FOUND THEN RETURN receipt;END IF;SELECT n.entry_no INTO no FROM private.posting_number335('OJM','2026-11-04',4,'',true) n;
   INSERT INTO journal_entries(entry_no) VALUES(no) RETURNING id INTO entry;receipt:=jsonb_build_array(jsonb_build_object('entry_no',no,'entry_id',entry));
   INSERT INTO operation_receipts14228 VALUES($2,auth.uid(),receipt);RETURN receipt; END $$;
   CREATE FUNCTION voucher_link14299(uuid,uuid) RETURNS void LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Document already linked';END $$;`);
  await db.exec(section('CREATE FUNCTION public.post_device_journal335'));
  await assert.rejects(db.query(`SELECT post_device_journal335('same-request','[{}]','["OJM260377"]')`),/Device ID/);
  await assert.rejects(db.query(`SELECT post_device_journal335('same-request','[{}]','["OJM260378"]',$1)`,[voucher]),/Document already linked/);
  assert.equal(await next('OJM',''),'OJM260378');
  const post=()=>scalar(`SELECT post_device_journal335('same-request','[{}]','["OJM260378"]')`);
  const receipt=await post();assert.deepEqual(await post(),receipt);assert.equal(await next('OJM',''),'OJM260380');
  console.log('PASS isolated families, protected 0377, in-place receipt correction, retry and collision/voucher rollback');
 }finally{await db.close();}
})().catch(e=>{console.error(e.message,e.detail||'');process.exitCode=1});
