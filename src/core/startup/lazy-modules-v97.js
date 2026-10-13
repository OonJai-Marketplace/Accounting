  function installLazyModuleLoading() {
    const previous = window.switchTab;
    if (typeof previous !== 'function' || previous.__lazyLoading97) return;
    const wrapped = function (id, ...args) {
      const result = previous.call(this, id, ...args);
      if (['payroll-overview','payroll-employees','payroll-entries','payroll-deductions','payroll-history','report-payroll'].includes(id) && typeof window.loadWork82 === 'function') window.loadWork82();
      if (id === 'transactions-recurring') window.loadSchedules91?.();
      if (id === 'transactions-voided') window.loadTransactionAudit?.();
      if (id === 'user-entry-review') { window.loadSubmissionsFromSupabase?.(); window.loadStaffJournalsForReview?.(); }
      if (id === 'entry-submissions') window.openStaffJournalPeriod?.(window.staffJournalMonth?.());
      if ((id === 'users-permissions' || id === 'settings-users') && !window.startup14257?.isPrepared('profiles')) window.loadProfilesFromSupabase?.();
      if (id === 'settings-legal') window.loadLegalDocumentsFromSupabase?.();
      // Journal data is already loaded at sign-in; changing tabs does not reload it.
      return result;
    };
    wrapped.__lazyLoading97 = true;
    window.switchTab = wrapped;
  }

