// The store's service worker: shows the notifications about an order and opens its page when one is tapped.
// It caches nothing, so the store always loads fresh from the network.
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'ITCITADEL', {
      body: data.body || '',
      tag: data.tag,
      icon: 'icon-192.png',
      badge: 'badge-96.png',
      dir: 'auto',
      data: { url: data.url || self.registration.scope },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || self.registration.scope
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((tabs) => {
      const open = tabs.find((tab) => tab.url === url)
      return open ? open.focus() : self.clients.openWindow(url)
    }),
  )
})
