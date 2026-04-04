const CACHE_NAME = "provsoft-shell-v1";
const APP_SHELL = [
  "./",
  "./pwa-shell.html",
  "./manifest.json",
  "./pwa-register.js",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(networkResp => {
        const copy = networkResp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return networkResp;
      }).catch(() => cached);
    })
  );
});