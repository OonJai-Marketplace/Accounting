  function syncDraftRoster() {
    if(window.syncPayrollRoster99)return window.syncPayrollRoster99();
    const run = typeof Work82 !== 'undefined' ? Work82.run : null;
    if (!run || run.status !== 'draft' || !Array.isArray(run.rows)) return false;
    const active = (Work82.employees || []).filter(record => record.data?.active !== false && !record.data?.archived);
    const previous = new Map(run.rows.map(row => [row.employeeId, row]));
    const next = active.map(record => {
      const row = previous.get(record.id);
      return row
        ? { ...row, employee: structuredClone(record.data) }
        : { employeeId: record.id, employee: structuredClone(record.data), input: { attendance: [], absentDays: 0, penalty: 0, otherDeduction: 0, allowance: 0, reimbursement: 0, advance: 0 } };
    });
    const changed = next.length !== run.rows.length || next.some((row, i) => row.employeeId !== run.rows[i]?.employeeId || JSON.stringify(row.employee) !== JSON.stringify(run.rows[i]?.employee));
    if (changed) run.rows = next;
    return changed;
  }

