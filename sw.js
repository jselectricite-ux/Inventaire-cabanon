
const CACHE_NAME = 'inventaire-cabanon-v1';
const FILES_TO_CACHE = [
  '/index.html',
  '/manifest.webmanifest',
  '/css/style.css',
  '/js/app.js'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => {
    if (k !== CACHE_NAME) return caches.delete(k);
  }))));
  self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
  if (evt.request.method !== 'GET') return;
  evt.respondWith(caches.match(evt.request).then(resp => resp || fetch(evt.request)));
});
