// Browser regression for the two calendar editors, the HR attendance status and paid-day calculation.
const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox']});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://calendar.invalid/**', route => route.fulfill({contentType:'text/html',body:'<!DOCTYPE html><title>Calendar fixture</title>'}));
    await page.goto('https://calendar.invalid/');
    await page.evaluate(() => {
      window.liveProfile = {id:'admin',role:'admin',status:'active'};
      window.Work82 = {owner:'admin',loaded:true,leaves:[],employees:[
        {id:'a',data:{name:'Employee A'}},{id:'b',data:{name:'Employee B',employmentStatus:'probationary'}}
      ]};
      window.orderedEmployees82 = () => Work82.employees;
      window.ApplicationSettings = {payroll:{nonWorkDays99:[0,6]}};
      window.formatAppDate = String;
      window.escapeHtml = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
      window.payroll95 = {legends:()=>[], parseMark:()=>({minutes:0,rule:null})};
      window.beforeEmployment234 = () => false;
      window.ojmDb = {auth:{getSession:async()=>({data:{session:null}})},from(table){
        const result = (payload,id) => {
          const chain = {eq:()=>chain, select:async()=>({data:[{...payload,id}]})};
          return chain;
        };
        return {insert:p=>result(p,p.id||'manual'),update:p=>result(p,table==='hr_calendar_settings14306'?true:'manual')};
      }};
    });
    for(const file of ['src/shared/ui/workforce-forms-v82.js','scripts/hr-calendar-model14306.js','scripts/hr-calendar14306.js',
      'scripts/hr-calendar-news14309.js','src/payroll/workspace/payroll-v99.js','src/bridges/hr-payroll/attendance-v96/approved-leave-and-days.js']){
      await page.addScriptTag({path:path.join(root,file)});
    }
    await page.evaluate(() => {
      HRCalendarModel14306.today = ()=>'2026-12-31';
      Object.assign(hrCalendar14306.state,{owner:'admin',ready:true,month:'2026-12',
        settings:{id:true,version:1,data:HRCalendarModel14306.scheduleDefaults(ApplicationSettings.payroll)}});
      // A previously approved notification already grants this public holiday to everyone.
      hrCalendar14306.state.settings.data.approvedCalendarNews14309=[{
        id:'published-national-day',type:'holiday',effect:'off',status:'scheduled',title:'National Day',
        start:'2026-12-02',end:'2026-12-02',publicHoliday:true,newsRevision14309:'2026-11-18T00:00:00Z'
      }];
      window.statusFor = (date,run={status:'draft',month:date.slice(0,7)}) => Work82.employees.map(e=>{
        const row={employeeId:e.id,employee:e.data,input:{attendance:[]}};
        return payrollAttendanceStatus246(run,row,{date,weekday:new Date(date+'T00:00:00Z').getUTCDay()}).kind;
      });
    });
    const save = async () => {
      await page.locator('dialog button[type=submit]').click();
      await page.locator('dialog').waitFor({state:'detached',timeout:3000});
    };
    await page.evaluate(()=>hrCalendar14306.addHoliday('2026-12-02').then(()=>true));
    await page.locator('[name=title]').fill('Company National Day');
    assert(await page.getByLabel('Employee B · Probationary').isChecked());
    await page.getByLabel('Employee B · Probationary').uncheck();
    await save();
    assert.deepEqual(await page.evaluate(()=>statusFor('2026-12-02')),['Holiday','Present']);
    assert.deepEqual(await page.evaluate(()=>Work82.employees.map(e=>calendarPaidDays246({month:'2026-12'}, {employeeId:e.id,employee:e.data,input:{attendance:[]}}))),[1,0]);
    await page.evaluate(()=>{window.frozen={status:'finalized',month:'2026-12',calendarSnapshot14306:hrCalendar14306.snapshot()};hrCalendar14306.editEvent('manual')});
    assert(!await page.getByLabel('Employee B · Probationary').isChecked());
    await page.getByLabel('Employee A').uncheck();
    await save();
    assert.deepEqual(await page.evaluate(()=>statusFor('2026-12-02')),['Present','Present']);
    assert.deepEqual(await page.evaluate(()=>statusFor('2026-12-02',frozen)),['Holiday','Present']);
    await page.evaluate(()=>{hrCalendar14306.editEvent('manual')});
    await page.getByLabel('Everyone',{exact:true}).check();
    await save();
    assert.deepEqual(await page.evaluate(()=>statusFor('2026-12-02')),['Holiday','Holiday']);
    await page.evaluate(()=>{
      const proposal={id:'community-day',title:'Community Day',location:'City',category:'community',summary:'Community gathering',sources:[{name:'Fixture',url:'https://example.org',language:'en'}],start:'2026-12-08',end:'2026-12-08',revision:'2026-11-20T00:00:00Z'};
      hrCalendarNews14309.state.feed={items:[proposal]};hrCalendarNews14309.review(proposal.id);
    });
    await page.locator('[name=effect]').selectOption('paid');
    await page.getByLabel('Employee A').uncheck();
    await page.locator('[name=verified]').check();
    await save();
    assert.deepEqual(await page.evaluate(()=>statusFor('2026-12-08')),['Present','Holiday']);
    await page.evaluate(()=>{hrCalendarNews14309.review('community-day')});
    assert.match(await page.locator('dialog h3').innerText(),/Edit holiday/);
    assert(!await page.getByLabel('Employee A').isChecked());
    await page.getByLabel('Employee A').check();
    await page.getByLabel('Employee B · Probationary').uncheck();
    await save();
    assert.deepEqual(await page.evaluate(()=>statusFor('2026-12-08')),['Holiday','Present']);
    assert.deepEqual(errors,[]);
    console.log('PASS manual and notified holidays, probation selection, empty/all, reopening, public holiday overlap, HR attendance, paid-day counts and finalized snapshots.');
  } finally {await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
