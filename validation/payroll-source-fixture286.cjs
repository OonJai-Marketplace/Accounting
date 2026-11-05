// Real payroll metadata, link editor, save and posting flows with in-memory data.
const fs=require('node:fs'),path=require('node:path'),base=require('./payroll-lifecycle-fixture277.cjs');
const read=p=>fs.readFileSync(p,'utf8');
function setup(){
 const w=window;w.esc82=w.escapeHtml;
 w.field82=(label,name,value='',type='text',extra='')=>`<label>${w.esc82(label)}<input name="${w.esc82(name)}" type="${type}" value="${w.esc82(value)}" ${extra}></label>`;
 w.CurrencyStore={currencies:[{code:'LAK',isBase:true},{code:'USD'}]};
 w.getSelectedAccountInfo=value=>w.AccountingStore.accounts.find(a=>value.startsWith(a.code+' —'))||null;
 w.Work82.run.rows[0].input.attendance=[];
}
function scripts(){
 const payroll=read('src/payroll/workspace/groups-v96/drafts-and-finalization.js');
 return [...base.scripts(),payroll.slice(0,payroll.indexOf('function modal(')),read('src/bookkeeping/journal/memo-links143187.js')];
}
const html=base.html.replace('Payroll lifecycle checks — synthetic data','Payroll source links — synthetic data');
module.exports={html,scripts,setup,baseSetup:base.baseSetup,lifecycleSetup:base.setup};
if(require.main===module){
 const out=process.argv[2];fs.mkdirSync(out,{recursive:true});
 const css=['styles/shared-v108.css','styles/workspaces1432.css','styles/controls14305.css'].map(read).join('\n')+'\nbody{font:14px system-ui;padding:20px}header .actions82{display:flex;gap:8px;flex-wrap:wrap}.fields82{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.fields82 label{display:flex;flex-direction:column;gap:6px}.fields82 input{height:32px}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}';
 fs.writeFileSync(path.join(out,'index.html'),html.replace('</head>','<style>'+css+'</style></head>').replace('</body>',()=>'<script>('+base.baseSetup.toString()+')();('+base.setup.toString()+')();('+setup.toString()+')();</script>'+scripts().map(s=>'<script>'+s+'</script>').join('')+'</body>'));
 console.log('Built isolated payroll source-link preview: '+out);
}
