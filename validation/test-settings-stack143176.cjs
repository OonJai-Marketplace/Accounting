const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('desktop.html','utf8');
const pause=()=>new Promise(r=>setTimeout(r,30));
async function fixture(width=1440){
 const dom=new JSDOM(html,{url:'https://fixture.invalid/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
 w.innerWidth=width;d.documentElement.dataset.device132=width<641?'phone':'desktop';w.liveProfile={id:'test-admin'};w.ApplicationSettings={accounting:{baseCurrency:'LAK',fiscalYearStart:'01',journalPrefix:'OJM'},payroll:{payFrequency:'monthly'},system:{dateFormat:'DD/MM/YYYY'},printing:{paperSize:'A4'}};w.CurrencyStore={currencies:[{code:'LAK'},{code:'USD'},{code:'THB'}]};w.BusinessSettings={current:{companyName:'Fixture',timezone:'Asia/Vientiane'}};
 const denied=new Set(),blocked=new Set();w.access113={can:(id,action='view')=>!denied.has(id)&&!(action==='edit'&&blocked.has(id))};w.settingsGroups14332={accountingSection:'accounting',render(){}};
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
 w.switchTab('settings-accounting');w.eval(fs.readFileSync('src/settings/application/settings-stack143176.js','utf8'));await pause();return {w,d,dom,denied,blocked,seen,saves};
}
(async()=>{
 const f=await fixture(),{w,d}=f;
 assert.equal(d.querySelectorAll('.settings-stack-workspace143176').length,3);
 assert.equal(d.querySelectorAll('[data-settings-stack-panel143176]').length,9);
 for(const key of ['accounting','currency','vouchers','google','payroll','mandatory','business','users','organization','preferences','printing','settings-backup','recovery'])assert(d.getElementById('settingsSection143176-'+key),key);
 const inputs=[...d.querySelectorAll('[data-settings-stack-panel143176] input,[data-settings-stack-panel143176] select,[data-settings-stack-panel143176] textarea')],forms=inputs.map(n=>n.form),before=inputs.length;
 const input=d.querySelector('[name=journalPrefix]');input.value='UNSAVED';let calls=0;input.addEventListener('change',()=>calls++);
 w.settingsStack143176.open('payroll');w.settingsStack143176.open('mandatory');w.settingsStack143176.open('accounting');assert.equal(input.value,'UNSAVED');input.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(calls,1);
 const payroll=d.getElementById('settingsSection143176-payroll'),sum=payroll.querySelector('summary');payroll.open=false;sum.click();assert(payroll.open,'inactive summary opens once');sum.click();assert(!payroll.open,'summary closes');
 w.settingsStack143176.open('payroll');w.settingsStack143176.open('accounting');f.blocked.add('settings-payroll');const form=d.querySelector('[data-settings-group=payroll]');form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(d.querySelector('.tab-content.active').id,'settings-payroll');assert(!f.saves.includes('payroll'),'inactive read-only form submission remains blocked');
 f.blocked.delete('settings-payroll');form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert(f.saves.includes('payroll'));
 f.denied.add('settings-tax');w.settingsStack143176.sync();assert(d.getElementById('settings-tax').hidden);assert(!d.querySelector('[data-jump143176=mandatory]'));w.settingsStack143176.open('mandatory');assert.notEqual(d.querySelector('.tab-content.active').id,'settings-tax');
 f.denied.clear();w.settingsStack143176.sync();assert(!d.getElementById('settings-tax').hidden);assert(d.querySelector('[data-jump143176=mandatory]'));
 // A live organization repaint must be rewrapped without losing its new controls.
 const org=d.getElementById('settings-organization14229');org.innerHTML='<button id="fresh-org">Edit reporting</button>';await pause();assert(d.getElementById('fresh-org').closest('details'));
 const dock=d.querySelector('.settings-stack-workspace143176');dock.prepend(d.getElementById('categoryTabShell'),d.querySelector('.module-header'));
 w.innerWidth=390;d.documentElement.dataset.device132='phone';w.settingsStack143176.sync();assert.equal(d.querySelectorAll('.settings-stack-workspace143176').length,0);assert(d.getElementById('categoryTabShell'));assert(d.querySelector('.module-header'));assert.equal(input.value,'UNSAVED');assert.equal(d.querySelectorAll('.settings-stack-section143176').length,0);assert.equal(inputs.filter(n=>n.isConnected).length,before);inputs.forEach((n,i)=>assert.equal(n.form,forms[i],'form ownership retained'));assert.equal(input.closest('form').dataset.settingsGroup,'accounting');assert.equal(d.getElementById('prefix-test').form,input.form);assert.equal(new w.FormData(input.form).get('automatedPrefix'),'AUTO');assert.equal(d.getElementById('settings-accounting').parentElement.id,'printableDocArea');
 w.innerWidth=1440;d.documentElement.dataset.device132='desktop';w.settingsStack143176.sync();assert.equal(d.querySelectorAll('.settings-stack-workspace143176').length,3);assert.equal(input.value,'UNSAVED');
 d.querySelector('.tab-content.active').classList.remove('active');d.getElementById('accounts-modular-container').classList.add('active');await pause();assert([...d.querySelectorAll('.settings-stack-workspace143176')].every(n=>n.hidden),'account navigation without page113 hides settings');
 w.switchTab('dashboard');assert([...d.querySelectorAll('.settings-stack-workspace143176')].every(n=>n.hidden));
 await pause();f.dom.window.close();const phone=await fixture(390);assert.equal(phone.d.querySelectorAll('.settings-stack-workspace143176').length,0);phone.dom.window.close();console.log('PASS all nine panels; accounting sections; original controls/forms/listeners; unsaved edits; accordion navigation; inactive-panel permission gates; permission changes; dynamic panels; phone restoration; navigation away');
})().catch(e=>{console.error(e);process.exitCode=1});
