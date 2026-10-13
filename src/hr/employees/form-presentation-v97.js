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
    hint.textContent = 'Choose this employee’s personal clearing account in their salary currency for payroll, advances and recoveries.';
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

