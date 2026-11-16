const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');

(async () => {
  const fixture = await createFixture();
  try {
    const { page, login } = await fixture.open();
    fixture.fixture.tables.voucher_settings14299 = [{ id: 1, prefix: 'TEST' }];
    await page.route('**/rest/v1/rpc/payment_preview401', route => {
      const q=route.request().postDataJSON(), prefix='OJM'+q.p_date.slice(2,4)+'-'+(q.p_type==='receipt'?'R':'V')+'A'+q.p_date.slice(5,7);
      return route.fulfill({ json:Array.from({length:q.p_count},(_,i)=>prefix+String(i+1).padStart(2,'0')) });
    });
    await login();
    await page.evaluate(() => {
      const modal = ui108.modal.bind(ui108);
      ui108.modal = (title, ...args) => title === 'Open in Document Editor'
        ? Promise.resolve('new') : modal(title, ...args);
    });
    const editor = page.frameLocator('#docFrame105');
    const signatures = editor.locator('[data-receipt-field245="signatures"]');
    async function geometry() {
      return editor.locator('.page').first().evaluate(p => {
        const surface = p.querySelector('.payment-design');
        const rect = surface.getBoundingClientRect(), paper = p.getBoundingClientRect();
        const fields = [...p.querySelectorAll('h2, thead, tbody tr, tfoot, [data-receipt-field245="signatures"], [data-receipt-field245="receiver"]')];
        return { paper: [paper.width, paper.height], size: [rect.width, rect.height],
          offset: [rect.x - paper.x, rect.y - paper.y],
          positions: fields.map(n => {const r = n.getBoundingClientRect();return [(r.x-rect.x)/rect.width,(r.y-rect.y)/rect.height,r.width/rect.width,r.height/rect.height]}),
          pages: p.ownerDocument.querySelectorAll('.page').length };
      });
    }
    async function setup(changes) {
      await page.evaluate(() => { void documentWorkspace105.action('page-setup') });
      const dialog = page.locator('.page-setup1427');
      for (const [key, value] of Object.entries(changes)) {
        const field = dialog.locator('[data-doc-setting="'+key+'"]');
        if (await field.evaluate(n => n.tagName === 'SELECT')) await field.selectOption(value);
        else { await field.fill(String(value)); await field.press('Tab'); }
      }
      await dialog.getByRole('button', {name:'Done',exact:true}).click();
    }
    function sameDesign(a,b) {
      assert.equal(b.pages,a.pages);
      assert.equal(b.positions.length,a.positions.length);
      b.positions.forEach((box,i) => box.forEach((v,j) => assert(Math.abs(v-a.positions[i][j])<0.0002)));
      const scale=Math.min(b.paper[0]/a.size[0],b.paper[1]/a.size[1]);
      b.size.forEach((v,i) => {
        assert(Math.abs(v-a.size[i]*scale)<0.2);
        assert(Math.abs(b.offset[i]-(b.paper[i]-v)/2)<0.2);
      });
    }
    for (const type of ['voucher','receipt']) {
      await page.evaluate(type => document.getElementById(type==='voucher'?'voucherCreate14299':'receiptCreate245').click(), type);
      await editor.getByRole('heading',{name:type==='voucher'?'PAYMENT VOUCHER':'PAYMENT RECEIPT',exact:true}).waitFor();
      assert.equal(await signatures.count(),1);
      const outgoing=type==='voucher'?'Released by':'Paid by';
      assert((await signatures.innerText()).includes(outgoing));
      assert((await signatures.innerText()).includes('Received by'));
      await page.evaluate(() => {void documentWorkspace105.action('signatories14297')});
      const form = page.locator('.payment-signers');
      await form.locator('[name=releaser]').fill('Sample Sender');
      await form.locator('[name=receiver]').fill('Sample Payee');
      await form.locator('[name=receive-role]').fill('Payee');
      await page.locator('.ui-overlay108').last().getByRole('button',{name:'Apply',exact:true}).click();
      assert((await signatures.innerText()).includes('Sample Payee'));
      const original=await geometry();
      assert.equal(original.pages,1);
      await setup({paper:'A5'});
      const a5=await geometry();
      assert(Math.abs(a5.paper[0]*25.4/96-148)<0.1);
      sameDesign(original,a5);
      const m=await page.evaluate(()=>documentWorkspace105.model);
      assert.deepEqual(m.settings.paymentDesignSize,[210,297]);
      assert(m.html.includes('Sample Sender') && m.html.includes('Sample Payee') && m.html.includes('>Payee<'));
      if (type==='voucher') {
        const name=page.locator('#document-editor105 [name=docTitle]');
        await name.fill('Payment voucher with a long document title for testing');
        const box=await name.boundingBox(),tab=page.locator('.doc-worktab1432.active');
        assert(box.height<=24.1 && box.width<=241,JSON.stringify(box));
        assert((await tab.boundingBox()).width<=180.1);
        assert.equal(await tab.locator('[role=tab]').getAttribute('title'),await name.inputValue());
        await page.evaluate(()=>documentWorkspace105.flush());
        await page.reload();
        await page.waitForFunction(()=>window.startup14257?.prepared && liveProfile);
        await page.evaluate(()=>openDocumentEditor105());
        await signatures.waitFor();
        sameDesign(original,await geometry());
        assert((await signatures.innerText()).includes('Sample Sender'));
        await page.evaluate(() => {
          const modal = ui108.modal.bind(ui108);
          ui108.modal = (t,...args) => t==='Open in Document Editor'?Promise.resolve('new'):modal(t,...args);
        });
        // Check both native print layout and the actual PDF download renderer.
        const view=await fixture.browser.newPage();
        const doc=page.frames().find(f=>f.url()==='about:srcdoc');
        await view.setContent(await doc.content());
        await view.emulateMedia({media:'print'});
        assert.equal(await view.locator('.payment-design').count(),1);
        const fs=require('node:fs');
        const printFile=await view.pdf({preferCSSPageSize:true,printBackground:true});
        assert(printFile.length>5000);
        await view.close();
        const exported=await page.evaluate(async () => {
          const pdf=await Receipt245.pdf(document.querySelector('#docFrame105').contentDocument);
          return Receipt245.base64(pdf);
        });
        assert(Buffer.from(exported,'base64').length>5000);
        if(process.env.PAYMENT_PDF_DIR){
          fs.writeFileSync(process.env.PAYMENT_PDF_DIR+'/payment-native.pdf', printFile);
          fs.writeFileSync(process.env.PAYMENT_PDF_DIR+'/payment-download.pdf', Buffer.from(exported,'base64'));
        }
      }
      for(const changes of [{paper:'Letter'},{paper:'Custom',customWidth:190,customHeight:110},{orientation:'landscape'},{paper:'A4',orientation:'portrait'}]){
        await setup(changes);sameDesign(original,await geometry());
      }
      console.log('PASS',type,'two editable signatures and proportional A4/A5/Letter/custom/landscape round trip');
    }
    await setup({paper:'A5'});
    await page.evaluate(()=>vouchers14299.blankDraft250(2,'receipt',documentWorkspace105.model.settings));
    await editor.locator('[data-handwritten-sheet14303]').nth(1).waitFor();
    assert.equal(await editor.locator('.page').count(),2);
    assert.equal(await signatures.count(),2);
    assert.equal(await page.evaluate(()=>documentWorkspace105.model.settings.paper),'A5');
    // A previously saved non-A4 design starts from its saved size and receiver.
    await page.evaluate(()=>documentWorkspace105.newTab({
      title:'Legacy receipt',voucher14299:{kind:'E',documentType:'receipt'},
      settings:{paper:'Letter',applyHeader:false,applyFooter:false},
      html:'<table data-voucher-table14298="payment-receipt"><tbody><tr><td>Sample</td></tr></tbody></table>'+
        '<p style="border-top:1px solid">Original receiver<br>Received by (name and signature)</p>'
    }));
    await editor.getByText('Original receiver',{exact:true}).waitFor();
    const saved=await geometry();
    await setup({paper:'A5'});sameDesign(saved,await geometry());
    assert.deepEqual(await page.evaluate(()=>documentWorkspace105.model.settings.paymentDesignSize),[215.9,279.4]);
    assert.equal(await editor.locator('[data-receipt-field245="receiver"]').innerText(),'Original receiver');
    await page.evaluate(()=>documentWorkspace105.newTab({title:'Ordinary document',html:'<p>Sample text</p>'}));
    await editor.getByText('Sample text').waitFor();
    assert.equal(await editor.locator('.payment-design').count(),0);
    assert.equal(await page.locator('#document-editor105.payment-form-editor').count(),0);
    console.log('PASS blank batch and ordinary document scope');
  } finally { await fixture.close(); }
})().catch(error => {console.error(error);process.exitCode=1});
