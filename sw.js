const CACHE_NAME = "myspines-shell-v3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./core.js",
  "./commands.js",
  "./editor.js",
  "./bootstrap.js",
  "./v3/model.js",
  "./v3/ui-shell.js",
  "./v3/ui-structure.js",
  "./v3/events.js",
  "./v2/library.js",
  "./v2/transfer-import.js",
  "./v2/transfer-copy.js",
  "./v3/base.css",
  "./v3/editor.css",
  "./v3/responsive.css",
  "./v3/dark.css",
  "./v2/overlays.css",
  "./v2/library.css",
  "./favicon.svg",
  "./manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html"))),
  );
});
