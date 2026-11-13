/* global self, caches, fetch, Request, Response, URL, AbortController, setTimeout, clearTimeout, console */

/**
 * ALIMXL public offline application shell.
 *
 * Deployment assumptions:
 * - The app is served from the origin root.
 * - Listed routes return public, non-personalized HTML.
 * - User documents are stored separately.
 *
 * Do not cache private account pages or authenticated documents
 * using this public-shell strategy.
 */

/**
 * Change this identifier for EVERY production deployment that
 * changes application HTML, JavaScript, CSS or offline resources.
 *
 * Never reuse a cache release for different build outputs.
 *
 * This is separate from package.json's application version.
 */
const APP_RELEASE = "v4-offline-2";

const CACHE_PREFIX = "alimxl-shell-";
const CACHE_NAME = `${CACHE_PREFIX}${APP_RELEASE}`;

const PUBLIC_ROUTES = [
  "/",
  "/settings",
  "/photo-studio",
];

const PUBLIC_FILES = [
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

const ROUTE_SET = new Set(PUBLIC_ROUTES);
const FILE_SET = new Set(PUBLIC_FILES);

const INSTALL_TIMEOUT_MS = 30_000;

const MAX_DIRECT_ASSETS = 200;

const MANIFEST_KEY = new URL(
  "/__alimxl_offline_install_manifest__",
  self.location.origin
).href;

/**
 * No skipWaiting().
 *
 * Existing tabs keep their active worker until the browser
 * can safely activate the waiting release.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(
    prepareOfflineShell().catch((error) => {
      console.error(
        "ALIMXL offline installation failed:",
        error
      );

      throw error;
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();

      const obsolete = names.filter(
        (name) =>
          name.startsWith(CACHE_PREFIX) &&
          name !== CACHE_NAME
      );

      const results = await Promise.allSettled(
        obsolete.map((name) => caches.delete(name))
      );

      for (const result of results) {
        if (result.status === "rejected") {
          console.warn(
            "ALIMXL old shell-cache cleanup failed:",
            result.reason
          );
        }
      }

      /*
       * Intentionally no clients.claim().
       *
       * A page already loaded without this worker keeps its
       * current controller state. A later full navigation can
       * be controlled by this active worker.
       *
       * OfflineSetup can still inspect registration.active.
       */
    })()
  );
});

function isSuccessfulLocalResponse(response) {
  return (
    response.status === 200 &&
    response.type === "basic" &&
    !response.redirected
  );
}

function isHTMLResponse(response) {
  return (
    isSuccessfulLocalResponse(response) &&
    response.headers
      .get("content-type")
      ?.toLowerCase()
      .includes("text/html") === true
  );
}

function isExcludedRequest(request, url) {
  return (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    request.headers.has("range") ||
    request.headers.has("authorization") ||
    url.pathname === "/api" ||
    url.pathname.startsWith("/api/") ||
    request.headers.get("RSC") === "1" ||
    request.headers.has("Next-Router-State-Tree") ||
    url.searchParams.has("_rsc")
  );
}

function isPublicDocumentURL(url) {
  return (
    url.origin === self.location.origin &&
    ROUTE_SET.has(url.pathname) &&
    url.search === ""
  );
}

function isAllowedAssetURL(url) {
  if (url.origin !== self.location.origin) {
    return false;
  }

  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/fonts/") ||
    FILE_SET.has(url.pathname)
  );
}

/**
 * Installation fetches bypass the browser HTTP cache.
 *
 * Redirects are rejected to avoid caching a login/error page
 * under an expected public resource URL.
 */
