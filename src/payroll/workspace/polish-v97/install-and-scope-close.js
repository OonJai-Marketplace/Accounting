  window.printLeaveApplication97 = printLeaveApplication;
  window.addEventListener('DOMContentLoaded', () => {
    lockUpcomingReminderModal();
    installLazyModuleLoading();
    syncJournalColumnWidths();
    const journalHeader = document.getElementById('jeHeaderRow');
    if (journalHeader) new MutationObserver(syncJournalColumnWidths).observe(journalHeader, { childList: true, subtree: true });
    document.addEventListener('input', event => { if (event.target?.matches('#jeLinesBody input')) syncJournalColumnWidths(); });
    // Editing a displayed zero should start with a blank replacement field;
    // leaving it blank restores zero, without affecting nonzero values.
    document.addEventListener('focusin', event => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || !input.dataset.numeric88) return;
      if (input.value !== '' && Number(input.value) === 0) {
        input.dataset.zeroSelect97 = 'true';
        input.select();
      }
    });
    document.addEventListener('focusout', event => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || !input.dataset.numeric88) return;
      if (input.dataset.zeroSelect97) {
        delete input.dataset.zeroSelect97;
        if (input.value === '') input.value = '0';
      }
    });
    window.renderRecurringWarnings?.();
    const priorRender = window.renderWork82;
    if (typeof priorRender === 'function') {
      window.renderWork82 = function (...args) {
        const active = document.querySelector('.tab-content.active')?.id;
        if (['payroll-entries', 'payroll-deductions'].includes(active)) syncDraftRoster();
        const result = priorRender.apply(this, args);
        if (typeof desktop80 !== 'undefined' && !desktop80.matches) return result;
        if (active === 'payroll-employees') decorateEmployeeForm();
        if (active === 'payroll-entries') { separateTabs(active); polishBreakdown(Work82.run); }
        if (active === 'payroll-deductions') separateTabs(active);
        if (active === 'payroll-overview') renderOverview();
        if (active === 'payroll-employees') {
          document.querySelectorAll('#payroll-employees [data-group95="employees"], #payroll-employees [data-group95="balances"]').forEach(details => {
            const section = document.createElement('section');
            section.className = 'block82 employee-list-always-open97';
            const heading = document.createElement('header');
            heading.innerHTML = `<h4>${escape(details.querySelector('summary strong')?.textContent || 'Employees')}</h4><span>${escape(details.querySelector('summary')?.lastElementChild?.textContent || '')}</span>`;
            section.append(heading, ...[...details.children].filter(node => node.tagName !== 'SUMMARY'));
            details.replaceWith(section);
          });
          document.querySelectorAll('#payroll-employees [data-group95="leaves"] .data-table82 tbody tr').forEach((row, index) => {
            const record = (Work82.leaves || [])[index];
            if (!record || row.cells.length < 8) return;
            const cell = row.cells[row.cells.length - 1];
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'je-btn je-btn-secondary'; button.textContent = 'Print Leave Form';
            button.onclick = () => printLeaveApplication(record.id);
            cell.append(document.createTextNode(' '), button);
          });
        }
        return result;
      };
    }
    const originalSave = window.saveWork82;
    if (typeof originalSave === 'function') {
      window.saveWork82 = async function (kind, data, record) {
        const saved = await originalSave.call(this, kind, data, record);
        if (kind === 'employees') syncDraftRoster();
        return saved;
      };
    }
    if (typeof window.loadWork82 === 'function') window.loadWork82().then(() => {
      syncDraftRoster();
      window.renderWork82();
    });
  }, { once: true });
})()