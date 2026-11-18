// ============================================
// RESEARCHMATE PWA SERVICE WORKER
// Lightweight network-first caching with graceful fallbacks
// ============================================

const CACHE_OWNER = "researchmate-sw-";
const SHELL_CACHE = `${CACHE_OWNER}shell-v3`;
const OCR_CACHE = `${CACHE_OWNER}ocr-runtime-v7`;
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/logo.svg",
  "/manifest.json",
];

// Install event - caching core shell assets safely
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
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
          if ((key.startsWith(CACHE_OWNER) || key === "researchmate-cache-v2") && key !== SHELL_CACHE && key !== OCR_CACHE) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network-first caching strategy
self.addEventListener("fetch", (event) => {
  // OCR assets are versioned and finite; model files use Tesseract's IndexedDB cache.
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith("/ocr/")) {
    // Language models have one canonical cache: Tesseract's IndexedDB model cache.
    if (url.pathname.includes("/lang/")) return;
    const allowed = /^\/ocr\/7\.0\.0\/(worker\.min\.js|core\/tesseract-core-(?:lstm|simd-lstm|relaxedsimd-lstm)\.wasm(?:\.js)?)$/.test(url.pathname);
    if (allowed && event.request.method === "GET") {
      event.respondWith(caches.open(OCR_CACHE).then(async (cache) => {
        const cacheKey = `${url.origin}${url.pathname}`;
        const cached = await cache.match(cacheKey);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) await cache.put(cacheKey, response.clone());
        return response;
      }));
    }
    return;
  }
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
          caches.open(SHELL_CACHE).then((cache) => {
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
