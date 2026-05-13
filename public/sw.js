const APP_SHELL_CACHE = "bead-pattern-app-shell-v1";
const RUNTIME_CACHE = "bead-pattern-runtime-v1";
const CURRENT_CACHES = new Set([APP_SHELL_CACHE, RUNTIME_CACHE]);
const APP_SHELL_URLS = ["/", "/favicon.ico", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    cacheAppShell().then(() => {
      // Activate this small app-shell worker promptly so a refreshed tab can use the cached shell.
      return self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => Promise.all(cacheNames.filter((name) => !CURRENT_CACHES.has(name)).map((name) => caches.delete(name))))
      .then(() => {
        // Claim open tabs so the offline fallback is available after the first successful registration.
        return self.clients.claim();
      }),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.protocol === "blob:" || requestUrl.protocol === "data:") {
    return;
  }

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (isCacheableStaticAsset(requestUrl)) {
    event.respondWith(handleStaticAsset(request));
  }
});

async function cacheAppShell() {
  const cache = await caches.open(APP_SHELL_CACHE);
  await Promise.all(APP_SHELL_URLS.map((url) => cacheUrl(cache, url)));

  const shellResponse = await cache.match("/");
  if (!shellResponse) {
    return;
  }

  const shellHtml = await shellResponse.clone().text();
  const assetUrls = extractNextStaticUrls(shellHtml);
  await Promise.all(assetUrls.map((url) => cacheUrl(cache, url)));
}

async function cacheUrl(cache, url) {
  try {
    const response = await fetch(url, { cache: "reload" });
    if (isSuccessfulBasicResponse(response)) {
      await cache.put(url, response);
    }
  } catch {
    // A failed warm-cache request should never block the online app.
  }
}

async function handleNavigation(request) {
  const cache = await caches.open(APP_SHELL_CACHE);

  try {
    const response = await fetch(request);
    if (isSuccessfulBasicResponse(response)) {
      await cache.put("/", response.clone());
    }
    return response;
  } catch {
    const cachedShell = await cache.match("/");
    if (cachedShell) {
      return cachedShell;
    }
    return new Response("Offline", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      status: 503,
      statusText: "Offline",
    });
  }
}

async function handleStaticAsset(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);
  if (isSuccessfulBasicResponse(response)) {
    await cache.put(request, response.clone());
  }
  return response;
}

function isCacheableStaticAsset(url) {
  if (url.pathname.startsWith("/_next/static/")) {
    return true;
  }

  return url.pathname === "/favicon.ico" || url.pathname === "/manifest.webmanifest";
}

function isSuccessfulBasicResponse(response) {
  return response.ok && response.type === "basic";
}

function extractNextStaticUrls(html) {
  const urls = new Set();
  const matcher = /["'](\/_next\/static\/[^"']+)["']/g;
  let match = matcher.exec(html);

  while (match) {
    urls.add(match[1].replace(/&amp;/g, "&"));
    match = matcher.exec(html);
  }

  return [...urls];
}
