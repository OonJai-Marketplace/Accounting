/* Retire only the old embedded POS service worker after upgrading the accounting page. */
if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(registrations => {
  for (const registration of registrations) {
    const url = registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL || '';
    if (url.endsWith('/pos-sw119.js') && registration.scope === new URL('./', location.href).href) registration.unregister();
  }
}).catch(() => {});
if ('caches' in window) caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('oonjai-pos-shell')).map(key => caches.delete(key)))).catch(() => {});
