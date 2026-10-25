const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('desktop.html','utf8');
const pause=()=>new Promise(r=>setTimeout(r,30));
async function fixture(width=1440){
 const dom=new JSDOM(html,{url:'https://fixture.invalid/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
 w.HTMLElement.prototype.scrollTo=function({top}){this.scrollTop=top;};w.HTMLElement.prototype.scrollIntoView=function(){throw Error('Settings must not scroll shell ancestors');};w.innerWidth=width;d.documentElement.dataset.device132=width<641?'phone':'desktop';w.liveProfile={id:'test-admin'};w.ApplicationSettings={accounting:{baseCurrency:'LAK',fiscalYearStart:'01',journalPrefix:'OJM'},payroll:{payFrequency:'monthly'},system:{dateFormat:'DD/MM/YYYY'},printing:{paperSize:'A4'}};w.CurrencyStore={currencies:[{code:'LAK'},{code:'USD'},{code:'THB'}]};w.BusinessSettings={current:{companyName:'Fixture',timezone:'Asia/Vientiane'}};
 const denied=new Set(),blocked=new Set();w.access113={can:(id,action='view')=>!denied.has(id)&&!(action==='edit'&&blocked.has(id))};w.settingsGroups14332={accountingSection:'accounting',render(){}};const painted=[];w.shell113={paintBanner:(node,key,id)=>painted.push(id)};
 const seen=[],saves=[];w.switchTab=id=>{if(!w.access113.can(id))return;d.querySelectorAll('.tab-content.active').forEach(n=>n.classList.remove('active'));d.getElementById(id).classList.add('active');seen.push(id);w.dispatchEvent(new w.CustomEvent('page113',{detail:id}));};
 const append=(id,content)=>{let n=d.getElementById(id);if(!n){n=d.createElement('div');n.id=id;n.className='tab-content';n.dataset.module='settings';d.getElementById('settings-system').after(n);}n.innerHTML=content;return n;};
 append('settings-organization14229','<section><h3>Organization</h3><button type="button">Edit reporting</button></section>');
 append('settings-data14231','<div id="settings-backup113" class="embedded-settings14231"><section class="panel113"><h2>Archive</h2><div id="archiveExport129"><button>Prepare Archive</button></div></section></div><div id="settings-recovery113" class="embedded-settings14231"><section class="panel113"><h2>Vault</h2><input type="password" id="vault-password"><button>Unlock</button></section></div>');
 append('settings-maintenance14324','<div class="maintenance-grid14324"><section class="maintenance-card14324"><h3>Investigator</h3><input id="investigator"><button>Investigate</button></section></div>');
 const acc=d.getElementById('settings-accounting'),card=acc.querySelector('.je-card');
 const prefix=d.createElement('div');prefix.id='prefixRegistry89';prefix.innerHTML='<input id="prefix-test" name="automatedPrefix" value="AUTO">';acc.querySelector('form').append(prefix);
 const currency=d.createElement('section');currency.className='settings-module94';currency.innerHTML='<header><h4>Currency Manager</h4></header>';card.append(currency);for(const n of [...card.children].filter(n=>n.matches('.currency-add-bar,.table-container')))currency.append(n);
 const vouchers=d.createElement('section');vouchers.className='voucher-config14299';vouchers.innerHTML='<form id="voucher-test"><input name="prefix"><button type="submit">Save vouchers</button></form>';card.append(vouchers);
 const google=d.createElement('section');google.id='googleSheets143129';google.hidden=true;google.innerHTML='<input id="google-test">';acc.append(google);
 const printing=d.getElementById('settings-print').querySelector('.panel');printing.classList.add('system-printing-panel');d.getElementById('settings-system').append(printing);d.getElementById('settings-print').remove();
 d.addEventListener('submit',e=>{const root=e.target.closest('.tab-content.active');if(root&&!w.access113.can(root.id,'edit')){e.preventDefault();e.stopImmediatePropagation();}},true);
 d.querySelectorAll('form').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();saves.push(f.dataset.settingsGroup||f.id);}));
 w.switchTab('settings-accounting');w.eval(fs.readFileSync('src/settings/application/settings-stack143176.js','utf8'));await pause();return {w,d,dom,denied,blocked,seen,saves,painted};
}
(async()=>{
 const f=await fixture(),{w,d}=f;
 assert.equal(d.querySelectorAll('.settings-stack-workspace143176').length,3);
 assert.equal(d.querySelectorAll('[data-settings-stack-panel143176]').length,9);
 for(const key of ['accounting','currency','vouchers','google','payroll','mandatory','business','users','organization','preferences','printing','settings-backup','recovery'])assert(d.getElementById('settingsSection143176-'+key),key);
 for(const button of [...d.querySelectorAll('[data-jump143176]')]){button.click();const visible=[...d.querySelectorAll('.settings-stack-section143176')].filter(n=>!n.closest('[hidden]'));assert.equal(visible.length,1,'exactly one selected section');assert.equal(visible[0].dataset.settingsSection143176,button.dataset.jump143176);}
 w.settingsStack143176.open('accounting');
 const inputs=[...d.querySelectorAll('[data-settings-stack-panel143176] input,[data-settings-stack-panel143176] select,[data-settings-stack-panel143176] textarea')],forms=inputs.map(n=>n.form),before=inputs.length;
 const input=d.querySelector('[name=journalPrefix]');input.value='UNSAVED';let calls=0;input.addEventListener('change',()=>calls++);
 w.settingsStack143176.open('payroll');w.settingsStack143176.open('mandatory');w.settingsStack143176.open('accounting');assert.equal(input.value,'UNSAVED');input.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(calls,1);
 await pause();const scroller=d.querySelector('.workspace-scroll'),shell=d.querySelector('.main-content-area'),target=d.getElementById('settingsSection143176-accounting'),pane=target.closest('.settings-stack-main143176');
 const visible=()=>[...d.querySelectorAll('.settings-stack-section143176')].filter(n=>!n.closest('[hidden]')).map(n=>n.dataset.settingsSection143176);
 assert.deepEqual(visible(),['accounting']);assert.equal(d.querySelectorAll('details.settings-stack-section143176').length,0);
 assert(!d.querySelector('.settings-stack-toolbar143176'),'no expand or collapse toolbar');
 pane.scrollTop=240;scroller.scrollTop=0;shell.scrollTop=0;
 w.settingsStack143176.open('accounting');await pause();assert.equal(pane.scrollTop,240,'reselecting the same section preserves its position');
 w.settingsStack143176.open('google');await pause();assert.equal(pane.scrollTop,0,'a newly selected section starts inside the content pane');assert.equal(scroller.scrollTop,0);assert.equal(shell.scrollTop,0);assert.deepEqual(visible(),['google']);
 assert.equal(d.querySelector('[data-jump143176=google]').getAttribute('aria-current'),'page');assert.equal(d.querySelector('[data-jump143176=accounting]').getAttribute('aria-current'),'false');
 w.settingsStack143176.openDefault();assert.deepEqual(visible(),['business']);assert.equal(d.querySelector('.tab-content.active').id,'settings-business');assert(f.painted.includes('settings-business'),'shared banner painter receives the active settings tab');
 w.settingsStack143176.open('organization');assert.deepEqual(visible(),['organization']);
 w.settingsStack143176.open('payroll');w.settingsStack143176.open('accounting');f.blocked.add('settings-payroll');const form=d.querySelector('[data-settings-group=payroll]');form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(d.querySelector('.tab-content.active').id,'settings-payroll');assert(!f.saves.includes('payroll'),'inactive read-only form submission remains blocked');
 f.blocked.delete('settings-payroll');form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert(f.saves.includes('payroll'));
 f.denied.add('settings-tax');w.settingsStack143176.sync();assert(d.getElementById('settings-tax').hidden);assert(!d.querySelector('[data-jump143176=mandatory]'));w.settingsStack143176.open('mandatory');assert.notEqual(d.querySelector('.tab-content.active').id,'settings-tax');
 f.denied.clear();w.settingsStack143176.sync();assert(d.getElementById('settings-tax').hidden,'restoring permission does not show an unselected panel');assert(d.querySelector('[data-jump143176=mandatory]'));
 // A live organization repaint must be rewrapped without losing its new controls.
 const org=d.getElementById('settings-organization14229');org.innerHTML='<button id="fresh-org">Edit reporting</button>';await pause();assert(d.getElementById('fresh-org').closest('.settings-stack-section143176'));
 const switchBefore=w.switchTab;w.switchTab=id=>{if(id===org.id)org.innerHTML='<button>Updated reporting</button>';switchBefore(id);};w.settingsStack143176.open('organization');await pause();assert.deepEqual(visible(),['organization'],'the replacement section remains selected after the entry lifecycle');assert.match(d.getElementById('settingsSection143176-organization').textContent,/Updated reporting/);w.switchTab=switchBefore;
 // Settings entry follows the real sidebar route and falls back for restricted accounts.
 w.eval(fs.readFileSync('src/settings/application/settings-groups14332.js','utf8'));w.groupedNavigation14378.render();d.querySelector('#nav-module-settings .nav-header').click();assert.deepEqual(visible(),['business']);
 f.denied.add('settings-business');w.settingsStack143176.sync();w.settingsStack143176.openDefault();assert.deepEqual(visible(),['users']);f.denied.clear();w.settingsStack143176.sync();
 const dock=d.querySelector('.settings-stack-workspace143176');dock.prepend(d.getElementById('categoryTabShell'),d.querySelector('.module-header'));
 w.innerWidth=390;d.documentElement.dataset.device132='phone';w.settingsStack143176.sync();assert.equal(d.querySelectorAll('.settings-stack-workspace143176').length,0);assert(d.getElementById('categoryTabShell'));assert(d.querySelector('.module-header'));assert.equal(input.value,'UNSAVED');assert.equal(d.querySelectorAll('.settings-stack-section143176').length,0);assert.equal(inputs.filter(n=>n.isConnected).length,before);inputs.forEach((n,i)=>assert.equal(n.form,forms[i],'form ownership retained'));assert.equal(input.closest('form').dataset.settingsGroup,'accounting');assert.equal(d.getElementById('prefix-test').form,input.form);assert.equal(new w.FormData(input.form).get('automatedPrefix'),'AUTO');assert.equal(d.getElementById('settings-accounting').parentElement.id,'printableDocArea');
 w.innerWidth=1440;d.documentElement.dataset.device132='desktop';w.settingsStack143176.sync();assert.equal(d.querySelectorAll('.settings-stack-workspace143176').length,3);assert.equal(input.value,'UNSAVED');
 d.querySelector('.tab-content.active').classList.remove('active');d.getElementById('accounts-modular-container').classList.add('active');await pause();assert([...d.querySelectorAll('.settings-stack-workspace143176')].every(n=>n.hidden),'account navigation without page113 hides settings');
 w.switchTab('dashboard');assert([...d.querySelectorAll('.settings-stack-workspace143176')].every(n=>n.hidden));
 await pause();f.dom.window.close();const phone=await fixture(390);assert.equal(phone.d.querySelectorAll('.settings-stack-workspace143176').length,0);phone.dom.window.close();console.log('PASS all nine panels; accounting sections; original controls/forms/listeners; unsaved edits; single-section navigation and scroll isolation; inactive-panel permission gates; permission changes; dynamic panels and default Settings entry; phone restoration; navigation away');
})().catch(e=>{console.error(e);process.exitCode=1});
