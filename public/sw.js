/* eslint-env serviceworker */
// প্রতিটি নতুন production release-এ এই version বদলাতে হবে।
const APP_RELEASE = "v4";

const CACHE_PREFIX = "alimxl-shell-";
const CACHE_NAME = `${CACHE_PREFIX}${APP_RELEASE}`;

const INITIAL_FILES = [
  "/",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      await cache.addAll(
        INITIAL_FILES.map(
          (url) => new Request(url, { cache: "reload" })
        )
      );
    })()
  );

  // নতুন সংস্করণ দিয়ে চলমান অ্যাপ জোর করে বদলানো হবে না।
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();

      await Promise.all(
        names
                    .filter(
            (name) =>
              name.startsWith(CACHE_PREFIX) &&
              name !== CACHE_NAME
          )
          .map((name) => caches.delete(name))
      );

      await self.clients.claim();
    })()
  );
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (response.status === 200 && response.type === "basic") {
    try {
      await cache.put(request, response.clone());
    } catch (error) {
      console.warn("ALIMXL asset cache failed:", error);
    }
  }

  return response;
}

async function openApp(request) {
  const cache = await caches.open(CACHE_NAME);

  // এই এক-পেজ অ্যাপে ক্যাশ করা HTML-ই একই সংস্করণে রাখছি।
  const cached = await cache.match("/");

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (
    response.status === 200 &&
    response.headers.get("content-type")?.includes("text/html")
  ) {
    try {
      await cache.put("/", response.clone());
    } catch (error) {
      console.warn("ALIMXL page cache failed:", error);
    }
  }

  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    request.headers.has("range")
  ) {
    return;
  }

  // API, authentication ও RSC request ক্যাশ করছি না।
  if (
    url.pathname === "/api" ||
    url.pathname.startsWith("/api/") ||
    request.headers.get("RSC") === "1" ||
    url.searchParams.has("_rsc")
  ) {
    return;
  }

  if (
    request.mode === "navigate" &&
    url.pathname === "/"
  ) {
    event.respondWith(openApp(request));
    return;
  }

  const isAppAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/manifest.webmanifest";

  if (isAppAsset) {
    event.respondWith(cacheFirst(request));
  }
});