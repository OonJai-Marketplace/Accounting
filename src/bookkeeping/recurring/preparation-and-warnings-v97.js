  window.getActiveRecurringWarnings = function () {
    if(!window.PrivateReminders14229?.ready())return [];
    const today = localDate();
    return (typeof RecurringStore !== 'undefined' ? RecurringStore.items : [])
      .filter(item => !item.paused && (item.reminders||[]).length>0 && (!item.preparedUntil || item.preparedUntil <= today) && ['OVERDUE', 'DUE SOON'].includes(window.recurringStatus(item)))
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

  window.savePreparationDone97 = async function (id, button) {
    const item = RecurringStore.items.find(record => record.id === id);
    const card = button?.closest('[data-preparation-card97]');
    const date = card?.querySelector('[data-preparation-form97] input[type="date"]')?.value;
    if (!item || !date) return;
    if (date <= localDate()) {
      window.showAppNotification?.('Choose a later date', 'Set the final warning for a future date.', true);
      return;
    }
    const saved=await PrivateReminders14229.mutate(()=>{const item=RecurringStore.items.find(record=>record.id===id);if(!item)throw Error("Reminder changed. Reload first.");item.preparedUntil=date},'prepare:'+id+':'+date);
    if(!saved)return;
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
          <div class="recurring-warning-actions97"><button type="button" class="je-btn je-btn-secondary" onclick="openPreparationDate97('${escape(item.id)}')">Preparation Done</button><button type="button" class="je-btn je-btn-emerald" onclick="markRecurringPaid('${escape(item.id)}')">Mark reminder paid</button></div></div>
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

