const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib');
const source=fs.readFileSync('assets/vendor/document14285/pdf.worker.min.mjs','utf8');
const start=source.indexOf('let ii=(()=>{'),end=source.indexOf('class BrotliStream',start);
assert.ok(start>0&&end>start);const decode=vm.runInNewContext(source.slice(start,end)+'ii',{},{timeout:5000});
const inputs=[Buffer.alloc(0),Buffer.from('the quick brown fox jumps over the lazy dog'),Buffer.from(('accounting document report financial balance transaction metadata import export '+ 'international information compression dictionary application language typography ').repeat(400)),Buffer.from('ภาษาไทย ພາສາລາວ 日本語 العربية English '.repeat(100)),Buffer.from(Array.from({length:65536},(_,i)=>(i*73+i%197)&255))];
let count=0;for(const data of inputs)for(const quality of [0,4,9,11]){const compressed=zlib.brotliCompressSync(data,{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:quality}});assert.deepEqual(Buffer.from(decode(new Int8Array(compressed))),data);count++}console.log('PASS PDF.js bundled Brotli decoder and embedded dictionary: '+count+' independent native Brotli fixtures');
