// Service worker minimale: necessario per installare la PWA e mostrare notifiche di sistema.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((list) => (list[0] ? list[0].focus() : self.clients.openWindow('/')))
  )
})
