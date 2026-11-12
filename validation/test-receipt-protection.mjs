import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const folderURL='https://drive.google.com/drive/folders/receiptfolder123';
const owner='admin',email='office@example.test',key='documents-company228:admin:verified';
const destination={email,id:'receiptfolder123',folderURL,name:'Receipts',connectionKey:key};
let cfg={accountEmail228:email,receiptDrive228:{folderURL,active:destination}};
let active={owner,email,sheet:key,refresh_token:'old'},updated=0,writable=true;
const row={owner,email,sheet:'documents-admin228:admin',access_token:'new-access',refresh_token:'new-refresh',expires_at:'2099-01-01'};
const context={Request,Response,URL,URLSearchParams,AbortSignal,crypto,console,
 connection:async k=>k===key?active:null,googleToken:async()=> 'test',
 fetch:async url=>{assert.equal(new URL(url).pathname,'/drive/v3/files/receiptfolder123');return Response.json({mimeType:'application/vnd.google-apps.folder',capabilities:{canAddChildren:writable}});},
 admin:{from:()=>({update(fields){let filters={};return {eq(k,v){filters[k]=v;return this;},select(){return this;},async maybeSingle(){assert.deepEqual({...filters},{sheet:key,owner,refresh_token:active.refresh_token});updated++;active={...active,...fields};return {data:{sheet:key}};}};}})}};
vm.createContext(context);
const module=fs.readFileSync('supabase/functions/_shared/documents202.ts','utf8').replace(/^import .*;\n/gm,'').replaceAll('export ','');
vm.runInContext(stripTypeScriptTypes(module)+'\nglobalThis.renew=renewReceiptDestination;globalThis.done=desktopReturn228;',context);
assert(await context.renew(cfg,row));assert.equal(active.refresh_token,'new-refresh');
for(const alternate of [{...cfg,accountEmail228:'different@example.test'},{...cfg,receiptDrive228:{...cfg.receiptDrive228,folderURL:folderURL+'other'}},{...cfg,receiptDrive228:{...cfg.receiptDrive228,active:{...destination,annual231:true}}}])assert.equal(await context.renew(alternate,row),false);
assert.equal(await context.renew(cfg,{...row,owner:'other'}),false);writable=false;await assert.rejects(context.renew(cfg,row),/read-only/);assert.equal(updated,1);
const legacy=context.done('active',false);assert.match(legacy.headers.get('Content-Type'),/text\/plain/);assert.match(await legacy.text(),/connected for every phone/);
const done=context.done('active');assert.equal(done.status,303);assert.equal(done.headers.get('Location'),'https://oonjai-marketplace.github.io/Accounting/integrations/receipt-drive-result.html#active');
console.log('PASS same approved active receipt destination renews after a write-access check. Account, folder, owner and yearly-storage changes stay separate.');
