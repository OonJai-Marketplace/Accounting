// Compatibility names used by the desktop, phone and password-recovery clients.
(()=>{'use strict';const c=window.OJM_DEPLOYMENT||{};
window.OJM_SUPABASE_URL=c.supabase?.url||'';
window.OJM_SUPABASE_ANON_KEY=c.supabase?.publishableKey||'';
window.OJM_PUBLIC_APP_URL=c.site?.url||'';
window.OJM_WORKSPACE_URLS={accounting:c.workspaces?.accounting||new URL('./',location.href).href,publicRestaurant:c.workspaces?.publicRestaurant||'',restaurant:c.workspaces?.restaurant||''};
window.deployment14320={config:c,site:()=>c.site?.url||new URL('./',location.href).href,repository:()=>c.site?.repository||'',branch:()=>c.site?.branch||'main',ready:()=>!!(window.OJM_SUPABASE_URL&&window.OJM_SUPABASE_ANON_KEY)};
})();
