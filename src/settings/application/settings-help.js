// SETTINGS HELP — red asterisks explain only settings that need accounting or system context.
const SETTING_HELP = {
  'company-identity': {title:'Company Identity', body:'<p><strong>Use the legal name</strong> exactly as it appears on registrations, tax records, and licenses. The trading name is the customer-facing name that may appear on reports and printouts.</p>'},
  'legal-documents': {title:'Current Legal Documents', body:'<p>Keep copies of registrations, licenses, tax certificates, annual filing records, and other company documents here. These are for reference and download; they do not automatically submit anything to a government office.</p>'},
  'users-permissions': {title:'Users and Permissions', body:'<p>Create a login for each staff member. You choose the modules they can see, the accounts they may use, and whether they may submit, approve, post, void, or export.</p><p>Use <strong>Allow any active account</strong> only for trusted users or temporary emergency access.</p>'},
  'accounting-settings': {title:'Accounting Settings', body:'<p>Set the fiscal year, journal numbering, default cash and bank accounts, exchange-rate method, and amount precision. Protecting closed periods helps prevent accidental edits. The currency manager controls which currencies are available; adding one does not convert existing transactions.</p>'},
  'payroll-settings': {title:'Payroll Settings', body:'<p>Set the normal pay cycle, working schedule, cutoff and payment dates, overtime multiplier, grace period, and standard SSO/PIT sharing defaults. Employee-specific rules can override these later.</p>'},
  'tax-settings': {title:'Statutory Settings', body:'<p>Maintain editable PIT salary brackets, SSO contribution settings, VAT defaults, and separate filing reminders. Confirm all rates, thresholds, ceilings, and due dates against current Lao requirements before payroll or filing.</p>'},
  'printing-settings': {title:'Printing Settings', body:'<p>Control paper size, margins, branding placement, page numbers, and downloaded file names. Header and footer images are visual only; they do not change accounting data.</p>'},
  'backup-export': {title:'Backup and Export', body:'<p>Download a backup before major changes. A settings backup preserves browser-held configuration; transaction exports are for checking or keeping a separate copy. Restoring a backup replaces the matching saved settings in this browser.</p>'},
  'system-settings': {title:'System Settings', body:'<p>Choose date and number formats, the preferred opening page, and an archive reminder. Records are never deleted automatically.</p>'},
  'session-timeout': {title:'Inactivity Timeout', body:'<p>The system automatically signs out a user after the selected number of minutes without activity. Clicking, typing, scrolling, or navigating resets the timer.</p>'},
  'timeout-warning': {title:'Timeout Warning', body:'<p>Choose how many minutes before automatic sign-out the user should receive a warning so they can remain signed in.</p>'},
  'record-retention': {title:'Record Retention', body:'<p>This is a policy reminder only. Accounting records are never deleted automatically by this setting.</p>'}
};
function openSettingHelp(key){
  const item=SETTING_HELP[key]||{title:'Settings help',body:'<p>This setting changes how the application is configured. Save your changes when you are ready.</p>'};
  const title=document.getElementById('settingHelpTitle'),content=document.getElementById('settingHelpContent');
  if(title)title.textContent=item.title;if(content)content.innerHTML=item.body;
  openModal('modalSettingHelp');
}

