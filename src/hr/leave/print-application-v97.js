  function printLeaveApplication(id) {
    const record = (Work82.leaves || []).find(item => item.id === id);
    const data = record?.data || {};
    const employee = Work82.employees.find(item => item.id === data.employeeId)?.data || {};
    const content = `<h2>Leave Application</h2><p>Application reference: ${escape(data.reference || '________________')}</p><table><tbody><tr><th>Employee</th><td>${escape(employee.name || '')}</td><th>Position</th><td>${escape(employee.position || '')}</td></tr><tr><th>Leave type</th><td>${escape(data.type || '')}</td><th>Paid / unpaid</th><td>${escape(data.paid === 'yes' ? 'Paid' : 'Unpaid')}</td></tr><tr><th>From</th><td>${escape(data.from ? formatAppDate(data.from) : '')}</td><th>Through</th><td>${escape(data.to ? formatAppDate(data.to) : '')}</td></tr><tr><th>Working days</th><td>${escape(data.days || '')}</td><th>Payroll month</th><td>${escape(data.month || '')}</td></tr></tbody></table><h3>Reason</h3><p class="leave-reason97">${escape(data.notes || '')}</p><div class="leave-signatures97"><div>Employee signature / date</div><div>Supervisor approval / date</div><div>Payroll review / date</div></div>`;
    if (typeof window.print82 === 'function') window.print82('Leave Application', content, data.month || currentMonth());
    else window.print();
  }

