const CACHE_NAME = "myspines-shell-v4-refined";
const APP_SHELL = [
  "./",
  "./index.html",
  "./core.js",
  "./commands.js",
  "./editor.js",
  "./bootstrap.js",
  "./v4/model.js",
  "./v4/model-refinements.js",
  "./v4/ui-shell.js",
  "./v4/ui-structure.js",
  "./v4/refinements.js",
  "./v4/events.js",
  "./v2/library.js",
  "./v2/transfer-import.js",
  "./v2/transfer-copy.js",
  "./v4/base.css",
  "./v4/editor.css",
  "./v2/overlays.css",
  "./v2/library.css",
  "./v4/responsive.css",
  "./v4/density.css",
  "./v4/dark.css",
  "./v4/refinements.css",
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
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((cached) => cached || caches.match("./index.html")),
      ),
  );
});
