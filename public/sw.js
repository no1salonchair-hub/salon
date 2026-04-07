self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'New Notification', body: event.data.text() };
  }

  const title = data.title || 'New Booking!';
  const options = {
    body: data.body || 'You have a new booking request.',
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: data.url || '/',
    vibrate: [200, 100, 200]
  };

  // Set App Badge if supported
  if ('setAppBadge' in navigator) {
    navigator.setAppBadge(1).catch(error => {
      console.error('Error setting app badge:', error);
    });
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click Received.');

  event.notification.close();

  // Clear App Badge if supported
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(error => {
      console.error('Error clearing app badge:', error);
    });
  }

  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});
