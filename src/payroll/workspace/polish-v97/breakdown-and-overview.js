  function resultRows(run) {
    try { return window.payroll95?.results?.(run) || run.results || []; }
    catch (_) { return run.results || []; }
  }


  function overviewLeaves269(month) {
    const start = month + '-01', end = month + '-31';
    const overlaps = d => d.from ? d.from <= end && (d.to || d.from) >= start : d.month === month;
    const key = d => [d.employeeId,d.from,d.to || d.from,String(d.type || '').toLowerCase().replace(/\s*leave$/, '').trim()].join('|');
    const records = (Work82.leaves || []).filter(r => overlaps(r.data || {}));
    const seen = new Set(records.map(r => key(r.data)));
    for (const employee of Work82.employees || []) {
      for (const historical of employee.data?.leaveHistory200?.records || []) {
        const data = {...historical,employeeId:employee.id,status:'Historical record',reference:historical.reference || historical.notes || ''};
        if (!overlaps(data) || seen.has(key(data))) continue;
        seen.add(key(data));records.push({data});
      }
    }
    return records.sort((a,b) => String(a.data.from || '').localeCompare(String(b.data.from || '')));
  }

  function renderOverview() {
    const host = document.querySelector('#payroll-overview .desktop82 .work82');
    if (!host) return;
    const context = [liveProfile?.id || '', Work82.run?.month || '', currentMonth()].join('|');
    if (context !== overviewContext269) {
      overviewContext269 = context;
      overviewMonth = Work82.run?.month || currentMonth();
    }
    const month = overviewMonth;
    const runs = (Work82.runs || []).filter(record => record.data?.month === month && !record.data?.isSample)
      .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
    const run = Work82.run?.month === month ? Work82.run : runs[0]?.data;
    const leaves = overviewLeaves269(month);
    const results = run ? resultRows(run) : [];
    const byEmployee = new Map(results.map(row => [row.employeeId, row]));
    const complete = !!run?.rows?.length && run.rows.every(row => byEmployee.has(row.employeeId));
    const sum = keys => results.reduce((total,row) => total + keys.reduce((n,key) => n + Number(row[key] || 0),0),0);
    const payments = new Map();
    for (const row of results) {
      const currency = row.currency || row.employee?.currency || 'LAK';
      payments.set(currency, (payments.get(currency) || 0) + Number(row.paidAmount || 0));
    }
    const paymentTotals = [...payments].map(([currency,value]) => `<span>${escape(money(value,currency))}</span>`).join('');
    const status = !run ? 'Not started' : run.status === 'finalized' ? 'Saved & archived' : 'In progress';
    const metric = (label,value,note,accent='') => `<article class="payroll-metric312 ${accent}"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`;
    const metrics = `<div class="payroll-metrics312">${metric('Employees',run?.rows?.length || 0,escape(status))}${metric('Gross payroll',complete?escape(money(sum(['gross']))):'—','LAK equivalent')}${metric('Employee PIT & SSO',complete?escape(money(sum(['employeePit','employeeSso']))):'—','Employee deductions · LAK')}${metric('Final payment',complete?paymentTotals:'—','Separate totals by payment currency','payroll-payment312')}</div>`;
    const rows = (run?.rows || []).map(row => {
      const x = byEmployee.get(row.employeeId),currency=row.employee?.currency||x?.currency||'LAK';
      const value = n => x ? escape(money(n)) : '—';
      return `<tr><td><strong>${escape(row.employee?.name || 'Employee')}</strong><small>${escape(row.employee?.code || '')}</small></td><td>${escape(money(row.employee?.salary,currency))}</td><td>${value(x?.gross)}</td><td>${value(Number(x?.employeePit||0)+Number(x?.employeeSso||0))}</td><td>${value(x?.net)}</td><td><strong>${x?escape(money(x.paidAmount,currency)):'—'}</strong></td></tr>`;
    }).join('');
    const payroll = run ? `<div class="overview-run-summary97"><div><strong>${escape(run.reference || 'Payroll')}</strong><span>${escape(status)}${complete?'':' · Calculation incomplete'}</span></div><span>Gross, deductions and net salary shown in LAK</span></div><div class="data-table82"><table class="payroll-summary312"><thead><tr><th>Employee</th><th>Contract salary</th><th>Gross · ₭</th><th>PIT & SSO · ₭</th><th>Net salary · ₭</th><th>Final payment</th></tr></thead><tbody>${rows || '<tr><td colspan="6">No employee rows are available.</td></tr>'}</tbody></table></div>` : '<p class="empty82">No payroll is open or saved for this month. Open Entries to prepare payroll.</p>';
    const leaveRows = leaves.map(record => {
      const d = record.data;
      const employee = Work82.employees.find(item => item.id === d.employeeId)?.data?.name || 'Former employee';
      return `<tr><td>${escape(employee)}</td><td>${escape(formatAppDate(d.from || ''))} – ${escape(formatAppDate(d.to || ''))}</td><td>${escape(d.type || '')}</td><td>${d.days == null ? '—' : amount(d.days)}</td><td>${escape(d.paid === 'yes' ? 'Paid' : d.paid === 'no' ? 'Unpaid' : 'Not recorded')}</td><td>${escape(d.status || '')}</td><td>${escape(d.reference || '')}</td></tr>`;
    }).join('');
    host.innerHTML = `<header class="payroll-overview-header312"><div><h3>Payroll Overview</h3><p>Monthly payroll totals, employee payments and processing status.</p></div><div class="actions82"><button type="button" onclick="switchTab('payroll-history')">Salary History</button><button class="je-btn je-btn-emerald" type="button" onclick="switchTab('payroll-entries')">Open Entries</button></div></header>${Work82.error ? `<p class="notice82 warn82">${escape(Work82.error)}</p>` : ''}<div class="payroll-period312"><div class="overview-month97"><label for="overviewPayrollMonth97">Payroll month</label><input type="month" id="overviewPayrollMonth97" value="${escape(month)}"></div><span class="payroll-status312">${escape(status)}</span></div>${metrics}<section class="block82"><header><h4>Employee payroll</h4></header>${payroll}</section><details class="block82 payroll-leave312"><summary>Leave this month <span>${leaves.length} records</span></summary><div class="data-table82"><table><thead><tr><th>Employee</th><th>Dates</th><th>Leave type</th><th>Days</th><th>Pay treatment</th><th>Status</th><th>Reference</th></tr></thead><tbody>${leaveRows || '<tr><td colspan="7" class="empty82">No leave records for this month.</td></tr>'}</tbody></table></div></details>`;
    host.querySelector('#overviewPayrollMonth97')?.addEventListener('change', async event => {
      overviewMonth = /^\d{4}-\d{2}$/.test(event.target.value) ? event.target.value : currentMonth();
      renderOverview();
      const selected = overviewMonth, actor = liveProfile?.id;
      try {
        await window.payrollWindow14334?.ensure(selected);
        if (actor === liveProfile?.id && selected === overviewMonth && document.querySelector('#payroll-overview.active')) renderOverview();
      } catch (error) { if (actor === liveProfile?.id && selected === overviewMonth) showCenterStatus(error.message,true); }
    });
  }

  window.payrollOverview269 = { enter() {
    const month = Work82.run?.month || currentMonth(), changed = overviewMonth !== month;
    overviewMonth = month;overviewContext269 = null;
    return changed;
  } };
