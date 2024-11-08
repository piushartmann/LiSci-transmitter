const filesToCache = [
    "/noInternet",
    "/noInternet/favicon.jpg",
    "/noInternet/logo.png",
    "/noInternet/style.css"
];

const sitesToPreload = [
    "/",
    "/citations",
    "/games",
    "/about",
    "/settings",
    "/create"
];

const maxAge = 3600;

async function preloadSites() {
    const cache = await caches.open('preload');
    const cacheKeys = await cache.keys();
    const now = Date.now();

    sitesToPreload.forEach(async site => {
        const cachedResponse = cacheKeys.find(request => request.url.endsWith(site));
        if (cachedResponse) {
            const response = await cache.match(cachedResponse);
            const dateHeader = response.headers.get('date');
            if (dateHeader) {
                const age = (now - new Date(dateHeader).getTime()) / 1000;
                if (age < maxAge) {
                    return;
                }
            }
        }
        cache.add(new Request(site, {
            cache: 'reload',
            headers: { 'Cache-Control': 'max-age=' + maxAge }
        }));
    });
}

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open('offline').then(function (cache) {
            filesToCache.forEach(file => {
                cache.add(new Request(file, {
                    cache: 'reload',
                }));
            })
        }),
        preloadSites()
    );
    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        self.clients.claim()
    )
    console.log('SW activate:', event);
});

self.addEventListener('message', function (event) {
    if (event.data.type === 'loaded') {
        preloadSites();
    }
});

self.addEventListener('fetch', function (event) {
    const url = new URL(event.request.url);

    if (url.pathname.startsWith('/noInternet')) {
        event.respondWith(
            caches.match(event.request.url).then(function (response) {
                console.log(response);
                if (response) {
                    console.log('Page: ', url.pathname, ' served from cache');
                    return new Response(response.body, { headers: response.headers, status: response.status, statusText: response.statusText });
                };

            })
        );
        return;
    }

    if (sitesToPreload.includes(url.pathname)) {

    }
});


self.addEventListener('push', event => {
    console.log('Push event received:', event);
    let data = {};
    if (event.data) {
        data = event.data.json();
    }

    const title = data.title;
    const options = {
        body: data.body,
    };
    if (data.badge) {
        if (data.badge < 0) {
            navigator.clearAppBadge();
        }
        else {
            navigator.setAppBadge(data.badge);
        }
    }

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