const CACHE_NAME = 'kasir-cache-v5';
const APP_SHELL = [
  './',
  'index.html',
  'manifest.json',
  'icon.svg',
  'libs/react.production.min.js',
  'libs/react-dom.production.min.js',
  'libs/babel.min.js',
  'libs/xlsx.full.min.js'
];

// tiap file di-cache sendiri-sendiri: kalau satu gagal, yang lain tetap tersimpan
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(APP_SHELL.map((url) => cache.add(url).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// halaman utama: internet dulu (supaya selalu versi terbaru), cache kalau offline / sinyal lemot
// file lain (library CDN, ikon): cache dulu
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isPage = req.mode === 'navigate' || (url.origin === self.location.origin && (url.pathname.endsWith('/') || url.pathname.endsWith('.html')));
  const store = (response) => {
    if (response && response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
    }
    return response;
  };
  if (isPage) {
    event.respondWith(
      Promise.race([
        fetch(req, { cache: 'no-cache' }),
        new Promise((_, reject) => setTimeout(reject, 4000)),
      ])
        .then(store)
        .catch(() => caches.match(req).then((cached) => cached || caches.match('index.html')))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then(store))
  );
});
