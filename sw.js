// Keeps the app opening with no signal: the page and its scripts come from the network when it answers quickly, otherwise from this cache.
const CACHE = 'gymlog-v4';
const SHELL = ['./', './index.html', './config.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
const put = (req, res) => { if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; };
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  const versioned = (u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/')) || u.hostname === 'fonts.gstatic.com';
  const fontsCss = u.hostname === 'fonts.googleapis.com';
  if (versioned) { e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => put(req, r)))); return; }
  if (u.origin !== location.origin && !fontsCss) return;
  e.respondWith(new Promise(resolve => {
    let done = false;
    const fallback = () => caches.match(req, { ignoreSearch: true }).then(m => m || (req.mode === 'navigate' ? caches.match('./index.html') : null));
    const t = setTimeout(() => fallback().then(m => { if (m && !done) { done = true; resolve(m); } }), 2500);
    fetch(req).then(r => { put(req, r); if (!done) { done = true; clearTimeout(t); resolve(r); } })
      .catch(() => fallback().then(m => { if (!done) { done = true; clearTimeout(t); resolve(m || Response.error()); } }));
  }));
});
