const CACHE_NAME = "provsoft-pos-v2";

const urlsToCache = [
  "./",
  "./index.html",
  "./styles.css",
  "./pos-core.js",
  "./pos-utils.js",
  "./config.js",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
