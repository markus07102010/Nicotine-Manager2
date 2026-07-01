// NicotineManager Service Worker
// Versionsnummer hochzählen, wenn sich index.html / Assets ändern -> erzwingt Update beim nächsten Start.
const APP_VERSION = '2.0.0'; // Supabase-Umstellung: zentrale Datenbank statt nur lokalem Speicher
const CACHE_NAME = 'nicotinemanager-' + APP_VERSION;

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './config.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
];

// Installation: neue Version cachen, aber noch nicht aktivieren (wartet auf Bestätigung der Seite)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Aktivierung: alte Caches (vorherige Versionen) aufräumen
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch-Strategie: Netzwerk zuerst (für aktuelle Daten/Updates), Cache als Fallback (offline).
// WICHTIG: Anfragen an Supabase werden NIE gecacht — die Geschäftsdaten müssen
// immer live sein. Nur die eigenen App-Dateien (HTML/CSS/JS/Icons) profitieren
// vom Offline-Cache.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('.supabase.co')) return; // an Supabase: immer direkt ans Netzwerk, nie cachen
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});

// Erlaubt der Seite, den Service Worker sofort zu aktivieren (nach Update-Bestätigung durch Nutzer)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
