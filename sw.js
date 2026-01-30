const CACHE_NAME = 'mn90-planner-v4';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './dataManager.js',
    './data/mn90_stops.csv',
    './data/mn90-n2.csv',
    './data/mn90-majoration.csv',
    './manifest.json',
    './assets/favicon.png',
    './assets/background.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
