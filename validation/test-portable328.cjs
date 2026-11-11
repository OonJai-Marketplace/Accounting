const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const create=require('./phase0-browser-fixture.cjs');
(async()=>{
 const fixture=await create();
 try{
  const {page,login}=await fixture.open();
  const dates={from:'2026-01-01',to:'2026-10-31'},modules=['journal','staff','payroll','tax','vouchers','reports','schedules','reconciliation','audit'];
  const pack={format:'oonjai-portable-328',...dates,modules,tables:{audit_log:[],journal_entries:[JSON.stringify({id:'j1',amount:0.46,memo:'=42, "saved"',detail:'Record'.repeat(6000)})]},reference:{},keys:{journal_entries:['id']}};
  const file={format:'oonjai-backup-file-328',payload:JSON.stringify(pack),signature:'test'};
  const actions=[],keys=new Set();
  await page.route('**/rest/v1/rpc/portable_backup328',async route=>{
   const body=route.request().postDataJSON();actions.push(body.p_action);
   switch(body.p_action){
    case 'inspect':case 'restore':assert.deepEqual(body.p_file,file);break;
    default:assert.equal(body.p_from,dates.from);assert.equal(body.p_to,dates.to);assert.deepEqual(body.p_groups,modules);
   }
   const result=body.p_action==='export'?file:['inspect','preview'].includes(body.p_action)?{...dates,modules,total:1,selection:'hash',counts:{audit_log:0}}:{changed:1,alreadyPresent:0};
   await route.fulfill({json:result});
  });
  await page.route('**/functions/v1/portable-sheet-append',async route=>{
   let added=0,existing=0;
   for(const r of route.request().postDataJSON().rows){assert.equal(r.length,7);if(keys.has(r[0]))existing++;else{keys.add(r[0]);added++;}}
   await route.fulfill({json:{added,existing}});
  });
  await login();await page.waitForFunction(()=>startup14257.interactive);
  await page.evaluate(()=>switchTab('settings-data14231'));
  const root=page.locator('#portable328'),status=root.locator(':scope>p[role=status]');
  if(!await root.isVisible())await page.locator('[data-jump143176="archive-export"]:visible').click();
  await root.waitFor({state:'visible'});
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('page113',{detail:'settings-data14231'})));
  assert.equal(await page.locator('#operationalReset142,#practiceReset130').count(),0,'Legacy all-data resets must never reappear after navigation');
  assert.equal(await page.getByRole('button',{name:'Maintenance & Audit',exact:true}).count(),0);
  await root.locator(':scope>fieldset [name=period]').selectOption('custom',{force:true});
  await root.locator(':scope>fieldset [name=from]').fill(dates.from);await root.locator(':scope>fieldset [name=to]').fill(dates.to);
  for(const kind of ['backup','excel','csv']){
   const received=page.waitForEvent('download');await root.locator('[data-act='+kind+']').click();const dl=await received;
   const path=await dl.path(),buf=await fs.readFile(path);assert(buf.length>0);
   if(kind==='backup'){assert.deepEqual(JSON.parse(buf),file);continue;}
   const picker=page.waitForEvent('filechooser');await root.locator('[data-act='+(kind==='excel'?'restore':'csvfile')+']').click();
   await (await picker).setFiles({name:dl.suggestedFilename(),mimeType:'application/octet-stream',buffer:buf});
   if(kind==='excel'){await page.getByRole('button',{name:'Restore records',exact:true}).click();await status.filter({hasText:'1 records restored'}).waitFor();}
   else{await status.filter({hasText:'2 archive rows appended'}).waitFor();await root.locator('[data-act=append]').click();await status.filter({hasText:'0 archive rows appended. 2 already present'}).waitFor();}
  }
  await root.locator('[data-act=delete]').click();await page.getByRole('button',{name:'Cancel',exact:true}).last().click();
  assert(!actions.includes('delete'));
  await root.locator('[data-act=delete]').click();await page.getByRole('button',{name:'Permanently delete',exact:true}).click();
  await status.filter({hasText:'1 records cleared'}).waitFor();assert.equal(actions.filter(a=>a==='delete').length,1);
  console.log('PASS Settings navigation, all formats, original XLSX restore, append replay, custom period and one delete confirmation');
 }finally{await fixture.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
