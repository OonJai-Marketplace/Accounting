const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const fixture = require('./phase0-browser-fixture.cjs');

(async () => {
  const f = await fixture();
  try {
    const {page,context,login} = await f.open();
    await context.route('**/assets/vendor/document14285/*.mjs',route=>route.fulfill({
      path:path.join(__dirname,'../assets/vendor/document14285',path.basename(new URL(route.request().url()).pathname)),
      contentType:'application/javascript'
    }));
    const pdfs = new Map();
    const prefix = q => 'OJM'+q.p_date.slice(2,4)+'-'+(q.p_type==='receipt'?'R':'V')+'A'+q.p_date.slice(5,7);
    await page.route('**/rpc/payment_preview401',r=>{
      const q=r.request().postDataJSON();
      return r.fulfill({json:Array.from({length:q.p_count},(_,i)=>prefix(q)+String(i+1).padStart(2,'0'))});
    });
    await page.route('**/rpc/voucher_issue14299',r=>{
      const q=r.request().postDataJSON();
      return r.fulfill({json:q.p_data.expected401.map((number,i)=>({number,id:require('node:crypto').randomUUID(),kind:q.p_kind,ordinal:i+1,version:1,data:q.p_data}))});
    });
    await page.route('**/rpc/receipt_pdf245',r=>{
      const q=r.request().postDataJSON();
      if(q.p_pdf)pdfs.set(q.p_id,{base64:q.p_pdf,filename:q.p_id+'.pdf',version:1});
      return r.fulfill({json:pdfs.get(q.p_id)||null});
    });
    f.fixture.tables.voucher_settings14299=[{id:1,prefix:'OJM'}];
    await login();
    await page.evaluate(()=>{
      const modal=ui108.modal.bind(ui108);ui108.modal=(t,...args)=>t==='Open in Document Editor'?Promise.resolve('new'):modal(t,...args);
      const canvas=document.createElement('canvas');canvas.width=600;canvas.height=30;
      const g=canvas.getContext('2d');g.fillStyle='#f040af';g.fillRect(0,0,600,30);
      PrintSettings.footerImage=canvas.toDataURL();ApplicationSettings.printing.footerPlacement='all';
      const render=Receipt245.pdf;window.captures=[];
      Receipt245.pdf=dom=>{window.captures.push(dom.querySelectorAll('.page').length);return render(dom)};
      document.addEventListener('load',e=>{
        const frame=e.target;if(!frame.matches?.('iframe[data-document-print]'))return;
        frame.contentWindow.print=()=>{window.printedHTML=frame.contentDocument.documentElement.outerHTML};
      },true);
    });
    const frame=page.frameLocator('#docFrame105');
    const snapshot=page.frameLocator('iframe[data-native-print]');
    const exportNative=async file=>{

      const physical=await f.browser.newPage();
      try{
        const source=await page.evaluate(()=>window.printedHTML);
        await physical.setContent(source);
        await physical.emulateMedia({media:'print'});
        const bytes=await physical.pdf({preferCSSPageSize:true,printBackground:true});
        if(process.env.PRINT_PDF_DIR)fs.writeFileSync(path.join(process.env.PRINT_PDF_DIR,file),bytes);
        // Print layout can clip a scaled form even when its DOM geometry is correct.
        // Render every physical sheet and look for the configured pink footer.
        const footers=await page.evaluate(async encoded=>{
          const lib=await import('/assets/vendor/document14285/pdf.min.mjs');
          lib.GlobalWorkerOptions.workerSrc='/assets/vendor/document14285/pdf.worker.min.mjs';
          const loading=lib.getDocument({data:Uint8Array.from(atob(encoded),ch=>ch.charCodeAt(0)),isEvalSupported:false,useWasm:false});
          const pdf=await loading.promise,found=[];
          try{
            for(let i=1;i<=pdf.numPages;i++){
              const sheet=await pdf.getPage(i),view=sheet.getViewport({scale:.5});
              const canvas=document.createElement('canvas');canvas.width=Math.ceil(view.width);canvas.height=Math.ceil(view.height);
              const ctx=canvas.getContext('2d');await sheet.render({canvasContext:ctx,viewport:view}).promise;
              const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
              let magenta=0;for(let j=Math.floor(canvas.height*.72)*canvas.width*4;j<pixels.length;j+=4)
                if(pixels[j]>205&&pixels[j+1]<105&&pixels[j+2]>125)magenta++;
              found.push(magenta>150);sheet.cleanup();
            }
          }finally{await loading.destroy()}
          return found;
        },bytes.toString('base64'));
        assert(footers.length&&footers.every(Boolean),file+' has a missing printed footer: '+footers);
      }finally{await physical.close()}
    };
    for(const type of ['voucher','receipt']){
      await page.evaluate(t=>document.getElementById(t==='receipt'?'receiptCreate245':'voucherCreate14299').click(),type);
      await frame.getByRole('heading',{name:type==='receipt'?'PAYMENT RECEIPT':'PAYMENT VOUCHER'}).waitFor();
      await page.evaluate(()=>{void documentWorkspace105.action('signatories14297')});
      await page.locator('.payment-signers [name=releaser]').fill('First Signer');
      await page.locator('.payment-signers [name=receiver]').fill('Second Signer');
      await page.getByRole('button',{name:'Apply',exact:true}).click();
      await page.evaluate(()=>{void documentWorkspace105.action('page-setup')});
      await page.locator('.page-setup1427 [data-doc-setting=paper]').selectOption('A5');
      await page.locator('.page-setup1427').getByRole('button',{name:'Done',exact:true}).click();
      await page.evaluate(()=>{void documentWorkspace105.action('receipt-details245')});
      const field=page.locator('#receiptDetails245 [name=blankCount250]');
      await field.fill('51');await page.getByRole('button',{name:'Apply',exact:true}).click();
      assert.equal(await field.isVisible(),true);
      await field.fill('10');
      await page.getByRole('button',{name:type==='voucher'?'Apply':'Create blank forms',exact:true}).click();
      await frame.locator('[data-handwritten-sheet14303]').nth(9).waitFor();
      assert.equal(await frame.getByText('First Signer',{exact:true}).count(),10);
      await page.evaluate(()=>{void documentWorkspace105.action('receipt-details245')});
      assert.equal(await field.inputValue(),'10');
      await page.getByRole('button',{name:'Apply',exact:true}).click();
      await page.evaluate(()=>documentWorkspace105.action('voucher-save14299'));
      await page.evaluate(()=>{documentWorkspace105.setZoom(.65);window.printedHTML='';window.captures=[]});
      const start=Date.now();
      if(type==='voucher')await page.locator('#document-editor105 .doc-quick1426 [data-doc-action=print]').click();
      else {await frame.locator('.page-content').last().focus();await page.keyboard.press('Control+p')}
      await page.waitForFunction(()=>!!window.printedHTML,null,{timeout:60000});
      const ms=Date.now()-start;
      assert.deepEqual(await page.evaluate(()=>window.captures),Array(10).fill(1));
      const sheets=snapshot.locator('.page');
      assert.equal(await sheets.count(),10);
      const rows=await sheets.evaluateAll(pages=>pages.map(p=>{
        const footer=p.querySelector('.page-footer'),sig=p.querySelector('[data-receipt-field245="signatures"]');
        const page=p.getBoundingClientRect(),a=sig.getBoundingClientRect(),b=footer.getBoundingClientRect();
        return {id:p.querySelector('[data-voucher-number14299]').textContent,names:sig.innerText,
          inPage:a.top>=page.top&&a.bottom<=b.top+1&&b.bottom<=page.bottom+1,
          footer:getComputedStyle(footer).visibility==='visible'&&footer.querySelector('img')?.naturalWidth===600};
      }));
      assert.equal(new Set(rows.map(r=>r.id)).size,10);
      assert(rows.every(r=>r.footer&&r.inPage&&r.names.includes('First Signer')&&r.names.includes('Second Signer')));
      await exportNative(type+'.pdf');
      if(process.env.PRINT_PDF_DIR)fs.writeFileSync(path.join(process.env.PRINT_PDF_DIR,type+'-retained.pdf'),Buffer.from([...pdfs.values()].at(-1).base64,'base64'));
      // Reprinting a confirmed batch must not rasterize any page again.
      await page.evaluate(()=>{window.printedHTML='';window.captures=[]});
      await page.evaluate(()=>documentWorkspace105.preview());assert(await page.evaluate(()=>!!window.printedHTML));
      assert.deepEqual(await page.evaluate(()=>window.captures),[]);
      console.log('PASS',type,'ten forms with signatures and footers, first print',ms+'ms, reprint zero renders');
    }
    // Use the normal report launchers with enough sample financial rows to span pages.
    await page.evaluate(()=>{
      const original=reportModel79;
      window.reportModel79=(kind,...rest)=>{
        if(!['tb','gl'].includes(kind))return original(kind,...rest);
        const headers=kind==='tb'?['Account','Type','Opening','Debit','Credit','Closing balance']:
          ['Date','Entry ID','Account','Description / Reference','Debit','Credit','Balance'];
        const values=Array.from({length:92},(_,i)=>kind==='tb'?
          ['Sample account '+(i+1),'Asset','150','50','0','200']:
          ['2026-11-16','Sample entry '+(i+1),'Cash','Sample transaction','50','0','200']);
        return [{currency:'LAK',headers,values,metrics:[],note:'End of sample report'}];
      };
    });
    for(const kind of ['tb','gl']){
      await page.evaluate(k=>{void printDesktopReport79(k)},kind);
      const form=page.locator('#reportSignatories275');await form.locator('[name=person0]').fill('Report Signer');
      await page.locator('.ui-overlay108').last().getByRole('button',{name:'Open report',exact:true}).click();
      await frame.getByText('Report Signer',{exact:true}).first().waitFor();
      const expected=await frame.locator('.page').count();assert(expected>1);
      await page.evaluate(()=>{documentWorkspace105.setZoom(.6);window.printedHTML='';});
      await page.evaluate(()=>documentWorkspace105.preview());
      assert(await page.evaluate(()=>!!window.printedHTML));
      assert.equal(await snapshot.locator('.page').count(),expected);
      assert.equal(await snapshot.locator('.page-footer img:visible').count(),expected);
      assert(await snapshot.getByText('Report Signer',{exact:true}).count()>0);
      for(let i=1;i<=92;i++)assert(await snapshot.getByText((kind==='tb'?'Sample account ':'Sample entry ')+i,{exact:true}).count()>0);
      await exportNative(kind+'.pdf');
      console.log('PASS report print entry',kind,expected,'pages, footer and selected signer');
    }
  } finally {await f.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
