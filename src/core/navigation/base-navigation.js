// ==============================================================================


// ==============================================================================
// JS 3: NAVIGATION, ACCORDION & TAB SWITCHER (BACKBONE)
// ==============================================================================
function activateCategory(element, defaultTabId) {
  document.querySelectorAll('.nav-category').forEach(cat => {
    if (cat !== element.parentElement) cat.classList.remove('open');
  });
  element.parentElement.classList.toggle('open');
  if (defaultTabId.startsWith('sec-')) {
    scrollToAccountModule(defaultTabId);
  } else {
    switchTab(defaultTabId);
  }
}

function setMobileNavigation(open) {
  const sidebar = document.getElementById('appSidebar');
  const toggle = document.getElementById('mobileMenuToggle');
  if (!sidebar) return;
  sidebar.classList.toggle('mobile-open', open);
  document.body.classList.toggle('nav-drawer-open', open);
  if (toggle) toggle.setAttribute('aria-expanded', String(open));
}

function toggleMobileNavigation() {
  const sidebar = document.getElementById('appSidebar');
  setMobileNavigation(!sidebar?.classList.contains('mobile-open'));
}

function closeMobileNavigation() {
  setMobileNavigation(false);
}

function closeNavigationAfterSelection() {
  if (document.body.classList.contains('tablet117') || window.matchMedia('(max-width: 1024px)').matches || (document.body.classList.contains('subusers-workspace-active') && window.matchMedia('(hover:none) and (pointer:coarse)').matches)) closeMobileNavigation();
}

function switchTab(tabId) {
  if (!document.getElementById(tabId)) tabId = 'dashboard';
  document.querySelectorAll('.tab-btn.active').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content.active').forEach(c => c.classList.remove('active'));

  const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick')?.includes(tabId));
  if (btn) {
    btn.classList.add('active');
    const title = document.getElementById('mainHeaderTitle');
    if (title) title.textContent = btn.textContent.trim();
  }

  const targetTab = document.getElementById(tabId);
  if (targetTab) targetTab.classList.add('active');
  if (targetTab) localStorage.setItem('ojm_last_active_view_v1', tabId);

  if (tabId === 'journal' && typeof renderJournalHistoryTable === 'function') renderJournalHistoryTable();
  if (tabId === 'transactions-new' && typeof renderNewTransactionsTable === 'function') renderNewTransactionsTable();
  if (tabId === 'transactions-all' && typeof renderAllTransactionsTable === 'function') renderAllTransactionsTable();
  closeNavigationAfterSelection();
}

function scrollToAccountModule(moduleId) {
  localStorage.setItem('ojm_last_active_view_v1', moduleId);
  document.querySelectorAll('.tab-btn.active').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content.active').forEach(c => c.classList.remove('active'));

  const accContainer = document.getElementById('accounts-modular-container');
  if (accContainer) accContainer.classList.add('active');

  const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick')?.includes(moduleId));
  if (btn) {
    btn.classList.add('active');
    const title = document.getElementById('mainHeaderTitle');
    if (title) title.textContent = "Accounts — " + btn.textContent.trim();
  }

  const moduleTarget = document.getElementById(moduleId);
  if (moduleTarget) {
    requestAnimationFrame(()=>{if(accContainer?.classList.contains('active')){const scroller=appWorkspaceScroller();if(scroller)scroller.scrollTop=0;}});
  }
  closeNavigationAfterSelection();
}

window.addEventListener('resize', () => {
  if (window.innerWidth >= 768) closeMobileNavigation();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeMobileNavigation();
});


// Reserve one rail width; expanding the navigation only changes the overlay.
function initNavigationRail291(){
 const root=document.documentElement,sidebar=document.getElementById('appSidebar');
 if(!sidebar||!document.getElementById('journalEntry98'))return;
 const button=document.createElement('button');
 button.type='button';button.className='nav-rail-toggle291';button.setAttribute('aria-controls','appSidebar');
 button.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
 sidebar.prepend(button);
 let pinned=false,hover=false,keyboard=false;
 function paint(){
  const open=pinned||hover||keyboard;
  const mode=open?'open':'closed';
  if(root.dataset.navRail291===mode)return;
  root.dataset.navRail291=mode;
  button.setAttribute('aria-expanded',String(open));
  button.setAttribute('aria-label',open?'Collapse navigation':'Expand navigation');
 }
 function close(){pinned=hover=keyboard=false;paint();}
 sidebar.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){hover=true;paint();}});
 sidebar.addEventListener('pointerleave',()=>{hover=false;paint();});
 sidebar.addEventListener('focusin',e=>{if(e.target!==button&&e.target.matches(':focus-visible')){keyboard=true;paint();}});
 sidebar.addEventListener('focusout',e=>{if(!sidebar.contains(e.relatedTarget)){keyboard=false;paint();}});
 button.addEventListener('click',()=>{if(root.dataset.navRail291==='open')close();else{pinned=true;paint();}});
 document.addEventListener('pointerdown',e=>{if(!sidebar.contains(e.target))close();},true);
 sidebar.addEventListener('click',e=>{if(pinned&&e.target.closest('.tab-btn,.group-child14378'))close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&root.dataset.navRail291==='open'){if(sidebar.contains(document.activeElement))button.focus();close();}});
 paint();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initNavigationRail291);else initNavigationRail291();
