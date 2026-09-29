/* Version 48 — responsive category navigation and approved settings refinements. */
(function () {
  'use strict';

  const mobileQuery = window.matchMedia('(max-width: 767px)');
  let activeTarget = '';

  function buttonTarget(button) {
    const source = button?.getAttribute('onclick') || '';
    return source.match(/(?:switchTab|scrollToAccountModule)\('([^']+)'\)/)?.[1] || '';
  }

  function categoryForTarget(target) {
    if (target === 'dashboard') return document.getElementById('nav-module-dashboard');
    return [...document.querySelectorAll('.nav-category')].find(category =>
      [...category.querySelectorAll('.nav-links .tab-btn')].some(button => buttonTarget(button) === target)
    ) || null;
  }

  function sourceButton(target) {
    return [...document.querySelectorAll('.nav-links .tab-btn')].find(button => buttonTarget(button) === target) || null;
  }

  function visibleCategoryButtons(category) {
    return [...(category?.querySelectorAll('.nav-links .tab-btn') || [])].filter(button =>
      !button.hidden && button.style.display !== 'none' && !button.classList.contains('permission-hidden')
    );
  }

  function tabLabel(target) {
    const source = sourceButton(target);
    return source ? source.childNodes[0].textContent.trim() : target;
  }

  function compactTabLabel(target, fallback) {
    const labels = {
      'transactions-new':'New Entry','transactions-all':'Transaction History','transactions-recurring':'Upcoming',
      'user-entry-review':'Submission Review','period-review':'Period Closing','transactions-voided':'Audit Log',
      'sec-chart-accounts':'Accounts','sec-general-ledger':'General Ledger','account-balances':'Balances',
      'payroll-employees':'Employees','payroll-entries':'Entries','payroll-deductions':'Deductions','payroll-history':'History',
      'tax-overview':'Overview','tax-pit':'PIT','tax-social':'SSO','tax-payment':'Tax Payments','tax-sso-payment':'SSO Payment','tax-records':'Tax Records',
      'inv-overview':'Overview','inv-adj':'Adjustments','inv-val':'Valuation',
      'menu-ingredients':'Ingredients','menu-recipe':'Recipes','menu-categories':'Categories','menu-costing':'Costing','menu-avail':'Availability',
      'settings-business':'Business','settings-users':'Users'
    };
    return labels[target] || fallback;
  }

  function syncMainTitle(target) {
    const title = document.getElementById('mainHeaderTitle');
    if (title) title.textContent = target === 'dashboard' ? 'Dashboard' : tabLabel(target);
  }

  function renderCategoryTabs(target) {
    const shell = document.getElementById('categoryTabShell');
    const host = document.getElementById('categoryTabs');
    if (!shell || !host) return;
    const category = categoryForTarget(target);
    const buttons = visibleCategoryButtons(category);
    const shouldShow = Boolean(category && category.dataset.module !== 'dashboard' && buttons.length);
    shell.hidden = !shouldShow;
    const markup = shouldShow ? buttons.map(button => {
      const destination = buttonTarget(button);
      const label = compactTabLabel(destination, button.childNodes[0].textContent.trim());
      return `<button type="button" class="category-tab ${destination === target ? 'active' : ''}" data-target="${destination}" role="tab" aria-selected="${destination === target}">${label}</button>`;
    }).join('') : '';
    if(host.innerHTML===markup)return;
    host.innerHTML=markup;
    host.querySelectorAll('.category-tab').forEach(tab => tab.addEventListener('click', () => sourceButton(tab.dataset.target)?.click()));
    requestAnimationFrame(() => {const tab=host.querySelector('.category-tab.active');if(!tab)return;const left=tab.offsetLeft,right=left+tab.offsetWidth;if(left<host.scrollLeft)host.scrollLeft=left;else if(right>host.scrollLeft+host.clientWidth)host.scrollLeft=right-host.clientWidth;});
  }

  function markNavigation(target) {
    activeTarget = target;
    const category = categoryForTarget(target);
    document.querySelectorAll('.nav-category').forEach(item => item.classList.toggle('active-category', item === category));
    document.querySelectorAll('.nav-links .tab-btn').forEach(button => button.classList.toggle('active', buttonTarget(button) === target));
    renderCategoryTabs(target);
    syncMainTitle(target);
  }

  function setAccountsView(target) {
    const chart = document.getElementById('sec-chart-accounts');
    const sub = document.getElementById('sec-sub-accounts');
    const ledger = document.getElementById('sec-general-ledger');
    const other = document.getElementById('sec-other-accounts');
    if (!chart || !sub || !ledger || !other) return;
    const showLedger = target === 'sec-general-ledger';
    const permitted = section => typeof canAccessAppTarget !== 'function' || canAccessAppTarget(section.id);
    [chart, sub, other].forEach(section => { section.hidden = section.id !== target || !permitted(section); });
    ledger.hidden = !showLedger || !permitted(ledger);
  }

  function ensurePlaceholderHeading(target) {
    const panel = document.getElementById(target);
    if (!panel || panel.querySelector('.content-page-heading, .settings-page-heading, .je-card-header, .card-header-flex')) return;
    const placeholder = panel.querySelector(':scope > .placeholder-warning');
    if (!placeholder) return;
    const heading = document.createElement('div');
    heading.className = 'content-page-heading';
    heading.innerHTML = `<h2>${tabLabel(target)}</h2>`;
    panel.insertBefore(heading, placeholder);
  }

  function syncSidebarIdentity() {
    const chip = document.getElementById('currentUserChip');
    const storedChip = chip?.textContent && chip.textContent !== 'Signed-in user' ? chip.textContent : '';
    const name = (typeof DemoAccess !== 'undefined' && DemoAccess.currentUser?.name) || (typeof liveProfile !== 'undefined' && (liveProfile?.full_name || liveProfile?.email)) || storedChip.split(' • ')[0] || 'Signed-in user';
    const role = (typeof livePermission !== 'undefined' && (livePermission?.job_title || livePermission?.user_type)) || (typeof liveProfile !== 'undefined' && liveProfile?.role) || storedChip.split(' • ')[1] || 'Account user';
    const roleNode = document.getElementById('sidebarUserRole');
    const initials = document.getElementById('headerAccountInitials');
    if (chip) chip.textContent = name;
    if (roleNode) roleNode.textContent = String(role).replace(/_/g, ' ');
    if (initials && !initials.classList.contains('has-photo104') && typeof window.userInitials === 'function') initials.textContent = window.userInitials(name);
    window.updateHeaderProfile104?.();
  }

  function movePrintingIntoSystem() {
    const printTab = document.getElementById('settings-print');
    const system = document.getElementById('settings-system');
    if (!printTab || !system) return;
    const panel = printTab.querySelector('.panel');
    if (panel) {
      panel.classList.add('system-printing-panel');
      const backup = [...system.querySelectorAll(':scope > .settings-section-card')].find(section => section.textContent.includes('Backup & Export'));
      system.insertBefore(panel, backup || null);
    }
    printTab.remove();
    document.getElementById('settings-pos')?.remove();
  }

  function validatePayrollCurrencies(event) {
    const form = event.currentTarget;
    const enabled = [...form.querySelectorAll('.payroll-currency-options input:checked')].map(field => field.name.replace('payCurrency', ''));
    const selected = form.elements.payCurrency?.value;
    if (!enabled.length) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.showCenterStatus?.('Enable at least one payroll currency.', true);
    } else if (!enabled.includes(selected)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.showCenterStatus?.('The default payroll currency must also be enabled.', true);
    }
  }

  function navigateCategory(category, defaultTarget) {
    if (category?.dataset.module === 'dashboard') { window.switchTab('dashboard'); return; }
    if (!category) return;
    if (mobileQuery.matches) {
      if (category.dataset.module === 'dashboard') {
        window.switchTab('dashboard');
        return;
      }
      const opening = !category.classList.contains('open');
      document.querySelectorAll('.nav-category.open').forEach(item => item.classList.remove('open'));
      category.classList.toggle('open', opening);
      return;
    }
    const preferred = sourceButton(defaultTarget);
    const fallback = visibleCategoryButtons(category)[0];
    (preferred || fallback)?.click();
  }

  function installWrappers() {
    const previousSwitchTab = window.switchTab;
    window.switchTab = function (target) {
      const result = previousSwitchTab(target);
      ensurePlaceholderHeading(target);
      markNavigation(target);
      return result;
    };

    const previousAccountScroll = window.scrollToAccountModule;
    window.scrollToAccountModule = function (target) {
      setAccountsView(target);
      const result = previousAccountScroll(target);
      markNavigation(target);
      return result;
    };

    window.activateCategory = function (element, defaultTarget) {
      navigateCategory(element.closest('.nav-category'), defaultTarget);
    };

    if (typeof window.applyLiveRoleAccess === 'function') {
      const previousRoleAccess = window.applyLiveRoleAccess;
      window.applyLiveRoleAccess = function () {
        const result = previousRoleAccess();
        syncSidebarIdentity();
        renderCategoryTabs(activeTarget || document.querySelector('.tab-content.active')?.id || 'dashboard');
        return result;
      };
    }
  }

  function initializeV48Navigation() {
    movePrintingIntoSystem();
    document.getElementById('settingsTabShell')?.setAttribute('hidden', '');
    const payrollForm = document.querySelector('form[data-settings-group="payroll"]');
    payrollForm?.addEventListener('submit', validatePayrollCurrencies, true);
    installWrappers();
    syncSidebarIdentity();
    const active = document.querySelector('.tab-content.active')?.id || 'dashboard';
    if (active === 'accounts-modular-container') setAccountsView('sec-general-ledger');
    markNavigation(active === 'accounts-modular-container' ? 'sec-general-ledger' : active);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeV48Navigation, {once: true});
  else initializeV48Navigation();
})();
