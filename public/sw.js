// ============================================
// RESEARCHMATE PWA SERVICE WORKER
// Lightweight network-first caching with graceful fallbacks
// ============================================

const CACHE_NAME = "researchmate-cache-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/logo.svg",
  "/manifest.json",
];

// Install event - caching core shell assets safely
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        ASSETS_TO_CACHE.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn(`[SW] Precache skipped for ${asset}:`, err?.message || err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate event - cleaning old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network-first caching strategy
self.addEventListener("fetch", (event) => {
  // Let browser extensions and API requests bypass service worker cache
  if (
    event.request.url.startsWith("chrome-extension://") ||
    event.request.url.startsWith("moz-extension://") ||
    event.request.url.includes("/api/") ||
    event.request.url.includes("/functions/v1/") ||
    event.request.method !== "GET"
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache valid responses dynamically
        if (response && response.status === 200 && response.type === "basic") {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to offline cached shell
        return caches.match(event.request);
      })
  );
});
