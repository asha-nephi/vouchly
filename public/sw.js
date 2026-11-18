// Vouchly's small service worker. It only does one thing: when a page can't load
// because there's no connection, it shows a friendly offline page instead of the browser's error.
// Nothing else is stored, so people never see old prices or orders.
const CACHE = "vouchly-offline-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(new Request(OFFLINE, { cache: "reload" }))));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Remove offline pages from older versions.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Only whole-page loads. Pictures, data and forms go straight to the network as normal.
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(async () => {
      const page = await caches.match(OFFLINE);
      return page ?? new Response("You're offline. Check your connection and try again.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
    }),
  );
});
