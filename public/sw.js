// Service worker: keeps the whole app (including the Astrolog engine and ephemeris
// files) on the device so charts can be cast offline.
// Bump VERSION whenever any file in public/ changes, so devices pick up the update.
const VERSION = 'astro-com-v6';

const SHELL = [
  './', 'index.html', 'style.css', 'app.js', 'engine.js', 'atlas.js', 'chartdata.js', 'wheel.js', 'glyphs.js',
  'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png',
];
const ENGINE = [
  'astrolog.js', 'astrolog.wasm',
  'data/astrolog.as', 'data/atlas.as', 'data/timezone.as', 'data/sefstars.txt', 'data/seorbel.txt',
  'data/astexo.csv', 'data/ephem.txt',
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    const ephem = (await (await fetch('data/ephem.txt', { cache: 'no-cache' })).text())
      .split(/\r?\n/).filter(Boolean).map(f => 'data/' + f);
    await cache.addAll([...SHELL, ...ENGINE, ...ephem].map(u => new Request(u, { cache: 'no-cache' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== VERSION) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const url = new URL(req.url);
  const isEngine = url.pathname.endsWith('.wasm') || url.pathname.endsWith('/astrolog.js') || url.pathname.includes('/data/');

  if (isEngine) {
    // Large, rarely changing files: serve from the device first.
    event.respondWith((async () => {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) (await caches.open(VERSION)).put(req, res.clone());
      return res;
    })());
    return;
  }

  // App shell: try the network for the freshest version, fall back to the cached copy offline.
  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok) (await caches.open(VERSION)).put(req, res.clone());
      return res;
    } catch {
      const hit = await caches.match(req, { ignoreSearch: true }) ||
        (req.mode === 'navigate' ? await caches.match('index.html') : null);
      if (hit) return hit;
      throw new Error('offline');
    }
  })());
});
