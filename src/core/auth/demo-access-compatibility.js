// ==============================================================================
// JS V11: DEMO EMAIL LOGIN, USERS & STAFF ENTRY APPROVAL WORKFLOW
// Replace this local demo layer with Supabase Auth and database policies.
// ==============================================================================
const DEMO_USERS_KEY = 'ojm_demo_users_v1';
const ENTRY_SUBMISSIONS_KEY = 'ojm_entry_submissions_v1';
const DEMO_SESSION_KEY = 'ojm_demo_session_v1';
const DEFAULT_DEMO_USERS = [
  { id:'usr-admin-1', name:'Demo Administrator', email:'admin@oonjai.demo', password:'Admin123!', role:'admin', active:true },
  { id:'usr-staff-1', name:'Head Cook', email:'headcook@oonjai.demo', password:'Staff123!', role:'submitter', active:true }
];

const DemoAccess = {
  users: [], submissions: [], currentUser: null,
  load() {
    try { this.users = JSON.parse(localStorage.getItem(DEMO_USERS_KEY) || 'null') || [...DEFAULT_DEMO_USERS]; } catch (_) { this.users = [...DEFAULT_DEMO_USERS]; }
    try { this.submissions = JSON.parse(localStorage.getItem(ENTRY_SUBMISSIONS_KEY) || '[]'); } catch (_) { this.submissions = []; }
    try {
      const id = sessionStorage.getItem(DEMO_SESSION_KEY);
      this.currentUser = this.users.find(user => user.id === id && user.active) || null;
    } catch (_) { this.currentUser = null; }
    this.saveUsers();
  },
  saveUsers() { localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(this.users)); },
  saveSubmissions() { localStorage.setItem(ENTRY_SUBMISSIONS_KEY, JSON.stringify(this.submissions)); }
};

function handleDemoLogin(event) {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const user = DemoAccess.users.find(item => item.active && item.email.toLowerCase() === email && item.password === password);
  const error = loginMessageTarget14293();
  if (!user) { if (error) error.textContent = 'The email or password is incorrect.'; return; }
  DemoAccess.currentUser = user;
  sessionStorage.setItem(DEMO_SESSION_KEY, user.id);
  if (error) error.textContent = '';
  applyDemoAccess();
}

function logoutDemoUser() {
  sessionStorage.removeItem(DEMO_SESSION_KEY);
  DemoAccess.currentUser = null;
  document.getElementById('loginGate')?.classList.remove('is-authenticated');
  const password = document.getElementById('loginPassword'); if (password) password.value = '';
}

function applyDemoAccess() {
  const user = DemoAccess.currentUser;
  document.getElementById('loginGate')?.classList.toggle('is-authenticated', Boolean(user));
  if (!user) return;
  document.body.dataset.userRole = user.role;
  const chip = document.getElementById('currentUserChip');
  if (chip) chip.textContent = `${user.name} • ${user.role === 'admin' ? 'Admin' : 'Staff'}`;
  document.querySelectorAll('.nav-category').forEach(category => {
    category.hidden = user.role !== 'admin' && category.dataset.module !== 'submissions';
  });
  document.querySelectorAll('.submission-admin-column').forEach(element => element.hidden = user.role !== 'admin');
  const roleBadge = document.getElementById('submissionRoleBadge');
  if (roleBadge) roleBadge.textContent = user.role === 'admin' ? 'Administrator Review' : 'Staff Workspace';
  const tableTitle = document.getElementById('submissionTableTitle');
  if (tableTitle) tableTitle.textContent = user.role === 'admin' ? 'Submission Review Queue' : 'My Submissions';
  renderDemoUsers(); renderEntrySubmissions(); updateSubmissionCount();
  switchTab(user.role==='admin'?'dashboard':'sub-users-workspace');
}

function addDemoUser(event) {
  event.preventDefault();
  if (DemoAccess.currentUser?.role !== 'admin') return;
  const email = document.getElementById('demoUserEmail').value.trim().toLowerCase();
  if (DemoAccess.users.some(user => user.email.toLowerCase() === email)) { showAppNotification('Duplicate Email','A user with this email already exists.',true); return; }
  DemoAccess.users.push({
    id:`usr-${Date.now()}`, name:document.getElementById('demoUserName').value.trim(), email,
    password:document.getElementById('demoUserPassword').value, role:document.getElementById('demoUserRole').value, active:true
  });
  DemoAccess.saveUsers(); event.target.reset(); renderDemoUsers();
  showAppNotification('Demo User Added','The new local demo account is ready for testing.',false);
}

function toggleDemoUser(id) {
  if (DemoAccess.currentUser?.role !== 'admin' || id === DemoAccess.currentUser.id) return;
  const user = DemoAccess.users.find(item => item.id === id); if (!user) return;
  user.active = !user.active; DemoAccess.saveUsers(); renderDemoUsers();
}

function renderDemoUsers() {
  const host = document.getElementById('demoUsersList'); if (!host) return;
  host.innerHTML = DemoAccess.users.map(user => `<div class="demo-user-row">
    <div class="demo-user-avatar">${escapeHtml(user.name.split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase())}</div>
    <div class="demo-user-details"><strong>${escapeHtml(user.name)}</strong><span>${escapeHtml(user.email)}</span></div>
    <span class="user-role-badge ${user.role}">${user.role === 'admin' ? 'Administrator' : 'Staff Submitter'}</span>
    <span class="user-status-badge ${user.active ? 'active' : 'inactive'}">${user.active ? 'Active' : 'Inactive'}</span>
    <button type="button" class="je-btn je-btn-secondary" ${user.id === DemoAccess.currentUser?.id ? 'disabled' : ''} onclick="toggleDemoUser('${user.id}')">${user.active ? 'Deactivate' : 'Activate'}</button>
  </div>`).join('');
}

