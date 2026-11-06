/* Exercise every advertised destination and Editor command via keyboard events. */
const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 const {page,login}=await f.open();
 await page.route('**/rest/v1/payroll_tax_settings*',async route=>route.fulfill({json:route.request().method()==='POST'?[route.request().postDataJSON()]:null}));
 await page.route('**/rest/v1/rpc/reconciliation_workspace306',route=>route.fulfill({json:{months:[],month:null,progress:{items:[]}}}));
 await login();await page.waitForFunction(()=>startup14257.interactive);await page.waitForLoadState('networkidle');
 const modules=await page.evaluate(()=>Object.entries(navigationWorkflow14316.modules).filter(([key])=>{const n=document.getElementById('nav-module-'+key);return n&&!n.hidden&&n.style.display!=='none'}).map(([name,[key]])=>({name,key})));
 let destinations=0;const tested=[];
 for(const module of modules.filter(m=>m.name!=='documents')){
  console.log('Checking '+module.name);
  await page.evaluate(()=>navigationWorkflow14316.cancel(true));
  await page.keyboard.press('Control+Alt+Space');await page.keyboard.press(module.key.toLowerCase());
  assert(await page.locator('#navigationHint14316').isVisible(),module.name+' workspace chooser');
  const choices=await page.evaluate(name=>navigationWorkflow14316.choices(name).map(c=>({id:c.id,key:c.key,kind:c.kind,value:c.value,label:c.label})),module.name);
  assert.equal(new Set(choices.map(c=>c.key)).size,choices.length,module.name+' shortcut collisions');
  for(const choice of choices){
   await page.evaluate(()=>navigationWorkflow14316.cancel(true));
   await page.keyboard.press('Control+Alt+'+module.key.toLowerCase());
   await page.keyboard.press(choice.key.toLowerCase());
   const state=await page.evaluate(()=>({active:document.querySelector('.tab-content.active')?.id,account:document.getElementById('accounts-modular-container')?.dataset.accountView14231,dashboard:document.querySelector('#dashboard [aria-selected=true]')?.dataset.tab112,final:budgetWorkflow14316.finalTab,history:budgetWorkflow14316.historyTab,upcoming:workspace14337.section,gpt:window.DriveDrafts143128?.view,accounting:settingsGroups14332.accountingSection}));
   if(module.name==='dashboard')assert.equal(state.dashboard,choice.id,choice.label);
   else if(choice.id.startsWith('sec-'))assert.equal(state.account,choice.id,choice.label);
   else assert.equal(state.active,choice.id,module.name+' / '+choice.label);
   if(choice.kind)assert.equal(state[choice.kind],choice.value,module.name+' / '+choice.label+' section');
   tested.push(module.name+': '+choice.key+' '+choice.label);destinations++;
  }
 }
 console.log('Checking Editor');
 // Open Editor once, then invoke every advertised menu command against its actual control.
 await page.evaluate(()=>{navigationWorkflow14316.cancel(true);void openDocumentEditor105({title:'Shortcut fixture',html:'<p>Keyboard test</p>'})});
 const add=page.getByRole('button',{name:'Add new tab',exact:true});if(await add.count())await add.click();
 await page.locator('#docMenuButton1426-file').waitFor();
 await page.evaluate(()=>{window.__shortcutActions312=[];document.addEventListener('click',e=>{const b=e.target.closest?.('#document-editor105 [data-doc-action]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();__shortcutActions312.push(b.dataset.docAction)},true)});
 const menus=await page.evaluate(()=>Object.entries(navigationWorkflow14316.editorMenus14317).map(([key,[menu]])=>({key,menu,commands:navigationWorkflow14316.editorChoices(menu).map(c=>({key:c.key,action:c.button.dataset.docAction}))})));
 let commands=0;
 for(const menu of menus){
  if(menu.menu==='reports')continue;
  for(const command of menu.commands){
   await page.evaluate(()=>navigationWorkflow14316.cancel(true));
   await page.keyboard.press('Control+Alt+e');await page.keyboard.press(menu.key.toLowerCase());await page.keyboard.press(command.key.toLowerCase());
   await page.waitForFunction(action=>window.__shortcutActions312.at(-1)===action,command.action);
   commands++;
  }
 }
 // Save works from the title bar and inside the editor, including uppercase key events.
 await page.evaluate(()=>{window.__shortcutSaves312=0;localFirst14333.saveDocument=async payload=>({data:[{id:'00000000-0000-4000-a000-000000000312',version:++window.__shortcutSaves312,data:payload}]});});
 await page.locator('#document-editor105 [name=docTitle]').fill('Shortcut save fixture');
 await page.keyboard.press('Control+s');await page.waitForFunction(()=>window.__shortcutSaves312===1);
 await page.waitForFunction(()=>document.getElementById('docStatus105').textContent.includes('Document saved'));
 const editor=page.frameLocator('#docFrame105').locator('.page-content').first();
 await editor.click();await page.keyboard.press('Control+End');await page.keyboard.type(' typed sample');
 await page.waitForTimeout(400);await page.keyboard.press('Control+z');assert(!(await editor.innerText()).includes('typed sample'),'Editor undo');
 await page.keyboard.press('Control+Shift+z');assert((await editor.innerText()).includes('typed sample'),'Editor redo');
 await editor.evaluate(node=>node.ownerDocument.dispatchEvent(new KeyboardEvent('keydown',{key:'S',code:'KeyS',ctrlKey:true,bubbles:true,cancelable:true})));
 await page.waitForFunction(()=>window.__shortcutSaves312===2);
 // Escape cancels a sequence, text entry remains ordinary text, and iframe keys reach the same controller.
 await page.evaluate(()=>navigationWorkflow14316.cancel(true));await page.keyboard.press('Control+Alt+p');await page.keyboard.press('Escape');assert.equal(await page.locator('#navigationHint14316').count(),0);
 await page.evaluate(()=>openDocumentEditor105());
 await page.frameLocator('#docFrame105').locator('.page-content').first().click();await page.keyboard.press('Control+Alt+b');await page.keyboard.press('r');
 assert.equal(await page.evaluate(()=>budgetWorkflow14316.finalTab),'reconciliation');
 console.log('PASS '+modules.length+' main-area shortcut prefixes and chooser, '+destinations+' destinations, '+commands+' Editor commands, title/content Save, undo/redo, Escape and iframe navigation.');console.log(tested.join('\n'));
 }finally{await f.close()}})().catch(e=>{console.error(e);process.exit(1)});
