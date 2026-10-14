  window.loadTransactionAudit = async function (force = true) {
    if (typeof ojmDb === 'undefined' || !ojmDb || typeof liveProfile === 'undefined' || !liveProfile) return;
    const read = async () => {
      const pageSize = 500, rows = [];
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await ojmDb.from('audit_log')
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
      const rows = window.localFirst14333 ? await localFirst14333.snapshot('audit-transactions', read, {force}) : await read();
      LiveTransactionAudit = rows;
      window.renderVoidedTransactionsTable();
    } catch (error) {
      window.showAppNotification?.('Audit Log Could Not Load', error.message || 'Try reloading the Audit Log.', true);
      throw error;
    }
  };

  // The workspace login coordinator owns the one loading indicator below the buttons.

