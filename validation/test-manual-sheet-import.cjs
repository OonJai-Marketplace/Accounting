const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const JSZip = require('../assets/vendor/jszip.min.js');
const header = ['Revision part','Table','Operation','Captured UTC','Record ID','Part','Original JSON'];
const saved = [header, ['historic revision']];
const sheet = {
  getLastRow: () => saved.length, getMaxRows: () => 1000,
  getRange(start, column, count, width) {
    return {
      getDisplayValues: () => saved.slice(start-1,start-1+count).map(row=>row.slice(column-1,column-1+width)),
      setRichTextValues(rows) { assert.equal(start,saved.length+1);saved.push(...rows); }
    };
  }
};
const context = vm.createContext({
  Utilities: {
    Charset: {UTF_8:'utf8'}, DigestAlgorithm:{SHA_256:'sha256'},
    computeDigest: (algorithm,text) => [...crypto.createHash(algorithm).update(text).digest()],
    unzip(blob) { return blob.parts; }
  },
  XmlService: {parse(xml) {
    const [ns,value] = JSON.parse(execFileSync('python',['-c',
      'import sys,json,xml.etree.ElementTree as ET;r=ET.fromstring(sys.stdin.read());print(json.dumps([r.tag.split("}")[0][1:],r.text]))'],{input:xml}));
    return {getRootElement:()=>({getNamespace:()=>({getURI:()=>ns}),getText:()=>value})};
  }},
  SpreadsheetApp: {
    getActive:()=>({getSheetByName:name=>name==='Source Records'?sheet:null}),
    newRichTextValue:()=>({setText:text=>({build:()=>text})}),flush(){}
  },
  LockService:{getDocumentLock:()=>({waitLock(){},releaseLock(){}})}
});
vm.runInContext(fs.readFileSync(require.resolve('../integrations/google-sheets/Code.gs'),'utf8'),context);
(async()=>{
  const raw=JSON.stringify({id:'=001',memo:'<>&😀'.repeat(8000),amount:'0.4600'});
  const pack={format:'oonjai-portable-328',keys:{journal_entries:['id']},tables:{journal_entries:[raw]},attendance:[{id:'run',items:[{employee:'e',bucket:'days',day:{date:'2026-01-01'}}]}]};
  const json=()=>JSON.stringify({payload:JSON.stringify(pack),signature:'fixture'});
  const jsonFile={getName:()=>'Backup.json',getDataAsString:json};
  assert.match(context.uploadAccountingFile({archive:jsonFile}),/^3 archive rows added/);
  const bytes=new JSZip();
  bytes.file('customXml/item1.xml',Buffer.from('<backup xmlns="urn:oonjai:portable:328">'+json().replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')+'</backup>'));
  const xlsx=await JSZip.loadAsync(await bytes.generateAsync({type:'nodebuffer'}));
  const xml=(await xlsx.file('customXml/item1.xml').async('nodebuffer')).toString('utf8');
  const excel={getName:()=>'Raw.xlsx',copyBlob:()=>({setContentType:()=>({parts:[{getName:()=>'customXml/item1.xml',getDataAsString:()=>xml}]})})};
  assert.match(context.uploadAccountingFile({archive:excel}),/0 archive rows added. 3 already present/);
  assert.equal(saved[2][4],'=001');assert.equal(saved[2][6]+saved[3][6],raw);
  pack.tables.journal_entries=[JSON.stringify({id:'=001',memo:'correction'})];
  assert.match(context.uploadAccountingFile({archive:jsonFile}),/1 archive rows added. 1 already present/);
  assert.deepEqual(saved[1],['historic revision']);assert.equal(saved.length,6);
  console.log('PASS JSON, original Excel, replay, historical versions, partial attendance and literal values');
})().catch(e=>{console.error(e);process.exitCode=1;});
