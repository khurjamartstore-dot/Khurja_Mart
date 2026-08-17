const CACHE_NAME = "khurja-mart-v3"; // bumped from v2 — forces every device (including phones with old cache) to update NOW
const ASSETS_TO_CACHE = [
  "./index.html",
  "./manifest.json",
  "./style.css",
  "./script.js",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// ============================================================
// NETWORK-FIRST (badla hua hissa)
// ------------------------------------------------------------
// Pehle: cache-first tha -> agar koi bhi purana cached version
// mila, wahi turant dikha deta tha, chahe naya deploy ho chuka ho.
// Isi wajah se phone pe purana/tuta hua version dikhta tha.
//
// Ab: pehle HAMESHA internet se latest file mangwao. Jo bhi mile,
// wahi turant dikhao + cache bhi update kar do (agli baar offline
// hone par kaam aaye). Sirf jab internet na ho ya request fail ho
// jaaye, tab purani cached copy dikhao (taaki app offline bhi chale).
// ============================================================
self.addEventListener("fetch", function(event) {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(function() {
        return caches.match(event.request).then(function(cached) {
          return cached || caches.match("./index.html");
        });
      })
  );
});
