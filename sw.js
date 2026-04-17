self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));

    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
        client.navigate('https://planif.plongee.app/');
    }

    await self.registration.unregister();
});
