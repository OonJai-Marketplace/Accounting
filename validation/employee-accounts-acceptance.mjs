// Adapter inputs belong to a disposable local database and two independent
// Supabase Auth instances. Never seed employees or change credentials in production.
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {employeeSession} from '../src/hr/employees/employee-session.js';

export async function verify({sql,endpoint,accounting,pos,accountingAdmin,posAdmin}) {
  assert.equal(new URL(endpoint).hostname,'127.0.0.1');
  const unique=randomUUID(),mail=k=>k+'-'+unique+'@example.test',password=()=>randomBytes(24).toString('hex');
  const email=mail('shared'),ap=password(),pp=password(),old='abcdefgh',fresh='12345678',adminEmail=mail('admin'),adminPw=password();
  const pass=m=>console.log('PASS '+m);
  async function create(auth,email,password){const result=await auth.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(result.error);return result.data.user.id;}
  async function sign(client,email,password){return client().auth.signInWithPassword({email,password});}
  const actor=await create(accountingAdmin,adminEmail,adminPw),staff=await create(accountingAdmin,email,ap);await create(posAdmin,email,pp);
  await sql`insert into profiles values(${actor},${adminEmail},'QA Admin','admin','active'),(${staff},${email},'QA User','submitter','active')`;
  const get=async(c,e,p)=>{const result=await sign(c,e,p);assert.ifError(result.error);return result.data.session.access_token;};
  const token=await get(accounting,adminEmail,adminPw),staffToken=await get(accounting,email,ap);
  const emp=randomUUID(),second=randomUUID(),profile={code:'QA1',name:'QA One',position:'Tester',active:true};
  await sql`insert into payroll_employees values(${emp},${sql.json(profile)},${actor}),(${second},${sql.json({...profile,code:'QA2',name:'QA Two'})},${actor})`;
  async function req(b,t,status=200) {
    const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(t?{authorization:'Bearer '+t}:{})},body:JSON.stringify(b)});
    const d=await r.json();assert.equal(r.status,status,b.action+' '+(d?.error||''));assert.equal(r.headers.get('cache-control'),'no-store');return d;
  }
  const list=()=>req({action:'list'},token),row=async(id=emp)=>(await list()).find(r=>r.id===id);
  async function save(fields,id=emp,status=200,revision){const r=await row(id);return req({action:'save',id,email:r.email||email,access:r.access||'enabled',revision:revision??r.revision,...fields},token,status);}
  const login=(p,e=email,code=200,prior)=>req({action:'login',email:e,password:p},prior,code), me=(t,code=200)=>req({action:'me'},t,code);
  await req({action:'list'},null,403);await req({action:'save',id:emp},staffToken,403);
  assert.ok((await accounting().rpc('employee_hr_admin',{p_actor:actor,p_sid:randomUUID(),p_action:'list'})).error);
  pass('Anonymous and sub-user management and public data RPC access denied');
  await save({password:old.slice(1)},emp,400);
  await save({password:old});const a=await login(old);
  assert.equal((await me(a.token)).id,emp);assert.ok((await row()).revision);assert.equal((await row()).email,email);
  pass('Account links to the existing employee, manual password signs in directly');
  await req({action:'list'},a.token,403);await req({action:'register'},null,400);await req({action:'reset'},a.token,400);
  pass('HR session has no administration, public signup or self-reset');
  const previous=(await row()).revision;await save({password:fresh});await save({access:'disabled'},emp,409,previous);
  const [stale]=await sql`select public.employee_hr_session('issue',repeat('a',64),${emp}::uuid,${previous}::bigint) s`;assert.equal(stale.s,null);
  await login(old,email,401);await me(a.token,401);const b=await login(fresh);assert.equal((await me(b.token)).id,emp);
  pass('Reset rejects old password, issued session, stale save and concurrent sign-in challenge');
  for(const [app,pwd] of [[accounting,ap],[pos,pp]]){
    assert.ok((await sign(app,email,fresh)).error);assert.ok((await app().auth.getUser(b.token)).error);await get(app,email,pwd);
  } pass('Independent Accounting and POS identities with the same email keep their original passwords and reject HR credentials');
  await save({access:'suspended'});await login(fresh,email,401);await me(b.token,401);await save({access:'enabled'});await me(b.token,401);
  pass('Suspend and reactivate without resurrecting a session');
  const set=async(d)=>sql`update payroll_employees set data=${sql.json({...profile,...d})} where id=${emp}`;
  for(const s of ['probationary','on_leave','active']){await set({employmentStatus:s});await login(fresh);}
  const live=await login(fresh);await set({active:false,archived:true,archiveReason14306:{code:'terminated'}});await me(live.token,401);await login(fresh,email,401);
  await set({});await me(live.token,401);await set({employmentStatus:'inactive'});await login(fresh,email,401);await set({employmentStatus:'suspended'});await login(fresh,email,401);
  pass('Employment checks cover active, probation, leave, suspension, inactive and existing archive/termination');
  await set({employmentStatus:'resigned',separationDate:'2099-01-01'});const future=await login(fresh);
  await set({employmentStatus:'resigned',separationDate:'2020-01-01'});await me(future.token,401);await login(fresh,email,401);
  pass('Future resignation and effective separation enforced on the server');
  const renamed=mail('changed');await save({email:renamed});await set({});const active=await login(fresh,renamed);
  await save({access:'disabled'});await me(active.token,401);await login(fresh,renamed,401);await save({access:'enabled'});
  pass('Email change and access disable/enable');
  const other=mail('other'),pw=password();await save({email:other,password:pw},second);await save({email:other},emp,409);
  const t=await login(fresh,renamed),u=await login(pw,other,200,t.token);
  assert.equal((await me(u.token)).id,second);await me(t.token,401);await req({action:'logout'},u.token);await me(u.token,401);
  pass('Shared-device switch and logout revoke the previous session');
  let visible='previous employee', unblock,readStarted;
  const reached=new Promise(r=>readStarted=r),delay=new Promise(r=>unblock=r);
  const portal=employeeSession(endpoint,()=>{visible='';},async(url,options)=>{
    const r=await fetch(url,options);
    if(JSON.parse(options.body).action==='me'&&visible==='delay'){readStarted();await delay;}
    return r;
  });
  await portal.signIn(renamed,fresh);visible='delay';
  const pending=portal.currentEmployee().then(()=>false,()=>true);await reached;
  const changed=portal.signIn(other,pw);assert.equal(visible,'');await changed;unblock();assert.ok(await pending);
  assert.equal((await portal.currentEmployee()).id,second);await portal.signOut();await assert.rejects(portal.currentEmployee());
  pass('Shared-device client clears private views synchronously and discards an in-flight previous employee response');
  const logs=await req({action:'history',id:emp},token);
  for(const action of ['password_assigned','account_created','password_reset','account_suspended','account_reactivated','access_revoked','employment_access_revoked','email_changed'])
    assert.ok(logs.some(h=>h.action===action&&h.administrator===actor&&h.at),action);
  const [{password_hash:hash}]=await sql`select password_hash from employee_hr.accounts where employee_id=${emp}`;
  assert.match(hash,/^[a-f0-9]{32}:[a-f0-9]{128}$/);const payload=JSON.stringify([logs,await list(),hash]);for(const v of [old,fresh,pp,ap])assert.ok(!payload.includes(v));
  assert.deepEqual((await sql`select data from payroll_employees where id=${emp}`)[0].data,profile);
  assert.equal(Number((await sql`select count(*) n from auth.users`)[0].n),2);
  pass('Audit records, salted hashes and original employee records verified');
  for(let i=0;i<16;i++)await login('invalid',mail('unknown'),i===15?429:401);
  pass('Repeated unknown-account attempts are rate limited');
}
