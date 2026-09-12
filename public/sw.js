const CACHE_NAME = 'pharma-pro-shell-v2';
const CORE = ['/', '/index.html', '/manifest.webmanifest', '/pwa-192x192.png', '/pwa-512x512.png'];

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(CORE);
  try {
    const res = await fetch('/index.html', { cache: 'no-store' });
    const html = await res.text();
    const urls = new Set();
    for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
      const value = match[1];
      if (value.startsWith('/') && !value.startsWith('//')) urls.add(value);
    }
    await Promise.all([...urls].map(async (url) => {
      try { const r = await fetch(url); if (r.ok) await cache.put(url, r.clone()); } catch {}
    }));
  } catch {}
}

self.addEventListener('install', event => {
  event.waitUntil(cacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const isBuildAsset = url.pathname.startsWith('/assets/');

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put('/index.html', fresh.clone());
        return fresh;
      } catch {
        return (await caches.match('/index.html')) || Response.error();
      }
    })());
    return;
  }

  if (isBuildAsset) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        if (fresh.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch {
        return (await caches.match(req)) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      if (fresh.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch {
      return cached || Response.error();
    }
  })());
});
