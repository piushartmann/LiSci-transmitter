const sitesToPreload = [
    "/",
    "/citations",
    "/games",
    "/about",
    "/settings",
    "/create"
];

const requestsToCache = [
    "/internal/getPosts?page=1&filter=all",
    "/internal/getPosts?page=1&filter=news",
    "/internal/getCitations?page=1",
    "/internal/getPreviousAuthors"
];

const maxAge = 3600;

async function preloadSites() {
    const cache = await caches.open('preload');
    const cacheKeys = await cache.keys();
    const now = Date.now();

    const allPreloads = sitesToPreload.concat(requestsToCache);

    allPreloads.forEach(async url => {
        const cachedResponse = cacheKeys.find(request => request.url.endsWith(url));
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
        cache.add(new Request(url, {
            cache: 'reload',
            headers: { 'Cache-Control': 'max-age=' + maxAge }
        }));
    });
}

self.addEventListener('install', function (event) {
    event.waitUntil(
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

self.addEventListener('message', async function (event) {
    if (event.data.type === 'loaded') {
        preloadSites();
    }
    else if (event.data.type === 'updateCache') {
        try {
            const url = new URL(event.data.url, self.location.origin);
            await updateCache(url);
            if (event.data.callbackType === 'reloadContent') {
                reloadContent();
            }
        } catch (error) {
            console.error('Invalid URL:', event.data.url);
        }
    }
});

function reloadContent() {
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
        for (let client of windowClients) {
            client.postMessage({ type: 'updateContent' });
        }
    });
}

function reloadSite(){
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
        for (let client of windowClients) {
            client.navigate(client.url);
        }
    });
}

self.addEventListener('fetch', function (event) {
    const url = new URL(event.request.url);

    let cacheResponse;
    if (sitesToPreload.includes(url.pathname)) {
        event.respondWith(
            caches.match(event.request.url).then(function (response) {
                console.log(response);
                if (response) {
                    console.log('Page: ', url.pathname, ' served from cache');
                    cacheResponse = new Response(response.body, { headers: response.headers, status: response.status, statusText: response.statusText });
                    updateCache(url, reloadSite);
                }
                else {
                    cacheResponse = fetch(event.request);
                }

                return cacheResponse;
            })
        );
        return;
    }

    if (requestsToCache.includes(url.pathname+url.search)) {
        event.respondWith(
            caches.open('preload').then(function (cache) {
                return cache.match(url.pathname+url.search).then(function (cacheResponse) {
                    if (cacheResponse) {
                        console.log('Request: ',url.pathname+url.search, ' served from cache');
                        updateCache(url, reloadContent);
                        return cacheResponse;
                    }

                    fetch(event.request).then(function (fetchResponse) {
                        cache.put(url.pathname+url.search, fetchResponse.clone());
                        return fetchResponse;
                    });
                });
            })
        );
    }
});

async function updateCache(url, callback) {
    try {
        const fetchRequest = fetch(url)
        const cache = await caches.open('preload');
        const match = await cache.match(url);
        const fetchResponse = await fetchRequest;

        const matchEtag = match ? match.headers.get('etag') : null;
        const fetchEtag = fetchResponse.headers.get('etag');
        await cache.put(url, fetchResponse.clone());

        if (matchEtag !== fetchEtag) {
            console.log('Cache of ', url.pathname + url.search, ' updated');
            if (callback) {
                callback();
            }
        }
    } catch (error) {
        console.error('Failed to update cache:', error);
    }
}


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