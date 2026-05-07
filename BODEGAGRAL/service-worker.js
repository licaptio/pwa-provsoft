const CACHE_NAME = "proveedora-transferencias-v1";

const APP_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./config.js",
  "./logo_proveedora.jfif"
];

self.addEventListener("install", event => {

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_ASSETS))
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {

  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {

          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }

        })
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {

  event.respondWith(

    caches.match(event.request)
      .then(response => {

        return response || fetch(event.request);

      })

  );
});