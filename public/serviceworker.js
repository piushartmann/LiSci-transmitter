const filesToCache = [
    "/noInternet",
    "/noInternet/favicon.jpg",
    "/noInternet/logo.png",
    "/noInternet/style.css"
];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open('offline').then(function (cache) {
            filesToCache.forEach(file => {
                cache.add(new Request(file, {
                    cache: 'reload',
                }));
            })
        })
    );
});

self.addEventListener('activate', function (event) {
    console.log('SW activate:', event);
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