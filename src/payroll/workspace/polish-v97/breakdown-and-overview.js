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
    const ordered=run.rows.slice().sort(window.payroll95.order);
    [...table.querySelectorAll('tbody tr')].forEach((tr, index) => {
      const row = ordered[index];
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
        if (column === 0) return value;
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
        return `<tr><td>${escape(row.employee?.name || 'Employee')}</td><td>${escape(row.employee?.employmentType === 'contractual' ? 'Contractual' : 'Full-time')}</td><td>${money(row.employee?.salary, row.employee?.currency || 'LAK')}</td><td>${x ? '₭ ' + amount(x.gross) : '—'}</td><td>${x ? '₭ ' + amount(x.taxable) : '—'}</td><td>${x ? escape(window.currencySymbolV6?.(row.employee?.currency) || row.employee?.currency || '') + ' ' + amount(x.paidAmount ?? x.adjusted ?? 0) : '—'}</td></tr>`;
      }).join('');
      payroll = `<div class="overview-run-summary97"><div><strong>${escape(run.reference || 'Payroll')}</strong><span>${escape(run.status==='finalized'?'Saved & archived':'In progress')} · ${run.rows?.length || 0} employees</span></div></div><div class="data-table82"><table><thead><tr><th>Employee</th><th>Employment type</th><th>Contracted salary</th><th>Gross salary (SSO)</th><th>Adjusted salary (PIT)</th><th>Net pay</th></tr></thead><tbody>${rows || '<tr><td colspan="6">No employee rows are available.</td></tr>'}</tbody></table></div>`;
    }
    const leaveRows = leaves.map(record => {
      const d = record.data;
      const employee = Work82.employees.find(item => item.id === d.employeeId)?.data?.name || 'Former employee';
      return `<tr><td>${escape(employee)}</td><td>${escape(formatAppDate(d.from || ''))} – ${escape(formatAppDate(d.to || ''))}</td><td>${escape(d.type || '')}</td><td>${amount(d.days)}</td><td>${escape(d.paid === 'yes' ? 'Paid' : 'Unpaid')}</td><td>${escape(d.status || '')}</td><td>${escape(d.reference || '')}</td></tr>`;
    }).join('');
    host.innerHTML = `<header><div><h3>Payroll Overview</h3><p>Saved payroll and leave records for the selected month.</p></div><div class="actions82"><button class="je-btn je-btn-secondary" type="button" onclick="loadWork82(true)">Reload Records</button><button class="je-btn je-btn-emerald" type="button" onclick="openPayroll99()">Open Payroll</button></div></header>${Work82.error ? `<p class="notice82 warn82">${escape(Work82.error)}</p>` : ''}<section class="block82"><header><h4>Payroll period</h4></header><div class="overview-month97"><label for="overviewPayrollMonth97">Month</label><input type="month" id="overviewPayrollMonth97" value="${escape(month)}"></div>${payroll}</section><section class="block82"><header><h4>Leave this month</h4><span>${leaves.length} records</span></header><div class="data-table82"><table><thead><tr><th>Employee</th><th>Dates</th><th>Leave type</th><th>Days</th><th>Pay treatment</th><th>Status</th><th>Reference</th></tr></thead><tbody>${leaveRows || '<tr><td colspan="7" class="empty82">No leave records for this month.</td></tr>'}</tbody></table></div></section>`;
    host.querySelector('#overviewPayrollMonth97')?.addEventListener('change', event => {
      overviewMonth = /^\d{4}-\d{2}$/.test(event.target.value) ? event.target.value : currentMonth();
      renderOverview();
    });
  }

