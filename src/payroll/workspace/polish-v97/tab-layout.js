  function separateTabs(id) {
    const host = document.querySelector(`#${id} .desktop82 .work82`);
    if (!host) return;
    const details = [...host.querySelectorAll('[data-group95]')];
    if (id === 'payroll-entries') {
      details.filter(item => item.dataset.group95.endsWith('-internal')).forEach(item => item.remove());
    } else if (id === 'payroll-deductions') {
      details.filter(item => item.dataset.group95 !== 'attendance' && !item.dataset.group95.endsWith('-attendance') && !item.dataset.group95.endsWith('-internal')).forEach(item => item.remove());
      const internal = details.find(item => item.dataset.group95.endsWith('-internal'));
      const title = internal?.querySelector('summary strong, .pay-heading14331 strong');
      if (title) title.textContent = 'Internal Deduction Summary';
      if (internal) internal.open = true;
    }
  }

