const CACHE_NAME = 'commander-toolkit-v1';
const STATIC_CACHE = 'static-v1';

// Fichiers à mettre en cache immédiatement
const PRECACHE_FILES = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Installation - mise en cache des fichiers statiques
self.addEventListener('install', (event) => {
  console.log('[SW] Installation...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Mise en cache des fichiers statiques');
        return cache.addAll(PRECACHE_FILES);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation - nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE)
          .map((name) => {
            console.log('[SW] Suppression ancien cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - stratégie Network First avec fallback cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') return;

  // Ignorer les requêtes vers Supabase et APIs externes (toujours réseau)
  if (url.hostname.includes('supabase') || 
      url.hostname.includes('scryfall') ||
      url.hostname.includes('ocr.space') ||
      url.hostname.includes('edhrec')) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cloner la réponse pour la mettre en cache
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Si réseau échoue, essayer le cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback vers la page principale pour les navigations
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Sync en arrière-plan (pour les actions hors-ligne)
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);
  if (event.tag === 'sync-cards') {
    // Géré par l'application
  }
});

console.log('[SW] Service Worker chargé');
