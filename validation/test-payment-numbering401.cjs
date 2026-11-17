const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');

(async () => {
  const f = await createFixture();
  try {
    const {page,context,login} = await f.open();
    const next = new Map(), issued = new Map(), pdfs = new Map();
    let attemptedOffline = 0, disconnected = false;
    const labels = (q, consume=false) => {
      const key=q.p_type+q.p_date.slice(0,7),start=next.get(key)||1;
      if(consume)next.set(key,start+q.p_count);
      return Array.from({length:q.p_count},(_,i)=>'OJM'+q.p_date.slice(2,4)+'-'+(q.p_type==='receipt'?'R':'V')+'A'+q.p_date.slice(5,7)+String(start+i).padStart(2,'0'));
    };
    const route=(name,fn)=>page.route('**/rest/v1/rpc/'+name+'*',async r=>{
      if(disconnected){attemptedOffline++;return r.abort()}
      const result=fn(r.request().postDataJSON());
      return r.fulfill(result?.error?{status:400,json:result.error}:{json:result});
    });
    await route('payment_preview401',q=>labels(q));
    await route('payment_reserve401',q=>labels(q,true));
    await route('voucher_issue14299',q=>{
      if(issued.has(q.p_request_key))return issued.get(q.p_request_key);
      const spec={p_type:q.p_data.documentType||'voucher',p_date:q.p_date,p_count:q.p_count};
      const expected=labels(spec),holds=q.p_data.holds401;
      if(!holds && q.p_data.expected401 && expected.join()!==q.p_data.expected401.join())return {error:{code:'P0401',message:'A pending document number is no longer available.'}};
      const nums=holds?holds.map(x=>x.number):labels(spec,true);
      const rows=nums.map((number,i)=>({number,id:require('node:crypto').randomUUID(),version:1,kind:q.p_kind,data:q.p_data,ordinal:i+1}));
      issued.set(q.p_request_key,rows);return rows;
    });
    await route('receipt_pdf245',q=>{
      if(q.p_pdf)pdfs.set(q.p_id,{base64:q.p_pdf,filename:q.p_id+'.pdf',version:1});
      return pdfs.get(q.p_id)||null;
    });
    f.fixture.tables.voucher_settings14299=[{id:1,prefix:'OJM'}];
    await login();
    await page.evaluate(()=>{
      const modal=ui108.modal.bind(ui108);ui108.modal=(t,...args)=>t==='Open in Document Editor'?Promise.resolve('new'):modal(t,...args);
    });
    const date=await page.evaluate(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Vientiane',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
    // Normal register action prepares two independent batches, without issuing rows.
    for(const type of ['receipt','voucher']){
      await page.evaluate(()=>document.querySelector('#paymentReserveButton401').click());
      const dlg=page.locator('#paymentReserve401');await dlg.locator('[name=type]').selectOption(type);
      await page.locator('.ui-overlay108').last().getByRole('button',{name:'Reserve numbers',exact:true}).click();
      await page.waitForFunction(t=>document.querySelector('#paymentDevice401').textContent.includes('10 offline '+t),type);
    }
    assert.equal(issued.size,0);
    // Prepare the same PDF libraries served by the installed desktop shell.
    for(const js of ['assets/vendor/document14285/html2canvas.min.js','assets/vendor/document14285/jspdf.umd.min.js?v=4.2.1'])
      await page.addScriptTag({url:f.base+'/'+js});
    disconnected=true;await context.setOffline(true);
    const frame=page.frameLocator('#docFrame105');
    for(const type of ['receipt','voucher']){
      await page.evaluate(t=>vouchers14299.blankDraft250(10,t),type);
      await frame.locator('.page').nth(9).waitFor();
      const save=page.locator('#document-editor105 .doc-quick1426 [data-doc-action=voucher-save14299]');
      assert.equal(await save.innerText(),'Save');assert.equal(await save.getAttribute('aria-label'),'Save');
      await save.click();await page.waitForFunction(()=>documentWorkspace105.model.voucher14299.local401);
      const nums=await page.evaluate(()=>documentWorkspace105.model.voucher14299.batchNumbers);
      assert.equal(nums.length,10);assert.equal(new Set(nums).size,10);
      assert(nums[0].includes(type==='receipt'?'-RA':'-VA'));assert(nums[9].endsWith('10'));
      assert.deepEqual(await frame.locator('[data-voucher-number14299]').allTextContents(),nums);
      // Reserved numbers print offline from the saved form.
      await page.evaluate(async()=>{
        window.__didPrint=false;
        const intercept=event=>{const frame=event.target;if(frame.matches?.('iframe[data-document-print]'))frame.contentWindow.print=()=>{window.__didPrint=true}};
        document.addEventListener('load',intercept,true);
        try{await documentWorkspace105.preview()}finally{document.removeEventListener('load',intercept,true)}
      });
      assert(await page.evaluate(()=>window.__didPrint),'offline printing: '+await page.locator('#docStatus105').innerText());
    }
    assert.equal(attemptedOffline,0);
    const summary=()=>page.evaluate(()=>vouchers14299.numbering.summary());
    assert.equal((await summary()).pending.length,2);
    // A device with no remaining stock can still assign an offline pending ID.
    await page.evaluate(()=>vouchers14299.blankDraft250(1,'receipt'));
    await page.evaluate(()=>documentWorkspace105.action('voucher-save14299'));
    const preliminary=await page.evaluate(()=>documentWorkspace105.model.voucher14299);
    assert(preliminary.local401&&!preliminary.held401&&preliminary.number.endsWith('11'));
    // Another device takes that provisional number. Reserved, already-printed numbers stay fixed.
    labels({p_type:'receipt',p_date:date,p_count:1},true);
    disconnected=false;await context.setOffline(false);
    const deadline=Date.now()+30000;
    for(;;){
      const s=await summary();
      if(s.pending.length===1 && s.pending[0].conflict)break;
      if(Date.now()>deadline)throw Error('Reconnect did not confirm both printed batches and flag the provisional conflict.');
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    assert.equal(issued.size,2);assert.equal(pdfs.size,0);
    const remaining=(await summary()).pending[0];assert.equal(remaining.id,preliminary.requestKey);
    const options=labels({p_type:'receipt',p_date:date,p_count:1});
    await page.evaluate(([id,nums])=>vouchers14299.numbering.acceptNext(id,nums),[remaining.id,options]);
    assert.equal((await summary()).pending.length,0);assert.equal(issued.size,3);
    console.log('PASS separate 10-page batches, offline save and print, stable sync with no PDF uploads, reviewed provisional collision');
  } finally {await f.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
