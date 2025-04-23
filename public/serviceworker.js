const sitesToPreload = [
    "/",
    "/citations",
    "/games",
    "/settings",
    "/homework",
    "/create"
];

const requestsToCache = [
    "/internal/getPosts?p=1",
    "/internal/getPosts?p=1&f=eyJ0eXBlIjoibmV3cyJ9",
    "/citations/internal/getCitations?page=1&f=eyJ0ZXh0IjoiIiwiZnJvbURhdGUiOiIiLCJ0b0RhdGUiOiIifQ==&s=eyJ0aW1lIjoiZGVzYyJ9",
    "/citations/internal/getPreviousAuthors"
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
        try {
            await cache.add(new Request(url, {
                cache: 'reload',
                headers: { 'Cache-Control': 'max-age=' + maxAge }
            }));
        } catch (error) {
            console.warn('Failed to add to cache for url:', url, error);
        }
    }));

    sitesToPreload.forEach(async url => {

        const response = await cache.match(url);
        if (!response) {
            console.warn('Failed to get dependencies of', url);
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
            await updateCache(url, event.data.callbackType === 'reloadSite' ? SWreloadSite : SWreloadContent);
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

function SWCachesMatched(url) {
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
        for (let client of windowClients) {
            client.postMessage({ type: 'cachesMatched', url: url.pathname });
        }
    });
}

self.addEventListener('fetch', function (event) {
    const url = new URL(event.request.url);

    event.respondWith(
        caches.match(url.pathname + url.search).then(async function (response) {
            if (response) {
                response = new Response(response.body, response);
                console.log('Page: ', url.pathname, ' served from cache');
                reloadType = event.request.headers.get('reloadType') || sitesToPreload.includes(url.pathname + url.search) === true ? 'refreshSite' : 'refreshContent';

                if (reloadType === 'refreshSite') {
                    if (event.request.headers.get('cache-refresh') === 'true') {
                        return response;
                    }
                    updateCache(url, SWreloadSite);
                }
                else if (reloadType === 'refreshContent') {
                    if (event.request.headers.get('cache-refresh') === 'true') {
                        return response;
                    }
                    updateCache(url, SWreloadContent);
                }
                return response;
            }
            else {
                console.log('Page: ', event.request.url, ' not in cache, fetching from network');
                return fetch(event.request);
            }
        })
    );
    return;
});

async function updateCache(url, callback) {
    try {
        console.log('Updating cache of:', url.pathname + url.search);
        const fetchRequest = fetch(url);
        const cache = await caches.open('preload');
        const cacheMatch = await cache.match(url);
        const fetchResponse = await fetchRequest;

        await cache.put(url, fetchResponse.clone());

        const cacheMatchText = await cacheMatch.text();
        const fetchResponseText = await fetchResponse.clone().text();
        if (cacheMatch) {
            if (cacheMatchText === fetchResponseText) {
                // console.log('Cache and fetch response are identical for:', url.pathname + url.search);
                SWCachesMatched(url);
                return;
            }
        }

        console.log('Cache of ', url.pathname + url.search, ' updated');
        if (typeof callback === 'function') {
            console.log('Reloading Content because of: ', url.pathname + url.search);
            callback();
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
