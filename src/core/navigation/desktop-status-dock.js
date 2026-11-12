// The desktop rail displays snapshots. Only an explicit Refresh all samples live data.
(() => {
  'use strict';
  const host = document.createElement('div');
  host.id = 'desktopStatusDock';
  host.style.cssText = 'order:-10000;flex:none';
  const root = host.attachShadow({mode:'open'});
  const path = 'M16 2H25A5 5 0 0 1 30 7V25A5 5 0 0 1 25 30H7A5 5 0 0 1 2 25V7A5 5 0 0 1 7 2Z';
  root.innerHTML = `<style>
    :host{--pine:#194c38;--ink:#193e32;--mint:#9de9b7;--blue:#aed5dc;--sage:#c6d9ac;font:13px/1.35 Arial,sans-serif;color:var(--ink)}
    *,*::before,*::after{box-sizing:border-box}
    button{font:inherit;color:inherit;cursor:pointer}
    button:focus-visible{outline:2px solid #c49342;outline-offset:1px}
    button:disabled{cursor:default;opacity:.6}
    .rail{display:grid;width:38px;gap:5px}
    .rail button{appearance:none;margin:0;border:0;border-radius:8px;width:100%;background:var(--pine);color:#fffaf1}
    .tasks{height:clamp(141px,21.9vh,213px);display:grid;grid-auto-columns:minmax(0,1fr);grid-auto-flow:column;gap:0;padding:10px 2px 7px}
    .lane{display:grid;grid-template-rows:1fr 9px;gap:7px;justify-items:center;min-height:0}
    .line{position:relative;background:#59806c;border-radius:2px;width:2px;margin:2px 0 1px}
    .line i,.meter i{position:absolute;bottom:0;left:0;right:0;border-radius:inherit;height:var(--level);background:var(--tint)}
    .line::after{content:'';background:var(--tint);border-radius:50%;width:5px;height:5px;position:absolute;left:50%;bottom:var(--level);transform:translate(-50%,50%)}
    .code{font:700 8px/9px Arial;color:var(--tint);transform:scaleX(.84)}
    .empty{align-self:center;font-size:15px;color:#a1bbab}
    .db{position:relative;height:38px;display:grid;place-content:center;justify-items:center;gap:1px;padding:0}
    .db svg{position:absolute;inset:3px;width:32px;height:32px;fill:none;stroke-width:1.4}
    .db small{font:700 7px/7px Arial;color:#d1ead9}.db strong{font:700 11.5px/12px Arial;font-variant-numeric:tabular-nums}
    dialog{position:fixed;inset:auto 58px 8px auto;margin:0;width:min(438px,calc(100vw - 76px));max-height:calc(100dvh - 32px);overflow:auto;
      border:1px solid #adbcae;border-radius:8px;padding:16px 18px;background:#fffdf7;color:var(--ink);box-shadow:0 6px 25px #102a222c;font:13px/1.35 Arial,sans-serif}
    dialog::backdrop{background:transparent}
    .row,.heading,.foot,.cellhead{display:flex;align-items:center;justify-content:space-between;gap:8px}
    h2{margin:0;font:700 18px/1.25 Arial}h3{font:700 13px/1.3 Arial;margin:0}
    .quiet,.count,.flags,.times,.notice{font-size:11px;color:#5d6b61}
    .quiet{margin:2px 0 12px;font-size:12px}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(116px,1fr));gap:8px 12px}
    .card{display:flex;align-items:flex-start;gap:8px;border-top:1px solid #d9dfd6;padding:7px 0 2px}
    .meter{display:block;flex:none;position:relative;overflow:hidden;border-radius:4px;background:#d4ddd7;width:4px;height:62px}
    .copy{flex:1;min-width:0}.name{overflow-wrap:anywhere;font-size:12px;margin:2px 0}
    .cellhead{gap:2px}.cellhead>b{margin-right:auto;font-size:12px}
    .icon,.close{background:transparent;border:0;padding:2px;display:grid;place-content:center;color:#587465;border-radius:3px}
    .icon{min-height:23px;min-width:23px}.icon svg{width:14px;height:14px}
    .icon[aria-pressed=true] svg{fill:var(--pine)}.icon:hover,.close:hover{background:#e3ebe3}
    .close{font-size:22px;width:30px;height:30px}.row{font-size:12px;margin:5px 0}
    .storage,.foot{margin-top:12px;padding-top:10px;border-top:1px solid #d3dcd3}
    .flags{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px}.flags span::before{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:4px;background:#cf792e}.flags span+span::before{background:#b52b37}
    .times{line-height:1.55}.refresh{border:0;background:#176449;color:white;padding:7px 11px;border-radius:5px;font-weight:700;white-space:nowrap}
    .notice:not(:empty){margin-top:7px;color:#834520}
    @media(max-height:600px){.tasks{height:min(141px,25vh)}}
  </style>
  <div class="rail">
    <button class="tasks" type="button" aria-haspopup="dialog" aria-label="Open sequential task progress"></button>
    <button class="db" type="button" aria-haspopup="dialog"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="${path}" stroke="#547e68"/><path class="usage" d="${path}" pathLength="100" stroke-linecap="round"/></svg><small>DB</small><strong>—</strong></button>
  </div>
  <dialog aria-labelledby="dockTitle">
    <div class="heading"><h2 id="dockTitle">Sequential tasks</h2><button class="close" aria-label="Close status window" type="button">×</button></div>
    <p class="quiet"></p><div class="grid"></div>
    <section class="storage"><h3>Supabase storage</h3><div class="row">Database <strong class="dbAmount"></strong></div>
    <div class="row">File storage <span class="fileAmount"></span></div>
    <div class="flags"><span>60% · Start archiving</span><span>70% · Red flag</span></div></section>
    <div class="foot"><div class="times"><div class="taskTime"></div><div class="storageTime"></div></div>
    <button type="button" class="refresh">Refresh all</button></div><div class="notice" role="status"></div>
  </dialog>`;
  const $ = s => root.querySelector(s);
  const dialog = $('dialog');
  const known = [
    [/^payroll/i,'PR'], [/^(journal.*period closing|month.*clos|period clos)/i,'PC'],
    [/^bank.*reconcil/i,'BR'], [/^payable/i,'AP'], [/^pit.*sso/i,'PS'], [/^trial\b/i,'TR']
  ];
  const colors = ['var(--mint)','var(--blue)','var(--sage)'];
  const panelColors = ['#12644d','#447787','#887139'];
  const pinIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M7.5 3h10L16 5l-1 6 3.5 3h-13L9 11l-.5-6zM12 14v7"/></svg>';
  let owner = '', client = null, snapshot = null, busy = false, slotRead = '', retryAt = 0, generation = 0, message = '';
  const percent = t => t.total ? Math.min(100,100*t.done/t.total) : 0;
  const key = () => 'ojm_desktop_status_'+owner;
  function session() {
    if (document.documentElement.dataset.device132 !== 'desktop' ||
        !document.querySelector('#loginGate.is-authenticated') ||
        typeof liveProfile === 'undefined' || liveProfile?.role !== 'admin' || liveProfile.status !== 'active' ||
        (window.deviceVault14334 && !window.deviceVault14334.unlocked)) return '';
    return liveProfile.id;
  }
  function slot() {
    // Two minutes of margin let cron commit before a foreground read at the boundary.
    const local = new Date(Date.now() + 7*3600000 - 120000);
    if (local.getUTCHours()<6) {local.setUTCDate(local.getUTCDate()-1);return local.toISOString().slice(0,10)+' PM';}
    return local.toISOString().slice(0,10)+(local.getUTCHours()<12?' AM':' PM');
  }
  function valid(value) {
    return value && Array.isArray(value.tasks) && value.tasks.every(t => typeof t.id==='string' && typeof t.title==='string' &&
      Number.isInteger(t.done) && Number.isInteger(t.total)) && (value.pins===null || Array.isArray(value.pins)) &&
      (!value.storage || (Number.isFinite(value.storage.db_bytes) && value.storage.db_limit>0 && value.storage.file_limit>0));
  }
  function checklists() {
    const taken = new Set();
    const tasks = (snapshot?.tasks || []).map(t => {
      const rank = known.findIndex(([re])=>re.test(t.title));
      return {...t,rank:rank<0?known.length:rank};
    }).sort((a,b)=>a.rank-b.rank || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
    for (const t of tasks) {
      const words=t.title.toUpperCase().match(/[A-Z]+/g)||[];
      const letters=words.join('');
      let code=known[t.rank]?.[1] || ((words[0]?.[0]||'T')+(words[1]?.[0]||letters[1]||'K'));
      for (let n=0;taken.has(code)&&n<676;n++) code=String.fromCharCode(65+Math.floor(n/26),65+n%26);
      taken.add(code);t.code=code;
    }
    const ids=snapshot?.pins ?? tasks.slice(0,3).map(t=>t.id);
    return {tasks,pins:ids.map(id=>tasks.find(t=>t.id===id)).filter(Boolean)};
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
      (limit/1e6).toLocaleString()+' MB · '+(100*bytes/limit).toFixed(2)+'%';
  }
  function actionIcon(label,action,id) {
    const el=node('button','icon');el.type='button';el.title=label;el.setAttribute('aria-label',label);
    el.dataset.action=action;el.dataset.id=id;return el;
  }
  function paint() {
    const {tasks,pins}=checklists();
    const lanes=pins.map((t,i)=>{
      const lane=node('span','lane');lane.style.setProperty('--tint',colors[i]);
      lane.append(bar(t,'line',colors[i]),node('span','code',t.code));return lane;
    });
    $('.tasks').replaceChildren(...(lanes.length?lanes:[node('span','empty','—')]));
    $('.tasks').title=pins.map(t=>t.code+' · '+t.title+' · '+t.done+' of '+t.total).join('\n') || 'Open sequential tasks';
    const s=snapshot?.storage, ratio=s?100*s.db_bytes/s.db_limit:null;
    const flag=ratio>=70?'Red flag':ratio>=60?'Start archiving':'';
    const dbLabel=s?'Database storage · '+ratio.toFixed(2)+'%'+(flag?' · '+flag:''):'Database storage · Awaiting snapshot';
    $('.db').title=dbLabel;$('.db').setAttribute('aria-label',dbLabel);
    // Keep the displayed whole number below a warning threshold until it is reached.
    const rounded=ratio==null?null:Math.round(ratio);
    $('.db strong').textContent=ratio==null?'—':((rounded===60||rounded===70)&&ratio<rounded?Math.floor(ratio):rounded)+'%';
    $('.usage').setAttribute('stroke',ratio>=70?'#ff9294':ratio>=60?'#ffc078':'#8de6ae');
    $('.usage').setAttribute('stroke-dasharray',Math.min(100,ratio||0)+' 100');
    if (!dialog.open) return;
    const focused=root.activeElement?.dataset;
    $('.quiet').textContent=snapshot?.tasks_at?tasks.length+' checklist'+(tasks.length===1?'':'s')+' · '+pins.length+' of 3 pinned':'Awaiting checklist snapshot';
    const cards=tasks.map(t=>{
      const at=pins.findIndex(p=>p.id===t.id), card=node('div','card'), copy=node('div','copy'), head=node('div','cellhead');
      head.append(node('b','',t.code));
      if (at>0) {const move=actionIcon('Move '+t.title+' earlier','earlier',t.id);move.textContent='←';head.append(move);}
      const pin=actionIcon((at>=0?'Unpin ':'Pin ')+t.title,'pin',t.id);pin.innerHTML=pinIcon;
      pin.setAttribute('aria-pressed',String(at>=0));pin.disabled=busy||(at<0 && pins.length>=3);
      if (at<0 && pins.length>=3) pin.title='Unpin a checklist to make room';
      head.append(pin);copy.append(head,node('div','name',t.title),node('div','count',t.done+' of '+t.total+' · '+Math.round(percent(t))+'%'));
      card.append(bar(t,'meter',panelColors[at]||'#65816d'),copy);return card;
    });
    $('.grid').replaceChildren(...(cards.length?cards:[node('span','count',snapshot?.tasks_at?'No active sequential checklists.':'No checklist snapshot available.')]));
    if (focused?.id) [...root.querySelectorAll('.icon')].find(b=>b.dataset.id===focused.id && b.dataset.action===focused.action)?.focus({preventScroll:true});
    $('.dbAmount').textContent=s?storageText(s.db_bytes,s.db_limit):'—';
    $('.fileAmount').textContent=s?storageText(s.file_bytes,s.file_limit):'—';
    $('.taskTime').textContent='Tasks checked '+(snapshot?.tasks_at?formatAppDate(snapshot.tasks_at,true):'—');
    $('.storageTime').textContent='Storage checked '+(s?.checked_at?formatAppDate(s.checked_at,true):'—');
    $('.refresh').disabled=busy;$('.notice').textContent=message;
  }
  async function request(action,pins) {
    if (busy || !owner || session()!==owner || !client) return;
    const active=generation, requestedSlot=slot();
    if (!navigator.onLine || window.deviceVault14334?.offline) {
      message='Offline · Showing the last saved status.';paint();return;
    }
    busy=true;message=action==='refresh'?'Refreshing tasks and storage…':'';if (dialog.open) paint();
    try {
      const {data,error}=await client.rpc('desktop_dock_status',{p_action:action,p_pins:pins??null});
      if (active!==generation || session()!==owner || client!==ojmDb) return;
      if (error || !valid(data)) throw Error(error?.message||'Invalid status response');
      snapshot=data;slotRead=requestedSlot;retryAt=0;
      if (window.deviceVault14334?.unlocked && window.deviceVault14334.actor===owner) {
        try { localStorage.setItem(key(),JSON.stringify(data)); } catch { /* Current session can still display the result. */ }
      }
      message=action==='refresh'?'Tasks and storage refreshed.':'';
    } catch {
      if (active!==generation) return;
      retryAt=Date.now()+60000;
      message=action==='pins'?'Pins could not be saved. Try again.':'Status unavailable · Showing the last saved status.';
    } finally {
      if (active===generation) {busy=false;if(session()===owner)paint();}
    }
  }
  function syncView() {
    const id=session(), db=id?ojmDb:null;
    if (id!==owner || client!==db) {
      generation++;if(dialog.open)dialog.close();host.remove();owner=id;client=db;snapshot=null;busy=false;message='';slotRead='';retryAt=0;
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
    if (!document.hidden && !busy && slotRead!==slot() && Date.now()>=retryAt && navigator.onLine && !window.deviceVault14334?.offline) request('read');
  }
  root.addEventListener('click',event=>{
    if (session()!==owner || !owner) {syncView();return;}
    const button=event.target.closest('button');
    if (button?.closest('.rail')) {
      if (!dialog.open) {dialog.showModal();paint();}return;
    }
    if (button?.matches('.close') || (event.target===dialog && !button &&
        (event.clientX<dialog.getBoundingClientRect().left || event.clientX>dialog.getBoundingClientRect().right ||
         event.clientY<dialog.getBoundingClientRect().top || event.clientY>dialog.getBoundingClientRect().bottom))) {dialog.close();return;}
    if (button?.matches('.refresh')) {request('refresh');return;}
    if (busy || !button?.dataset.id) return;
    const ids=checklists().pins.map(t=>t.id),id=button.dataset.id,index=ids.indexOf(id);
    if (button.dataset.action==='earlier' && index>0) [ids[index-1],ids[index]]=[ids[index],ids[index-1]];
    if (button.dataset.action==='pin') {if(index>=0)ids.splice(index,1);else if(ids.length<3)ids.push(id);}
    request('pins',ids);
  });
  function start() {
    const gate=document.getElementById('loginGate');
    if (gate) new MutationObserver(syncView).observe(gate,{attributes:true,attributeFilter:['class']});
    for (const name of ['page113','session-online14333','focus','tabletviewport132','online']) window.addEventListener(name,syncView);
    document.addEventListener('visibilitychange',syncView);
    // Catch a new slot during active work; no interval or refresh while idle.
    document.addEventListener('click',()=>{if (owner && slotRead!==slot() && !dialog.open) syncView();},{passive:true});
    syncView();
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
