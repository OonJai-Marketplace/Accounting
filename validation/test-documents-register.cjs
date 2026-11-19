const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const {indexedDB}=require('fake-indexeddb');
const {randomUUID}=require('node:crypto');

(async()=>{
 const dom=new JSDOM('<div id="journal"></div><div id="settings-accounting"></div>',{runScripts:'outside-only',url:'https://fixture.invalid'});
 const w=dom.window,$=id=>w.document.getElementById(id);
 try{
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Vientiane',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const year=today.slice(0,4),past=String(Number(year)-1),month=today.slice(0,7);
  const rows=Array.from({length:35},(_,i)=>({
   id:'fixture-'+i,number:'Document '+i,kind:i%2?'E':'H',version:1,
   status:['reserved','issued','linked','void'][i%4],journal_entry_id:i%4===2?'journal':null,
   voucher_date:(i<30?year:past)+'-11-01',data:{documentType:i%2?'receipt':'voucher'}
  }));
  const reservations=new Map(),requests=[];
  Object.assign(w,{indexedDB,structuredClone,formatAppDate:String,liveProfile:{id:'fixture-admin',role:'admin',status:'active'},
   deviceVault14334:{unpack:value=>value,pack:value=>value},ojmDb:{
    from(table){
     const query={select:()=>query,eq:()=>query,order:()=>query,single:async()=>({data:{id:1}}),range:async()=>({data:table==='vouchers14299'?rows:[]})};
     return query;
    },
    async rpc(name,args){
     assert.equal(name,'payment_reserve401');requests.push(args);
     if(!reservations.has(args.p_key))reservations.set(args.p_key,Array.from({length:args.p_count},(_,i)=>
      'OJM'+args.p_date.slice(2,4)+'-'+(args.p_type==='receipt'?'R':'V')+'A'+args.p_date.slice(5,7)+String(i+1).padStart(2,'0')));
     return {data:reservations.get(args.p_key)};
    }
   }});
  w.crypto.randomUUID=randomUUID;
  w.eval(fs.readFileSync('scripts/vouchers14299.js','utf8'));
  await new Promise(r=>w.addEventListener('load',r,{once:true}));
  const docs=w.vouchers14299;await docs.load();
  assert.equal(requests.length,0,'Startup must not reserve IDs');
  const shown=()=>$('voucherRows14299').querySelectorAll('tr').length;
  const filter=(id,value)=>{const select=$(id);select.value=value;select.dispatchEvent(new w.Event('change',{bubbles:true}));};
  assert.equal($('documentYear').value,year);assert.equal(shown(),25);
  $('documentNext').click();assert.equal(shown(),5);assert($('documentNext').disabled);
  filter('documentYear',past);assert.equal(shown(),5);assert($('documentPages').hidden);
  filter('documentStatus','reserved');assert.equal(shown(),1);assert.match($('voucherRows14299').textContent,/Document 32/);
  filter('documentType','receipt');assert.match($('voucherRows14299').textContent,/No documents match/);
  filter('documentYear','');filter('documentStatus','used');filter('documentClass','E');
  assert.equal(shown(),9);assert.match($('voucherRows14299').textContent,/Issued/);assert([...$('voucherRows14299').rows].every(row=>row.cells[3].textContent==='Issued'));
  $('transactions-vouchers14299').classList.add('active');docs.open();docs.open();
  async function until(test){for(let n=0;n<100;n++){if(await test())return;await new Promise(r=>setTimeout(r,10));}throw Error('Timed out waiting for register update');}
  await until(async()=>{const {stock}=await docs.numbering.summary();return stock['voucher:'+month]===10&&stock['receipt:'+month]===10;});
  assert.equal(reservations.size,2);
  Object.defineProperty(w.navigator,'onLine',{value:false,configurable:true});
  const request={p_data:{numberSeries401:true,documentType:'receipt'},p_kind:'H',p_count:1,p_date:today,p_request_key:randomUUID()};
  const issued=await docs.numbering.issue(request);assert(issued[0].held401&&issued[0].local401);
  assert.equal((await docs.numbering.issue(request))[0].number,issued[0].number);
  await docs.showDeviceDocuments();filter('documentStatus','pending');filter('documentClass','H');
  assert.match($('voucherRows14299').textContent,/Pending sync · reserved ID/);
  assert.equal((await docs.numbering.summary()).stock['receipt:'+month],9);
  console.log('PASS current and previous year, used/reserved and classification filters, page bounds, automatic idempotent stock and offline pending receipt');
 }finally{dom.window.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
