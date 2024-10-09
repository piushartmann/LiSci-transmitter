self.addEventListener('install', event => {
    console.log('Service Worker installing.');
    // Perform install steps
});

self.addEventListener('activate', async () => {
    console.log('Service Worker activating.');
})

self.addEventListener('push', event => {
    console.log('Push event received:', event);
    let data = {};
    if (event.data) {
        data = event.data.json();
    }

    const title = data.title || 'Default title';
    const options = {
        body: data.body || 'Default body',
        icon: data.icon || '/images/icon.png',
        badge: data.badge || '/images/badge.png'
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', event => {
    console.log('Notification click received.');
    event.notification.close();

    event.waitUntil(
        clients.openWindow('https://liscitransmitter.live')
    );
});