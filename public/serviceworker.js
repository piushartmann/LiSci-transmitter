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

    await Promise.all(allPreloads.map(async url => {
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
        await cache.add(new Request(url, {
            cache: 'reload',
            headers: { 'Cache-Control': 'max-age=' + maxAge }
        }));
    }));

    sitesToPreload.forEach(async url => {

        const response = await cache.match(url);
        if (!response) {
            console.warn('Failed to get depndencies of', url);
            return;
        }
        const text = await response.text();

        const cssLinks = [...text.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/g)].map(match => match[1]);
        const jsScripts = [...text.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/g)].map(match => match[1]);

        const dependencies = cssLinks.concat(jsScripts);

        dependencies.forEach(async depUrl => {
            try {
                const cachedResponse = cacheKeys.find(request => request.url.endsWith(depUrl));
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
                if (depUrl.origin === self.location.origin) {
                    cache.add(new Request(depUrl, {
                        cache: 'reload',
                        headers: { 'Cache-Control': 'max-age=' + maxAge }
                    }));
                }
                else {
                    cache.add(new Request(depUrl, {
                        cache: 'reload'
                    }));
                }
            }
            catch (error) {
                console.warn('Failed to preload:', depUrl, error);
            }
        });
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
                SWreloadContent();
            }
        } catch (error) {
            console.error('Invalid URL:', event.data.url);
        }
    }
});

function SWreloadContent() {
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
        for (let client of windowClients) {
            client.postMessage({ type: 'updateContent' });
        }
    });
}

function SWreloadSite() {
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
        for (let client of windowClients) {
            client.navigate(client.url);
        }
    });
}

self.addEventListener('fetch', function (event) {
    const url = new URL(event.request.url);

    event.respondWith(
        caches.match(url.pathname + url.search).then(function (response) {
            if (response) {
                console.log('Page: ', url.pathname, ' served from cache');
                reloadType = event.request.headers.get('reloadType') || sitesToPreload.includes(url.pathname + url.search) === true ? 'refreshSite' : 'refreshContent';

                if (reloadType === 'refreshSite') {
                    updateCache(url, SWreloadSite);
                }
                else if (reloadType === 'refreshContent') {
                    updateCache(url, SWreloadContent);
                }
                return response;
            }
            else {
                return fetch(event.request);
            }
        })
    );
    return;
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

        if (matchEtag != fetchEtag) {
            console.log('Cache of ', url.pathname + url.search, ' updated');
            if (callback) {
                callback();
            }
        }
    } catch (error) {
        console.error(error, 'on UpdateCache with url:', url);
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
