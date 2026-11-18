const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const channels=[],reads=[],timers=new Map();let serial=0,removed=0;
const context={document:{addEventListener(){}},window:{addEventListener(){}},setTimeout(fn){timers.set(++serial,fn);return serial;},clearTimeout:id=>timers.delete(id)};
vm.runInNewContext(fs.readFileSync('src/subusers/accounts/working-standing379.js','utf8'),context);
const client={channel(){const c={on(type,filter,fn){this.event=fn;return this;},subscribe(fn){this.status=fn;return this;}};channels.push(c);return c;},removeChannel(){removed++;}};
const api=context.window.WorkingStanding379;
const options=owner=>({owner,actor:'admin',client,current:()=>true,host:()=>null,read:()=>new Promise(resolve=>reads.push(resolve))});
const finish=()=>{reads.at(-1)({accounts:[],lines:[]});return new Promise(setImmediate);};
(async()=>{
 api.open(options('one'));assert.equal(reads.length,0);channels[0].status('SUBSCRIBED');assert.equal(reads.length,1);assert.equal(timers.size,0);channels[0].status('SUBSCRIBED');assert.equal(reads.length,1);
 await finish();api.open(options('one'));assert.equal(reads.length,1,'repeat render reuses active balance');
 channels[0].event();assert.equal(reads.length,2);channels[0].event();channels[0].event();await finish();assert.equal(reads.length,3,'events during the read need one fresh snapshot');await finish();
 api.close();assert.equal(removed,1);api.open(options('two'));channels[1].status('CHANNEL_ERROR');assert.equal(reads.length,4,'socket error falls back immediately');assert.equal(timers.size,0);await finish();
 api.close();api.open(options('three'));const fallback=[...timers.values()][0];timers.clear();fallback();assert.equal(reads.length,5,'slow socket cannot block the opening balance');await finish();channels[2].status('SUBSCRIBED');assert.equal(reads.length,6,'late connection closes the event gap');await finish();
 api.close();api.open(options('four'));api.close();assert.equal(timers.size,0,'closing cancels delayed opening work');channels[3].status('SUBSCRIBED');assert.equal(reads.length,6,'old subscription cannot read after closing');
 console.log('PASS: one normal opening read, live event coalescing, subscription gap safety, bounded slow-socket fallback and close cleanup');
})().catch(e=>{console.error(e);process.exit(1);});