async function fetchForInstallation(path) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, INSTALL_TIMEOUT_MS);

  try {
    const request = new Request(
      new URL(path, self.location.origin).href,
      {
        method: "GET",
        cache: "reload",
        credentials: "same-origin",
        redirect: "error",
        signal: controller.signal,
      }
    );

    const response = await fetch(request);

    if (!isSuccessfulLocalResponse(response)) {
      throw new Error(
        `Offline resource unavailable: ${path}`
      );
    }

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Finds Next.js JavaScript and CSS directly referenced
 * in HTML src/href attributes.
 *
 * This is not a complete build dependency manifest.
 *
 * It does not discover every:
 * - Dynamic import.
 * - CSS font or image.
 * - Resource loaded after a user interaction.
 */
function discoverDirectAssets(html) {
  const assets = new Set();

  const pattern =
    /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;

  for (const match of html.matchAll(pattern)) {
    const raw = match[1].replace(/&amp;/g, "&");

    try {
      const url = new URL(
        raw,
        self.location.origin
      );

      const supported =
        url.origin === self.location.origin &&
        url.pathname.startsWith("/_next/static/") &&
        /\.(?:js|css)$/i.test(url.pathname);

      if (supported) {
        url.hash = "";
        assets.add(url.href);
      }
    } catch {
      // Ignore malformed references.
    }
  }

  return assets;
}

async function prepareOfflineShell() {
  const cache = await caches.open(CACHE_NAME);

  /*
   * Remove an earlier installation marker for this release.
   * Resource writes can be partial if installation fails.
   * Only write a new marker after preparation succeeds.
   */
  await cache.delete(MANIFEST_KEY);

  const directAssets = new Set();

  for (const route of PUBLIC_ROUTES) {
    const response =
      await fetchForInstallation(route);

    if (!isHTMLResponse(response)) {
      throw new Error(
        `Expected public HTML for ${route}`
      );
    }

    const html = await response.clone().text();

    for (const asset of discoverDirectAssets(html)) {
      directAssets.add(asset);
    }

    if (directAssets.size > MAX_DIRECT_ASSETS) {
      throw new Error(
        "Too many direct assets. Review the offline build strategy."
      );
    }

    await cache.put(route, response);
  }

  for (const path of PUBLIC_FILES) {
    const response =
      await fetchForInstallation(path);

    if (
      response.headers
        .get("content-type")
        ?.toLowerCase()
        .includes("text/html")
    ) {
      throw new Error(
        `Unexpected HTML response for ${path}`
      );
    }

    await cache.put(path, response);
  }

  /*
   * Sequential requests limit concurrent network and memory
   * pressure during initial preparation.
   */
  for (const asset of directAssets) {
    const response =
      await fetchForInstallation(asset);

    if (
      response.headers
        .get("content-type")
        ?.toLowerCase()
        .includes("text/html")
    ) {
      throw new Error(
        `Unexpected HTML response for ${asset}`
      );
    }

    await cache.put(asset, response);
  }

  const manifest = {
    app: "ALIMXL_OFFLINE_SHELL",
    version: 1,
    release: APP_RELEASE,
    preparedAt: new Date().toISOString(),
    routes: PUBLIC_ROUTES,
    files: PUBLIC_FILES,
    directAssets: Array.from(directAssets),
  };

  await cache.put(
    MANIFEST_KEY,
    new Response(JSON.stringify(manifest), {
      headers: {
        "Content-Type": "application/json",
      },
    })
  );
}

function offlineDocumentResponse() {
  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ALIMXL — Offline page unavailable</title>
  </head>
  <body>
    <main>
      <h1>This page is not available offline yet.</h1>
      <p>
        Reconnect to the internet and open ALIMXL again
        to prepare the required application files.
      </p>
      <p>
        This message does not mean your saved workbooks
        or images have been deleted.
      </p>
      <p><a href="/">Return to ALIMXL Home</a></p>
    </main>
  </body>
</html>`,
    {
      status: 503,
      statusText: "Offline page unavailable",
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Security-Policy":
          "default-src 'none'; base-uri 'none'; form-action 'none'",
        "X-Content-Type-Options": "nosniff",
      },
    }
  );
}

/**
 * Cache read errors must not automatically break
 * otherwise available online navigation.
 */
async function readCached(requestOrPath) {
  try {
    const cache = await caches.open(CACHE_NAME);

    return await cache.match(requestOrPath);
  } catch (error) {
    console.warn(
      "ALIMXL cache read failed:",
      error
    );

    return undefined;
  }
}

async function writeCached(requestOrPath, response) {
  try {
    const cache = await caches.open(CACHE_NAME);

    await cache.put(
      requestOrPath,
      response
    );
  } catch (error) {
    console.warn(
      "ALIMXL cache write failed:",
      error
    );
  }
}

async function openPublicDocument(request, url) {
  const cached = await readCached(url.pathname);

  if (cached && isHTMLResponse(cached)) {
    return cached;
  }

  try {
    const response = await fetch(request);

    if (isHTMLResponse(response)) {
      await writeCached(
        url.pathname,
        response.clone()
      );
    }

    return response;
  } catch {
    return offlineDocumentResponse();
  }
}

async function openStaticAsset(request) {
  const cached = await readCached(request);

  if (cached) {
    return cached;
  }

  /*
   * Network failure is left as a resource failure.
   * Never return an HTML fallback as JavaScript or CSS.
   */
  const response = await fetch(request);

  const contentType =
    response.headers
      .get("content-type")
      ?.toLowerCase() ?? "";

  if (
    isSuccessfulLocalResponse(response) &&
    !contentType.includes("text/html")
  ) {
    await writeCached(
      request,
      response.clone()
    );
  }

  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (isExcludedRequest(request, url)) {
    return;
  }

  if (
    request.mode === "navigate" &&
    isPublicDocumentURL(url)
  ) {
    event.respondWith(
      openPublicDocument(request, url)
    );

    return;
  }

  if (isAllowedAssetURL(url)) {
    event.respondWith(
      openStaticAsset(request)
    );
  }
});

async function readInstallationManifest(cache) {
  const response = await cache.match(MANIFEST_KEY);

  if (!response) return null;

  try {
    const value = await response.json();

    const valid =
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      value.app === "ALIMXL_OFFLINE_SHELL" &&
      value.version === 1 &&
      value.release === APP_RELEASE &&
      Array.isArray(value.directAssets) &&
      value.directAssets.length <= MAX_DIRECT_ASSETS &&
      value.directAssets.every(
        (asset) => {
          if (typeof asset !== "string") {
            return false;
          }

          try {
            const url = new URL(asset);

            return (
              url.origin === self.location.origin &&
              url.pathname.startsWith("/_next/static/") &&
              /\.(?:js|css)$/i.test(url.pathname)
            );
          } catch {
            return false;
          }
        }
      );

    return valid ? value : null;
  } catch {
    return null;
  }
}

async function getOfflineStatus() {
  const cache = await caches.open(CACHE_NAME);

  const documents = [];

  for (const route of PUBLIC_ROUTES) {
    const cached = await cache.match(route);

    documents.push({
      route,
      cached: Boolean(
        cached && isHTMLResponse(cached)
      ),
    });
  }

  const manifest =
    await readInstallationManifest(cache);

  let missingPreparedResources = 0;

  const resourcesToCheck = [
    ...PUBLIC_FILES,
    ...(manifest?.directAssets ?? []),
  ];

  for (const resource of resourcesToCheck) {
    const response = await cache.match(resource);

    if (!response) {
      missingPreparedResources += 1;
    }
  }

  const keys = await cache.keys();

  const cachedStaticAssets = keys.filter(
    (request) => {
      const url = new URL(request.url);

      return url.pathname.startsWith(
        "/_next/static/"
      );
    }
  ).length;

  return {
    type: "ALIMXL_OFFLINE_STATUS",
    release: APP_RELEASE,
    cacheName: CACHE_NAME,

    /*
     * Compatible with the OfflineSetup component.
     */
    documents,
    cachedStaticAssets,

    installationManifestPresent: manifest !== null,
    missingPreparedResources,

    shellResourcesPresent:
      manifest !== null &&
      documents.every((document) => document.cached) &&
      missingPreparedResources === 0,

    /*
     * The presence of shell files does not prove that every
     * lazy-loaded feature or RSC navigation works offline.
     */
    completeOfflineReadinessVerified: false,
  };
}

self.addEventListener("message", (event) => {
  if (
    !event.data ||
    event.data.type !== "ALIMXL_GET_OFFLINE_STATUS" ||
    !event.ports ||
    !event.ports[0]
  ) {
    return;
  }

  const port = event.ports[0];

  event.waitUntil(
    (async () => {
      try {
        const status = await getOfflineStatus();

        port.postMessage(status);
      } catch (error) {
        console.warn(
          "ALIMXL offline status inspection failed:",
          error
        );

        port.postMessage({
          type: "ALIMXL_OFFLINE_STATUS",
          release: APP_RELEASE,
          error:
            "Unable to inspect the offline cache.",
          completeOfflineReadinessVerified: false,
        });
      }
    })()
  );
});