// One transaction assigns a number to one local save, even in concurrent tabs.
function paymentNumberStore401({rpc, guard, actor, offline}) {
  const scope = (type,date) => type + ':' + date.slice(0,7);
  const empty = () => ({stock:[], next:{}, intents:{}, pending:{}, confirmed:{}});
  function serial(number) {
    const m = /^OJM\d{2}-[VR]([A-Z])\d{2}(\d{2})$/.exec(number);
    return m ? (m[1].charCodeAt(0)-65)*99 + Number(m[2]) : 0;
  }
  function labels(type,date,start,count) {
    if(start+count-1>2574)throw Error('No more numbers are available for this type and month.');
    return Array.from({length:count},(_,i)=>{
      const n=start+i-1;
      return 'OJM'+date.slice(2,4)+'-'+(type==='receipt'?'R':'V')+String.fromCharCode(65+Math.floor(n/99))+date.slice(5,7)+String(n%99+1).padStart(2,'0');
    });
  }
  async function local(change,write=false,fileKey=null) {
    const check=guard(),user=actor(),label='payment-documents401:'+user;
    check();
    const db=await new Promise((resolve,reject)=>{
      const req=indexedDB.open('oonjai-payment-documents401',1);
      req.onupgradeneeded=()=>req.result.createObjectStore('accounts');
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
    try {
      check();
      return await new Promise((resolve,reject)=>{
        const tx=db.transaction('accounts',write?'readwrite':'readonly'),store=tx.objectStore('accounts'),req=store.get(user);
        let value,failed;
        const pdfKey=key=>user+':pdf:'+key;
        const pdf=fileKey===null?null:store.get(pdfKey(fileKey));
        (pdf||req).onsuccess=()=>{try{
          check();
          const state=deviceVault14334.unpack(req.result,label)||empty();
          const bytes=pdf?.result?deviceVault14334.unpack(pdf.result,label+':pdf:'+fileKey):null;
          value=change(state,bytes,{
            put:data=>store.put(deviceVault14334.pack(data,label+':pdf:'+fileKey),pdfKey(fileKey)),
            remove:key=>store.delete(pdfKey(key))
          });
          if(write)store.put(deviceVault14334.pack(state,label),user);
        }catch(e){failed=e;tx.abort()}};
        tx.oncomplete=()=>{try{check();resolve(value)}catch(e){reject(e)}};
        tx.onabort=tx.onerror=()=>reject(failed||tx.error||Error('Could not retain the document on this device.'));
      });
    }finally{db.close()}
  }
  const networkFailure=e=>offline()||/failed to fetch|networkerror|network request failed|load failed|network connection|fetch failed|timeout/i.test(e?.message||'');
  function available(s,type,date,count) {
    const key=scope(type,date),stock=s.stock.filter(x=>x.scope===key);
    if(stock.length>=count)return stock.slice(0,count).map(x=>x.number);
    return labels(type,date,s.next[key]||1,count);
  }
  async function preview(type,date,count=1) {
    const check=guard(),key=scope(type,date);
    const saved=await local(s=>s.stock.filter(x=>x.scope===key).slice(0,count));
    if(saved.length===count)return saved.map(x=>x.number);
    if(!offline()){
      try{
        const numbers=await rpc('payment_preview401',{p_type:type,p_date:date,p_count:count});
        if(!Array.isArray(numbers)||numbers.length!==count||!serial(numbers[0]))throw Error('Document number preview is unavailable.');
        check();await local(s=>{s.next[key]=Math.max(s.next[key]||1,serial(numbers[0]))},true);
        return numbers;
      }catch(e){check();if(!networkFailure(e))throw e}
    }
    return local(s=>available(s,type,date,count));
  }
  async function reserve(type,date,count) {
    const check=guard(),key=scope(type,date);
    // Persist an intent before contacting the server. A lost response reuses its key.
    const intent=await local(s=>s.intents[key] ||= {key:crypto.randomUUID(),type,date,count},true);
    const numbers=await rpc('payment_reserve401',{p_type:type,p_date:intent.date,p_count:intent.count,p_key:intent.key});
    check();
    if(!Array.isArray(numbers)||numbers.length!==intent.count||numbers.some(n=>!serial(n)))throw Error('Number reservation was not confirmed.');
    await local(s=>{
      if(s.intents[key]?.key!==intent.key)return;
      s.stock.push(...numbers.map(number=>({number,key:intent.key,scope:key})));
      s.next[key]=Math.max(s.next[key]||1,serial(numbers.at(-1))+1);
      delete s.intents[key];
    },true);
    return numbers;
  }
  function localRows(item) {
    return item.numbers.map((number,i)=>({id:item.request.p_request_key+':'+i,number,version:1,local401:true,held401:item.held}));
  }
  async function enqueue(request) {
    return local(s=>{
      const id=request.p_request_key;
      if(s.confirmed[id])return;
      if(s.pending[id])return;
      const req=structuredClone(request),type=req.p_data.documentType||'voucher',date=req.p_date,key=scope(type,date),count=req.p_count;
      const holds=s.stock.filter(x=>x.scope===key).slice(0,count);
      const held=!!req.p_data.numberSeries401&&holds.length===count;
      const numbers=available(s,type,date,count);
      if(held){
        req.p_data.holds401=holds.map(({key,number})=>({key,number}));
        const used=new Set(numbers);s.stock=s.stock.filter(x=>!used.has(x.number));
      }else if(req.p_data.numberSeries401)req.p_data.expected401=numbers;
      s.next[key]=Math.max(s.next[key]||1,serial(numbers.at(-1))+1);
      s.pending[id]={request:req,numbers,held,pdfs:{},conflict:false};
    },true);
  }
  async function syncOne(id) {
    const check=guard(),item=await local(s=>s.pending[id]);
    if(!item)return local(s=>s.confirmed[id]);
    let rows;
    try{rows=await rpc('voucher_issue14299',item.request)}catch(e){
      if(e.code==='P0401'||e.message?.includes('pending document number is no longer available')){
        check();await local(s=>{if(s.pending[id])s.pending[id].conflict=true},true);
      }throw e;
    }
    check();
    if(rows?.length!==item.numbers.length||rows.some(r=>!r.id||!r.number))throw Error('The complete document batch was not confirmed.');
    const confirmed=rows.map(({id,number,version})=>({id,number,version}));
    const uploaded={};
    // A print may finish while a sync is in flight. Retire the queue only once
    // every PDF actually retained on this device has a matching server copy.
    for(;;){
      const pending=await local(s=>s.pending[id]);
      for(const i of Object.keys(pending?.pdfs||{})){
        if(uploaded[i])continue;
        const pdf=await local((state,bytes)=>state.pending[id]?bytes:null,false,id+':'+i);
        if(!pdf){
          if(await local(state=>!!state.pending[id]))throw Error('The retained PDF could not be read on this device.');
          continue;
        }
        if(confirmed[i].version!==1)throw Error('The recorded document changed after offline printing. The printed copy is retained on this device for review.');
        const args={p_id:confirmed[i].id,p_version:1};
        const existing=await rpc('receipt_pdf245',args);
        const retained=existing||await rpc('receipt_pdf245',{...args,p_pdf:pdf});
        if(retained?.base64!==pdf)throw Error('The saved PDF differs from the printed device copy. Both copies have been retained for review.');
        uploaded[i]=true;
      }
      check();
      const done=await local((s,bytes,files)=>{
        if(Object.keys(s.pending[id]?.pdfs||{}).some(k=>!uploaded[k]))return false;
        const key=scope(item.request.p_data.documentType||'voucher',item.request.p_date);
        s.next[key]=Math.max(s.next[key]||1,serial(confirmed.at(-1).number)+1);
        for(const i of Object.keys(s.pending[id]?.pdfs||{}))files.remove(id+':'+i);
        s.confirmed[id]=confirmed;delete s.pending[id];return true;
      },true);
      if(done)return confirmed;
    }
  }
  async function issue(request){
    const id=request.p_request_key,check=guard();
    const known=await local(s=>!!(s.pending[id]||s.confirmed[id]));
    if(!known&&!offline()&&request.p_data.numberSeries401)await preview(request.p_data.documentType||'voucher', request.p_date,request.p_count);
    check();await enqueue(request);
    if(!offline()){
      try{return await syncOne(id)}catch(e){check();if(!networkFailure(e))throw e}
    }
    return local(s=>s.confirmed[id]||localRows(s.pending[id]));
  }
  async function pendingPdf(id,args){
    const index=Number(String(args.p_id).split(':')[1]);
    if(!Number.isInteger(index))return rpc('receipt_pdf245',args);
    const result=await local((s,bytes,files)=>{
      const item=s.pending[id];
      if(!item)return {confirmed:s.confirmed[id]?.[index]};
      if(!item.held)throw Error('This number is pending confirmation. Sync documents before printing, or prepare offline numbers before your next offline session.');
      if(index<0||index>=item.numbers.length)throw Error('Document page not found.');
      if(args.p_pdf){
        if(item.pdfs[index]&&bytes!==args.p_pdf)throw Error('A different device PDF is already retained.');
        if(!item.pdfs[index])files.put(args.p_pdf);
        item.pdfs[index]=true;
      }
      return {file:item.pdfs[index]?{base64:bytes||args.p_pdf,filename:item.numbers[index]+'.pdf',version:1}:null};
    },!!args.p_pdf,id+':'+index);
    if(result.confirmed)return rpc('receipt_pdf245',{...args,p_id:result.confirmed.id,p_version:result.confirmed.version});
    return result.file;
  }
  async function acceptNext(id,numbers) {
    await local(s=>{
      const item=s.pending[id];
      if(!item?.conflict||item.held||Object.keys(item.pdfs).length)throw Error('These numbers cannot be reassigned.');
      item.request.p_data.expected401=numbers;item.numbers=numbers;item.conflict=false;
    },true);
    return syncOne(id);
  }
  const summary=()=>local(s=>({stock:s.stock.reduce((map,x)=>(map[x.scope]=(map[x.scope]||0)+1,map),{}),
    pending:Object.entries(s.pending).map(([id,i])=>({id,type:i.request.p_data.documentType||'voucher',numbers:i.numbers,conflict:i.conflict,held:i.held}))}));
  return {preview,reserve,issue,syncOne,acceptNext,summary,pendingPdf,
    confirmed:id=>local(s=>s.confirmed[id]),pending:id=>local(s=>s.pending[id]),localRows};
}

/* Voucher register: Stable sheet references plus journal-derived voucher IDs. */
(()=>{'use strict';
const $=id=>document.getElementById(id), esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={settings:null,rows:[],versions:[],ready:false,loading:null,error:'',actor:null,pending:null,blankRequest:null,posting:false,client:null,sequences:[],loadActor:null,loadClient:null};
const admin=()=>typeof liveProfile!=='undefined'&&liveProfile?.role==='admin'&&liveProfile.status==='active';
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Vientiane',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const guard14370=()=>{const actor=liveProfile?.id,client=ojmDb;return()=>{if(!admin()||actor!==liveProfile?.id||client!==ojmDb)throw Error('Account changed. Reopen vouchers.')}};
const rpc=async(name,args)=>{const check=guard14370();check();const {data,error}=await ojmDb.rpc(name,args);check();if(error)throw Object.assign(Error(error.message),{code:error.code});return data};
const status=(message,bad=false)=>{const el=$('voucherStatus14299');if(el){el.textContent=message;el.classList.toggle('error',bad)}};
const offline=()=>navigator.onLine===false||window.deviceVault14334?.offline===true||window.sessionCache14333?.localMode===true;
const numbering=paymentNumberStore401({rpc,guard:guard14370,actor:()=>liveProfile.id,today,offline});
const labels=()=>({H:state.settings?.handwritten_label||'Handwritten',E:state.settings?.editor_label||'Edited and Printed'});
const code=k=>k==='H'?state.settings?.handwritten_code||'H':state.settings?.editor_code||'E';
const number=v=>['shared245','separate401'].includes(v.data?.id_format?.scheme)||v.data?.documentType==='receipt'?v.number:(v.journal_number||v.number);
const pendingNumber=(k,date=today())=>`${state.settings?.prefix||'OJM'}-${date.slice(state.settings?.year_digits===4?0:2,4)}${code(k)}-${String(Math.max(1,Number(state.sequences.find(r=>r.kind===k&&r.year_no===Number(date.slice(0,4)))?.next_no)||1)).padStart(state.settings?.digits||4,'0')}`;
async function load(){const actor=liveProfile?.id,client=ojmDb;if(state.loading&&state.loadActor===actor&&state.loadClient===client)return state.loading;if(!admin()){state.ready=false;state.rows=[];state.sequences=[];state.settings=null;state.actor=null;state.client=null;state.error='Sign in with an active administrator account to use vouchers.';render();return false}state.loadActor=actor;state.loadClient=client;const check=guard14370();const task=(async()=>{try{const page=async(table,orders)=>{const read=async()=>{const rows=[];for(let offset=0;;offset+=500){check();let q=client.from(table).select('*');for(const [key,ascending]of orders)q=q.order(key,{ascending});const r=await q.range(offset,offset+499);check();if(r.error)throw r.error;if(!Array.isArray(r.data))throw Error('The complete dataset could not be read.');rows.push(...r.data);if(r.data.length<500)return rows}};const rows=window.offline14239?await offline14239.snapshot('vouchers-complete14370:'+table,read):await read();check();return rows};const [s,rows,sequences]=await Promise.all([client.from('voucher_settings14299').select('*').eq('id',1).single(),page('vouchers14299',[['created_at',false],['id',true]]),page('voucher_sequences14299',[['year_no',true],['kind',true]])]);check();if(s.error)throw s.error;if(!s.data)throw Error('Voucher settings are unavailable.');const prior=new Map((state.actor===actor&&state.client===client?state.rows:[]).map(v=>[v.id,v]));state.settings=s.data;state.rows=rows.map(v=>prior.get(v.id)?.version>v.version?prior.get(v.id):v);state.sequences=sequences;state.ready=true;state.error='';state.actor=actor;state.client=client;render();picker();window.preparedViews14340?.documentsChanged?.();window.refreshNotices1443?.();return true}catch(e){if(actor!==liveProfile?.id||client!==ojmDb)return false;state.ready=false;state.rows=[];state.error='Voucher database check failed: '+(e.message||e);picker();status(state.error,true);return false}})();state.loading=task;try{return await task}finally{if(state.loading===task)state.loading=null}}
async function ensureReady(){if(state.ready&&state.actor===liveProfile?.id&&state.client===ojmDb)return true;status('Checking the voucher database…');if(await load())return true;status(state.error||'The voucher database is unavailable. Refresh and try again.',true);return false}
function settings(){const s=state.settings;if(!s)return;const form=$('voucherSettings14299');if(!form)return;for(const key of ['prefix','handwritten_code','editor_code','handwritten_label','editor_label','digits','year_digits'])form.elements[key].value=s[key]??(key==='year_digits'?2:'');$('voucherExample14299').textContent=`Example: ${pendingNumber('H')} / ${pendingNumber('E')}. H = handwritten; E = edited and printed. Linked voucher IDs use the main journal Entry ID; unlinked sheets keep their reserved reference.`}
function render(){settings();const body=$('voucherRows14299');if(!body)return;const reserved=reservedIds();body.replaceChildren();for(const v of state.rows){const waiting=!v.journal_entry_id&&reserved.has(v.id);const tr=document.createElement('tr');tr.innerHTML=`<td>${esc(number(v))}${v.journal_number?`<small class="voucher-sheet-ref14299">Sheet: ${esc(v.number)}</small>`:''}</td><td>${v.data?.documentType==='receipt'?'Receipt · ':''}${esc(v.data?.id_format?.label||labels()[v.kind])} (${esc(v.data?.id_format?.code||code(v.kind))})</td><td>${esc(formatAppDate(v.voucher_date))}</td><td>${esc(waiting?'Pending journal sync':v.status)}</td><td>${esc(v.data?.journal?.entry_no||(waiting?'Saved on this device':'Unlinked'))}</td><td></td>`;const actions=tr.lastElementChild;const button=(text,fn)=>{const b=document.createElement('button');b.type='button';b.className='je-btn je-btn-secondary';b.textContent=text;b.onclick=fn;actions.append(b)};button('View',()=>view(v));if(v.data?.documentType==='receipt'&&v.kind==='H'&&v.status!=='void')button('Attach photo',async()=>{try{const check=guard14370();await Receipt245.script('scripts/receipt-phone245.js?v=143.403',()=>window.ReceiptPhone245);check();await ReceiptPhone245.attach(rpc,v,check);await load()}catch(e){status(e.message,true)}});if(v.kind==='E'&&v.status!=='void')button('Edit',()=>edit(v));if(!v.journal_entry_id&&!waiting&&v.status!=='void')button('Link',()=>link(v));if(v.kind==='H'&&v.status!=='void')button('Open / Print',()=>printBlank([v]));if(!v.journal_entry_id&&!waiting&&v.status!=='void')button('Mark Unused',()=>markUnused(v));body.append(tr)}if(!state.rows.length)body.innerHTML='<tr><td colspan="6">No vouchers issued yet. Opening a draft uses no number.</td></tr>';status(`${state.rows.filter(x=>!x.journal_entry_id&&!reserved.has(x.id)&&x.status!=='void').length} voucher(s) awaiting a journal link.`)}
async function saveSettings(e){e.preventDefault();if(!admin())return;const f=e.currentTarget,b=f.querySelector('button[type=submit]');b.disabled=true;status('Saving voucher ID settings…');try{const o=Object.fromEntries(new FormData(f));o.prefix=o.prefix.trim().toUpperCase();o.handwritten_code=o.handwritten_code.trim().toUpperCase();o.editor_code=o.editor_code.trim().toUpperCase();if(o.handwritten_code===o.editor_code)throw Error('Choose different letters for the two classifications.');state.settings=await rpc('voucher_config14299',{p_prefix:o.prefix,p_handwritten_code:o.handwritten_code,p_editor_code:o.editor_code,p_handwritten_label:o.handwritten_label,p_editor_label:o.editor_label,p_digits:Number(o.digits),p_year_digits:Number(o.year_digits)});settings();render();status('Voucher ID settings saved. Issued numbers retain their original prefix and codes.')}catch(error){status(error.message,true)}finally{b.disabled=false}}
function voucherHTML(number,date,unit='Restaurant',currency='',rows=7,heading='PAYMENT VOUCHER'){
 return Receipt245.html({number,date,currency,blank:heading.startsWith('HANDWRITTEN'),type:'voucher',displayDate:date?formatAppDate(date):''});
}
function receiptHTML(number,date,currency='',method=''){return Receipt245.html({number,date,currency,paymentMethod:method,displayDate:date?formatAppDate(date):''})}

async function createReceipt(){
 if(!admin())return;const check=guard14370();check();
 const unit=$('voucherUnit14299').value,currency='',when='',issueDate=today(),number=(await numbering.preview('receipt',issueDate))[0];check();
 await openDocumentEditor105({title:'Payment Receipt · Draft',category:'Transactions',html:receiptHTML(number,when,currency),settings:{paper:'A4',orientation:'portrait',size:10,line:1.15,top:12,right:14,bottom:12,left:14,showBusinessName:false,pageNumbers:false},voucher14299:{kind:'E',documentType:'receipt',date:when,issueDate,unit,currency,paymentMethod:'',number,requestKey:crypto.randomUUID()}});
}
const sheetSettings={size:10,line:1.15,font:'Arial',paper:'A4',orientation:'portrait',top:12,right:14,bottom:12,left:14,showBusinessName:false,pageNumbers:false};
async function create(){if(!admin())return;const check=guard14370();check();const unit=$('voucherUnit14299').value,currency='',when='',issueDate=today(),number=(await numbering.preview('voucher',issueDate))[0];check();await openDocumentEditor105({title:'Payment Voucher · Draft',category:'Transactions',html:voucherHTML(number,when,unit,currency),settings:sheetSettings,voucher14299:{kind:'E',documentType:'voucher',date:when,issueDate,unit,currency,paymentMethod:'',number,requestKey:crypto.randomUUID()}})}
function blankPages(rows){return rows.map((v,i)=>`<div data-handwritten-sheet14303="${i}">${Receipt245.html({number:v.number,date:v.voucher_date,blank:true,type:v.data?.documentType==='receipt'?'receipt':'voucher'})}</div>`+(i<rows.length-1?'<div data-page-break="1"><br></div>':'')).join('')}
function handwrittenHTML(rows){let html=blankPages(rows);if(rows.length===1&&rows[0].data?.html){const template=document.createElement('template');template.innerHTML=rows[0].data.html;const node=template.content;const batch=state.rows.filter(v=>v.batch_key===rows[0].batch_key&&v.batch_key).sort((a,b)=>a.ordinal-b.ordinal);const index=Math.max(0,batch.findIndex(v=>v.id===rows[0].id));const sheets=node.querySelectorAll('[data-handwritten-sheet14303]');const sheet=sheets[index];if(sheet){const numberCell=sheet.querySelector('[data-voucher-number14299]');if(numberCell)numberCell.textContent=rows[0].number;html=sheet.outerHTML}}
 return html;
}
async function printBlank(rows){if(!rows.length)return;const html=handwrittenHTML(rows);
 await openDocumentEditor105({title:(rows[0].data?.documentType==='receipt'?'Receipt':'Voucher')+' · '+rows[0].number,category:'Transactions',html,settings:rows[0].data?.settings||sheetSettings,voucher14299:{kind:'H',documentType:rows[0].data?.documentType,id:rows[0].id,date:rows[0].voucher_date,number:rows[0].number,batchIds:rows.map(v=>v.id),batchNumbers:rows.map(v=>v.number),count:rows.length}})}
async function blankDraft250(count,documentType='voucher',settings=sheetSettings,unit='Accounting'){
 const check=guard14370();if(!admin())throw Error('Administrator access required.');if(!Number.isInteger(count)||count<1||count>50)throw Error('Choose 1 to 50 blank forms.');
 const when=today(),numbers=await numbering.preview(documentType,when,count);check();const rows=numbers.map(number=>({number,voucher_date:when,data:{unit,documentType}}));
 await openDocumentEditor105({title:(documentType==='receipt'?'Blank Receipts':'Blank Vouchers')+' · Draft ('+count+')',category:'Transactions',html:blankPages(rows),settings:{...sheetSettings,...settings},voucher14299:{kind:'H',documentType,date:'',issueDate:when,unit,number:numbers[0],count,requestKey:crypto.randomUUID()}});
}
async function view(v){const check=guard14370(),client=ojmDb;const lines=v.data?.journal?.lines||[];const box=document.createElement('div');box.className='voucher-detail14299';box.innerHTML=`<h3>${esc(number(v))} · ${esc(v.status)}</h3><p>${esc(v.data?.id_format?.label||labels()[v.kind])} · ${esc(formatAppDate(v.voucher_date))} · Journal ${esc(v.data?.journal?.entry_no||'unlinked')}</p><p>${journalMemoHtml143187(v.data?.journal?.memo||'')}</p><table><thead><tr><th>Account</th><th>Memo</th><th>Debit</th><th>Credit</th><th>Currency</th></tr></thead><tbody>${lines.map(x=>`<tr><td>${esc(x.code)} ${esc(x.account)}</td><td>${journalMemoHtml143187(x.description)}</td><td>${esc(x.debit)}</td><td>${esc(x.credit)}</td><td>${esc(x.currency)}</td></tr>`).join('')}</tbody></table><p>Supporting proof: ${esc(v.data?.proof||'Record the location of the external proof in the editor.')}</p>${(v.data?.photos245||[]).map(p=>/^data:image\/(png|jpeg|webp);base64,/.test(p.image||'')?`<img src="${esc(p.image)}" alt="Completed receipt" style="max-width:100%;height:auto">`:'').join('')}<div id="voucherHistory14299">Loading correction history…</div><button type="button" class="je-btn" id="voucherClose14299">Close</button>`;const modal=$('voucherModal14299');modal.replaceChildren(box);modal.hidden=false;box.querySelector('#voucherClose14299').onclick=()=>modal.hidden=true;const history=box.querySelector('#voucherHistory14299');let versions;
 try{const read=async()=>{const rows=[];for(let offset=0;;offset+=500){check();const q=await client.from('voucher_versions14299').select('*').eq('voucher_id',v.id).order('version',{ascending:false}).range(offset,offset+499);check();if(q.error)throw q.error;if(!Array.isArray(q.data))throw Error('Correction history could not be read completely.');rows.push(...q.data);if(q.data.length<500)return rows}};versions=window.offline14239?await offline14239.snapshot('voucher-history-complete14370:'+v.id,read):await read();check();if(modal.hidden||!modal.contains(box))return;}
 catch(e){try{check()}catch{return}if(!modal.hidden&&modal.contains(box))history.textContent=e.message;return}
 history.innerHTML='<h4>Correction history</h4>';const summaryCache=new Map();const summary=x=>{if(summaryCache.has(x))return summaryCache.get(x);return summarize(x)};const summarize=x=>{const template=document.createElement('template');template.innerHTML=x.data?.html||'';const node=template.content;const total=node.querySelector('[data-voucher-total14298]')?.textContent.trim()||'—';const detail=[...node.querySelectorAll('table[data-voucher-table14298] tbody tr')].map(r=>r.cells[0]?.textContent.trim()).filter(Boolean).join('; ').slice(0,240);const value={date:x.data?.date||v.voucher_date,unit:x.data?.unit||'—',total,detail,journal:x.data?.journal?.entry_no||'Unlinked'};summaryCache.set(x,value);return value};for(let i=0;i<versions.length;i++){const x=versions[i],previous=versions.at(-1),now=summary(x),old=previous?summary(previous):null;const details=document.createElement('details');const head=document.createElement('summary');head.textContent=`Version ${x.version} · ${x.reason} · ${formatAppDate(x.changed_at,true)}`;details.append(head);const table=document.createElement('table');table.innerHTML='<thead><tr><th>Field</th><th>Original</th><th>This Version</th></tr></thead>';for(const key of ['date','unit','total','detail','journal']){const tr=document.createElement('tr');for(const value of [key,old?.[key]||'—',now[key]]){const td=document.createElement('td');td.textContent=value;tr.append(td)}table.append(tr)}details.append(table);history.append(details)}}
function linkedHTML(v){const template=document.createElement('template');template.innerHTML=v.data?.html||voucherHTML(v.number,v.voucher_date,v.data?.unit);const node=template.content;if(v.journal_number){const id=node.querySelector('[data-voucher-number14299]');if(id)id.textContent=number(v);const info=node.querySelector('[data-voucher-link14299]')||document.createElement('p');info.dataset.voucherLink14299='1';info.textContent=`Main Entry: ${v.data?.journal?.entry_no||''} · Original Sheet: ${v.number}`;if(!info.isConnected&&!info.parentNode)node.append(info)}return template.innerHTML}
async function edit(v){if(!state.ready)return;await openDocumentEditor105({title:`${v.data?.documentType==='receipt'?'Receipt':'Voucher'} ${v.number}`,category:'Transactions',html:linkedHTML(v),settings:{paper:'A5',...v.data?.settings},voucher14299:{kind:'E',documentType:v.data?.documentType,paymentMethod:v.data?.paymentMethod??'',date:v.data?.displayDate250??v.voucher_date,issueDate:v.voucher_date,unit:v.data?.unit||'Restaurant',currency:v.data?.currency??'',number:number(v),id:v.id,version:v.version}})}
async function link(v){if(!state.ready)return;const check=guard14370();const entries=[...new Map(JournalModule.entries.filter(x=>x.dbEntryId).map(x=>[x.id,x.dbEntryId])).entries()];const modal=$('voucherModal14299');const box=document.createElement('div');box.className='voucher-detail14299';box.innerHTML=`<h3>Link ${esc(v.number)}</h3><p>Select the posted journal Entry ID. Its general description and lines are copied to the voucher snapshot.</p><label>Journal Entry ID<input id="voucherEntryLookup14299" class="je-input" list="voucherEntryList14299" placeholder="Search Entry ID"></label><datalist id="voucherEntryList14299">${entries.map(([no])=>`<option value="${esc(no)}"></option>`).join('')}</datalist><p id="voucherLinkStatus14299" role="status"></p><footer><button type="button" id="voucherCancelLink14299" class="je-btn je-btn-secondary">Cancel</button><button type="button" id="voucherConfirmLink14299" class="je-btn je-btn-emerald">Link Entry</button></footer>`;modal.replaceChildren(box);modal.hidden=false;box.querySelector('#voucherCancelLink14299').onclick=()=>modal.hidden=true;box.querySelector('#voucherConfirmLink14299').onclick=async()=>{const button=box.querySelector('#voucherConfirmLink14299'),message=box.querySelector('#voucherLinkStatus14299');if(button.disabled)return;button.disabled=true;try{check();const id=box.querySelector('#voucherEntryLookup14299').value.trim();let resolved=entries.find(([no])=>no===id)?.[1];if(!resolved&&id){const found=await ojmDb.from('journal_entries').select('id').eq('entry_no',id).eq('status','posted').maybeSingle();check();if(found.error)throw found.error;resolved=found.data?.id}if(modal.hidden||!modal.contains(box))return;if(!resolved)throw Error('Choose a posted Entry ID from the list.');message.textContent='Linking entry…';await linkId(v.id,resolved);if(modal.contains(box))modal.hidden=true}catch(e){if(modal.contains(box))message.textContent=e.message||String(e)}finally{button.disabled=false}}}

async function markUnused(v){const check=guard14370();const modal=$('voucherModal14299');const box=document.createElement('div');box.className='voucher-detail14299';box.innerHTML=`<h3>Mark ${esc(v.number)} Unused</h3><p>This reference stays recorded and will never be issued again.</p><label>Reason<input class="je-input" id="voucherVoidReason14299" minlength="4" maxlength="240"></label><p role="status"></p><footer><button type="button" class="je-btn je-btn-secondary" id="voucherVoidCancel14299">Cancel</button><button type="button" class="je-btn" id="voucherVoidSave14299">Mark Unused</button></footer>`;modal.replaceChildren(box);modal.hidden=false;box.querySelector('#voucherVoidCancel14299').onclick=()=>modal.hidden=true;box.querySelector('#voucherVoidSave14299').onclick=async e=>{const reason=box.querySelector('input').value.trim();if(reason.length<4){box.querySelector('[role=status]').textContent='Enter a short explanation.';return}e.currentTarget.disabled=true;try{check();await rpc('voucher_void14299',{p_id:v.id,p_version:v.version,p_reason:reason});if(modal.contains(box))modal.hidden=true;await load()}catch(error){box.querySelector('[role=status]').textContent=error.message;e.target.disabled=false}}}
async function linkId(voucherId,entryId){try{const linked=await rpc('voucher_link14299',{p_id:voucherId,p_entry_id:entryId});acceptLinked(linked);await load();status('Voucher linked to journal entry. The journal lines were copied into its audit snapshot.')}catch(e){status(e.message,true);throw e}}
// A voucher selected for an unsynced journal is already in use on this device.
function reservedIds(){
 return new Set((window.journalDurable14385?.pending()||[]).filter(j=>j.voucher&&!j.voucherSkipped).map(j=>j.voucher));
}
function journalReferences(documents=false){
 const refs=new Map();
 if(!admin()||state.actor!==liveProfile.id||state.client!==ojmDb)return refs;
 const numbers=new Map();
 for(const v of state.rows){
  const ref=documents?v:v.number;
  numbers.set(v.id,ref);
  if(v.journal_entry_id)refs.set(v.journal_entry_id,ref);
 }
 for(const j of window.journalDurable14385?.pending()||[]){
  if(j.voucher&&!j.voucherSkipped&&numbers.has(j.voucher))refs.set(j.receipt?.[0]?.entry_id||j.id,numbers.get(j.voucher));
 }
 return refs;
}
function acceptLinked(result){
 const v=Array.isArray(result)?result[0]:result;
 if(!admin()||state.actor!==liveProfile.id||state.client!==ojmDb||!v?.journal_entry_id)return;
 const i=state.rows.findIndex(row=>row.id===v.id);
 if(i<0)state.rows.push(v);else if(state.rows[i].version<=v.version)state.rows[i]=v;
 render();picker();window.preparedViews14340?.documentsChanged?.();window.refreshNotices1443?.();
}
let lastReservations='';
window.addEventListener('local-work14333',()=>{
 const key=JSON.stringify([...reservedIds()].sort());
 if(key!==lastReservations){lastReservations=key;render();picker();}
});
let companySelection=null;
const docInput=()=>$('journalDocumentRef');
function readDocument(commit=false){
 const input=docInput(),select=$('jeVoucher14299');
 if(!input||input.disabled||!select)return {voucher:'',slip:''};
 const raw=input.value.trim(),slip=MonthlyCashSlip277.reference(raw);
 const voucher=raw&&!slip?[...select.options].find(o=>o.value&&o.text.toUpperCase()===raw.toUpperCase()):null;
 const message=raw&&!slip&&!voucher?'Choose an available voucher or receipt, or enter a slip row such as S1.':'';
 input.setCustomValidity(message);select.value=voucher?.value||'';
 if(commit&&!message)input.value=slip||voucher?.text||'';
 const preview=$('journalSlipPreview');
 if(preview){preview.textContent=!commit&&slip&&input.value!==slip?slip:'';preview.hidden=!preview.textContent;}
 if(commit&&message)throw Error(message);
 return {voucher:select.value,slip};
}
function setDocument(value=''){
 const input=docInput();if(!input)return;
 input.value=value;readDocument();
}
function picker(){
 const select=$('jeVoucher14299'),input=docInput();if(!select||!input)return;
 const field=select.closest('.voucher-pick14299'),list=$('journalDocumentChoices');
 if(window.personalJournal1437?.active){
  if(!companySelection)companySelection={text:input.value,owner:liveProfile?.id,client:ojmDb};
  setDocument();select.replaceChildren();list.replaceChildren();input.disabled=select.disabled=true;
  field.style.setProperty('display','none','important');return;
 }
 field.style.removeProperty('display');input.disabled=select.disabled=false;
 const current=admin()&&state.actor===liveProfile.id&&state.client===ojmDb;
 const selected=companySelection?(companySelection.owner===liveProfile?.id&&companySelection.client===ojmDb?companySelection.text:''):input.value;
 companySelection=null;
 const reserved=reservedIds(),available=(current?state.rows:[]).filter(v=>!v.journal_entry_id&&!reserved.has(v.id)&&v.status!=='void');
 select.replaceChildren(new Option('', ''),...available.map(v=>new Option(v.number,v.id)));
 list.replaceChildren(...available.map(v=>new Option(v.data?.documentType==='receipt'?'Receipt':'Voucher',v.number)));
 setDocument(selected);
}
function installDocumentField(field){
 field.innerHTML='<label for="journalDocumentRef">Supporting document</label><input id="journalDocumentRef" class="je-input" type="text" data-plain14285 list="journalDocumentChoices" autocomplete="off" aria-describedby="journalSlipPreview" placeholder="ID or S1" title="Choose a voucher or receipt, or type S and the printed slip row number."><output id="journalSlipPreview" for="journalDocumentRef" aria-live="polite" hidden></output><datalist id="journalDocumentChoices"></datalist><select id="jeVoucher14299" data-plain14285 hidden aria-hidden="true" style="display:none!important"><option value=""></option></select>';
 const input=field.querySelector('input');
 input.oninput=()=>readDocument();
 const commit=()=>{try{readDocument(true)}catch{input.reportValidity()}};
 input.onchange=commit;
 input.onblur=()=>{try{readDocument(true)}catch{/* Retain incomplete input for correction. */}};
 input.onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();commit()}};
}
// Use the saved sheet or batch page. Each click resolves the specific document.
async function openJournalDocument(doc){
 const check=guard14370();check();
 if(window.deviceVault14334?.unlocked===false)throw Error('Sign in to open supporting documents.');
 let row=state.actor===liveProfile.id&&state.client===ojmDb&&state.rows.find(v=>v.id===doc.id);
 if(!row){
  const response=await ojmDb.from('vouchers14299').select('*').eq('id',doc.id).single();check();
  if(response.error||!response.data)throw Error('The saved document could not be opened. Refresh and try again.');
  row=response.data;
 }
 const type=row.data?.documentType==='receipt'?'Receipt':'Voucher';
 const title=type+' '+row.number;
 if(!row.data?.html&&!row.data?.photos245?.length)return view(row);
 const html=row.kind==='H'?handwrittenHTML([row]):linkedHTML(row);
 const template=document.createElement('template');template.innerHTML=documentWorkspace105.sanitize(html);
 for(const field of template.content.querySelectorAll('[contenteditable]'))field.removeAttribute('contenteditable');
 for(const a of template.content.querySelectorAll('a'))a.removeAttribute('href');
 const d=document.createElement('dialog');d.className='journal-document-preview';d.setAttribute('aria-label',title);
 const heading=document.createElement('h3');heading.textContent=title;
 const close=document.createElement('button');close.type='button';close.className='je-btn je-btn-secondary';close.textContent='Close';close.onclick=()=>d.close();
 const header=document.createElement('header');header.append(heading,close);
 const frame=document.createElement('iframe');frame.title=title;frame.setAttribute('sandbox','');
 frame.srcdoc=`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><style>body{font:10pt Arial,sans-serif;color:#17231c;padding:12px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #7b867e;padding:2mm;text-align:left}img{max-width:100%}</style>`+template.innerHTML;
 d.append(header,frame);
 for(const photo of row.data?.photos245||[]){if(!/^data:image\/(png|jpeg|webp);base64,/.test(photo.image||''))continue;const img=document.createElement('img');img.src=photo.image;img.alt='Completed '+type.toLowerCase();d.append(img);}
 const gate=$('loginGate'),observer=new MutationObserver(()=>{if(!gate.classList.contains('is-authenticated'))d.close()});
 if(gate)observer.observe(gate,{attributes:true,attributeFilter:['class']});
 d.onclose=()=>{observer.disconnect();d.remove()};document.body.append(d);d.showModal();
}
function appendJournalDocuments(cell,entry,refs){
 if(!entry)return;
 const doc=admin()&&(refs?.get(entry.dbEntryId||entry.journalJob14385)||entry.supportingDocument);
 const add=(label,action)=>{
  const b=document.createElement('button');b.type='button';b.className='journal-document-link';b.textContent=label;
  b.onclick=async e=>{e.stopPropagation();try{await action()}catch(error){showCenterStatus(error.message,true)}};
  b.ondblclick=e=>e.stopPropagation();cell.append(' · ',b);
 };
 if(doc)add(((doc.documentType||doc.data?.documentType)==='receipt'?'Receipt ':'Voucher ')+doc.number,()=>openJournalDocument(doc));
 const slip=entry.cashSlipRef;
 if(slip&&MonthlyCashSlip277.reference(slip)===slip){
  const period='20'+slip.slice(1,3)+'-'+slip.slice(3,5),row=Number(slip.split('-')[1]);
  add('Monthly slip '+slip,()=>ui108.modal('Monthly Cash Slip',`<p><strong>${esc(MonthlyCashSlip277.monthLabel(period))}</strong> · Printed row ${row}</p><p>${esc(slip)}</p>`,[{label:'Close',value:true}]));
 }
}
function pendingEditorCount(){const reserved=reservedIds();return state.rows.filter(x=>x.kind==='E'&&!x.journal_entry_id&&!reserved.has(x.id)&&x.status!=='void').length}
function notices(){if(!admin()||!state.ready||state.actor!==liveProfile.id)return[];const count=pendingEditorCount();return count?[{type:'Editor vouchers to link',title:`${count} editor voucher${count===1?'':'s'} awaiting journal link`,detail:'Open Bookkeeping → Documents',target:'transactions-vouchers14299',count}]:[]}
async function postWrap(){if(typeof submitJournalEntry!=='function'||submitJournalEntry._voucherWrapped14299)return;const original=submitJournalEntry;submitJournalEntry=async function(...args){const check=guard14370(),select=$('jeVoucher14299');let doc;
try{doc=readDocument(true)}catch(e){showCenterStatus(e.message,true);return}
if(doc.slip&&!JournalModule.editingEntryId){showCenterStatus('This workflow uses a separate posting form. Include the slip reference in its general description.',true);return}
const id=doc.voucher;if(!id)return original.apply(this,args);if(state.posting)return;if(JournalModule.editingEntryId)return status('Link an existing entry from the voucher register after saving the correction.',true);if(document.getElementById('jeMultipleDates')?.checked||window.journalBatch1440?.hasPending())return status('Choose a single-date entry when linking a voucher during posting.',true);const request=document.getElementById('journalEntry98')._postingRequest14228||crypto.randomUUID();document.getElementById('journalEntry98')._postingRequest14228=request;state.posting=true;try{const result=await original.apply(this,args);check();const receipt=await ojmDb.rpc('journal_receipt14228',{p_request_key:request});check();const entryId=receipt.data?.result?.[0]?.entry_id||receipt.data?.result?.entry_id;if(!entryId){status('The voucher was not linked. If posting succeeded, use Link in the voucher register to connect the saved entry.',true);return result}try{await linkId(id,entryId);select.value=''}catch{}return result}finally{state.posting=false}};submitJournalEntry._voucherWrapped14299=true}
async function showDeviceDocuments(){
 const panel=$('paymentDevice401');if(!panel||!admin())return;
 const check=guard14370(),info=await numbering.summary();check();panel.replaceChildren();
 for(const [key,count] of Object.entries(info.stock)){
  const line=document.createElement('p');line.textContent=count+' offline '+key.split(':')[0]+' numbers available for '+key.split(':')[1];panel.append(line);
 }
 for(const item of info.pending){
  const line=document.createElement('div'),open=document.createElement('button');
  open.type='button';open.className='je-btn je-btn-secondary';open.textContent='Open';
  const range=item.numbers.length>1?item.numbers[0]+' – '+item.numbers.at(-1):item.numbers[0];
  line.append(range+' · '+(item.conflict?'Number conflict':item.held?'Saved on this device · reserved ID':'Saved on this device · pending ID')+' ');
  open.onclick=async()=>{try{
   const pending=await numbering.pending(item.id);check();if(!pending){await showDeviceDocuments();return}
   const req=pending.request,d=req.p_data,rows=numbering.localRows(pending),html=document.createElement('div');html.innerHTML=d.html;
   html.querySelectorAll('[data-voucher-number14299]').forEach((el,i)=>{if(rows[i])el.textContent=rows[i].number});
   await openDocumentEditor105({title:(item.type==='receipt'?'Receipt ':'Voucher ')+range,category:'Transactions',html:html.innerHTML,settings:d.settings,
    voucher14299:{kind:req.p_kind,id:rows[0].id,number:rows[0].number,date:d.displayDate250??req.p_date,issueDate:req.p_date,unit:d.unit,currency:d.currency,paymentMethod:d.paymentMethod,
      documentType:item.type,local401:true,held401:item.held,requestKey:item.id,issueRequest:req,count:rows.length,batchNumbers:pending.numbers,batchIds:rows.map(r=>r.id),reopened401:true}});
  }catch(e){status(e.message,true)}};
  line.append(open);
  if(item.conflict){const review=document.createElement('button');review.type='button';review.className=open.className;review.textContent='Review numbers';
   review.onclick=async()=>{try{const pending=await numbering.pending(item.id);check();if(!pending)return;
    const next=await rpc('payment_preview401',{p_type:item.type,p_date:pending.request.p_date,p_count:pending.request.p_count});check();
    if(!await ui108.confirm('Assign available numbers','Replace '+range+' with '+next.join(', ')+' for these unprinted documents?'))return;
    check();await numbering.acceptNext(item.id,next);await load();await showDeviceDocuments();
   }catch(e){status(e.message,true)}};line.append(review);}
  panel.append(line);
 }
}
async function offlineNumbersDialog(){
 if(!admin())return;const check=guard14370();
 const pending=ui108.modal('Prepare offline numbers','<div id="paymentReserve401"><label>Document type<select name="type"><option value="voucher">Payment voucher</option><option value="receipt">Receipt</option></select></label><label>Issue month<input name="month" type="month" value="'+today().slice(0,7)+'"></label><label>Number of forms<input name="count" type="number" min="1" max="50" value="10"></label><p>Reserve consecutive numbers for this device so its saved documents can be printed offline.</p></div>',[{label:'Cancel',value:false},{label:'Reserve numbers',value:true,primary:true}]);
 const dialog=$('paymentReserve401');if(!await pending)return;check();
 const type=dialog.querySelector('[name=type]').value,month=dialog.querySelector('[name=month]').value,count=Number(dialog.querySelector('[name=count]').value);
 if(!/^\d{4}-\d{2}$/.test(month)||!Number.isInteger(count)||count<1||count>50)throw Error('Choose a month and 1 to 50 forms.');
 const nums=await numbering.reserve(type,month+'-01',count);check();await showDeviceDocuments();
 status('Ready on this device: '+nums[0]+(nums.length>1?' – '+nums.at(-1):'')+'.');
}
async function syncDeviceDocuments(){
 const check=guard14370(),info=await numbering.summary();let problem='';
 for(const item of info.pending){check();try{await numbering.syncOne(item.id)}catch(e){problem=e.message;}}
 check();await load();await showDeviceDocuments();if(problem)status(problem,true);
}
function install(){const section=$('journal'),settings=$('settings-accounting');if(!section||!settings)return;const nav=document.querySelector('#nav-module-transactions .nav-links')||document.querySelector('[data-module="transactions"] .nav-links');const b=document.createElement('button');b.type='button';b.className='tab-btn';b.dataset.tabTarget='transactions-vouchers14299';b.textContent='Documents';b.setAttribute('onclick',"switchTab('transactions-vouchers14299');vouchers14299.open()");nav?.append(b);
const panel=document.createElement('section');panel.id='transactions-vouchers14299';panel.dataset.module='transactions';panel.className='tab-content';panel.innerHTML=`<div class="je-card"><div class="je-card-header"><div><h3 class="je-title">Documents</h3><p class="je-subtitle">Create vouchers, receipts and monthly cash slips.</p></div></div><div class="voucher-controls14299"><label>Operating Unit<select id="voucherUnit14299" class="je-select"><option>Restaurant</option><option>Wellness</option><option>Accounting</option></select></label><label>Currency<select id="voucherCurrency14299" class="je-select"><option>LAK</option><option>USD</option><option>THB</option></select></label><label>Voucher Date<input id="voucherDate14299" type="date" class="je-input"></label><button id="voucherCreate14299" type="button" class="je-btn je-btn-emerald">Create Voucher</button><button id="receiptCreate245" type="button" class="je-btn je-btn-emerald">Create Receipt</button><button id="paymentReserveButton401" type="button" class="je-btn je-btn-secondary">Prepare offline numbers</button><button id="paymentSync401" type="button" class="je-btn je-btn-secondary">Sync documents</button><button id="cashSlipCreate277" type="button" class="je-btn je-btn-emerald">Create Cash Slip</button></div><div id="paymentDevice401"></div><p id="voucherStatus14299" role="status"></p><div class="table-container"><table class="je-table"><thead><tr><th>Voucher / Receipt ID</th><th>Classification</th><th>Date</th><th>Status</th><th>Journal Entry</th><th class="voucher-actions14299">Actions</th></tr></thead><tbody id="voucherRows14299"></tbody></table></div></div>`;section.after(panel);
 for(const [id,action] of [['paymentReserveButton401',offlineNumbersDialog],['paymentSync401',syncDeviceDocuments]]){
  const button=$(id);button.onclick=async()=>{button.disabled=true;try{await action()}catch(e){status(e.message,true)}finally{button.disabled=false}};
 }
 $('voucherDate14299').value=today();$('voucherCreate14299').onclick=create;$('receiptCreate245').onclick=()=>createReceipt().catch(e=>status(e.message,true));$('cashSlipCreate277').onclick=()=>MonthlyCashSlip277.create().catch(e=>status(e.message,true));
const card=document.createElement('div');card.className='settings-compact-block voucher-config14299';card.innerHTML=`<div class="settings-mini-header"><div><h4>Voucher and receipt IDs</h4><p>Vouchers and receipts have separate monthly numbers, for example OJM26-VA1101 and OJM26-RA1101. Each series starts at 01 and advances to B after A99. Earlier documents keep their original numbers.</p></div></div>`;const accountingForm=settings.querySelector('form[data-settings-group=accounting]');if(accountingForm)accountingForm.after(card);else settings.querySelector('.je-card')?.append(card);
const group=document.querySelector('#journalEntry98 .je-meta-grid'),field=document.createElement('div');field.className='je-field-group voucher-pick14299';group?.append(field);installDocumentField(field);const modal=document.createElement('div');modal.id='voucherModal14299';modal.className='voucher-modal14299';modal.hidden=true;document.body.append(modal);postWrap();const hydrate=window.hydrateSupabaseSession;if(typeof hydrate==='function')window.hydrateSupabaseSession=async function(...args){const result=await hydrate.apply(this,args);void load();return result};load();}
window.vouchers14299= {load,picker,numbering,showDeviceDocuments,readDocument,setDocument,appendJournalDocuments,acceptLinked,journalReferences,createReceipt,blankDraft250,open(){void showDeviceDocuments().catch(e=>status(e.message,true));if(window.workspaceViews14364?.reuseView('transactions-vouchers14299'))return;if(state.ready&&state.actor===liveProfile?.id&&state.client===ojmDb){render();return}return ensureReady()},notices,linkId,get state(){return state},async saveEditor(model){const check=guard14370();check();const meta=model.voucher14299;if(!meta)throw Error('No voucher is open.');if(meta.kind==='E'&&!meta.id&&!meta.currency){const t=document.createElement('template');t.innerHTML=model.html;if(![...t.content.querySelectorAll('tbody tr')].some(r=>r.cells[2]?.textContent.trim())){meta.kind='H';meta.count=1;meta.issueDate=meta.issueDate||today();}}if(meta.local401)throw Error('Sync this saved device copy before recording changes. Your edits remain in the editor draft.');if(meta.kind==='H'){if(meta.id)return {id:meta.id,number:meta.number,batchIds:meta.batchIds,batchNumbers:meta.batchNumbers};if(!meta.issueRequest){meta.issueRequest={p_kind:'H',p_count:meta.count||1,p_date:meta.date||meta.issueDate||today(),p_data:{numberSeries401:true,html:model.html,settings:model.settings,unit:meta.unit,documentType:meta.documentType||'voucher',company:BusinessSettings.current?.legalName||BusinessSettings.current?.companyName||'',batch_count:meta.count||1},p_request_key:meta.requestKey};await documentWorkspace105.flush();check()}const rows=await numbering.issue(meta.issueRequest);check();meta.local401=!!rows[0].local401;meta.held401=!!rows[0].held401;meta.id=rows[0].id;meta.batchIds=rows.map(v=>v.id);meta.batchNumbers=rows.map(v=>v.number);if(!meta.local401)void load();void showDeviceDocuments().catch(()=>{});return {...rows[0],batchIds:meta.batchIds,batchNumbers:meta.batchNumbers}}const template=document.createElement('template');template.innerHTML=model.html;const node=template.content;const numberCell=node.querySelector('[data-voucher-number14299]');if(numberCell)numberCell.textContent=meta.number;model.html=template.innerHTML;const totalText=node.querySelector('[data-voucher-total14298]')?.textContent.trim()||'';const total=parseAppNumber(totalText);if(!Number.isFinite(total)||total<0)throw Error('Voucher amount must be valid.');const payload={html:model.html,settings:model.settings,title:model.title,unit:meta.unit,paymentMethod:meta.paymentMethod||'',...(meta.documentType==='receipt'?{documentType:'receipt'}:{}),currency:meta.currency||'',total,company:BusinessSettings.current?.legalName||BusinessSettings.current?.companyName||'',date:meta.date,displayDate250:meta.date};if(!/^\d{4}-\d{2}-\d{2}$/.test(meta.date||''))throw Error('Choose a date in Details.');if(!['LAK','USD','THB'].includes(meta.currency))throw Error('Select a currency.');let row;if(meta.id){const reason=prompt('Short explanation for this voucher correction:');if(reason===null)return null;if(reason.trim().length<4)throw Error('Enter at least four characters explaining the correction.');row=await rpc('voucher_update14299',{p_id:meta.id,p_version:meta.version,p_date:meta.date||meta.issueDate||today(),p_data:{...payload,journal:state.rows.find(v=>v.id===meta.id)?.data?.journal},p_reason:reason.trim()})}else{if(!meta.issueRequest){meta.issueRequest={p_kind:'E',p_count:1,p_date:meta.date||meta.issueDate||today(),p_data:{...payload,numberSeries401:true,tentative_number:meta.number},p_request_key:meta.requestKey};await documentWorkspace105.flush();check()}const result=await numbering.issue(meta.issueRequest);check();row=result[0];meta.local401=!!row.local401;meta.held401=!!row.held401}meta.id=row.id;meta.version=row.version;if(!meta.local401){if(meta.documentType==='receipt')await rpc('receipt_layout245',{p_settings:model.settings});void load()}void showDeviceDocuments().catch(()=>{});return row}};
window.addEventListener('online',async()=>{
 if(!admin())return;try{if((await numbering.summary()).pending.length)await syncDeviceDocuments()}catch(e){status(e.message,true)}
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();

/* Monthly cash slip */
/* Blank monthly cash slips. Preferences only; no voucher or journal issuance. */
(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const currentMonth=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Vientiane',year:'numeric',month:'2-digit'}).format(new Date());
const validMonth=value=>/^\d{4}-(0[1-9]|1[0-2])$/.test(value)&&Number(value.slice(0,4))>=1900&&Number(value.slice(0,4))<=9999;
const monthLabel=value=>validMonth(value)?new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value+'-01T12:00:00Z')):'________________ '+currentMonth().slice(0,4);
// The printed form accepts up to six-digit row numbers across continuation sheets.
function reference(text){
 const value=String(text||'').trim().toUpperCase();
 const full=/^S(\d{2}(?:0[1-9]|1[0-2]))-(\d{1,6})$/.exec(value);
 const short=/^S(\d{1,6})$/.exec(value);
 const row=Number(full?.[2]||short?.[1]);
 if(!row)return '';
 const period=full?.[1]||currentMonth().slice(2).replace('-','');
 return 'S'+period+'-'+String(row).padStart(2,'0');
}
const permitted=()=>typeof liveProfile!=='undefined'&&liveProfile?.role==='admin'&&liveProfile.status==='active'&&(!window.access113||access113.can('transactions-vouchers14299','view')&&access113.can('document-editor105','edit'));
function validate(value){
 const legend=(value.legend||[]).map(r=>({initials:String(r.initials||'').trim().toUpperCase(),name:String(r.name||'').trim()})).filter(r=>r.initials||r.name);
 if(legend.length>12)throw Error('Use up to 12 names so the legend fits on the page.');
 const seen=new Set();for(const row of legend){if(!/^[\p{L}]{1,2}$/u.test(row.initials)||!row.name)throw Error('Enter one or two letters and a full name for each legend entry.');if(row.name.length>80)throw Error('Keep each legend name within 80 characters.');if(seen.has(row.initials))throw Error('Use different initials for each person.');seen.add(row.initials);}
 const reviewer=String(value.reviewer||'').trim(),role=String(value.role||'').trim();
 if(!reviewer||!role)throw Error('Enter the reviewer’s name and role.');
 if(reviewer.length>120||role.length>80)throw Error('Shorten the reviewer name or role.');
 return {legend,reviewer,role};
}
const sheetSettings={paper:'A4',orientation:'portrait',top:10,right:10,bottom:10,left:10,size:10,line:1,font:'Arial',showBusinessName:false,pageNumbers:false,applyHeader:false,applyFooter:false};
function html(options){
 const value=validate(options),period=options.month||'',start=Number(options.start)||1;
 const widths=[3,4,4,37,6,11,11,12,12],head=['No','Date','Name','Description','Source','Debit','Credit','Signature 1','Signature 2'];
 const cell='border:0.5pt solid #555;padding:0.25mm 0.5mm;vertical-align:middle;font-size:10pt;line-height:1;color:#111;';
 const legend=[...value.legend,{initials:'____',name:'____________________'},{initials:'____',name:'____________________'}];
 return `<h1 style="text-align:center;color:#111;font-size:14pt;line-height:1.1;margin:0 0 2mm">MONTHLY CASH SLIP</h1>
 <p style="font-size:9pt;line-height:1.15;color:#111;margin:0 0 2mm">Internal record of cash receipts, releases and other cash movements. Supporting voucher for cash transactions without official receipts; secondary supporting document for bank movements.</p>
 <table data-cash-slip-table277="1" style="width:100%;table-layout:fixed;border-collapse:collapse;margin:0;color:#111"><colgroup>${widths.map(w=>`<col style="width:${w}%">`).join('')}</colgroup><thead><tr>${head.map(h=>`<th style="${cell}text-align:center;background-color:#fff;height:7mm;white-space:nowrap;padding:0.25mm 0.1mm;font-size:${['No','Date','Name'].includes(h)?'8':'9'}pt">${h}</th>`).join('')}</tr></thead><tbody>${Array.from({length:40},(_,i)=>`<tr style="height:4.8mm">${head.map((_,j)=>`<td style="${cell}height:4.8mm;${j===0?'text-align:center;':''}">${j===0?start+i:'<br>'}</td>`).join('')}</tr>`).join('')}</tbody></table>
 <div data-cash-slip-bottom277="1" style="display:flex;gap:6mm;margin-top:2mm;break-inside:avoid;color:#111">
 <div style="flex:1;min-width:0"><p style="font-size:10pt;line-height:1.15;margin:0 0 1.5mm"><strong>Month: </strong><span data-cash-slip-month277="${esc(period)}" style="display:inline-block;min-width:40mm;border-bottom:0.5pt solid #555">${esc(monthLabel(period))}</span></p><p style="font-size:9pt;line-height:1;margin:0 0 1mm"><strong>Name initials</strong></p><div style="column-count:2;column-gap:4mm">${legend.map(r=>`<p style="font-size:9pt;line-height:1.15;margin:0 0 1mm;break-inside:avoid"><strong>${esc(r.initials)}</strong> — ${esc(r.name)}</p>`).join('')}</div></div>
 <div data-cash-slip-reviewer277="1" style="width:46mm;flex-shrink:0;text-align:center"><p style="font-size:9pt;line-height:1.15;margin:0;text-align:center">Reviewed by</p><div style="height:11mm;border-bottom:0.5pt solid #333;margin:0 3mm 1mm"></div><p style="font-size:10pt;line-height:1.15;text-align:center;margin:0 0 1mm">${esc(value.reviewer)}</p><p style="font-size:9pt;line-height:1.15;text-align:center;margin:0">${esc(value.role)}</p></div></div>`;
}
function installStyle(){if(document.getElementById('cashSlipStyle277'))return;const style=document.createElement('style');style.id='cashSlipStyle277';style.textContent='.cash-slip-dialog277 .ui-modal108{width:min(620px,94vw)}#cashSlipSetup277 .cash-slip-fields277{display:grid;grid-template-columns:1fr 1fr;gap:12px}#cashSlipSetup277 .cash-slip-legend277{max-height:240px;overflow:auto;margin:8px 0}#cashSlipSetup277 [data-legend-row277]{display:grid;grid-template-columns:64px 1fr 32px;gap:8px;align-items:end;margin:6px 0}#cashSlipSetup277 input{min-width:0;width:100%}#cashSlipSetup277 input[type=checkbox]{width:auto}#cashSlipSetup277 label{display:block}#cashSlipSetup277 [role=alert]{color:#a32b2b}';document.head.append(style);}
let opening=false;
async function create(){
 if(opening||!permitted())return;opening=true;const actor=liveProfile.id,client=ojmDb,current=()=>permitted()&&liveProfile.id===actor&&ojmDb===client;
 try{
 const defaults=await window.printPreferences1434?.load();if(!current())return;const previous=defaults?.cashSlip277||{legend:[],reviewer:'Santos Cabigat',role:'Manager'};installStyle();
 const pending=ui108.modal('Monthly Cash Slip',`<form id="cashSlipSetup277"><div class="cash-slip-fields277"><label>Month and year<input class="je-input" type="month" name="month" min="1900-01" max="9999-12" value="${currentMonth()}"></label><label>First row number<input class="je-input" name="start" type="number" min="1" max="999960" value="1" required></label></div><p>40 blank rows for handwriting. Date cells are for the day number only.</p><fieldset><legend>Name initials</legend><div class="cash-slip-legend277"></div><button type="button" class="je-btn je-btn-secondary" data-add277>Add name</button></fieldset><div class="cash-slip-fields277"><label>Reviewer<input class="je-input" name="reviewer" list="cashSlipPeople277" maxlength="120" required value="${esc(previous.reviewer)}"></label><label>Role<input class="je-input" name="role" list="cashSlipRoles277" maxlength="80" required value="${esc(previous.role)}"></label></div><datalist id="cashSlipPeople277">${[...new Set([liveProfile.full_name,...(typeof liveProfiles!=='undefined'?liveProfiles:[]).map(p=>p.full_name)].filter(Boolean))].map(n=>`<option value="${esc(n)}"></option>`).join('')}</datalist><datalist id="cashSlipRoles277">${['Manager','Director','Cashier','Employee'].map(r=>`<option value="${r}"></option>`).join('')}</datalist><label><input type="checkbox" name="saveDefaults"> Save legend and reviewer as my defaults</label><p role="alert" aria-live="polite"></p></form>`,[{label:'Cancel',value:false},{label:'Open in Editor',value:true,primary:true}],true);
 const form=document.getElementById('cashSlipSetup277'),overlay=form.closest('.ui-overlay108'),list=form.querySelector('.cash-slip-legend277'),add=form.querySelector('[data-add277]'),button=overlay.querySelector('footer .primary108');overlay.classList.add('cash-slip-dialog277');
 const addRow=(r={})=>{if(list.children.length>=12)return;const row=document.createElement('div');row.dataset.legendRow277='1';row.innerHTML=`<label>Initials<input class="je-input" data-initials277 maxlength="2" value="${esc(r.initials||'')}" aria-label="Name initials"></label><label>Full name<input class="je-input" data-name277 maxlength="80" value="${esc(r.name||'')}" aria-label="Legend full name"></label><button class="je-btn je-btn-secondary" type="button" aria-label="Remove legend name">×</button>`;row.querySelector('button').onclick=()=>{row.remove();add.disabled=false};list.append(row);add.disabled=list.children.length>=12;};
 (previous.legend?.length?previous.legend:[{},{}]).forEach(addRow);add.onclick=()=>addRow();let options;
 button.onclick=async()=>{if(button.disabled)return;try{if(!current())throw Error('Your account changed. Reopen the cash slip.');if(!form.reportValidity())return;const value=validate({legend:[...list.children].map(r=>({initials:r.querySelector('[data-initials277]').value,name:r.querySelector('[data-name277]').value})),reviewer:form.elements.reviewer.value,role:form.elements.role.value});const month=form.elements.month.value,start=Number(form.elements.start.value);if(month&&!validMonth(month))throw Error('Choose a valid month and year.');if(!Number.isInteger(start)||start<1||start>999960)throw Error('Choose a valid first row number.');button.disabled=true;
 if(form.elements.saveDefaults.checked){if(!window.printPreferences1434)throw Error('Saved defaults are unavailable.');const latest=await printPreferences1434.load();if(!current())return;await printPreferences1434.save({...latest,cashSlip277:value});if(!current())return;}
 options={...value,month,start};overlay.resolve108(true);
 }catch(e){if(form.isConnected)form.querySelector('[role=alert]').textContent=e.message;}finally{button.disabled=false;}};
 if(!await pending||!options||!current())return;
 await openDocumentEditor105({title:'Monthly Cash Slip · '+monthLabel(options.month),category:'Transactions',cashSlip277:true,source:'transactions-vouchers14299',html:html(options),settings:sheetSettings});
 }finally{opening=false;}
}
async function pickMonth(node,changed,isCurrent){
 if(!node?.isConnected||!permitted())return;const actor=liveProfile.id,client=ojmDb,current=()=>permitted()&&liveProfile.id===actor&&ojmDb===client&&node.isConnected&&isCurrent();
 const pending=ui108.modal('Cash slip month',`<label>Month and year<input id="cashSlipMonth277" class="je-input" type="month" min="1900-01" max="9999-12" value="${esc(node.dataset.cashSlipMonth277||currentMonth())}"></label><p role="alert" id="cashSlipMonthError277"></p>`,[{label:'Cancel',value:false},{label:'Apply',value:true,primary:true}]);
 const input=document.getElementById('cashSlipMonth277'),overlay=input.closest('.ui-overlay108');let value;
 overlay.querySelector('footer .primary108').onclick=()=>{if(!input.reportValidity())return;if(input.value&&!validMonth(input.value)){document.getElementById('cashSlipMonthError277').textContent='Choose a valid month and year.';return;}value=input.value;overlay.resolve108(true);};
 if(await pending&&current()){node.dataset.cashSlipMonth277=value;node.textContent=monthLabel(value);changed();}
}
window.MonthlyCashSlip277={create,html,validate,monthLabel,currentMonth,reference,pickMonth,sheetSettings};
})();
