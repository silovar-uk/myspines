const CACHE_NAME = "myspines-shell-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./core.js",
  "./commands.js",
  "./editor.js",
  "./bootstrap.js",
  "./v2/model.js",
  "./v2/ui-shell.js",
  "./v2/ui-structure.js",
  "./v2/library.js",
  "./v2/transfer-import.js",
  "./v2/transfer-copy.js",
  "./v2/events.js",
  "./v2/base.css",
  "./v2/editor.css",
  "./v2/overlays.css",
  "./v2/library.css",
  "./v2/responsive.css",
  "./v2/dark.css",
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

  // Why not cache-first: 執筆中の原稿はIndexedDBにあり、アプリシェルだけは
  // オンライン時に最新版へ追従した方が、古いUIを長く握り続けない。
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
