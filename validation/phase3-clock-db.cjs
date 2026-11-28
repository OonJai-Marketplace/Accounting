// Run on a disposable local PostgreSQL cluster with node-postgres installed.
// PGHOST=127.0.0.1 PGPORT=... PGUSER=... node validation/phase3-clock-db.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, randomBytes } = require('node:crypto');
const { Pool } = require('pg');

const bucket = 'hr-attendance-selfies';
const migrations = ['20261127011452_employee_hr_accounts.sql', '20261127133000_employee_hr_portal.sql', '20261127180000_employee_hr_clock.sql'];
async function installFixture(db, realStorage=false) {
  for (const role of ['anon','authenticated','service_role']) {
    if (!(await db.query('select 1 from pg_roles where rolname=$1',[role])).rowCount) {
      await db.query('create role '+role+(role==='service_role'?' bypassrls':''));
    }
  }
  await db.query(`
    create schema if not exists auth;
    create or replace function auth.uid() returns uuid language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
    create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    create table auth.sessions(id uuid primary key,user_id uuid not null);
    create table profiles(id uuid primary key,role text,status text,full_name text);
    create function public.accounting_workspace_allowed123() returns boolean language sql stable as $$ select true $$;
    create function public.password_change_required14257() returns boolean language sql stable as $$ select false $$;
    create table public.payroll_employees(id uuid primary key,data jsonb not null,updated_by uuid);
    create table public.payroll_runs(id uuid primary key,period_start date,data jsonb not null);
    create table public.payroll_leave_records(id uuid primary key,data jsonb not null);
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant all on all tables in schema public,auth to service_role;`);
  if (!realStorage) {
    await db.query(`
      create schema storage;
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text not null,name text not null,metadata jsonb,unique(bucket_id,name));
      create table storage.buckets(id text primary key,name text not null,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      alter table storage.objects enable row level security;
      grant usage on schema storage to anon,authenticated,service_role;
      grant all on all tables in schema storage to anon,authenticated,service_role;`);
  }
  await db.query('create policy existing_broad_access on storage.objects for all to anon,authenticated using(true) with check(true)');
  for (const file of migrations) await db.query(fs.readFileSync(path.join(__dirname,'../supabase/migrations',file),'utf8'));
}
async function run(db) {
  const scalar = async (query,params=[]) => (await db.query(query,params)).rows[0]?.v;
  async function role(name,fn) {
    const c=await db.connect();
    try {
      await c.query('begin');
      await c.query('set local role '+name);
      const result=await fn(c);await c.query('commit');return result;
    } catch(e) { await c.query('rollback');throw e; } finally { c.release(); }
  }
  async function employee(name) {
    const id=randomUUID(), digest=randomBytes(32).toString('hex');
    await db.query('insert into payroll_employees values($1,$2,null)',[id,{name,code:name,employmentStatus:'active'}]);
    await db.query("insert into employee_hr.accounts values($1,$2,repeat('0',32)||':'||repeat('0',128),'enabled',1)",[id,id+'@example.test']);
    await db.query("select public.employee_hr_session('issue',$1,$2,1)",[digest,id]);return {id,digest};
  }
  const rpc=(who,action,data={})=>role('service_role',async c=>(await c.query('select public.employee_hr_clock($1,$2,$3) v',[who.digest,action,data])).rows[0].v);
  const begin=(who,type='clock-in')=>rpc(who,'clockBegin',{submission:randomUUID(),type});
  const evidence={lat:79,lon:-119,accuracy:22000,acquired:'2013-01-01T20:00:00Z',format:'image/webp',bytes:20000,sha256:'a'.repeat(64)};
  const prepare=(who,intent,extra={})=>rpc(who,'clockPrepare',{submission:intent.submission,eventId:intent.eventId,evidence:{...evidence,...extra}});
  const store=(path,metadata={size:evidence.bytes,mimetype:evidence.format})=>role('service_role',c=>c.query('insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)',[bucket,path,metadata]));
  const alice=await employee('Alice'), bob=await employee('Bob');
  const manual={status:'finalized',results:[{employeeId:alice.id,attendance95:[{date:'2020-02-01',mark:'manual'}]}]};
  await db.query("insert into payroll_runs values(gen_random_uuid(),'2020-02-01',$1)",[manual]);
  assert.deepEqual(await scalar('select allowed_mime_types as v from storage.buckets where id=$1 and not public and file_size_limit=98304',[bucket]),['image/webp','image/jpeg']);
  assert.equal((await rpc(alice,'today')).status,'Not yet clocked in');
  await assert.rejects(begin(alice,'clock-out'),/Attendance status changed/);
  const start=await begin(alice);
  await assert.rejects(prepare(bob,start),/Capture expired/);
  for (const invalid of [{lat:null},{lon:200},{accuracy:-1},{bytes:98305}]) await assert.rejects(prepare(alice,start,invalid),/Invalid attendance evidence/);
  assert.deepEqual(await rpc(alice,'clockReceipt',start),{registered:false});
  console.log('PASS Clock eligibility, employee association, mandatory fields, bucket settings');
  const file=await prepare(alice,start);
  await assert.rejects(prepare(alice,start,{lat:78}),/Evidence changed/);
  const probe=await db.connect();
  try {
    await probe.query('begin');
    await probe.query('insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)',[bucket,file.path,{mimetype:'image/webp'}]);
    assert.equal(await scalar('select count(*)::int v from employee_hr.clock_events'),0);
    await probe.query('rollback');
  } finally {probe.release();}
  await assert.rejects(store(file.path,{size:999,mimetype:'image/webp'}),/metadata does not match/);
  assert.equal(await scalar('select count(*)::int v from storage.objects'),0);
  assert.deepEqual(await rpc(alice,'clockReceipt',start),{registered:false});
  await store(file.path);
  const receipt=await rpc(alice,'clockReceipt',start);
  assert.equal(receipt.status,'Currently clocked in');assert.equal(receipt.name,'Alice');assert.equal(receipt.eventId,start.eventId);
  const record=await scalar(`select to_jsonb(e)||jsonb_build_object('expiresCorrectly',
   expires_at=(((official_at at time zone 'Asia/Vientiane')+interval '12 months') at time zone 'Asia/Vientiane'),
   'current',abs(extract(epoch from clock_timestamp()-official_at))<30) v from employee_hr.clock_events e where submission=$1`,[start.submission]);
  assert(record.expiresCorrectly&&record.current);assert.equal(record.retention_hold,false);assert.equal(record.deleted_at,null);
  assert.equal(record.accuracy_metres,22000);assert.equal(record.longitude,-119);assert.equal(record.width,480);
  assert.equal(record.image_path,file.path);assert.equal(record.location_status,'available');assert.equal(new Date(record.acquired_at).getUTCFullYear(),2013);
  assert.deepEqual(await rpc(alice,'clockBegin',start),receipt);assert.deepEqual(await rpc(alice,'clockPrepare',start),receipt);
  assert.deepEqual(await rpc(bob,'clockReceipt',start),{registered:false});assert.deepEqual(await rpc(bob,'month',{month:start.date}),[]);
  console.log('PASS Rollback, retry, immutable receipt, poor/off-site GPS, server time and twelve calendar months');
  for (const r of ['anon','authenticated']) {
    await assert.rejects(role(r,c=>c.query("select public.employee_hr_clock('bad','today','{}')")),/permission denied/);
    await assert.rejects(role(r,c=>c.query('select * from employee_hr.clock_events')),/permission denied/);
    for(const q of ['select * from storage.objects where bucket_id=$1','update storage.objects set name=name where bucket_id=$1','delete from storage.objects where bucket_id=$1']) {
      assert.equal(await role(r,async c=>(await c.query(q,[bucket])).rowCount),0);
    }
    await assert.rejects(role(r,c=>c.query('insert into storage.objects(bucket_id,name) values($1,$2)',[bucket,'arbitrary'])),/row-level security/);
    await assert.rejects(role(r,c=>c.query('select public.hr_clock_photo_path($1,$2,$3)',[randomUUID(),randomUUID(),start.eventId])),/permission denied/);
  }
  const actor=randomUUID(),sid=randomUUID();
  await db.query("insert into profiles values($1,'admin','active','Admin')",[actor]);
  await db.query('insert into auth.sessions values($1,$2)',[sid,actor]);
  const adminRows=await role('authenticated',async c=>{
    await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({session_id:sid,sub:actor})]);
    return (await c.query('select public.hr_clock_registers($1) as v',[start.date])).rows[0].v;
  });
  assert.equal(adminRows[0].employeeId,alice.id);
  const photo=(session)=>role('service_role',async c=>(await c.query('select public.hr_clock_photo_path($1,$2,$3) v',[actor,session,start.eventId])).rows[0].v);
  assert.equal(await photo(sid),file.path);
  await assert.rejects(photo(randomUUID()),/administrator required/i);
  await assert.rejects(role('authenticated',c=>c.query('select public.hr_clock_registers($1)',[start.date])),/administrator required/i);
  console.log('PASS Deny anonymous/employee read, overwrite and delete; authenticated HR administrator read');
  const end=await begin(alice,'clock-out');await store((await prepare(alice,end)).path);
  const result=await rpc(alice,'clockReceipt',end);assert.equal(result.clockIn,receipt.clockIn);
  assert.equal(result.status,'Clocked out');assert(result.durationSeconds>=0);
  assert.equal(await scalar('select clock_in_id as v from employee_hr.clock_events where event_id=$1',[end.eventId]),start.eventId);
  assert.equal((await rpc(alice,'month',{month:start.date}))[0].clockOut,result.clockOut);
  assert.deepEqual(await scalar('select data as v from payroll_runs'),manual);
  const second={...bob,digest:randomBytes(32).toString('hex')};
  await db.query("select public.employee_hr_session('issue',$1,$2,1)",[second.digest,second.id]);
  const simultaneous=await Promise.all([begin(bob),begin(second)]);
  const prepared=await Promise.all([prepare(bob,simultaneous[0]),prepare(second,simultaneous[1])]);
  const writes=await Promise.allSettled(prepared.map(p=>store(p.path)));
  assert.equal(writes.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(await scalar('select count(*)::int v from employee_hr.clock_events where employee_id=$1',[bob.id]),1);
  assert.equal(await scalar('select count(*)::int v from storage.objects where name=any($1)',[prepared.map(p=>p.path)]),1);
  console.log('PASS Clock Out pairing, elapsed duration, historic payroll, concurrent devices');
  await db.query("update employee_hr.clock_events set work_date=work_date-1,official_at=official_at-interval '1 day' where employee_id=$1",[bob.id]);
  assert((await rpc(bob,'today')).incompleteDate);
  const cancelled=await begin(bob), abandoned=await prepare(bob,cancelled);
  await rpc(bob,'clockCancel',cancelled);await assert.rejects(store(abandoned.path),/Unreserved attendance image/);
  const expired=await begin(bob), stale=await prepare(bob,expired);
  await db.query("update employee_hr.clock_intents set issued_at=issued_at-interval '10 minutes' where submission=$1",[expired.submission]);
  await assert.rejects(store(stale.path),/Capture expired/);
  const revoked=await begin(bob), denied=await prepare(bob,revoked);
  await db.query("update employee_hr.accounts set access='suspended' where employee_id=$1",[bob.id]);
  assert.equal(await rpc(bob,'today'),null);await assert.rejects(store(denied.path),/HR access ended/);
  await db.query("update employee_hr.accounts set access='enabled' where employee_id=$1",[bob.id]);
  await db.query("update public.payroll_employees set data=data||'{\"employmentStatus\":\"terminated\"}' where id=$1",[bob.id]);
  assert.equal(await rpc(bob,'today'),null);await assert.rejects(store(denied.path),/Unreserved attendance image/);
  assert.equal(await scalar('select count(*)::int v from storage.objects s left join employee_hr.clock_events e on e.image_path=s.name where e.event_id is null'),0);
  console.log('PASS Incomplete previous day, cancellation, stale capture, suspension, termination and zero orphan metadata rows');
}
async function main() {
  assert(['127.0.0.1','::1'].includes(process.env.PGHOST),'Disposable loopback database required');
  const database='clock_qa_'+randomBytes(6).toString('hex');
  const admin=new Pool({database:'postgres'}), db=new Pool({database});
  try {await admin.query('create database '+database);await installFixture(db);await run(db);}
  finally {await db.end();await admin.query('drop database if exists '+database);await admin.end();}
}
module.exports={installFixture};
if (require.main===module) main().catch(error=>{console.error(error);process.exitCode=1;});
