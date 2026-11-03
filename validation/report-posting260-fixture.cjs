// Called only by the isolated fresh-database harness; never uses production APIs.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
module.exports=async function(db){
 assert((await db.query("SELECT to_regclass('pg_temp.audit_fixture14370')::text guard")).rows[0].guard,'Isolated harness required');
 const c={wsIsCollection:l=>l.entry_kind==='collection'&&l.account_id===l.fund_account_id,formatAppDate:s=>s};vm.createContext(c);vm.runInContext(fs.readFileSync('src/bridges/subusers-bookkeeping/report-workflow/consolidation.js','utf8'),c);
 const q=async(sql,args=[])=> (await db.query(sql,args)).rows,one=async(sql,args=[])=>(await q(sql,args))[0];
 await db.exec('BEGIN;CREATE TEMP SEQUENCE report_sequence260 START 2000000;');
 try{
 const actor=(await one("SELECT id FROM profiles WHERE role='admin' AND status='active' LIMIT 1")).id;
 const who=(await one("SELECT id FROM profiles WHERE role<>'admin' AND status='active' LIMIT 1")).id;
 const setActor=async id=>{await q("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[id,JSON.stringify({sub:id,role:'authenticated'})]);};await setActor(actor);
 const def=(await one("SELECT pg_get_functiondef('public.post_report_worker14349(date,text,jsonb,text,integer)'::regprocedure) def")).def;await db.exec(def.replaceAll('public.journal_entry_number_seq','pg_temp.report_sequence260'));
 const accounts={};for(const currency of ['LAK','THB']){accounts[currency]=[];for(const [i,type] of ['ASSET','EXPENSE','EXPENSE'].entries()){const r=await one('INSERT INTO accounts(code,name,account_type,currency_code) VALUES($1,$2,$3,$4) RETURNING id',['T260'+currency+i,'Fixture '+currency+i,type,currency]);accounts[currency].push(r.id);}}
 const funds=Object.values(accounts).map(a=>a[0]),categories=Object.values(accounts).flatMap(a=>a.slice(1));
 await q("UPDATE user_permissions SET assigned_fund_account_ids=$1,allowed_account_ids=$2,destination_account_ids=$2,allowed_currency_codes=ARRAY['LAK','THB'],allow_multiple_funds=true WHERE user_id=$3",[funds,categories,who]);
 let month=0;
 for(const currency of ['LAK','THB'])for(const mode of ['category_totals','fund_totals','detailed']){
 const m='1904-'+String(++month).padStart(2,'0'),[fund,category,kitchen]=accounts[currency];let journal;
 for(let i=0;i<3;i++){
  const result=await one('SELECT * FROM save_staff_workspace_entry_v3($1,NULL,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[who,'report260-'+currency+'-'+mode+'-'+i,m+'-0'+(i+1),'out',fund,i===2?kitchen:category,'Receipt '+(i+1),'REF'+i,(i+1)*10,'payment']);
  journal=(await one('SELECT staff_journal_id FROM staff_journal_lines WHERE id=$1',[result.line_id])).staff_journal_id;
  if(currency==='THB')await q('UPDATE staff_journal_lines SET fx_rate_lak=$1 WHERE id=$2',[i===1?650:660,result.line_id]);
 }
 const source=await one("SELECT jsonb_build_object('id',j.id,'owner_id',j.owner_id,'period_start',j.period_start,'lines',(SELECT jsonb_agg(to_jsonb(l) ORDER BY transaction_date) FROM staff_journal_lines l WHERE staff_journal_id=j.id)) report FROM staff_journals j WHERE id=$1",[journal]);
 const rows=JSON.parse(JSON.stringify(c.summarize(source.report,mode,m+'-28'))),date=mode==='detailed'?m+'-01':m+'-28';
 assert.equal(rows.length,currency==='LAK'?({category_totals:3,fund_totals:4,detailed:6}[mode]):({category_totals:5,fund_totals:5,detailed:6}[mode]));
 const context=(await one('SELECT submission_context14345($1,$2) r',[journal,m+'-28'])).r,types=(await q('SELECT id FROM report_types14253 WHERE active')).map(r=>r.id),actuals=context.funds.map(f=>({account_id:f.account_id,actual:Number(f.posted)+Number(f.unposted),reason:''}));
 await q('SELECT submit_reconciled14345($1,$2,$3,$4,$5)',[journal,types,m+'-28',context.fingerprint,actuals]);
 const post=async(ls=rows,md=mode,d=date)=>one('SELECT post_report14349($1,$2,$3,$4,$5,$6,$7) r',[journal,d,'Fixture report260',ls,'TEST',6,md]);
 const rejected=async(fn,pattern)=>{await db.exec('SAVEPOINT rejected260');try{await assert.rejects(fn,pattern);}finally{await db.exec('ROLLBACK TO SAVEPOINT rejected260;RELEASE SAVEPOINT rejected260;');}};
 await rejected(()=>post(),/final|approval|Approve/i);
 const expected=(await one('SELECT jsonb_agg(to_jsonb(l)) lines FROM staff_journal_lines l WHERE staff_journal_id=$1',[journal])).lines;await q('SELECT approve_report1443($1,$2)',[journal,expected]);
 await rejected(()=>post(rows,'unknown'),/mode/);
 const changed=structuredClone(rows);changed[0].debit+=1;await rejected(()=>post(changed),/match/);
 const missing=structuredClone(rows);missing[0].source_ids=[];await rejected(()=>post(missing),/match/);
 const redated=structuredClone(rows);redated[0].line_date=m+'-27';await rejected(()=>post(redated),/match/);
 if(currency==='THB'){const rates=structuredClone(rows);rates[0].fx_rate_lak=999;await rejected(()=>post(rates),/Exchange rates/);}
 // Isolated fixture: establish a pre-existing closed month without running the unrelated closing workflow.
 await db.exec('SAVEPOINT closed_period260;ALTER TABLE accounting_periods DISABLE TRIGGER guard_maintenance14324;ALTER TABLE accounting_periods DISABLE TRIGGER guard_period_ack14317;');
 await q("INSERT INTO accounting_periods(period_month,status) VALUES($1,'closed') ON CONFLICT(period_month) DO UPDATE SET status='closed'",[m+'-01']);await db.exec('ALTER TABLE accounting_periods ENABLE TRIGGER guard_maintenance14324;ALTER TABLE accounting_periods ENABLE TRIGGER guard_period_ack14317;');await rejected(()=>post(),/closed|open|lock/i);await db.exec('ROLLBACK TO SAVEPOINT closed_period260;RELEASE SAVEPOINT closed_period260;');
 await setActor(who);await rejected(()=>post(),/permission/i);await setActor(actor);
 const result=(await post()).r;assert.deepEqual((await post()).r,result,'exact retry returns same journal');await rejected(()=>post(rows,mode,m+'-26'),/different data/);
 const saved=await q('SELECT account_id,line_date,currency_code,debit,credit,fx_rate_lak FROM journal_lines WHERE journal_entry_id=$1 ORDER BY line_no',[result.entry_id]);assert.equal(saved.length,rows.length);for(const [i,r] of saved.entries()){assert.equal(r.account_id,rows[i].account_id);assert.equal(Number(r.debit),rows[i].debit);assert.equal(Number(r.credit),rows[i].credit);if(currency==='THB')assert.equal(Number(r.fx_rate_lak),rows[i].fx_rate_lak);}
 assert.equal((await one('SELECT count(DISTINCT source_date)::int n FROM journal_sources14253 WHERE report_id=$1',[journal])).n,3,'original dates retained');
 await q('SELECT check_ledger_entry14228($1)',[result.entry_id]);
 }
 }finally{await db.exec('ROLLBACK;');}
};
