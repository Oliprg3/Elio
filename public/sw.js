/**
 * Self-destroying service worker.
 *
 * The previous vite-plugin-pwa SW never worked (build failed), but any old
 * registration must not pin stale HTML. This replaces /sw.js, unregisters
 * itself, wipes caches and reloads open tabs — then it's gone.
 */
self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    (async function () {
      await self.registration.unregister();
      if (self.caches) {
        var keys = await self.caches.keys();
        await Promise.all(
          keys.map(function (key) {
            return self.caches.delete(key);
          })
        );
      }
      var clientsList = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      clientsList.forEach(function (client) {
        if ('navigate' in client) client.navigate(client.url);
      });
    })()
  );
});
