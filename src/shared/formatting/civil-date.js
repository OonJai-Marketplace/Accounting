/* Calendar defaults use the device's local civil day, matching native date inputs.
   ISO timestamps remain UTC for storage, audit events and synchronization. */
function appLocalDate(date=new Date()) {
  const pad=value=>String(value).padStart(2,'0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
}
