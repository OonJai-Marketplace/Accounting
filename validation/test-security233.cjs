/* Apply the exact reviewed migration to isolated PostgreSQL, then run the
 * complete existing posting/payroll/staff/maintenance permission scenarios. */
const fs=require('node:fs'),assert=require('node:assert/strict');
const path=require('node:path'),root=path.resolve(__dirname,'..');
let source=fs.readFileSync(path.join(__dirname,'test-fresh-backend14322.cjs'),'utf8');
const marker="await check('Complete installer restores empty database in one transaction',()=>db.exec(file('setup/fresh/001-Install-Empty-Database.sql')));";
assert.equal(source.split(marker).length,2);
const extension=String.raw`
await check('Security233 restores current policy expressions before migration',async()=>{
 const fixture=JSON.parse(file('validation/security233-fixture.json'));
 await db.exec('CREATE TABLE public.hr_inbox_audit143168(id bigint,changed_by uuid); ALTER TABLE public.hr_inbox_audit143168 ENABLE ROW LEVEL SECURITY;');
 for(const f of fixture.functions)await db.exec(f.definition);
 for(const p of fixture.policies){
  const ident=s=>'"'+s.replaceAll('"','""')+'"';
  await db.exec('DROP POLICY IF EXISTS '+ident(p.policyname)+' ON public.'+ident(p.tablename));
  await db.exec('CREATE POLICY '+ident(p.policyname)+' ON public.'+ident(p.tablename)+' AS '+p.permissive+' FOR '+p.cmd+' TO '+p.roles.slice(1,-1)+(p.qual?' USING ('+p.qual+')':'')+(p.with_check?' WITH CHECK ('+p.with_check+')':''));
 }
});
await check('Security233 preserves policy semantics and all existing API grants',async()=>{
 const policies=()=>db.query("SELECT tablename,policyname,permissive,roles::text,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname").then(r=>r.rows);
 const privileges=()=>db.query("SELECT p.oid::regprocedure::text name,has_function_privilege('anon',p.oid,'EXECUTE') anon,has_function_privilege('authenticated',p.oid,'EXECUTE') auth FROM pg_proc p WHERE p.pronamespace='public'::regnamespace ORDER BY name").then(r=>r.rows);
 const before=await policies(),grants=await privileges();
 // Match the hosted project's current per-schema defaults in this empty engine.
 await db.exec('ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role; ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon,authenticated,service_role; ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role;');
 const migration=file('supabase/migrations/20261101151747_cleanup_security233.sql');await db.exec(migration);
 const after=await policies();
 const normalized=s=>s?.replace(/\( SELECT auth\.uid\(\) AS uid\)/gi,'auth.uid()');
 const expected=before.filter(p=>!(p.tablename==='payroll_runs'&&p.policyname==='admin_all_payroll_runs'));
 assert.equal(after.length,expected.length);
 for(let i=0;i<expected.length;i++){
  for(const key of ['tablename','policyname','permissive','roles','cmd'])assert.deepEqual(after[i][key],expected[i][key]);
  for(const key of ['qual','with_check'])assert.equal(normalized(after[i][key]),normalized(expected[i][key]),expected[i].tablename+'.'+expected[i].policyname+'.'+key);
 }
 assert.deepEqual(await privileges(),grants,'current endpoint grants must not change');
 await db.exec(migration);assert.deepEqual(await policies(),after,'migration must be idempotent');
 for(const name of ['handle_updated_at','schedule_next_date91','ojm_guard_postable_account_20260929']){
  const f=await one("SELECT proconfig,prosecdef FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=$1",[name]);assert.deepEqual(f.proconfig,['search_path=pg_catalog, pg_temp']);assert.equal(f.prosecdef,false);
 }
 assert.equal((await one("SELECT to_regclass('public.staff_journal_lines_entry233_idx') IS NOT NULL ok")).ok,true);
});
await check('Security233 future objects require explicit API grants; service access remains',async()=>{
 await db.exec('CREATE TABLE public.future_private233(id int); CREATE SEQUENCE public.future_sequence233; CREATE FUNCTION public.future_rpc233() RETURNS int LANGUAGE sql SECURITY DEFINER AS $$ SELECT 1 $$;');
 for(const role of ['anon','authenticated']){
  const r=await one("SELECT has_table_privilege($1,'public.future_private233','SELECT') t,has_function_privilege($1,'public.future_rpc233()','EXECUTE') f,has_sequence_privilege($1,'public.future_sequence233','USAGE') s",[role]);assert.deepEqual(r,{t:false,f:false,s:false});
 }
 assert.equal((await one("SELECT has_table_privilege('service_role','public.future_private233','SELECT') ok")).ok,true);
 await db.exec('SET ROLE authenticated;');await assert.rejects(db.query('SELECT future_rpc233()'),/permission denied/);await db.exec('RESET ROLE;');
 await db.exec('DROP FUNCTION public.future_rpc233(); DROP TABLE public.future_private233; DROP SEQUENCE public.future_sequence233;');
});
await check('Security233 schedule dates and invoker trigger reject hostile search paths',async()=>{
 assert.equal((await one("SELECT schedule_next_date91('2026-01-31','monthly','last_day',31,1)::text d")).d,'2026-02-28');
 assert.equal((await one("SELECT schedule_next_date91('2026-01-31','weekly','day',31,2)::text d")).d,'2026-02-14');
 await db.exec("BEGIN; CREATE SCHEMA hostile233; CREATE FUNCTION hostile233.now() RETURNS timestamptz LANGUAGE sql AS $$ SELECT '1900-01-01'::timestamptz $$; CREATE TEMP TABLE timestamp233(id int,updated_at timestamptz); CREATE TRIGGER timestamp233 BEFORE INSERT ON timestamp233 FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at(); SET LOCAL search_path=hostile233,public;");
 await db.exec('INSERT INTO timestamp233(id) VALUES(1)');assert.equal((await one("SELECT updated_at>'2026-01-01'::timestamptz ok FROM timestamp233")).ok,true);await db.exec('ROLLBACK;');
});
`;
source=source.replace(marker,()=>marker+'\n'+extension).replace("path.join(root,'validation/fresh-backend14322-results.json')","'/tmp/security233-fresh-backend-results.json'");
new Function('require','__dirname',source)(require,__dirname);
