// NURA – Service Worker for Web Push (Pop feature)
// Handles push events when tab is closed so Nura can notify the user.

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = { title: 'NURA', body: '' };
  try {
    payload = event.data.json();
  } catch {
    payload.body = event.data.text();
  }
  const title = payload.title || 'NURA';
  const options = {
    body: payload.body || 'You have a new notification.',
    ...(payload.icon && { icon: payload.icon }),
    ...(payload.badge && { badge: payload.badge }),
    tag: payload.tag || 'nura-default',
    data: payload.data || { url: payload.url || '/' },
    requireInteraction: !!payload.requireInteraction,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
