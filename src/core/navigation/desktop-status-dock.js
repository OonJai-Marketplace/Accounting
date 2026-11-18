// Login reads status once. Further database checks and snapshot refreshes are explicit.
(() => {
  'use strict';
  const host = document.createElement('div');
  host.id = 'desktopStatusDock';
  host.style.cssText = 'order:-10000;flex:none';
  const root = host.attachShadow({mode:'open'});
  root.innerHTML = `<style>
    :host{--pine:#194c38;--ink:#193e32;--mint:#9de9b7;--blue:#aed5dc;--sage:#c6d9ac;font:13px/1.35 Arial,sans-serif;color:var(--ink)}
    *,*::before,*::after{box-sizing:border-box}
    button{font:inherit;color:inherit;cursor:pointer}
    button:focus-visible{outline:2px solid #c49342;outline-offset:1px}
    button:disabled{cursor:default;opacity:.6}
    .shortcut-stack,.rail,.watch-tools{display:grid;gap:var(--rail-gap)}
    .rail{width:var(--rail-button)}
    .rail button,.tasks{appearance:none;margin:0;border:0;border-radius:8px;background:var(--pine);color:#fffaf1}
    .tasks{height:clamp(48px,min(34dvh,calc(100dvh - 10 * (var(--rail-button) + var(--rail-gap)) - 2 * var(--rail-clearance) - 8px)),330px);display:flex;align-items:stretch;justify-content:center;padding:6px 2px}
    .rail .lane{position:relative;min-width:0;flex:1;display:grid;justify-items:center;padding:6px 0}
    .line{position:relative;background:#547565;border-radius:1px;width:6px}
    .line i,.meter i{position:absolute;bottom:0;inset-inline:0;border-radius:inherit;height:var(--level);background:var(--tint)}
    .line::before{content:'';position:absolute;inset:0;z-index:1;pointer-events:none;
      background:repeating-linear-gradient(to top,transparent 0 calc(var(--step-size,102%) - 1px),var(--pine) calc(var(--step-size,102%) - 1px) var(--step-size,102%))}
    .level-thumb{position:absolute;z-index:2;left:50%;bottom:var(--level);transform:translate(-50%,50%);
      width:14px;height:5px;border-radius:1px;background:var(--tint);box-shadow:0 1px 0 #103728,0 -1px 0 #103728}
    .empty{width:100%;padding:0}
    .db{height:var(--rail-button);width:var(--rail-button);padding:0;display:grid;place-items:center}
    .db strong{font:700 15px/1 Arial;font-variant-numeric:tabular-nums;letter-spacing:-.6px}
    .db[data-flag=orange] strong{color:#ffc078}.db[data-flag=red] strong{color:#ffabae}
    .rail .db[data-health=red]{position:relative;background:#b4232e;color:white;box-shadow:0 0 0 2px #ffd4d7}
    .db[data-health=red] strong{color:white}
    .rail .db[data-health=amber]{background:#805b17}.db[data-health=amber] strong{color:white}
    .service{margin:8px 0;padding:10px;border:1px solid #cbd8ce;border-radius:6px;background:#edf5ee}
    .service[data-tone=red]{background:#fff0f1;border-color:#cb5861;color:#8d1d28}
    .service[data-tone=amber]{background:#fff6e6;border-color:#c6a05a;color:#705013}
    .service strong{display:block}.service p{margin:5px 0;font-size:12px;line-height:1.4}
    .service-time{font-size:11px}.service-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}
    .service-actions :is(a,button){display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:5px 9px;border:1px solid #aec1b3;border-radius:5px;background:white;color:#194c38;font:700 12px Arial;text-decoration:none}
    .service-actions a{background:#194c38;color:white;border-color:#194c38}.service-actions a:focus-visible{outline:2px solid #c49342;outline-offset:2px}
    .storage-caveat{font-size:11px;color:#705013;margin:5px 0}.summary{max-height:70dvh;overflow-y:auto}
    dialog{position:fixed;inset:max(8px,calc(100dvh - 648px)) 58px auto auto;margin:0;width:min(438px,calc(100vw - 76px));
      max-height:min(640px,calc(100dvh - 16px));overflow:hidden;border:1px solid #adbcae;border-radius:8px;padding:0;
      background:#fffdf7;color:var(--ink);box-shadow:0 6px 25px #102a222c;font:13px/1.35 Arial,sans-serif}
    dialog[open]{display:flex;flex-direction:column}
    .summary{flex:none;padding:12px 18px;border-bottom:1px solid #cdd8ce}
    .checklists{min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:14px 18px;scroll-padding-block:12px}
    dialog::backdrop{background:transparent}
    .row,.heading,.checks,.cellhead{display:flex;align-items:center;justify-content:space-between;gap:8px}
    h2{margin:0;font:700 18px/1.25 Arial}h3{font:700 13px/1.3 Arial;margin:0}
    .quiet,.count,.flags,.times,.notice{font-size:11px;color:#5d6b61}
    .quiet{margin:2px 0 12px;font-size:12px}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(158px,1fr));gap:6px 12px}
    .card{position:relative;display:flex;align-items:flex-start;gap:8px;border-top:1px solid #d9dfd6;padding:7px 0 2px}
    .meter{display:block;flex:none;position:relative;overflow:hidden;border-radius:4px;background:#d4ddd7;width:4px;height:46px}
    .copy{flex:1;min-width:0}.name{overflow-wrap:anywhere;font-size:12px;margin:2px 0}
    .cellhead{gap:2px;align-items:flex-start}.choose{flex:1;text-align:left;overflow-wrap:anywhere;min-width:0;border:0;background:transparent;font-weight:700;padding:2px 0;color:#205c46}
    .choose::after{content:'';position:absolute;inset:0}.cellhead .icon{position:relative;z-index:1}
    .choose:hover{text-decoration:underline}.card.selected .choose{text-decoration:underline;text-underline-offset:3px}
    .steps{margin-top:10px;padding:11px 12px;background:#edf2eb;border-radius:6px}
    .steps[hidden]{display:none}.steps h3{margin-bottom:5px}.steps label{display:flex;gap:8px;align-items:flex-start;padding:5px 0;overflow-wrap:anywhere;line-height:1.35;cursor:pointer}
    .steps input{flex:none;width:16px;height:16px;margin:1px 0 0;accent-color:#176449}.steps label:has(:disabled){color:#647168}
    .step-note{font-size:11px;margin:3px 0 6px;color:#536459}.steps label span{min-width:0}
    .icon,.close{background:transparent;border:0;padding:2px;display:grid;place-content:center;color:#587465;border-radius:3px}
    .icon{min-height:23px;min-width:23px}.icon svg{width:14px;height:14px}
    .icon[aria-pressed=true] svg{fill:var(--pine)}.icon:hover,.close:hover{background:#e3ebe3}
    .close{font-size:22px;width:30px;height:30px}.row{font-size:12px;margin:5px 0}
    .checks{margin:4px 0 10px;padding-bottom:9px;border-bottom:1px solid #d3dcd3}
    .checklists>h2{font-size:16px}
    .flags{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px}.flags span::before{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:4px;background:#cf792e}.flags span+span::before{background:#b52b37}
    .times{line-height:1.55}.refresh{border:0;background:#176449;color:white;padding:7px 11px;border-radius:5px;font-weight:700;white-space:nowrap}
    .notice:not(:empty){margin-top:7px;color:#834520}
    @media(max-height:600px){.summary{padding:8px 16px}.checklists{padding:10px 16px}}
    .watch-tools button{width:var(--rail-button);height:var(--rail-button);padding:0;border:0;border-radius:7px;background:var(--pine);color:white;font-weight:bold;font-size:12px}
    .watch-tools svg{width:21px;height:21px;vertical-align:middle;fill:none;stroke:currentColor;stroke-width:1.7}
    dialog.watch-dialog{inset:12px 58px auto auto;width:min(740px,calc(100vw - 84px));max-height:calc(100dvh - 24px);padding:16px;gap:12px}
    .watch-dialog header,.watch-toolbar,.watch-dialog footer{display:flex;align-items:center;gap:8px}
    .watch-dialog header{justify-content:space-between}.watch-toolbar{justify-content:flex-end;flex-wrap:wrap}.watch-toolbar label{margin-right:auto}
    .watch-toolbar button,.watch-dialog footer button,.watch-dialog select,.watch-dialog input[type=search]{border:1px solid #aec1b3;border-radius:5px;padding:5px 9px;min-height:32px;background:#fff}
    .watch-dialog [hidden]{display:none!important}.watch-body{min-height:0;overflow:auto}.watch-body p{font-size:12px;color:#52665b}
    .watch-scroll{overflow:auto}.watch-body table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
    .watch-body :is(th,td){padding:8px 6px;border-bottom:1px solid #d6dfd8;text-align:right}.watch-body th:first-child{text-align:left;width:35%}.watch-body thead{background:#edf5ee}.watch-body small{display:block;font-weight:normal;color:#53685a}
    .watch-options{max-height:47vh;overflow:auto;margin:8px 0}.watch-options label{display:flex;gap:8px;align-items:center;padding:6px;border-bottom:1px solid #dde5de}.watch-dialog input[type=search]{width:100%;margin-top:8px}.watch-dialog footer{justify-content:flex-end}
    .fx-dialog.bank-open .account-tools{display:none}
    .fx-tabs{display:flex;gap:4px;border-bottom:1px solid #ccdace}
    .fx-tabs button{min-height:34px;padding:4px 12px;background:none;border:0;border-bottom:2px solid transparent;color:#52665b;font-weight:600}
    .fx-tabs [aria-selected=true]{color:#194c38;border-bottom-color:#20704c;background:#edf5ee;border-radius:5px 5px 0 0}
    .fx-filters,.fx-source{display:flex;flex-wrap:wrap;align-items:flex-end;gap:8px 12px}
    .fx-dialog .fx-filters label,.fx-dialog .fx-source label{display:grid;gap:3px;font-size:12px;font-weight:bold}
    .fx-dialog .fx-filters :is(input,select),.fx-dialog .fx-source input{font:inherit;font-weight:normal;min-height:32px;padding:4px 8px;color:var(--ink);border:1px solid #aec1b3;border-radius:5px;background:white}
    .fx-source{margin:0 0 12px;padding:12px;border:1px solid #cbdacf;border-radius:7px;background:#f1f6f1}
    .fx-source label{flex:1 1 220px;min-width:0}.fx-source input{width:100%}.fx-source small:not(:empty){flex-basis:100%;color:#903823}
    .fx-source [type=submit]{color:white;background:var(--pine);border-color:var(--pine)}
    .fx-filters a{margin-left:auto;align-self:center;color:#176449;text-underline-offset:3px}
    .fx-dialog [data-quotes] :is(th,td):nth-child(4){background-color:#edf5ef;font-weight:600}
    .fx-dialog [data-quotes] td{white-space:nowrap}.fx-dialog [data-quotes] thead th{white-space:nowrap}
    .ledger-stats379{display:grid;grid-template-columns:repeat(auto-fit,minmax(115px,1fr));gap:8px}.ledger-stats379>div{padding:8px;background:#edf5ee;border-radius:5px}.ledger-stats379 strong{font-variant-numeric:tabular-nums}
    .ledger-matches379{display:grid;max-height:24vh;overflow:auto}.ledger-matches379 button{background:white;border:0;border-bottom:1px solid #d6dfd8;text-align:left;padding:7px}.ledger-detail379 .watch-toolbar h3{margin-right:auto}
    .watch-body .ledger-lines379 :is(th,td):nth-child(-n+3){text-align:left;width:auto}.ledger-lines379 td:nth-child(3){width:40%}.ledger-lines379 td:nth-child(n+4){white-space:nowrap}
    .watch-dialog header{flex:none;justify-content:flex-start;flex-wrap:wrap}
    .watch-dialog header>h2{margin-right:auto}
    .watch-dialog header>.close{flex:none}
    .watch-dialog header>button:not(.close),.ledger-tabs379 button{min-height:32px;padding:4px 9px;border:1px solid #aec1b3;border-radius:5px;background:#fff}
    .ledger-search379{position:relative;flex:1 1 125px;min-width:0}
    .ledger-search379 [role=searchbox]{display:block;width:100%;height:32px;padding:6px 9px;border:1px solid #aec1b3;border-radius:5px;background:white;white-space:nowrap;overflow:hidden}
    .ledger-search379 [role=searchbox]:empty::before{content:attr(data-placeholder);color:#587065;pointer-events:none}
    .ledger-search379 .ledger-matches379{position:absolute;z-index:2;top:100%;left:0;min-width:100%;width:max-content;max-width:min(310px,65vw);background:white;box-shadow:0 3px 8px #193e3226}
    .watch-dialog:has(.ledger-search379){min-height:min(300px,65dvh)}
    .ledger-tabs379{display:flex;flex-wrap:nowrap;overflow-x:auto;gap:6px;margin-bottom:8px}
    .ledger-tabs379:empty{display:none}
    .ledger-tabs379>span{display:inline-flex;flex:none}
    .ledger-tabs379 button:first-child{border-radius:5px 0 0 5px;font-weight:bold}
    .ledger-tabs379 button:last-child{border-left:0;border-radius:0 5px 5px 0;padding:3px 6px}
    .ledger-tabs379 [aria-pressed=true]{color:white;background:#194c38}
    .watch-dialog .ledger-page-controls{position:sticky;bottom:0;z-index:1;justify-content:center;width:max-content;max-width:100%;margin:4px auto 0;padding:3px 8px;background:white;border:1px solid #aec1b3;border-radius:7px;box-shadow:0 2px 8px #193e3226}
    .ledger-detail379>h3{margin:0 0 8px}
    .ledger-lines379 tr[data-line]{cursor:pointer}
    .ledger-lines379 tr[data-line]:hover{background:#edf5ee}
    .ledger-lines379 tr.selected>td{background:#d3e7dc}
    .ledger-lines379 tr.selected>td:first-child{box-shadow:inset 3px 0 #176449}
  </style>
  <div class="shortcut-stack">
  <div class="watch-tools"><button type="button" data-rail-tool="trial-months" aria-haspopup="dialog" aria-label="Account balances" title="Account balances"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4zM4 9h16M11 9v11m3-7h3m-3 4h3"/></svg></button><button type="button" data-watch="rates" aria-haspopup="dialog" aria-label="Foreign account rates" title="Foreign account rates">FX</button><button type="button" data-rail-tool="calendar" aria-haspopup="dialog" aria-label="Company calendar" title="Company calendar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v15H4zM4 10h16M8 3v5m8-5v5m-9 6h3m2 0h3"/></svg></button><button type="button" data-rail-tool="differences" aria-haspopup="dialog" aria-label="Reconciliation differences" title="Reconciliation differences"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h15l-3-3m6 13H6l3 3M6 11h5m3 2h4"/></svg></button><button type="button" data-rail-tool="ledger" aria-haspopup="dialog" aria-label="Account ledger" title="Account ledger"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6Q8 3 3 5v14q5-2 9 1 4-3 9-1V5q-5-2-9 1v14"/></svg></button></div>
  <div class="rail">
    <div class="tasks" role="group" aria-label="Pinned sequential checklists"></div>
    <button class="db" type="button" aria-haspopup="dialog"><strong>—</strong></button>
  </div>
  </div>
  <dialog aria-labelledby="dockTitle taskTitle">
    <header class="summary">
      <div class="heading"><h2 id="dockTitle">Supabase storage</h2><button class="close" aria-label="Close status window" type="button">×</button></div>
      <section class="service" aria-label="Supabase connection">
        <div role="status" aria-live="polite"><strong class="service-title"></strong><p class="service-detail"></p></div>
        <div class="service-time"></div>
        <div class="service-actions"><a class="open-supabase" target="_blank" rel="noopener noreferrer">Open Supabase</a><button type="button" class="check-connection">Check connection</button></div>
      </section>
      <div class="checks"><div class="times"><div class="taskTime"></div><div class="storageTime"></div></div>
        <button type="button" class="refresh">Refresh all</button></div>
      <div class="row">Database <strong class="dbAmount"></strong></div>
      <div class="row">File storage <span class="fileAmount"></span></div>
      <div class="storage-caveat"></div>
      <div class="flags"><span>60% · Start archiving</span><span>70% · Red flag</span></div>
      <div class="notice" role="status"></div>
    </header>
    <section class="checklists" aria-labelledby="taskTitle">
      <h2 id="taskTitle">Sequential tasks</h2><p class="quiet"></p><div class="grid"></div>
      <section class="steps" id="dockSteps" aria-labelledby="stepsTitle" hidden></section>
    </section>
  </dialog>`;
  const $ = s => root.querySelector(s);
  const dialog = $('dialog');
  const priority = [/^payroll/i,/^(journal.*period closing|month.*clos|period clos)/i,/^bank.*reconcil/i,/^payable/i,/^pit.*sso/i,/^trial\b/i];
  const colors = ['#b4efc4','#a6d8e6'];
  const panelColors = ['#12644d','#447787'];
  let selected = '', openedFrom = '';
  // Retain keyboard focus when rebuilding the checklist after a confirmed save.
  let stepFocus = null;
  const pinIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M7.5 3h10L16 5l-1 6 3.5 3h-13L9 11l-.5-6zM12 14v7"/></svg>';
  let owner = '', client = null, snapshot = null, busy = false, generation = 0, message = '';
  const percent = t => t.total ? Math.min(100,100*t.done/t.total) : 0;
  const key = () => 'ojm_desktop_status_'+owner;
  function session() {
    if (document.documentElement.dataset.device132 !== 'desktop' ||
        !document.querySelector('#loginGate.is-authenticated') ||
        typeof liveProfile === 'undefined' || liveProfile?.role !== 'admin' || liveProfile.status !== 'active' ||
        (window.deviceVault14334 && !window.deviceVault14334.unlocked)) return '';
    return liveProfile.id;
  }
  function valid(value) {
    return value && Array.isArray(value.tasks) && value.tasks.every(t => typeof t.id==='string' && typeof t.title==='string' &&
      Number.isInteger(t.done) && Number.isInteger(t.total)) && (value.pins===null || Array.isArray(value.pins)) &&
      (!value.storage || (Number.isFinite(value.storage.db_bytes) && value.storage.db_limit>0 && value.storage.file_limit>0));
  }
  function checklists() {
    const tasks=(snapshot?.tasks || []).map(t=>{
      const rank=priority.findIndex(re=>re.test(t.title));
      return {...t,rank:rank<0?priority.length:rank};
    }).sort((a,b)=>a.rank-b.rank || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
    const ids=snapshot?.pins ?? tasks.slice(0,2).map(t=>t.id);
    return {tasks,pins:ids.map(id=>tasks.find(t=>t.id===id)).filter(Boolean).slice(0,2)};
  }
  function node(tag,cls,value) {
    const el=document.createElement(tag);
    if (cls) el.className=cls;
    if (value!=null) el.textContent=value;
    return el;
  }
  function bar(t,cls,tint) {
    const el=node('span',cls);el.style.setProperty('--level',percent(t)+'%');el.style.setProperty('--tint',tint);
    el.append(node('i'));return el;
  }
  function storageText(bytes,limit) {
    return (bytes/1e6).toLocaleString(undefined,{maximumFractionDigits:2})+' / '+
      (limit/1e6).toLocaleString()+' MB · '+(100*bytes/limit).toFixed(2)+'% used · '+Math.max(0,100-100*bytes/limit).toFixed(2)+'% remaining';
  }
  function paintConnection() {
    const health=window.supabaseHealth461?.current() || {kind:'unknown'};
    const kind=health.kind;
    const p=window.supabaseHealth461.presentation();
    const copy=[p.title,p.detail,p.tone];
    const s=snapshot?.storage,ratio=s?100*s.db_bytes/s.db_limit:null;
    const flag=ratio>=70?'Red flag':ratio>=60?'Start archiving':'';
    const rounded=ratio==null?null:Math.round(ratio);
    const text=ratio==null?'—':((rounded===60||rounded===70)&&ratio<rounded?Math.floor(ratio):rounded)+'%';
    const dbLabel=copy[0]+' · '+(s?'Last storage reading '+ratio.toFixed(2)+'% used'+(flag?' · '+flag:''):'Storage not yet checked');
    $('.db').title=dbLabel;$('.db').setAttribute('aria-label',dbLabel);
    $('.db strong').textContent=copy[2]==='red'?'!':text;
    $('.db').dataset.flag=ratio>=70?'red':ratio>=60?'orange':'';
    $('.db').dataset.health=copy[2];
    $('.service').dataset.tone=copy[2];
    $('.service-title').textContent=copy[0];$('.service-detail').textContent=copy[1];
    $('.service-time').textContent=health.at?'Last checked '+formatAppDate(health.at,true):'';
    $('.open-supabase').href=window.supabaseHealth461?.dashboardURL() || 'https://supabase.com/dashboard';
    $('.open-supabase').textContent=kind==='paused'?'Open project to resume':'Open Supabase project';
    $('.open-supabase').title='Open this project in a separate tab; Accounting stays open';
    $('.check-connection').disabled=busy;
    $('.check-connection').textContent=busy?'Checking…':'Check connection';
    $('.storage-caveat').textContent=kind!=='healthy'?'Storage figures below are the last saved reading.':'';
  }
  function actionIcon(label,action,id) {
    const el=node('button','icon');el.type='button';el.title=label;el.setAttribute('aria-label',label);
    el.dataset.action=action;el.dataset.id=id;return el;
  }
  function paintSteps(task) {
    const box=$('.steps');
    box.hidden=!task;
    if (!task) {box.replaceChildren();return;}
    const heading=node('h3','',task.title);heading.id='stepsTitle';
    if (!Array.isArray(task.steps) || !task.revision) {
      box.replaceChildren(heading,node('p','step-note','Refresh all when connected to load the steps.'));return;
    }
    const offline=!navigator.onLine || !!window.deviceVault14334?.offline;
    const note=node('p','step-note',offline?'Offline · Connect to update steps.':task.steps.length?'Complete steps in order. Reopening a step also reopens the steps after it.':'No steps in this checklist.');
    let pending=false;
    const rows=task.steps.map((step,index)=>{
      const label=node('label'),input=node('input');
      input.type='checkbox';input.checked=step.done===true;
      input.disabled=busy || pending || offline;
      input.dataset.step=String(index);input.dataset.id=task.id;
      if (!step.done) pending=true;
      label.append(input,node('span','',(index+1)+'. '+step.text));return label;
    });
    box.replaceChildren(heading,note,...rows);
  }
  function paint() {
    const {tasks,pins}=checklists();
    const lanes=pins.map((t,i)=>{
      const complete=t.total>0 && t.done===t.total, lane=node('button','lane');
      const label=t.title+' · '+t.done+' of '+t.total+' · '+(complete?'Complete':'Incomplete');
      lane.type='button';lane.style.setProperty('--tint',colors[i]);lane.dataset.id=t.id;
      lane.setAttribute('aria-haspopup','dialog');lane.setAttribute('aria-label',label);lane.title=label;
      const track=bar(t,'line',colors[i]);
      // Keep step divisions legible on long lists. The thumb always uses the exact fraction.
      if (t.total>1 && t.total<=24) track.style.setProperty('--step-size',(100/t.total)+'%');
      track.setAttribute('aria-hidden','true');
      track.append(node('span','level-thumb'));lane.append(track);return lane;
    });
    if (!lanes.length) {
      const open=node('button','empty','—');open.type='button';open.setAttribute('aria-label','Open sequential tasks');lanes.push(open);
    }
    $('.tasks').replaceChildren(...lanes);
    const s=snapshot?.storage;
    paintConnection();
    if (!dialog.open) return;
    const focused=root.activeElement?.dataset;
    $('.quiet').textContent=snapshot?.tasks_at?tasks.length+' checklists · '+pins.length+' of 2 pinned':'Awaiting checklist snapshot';
    const cards=tasks.map(t=>{
      const at=pins.findIndex(p=>p.id===t.id), card=node('div','card'+(selected===t.id?' selected':'')), copy=node('div','copy'), head=node('div','cellhead');
      const choose=node('button','choose',t.title);choose.type='button';choose.dataset.action='choose';choose.dataset.id=t.id;
      choose.setAttribute('aria-controls','dockSteps');choose.setAttribute('aria-expanded',String(selected===t.id));head.append(choose);
      if (at>0) {const move=actionIcon('Move '+t.title+' earlier','earlier',t.id);move.textContent='←';move.disabled=busy;head.append(move);}
      const pin=actionIcon((at>=0?'Unpin ':'Pin ')+t.title,'pin',t.id);pin.innerHTML=pinIcon;
      pin.setAttribute('aria-pressed',String(at>=0));pin.disabled=busy||(at<0 && pins.length>=2);
      if (at<0 && pins.length>=2) pin.title='Unpin a checklist to make room';
      head.append(pin);copy.append(head,node('div','count',t.done+' of '+t.total+' · '+Math.round(percent(t))+'%'));
      card.append(bar(t,'meter',panelColors[at]||'#65816d'),copy);return card;
    });
    $('.grid').replaceChildren(...(cards.length?cards:[node('span','count',snapshot?.tasks_at?'No active sequential checklists.':'No checklist snapshot available.')]));
    paintSteps(tasks.find(t=>t.id===selected));
    const focusStep=stepFocus && selected===stepFocus.id && !busy;
    if (focusStep) {
      $('.steps input[data-step="'+stepFocus.index+'"]')?.focus({preventScroll:true});stepFocus=null;
    } else if (focused?.action) {
      [...root.querySelectorAll('.grid button')].find(b=>b.dataset.id===focused.id && b.dataset.action===focused.action)?.focus({preventScroll:true});
    }
    $('.dbAmount').textContent=s?storageText(s.db_bytes,s.db_limit):'—';
    $('.fileAmount').textContent=s?storageText(s.file_bytes,s.file_limit):'—';
    $('.taskTime').textContent='Tasks checked '+(snapshot?.tasks_at?formatAppDate(snapshot.tasks_at,true):'—');
    $('.storageTime').textContent='Storage checked '+(s?.checked_at?formatAppDate(s.checked_at,true):'—');
    $('.refresh').disabled=busy;$('.notice').textContent=message;
  }
  async function request(action,params) {
    if (busy || !owner || session()!==owner || !client) return;
    const active=generation, checkConnection=action==='read';
    let statusRecorded=false;
    if (!navigator.onLine || !checkConnection && (window.deviceVault14334?.offline || window.sessionCache14333?.localMode)) {
      if(checkConnection)window.supabaseHealth461.record(owner,{offline:!navigator.onLine,status:navigator.onLine?401:0});
      message='Offline · Showing the last saved status.';paint();return;
    }
    busy=true;message=action==='step'?'Saving step…':action==='refresh'?'Refreshing tasks and storage…':'';
    if (dialog.open && action==='step') {
      // Keep the native checkbox in place while the user's selection is saving.
      for (const control of dialog.querySelectorAll('.steps input,.grid .icon,.refresh')) control.disabled=true;
      $('.notice').textContent=message;
    } else if (dialog.open) paint();
    try {
      const result=action==='step'
        ? await client.rpc('set_desktop_dock_step',params)
        : await client.rpc('desktop_dock_status',{p_action:action,p_pins:params??null});
      if (active!==generation || session()!==owner || client!==ojmDb) return;
      const {data,error}=result;
      if(checkConnection){window.supabaseHealth461.record(owner,result);statusRecorded=true;}
      if (error || !valid(data)) throw Error(error?.message||'Invalid status response');
      snapshot=data;
      if (window.deviceVault14334?.unlocked && window.deviceVault14334.actor===owner) {
        try { localStorage.setItem(key(),JSON.stringify(data)); } catch { /* Current session can still display the result. */ }
      }
      if (action==='step') {
        const task=data.tasks.find(t=>t.id===params.p_task);
        const state=window.workflow136?.state;
        const row=state?.todoLoadedOwner14335===owner && state.todos.find(t=>t.id===params.p_task);
        if (task && row && row.updated_at===params.p_revision) {
          Object.assign(row,{steps:structuredClone(task.steps),updated_at:task.revision});
          window.todos1438?.render();window.refreshNotices1443?.();
        }
        message=data.outcome==='saved'?'Step saved.':data.outcome==='order'?'Complete the earlier steps first.':'This checklist changed. Review its latest steps before editing.';
      } else message=action==='refresh'?'Tasks and storage refreshed.':'';
    } catch(error) {
      if (active!==generation) return;
      if(checkConnection && !statusRecorded)window.supabaseHealth461.record(owner,{error,status:0});
      message=action==='step'?'Could not confirm this step. Refresh all to check its saved status.':action==='pins'?'Pins could not be saved. Try again.':'Status unavailable · Showing the last saved status.';
    } finally {
      if (active===generation) {busy=false;if(session()===owner)paint();}
    }
  }
  const closeWatch=AccountWatch378.install(root,session);
  const closeRailTools=RailTools379.install(root,session);
  function syncView() {
    if (!document.querySelector('#loginGate.is-authenticated') || typeof liveProfile==='undefined' || !liveProfile) window.supabaseHealth461.endLogin();
    const id=session(), db=id?ojmDb:null;
    if(window.workspaceRequest138?.target){closeWatch();closeRailTools();}
    if (id!==owner || client!==db) {
      closeWatch();closeRailTools();generation++;selected='';stepFocus=null;if(dialog.open)dialog.close();host.remove();owner=id;client=db;snapshot=null;busy=false;message='';
      if (!id) return;
      try {
        const cached=JSON.parse(localStorage.getItem(key()));
        if (window.deviceVault14334?.actor===owner && valid(cached)) snapshot=cached;
      } catch { /* No saved snapshot yet. */ }
      paint();
    }
    if (!id) return;
    const dock=document.getElementById('workspaceTools108');
    if (!dock) return;
    if (host.parentNode!==dock) dock.prepend(host);
    if (window.supabaseHealth461.beginLogin(id)) request('read');
  }
  function revealSteps() {
    const list=$('.checklists'),steps=$('.steps');
    if (!selected || steps.hidden) {list.scrollTop=0;return;}
    const top=steps.getBoundingClientRect().top-list.getBoundingClientRect().top;
    if (top<0 || top+Math.min(100,steps.offsetHeight)>list.clientHeight) list.scrollTop+=top-10;
  }
  root.addEventListener('click',event=>{
    if (session()!==owner || !owner) {syncView();return;}
    const button=event.target.closest('button');
    if (button?.closest('.rail')) {
      selected=button.dataset.id || '';openedFrom=button.matches('.db')?'db':selected;stepFocus=null;
      if (!dialog.open) {dialog.showModal();paint();revealSteps();}return;
    }
    if (!dialog.open || !dialog.contains(event.target)) return;
    if (button?.matches('.close')) {dialog.close();return;}
    if (button?.matches('.refresh')) {request('refresh');return;}
    if (button?.matches('.check-connection')) {request('read');return;}
    if (button?.dataset.action==='choose') {
      selected=selected===button.dataset.id?'':button.dataset.id;stepFocus=null;paint();if(selected)revealSteps();return;
    }
    if (busy || !button?.dataset.id) return;
    const ids=checklists().pins.map(t=>t.id),id=button.dataset.id,index=ids.indexOf(id);
    if (button.dataset.action==='earlier' && index>0) [ids[index-1],ids[index]]=[ids[index],ids[index-1]];
    if (button.dataset.action==='pin') {if(index>=0)ids.splice(index,1);else if(ids.length<2)ids.push(id);}
    request('pins',ids);
  });
  window.supabaseHealth461.setOpen(()=>{
    if(!owner || session()!==owner)return false;
    selected='';openedFrom='db';stepFocus=null;
    if(!dialog.open)dialog.showModal();paint();revealSteps();return true;
  });
  RailTools379.outside(dialog,()=>dialog.close());
  dialog.addEventListener('close',()=>{
    if (!host.isConnected || session()!==owner) return;
    const target=openedFrom==='db'?$('.db'):[...root.querySelectorAll('.lane')].find(lane=>lane.dataset.id===openedFrom);
    (target || $('.tasks button'))?.focus({preventScroll:true});
  });
  root.addEventListener('change',event=>{
    const input=event.target;
    if (!input.matches('.steps input[data-step]') || busy || session()!==owner) return;
    const task=snapshot?.tasks.find(t=>t.id===selected && t.id===input.dataset.id);
    if (!task?.revision) return;
    const index=Number(input.dataset.step);
    stepFocus={id:task.id,index};
    request('step',{p_task:task.id,p_revision:task.revision,p_index:index,p_done:input.checked});
  });
  function start() {
    window.addEventListener('supabase-health461',()=>{if(owner && session()===owner)paintConnection();});
    const gate=document.getElementById('loginGate');
    if (gate) new MutationObserver(syncView).observe(gate,{attributes:true,attributeFilter:['class']});
    for (const name of ['page113','session-online14333','focus','tabletviewport132','online']) window.addEventListener(name,syncView);
    document.addEventListener('visibilitychange',syncView);
    syncView();
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
