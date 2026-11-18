/* Shared dialogs, navigation, safe record actions and contract-date leave accrual. */
(function(){'use strict';
const esc=v=>escapeHtml(String(v??''));
function modal(title,html,buttons=[{label:'Close',value:false}],wide=false){return new Promise(resolve=>{const prior=document.activeElement,root=document.createElement('div');root.className='ui-overlay108';root.innerHTML=`<section class="ui-dialog108 ${wide?'wide':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><h3>${esc(title)}</h3><button type="button" data-dismiss aria-label="Close">×</button></header><div class="ui-body108">${html}</div><footer></footer></section>`;const done=value=>{root.remove();prior?.isConnected&&prior.focus?.();resolve(value)};root.querySelector('[data-dismiss]').onclick=()=>done(false);buttons.filter(item=>!(/^(close|done)$/i.test(item.label)&&item.value===false)).forEach(item=>{const b=document.createElement('button');b.type='button';b.textContent=item.label;b.className=item.primary?'primary108':item.danger?'danger108':'';b.onclick=()=>done(item.value);root.querySelector('footer').append(b)});root.addEventListener('pointerdown',e=>{if(e.target===root)done(false)});root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();done(false)}if(e.key==='Tab'){const list=[...root.querySelectorAll('button,input,select,textarea,a[href]')].filter(n=>!n.disabled&&n.getClientRects().length);const a=list[0],z=list.at(-1);if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}});document.body.append(root);(root.querySelector('footer button')||root.querySelector('[data-dismiss]'))?.focus();root.resolve108=done})}
window.ui108={modal,confirm:(title,message)=>modal(title,`<p>${esc(message)}</p>`,[{label:'Cancel',value:false},{label:'Delete',value:true,danger:true}]),esc};
// Annual vacation is earned on each completed service month. Each year's
// entitlement has its own expiry, so unused grace never becomes new accrual.
window.vacationLedger = (() => {
  const date = value => new Date(value+'T00:00:00Z');
  const iso = d => d.toISOString().slice(0,10);
  function addMonths(start,n) {
    const d=date(start), day=d.getUTCDate();
    d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth()+n);
    const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
    d.setUTCDate(Math.min(day,last)); return iso(d);
  }
  function calculate(start,annual,grace,through,usage,opening=[]) {
    const events=new Map(), buckets=opening.map(b=>({...b,carry:true})), byYear=new Map();
    const round=n=>Math.round((n+Number.EPSILON)*100)/100;
    const add=(day,field,n)=>{
      const row=events.get(day)||{earned:[],used:0};
      if(field==='earned') row.earned.push(n); else row.used+=n;
      events.set(day,row);
    };
    function bucket(year){
      if(!byYear.has(year)){
        const end=addMonths(start,(year+1)*12);
        const months=typeof grace==='function'?grace(end):grace;
        const item={year,end,expiry:addMonths(start,(year+1)*12+months),amount:0};
        byYear.set(year,item);buckets.push(item);
      }
      return byYear.get(year);
    }
    let yearStart=start,expired=0;
    for(let month=1;;month++){
      const anniversary=addMonths(start,month);
      // The twelfth instalment is available on the final service day of its year.
      const day=month%12===0?iso(new Date(+date(anniversary)-86400000)):anniversary;
      if(day>through)break;
      const part=(month-1)%12+1;
      add(day,'earned',{year:Math.floor((month-1)/12),days:round(annual*part/12)-round(annual*(part-1)/12)});
      if(month%12===0&&anniversary<=through)yearStart=anniversary;
    }
    for(const row of usage)if(row.date>=start&&row.date<=through)add(row.date,'used',Number(row.days));
    add(through,'used',0);
    for(const [day,row] of [...events].sort(([a],[b])=>a.localeCompare(b))){
      for(const credit of row.earned)bucket(credit.year).amount+=credit.days;
      for(const item of buckets)if(item.expiry<=day&&item.amount>0){expired+=item.amount;item.amount=0;}
      let debit=row.used;
      for(const item of [...buckets].sort((a,b)=>a.expiry.localeCompare(b.expiry))){
        if(item.expiry<=day||debit<=0)continue;
        const spend=Math.min(Math.max(0,item.amount),debit);item.amount-=spend;debit-=spend;
      }
      if(debit>0){
        let year=0;while(addMonths(start,(year+1)*12)<=day)year++;
        bucket(year).amount-=debit;
      }
    }
    const carry=buckets.filter(b=>(b.carry||b.end<=through)&&b.expiry>through&&round(b.amount)>0);
    const used=usage.filter(r=>r.date>=yearStart&&r.date<=through).reduce((n,r)=>n+Number(r.days),0);
    return {available:round(buckets.reduce((n,b)=>n+b.amount,0)),used:round(used),expired:round(expired),yearStart,carry};
  }
  function graceAt(d,end){
    const history=d.vacationGraceHistory;
    if(Array.isArray(history))return history.filter(x=>x.from<=end).at(-1)?.months||0;
    return d.vacationGraceEnabled?Number(d.vacationGraceMonths)||0:0;
  }
  function leaveLines(d){
    if(d.type!=='vacation'||!d.days)return [];
    if(Array.isArray(d.dayFractions))return d.dayFractions.map((days,i)=>({date:HRCalendarModel14306.addDays(d.from,i),days})).filter(x=>x.days>0);
    const basis=d.calendarBasis14306, result=[];
    let total=0;
    for(let day=d.from;day<=d.to;day=HRCalendarModel14306.addDays(day,1)){
      const n=HRCalendarModel14306.dayInfo(day,d.employeeId,basis?.settings||window.hrCalendar14306?.config?.(),basis?.events||window.hrCalendar14306?.state.rows||[],ApplicationSettings.payroll).fraction;
      if(n>0){result.push({date:day,days:n});total+=n;}
    }
    if(!total)return [{date:d.from,days:Number(d.days)}];
    return result.map(x=>({...x,days:x.days*Number(d.days)/total}));
  }
  function balance(employee,through,extra=[],excludeRun=''){
    const d=employee.data||employee,id=employee.id||d.employeeId;
    const start=d.contractStart||(d.contracts99||[]).filter(c=>c.start&&c.start<=through).map(c=>c.start).sort().at(-1)||d.renewal;
    if(!/^\d{4}-\d\d-\d\d$/.test(start||''))return null;
    const grace=end=>graceAt(d,end);
    const usage=Work82.leaves.filter(r=>r.data.employeeId===id&&r.data.status==='approved'&&r.data.type==='vacation').flatMap(r=>leaveLines(r.data));
    const loaded=new Set(Work82.runs.map(r=>r.id));
    for(const r of Work82.runs.filter(r=>r.id!==excludeRun&&r.data.status==='finalized'&&!r.data.isSample))
      for(const row of (r.data.results||[]).filter(x=>x.employeeId===id))
        for(const a of row.attendance95||[])if(!a.linked&&a.leaveType==='vacation')usage.push({date:a.date,days:Number(a.scheduleFraction??1)});
    for(const r of Work82.leaveCarry14334||[])if(r.runId!==excludeRun&&!loaded.has(r.runId)&&r.employeeId===id&&r.type==='vacation')usage.push({date:r.date,days:Number(r.days)});
    const opening=[];
    for(const p of d.leaveHistory200?.closedPeriods||[]){
      if(p.end>=start||!p.endConfirmed||!p.end)continue;
      const expiry=addMonths(HRCalendarModel14306.addDays(p.end,1),grace(HRCalendarModel14306.addDays(p.end,1)));
      if(expiry>start)opening.push({expiry,amount:Math.max(0,Number(p.vacationAtClose??Math.min(Number(p.remainingAgainstAllowance?.vacation)||0,window.leaveAccrual108(p.sourcePeriodDate,p.end,Number(p.allowance?.vacation)||0)-Number(p.used?.vacation||0)))||0)});
    }
    return calculate(start,Number(d.vacation??15),grace,through,usage.concat(extra),opening.sort((a,b)=>a.expiry.localeCompare(b.expiry)));
  }
  function check(employee,extra,excludeRun){
    for(const day of [...new Set(extra.map(x=>x.date))].sort()){
      const row=balance(employee,day,extra,excludeRun);
      if(!row||row.available<0)throw Error('Insufficient accrued vacation on '+day+'. Check Leave entitlements and grace for this employee.');
    }
  }
  return {calculate,balance,leaveLines,check};
})();

