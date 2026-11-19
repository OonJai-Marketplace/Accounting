const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const listeners=new Map(),nodes=[];
const events={addEventListener(n,f){const a=listeners.get(n)||[];a.push(f);listeners.set(n,a);}};
function node(tag='div'){
 const e={tag,dataset:{},children:[],open:false,innerHTML:'',handlers:{},parts:new Map(),
  addEventListener(n,f){this.handlers[n]=f;},setAttribute(){},querySelectorAll(){return [];},matches(){return false;},
  querySelector(s){if(!this.parts.has(s))this.parts.set(s,node());return this.parts.get(s);},
  append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;this.innerHTML='';},
  remove(){this.removed=true;},showModal(){this.open=true;},close(){this.open=false;this.handlers.close?.();}};
 nodes.push(e);return e;
}
let release=null;
const document={...events,readyState:'loading',hidden:false,documentElement:{dataset:{device132:'desktop'}},body:node(),querySelectorAll:()=>[],createElement:node};
const ctx={console,document,window:{...events,OJM_SUPABASE_URL:'https://example.invalid',deviceVault14334:{actor:'admin',unlocked:true},access113:{can:()=>false}},navigator:{onLine:true},liveProfile:{id:'admin'},ojmDb:{auth:{getSession:async()=>({data:{session:{user:{id:'admin'}}}})}},ResizeObserver:class{observe(){} disconnect(){}},MutationObserver:class{observe(){}},setTimeout:()=>1,clearTimeout(){},ReceiptLinks208:{dismissOnBackdrop(){},create(){return {api:async()=>release?await new Promise(r=>release=r):{documents:[]}};}}};
ctx.deviceVault14334=ctx.window.deviceVault14334;vm.runInNewContext(fs.readFileSync('src/documents/scanner/viewer208.js','utf8'),ctx);vm.runInNewContext(fs.readFileSync('src/documents/scanner/journal-receipts224.js','utf8'),ctx);
const emit=n=>{for(const f of listeners.get(n)||[])f({});};emit('DOMContentLoaded');
(async()=>{
 await ctx.window.JournalReceipts224.open('TEST001');let dialog=nodes.filter(n=>n.tag==='dialog').at(-1);assert(dialog.open);
 ctx.liveProfile.id='other';emit('account-access477');assert(!dialog.open,'account event closes receipts immediately');assert(dialog.removed);
 ctx.liveProfile.id='admin';await ctx.window.JournalReceipts224.open('TEST001');dialog=nodes.filter(n=>n.tag==='dialog').at(-1);assert(dialog.open);ctx.deviceVault14334.unlocked=false;emit('account-access477');assert(!dialog.open,'lock event clears receipts immediately');
 ctx.deviceVault14334.unlocked=true;await ctx.window.JournalReceipts224.open('TEST001');dialog=nodes.filter(n=>n.tag==='dialog').at(-1);document.documentElement.dataset.device132='phone';emit('tabletviewport132');assert(!dialog.open,'switching device mode preserves phone isolation');
 console.log('PASS: immediate receipt cleanup on account, lock and device-mode changes without polling');
})().catch(e=>{console.error(e);process.exit(1);});
