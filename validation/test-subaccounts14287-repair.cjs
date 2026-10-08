const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const sql = fs.readFileSync(path.join(__dirname, '../setup/INSTALL-SUBACCOUNT-POSTING-REPAIR-v142.87.sql'), 'utf8');
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const admin = id(1), staff = id(2);
const usd = ['1041','1220','1221','1222','1223','2212','2213','2410','3020','3030','3111','4111','4131','5112','5310','5314','5415','9011','9021','9033','9042'];
const thb = ['1224','3112','4112','4132','9012','9032','9052'];
const groups = ['1050','3020','3040'];
const codes = [...new Set([...usd,...thb,...groups,'4014','1010','1011','1012'])];
const fixture = codes.map((code,i) => ({code, id:id(100+i), sub:id(200+i), currency:usd.includes(code)?'USD':thb.includes(code)?'THB':code==='1011'?'USD':code==='1012'?'THB':'LAK', posting:!groups.includes(code)}));
async function createDb() {
 const db = new PGlite();
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('app.actor',true),'')::uuid $$;
 CREATE TABLE profiles(id uuid PRIMARY KEY,role text,status text);
 CREATE TABLE currencies(code text PRIMARY KEY,is_active boolean);
 CREATE TABLE accounts(id uuid PRIMARY KEY,code text UNIQUE,name text,currency_code text REFERENCES currencies,account_type text,description text,account_purpose text,is_posting boolean,is_active boolean,parent_code text,created_by uuid REFERENCES profiles);
 CREATE TABLE sub_accounts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),parent_account_id uuid REFERENCES accounts,code text UNIQUE,name text,currency_code text REFERENCES currencies,description text,is_active boolean DEFAULT true);
 CREATE TABLE journal_lines(id uuid PRIMARY KEY,account_id uuid REFERENCES accounts,debit numeric,credit numeric);
 INSERT INTO profiles VALUES('${admin}','admin','active'),('${staff}','submitter','active');
 INSERT INTO currencies VALUES('LAK',true),('USD',true),('THB',true);
 INSERT INTO accounts VALUES('${id(10)}','ROOT','Root group','LAK','ASSET','','regular',false,true,NULL,'${admin}');`);
 for(const r of fixture) {
  const name = r.code==='4014'?'Sales – Xonpao':'Account '+r.code;
  await db.query(`INSERT INTO accounts VALUES($1,$2,$3,$4,'ASSET','','regular',$5,true,'ROOT',$6)`,[r.id,r.code,name,r.currency,r.posting,admin]);
  await db.query(`INSERT INTO sub_accounts VALUES($1,$2,$3,$4,$5,'',true)`,[r.sub,id(10),r.code,r.code==='4014'?'Sales – Sonpao':name,usd.includes(r.code)||thb.includes(r.code)?'LAK':r.currency]);
  if(r.posting) await db.query('INSERT INTO journal_lines VALUES($1,$2,123,0)',[id(500+Number(r.code)),r.id]);
 }
 await db.query(`INSERT INTO sub_accounts VALUES($1,$2,'1013','Wellness Cash LAK','LAK','New sub-account',true)`,[id(300),id(10)]);
 await db.query(`INSERT INTO sub_accounts VALUES($1,$2,'1014','Wellness Cash USD','USD','New sub-account',true)`,[id(301),id(10)]);
 await db.query(`INSERT INTO sub_accounts VALUES($1,$2,'1015','Wellness Cash THB','THB','New sub-account',true)`,[id(302),id(10)]);
 await db.query(`INSERT INTO accounts VALUES($1,'1051','Grouped child','LAK','ASSET','','regular',true,true,'1050',$2)`,[id(400),admin]);
 await db.exec(`CREATE FUNCTION guard_actions113() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin' AND status='active') THEN RAISE EXCEPTION 'Active accounting access required'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END $$;
 CREATE TRIGGER account_access BEFORE INSERT OR UPDATE OR DELETE ON accounts FOR EACH ROW EXECUTE FUNCTION guard_actions113();
 CREATE TRIGGER sub_access BEFORE INSERT OR UPDATE OR DELETE ON sub_accounts FOR EACH ROW EXECUTE FUNCTION guard_actions113();
 ALTER TABLE sub_accounts ENABLE ALWAYS TRIGGER sub_access;
 GRANT SELECT,INSERT,UPDATE,DELETE ON sub_accounts TO authenticated;`);
 return db;
}
const state = async db => (await db.query(`SELECT c.relname,t.tgname,t.tgenabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE t.tgfoid='guard_actions113()'::regprocedure ORDER BY c.relname,t.tgname`)).rows;
const snapshot = async db => ({accounts:(await db.query('SELECT * FROM accounts ORDER BY code')).rows, journals:(await db.query('SELECT * FROM journal_lines ORDER BY id')).rows, subs:(await db.query('SELECT * FROM sub_accounts ORDER BY code')).rows});
(async()=>{
 let db = await createDb();
 const before = await snapshot(db), guards = await state(db);
 await assert.rejects(db.query(`INSERT INTO accounts(id,code) VALUES($1,'Blocked')`,[id(999)]),/Active accounting access/);
 await db.exec(sql);
 assert.deepEqual(await state(db),guards);
 const after = await snapshot(db);
 for(const a of before.accounts) assert.deepEqual(after.accounts.find(x=>x.id===a.id),a);
 assert.deepEqual(after.journals,before.journals);
 for(const r of fixture) {
  const sub=after.subs.find(s=>s.code===r.code);
  assert.equal(sub.posting_account_id14285,r.id);
  assert.equal(sub.currency_code,r.currency);
  assert.equal(sub.name,after.accounts.find(a=>a.id===r.id).name);
 }
 assert.equal(after.accounts.length,before.accounts.length+3);
 assert.equal(after.accounts.find(a=>a.code==='1014').currency_code,'USD');
 assert.equal(after.accounts.find(a=>a.code==='1015').currency_code,'THB');
 await db.exec(sql);
 assert.deepEqual(await snapshot(db),after);
 assert.deepEqual(await state(db),guards);
 await assert.rejects(db.query(`INSERT INTO accounts(id,code) VALUES($1,'Blocked again')`,[id(999)]),/Active accounting access/);
 await db.exec(`SET app.actor='${admin}'; SET ROLE authenticated;`);
 await db.query(`UPDATE sub_accounts SET name='Group renamed' WHERE code='1050'`);
 await db.exec('RESET ROLE');
 assert.equal((await db.query("SELECT is_posting FROM accounts WHERE code='1050'")).rows[0].is_posting,false);
 await db.exec('SET ROLE authenticated');
 await assert.rejects(db.query("DELETE FROM sub_accounts WHERE code='1050'"),/grouping account has child/);
 await assert.rejects(db.query("UPDATE sub_accounts SET currency_code='LAK' WHERE code='1041'"),/journal history/);
 await assert.rejects(db.query("DELETE FROM sub_accounts WHERE code='1041'"),/journal history/);
 await db.query(`INSERT INTO sub_accounts(parent_account_id,code,name,currency_code) VALUES($1,'1060','New app child','THB')`,[id(10)]);
 await db.exec('RESET ROLE');
 assert.equal((await db.query("SELECT currency_code FROM accounts WHERE code='1060'")).rows[0].currency_code,'THB');
 await db.exec(`SET app.actor='${staff}'; SET ROLE authenticated;`);
 await assert.rejects(db.query("UPDATE sub_accounts SET name='Forbidden' WHERE code='1060'"),/access required|administrator/);
 await db.exec('RESET ROLE');
 assert.deepEqual((await snapshot(db)).journals,before.journals);
 await db.close();
 console.log('PASS: all 31 reported discrepancies; stable chart IDs/currencies/groups and journals; three new LAK/USD/THB accounts; idempotent rerun; O/ALWAYS guard restoration; admin edits; group and posted-history protection.');
 for(const issue of ['parent','type','name','currency']) {
  db=await createDb();
  await db.exec(`SET app.actor='${admin}'`);
  if(issue==='parent') await db.exec("UPDATE accounts SET parent_code='OTHER' WHERE code='1041'");
  if(issue==='type') await db.exec("UPDATE accounts SET account_type='EXPENSE' WHERE code='1041'");
  if(issue==='name') await db.exec("UPDATE sub_accounts SET name='Unrelated account' WHERE code='1041'");
  if(issue==='currency') await db.exec("UPDATE sub_accounts SET currency_code='THB' WHERE code='1041'");
  await db.exec("SET app.actor=''");
  const original=await snapshot(db), originalGuards=await state(db);
  await assert.rejects(db.exec(sql),/conflicting chart identity|unreviewed/);
  await db.exec('ROLLBACK');
  assert.deepEqual(await snapshot(db),original);
  assert.deepEqual(await state(db),originalGuards);
  await db.close();
 }
 console.log('PASS: unreviewed parent/type/name/currency conflicts roll back all migration writes and restore access guards.');
})().catch(e=>{console.error(e);process.exitCode=1});