window.leaveAccrual108=function(start,asOf=today82(),annual=15){if(!/^\d{4}-\d{2}-\d{2}$/.test(start||'')||asOf<start)return 0;const [y,m,d]=start.split('-').map(Number),[ay,am,ad]=asOf.split('-').map(Number);let months=(ay-y)*12+am-m;const anniversary=Math.min(d,new Date(ay,am,0).getDate());if(ad<anniversary)months--;return Math.round(Math.max(0,months)*Number(annual)/12*100)/100};
leaveSummary82=function(e){const d=e.data,asOf=today82(),start=d.contractStart||(d.contracts99||[]).filter(c=>c.start&&c.start<=asOf).map(c=>c.start).sort().at(-1)||d.renewal,leaves=Work82.leaves.filter(r=>r.data.employeeId===e.id&&r.data.status==='approved'&&r.data.from>=start),used=k=>leaves.filter(r=>r.data.type===k||(k==='sick'&&r.data.type==='minorSick')).reduce((s,r)=>s+Number(r.data.days||0),0)+(window.payroll95?.usedLegendLeave(e.id,k,start)||0),v=vacationLedger.balance(e,asOf);return [esc(d.name),leaveDayNumber466(v?.available||0)+(v?.carry.length?'<br><small>'+v.carry.map(b=>leaveDayNumber466(b.amount)+' through '+esc(formatAppDate(HRCalendarModel14306.addDays(b.expiry,-1)))).join('<br>')+'</small>':''),leaveDayNumber466(v?.used||0),leaveDayNumber466(used('sick')),leaveDayNumber466(used('personal')),leaveDayNumber466(used('bereavement')),esc(v?formatAppDate(v.yearStart):'Set contract start')]};
window.deleteWork108=async function(kind,id){const actor=liveProfile?.id,db=ojmDb,current=()=>actor===liveProfile?.id&&db===ojmDb;const r=Work82[kind]?.find(r=>r.id===id);if(!r)return;const name=r.data.name||r.data.reference||r.data.title||r.data.from||'record';const linked=kind==='employees'&&(window.payrollWindow14334?.hasEmployee(id)||Work82.leaves.some(l=>l.data.employeeId===id)||Work82.runs.some(p=>p.data.rows?.some(x=>x.employeeId===id))||r.data.contracts99?.length||r.data.assessments99?.length);if(kind==='leaves'&&r.data.status==='approved'){await modal('Approved leave','<p>Cancel the approved leave before deleting it. Leave used in finalized payroll remains protected.</p>');return}if(kind==='runs'&&r.data.status==='finalized'){await modal('Finalized payroll','<p>This finalized calculation is preserved. Use a correction in the next payroll period and reverse any related posted journal through Transactions.</p>');return}const yes=await modal(linked?'Archive employee':'Delete record',`<p>${esc(linked?name+' has linked history. Archive the employee while preserving records?':'Permanently delete '+name+'?')}</p>`,[{label:'Cancel',value:false},{label:linked?'Archive':'Delete',value:true,danger:true}]);if(!yes||!current())return;return runAction82(async()=>{if(!current())return;if(linked){await saveWork82('employees',{...r.data,active:false},r)}else{const out=await db.rpc('delete_record108',{p_table:tables82[kind],p_id:id,p_version:r.version});if(!current())return;if(out.error)throw Error(out.error.message+' See setup/SETUP-GUIDE-v142.20.txt if the function is missing.');Work82[kind]=Work82[kind].filter(x=>x.id!==id);if(kind==='runs'&&Work82.runRecord?.id===id){Work82.run=null;Work82.runRecord=null}}if(current())renderWork82()})};
const oldAction=action82;action82=function(label,fn,primary){let html=oldAction(label,fn,primary);const m=fn.match(/^(openEmployee82|openRun82|openReport82)\('([^']+)'\)/);if(m)html+=oldAction('Delete',`deleteWork108('${{openEmployee82:'employees',openRun82:'runs',openReport82:'reports'}[m[1]]}','${m[2]}')`);return html};
const formBefore=employeeForm82;employeeForm82=function(r){return formBefore(r).replace('Contract renewal / entitlement start','Contract start / entitlement start').replace('Vacation allowance (days)','Annual vacation allowance (days)').replace(!r?.data?'name="vacation" type="number" value="0"':'__never__','name="vacation" type="number" value="15"')};
// Forms remain open until an explicit action; no idle collapse timer.
function arm(form){if(!form||form.dataset.watched1440)return;form.dataset.watched1440='1';for(const type of ['input','change'])form.addEventListener(type,()=>form.dataset.dirty108='true');}
window.armNewForm108=arm;
window.traceSchedule108=function(node){node.querySelector('.schedule-trace108')?.remove();node.classList.remove('schedule-focus89','schedule-focus91');const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','schedule-trace108');svg.setAttribute('aria-hidden','true');svg.innerHTML='<rect x="2" y="2" width="calc(100% - 4px)" height="calc(100% - 4px)" rx="7" pathLength="100"/>';node.append(svg);setTimeout(()=>svg.remove(),10000)};
function shortcuts(){
 let dock=document.getElementById('workspaceTools108');
 if(!dock){
  dock=document.createElement('div');dock.id='workspaceTools108';dock.className='no-print';document.body.append(dock);
  const audit=document.getElementById('auditMode101');
  if(audit){dock.append(audit);audit.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10" cy="10" r="7"/><path d="m15 15 7 7M6 10l3 3 5-6"/></svg>';audit.title='Audit current tables';audit.setAttribute('aria-label',audit.title)}
 }
 const active=document.querySelector('.tab-content.active');
 dock.hidden=!liveProfile;
 const audit=document.getElementById('auditMode101');
 if(audit)audit.hidden=!active?.querySelector('table')||active.id==='document-editor105';
 window.updateDashboardDock112?.();
}
function searchInstall(){
 document.querySelector('.universal-search97')?.remove();
 const box=document.createElement('div');box.className='universal-search108';box.innerHTML='<input type="search" name="app-navigation-query" autocomplete="off" autocapitalize="off" spellcheck="false" readonly data-lpignore="true" data-1p-ignore aria-label="Search entire system" placeholder="Search entire system…"><div hidden></div>';
 document.getElementById('nav-module-dashboard')?.before(box);
 const input=box.firstChild,list=box.lastChild;for(const event of ['pointerdown','focus'])input.addEventListener(event,()=>{input.readOnly=false});let timer,revision=0;
 if(document.documentElement.dataset.device132==='desktop'){
  const button=document.createElement('button');
  button.type='button';
  button.className='rail-search-button';
  button.setAttribute('aria-label','Search');
  box.id='railSearchPanel';
  button.setAttribute('aria-controls',box.id);
  button.setAttribute('aria-expanded','false');
  button.innerHTML='<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/></svg>';
  box.before(button);
  function closeSearch(){
   if(!box.classList.contains('rail-search-open'))return;
   box.classList.remove('rail-search-open');
   button.setAttribute('aria-expanded','false');
   clearTimeout(timer);revision++;list.hidden=true;input.value='';
  }
  button.onclick=()=>{
   if(box.classList.contains('rail-search-open')){closeSearch();return;}
   box.style.setProperty('--rail-search-top',Math.max(4,button.getBoundingClientRect().top)+'px');
   box.classList.add('rail-search-open');
   button.setAttribute('aria-expanded','true');
   input.focus();
  };
  box.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();closeSearch();button.focus();}
  });
  box.addEventListener('click',event=>{if(event.target.closest('button'))closeSearch();});
  box.addEventListener('focusout',event=>{if(event.relatedTarget&&!box.contains(event.relatedTarget)&&event.relatedTarget!==button)closeSearch();});
  document.addEventListener('pointerdown',event=>{if(!box.contains(event.target)&&!button.contains(event.target))closeSearch();});
  window.addEventListener('page113',closeSearch);
  window.addEventListener('resize',closeSearch);
 }
 input.oninput=()=>{clearTimeout(timer);const generation=++revision;timer=setTimeout(()=>{
  const actor=liveProfile?.id,db=ojmDb,q=input.value.trim().toLowerCase(),results=[];
  const current=()=>generation===revision&&actor===liveProfile?.id&&db===ojmDb&&input.isConnected&&input.value.trim().toLowerCase()===q;
  list.replaceChildren();list.hidden=!q;if(!q)return;
  const permitted=id=>!!document.getElementById(id)&&canAccessAppTarget(id);
  const matches=value=>q.split(/\s+/).every(word=>String(value).toLowerCase().includes(word));
  const add=(group,label,fn,terms='')=>{if(matches(label+' '+terms))results.push({group,label,fn})};
  const go=(root,element)=>{if(!permitted(root.id)||!element.isConnected)return;switchTab(root.id);const key=element.closest('[data-settings-section143176]')?.dataset.settingsSection143176;if(key)window.settingsStack143176?.open(key);for(let n=element.parentElement;n&&n!==root;n=n.parentElement)if(n.tagName==='DETAILS')n.open=true;element.scrollIntoView({block:'center'});element.animate?.([{outline:'3px solid #bd8845'},{outline:'3px solid transparent'}],{duration:1800});};
  // Index the live Settings sections and controls, including extensions added later.
  const aliases={installation:'website update version release install handover deployment',google:'Google Sheets database connection receipts',appearance:'logo banner branding quotations images',preferences:'date number format opening page text size',printing:'print paper header footer',recovery:'recovery emergency credentials password',mandatory:'tax PIT SSO VAT statutory'};
  for(const root of document.querySelectorAll('.tab-content[id^="settings-"]')){
   if(!permitted(root.id))continue;
   for(const el of root.querySelectorAll('.settings-stack-heading143176 strong,h2,h3,h4,button,label')){
    if(el.closest('.permission-hidden')||el.matches('[type=submit]'))continue;
    const label=(el.tagName==='LABEL'?[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' '):el.textContent).replace(/\s+/g,' ').trim();
    if(!label||label.length>90||/^(save|close|delete|cancel|edit|add|remove|reset)$/i.test(label))continue;
    const key=el.closest('[data-settings-section143176]')?.dataset.settingsSection143176;
    add('Settings',label,()=>go(root,el),el.matches('strong,h2,h3,h4')?aliases[key]||'':'');
   }
  }
  add('Tools','Sync / Connection details',()=>window.offline14239?.open(),'synchronize database pending uploads offline');
  document.querySelectorAll('#appSidebar .tab-btn').forEach(b=>{const target=(b.getAttribute('onclick')||'').match(/(?:switchTab|openDocumentEditor105)\('([^']+)'/);if(b.hidden||b.closest('[hidden],.permission-hidden')||target&&!permitted(target[1]))return;add('Pages',b.textContent,()=>b.click())});
  if(admin82()){
   if(permitted('payroll-employees'))Work82.employees.forEach(r=>add('Employees',r.data.name,()=>{switchTab('payroll-employees');openEmployee82(r.id)}));
   if(permitted('journal'))JournalModule.entries.forEach(r=>add('Transactions',r.id+' · '+r.memo,()=>{switchTab('journal');showJournalSource69(encodeURIComponent(r.id))}));
   AccountingStore.accounts.forEach(r=>add('Accounts',r.code+' · '+r.name,()=>scrollToAccountModule('sec-chart-accounts')));
   Work82.reports.forEach(r=>add('Reports',r.data.title||r.data.reference||r.data.kind,()=>openReport82(r.id)));
  }
  const render=()=>{if(!current())return;list.replaceChildren();const seen=new Set();for(const r of results){const key=r.group+r.label;if(seen.has(key))continue;seen.add(key);if(seen.size>25)break;const b=document.createElement('button');b.type='button';const group=document.createElement('small'),label=document.createElement('span');group.textContent=r.group;label.textContent=r.label;b.append(group,label);b.onclick=()=>{list.hidden=true;if(current())r.fn()};list.append(b)}if(!list.children.length){const empty=document.createElement('p');empty.setAttribute('role','status');empty.textContent='No matching pages or loaded records. Try another name or keyword.';list.append(empty)}};
  // Navigation and loaded records never wait for an unrelated database download.
  render();
  if(navigator.onLine&&admin82()&&q.length>=2&&permitted('document-editor105'))Promise.resolve(db.from('company_documents105').select('id,data,version').ilike('data->>title','%'+q.replace(/[%_]/g,'')+'%').limit(10)).then(out=>{if(!current()||out.error)return;for(const r of out.data||[])add('Documents',r.data.title,()=>openDocumentEditor105({savedRecord:r}));render()}).catch(()=>{});
 },140)};
 input.onkeydown=e=>{if(e.key==='Escape'){revision++;list.hidden=true}if(e.key==='ArrowDown')list.querySelector('button')?.focus()};document.addEventListener('pointerdown',e=>{if(!box.contains(e.target))list.hidden=true});
}
function polish(){shortcuts();const active=document.querySelector('.tab-content.active');if(!active)return;active.querySelectorAll('button[onclick^="leaveStatus82"]').forEach(b=>{const row=b.closest('tr');if(!row||row.querySelector('[data-leave-delete108]'))return;const id=b.getAttribute('onclick').match(/'([^']+)'/)?.[1];if(!id)return;const del=document.createElement('button');del.type='button';del.dataset.leaveDelete108='1';del.textContent='Delete';del.onclick=()=>deleteWork108('leaves',id);b.parentElement.append(del)});const leave=active.querySelector('#leaveForm82');if(leave&&!leave.closest('#leaveEditor95')&&!leave.dataset.collapsed108){leave.dataset.collapsed108='1';leave.hidden=true;const add=document.createElement('button');add.type='button';add.textContent='Add Leave Request';add.className='primary82';add.onclick=()=>{leave.hidden=!leave.hidden;if(!leave.hidden)arm(leave,()=>leave.hidden=true,true)};const head=active.querySelector('.work82>header .actions82');head?.append(add);head?.closest('header').after(leave);}const emp=active.querySelector('#employeeForm82');if(emp&&!Work82.employee?.id)arm(emp,()=>{Work82.employee=null;renderWork82()});const schedule=document.getElementById('scheduledForm91');if(schedule&&!schedule.elements.start.disabled)arm(schedule,()=>closeScheduledEditor91());}
// Audit and deletion summaries share the bounded audit_page143198 request.

const showEntry=window.showJournalEntry98;window.showJournalEntry98=function(show=true,...args){const out=showEntry.call(this,show,...args);if(show&&!JournalModule.editingEntryId)arm(document.getElementById('journalEntry98'),()=>showEntry(false,false),true);return out};
const sw=switchTab;window.switchTab=function(...args){const out=sw.apply(this,args);document.body.classList.toggle('document-work108',args[0]==='document-editor105');polish();return out};
function ready(){searchInstall();const brand=document.querySelector('.sidebar-brand');if(brand&&!(()=>{try{return localStorage.getItem('ojm_company_logo101')}catch{return null}})()){const monogram=document.createElement('span');monogram.className='brand-monogram108';monogram.textContent='OJ';monogram.setAttribute('aria-hidden','true');brand.prepend(monogram)}const footer=document.createElement('div');footer.className='sidebar-quote108';footer.textContent='Count with care. Serve with heart.';document.getElementById('appSidebar')?.append(footer);polish();let queued=false;new MutationObserver(rs=>{if(!rs.some(r=>[...r.addedNodes].some(n=>n.nodeType===1)))return;if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;polish()})}).observe(document.querySelector('.workspace-scroll')||document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})()