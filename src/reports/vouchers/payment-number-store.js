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
  async function withSeries(type,date,action) {
    const check=guard(),run=()=>{check();return action()};
    const locks=globalThis.navigator?.locks;
    return locks?locks.request('payment-stock401:'+actor()+':'+scope(type,date),run):run();
  }
  async function prepareStock(type,date) {
    if(offline())return;
    const check=guard(),key=scope(type,date);
    // Check stock and persist its retry key in the same device transaction, across tabs.
    const intent=await local(s=>{
      if(s.intents[key])return s.intents[key];
      if(s.stock.some(x=>x.scope===key))return null;
      // A reservation must not take the numbers of an unconfirmed offline save.
      if(Object.values(s.pending).some(i=>!i.held&&scope(i.request.p_data.documentType||'voucher',i.request.p_date)===key))return null;
      return s.intents[key]={key:crypto.randomUUID(),type,date,count:10};
    },true);
    if(!intent)return;
    check();
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
    try{rows=await rpc('voucher_issue14299',item.request,'id,number,version')}catch(e){
      if(e.code==='P0401'||e.message?.includes('pending document number is no longer available')){
        check();await local(s=>{if(s.pending[id])s.pending[id].conflict=true},true);
      }throw e;
    }
    check();
    if(rows?.length!==item.numbers.length||rows.some(r=>!r.id||!r.number))throw Error('The complete document batch was not confirmed.');
    const confirmed=rows.map(({id,number,version})=>({id,number,version}));
    // Old offline installations may still have locally rendered PDF files.
    // Retire these only after the matching saved document and number are confirmed.
    check();
    await local((s,bytes,files)=>{
      for(const index of Object.keys(s.pending[id]?.pdfs||{})){
        const row=confirmed[Number(index)];
        if(!row||row.version!==1||row.number!==item.numbers[index])
          throw Error('The printed number or version differs. The device copy is kept for review.');
        files.remove(id+':'+index);
      }
      const key=scope(item.request.p_data.documentType||'voucher',item.request.p_date);
      s.next[key]=Math.max(s.next[key]||1,serial(confirmed.at(-1).number)+1);
      s.confirmed[id]=confirmed;delete s.pending[id];
    },true);
    return confirmed;
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
      if(!item.held)throw Error('This number is pending confirmation. Use Sync in Documents when connected before printing.');
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
    pending:Object.entries(s.pending).map(([id,i])=>({id,type:i.request.p_data.documentType||'voucher',date:i.request.p_date,kind:i.request.p_kind,numbers:i.numbers,conflict:i.conflict,held:i.held}))}));
  return {preview,syncOne,acceptNext,summary,pendingPdf,
    prepareStock:(type,date)=>withSeries(type,date,()=>prepareStock(type,date)),
    issue:request=>withSeries(request.p_data.documentType||'voucher',request.p_date,()=>issue(request)),
    confirmed:id=>local(s=>s.confirmed[id]),pending:id=>local(s=>s.pending[id]),localRows};
}
