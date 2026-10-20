  window.auditDeletionPermissions143124=async function(rows,source,db){
    if(liveProfile?.role!=='admin')return rows;
    const args=source==='audit_log'?{p_audit_ids:rows.map(r=>String(r.id))}:{p_deletion_ids:rows.map(r=>String(r.id))};
    const result=await db.rpc('audit_delete_permissions143124',args);if(result.error)throw result.error;
    const policies=new Map((result.data||[]).map(r=>[String(r.id),r.policy]));
    rows.forEach(r=>{r.deletePolicy143124=policies.get(String(r.id))||'protected'});return rows;
  };
  window.loadTransactionAudit = async function (force = true) {
    if (typeof ojmDb === 'undefined' || !ojmDb || typeof liveProfile === 'undefined' || !liveProfile) return;
    const owner=liveProfile.id,db=ojmDb;
    const read = async () => {
      const pageSize = 500, rows = [];
      for (let offset = 0; ; offset += pageSize) {
        if(liveProfile?.id!==owner||ojmDb!==db)throw Error('Account changed while loading audit history.');
        const { data, error } = await db.from('audit_log')
          .select('id,table_name,record_id,action,reason,old_data,new_data,actor_id,created_at')
          .in('table_name', ['journal_entries','accounting_periods','period_findings','scheduled_journals','maintenance'])
          .order('created_at', { ascending: false }).range(offset, offset + pageSize - 1);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < pageSize) break;
      }
      return rows;
    };
    try {
      const rows = await auditDeletionPermissions143124(await read(),'audit_log',db);
      const voided=await db.from('journal_entries').select('id').eq('status','voided').setHeader('x-ojm-database-only','1');
      if(voided.error)throw voided.error;
      const ids=new Set((voided.data||[]).map(r=>String(r.id)));
      rows.forEach(row=>{row.voidedJournal143122=ids.has(String(row.record_id))});
      if(liveProfile?.id!==owner||ojmDb!==db)return;
      LiveTransactionAudit = rows;
      window.renderVoidedTransactionsTable();
    } catch (error) {
      if(liveProfile?.id===owner&&ojmDb===db){LiveTransactionAudit=[];window.renderVoidedTransactionsTable();}
      if(liveProfile?.id===owner&&ojmDb===db)window.showAppNotification?.('Audit Log Could Not Load', error.message || 'Try reloading the Audit Log.', true);
      throw error;
    }
  };

  // The workspace login coordinator owns the one loading indicator below the buttons.

