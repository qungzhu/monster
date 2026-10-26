/* FurryPal service worker: shows reminders and the pet's messages that
 * arrive by Web Push while the app is closed. When the app is open and
 * focused, the message goes to the page instead (the pet says it). */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let job = {};
  try { job = event.data ? event.data.json() : {}; } catch { job = { body: event.data?.text() }; }
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of windows) w.postMessage({ type: 'fp-push', job });
    if (windows.some(w => w.focused)) return; // the pet says it in the app
    await self.registration.showNotification(job.title || '🐾 FurryPal', {
      body: job.body || '',
      tag: job.id || 'furrypal',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: { url: '/' },
    });
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = windows.find(w => new URL(w.url).origin === self.location.origin);
    if (open) return open.focus();
    return self.clients.openWindow(event.notification.data?.url || '/');
  })());
});
