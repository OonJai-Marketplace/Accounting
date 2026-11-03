/* Shared receipt layout and retained PDF delivery. No automatic sending. */
(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const image=v=>/^data:image\/(png|jpeg|webp);base64,/i.test(v||'')?v:'';
const fmt=n=>Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
function total(rows){let cents=0;for(const r of rows){const raw=String(r.amount??'').trim().replace(/,/g,'');if(!raw)continue;if(!/^\d+(?:\.\d{1,2})?$/.test(raw))throw Error('Use nonnegative amounts with at most two decimal places.');cents+=Math.round(Number(raw)*100);if(!Number.isSafeInteger(cents))throw Error('Amount is too large.');}return cents/100;}
function amountWords(value,currency=''){
 const cents=Math.round(Number(value)*100);if(!Number.isSafeInteger(cents)||cents<0)throw Error('Amount is outside the supported range.');
 const ones=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'],tens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
 const small=n=>n<20?ones[n]:n<100?tens[Math.floor(n/10)]+(n%10?'-'+ones[n%10]:''):ones[Math.floor(n/100)]+' hundred'+(n%100?' '+small(n%100):'');
 const integer=n=>{if(!n)return 'zero';const parts=[],scales=['','thousand','million','billion','trillion'];let i=0;while(n){const group=n%1000;if(group)parts.unshift(small(group)+(scales[i]?' '+scales[i]:''));n=Math.floor(n/1000);i++;}return parts.join(' ');};
 const whole=Math.floor(cents/100),fraction=cents%100,unit=currency==='USD'?(whole===1?'US dollar':'US dollars'):currency==='THB'?'baht':currency==='LAK'?'Lao kip':'',sub=currency==='THB'?'satang':currency==='USD'?(fraction===1?'cent':'cents'):'att';
 const words=integer(whole)+(unit?' '+unit:'')+(fraction?' and '+integer(fraction)+(currency?' '+sub:'/100'):'');return words[0].toUpperCase()+words.slice(1);
}
function choiceMark(checked){return `<span style="display:inline-block;width:3.5mm;height:3.5mm;border:1px solid #355c46;vertical-align:middle;text-align:center;line-height:3.2mm;font-family:Arial;color:#144c2a">${checked?'✓':'&nbsp;'}</span>`;}
function choices(field,value,blank=false){const options=field==='currency'?['LAK','USD','THB']:['Cash','Bank transfer',...(value==='Other'?['Other']:[])];return options.map(option=>`<span data-receipt-choice249="${field}:${option}" contenteditable="false" style="display:inline-block;white-space:nowrap;margin-right:2mm">${choiceMark(!blank&&option===value)} ${option==='Bank transfer'?'Bank':option}</span>`).join(' ');}
function syncFields(root,meta,amount){
 const hasAmount=[...root.querySelectorAll('table[data-voucher-table14298] tbody tr')].some(r=>r.cells[2]?.textContent.trim());
 root.querySelectorAll('[data-receipt-field245="words"]').forEach(n=>{const value=!hasAmount?'':amount===null?'—':amountWords(amount,meta.currency||'');if(n.textContent!==value)n.textContent=value;});
 root.querySelectorAll('[data-receipt-choice249]').forEach(n=>{const [field,value]=n.dataset.receiptChoice249.split(':');const checked=meta[field]===value;const html=choiceMark(checked)+' '+(value==='Bank transfer'?'Bank':value);if(n.dataset.checked250!==String(checked)){n.innerHTML=html;n.dataset.checked250=String(checked);}});
}
// Shared comma grouping for the document frame and the phone receipt form.
function groupAmount(raw){const text=String(raw).replace(/,/g,'');if(!/^\d*(?:\.\d{0,2})?$/.test(text))return String(raw);const [whole,decimal]=text.split('.');return whole.replace(/\B(?=(\d{3})+(?!\d))/g,',')+(decimal===undefined?'':'.'+decimal);}
function formatAmount(node){
 const input=node.tagName==='INPUT',before=input?node.value:node.textContent,after=groupAmount(before);if(before===after)return;
 const doc=node.ownerDocument,selection=doc.getSelection();let at=before.length;
 if(input)at=node.selectionStart??at;else if(selection?.rangeCount&&node.contains(selection.anchorNode)){const r=selection.getRangeAt(0).cloneRange();r.selectNodeContents(node);r.setEnd(selection.anchorNode,selection.anchorOffset);at=r.toString().length;}
 const count=before.slice(0,at).replace(/,/g,'').length;let pos=0,n=0;while(pos<after.length&&n<count){if(after[pos]!==',')n++;pos++;}if(at===before.length)pos=after.length;
 if(input){node.value=after;node.setSelectionRange(pos,pos);}else{node.textContent=after;const r=doc.createRange();r.setStart(node.firstChild||node,Math.min(pos,node.firstChild?.length||0));r.collapse(true);selection.removeAllRanges();selection.addRange(r);}
}
function html({number,date,currency='',paymentMethod='',party='',contact='',reference='',receiver='',rows=[],blank=false,type='receipt',displayDate=date}){
 const field=(label,value='',attribute='',width=34)=>`<p style="display:flex;gap:2mm;margin:2mm 0"><strong style="flex:0 0 ${width}mm;white-space:nowrap">${label}</strong><span ${attribute} style="flex:1;min-width:0;border-bottom:1px solid #7b867e;min-height:5mm">${esc(value)||'&nbsp;'}</span></p>`;
 const block=(label,value,attrs='')=>`<div><strong style="display:block;margin-bottom:2mm">${label}</strong><div ${attrs} style="min-height:7mm;border-bottom:1px solid #7b867e">${value||'&nbsp;'}</div></div>`;
 const filled=Array.from({length:7},(_,i)=>rows[i]||{}),title=type==='receipt'?'PAYMENT RECEIPT':'PAYMENT VOUCHER',amount=blank?0:total(filled);
 return `<h2 style="background-color:#144c2a;color:#fff;font-size:16pt;padding:3mm;margin:0 0 4mm">${title}</h2><div style="display:flex;gap:6mm;margin-bottom:4mm"><div style="flex:2;min-width:0">${field(type==='receipt'?'Received from':'Pay to',blank?'':party)}${field('Contact number',blank?'':contact)}</div><div style="flex:1;min-width:0">${field(type==='receipt'?'Receipt No.':'Voucher No.',number,'data-voucher-number14299="1" contenteditable="false"',25)}${field('Date',blank?'':displayDate,'data-voucher-date14299="1"',25)}</div></div><table ${blank?'data-handwritten-table14303="1"':'data-voucher-table14298="payment-'+type+'"'} style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:4mm"><colgroup><col style="width:60%"><col style="width:20%"><col style="width:20%"></colgroup><thead><tr style="background-color:#144c2a;color:#fff"><th>Description / Purpose</th><th>Reference / Unit</th><th>Amount</th></tr></thead><tbody>${filled.map(r=>`<tr style="height:8mm"><td>${esc(blank?'':r.description)||'<br>'}</td><td>${esc(blank?'':r.reference)||'<br>'}</td><td>${esc(blank?'':r.amount)||'<br>'}</td></tr>`).join('')}</tbody><tfoot><tr style="background-color:#eaf3e6"><td colspan="2"><strong>${type==='receipt'?'TOTAL RECEIVED':'TOTAL'}</strong></td><td ${blank?'':'data-voucher-total14298="1" contenteditable="false"'}>${blank?'<br>':fmt(amount)}</td></tr></tfoot></table><div style="display:flex;gap:6mm;margin-top:4mm"><div style="flex:2;min-width:0">${block('Amount in words',blank||!filled.some(r=>String(r.amount??'').trim())?'':esc(amountWords(amount,currency)),'data-receipt-field245="words" contenteditable="false"')}</div><div style="flex:1;min-width:0"><strong style="display:block;margin-bottom:2mm">Currency</strong>${choices('currency',currency,blank)}</div></div><div style="display:flex;gap:6mm;margin-top:4mm"><div style="flex:2;min-width:0">${block('Reference',esc(blank?'':reference))}</div><div style="flex:1;min-width:0"><strong style="display:block;margin-bottom:2mm">Payment type</strong>${choices('paymentMethod',paymentMethod,blank)}</div></div><div style="height:24mm"></div><p style="border-top:1px solid #7b867e;width:80mm;padding-top:3mm;margin-top:0">${esc(receiver)}<br>Received by (name and signature)</p>`;
}

const loads=new Map();function script(path,test){if(test())return Promise.resolve();if(!loads.has(path))loads.set(path,new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=path;s.onload=resolve;s.onerror=()=>{loads.delete(path);reject(Error('PDF tools did not load. Reconnect and retry.'))};document.head.append(s)}));return loads.get(path);}
async function frameHTML(host,contents,settings={}){
 const f=document.createElement('iframe');f.title='Receipt preview';f.setAttribute('sandbox','allow-same-origin');f.style.cssText='border:0;width:100%;height:65vh;background:#eee';host.replaceChildren(f);
 const img=k=>image(settings[k+'Image'])?`<img src="${image(settings[k+'Image'])}" style="max-width:100%;max-height:22mm">`:'';
 const pages=contents.map(content=>`<section class="page"><header>${settings.headerPlacement==='none'?'':img('header')}</header><main>${content}</main><footer>${settings.footerPlacement==='none'?'':img('footer')}</footer></section>`).join('');
 const ready=new Promise(r=>f.onload=r);f.srcdoc=`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'none'"><style>@page{size:A4 portrait;margin:0}*{box-sizing:border-box}body{margin:0;background:#eee;font:10pt Arial;color:#17231c}.page{width:210mm;height:297mm;padding:12mm 14mm;background:white;position:relative;margin:0 auto 8px}header{height:26mm}footer{position:absolute;bottom:12mm;left:14mm;right:14mm;height:22mm}table{width:100%}td,th{border:1px solid #7b867e;padding:2mm;text-align:left;overflow-wrap:anywhere}p{line-height:1.2}main{max-height:223mm;overflow:visible}@media print{body{background:white}.page{margin:0;break-after:page}}</style></head><body>${pages}</body></html>`;await ready;await Promise.all([...f.contentDocument.images].map(i=>i.decode().catch(()=>{})));if([...f.contentDocument.querySelectorAll('main')].some(m=>m.scrollHeight>m.clientHeight+2))throw Error('The details exceed one A4 page. Shorten the text before saving or printing.');return f;
}
const base64=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(r.error);r.readAsDataURL(blob)});
function pdfBlob(b64){const b=atob(b64),bytes=Uint8Array.from(b,c=>c.charCodeAt(0));return new Blob([bytes],{type:'application/pdf'});}
async function retained(rpc,row,makePDF,check=()=>{}){check();let saved=await rpc('receipt_pdf245',{p_id:row.id,p_version:row.version});check();if(!saved){const blob=await makePDF();check();saved=await rpc('receipt_pdf245',{p_id:row.id,p_version:row.version,p_pdf:await base64(blob)});check();}if(!saved?.base64)throw Error('The company PDF copy was not confirmed. Retry before sharing.');return new File([pdfBlob(saved.base64)],saved.filename,{type:'application/pdf'});}
function download(file,check=()=>{}){check();const u=URL.createObjectURL(file),a=document.createElement('a');a.href=u;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);}
function canShare(file){try{return !!window.ReceiptNative214?.sharePDF||!!navigator.canShare?.({files:[file]});}catch{return false;}}
function share(file,check){check();return window.ReceiptNative214?.sharePDF?ReceiptNative214.sharePDF(file):navigator.share({files:[file],title:file.name});}
function delivery(file,check=()=>{},notice=''){
 check();const d=document.createElement('dialog');d.className='receipt-delivery245';d.innerHTML='<h3>PDF saved</h3><p>Your company copy is retained. Choose how to release it.</p><p role="status"></p><div><button type="button" data-share>Share</button> <button type="button" data-download>Download</button> <button type="button" data-close>Close</button></div>';
 document.body.append(d);const message=d.querySelector('[role=status]');message.textContent=notice;d.querySelector('[data-close]').onclick=()=>d.close();d.onclose=()=>d.remove();d.querySelector('[data-download]').onclick=()=>{try{download(file,check);}catch(e){message.textContent=e.message}};
 const shareButton=d.querySelector('[data-share]');if(!canShare(file)){shareButton.disabled=true;message.textContent='This browser does not support sharing PDF files. Download the PDF and attach it in your chosen app.';}
 shareButton.onclick=async()=>{try{await share(file,check);check();message.textContent='Share menu closed. The company copy remains saved.';}catch(e){message.textContent=e.name==='AbortError'?'Sharing cancelled. The saved receipt is unchanged.':e.message}};d.showModal();return d;
}
function release(file,check,action){
 check();if(action==='download'){download(file,check);return;}
 if(action!=='share')return delivery(file,check);
 // Browsers require a recent tap; lengthy PDF preparation may consume it.
 if(!canShare(file)||(!window.ReceiptNative214?.sharePDF&&navigator.userActivation?.isActive===false))return delivery(file,check,'Your PDF is ready. Tap Share to choose an app.');
 const failed=e=>{if(e.name==='AbortError')return;try{check();delivery(file,check,e.name==='NotAllowedError'?'Your PDF is ready. Tap Share to choose an app.':e.message);}catch{}};
 try{Promise.resolve(share(file,check)).catch(failed);}catch(e){failed(e);}
}
async function pdf(dom){await script('scripts/document-downloads14311.js?v=143.75',()=>window.documentDownloads14311);return documentDownloads14311.pdf(dom);}
window.Receipt245={amountWords,groupAmount,formatAmount,choices,syncFields,html,total,fmt,esc,frameHTML,retained,delivery,release,pdf,base64,pdfBlob,script};
})();
