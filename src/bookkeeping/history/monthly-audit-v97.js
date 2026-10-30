  window.auditDeletionPermissions143124=async function(rows,source,db){
    if(liveProfile?.role!=='admin')return rows;
    const args=source==='audit_log'?{p_audit_ids:rows.map(r=>String(r.id))}:{p_deletion_ids:rows.map(r=>String(r.id))};
    const result=await db.rpc('audit_delete_permissions143124',args);if(result.error)throw result.error;
    const policies=new Map((result.data||[]).map(r=>[String(r.id),r.policy]));
    rows.forEach(r=>{r.deletePolicy143124=policies.get(String(r.id))||'protected'});return rows;
  };
  // A page contains summaries only; saved before/after documents are fetched on demand.
  const auditPages143198={owner:'',db:null,target:'',month:'',offset:0,group:'all',total:0,counts:{},months:[],loaded:false,loading:null,generation:0,details:new Map(),offline:false};
  function auditScope143198(){
    const s=auditPages143198,target=window.workspaceRequest138?.target||'';
    if(s.owner!==liveProfile?.id||s.db!==ojmDb||s.target!==target){Object.assign(s,{owner:liveProfile?.id,db:ojmDb,target,month:'',offset:0,group:'all',total:0,counts:{},months:[],loaded:false,loading:null,generation:s.generation+1,details:new Map(),offline:false});}
    return s;
  }
  async function auditDetail143198(item){
    if(!item?.summary143198)return item;
    const s=auditScope143198(),owner=s.owner,db=s.db,target=s.target,key=(item.auditSource1434||'audit_log')+':'+item.id;
    if(s.details.has(key))return s.details.get(key);
    if(window.offlineAudit143174?.offline())throw Error('These saved details are not downloaded on this device. Connect once to open this record.');
    const source=['record_deletions108','workspace_actor_audit138'].includes(item.auditSource1434)?item.auditSource1434:'audit_log';
    const result=await db.from(source).select('*').eq('id',item.id).single();
    if(owner!==liveProfile?.id||db!==ojmDb||target!==(window.workspaceRequest138?.target||''))throw Error('Account changed while loading audit details.');
    if(result.error)throw result.error;if(!result.data)throw Error('This audit record is no longer available. Refresh Audit Logs.');
    const r=result.data,full={...item,...r,summary143198:false};
    if(source==='record_deletions108')Object.assign(full,{old_data:r.record_data,new_data:null,created_at:r.deleted_at,actor_id:r.deleted_by});
    if(source==='workspace_actor_audit138')Object.assign(full,{old_data:r.before_data,new_data:r.after_data,record_id:r.row_id,action:r.operation});
    s.details.set(key,full);if(s.details.size>100)s.details.delete(s.details.keys().next().value);
    if(source!=='workspace_actor_audit138')await window.offlineAudit143174?.rememberAudit((LiveTransactionAudit||[]).map(x=>(x.auditSource1434||'audit_log')+':'+x.id===key?full:x));
    return full;
  }
  window.auditPage143198={state:auditScope143198,detail:auditDetail143198,
    async move(offset,group){const s=auditScope143198();s.offset=Math.max(0,offset);if(group)s.group=group;return window.loadTransactionAudit(true);},
    async month(){const s=auditScope143198();s.offset=0;s.group='all';return window.loadTransactionAudit(true);}
  };
  window.loadTransactionAudit=async function(force=true){
    if(typeof ojmDb==='undefined'||!ojmDb||typeof liveProfile==='undefined'||!liveProfile)return;
    const s=auditScope143198(),owner=s.owner,db=s.db,target=s.target;
    const month=window.historyMonth14341?.choose('audit',s.months)||new Date().toISOString().slice(0,7);
    if(s.month&&s.month!==month){s.offset=0;s.group='all';}
    const key=month+':'+s.offset+':'+s.group;
    if(s.loading?.key===key)return s.loading.promise;
    if(!force&&s.loaded&&s.key===key){window.renderVoidedTransactionsTable();return;}
    const generation=++s.generation,current=()=>generation===s.generation&&owner===liveProfile?.id&&db===ojmDb&&target===(window.workspaceRequest138?.target||'');
    const promise=(async()=>{
      await window.offlineAudit143174?.initialize();if(!current())return;
      if(window.offlineAudit143174?.offline()){
        s.offline=true;s.month=month;LiveTransactionAudit=offlineAudit143174.projectAudit();s.loaded=false;window.renderVoidedTransactionsTable();return;
      }
      const r=await db.rpc('audit_page143198',{p_month:month+'-01',p_offset:s.offset,p_limit:50,p_group:s.group});
      if(!current())return;if(r.error)throw r.error;
      if(!r.data||!Array.isArray(r.data.rows))throw Error('Audit page service is not installed.');
      const page=r.data,rows=page.rows;
      if(s.offset>0&&s.offset>=Number(page.total)){s.offset=Math.max(0,Math.ceil(Number(page.total)/50)-1)*50;return window.loadTransactionAudit(true);}
      await Promise.all(['audit_log','record_deletions108'].map(source=>{const part=rows.filter(x=>x.auditSource1434===source);return part.length?auditDeletionPermissions143124(part,source,db):null;}));
      if(!current())return;
      Object.assign(s,{key,month,months:page.months||[],total:Number(page.total)||0,counts:page.counts||{},loaded:true,offline:false});
      await window.offlineAudit143174?.rememberAudit(rows.map(x=>s.details.get((x.auditSource1434||'audit_log')+':'+x.id)||x));
      if(!current())return;LiveTransactionAudit=window.offlineAudit143174?.projectAudit()||rows;
      window.renderVoidedTransactionsTable();
    })().catch(e=>{if(current()){s.loaded=false;window.showAppNotification?.('Audit Log Could Not Load',e.message,true);}throw e;}).finally(()=>{if(s.loading?.promise===promise)s.loading=null;});
    s.loading={key,promise};return promise;
  };
