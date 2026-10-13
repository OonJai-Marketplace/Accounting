/* The adjustable database timeout is retired. device-vault14334 enforces the fixed
   24-hour inactivity deadline before access, on return, and while a tab is open. */
window.loadSessionPolicy1443=async()=>({timeout_minutes:1440,fixed:true})