const CACHE_NAME = "provpos-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./logo_proveedora.webp",
  "./manifest.json"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(res =>
      res ||
      fetch(e.request).then(resp => {
        if (e.request.url.startsWith("http") && !e.request.url.includes("firebase")) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match("./index.html"))
    )
  );
});
