/* Local-only imports. Parsed content is sanitized by the document editor. */
(function(){'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paragraphs=s=>String(s).replace(/\r\n?/g,'\n').split('\n').map(x=>`<p>${esc(x)||'<br>'}</p>`).join('');
const xml=s=>{const d=new DOMParser().parseFromString(s,'application/xml');if(d.querySelector('parsererror'))throw Error('This document contains invalid XML.');return d};
const children=(n,name)=>Array.from(n.children||[]).filter(x=>x.localName===name);
const all=(n,name)=>Array.from(n.getElementsByTagNameNS('*',name));
const val=(n,name)=>n?.getAttributeNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main',name)||n?.getAttribute('w:'+name)||'';
// Bound declared and actual ZIP expansion; parsing runs in a disposable worker.
async function unzip14373(bytes){
 const maxEntry=16*1024*1024,maxTotal=64*1024*1024;
 const zip=await JSZip.loadAsync(bytes),entries=Object.entries(zip.files);
 if(entries.length>4096)throw Error('This archive contains too many files (maximum 4096).');
 let declared=0,total=0;const output=[];
 for(const [,entry] of entries){if(entry.dir)continue;const size=entry._data?.uncompressedSize;if(!Number.isSafeInteger(size)||size<0||size>maxEntry||(declared+=size)>maxTotal)throw Error('This archive exceeds the document import size limit (16 MB per file, 64 MB total).');}
 for(const [name,entry] of entries){
  if(entry.dir)continue;
  const data=await new Promise((resolve,reject)=>{
   const chunks=[];let size=0,failed=false;const stream=entry.internalStream('uint8array');
   stream.on('data',chunk=>{if(failed)return;size+=chunk.length;total+=chunk.length;if(size>maxEntry||total>maxTotal){failed=true;stream.pause();reject(Error('This archive expands beyond the document import size limit.'));return;}chunks.push(chunk);});
   stream.on('error',reject);stream.on('end',()=>{if(failed)return;const result=new Uint8Array(size);let at=0;for(const chunk of chunks){result.set(chunk,at);at+=chunk.length;}resolve(result);});stream.resume();
  });output.push([name,data]);
 }return output;
}
async function openZip(file,bytes){
 if(file.size>32*1024*1024)throw Error('This archive is too large to import (maximum 32 MB).');
 bytes||=new Uint8Array(await file.arrayBuffer());
 const entries=await new Promise((resolve,reject)=>{
  let worker,url,timer,settled=false;
  const finish=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);worker?.terminate();if(url)URL.revokeObjectURL(url);error?reject(error):resolve(result);};
  try{
   const library=new URL('assets/vendor/jszip.min.js?v=142.47',location.href).href;
   const source=`${unzip14373.toString()}\nself.onmessage=async event=>{try{importScripts(${JSON.stringify(library)});const entries=await unzip14373(event.data);self.postMessage({entries},entries.map(([,data])=>data.buffer));}catch(error){self.postMessage({error:String(error?.message||'The archive could not be read.')});}};`;
   url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));worker=new Worker(url);
   worker.onmessage=event=>{const result=event.data;Array.isArray(result?.entries)?finish(null,result.entries):finish(Error(result?.error||'The archive could not be read.'));};
   worker.onerror=event=>{event.preventDefault();finish(Error('The archive importer could not start. Reconnect and retry.'));};
   worker.onmessageerror=()=>finish(Error('The archive could not be read.'));
   timer=setTimeout(()=>finish(Error('This archive took too long to read. Export a smaller document and retry.')),10000);
   worker.postMessage(bytes,[bytes.buffer]);
  }catch(error){finish(error);}
 });
 const files=Object.create(null);
 for(const [name,data] of entries)files[name]={async:async type=>{
  if(type==='uint8array')return data;
  if(type==='string')return new TextDecoder().decode(data);
  if(type==='base64'){let binary='';for(let at=0;at<data.length;at+=16384)binary+=String.fromCharCode(...data.subarray(at,at+16384));return btoa(binary);}
  throw Error('Unsupported document content type.');
 }};
 return {files,file:name=>files[name]||null};
}
async function word(file,loadedZip){const zip=loadedZip||await openZip(file),part=zip.file('word/document.xml');if(!part)throw Error('This is not a valid DOCX document.');const d=xml(await part.async('string')),images=Object.create(null);const rel=zip.file('word/_rels/document.xml.rels');if(rel)for(const r of Array.from(xml(await rel.async('string')).documentElement.children)){if(r.getAttribute('TargetMode')==='External')continue;const target=r.getAttribute('Target')||'';if(!/^media\/[\w .-]+\.(png|jpe?g|webp)$/i.test(target))continue;const entry=zip.file('word/'+target);if(entry){const ext=target.split('.').pop().toLowerCase();images[r.getAttribute('Id')]=`data:image/${ext==='jpg'?'jpeg':ext};base64,${await entry.async('base64')}`;}}
 function inline(n){if(n.localName==='t')return esc(n.textContent);if(n.localName==='tab')return '&nbsp;&nbsp;&nbsp;&nbsp;';if(n.localName==='br'||n.localName==='cr')return '<br>';if(n.localName==='drawing'){const blip=all(n,'blip')[0],id=blip?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','embed');return images[id]?`<img src="${images[id]}" style="max-width:100%">`:'';}if(n.localName==='rPr'||n.localName==='pPr')return '';let result=Array.from(n.children||[]).map(inline).join('');if(n.localName==='r'){const pr=children(n,'rPr')[0];if(pr){for(const [key,tag] of [['b','strong'],['i','em'],['u','u'],['strike','s']]){const prop=children(pr,key)[0];if(prop&&!['0','false','none'].includes(val(prop,'val')))result=`<${tag}>${result}</${tag}>`;}const styles=[];const color=val(children(pr,'color')[0],'val'),size=Number(val(children(pr,'sz')[0],'val'));if(/^[0-9a-f]{6}$/i.test(color))styles.push('color:#'+color);if(size>=12&&size<=144)styles.push('font-size:'+size/2+'pt');if(styles.length)result=`<span style="${styles.join(';')}">${result}</span>`;}}return result;}
 function block(n){if(n.localName==='p'){const pr=children(n,'pPr')[0],style=val(pr&&children(pr,'pStyle')[0],'val'),heading=/^Heading([1-6])$/i.exec(style),tag=heading?'h'+heading[1]:'p';const align=val(pr&&children(pr,'jc')[0],'val');let body=inline(n);if(pr&&children(pr,'numPr').length)body='• '+body;return `<${tag}${['left','center','right','both'].includes(align)?` style="text-align:${align==='both'?'justify':align}"`:''}>${body||'<br>'}</${tag}>`;}if(n.localName==='tbl')return '<table style="border-collapse:collapse;width:100%"><tbody>'+children(n,'tr').map(tr=>'<tr>'+children(tr,'tc').map(tc=>'<td style="border:1px solid #999;padding:5px">'+Array.from(tc.children).map(block).join('')+'</td>').join('')+'</tr>').join('')+'</tbody></table>';return Array.from(n.children||[]).map(block).join('');}
 return all(d,'body').map(n=>Array.from(n.children).map(block).join('')).join('');}
function rtfText(s){let out='',skip=false,uc=1,stack=[];for(let i=0;i<s.length;){let c=s[i++];if(c==='{'){stack.push({skip,uc});continue}if(c==='}'){({skip,uc}=stack.pop()||{skip:false,uc:1});continue}if(c!=='\\'){if(!skip&&c!=='\r'&&c!=='\n')out+=c;continue}c=s[i++];if(c==='*'){skip=true;continue}if(['\\','{','}'].includes(c)){if(!skip)out+=c;continue}if(c==="'"){if(!skip)out+=new TextDecoder('windows-1252').decode(new Uint8Array([parseInt(s.slice(i,i+2),16)||32]));i+=2;continue}const m=/^([a-z]+)(-?\d+)? ?/i.exec(c+s.slice(i));if(!m)continue;i+=m[0].length-1;const key=m[1],number=Number(m[2]);if(['fonttbl','colortbl','stylesheet','info','pict','object','header','footer'].includes(key)){skip=true;continue}if(key==='uc'){uc=number;continue}if(skip)continue;if(key==='u'){out+=String.fromCharCode(number<0?number+65536:number);for(let k=0;k<uc&&i<s.length;k++){if(s[i]==='\\'&&s[i+1]==="'")i+=4;else if(!'{}\\'.includes(s[i]))i++;}}else if(['par','line','row'].includes(key))out+='\n';else if(['tab','cell'].includes(key))out+='\t';}return out;}
async function odt(file,loadedZip){const zip=loadedZip||await openZip(file),part=zip.file('content.xml');if(!part)throw Error('This is not a valid ODT document.');const d=xml(await part.async('string'));function block(n){if(['p','h'].includes(n.localName))return `<p>${esc(n.textContent)}</p>`;if(n.localName==='table')return '<table><tbody>'+Array.from(n.children).map(block).join('')+'</tbody></table>';if(n.localName==='table-row')return '<tr>'+Array.from(n.children).map(block).join('')+'</tr>';if(n.localName==='table-cell')return '<td style="border:1px solid #999">'+Array.from(n.children).map(block).join('')+'</td>';return Array.from(n.children||[]).map(block).join('');}return block(all(d,'body')[0]||d.documentElement);}
let pdfLibrary;
async function pdfDocument(bytes,mode='text'){
 pdfLibrary||=import(new URL('assets/vendor/document14285/pdf.min.mjs',location.href).href).catch(error=>{pdfLibrary=null;throw error});
 const pdfjs=await pdfLibrary;pdfjs.GlobalWorkerOptions.workerSrc=new URL('assets/vendor/document14285/pdf.worker.min.mjs',location.href).href;
 // Own the native worker: malformed PDF parsers must never fall back to the UI thread.
 const nativeWorker=new Worker(pdfjs.GlobalWorkerOptions.workerSrc,{type:'module'});
 let worker,task,timer,aborted=false,closed=false,rejectAbort;
 const abortPromise=new Promise((_,reject)=>{rejectAbort=reject});abortPromise.catch(()=>{});
 const abort=error=>{if(closed||aborted)return;aborted=true;clearTimeout(timer);nativeWorker.terminate();rejectAbort(error)};
 const arm=()=>{clearTimeout(timer);if(!aborted&&!closed)timer=setTimeout(()=>abort(Error('This PDF took too long to read. Export a smaller PDF and retry.')),30000)};
 const wait=promise=>{arm();return Promise.race([promise,abortPromise]).finally(()=>clearTimeout(timer))};
 nativeWorker.addEventListener('error',event=>{event.preventDefault();abort(Error('The PDF importer could not start or stopped unexpectedly. Reload and retry.'))});
 nativeWorker.addEventListener('messageerror',()=>abort(Error('The PDF worker returned unreadable content.')));
 // PDF.js reports failed asynchronous image decoding as null rather than rejecting render().
 nativeWorker.addEventListener('message',({data})=>{const d=data?.data;if(data?.stream&&data.reason){abort(Error(data.reason.message||'The PDF could not be read completely.'));return}if((data?.action==='obj'&&d?.[2]==='Image'&&d[3]===null)||(data?.action==='commonobj'&&d?.[1]==='Image'&&d[2]===null))abort(Error('An image in this PDF could not be decoded. Re-export the PDF and retry.'))});
 let html='';try{
 worker=new pdfjs.PDFWorker({port:nativeWorker});
 task=pdfjs.getDocument({data:bytes,worker,useWasm:false,useSystemFonts:true,isEvalSupported:false,stopAtErrors:true,maxImageSize:16777216});
 task.onPassword=async(update,reason)=>{clearTimeout(timer);try{const password=await window.ui117?.prompt(reason===2?'Incorrect password. Enter the PDF password:':'Enter the PDF password:','');if(!closed&&!aborted){arm();update(password==null?Error('PDF import cancelled.'):password)}}catch(error){if(!closed&&!aborted){arm();update(error instanceof Error?error:Error('The PDF password prompt failed.'))}}};
 const pdf=await wait(task.promise);for(let i=1;i<=pdf.numPages;i++){
  const page=await wait(pdf.getPage(i)),base=page.getViewport({scale:1});
  html+=i>1?'<div data-page-break="true"></div>':'';
  const content=mode==='text'?await wait(page.getTextContent()):null,items=content?.items.filter(t=>typeof t.str==='string'&&t.str.trim())||[];
  if(items.length){
   const lines=[];let line=null;
   for(const item of items){const x=item.transform[4],y=item.transform[5],size=Math.max(6,Math.min(48,Math.hypot(item.transform[2],item.transform[3])||item.height||10));
    if(!line||Math.abs(line.y-y)>Math.max(2,size*.35)||x<line.lastX-2){line={y,lastX:x,parts:[],size};lines.push(line)}
    const style=content.styles[item.fontName]||{},font=style.fontFamily||'',bold=/bold|black|heavy/i.test(item.fontName+' '+font),italic=/italic|oblique/i.test(item.fontName+' '+font);
    line.parts.push('<span style="font-size:'+size.toFixed(1)+'pt;'+(bold?'font-weight:bold;':'')+(italic?'font-style:italic;':'')+'">'+esc(item.str)+'</span>');line.lastX=x;line.size=Math.max(line.size,size);if(item.hasEOL)line=null;
   }
   html+=lines.map(l=>'<p style="margin:0 0 4pt;line-height:1.25">'+l.parts.join(' ')+'</p>').join('');
  }else{
   const viewport=page.getViewport({scale:Math.min(2,1600/Math.max(base.width,base.height))}),canvas=document.createElement('canvas');
   try{canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await wait(page.render({canvasContext:canvas.getContext('2d'),viewport}).promise);const w=Math.min(185,260*base.width/base.height),h=w*base.height/base.width;
    html+=`<p style="margin:0"><img src="${canvas.toDataURL('image/png')}" alt="PDF page ${i}${mode==='text'?' — scanned page; text recognition required':''}" style="width:${w}mm;height:${h}mm;max-width:100%"></p>`;
   }finally{canvas.width=canvas.height=0}
  }page.cleanup();
 }}finally{
  clearTimeout(timer);
  try{if(task){const cleanup=task.destroy();if(aborted)cleanup.catch(()=>{});else await wait(cleanup)}}finally{closed=true;clearTimeout(timer);worker?.destroy();nativeWorker.terminate()}
 }return html;
}

function decodeText(bytes){if(bytes[0]===255&&bytes[1]===254)return new TextDecoder('utf-16le').decode(bytes.subarray(2));if(bytes[0]===254&&bytes[1]===255)return new TextDecoder('utf-16be').decode(bytes.subarray(2));return new TextDecoder().decode(bytes);}
function binaryWord(bytes){
 if(typeof CFB==='undefined')throw Error('The Word importer is unavailable. Reload the app.');const compound=CFB.read(bytes,{type:'array'}),part=name=>{const raw=CFB.find(compound,name)?.content;return raw?Uint8Array.from(raw):null},word=part('WordDocument');if(!word)throw Error('This file does not contain a Word document.');const view=new DataView(word.buffer,word.byteOffset,word.byteLength),u16=o=>view.getUint16(o,true),u32=o=>view.getUint32(o,true);if(u16(10)&0x100)throw Error('This Word document is encrypted. Remove its password and import it again.');const table=part(u16(10)&0x200?'1Table':'0Table');if(!table)throw Error('The Word document table is missing.');let offset=32;const csw=u16(offset);offset+=2+csw*2;const cslw=u16(offset);offset+=2+cslw*4;const pairs=u16(offset);offset+=2;if(pairs<=33)throw Error('This Word version has no readable text table. Save it as DOCX.');const start=u32(offset+33*8),size=u32(offset+33*8+4),tv=new DataView(table.buffer,table.byteOffset,table.byteLength);let at=start,end=start+size,text='';while(at<end&&table[at]===1)at+=3+tv.getUint16(at+1,true);if(table[at]!==2)throw Error('The Word text table is invalid.');const length=tv.getUint32(at+1,true),n=(length-4)/12;at+=5;if(!Number.isInteger(n)||n<0||at+length>table.length)throw Error('The Word text table is truncated.');const cp=i=>tv.getUint32(at+i*4,true);for(let i=0;i<n;i++){const count=cp(i+1)-cp(i),raw=tv.getUint32(at+4*(n+1)+i*8+2,true),compressed=!!(raw&0x40000000),position=(raw&0x3fffffff)/(compressed?2:1);text+=new TextDecoder(compressed?'windows-1252':'utf-16le').decode(word.subarray(position,position+count*(compressed?1:2)));}return paragraphs(text.replace(/\x07/g,'\t').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,''));
}
// Compound-file parsing can loop on corrupt directory/FAT chains. Keep the
// complete legacy parser off the UI thread and terminate failed imports.
function binaryWordAsync14371(bytes){
 return new Promise((resolve,reject)=>{
  let worker,url,timer,settled=false;
  const finish=(error,html)=>{
   if(settled)return;settled=true;clearTimeout(timer);
   worker?.terminate();if(url)URL.revokeObjectURL(url);
   error?reject(error):resolve(html);
  };
  try{
   const library=new URL('assets/vendor/document14285/cfb.min.js?v=142.94',location.href).href;
   const source=`const esc=${esc.toString()};const paragraphs=${paragraphs.toString()};
${binaryWord.toString()}
self.onmessage=event=>{try{importScripts(${JSON.stringify(library)});self.postMessage({html:binaryWord(event.data)});}catch(error){self.postMessage({error:String(error?.message||'The Word document could not be read.')});}};`;
   url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
   worker=new Worker(url);
   worker.onmessage=event=>{const result=event.data;if(typeof result?.html==='string')finish(null,result.html);else finish(Error(result?.error||'The Word document could not be read.'));};
   worker.onerror=event=>{event.preventDefault();finish(Error('The Word importer could not start. Reconnect and retry.'));};
   worker.onmessageerror=()=>finish(Error('The Word document could not be read.'));
   timer=setTimeout(()=>finish(Error('This Word document took too long to read. Save it as DOCX and import that copy.')),10000);
   worker.postMessage(bytes,[bytes.buffer]);
  }catch(error){finish(error);}
 });
}
async function archiveDocument(file,bytes){const zip=await openZip(file,bytes);if(zip.file('word/document.xml'))return {html:await word(file,zip),note:'Word text, tables and images imported. Review complex formatting.'};if(zip.file('content.xml'))return {html:await odt(file,zip),note:'OpenDocument text and tables imported. Review formatting.'};if(zip.file('ppt/presentation.xml')){let html='';const slides=Object.keys(zip.files).filter(p=>/^ppt\/slides\/slide\d+\.xml$/.test(p)).sort((a,b)=>Number(a.match(/slide(\d+)/)[1])-Number(b.match(/slide(\d+)/)[1]));for(const [i,path] of slides.entries()){const d=xml(await zip.file(path).async('string'));html+='<h2>Slide '+(i+1)+'</h2>'+all(d,'p').map(p=>'<p>'+all(p,'t').map(t=>esc(t.textContent)).join(' ')+'</p>').join('');}return {html,note:'Presentation text imported. Review slide layout and images in the original file.'};}
if(zip.file('xl/workbook.xml')){const stringsPart=zip.file('xl/sharedStrings.xml'),strings=stringsPart?all(xml(await stringsPart.async('string')),'si').map(n=>all(n,'t').map(t=>t.textContent).join('')):[],sheets=Object.keys(zip.files).filter(p=>/^xl\/worksheets\/sheet\d+\.xml$/.test(p)).sort((a,b)=>Number(a.match(/sheet(\d+)/)[1])-Number(b.match(/sheet(\d+)/)[1]));let html='';for(const [i,path]of sheets.entries()){const d=xml(await zip.file(path).async('string'));html+='<h2>Sheet '+(i+1)+'</h2><table style="width:100%;border-collapse:collapse"><tbody>'+all(d,'row').map(row=>'<tr>'+(()=>{let column=0;return children(row,'c').map(c=>{const letters=(c.getAttribute('r')||'').match(/^[A-Z]+/i)?.[0];let index=letters?[...letters.toUpperCase()].reduce((n,ch)=>n*26+ch.charCodeAt(0)-64,0):column+1;if(index>16384||index<=column)throw Error('Invalid worksheet cell position.');const gaps='<td></td>'.repeat(index-column-1);column=index;const raw=all(c,'v')[0]?.textContent||all(c,'t').map(t=>t.textContent).join(''),value=c.getAttribute('t')==='s'?strings[Number(raw)]||'':raw;return gaps+'<td style="border:1px solid #999;padding:4px">'+esc(value)+'</td>'}).join('')})()+'</tr>').join('')+'</tbody></table>';}return {html,note:'Workbook cell values imported as document tables. Review dates and cell formatting in the original file.'};}
const preview=zip.file('QuickLook/Preview.pdf')||zip.file('preview.pdf');if(preview)return {html:await pdfDocument(await preview.async('uint8array'),'layout'),note:'Document preview imported as printable pages.'};const container=zip.file('META-INF/container.xml');if(container){const metadata=xml(await container.async('string')),root=all(metadata,'rootfile')[0]?.getAttribute('full-path'),opf=zip.file(root||'');if(opf){const d=xml(await opf.async('string')),base=root.slice(0,root.lastIndexOf('/')+1),items=new Map(all(d,'item').map(n=>[n.getAttribute('id'),n.getAttribute('href')]));let html='';for(const ref of all(d,'itemref')){const href=items.get(ref.getAttribute('idref')),part=href&&zip.file(base+href);if(part)html+=new DOMParser().parseFromString(await part.async('string'),'text/html').body.innerHTML;}return {html,note:'EPUB chapters imported. Review layout.'}}}throw Error('This archive does not contain a readable document or PDF preview.');}
window.importDocument1422=async function(file,options={}){
 if(file.size>32*1024*1024&&await file.slice(0,2).text()==='PK')throw Error('This archive is too large to import (maximum 32 MB).');
 const bytes=new Uint8Array(await file.arrayBuffer()),ext=file.name.split('.').pop().toLowerCase();let html='',note='';
 if(bytes[0]===0x50&&bytes[1]===0x4b){const data=await archiveDocument(file,bytes);html=data.html;note=data.note;}
 else if(new TextDecoder().decode(bytes.subarray(0,1024)).includes('%PDF-')){html=await pdfDocument(bytes,options.pdfMode||'text');note=options.pdfMode==='layout'?'PDF original appearance retained as page images; image text is not editable.':'PDF text imported for editing. Layout, tables and illustrations may differ; use Original appearance to retain them. Scanned pages remain images and need text recognition.';}
 else if(bytes[0]===0xd0&&bytes[1]===0xcf){html=await binaryWordAsync14371(bytes);note='Legacy Word text imported. Review formatting.';}
 else if(/^image\/(?:png|jpeg|webp)$/.test(file.type)){const src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file)});html='<p><img src="'+src+'" style="max-width:100%"></p>';note='Image document imported.';}
 else{const text=decodeText(bytes);if(/^\s*{\\rtf/.test(text)){html=paragraphs(rtfText(text));note='RTF text imported. Review formatting.';}else if(/^\s*(?:<!doctype html|<html|<body)/i.test(text)||['html','htm','xhtml'].includes(ext)){html=new DOMParser().parseFromString(text,'text/html').body.innerHTML;note='HTML imported; unsafe content removed.';}else if(ext==='json'){const data=JSON.parse(text);if(data.format==='oonjai-document105'&&typeof data.html==='string')return data;html='<pre>'+esc(JSON.stringify(data,null,2))+'</pre>';note='JSON content imported.';}else if(ext==='md'||ext==='markdown'){await window.optionalTools14335?.load('markdown');html=window.marked?marked.parse(text,{gfm:true}):paragraphs(text);note='Markdown imported.';}else if(ext==='xml'||ext==='fodt'){const d=xml(text);html=paragraphs(all(d,'p').map(n=>n.textContent).join('\n')||d.documentElement.textContent);note='XML document text imported.';}else{if(bytes.includes(0)&&!((bytes[0]===255&&bytes[1]===254)||(bytes[0]===254&&bytes[1]===255)))throw Error('This binary format has no readable document content. Export it as PDF, DOCX, ODT or text and import that copy.');html=paragraphs(text);note='Text document imported.';}}
 if(!html.trim())throw Error('No readable content was found in this document.');
 return {format:'oonjai-document105',title:file.name.replace(/\.[^.]+$/,''),html,settings:{orientation:'portrait',...(note.startsWith('PDF')||note.includes('preview')?{applyHeader:false,applyFooter:false}: {})},importNote:note};
};
})();
