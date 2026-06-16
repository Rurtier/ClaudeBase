/* Service worker: caches the app shell so the POC works fully offline once loaded. */
var CACHE = 'tokyo-rail-poc-v1';
var ASSETS = [
  './',
  './index.html',
  './styles.css',
  './network.js',
  './simulation.js',
  './app.js',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  // Cache-first for the app shell; fall back to network (and cache new responses).
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        if (res && res.ok && e.request.url.indexOf('http') === 0) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return hit; });
    })
  );
});
