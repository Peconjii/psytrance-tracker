// The service worker that makes Map of Psy installable on a phone. It caches nothing but the offline page: pages,
// code and events always come from the network, so a new deploy is never hidden behind an old copy.
const CACHE = 'map-of-psy-offline-v1'
const OFFLINE = '/offline.html'

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
    event.waitUntil(caches.keys()
        .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
        .then(() => self.clients.claim()))
})

// Only page loads are touched: when the network fails, the offline page is shown instead of the browser's error
self.addEventListener('fetch', (event) => {
    if (event.request.mode !== 'navigate') return
    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)))
})
