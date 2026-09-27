/* Payroll workflow refinements based on the v96 package. */
(function () {
  'use strict';

  const escape = value => window.escapeHtml(String(value ?? ''));
  const amount = value => window.formatAppNumber(Number(value || 0));
  const money = (value, currency = 'LAK') => `${window.currencySymbolV6?.(currency) || currency} ${amount(value)}`;
  const localDate = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const currentMonth = () => localDate().slice(0, 7);
  let overviewMonth = currentMonth();

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

  function addEmployeeAccountField(form) {
    const rows = typeof AccountingStore !== 'undefined' ? AccountingStore.accounts || [] : [];
    const selected = form.querySelector('[name="payrollAccountId"]')?.value || Work82.employee?.data?.payrollAccountId || '';
    const currency = form.querySelector('[name="currency"]')?.value || '';
    const select = document.createElement('select');
    select.name = 'payrollAccountId';
    select.innerHTML = '<option value="">Select the employee payroll account</option>' + rows
      .filter(account => !currency || account.currency === currency)
      .map(account => `<option value="${escape(account.id)}">${escape(`${account.code || ''} — ${account.name} (${account.currency})`)}</option>`).join('');
    select.value = selected;
    const label = document.createElement('label');
    label.dataset.employeeField97 = 'payrollAccountId';
    label.append('Employee payroll account', select);
    const hint = document.createElement('small');
    hint.className = 'employee-field-hint97';
    hint.textContent = 'Choose the employee-specific liability account used when preparing a payroll journal.';
    label.append(hint);
    return label;
  }

  function category(form, title, labels, key) {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'employee-category97';
    fieldset.dataset.category97 = key;
    const legend = document.createElement('legend');
    legend.textContent = title;
    fieldset.append(legend);
    const grid = document.createElement('div');
    grid.className = 'fields82';
    labels.forEach(label => grid.append(label));
    fieldset.append(grid);
    form.append(fieldset);
  }

  function decorateEmployeeForm() {
    const form = document.getElementById('employeeForm82');
    if (!form || form.dataset.polished97) return;
    form.dataset.polished97 = 'true';
    const original = [...form.querySelectorAll('.fields82 > label')];
    const byName = name => original.find(label => label.querySelector(`[name="${name}"]`));
    original.filter(label => label.querySelector('[name="userId"]')).forEach(label => label.remove());

    const type = document.createElement('label');
    type.innerHTML = '<span>Employment type</span><select name="employmentType"><option value="full_time">Full-time</option><option value="contractual">Contractual</option></select>';
    const typeSelect = type.querySelector('select');
    const savedType = Work82.employee?.data?.employmentType || 'full_time';
    typeSelect.value = savedType;
    const salaryApplies = document.createElement('label');
    salaryApplies.className = 'check82';
    salaryApplies.innerHTML = '<input type="checkbox" name="salaryApplies"><span>Salary applies</span>';
    salaryApplies.querySelector('input').checked = Work82.employee?.data?.salaryApplies !== false;
    const account = addEmployeeAccountField(form);

    const fields = [
      ['code', 'name', 'profileEmail', 'photoFile', 'phone', 'address', 'emergencyContact', 'position', 'currency', 'salary', 'renewal'],
      ['payrollAccountId'],
      ['vacation', 'sick', 'minorSick', 'personal', 'bereavement'],
      ['active', 'salaryApplies', 'pit', 'sso', 'pitShare', 'isSample']
    ];
    const labels = new Map();
    original.forEach(label => {
      const control = label.querySelector('input,select,textarea');
      if (control?.name) labels.set(control.name, label);
    });
    labels.set('payrollAccountId', account);
    labels.set('salaryApplies', salaryApplies);
    const photoPreview = form.querySelector('.employee-photo-preview104');
    const titleLabel = byName('code');
    if (titleLabel) {
      const wrapper = titleLabel.parentElement;
      const keep = new Set(original);
      [...wrapper.children].forEach(node => { if (node.matches('label')) node.remove(); });
      wrapper.remove();
    }
    type.dataset.employeeField97 = 'employmentType';
    labels.set('employmentType', type);
    category(form, 'Employee details', [type, ...fields[0].map(name => labels.get(name)).filter(Boolean)], 'details');
    if (photoPreview) form.querySelector('[data-category97="details"] .fields82')?.append(photoPreview);
    category(form, 'Payroll account', fields[1].map(name => labels.get(name)).filter(Boolean), 'accounts');
    category(form, 'Leave entitlements', fields[2].map(name => labels.get(name)).filter(Boolean), 'leave');
    category(form, 'Employee status and payroll rules', fields[3].map(name => labels.get(name)).filter(Boolean), 'status');
    const actions = form.querySelector('.form-actions82');
    if (actions) form.append(actions);
  }

  function resultRows(run) {
    try { return window.payroll95?.results?.(run) || run.results || []; }
    catch (_) { return run.results || []; }
  }

  function polishBreakdown(run) {
    const group = document.querySelector('#payroll-entries [data-group95$="-breakdown"]');
    const table = group?.querySelector('table');
    if (!table || !run?.rows) return;
    const headers = ['Employee', 'Contracted Salary', 'Internal Deduction', 'Gross Salary (SSO)', 'Adjusted Salary (PIT)', 'Mandatory Deductions', 'Net Pay'];
    const head = table.querySelector('thead tr');
    if (!head) return;
    head.innerHTML = headers.map(title => `<th>${escape(title)}</th>`).join('');
    const results = new Map(resultRows(run).map(row => [row.employeeId, row]));
    [...table.querySelectorAll('tbody tr')].forEach((tr, index) => {
      const row = run.rows[index];
      const x = row && results.get(row.employeeId);
      if (!row) return;
      if (!x) { tr.innerHTML='<td>'+escape(row.employee.name)+'</td><td>'+money(row.employee.salary,row.employee.currency)+'</td>'+Array.from({length:5},()=>'<td>—</td>').join(''); return; }
      const cells = [...tr.cells];
      if (cells.length < 6) return;
      const employee = cells[0].cloneNode(true);
      const currency = row.employee.currency || 'LAK';
      const values = [
        employee,
        money(x.contract ?? row.employee.salary, currency),
        money(x.late + x.absence + x.penalty + x.other, 'LAK'),
        money(x.gross, 'LAK'),
        money(x.taxable, 'LAK'),
        money(x.employeePit + x.employeeSso, 'LAK'),
        money(Number(x.paidAmount ?? x.adjusted ?? 0), currency)
      ];
      tr.replaceChildren(...values.map((value, column) => {
        const td = document.createElement('td');
        if (column === 0) td.append(value);
        else { td.className = 'amount82 currency-cell97'; td.textContent = value; }
        return td;
      }));
    });
  }

  function renderOverview() {
    const host = document.querySelector('#payroll-overview .desktop82 .work82');
    if (!host) return;
    const month = overviewMonth;
    const runs = (Work82.runs || []).filter(record => record.data?.month === month && !record.data?.isSample)
      .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
    const run = runs[0]?.data || (Work82.run?.month === month ? Work82.run : null);
    const leaves = (Work82.leaves || []).filter(record => record.data?.month === month)
      .sort((a, b) => String(a.data.from || '').localeCompare(String(b.data.from || '')));
    let payroll = '<p class="empty82">No payroll has been saved for this month.</p>';
    if (run) {
      const results = new Map(resultRows(run).map(row => [row.employeeId, row]));
      const rows = (run.rows || []).map(row => {
        const x = results.get(row.employeeId);
        return `<tr><td>${escape(row.employee?.name || 'Employee')}</td><td>${escape(row.employee?.employmentType === 'contractual' ? 'Contractual' : 'Full-time')}</td><td>${money(row.employee?.salary, row.employee?.currency || 'LAK')}</td><td>${x ? amount(x.gross) + ' ₭' : '—'}</td><td>${x ? amount(x.taxable) + ' ₭' : '—'}</td><td>${x ? amount(x.paidAmount ?? x.adjusted ?? 0) + ' ' + escape(window.currencySymbolV6?.(row.employee?.currency) || row.employee?.currency || '') : '—'}</td></tr>`;
      }).join('');
      payroll = `<div class="overview-run-summary97"><div><strong>${escape(run.reference || 'Payroll')}</strong><span>${escape(run.status==='finalized'?'Saved & archived':'In progress')} · ${run.rows?.length || 0} employees</span></div></div><div class="data-table82"><table><thead><tr><th>Employee</th><th>Employment type</th><th>Contracted salary</th><th>Gross salary (SSO)</th><th>Adjusted salary (PIT)</th><th>Net pay</th></tr></thead><tbody>${rows || '<tr><td colspan="6">No employee rows are available.</td></tr>'}</tbody></table></div>`;
    }
    const leaveRows = leaves.map(record => {
      const d = record.data;
      const employee = Work82.employees.find(item => item.id === d.employeeId)?.data?.name || 'Former employee';
      return `<tr><td>${escape(employee)}</td><td>${escape(d.from || '')} – ${escape(d.to || '')}</td><td>${escape(d.type || '')}</td><td>${amount(d.days)}</td><td>${escape(d.paid === 'yes' ? 'Paid' : 'Unpaid')}</td><td>${escape(d.status || '')}</td><td>${escape(d.reference || '')}</td></tr>`;
    }).join('');
    host.innerHTML = `<header><div><h3>Payroll Overview</h3><p>Saved payroll and leave records for the selected month.</p></div><div class="actions82"><button class="je-btn je-btn-secondary" type="button" onclick="loadWork82(true)">Reload Records</button><button class="je-btn je-btn-emerald" type="button" onclick="openPayroll99()">Open Payroll</button></div></header>${Work82.error ? `<p class="notice82 warn82">${escape(Work82.error)}</p>` : ''}<section class="block82"><header><h4>Payroll period</h4></header><div class="overview-month97"><label for="overviewPayrollMonth97">Month</label><input type="month" id="overviewPayrollMonth97" value="${escape(month)}"></div>${payroll}</section><section class="block82"><header><h4>Leave this month</h4><span>${leaves.length} records</span></header><div class="data-table82"><table><thead><tr><th>Employee</th><th>Dates</th><th>Leave type</th><th>Days</th><th>Pay treatment</th><th>Status</th><th>Reference</th></tr></thead><tbody>${leaveRows || '<tr><td colspan="7" class="empty82">No leave records for this month.</td></tr>'}</tbody></table></div></section>`;
    host.querySelector('#overviewPayrollMonth97')?.addEventListener('change', event => {
      overviewMonth = /^\d{4}-\d{2}$/.test(event.target.value) ? event.target.value : currentMonth();
      renderOverview();
    });
  }

  function separateTabs(id) {
    const host = document.querySelector(`#${id} .desktop82 .work82`);
    if (!host) return;
    const details = [...host.querySelectorAll('[data-group95]')];
    if (id === 'payroll-entries') {
      details.filter(item => item.dataset.group95.endsWith('-internal')).forEach(item => item.remove());
    } else if (id === 'payroll-deductions') {
      details.filter(item => item.dataset.group95 !== 'attendance' && !item.dataset.group95.endsWith('-attendance') && !item.dataset.group95.endsWith('-internal')).forEach(item => item.remove());
      const internal = details.find(item => item.dataset.group95.endsWith('-internal'));
      const title = internal?.querySelector('summary strong');
      if (title) title.textContent = 'Internal Deduction Summary';
      if (internal) internal.open = true;
    }
  }

  function printLeaveApplication(id) {
    const record = (Work82.leaves || []).find(item => item.id === id);
    const data = record?.data || {};
    const employee = Work82.employees.find(item => item.id === data.employeeId)?.data || {};
    const content = `<h2>Leave Application</h2><p>Application reference: ${escape(data.reference || '________________')}</p><table><tbody><tr><th>Employee</th><td>${escape(employee.name || '')}</td><th>Position</th><td>${escape(employee.position || '')}</td></tr><tr><th>Leave type</th><td>${escape(data.type || '')}</td><th>Paid / unpaid</th><td>${escape(data.paid === 'yes' ? 'Paid' : 'Unpaid')}</td></tr><tr><th>From</th><td>${escape(data.from || '')}</td><th>Through</th><td>${escape(data.to || '')}</td></tr><tr><th>Working days</th><td>${escape(data.days || '')}</td><th>Payroll month</th><td>${escape(data.month || '')}</td></tr></tbody></table><h3>Reason</h3><p class="leave-reason97">${escape(data.notes || '')}</p><div class="leave-signatures97"><div>Employee signature / date</div><div>Supervisor approval / date</div><div>Payroll review / date</div></div>`;
    if (typeof window.print82 === 'function') window.print82('Leave Application', content, data.month || currentMonth());
    else window.print();
  }

  window.getActiveRecurringWarnings = function () {
    const today = localDate();
    return (typeof RecurringStore !== 'undefined' ? RecurringStore.items : [])
      .filter(item => !item.paused && (!item.preparedUntil || item.preparedUntil <= today) && ['OVERDUE', 'DUE SOON'].includes(window.recurringStatus(item)))
      .sort((a, b) => {
        const aStatus = window.recurringStatus(a), bStatus = window.recurringStatus(b);
        if (aStatus !== bStatus) return aStatus === 'OVERDUE' ? -1 : 1;
        return String(a.nextDate).localeCompare(String(b.nextDate));
      });
  };

  function defaultFinalReminderDate(item) {
    const [year, month, day] = String(item.nextDate).split('-').map(Number);
    const due = new Date(year, month - 1, day);
    const result = new Date(due);
    result.setDate(result.getDate() - 7);
    const resultDate = () => `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, '0')}-${String(result.getDate()).padStart(2, '0')}`;
    if (resultDate() <= localDate()) {
      const [todayYear, todayMonth, todayDay] = localDate().split('-').map(Number);
      result.setTime(new Date(todayYear, todayMonth - 1, todayDay).getTime());
      result.setDate(result.getDate() + 7);
    }
    return resultDate();
  }

  window.openPreparationDate97 = function (id) {
    const item = RecurringStore.items.find(record => record.id === id);
    const card = document.querySelector(`[data-preparation-card97="${CSS.escape(id)}"]`);
    const form = card?.querySelector('[data-preparation-form97]');
    if (!item || !form) return;
    form.hidden = false;
    const input = form.querySelector('input[type="date"]');
    if (input) input.value = item.preparedUntil || defaultFinalReminderDate(item);
    input?.focus();
  };

  window.savePreparationDone97 = function (id, button) {
    const item = RecurringStore.items.find(record => record.id === id);
    const card = button?.closest('[data-preparation-card97]');
    const date = card?.querySelector('[data-preparation-form97] input[type="date"]')?.value;
    if (!item || !date) return;
    if (date <= localDate()) {
      window.showAppNotification?.('Choose a later date', 'Set the final warning for a future date.', true);
      return;
    }
    item.preparedUntil = date;
    RecurringStore.save();
    window.renderRecurringWarnings();
    window.showAppNotification?.('Preparation recorded', `The next warning is set for ${window.formatAppDate(date)}.`, false);
  };

  if (typeof window.markRecurringPaid === 'function') {
    const markPaid = window.markRecurringPaid;
    window.markRecurringPaid = function (id) {
      const item = RecurringStore.items.find(record => record.id === id);
      if (item) delete item.preparedUntil;
      return markPaid.call(this, id);
    };
  }

  window.renderRecurringWarnings = function () {
    const host = document.getElementById('recurringWarningList');
    if (!host) return;
    const items = window.getActiveRecurringWarnings();
    host.innerHTML = items.length ? items.map(item => {
      const status = window.recurringStatus(item);
      return `<article class="recurring-warning-item ${status === 'OVERDUE' ? 'overdue' : ''}" data-preparation-card97="${escape(item.id)}">
        <div class="recurring-warning-item-heading97"><h5>${status === 'OVERDUE' ? 'OVERDUE' : item.preparedUntil ? 'FINAL WARNING' : 'DUE SOON'} — ${escape(item.memo)}</h5>
          <div class="recurring-warning-actions97"><button type="button" class="je-btn je-btn-secondary" onclick="openPreparationDate97('${escape(item.id)}')">Preparation Done</button><button type="button" class="je-btn je-btn-emerald" onclick="markRecurringPaid('${escape(item.id)}')">Mark Paid</button></div></div>
        <div>Due: <strong>${escape(window.formatAppDate(item.nextDate))}</strong> · ${escape(window.formatAppNumber(item.amount))} ${escape(item.currency)}</div>
        <div class="je-subtitle">Reminder schedule: ${escape(window.reminderText(item))}${item.preparedUntil ? ` · Prepared; final warning on ${escape(window.formatAppDate(item.preparedUntil))}` : ''}</div>
        <div class="preparation-date-form97" data-preparation-form97 hidden><label>Final warning date<input type="date" min="${escape(localDate())}" value="${escape(defaultFinalReminderDate(item))}"></label><button type="button" class="je-btn je-btn-emerald" onclick="savePreparationDone97('${escape(item.id)}',this)">Save Preparation</button></div>
      </article>`;
    }).join('') : '<div class="empty-archive-state">No recurring warnings are currently due.</div>';
  };

  function lockUpcomingReminderModal() {
    const modal = document.getElementById('modalRecurringWarnings');
    if (!modal || modal.dataset.strictOutsideClose97) return;
    modal.dataset.strictOutsideClose97 = 'true';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    const dialog = modal.querySelector('.modal-dialog');
    if (dialog) {
      dialog.setAttribute('aria-labelledby', 'recurringWarningTitle97');
      const heading = dialog.querySelector('.modal-header h4');
      if (heading) { heading.id = 'recurringWarningTitle97'; heading.textContent = 'Upcoming and Overdue Payments'; }
      const header = dialog.querySelector('.modal-header');
      if (header && !header.querySelector('.modal-close-x')) {
        const close = document.createElement('button'); close.type = 'button'; close.className = 'modal-close-x'; close.setAttribute('aria-label', 'Close upcoming transaction reminders'); close.textContent = '×'; close.onclick = () => window.closeModal('modalRecurringWarnings'); header.append(close);
      }
      const subtitle = dialog.querySelector('.modal-header .je-subtitle');
      if (subtitle) subtitle.textContent = 'Mark a current payment as paid or record that you have prepared for it.';
      const oldClose = dialog.querySelector('.modal-footer button');
      if (oldClose) oldClose.textContent = 'Close';
    }
    modal.addEventListener('click', event => {
      if (event.target === modal) { event.preventDefault(); event.stopPropagation(); }
    }, true);
    modal.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);
  }

  function installUniversalSearch() {
    const dashboard = document.getElementById('nav-module-dashboard');
    if (!dashboard || document.getElementById('universalSearch97')) return;
    const box = document.createElement('div');
    box.className = 'universal-search97';
    box.innerHTML = '<label for="universalSearch97">Search app areas</label><input id="universalSearch97" type="search" placeholder="Find a module or section" autocomplete="off"><div class="universal-search-results97" hidden></div>';
    dashboard.before(box);
    const input = box.querySelector('input'), results = box.querySelector('.universal-search-results97');
    function entries(query) {
      const found = new Map();
      document.querySelectorAll('#appSidebar .nav-header,#appSidebar .tab-btn').forEach(button => {
        const label = button.textContent.trim().replace(/\s+/g, ' ');
        const call = button.getAttribute('onclick') || '';
        const target = call.match(/(?:switchTab|activateCategory)\('([^']+)'/)?.[1];
        if (target && label.toLowerCase().includes(query)) found.set(`${target}:${label}`, { target, label });
      });
      document.querySelectorAll('.tab-content h2,.tab-content h3,.tab-content h4').forEach(heading => {
        if (heading.closest('table,.modal-backdrop,[hidden]')) return;
        const label = heading.textContent.trim().replace(/\s+/g, ' ');
        const target = heading.closest('.tab-content')?.id;
        if (target && label.toLowerCase().includes(query)) found.set(`${target}:${label}`, { target, label });
      });
      return [...found.values()].slice(0, 12);
    }
    function draw() {
      const query = input.value.trim().toLowerCase();
      if (!query) { results.hidden = true; results.replaceChildren(); return; }
      const matches = entries(query);
      results.innerHTML = matches.length ? matches.map((item, index) => `<button type="button" data-search-target97="${escape(item.target)}" data-search-index97="${index}">${escape(item.label)}</button>`).join('') : '<p>No app areas match that search.</p>';
      results.hidden = false;
      results.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
        const target = button.dataset.searchTarget97;
        results.hidden = true;
        input.value = '';
        if (target.startsWith('sec-')) window.scrollToAccountModule?.(target);
        else window.switchTab(target);
      }));
    }
    input.addEventListener('input', draw);
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') { input.value = ''; results.hidden = true; }
      if (event.key === 'Enter') results.querySelector('button')?.click();
    });
    document.addEventListener('click', event => { if (!box.contains(event.target)) results.hidden = true; });
  }

  function syncJournalColumnWidths() {
    if (window.innerWidth < 900) return;
    const header = document.getElementById('jeHeaderRow');
    const body = document.getElementById('jeLinesBody');
    if (!header || !body) return;
    header.closest('table')?.classList.add('journal-fixed-widths97');
    const cells = [...header.cells];
    cells.forEach(cell => {
      const label = cell.textContent.trim().toUpperCase();
      let fixed = '';
      if (cell.classList.contains('action-col') || label === 'ACTION') fixed = '1.7cm';
      else if (label === 'DR' || label === 'DEBIT' || label.startsWith('DR ')) fixed = '3cm';
      else if (/^CR[\s:-]*/.test(label)) {
        const currency = label.replace(/^CR[\s:-]*/, '').trim();
        fixed = '3cm';
      }
      if (fixed) for (const property of ['width', 'min-width', 'max-width']) cell.style.setProperty(property, fixed, 'important');
      else if (/MEMO|DESCRIPTION/.test(label)) cell.style.width = 'auto';
      if (fixed) cell.style.setProperty('text-align', 'right', 'important');
    });
    body.querySelectorAll('.je-line-dr').forEach(input => { input.closest('td').style.setProperty('width', '3cm', 'important'); input.style.setProperty('text-align', 'right', 'important'); });
    body.querySelectorAll('.je-line-cr').forEach(input => { input.closest('td').style.setProperty('width', '3cm', 'important'); input.style.setProperty('text-align', 'right', 'important'); });
    body.querySelectorAll('.action-col').forEach(cell => { cell.style.setProperty('width', '1.7cm', 'important'); cell.style.setProperty('text-align', 'right', 'important'); });
  }

  function toggleAuditMonth97(month, button) {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    document.querySelectorAll(`[data-audit-month97="${CSS.escape(month)}"]`).forEach(row => { row.hidden = !open; });
    button.querySelector('.audit-month-caret97').textContent = open ? '▼' : '▶';
  }
  window.toggleAuditMonth97 = toggleAuditMonth97;

  function toggleTransactionMonth97(month, button) {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    document.querySelectorAll(`[data-history-month97="${CSS.escape(month)}"]`).forEach(row => { row.hidden = !open; });
    button.querySelector('.history-month-caret97').textContent = open ? '▼' : '▶';
  }
  window.toggleTransactionMonth97 = toggleTransactionMonth97;

  // Keep the existing year/archive filtering, but present the resulting rows
  // in collapsible month groups as the user requested for Transaction History.
  if (typeof window.renderAllTransactionsTable === 'function') {
    const renderAllBefore97 = window.renderAllTransactionsTable;
    window.renderAllTransactionsTable = function (...args) {
      const body = document.getElementById('allTransactionsBody');
      if (!body) return renderAllBefore97.apply(this, args);
      renderAllBefore97.apply(this, args);
      const transactions = new Map();
      [...body.rows].forEach(row => {
        const id = row.dataset.entryId || `row-${transactions.size}`;
        if (!transactions.has(id)) transactions.set(id, []);
        transactions.get(id).push(row);
      });
      const months = new Map();
      transactions.forEach(rows => {
        const raw = rows[0]?.dataset.createdAt || '';
        const parsed = new Date(raw);
        const month = Number.isNaN(parsed.getTime()) ? 'unknown' : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
        if (!months.has(month)) months.set(month, []);
        months.get(month).push(...rows);
      });
      const header = document.getElementById('thAllTransRow');
      const colspan = Math.max(1, header?.cells.length || 1);
      const ordered = [...months.entries()].sort(([a], [b]) => b.localeCompare(a));
      const newest = ordered[0]?.[0];
      const fragments = [];
      ordered.forEach(([month, rows]) => {
        const open = month === newest;
        const label = month === 'unknown' ? 'Date unavailable' : new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        const heading = document.createElement('tr');
        heading.className = 'transaction-month-heading97';
        const cell = document.createElement('td'); cell.colSpan = colspan;
        cell.innerHTML = `<button type="button" aria-expanded="${open}" onclick="toggleTransactionMonth97('${escape(month)}',this)"><span class="history-month-caret97">${open ? '▼' : '▶'}</span><strong>${escape(label)}</strong><span>${new Set(rows.map(row => row.dataset.entryId)).size} transactions</span></button>`;
        heading.append(cell); fragments.push(heading);
        rows.forEach(row => { row.dataset.historyMonth97 = month; row.hidden = !open; fragments.push(row); });
      });
      body.replaceChildren(...fragments);
    };
  }

  const auditActions97 = new Set(['VOID','UPDATE','MODIFY','MARK_UNDER_REVIEW','APPROVE_AND_POST','PERIOD_STATUS','DELETE_SCHEDULE','UPDATE_SCHEDULE','CREATE_SCHEDULE','SCHEDULE_POST_ADVANCE','AUTO_POST']);
  window.renderVoidedTransactionsTable = function () {
    const header = document.getElementById('thVoidedTransRow'), body = document.getElementById('voidedTransactionsBody');
    if (!body) return;
    if (header) header.innerHTML = '<th></th><th>Date &amp; Time</th><th>Record</th><th>Audit Action</th><th>Reason / Note</th><th>Recorded By</th>';
    const live = (LiveTransactionAudit || []).filter(item => auditActions97.has(item.action) || /DELETE|REMOVE|PURGE/.test(String(item.action).toUpperCase()));
    const local = (JournalModule.voidedEntries || []).map((item, index) => ({ id: item.id || `local-${index}`, record_id: item.id, action: 'ADJUSTMENT', reason: item.explanation, old_data: item.oldData, new_data: item.newData, created_at: item.timestamp, actor_id: null }));
    const audits = [...live, ...local].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    const months = new Map();
    audits.forEach(item => {
      const date = new Date(item.created_at || '');
      const key = Number.isNaN(date.getTime()) ? 'unknown' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!months.has(key)) months.set(key, []);
      months.get(key).push(item);
    });
    const detailColspan = 6;
    body.innerHTML = months.size ? [...months.entries()].map(([month, rows]) => {
      const safe = escape(month), label = month === 'unknown' ? 'Date unavailable' : new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      const detailRows = rows.map((item, index) => {
        const key = `audit-detail97-${month.replace(/\D/g, '')}-${index}`, record = auditRecordId(item);
        return `<tr class="audit-summary-row" data-audit-month97="${safe}" data-audit-search="${escape(JSON.stringify(item))}" onclick="selectAuditLogRow(this);toggleAuditDetails('${key}',this)" aria-expanded="false"><td>↳</td><td>${window.formatAppDate(item.created_at, true)}</td><td style="font-family:monospace">${escape(record)}</td><td><span class="submission-status ${item.action === 'VOID' ? 'returned' : 'posted'}">${escape(String(item.action || 'CHANGE').replaceAll('_', ' '))}</span></td><td>${escape(item.reason || item.new_data?.status || '—')}</td><td>${escape(window.getLiveUserName(item.actor_id) || 'System')}</td></tr><tr id="${key}" class="audit-detail-row" data-audit-month97="${safe}" hidden><td colspan="${detailColspan}"><div class="audit-detail-panel">${window.auditComparisonHtml(item.old_data, item.new_data, item.action)}</div></td></tr>`;
      }).join('');
      return `<tr class="audit-month-heading97"><td colspan="${detailColspan}"><button type="button" aria-expanded="false" onclick="toggleAuditMonth97('${safe}',this)"><span class="audit-month-caret97">▶</span><strong>${escape(label)}</strong><span>${rows.length} record${rows.length === 1 ? '' : 's'}</span></button></td></tr>${detailRows}`;
    }).join('') : '<tr><td colspan="6" class="period-empty">No void, correction, or period-review audit records yet.</td></tr>';
  };

  window.loadTransactionAudit = async function () {
    if (typeof ojmDb === 'undefined' || !ojmDb || typeof liveProfile === 'undefined' || !liveProfile) return;
    const pageSize = 500, rows = [];
    try {
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await ojmDb.from('audit_log')
          .select('id,record_id,action,reason,old_data,new_data,actor_id,created_at')
          .in('table_name', ['journal_entries','accounting_periods','period_findings','scheduled_journals'])
          .order('created_at', { ascending: false }).range(offset, offset + pageSize - 1);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < pageSize) break;
      }
      LiveTransactionAudit = rows;
      window.renderVoidedTransactionsTable();
    } catch (error) {
      window.showAppNotification?.('Audit Log Could Not Load', error.message || 'Try reloading the Audit Log.', true);
    }
  };

  function makeLoadingMarkup() {
    return `<span class="login-loader97" role="status" aria-label="Signing in and loading the workspace"><span class="loader-stage97"><i class="loader-ball97"></i><span class="loader-orbit97"><i></i><i></i><i></i><i></i><i></i></span><span class="loader-pulse-spinner97"><i class="loader-pulse97"></i></span></span><span class="loader-copy97">Signing in and preparing your workspace…</span></span>`;
  }
  let pulseTimer97 = null;
  function randomizePulse97() {
    const line = document.querySelector('.loader-pulse97');
    if (!line) return;
    line.style.setProperty('--pulse-size97', `${0.5 + Math.random() * 0.9}`);
    line.style.setProperty('--pulse-angle97', `${Math.floor(Math.random() * 360)}deg`);
  }
  function showLoginLoader97() {
    const gate = document.getElementById('loginGate'), status = document.getElementById('loginError');
    if (!gate || !status) return;
    gate.classList.add('is-loading97');
    status.innerHTML = makeLoadingMarkup();
    clearInterval(pulseTimer97);
    randomizePulse97();
    pulseTimer97 = setInterval(randomizePulse97, 420);
  }
  function clearLoginLoader97() {
    const gate = document.getElementById('loginGate'), status = document.getElementById('loginError');
    gate?.classList.remove('is-loading97');
    if (status?.querySelector('.login-loader97')) status.textContent = '';
    clearInterval(pulseTimer97); pulseTimer97 = null;
  }
  if (typeof window.handleDemoLogin === 'function') {
    const submitLogin = window.handleDemoLogin;
    window.handleDemoLogin = async function (...args) {
      const result = submitLogin.apply(this, args);
      const status = document.getElementById('loginError');
      if (status?.textContent.includes('Signing in')) showLoginLoader97();
      await result;
      if (!document.getElementById('loginError')?.querySelector('.login-loader97')) clearLoginLoader97();
    };
  }
  if (typeof window.hydrateSupabaseSession === 'function') {
    const hydrate = window.hydrateSupabaseSession;
    window.hydrateSupabaseSession = async function (...args) {
      await hydrate.apply(this, args);
      clearLoginLoader97();
    };
  }

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
      if (id === 'users-permissions' || id === 'settings-users') window.loadProfilesFromSupabase?.();
      if (id === 'settings-legal') window.loadLegalDocumentsFromSupabase?.();
      // Journal data is already loaded at sign-in; changing tabs does not reload it.
      return result;
    };
    wrapped.__lazyLoading97 = true;
    window.switchTab = wrapped;
  }

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
})();
