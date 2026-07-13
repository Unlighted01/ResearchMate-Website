// ============================================
// RESEARCHMATE PWA SERVICE WORKER
// Lightweight network-first caching for installer compliance
// ============================================

const CACHE_NAME = "researchmate-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/logo.svg",
  "/index.css"
];

// Install event - caching core shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
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
    })
  );
});

// Fetch event - network-first caching strategy
self.addEventListener("fetch", (event) => {
  // Let browser chrome extension or api requests bypass service worker cache
  if (
    event.request.url.startsWith("chrome-extension://") || 
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
