/**
 * Creates a button element with optional icon, label, and short label.
 *
 * @param {string} icon - The URL of the icon image to be displayed on the button.
 * @param {string} fallback - The fallback text to be displayed if no language content is provided.
 * @param {Function} onclick - The function to be called when the button is clicked.
 * @param {string} [languageContent] - The text content to be displayed on the button, if provided.
 * @param {string} [languageContentShort] - The short text content to be displayed on the button, if provided.
 * @param {boolean} [counter=false] - A flag indicating whether the button is a counter button.
 * @returns {HTMLButtonElement} The created button element.
 */
function buildButton(icon, fallback, onclick, languageContent, languageContentShort, counter = false) {

    let button = document.createElement("button");
    button.className = "button";
    button.type = "button";
    button.onclick = onclick;

    if (icon != "" && icon != null) {
        let buttonIcon = document.createElement("img");
        buttonIcon.className = "icon";
        buttonIcon.src = icon;
        button.appendChild(buttonIcon);
        button.icon = buttonIcon;
    }

    let buttonLabel = document.createElement("p");
    buttonLabel.className = "label";

    if (!counter) {
        buttonLabel.textContent = fallback;
        if (typeof languageContent !== "undefined") {
            buttonLabel.dataset.langContent = languageContent;
        }
    } else {
        buttonLabel.textContent = languageContent;
    }

    button.appendChild(buttonLabel);

    if (typeof languageContentShort !== "undefined") {
        let shortLabel = document.createElement("p");
        shortLabel.className = "short-label";

        if (!counter) {
            shortLabel.dataset.langContent = languageContentShort;
        } else {
            shortLabel.textContent = languageContentShort;
        }

        button.appendChild(shortLabel);
        button.short = shortLabel;
    }
    else {
        button.short = buttonLabel;
        buttonLabel.classList.add("short-label");
    }

    button.label = buttonLabel;

    return button;
}

/**
 * Builds a profile picture element for a user.
 *
 * @param {Object} profilePic - The profile picture information.
 * @param {string} profilePic.type - The type of profile picture ("default" or "custom").
 * @param {string} profilePic.content - The content of the profile picture. For "default", it's a color. For "custom", it's the image path.
 * @param {string} username - The username of the user.
 * @param {boolean} [short=false] - Whether to use the short version (without the username text).
 * @returns {HTMLDivElement} The constructed profile picture element.
 */
function buildProfilePic(profilePic, username, short = false) {
    let authorDiv = document.createElement("div");
    if (profilePic.type === "default") {
        authorDiv.className = "author-info";

        let authorName = document.createElement("p");
        authorName.textContent = username;
        authorName.style = "margin-left: 10px;";
        authorName.className = "author-name";

        let authorProfilePic = document.createElement("p");
        authorProfilePic.className = "profilePicture";
        authorProfilePic.style = `background-color: ${profilePic.content};`;
        authorProfilePic.textContent = username.charAt(0).toUpperCase();

        let authorProfilePicName = document.createElement("span");
        authorProfilePicName.textContent = username;
        authorProfilePicName.className = "tooltip";
        authorProfilePic.appendChild(authorProfilePicName);

        if (!short) authorDiv.appendChild(authorName);
        authorDiv.appendChild(authorProfilePic);
    }
    else if (profilePic.type === "custom") {
        authorDiv.className = "author-info";

        let authorName = document.createElement("p");
        authorName.textContent = username;
        authorName.style = "margin-left: 10px;";
        authorName.className = "author-name";

        let authorProfilePicName = document.createElement("span");
        authorProfilePicName.textContent = username;
        authorProfilePicName.className = "tooltip";

        let authorProfilePicWrapper = document.createElement("div");
        authorProfilePicWrapper.className = "profilePicture";

        let authorProfilePic = document.createElement("img");
        authorProfilePic.className = "profilePicture image";
        authorProfilePic.src = `https://storage.liscitransmitter.live/${profilePic.content}`;
        authorProfilePic.alt = username;

        authorProfilePicWrapper.appendChild(authorProfilePic);
        authorProfilePicWrapper.appendChild(authorProfilePicName);

        if (!short) authorDiv.appendChild(authorName);
        authorDiv.appendChild(authorProfilePicWrapper);
    }

    return authorDiv;
}

/**
 * Builds a like button element with the specified properties and functionality.
 *
 * @param {string} route - The API route to send the like/unlike request.
 * @param {string} id - The identifier of the item to be liked/unliked.
 * @param {boolean} liked - Indicates whether the item is already liked by the user.
 * @param {number} likes - The current number of likes for the item.
 * @param {boolean} loggedIn - Indicates whether the user is logged in.
 * @returns {HTMLElement} The constructed like button element.
 */
function buildLikeButton(route, id, liked, likes) {

    let likeIcon;

    let likeLabel = resolveLanguageContent("interaction likes") || "Likes";

    likeIcon = liked ? "/icons/like-filled.svg" : "/icons/like-unfilled.svg";

    let likeButton = buildButton(likeIcon, `${likes} ${likeLabel}`, () => { }, `${likes} ${likeLabel}`, `${likes}`, true);
    likeButton.classList.add("online-only");

    likeButton.onclick = async () => {
        if (!liked) {
            await fetch(route, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ id: id }),
            });
            likeButton.label.textContent = `${likes + 1} ${likeLabel}`;
            likeButton.short.textContent = likes + 1;
            likes++;
            likeButton.icon.src = "/icons/like-filled.svg";
            liked = true;
        }
        else {
            await fetch(route, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ id: id }),
            });
            likeButton.label.textContent = `${likes - 1} ${likeLabel}`;
            likeButton.short.textContent = likes - 1;
            likes--;
            likeButton.icon.src = "/icons/like-unfilled.svg";
            liked = false;
        }
        if (likeButton.refreshTarget) {
            updateCache(likeButton.refreshTarget, "reloadContent");
        }
    }
    return likeButton;
}

function iosPWASplash(t, e = "white") {
    if ("string" != typeof t || 0 === t.length)
        throw Error("Invalid icon URL provided");
    let i = screen.width
        , a = screen.height
        , h = window.devicePixelRatio || 1
        , n = document.createElement("canvas")
        , l = document.createElement("canvas")
        , r = n.getContext("2d")
        , d = l.getContext("2d")
        , o = new Image;
    o.onerror = function () {
        throw Error("Failed to load icon image")
    }
        ,
        o.src = t,
        o.onload = function () {
            let t = o.width / (3 / h)
                , g = o.height / (3 / h);
            n.width = i * h,
                l.height = n.width,
                n.height = a * h,
                l.width = n.height,
                r.fillStyle = e,
                d.fillStyle = e,
                r.fillRect(0, 0, n.width, n.height),
                d.fillRect(0, 0, l.width, l.height);
            let c = (n.width - t) / 2
                , p = (n.height - g) / 2
                , s = (l.width - t) / 2
                , w = (l.height - g) / 2;
            r.drawImage(o, c, p, t, g),
                d.drawImage(o, s, w, t, g);
            let m = n.toDataURL("image/png")
                , u = l.toDataURL("image/png")
                , f = document.createElement("link");
            f.setAttribute("rel", "apple-touch-startup-image"),
                f.setAttribute("media", "screen and (orientation: portrait)"),
                f.setAttribute("href", m),
                document.head.appendChild(f);
            let A = document.createElement("link");
            A.setAttribute("rel", "apple-touch-startup-image"),
                A.setAttribute("media", "screen and (orientation: landscape)"),
                A.setAttribute("href", u),
                document.head.appendChild(A)
        }
}

let ws;
function makeDiscoverable() {
    ws = new WebSocket(window.location.origin.replace(/^http/, 'ws') + `/websocket`);
    ws.onopen = () => {
        console.log('Connected to server');
    }
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
            case 'invite':
                console.log('Game invite received');
                document.body.appendChild(buildGameRequest(ws, data.game, data.user, data.username));
                loadLanguage();
                break;
            case 'uninvite':
                console.log('Game uninvite received');
                const gameRequests = Array.from(document.getElementsByClassName('game-request'));
                for (let i = 0; i < gameRequests.length; i++) {
                    gameRequests[i].remove();
                }
                break;
            case 'accept':
                console.log('Game accept received');
                window.location.href = `/games/${data.game}/${data.gameID}`;
                break;
            case 'decline':
                console.log('Game decline received');
                if (typeof inviteDeclined === 'function') {
                    inviteDeclined(data.user);
                }
                break;
            case 'discover':
                discoveredUsers = data.users;
                if (typeof buildDiscoveryList === 'function') {
                    if (document.getElementById('modal').style.display === 'block') {
                        buildDiscoveryList(data.users, data.game);
                    }
                }
                break;
            case 'reload':
                window.location.reload();
            case 'reloadContent':
                if (typeof reloadContent === 'function') {
                    reloadContent();
                }
                break;
        }

    }
    ws.onclose = () => {
        console.log('Disconnected from server. Reconnecting in 5 seconds');
        setTimeout(() => {
            makeDiscoverable();
        }, 5000);
    }

    function buildGameRequest(ws, game, user, username) {
        let gameRequest = document.createElement('div');
        gameRequest.className = 'game-request';

        let gameRequestHeader = document.createElement('div');
        gameRequestHeader.className = 'game-request-header';

        let gameRequestTitle = document.createElement('p');
        gameRequestTitle.className = 'game-request-title';
        gameRequestTitle.textContent = 'Spiel Einladung';
        gameRequestTitle.dataset.langContent = 'games request title';

        gameRequestHeader.appendChild(gameRequestTitle);

        let gameRequestContent = document.createElement('div');
        gameRequestContent.className = 'game-request-content';

        let gameRequestText = document.createElement('p');
        gameRequestText.className = 'game-request-text';
        gameRequestText.textContent = `${username} hat dich zu einem Spiel ${game} eingeladen.`;

        gameRequestText.dataset.langContent = 'games request message';
        gameRequestText.dataset.langArguments = JSON.stringify({ "username": username, "game": game });

        let gameRequestButtons = document.createElement('div');
        gameRequestButtons.className = 'game-request-buttons';

        let gameRequestAccept = buildButton('/icons/check.svg', 'Accept', () => {
            gameRequest.remove();

            ws.send(JSON.stringify({ type: 'accept', "user": user, "game": game }));

        }, 'games request accept');

        let gameRequestDecline = buildButton('/icons/close.svg', 'Decline', () => {
            ws.send(JSON.stringify({ type: 'decline', "user": user }));
            gameRequest.remove();
        }, 'games request decline');

        gameRequestButtons.appendChild(gameRequestAccept);
        gameRequestButtons.appendChild(gameRequestDecline);

        gameRequestContent.appendChild(gameRequestText);
        gameRequestContent.appendChild(gameRequestButtons);

        gameRequest.appendChild(gameRequestHeader);
        gameRequest.appendChild(gameRequestContent);

        return gameRequest;
    }

    return ws;
}

function addPWABar() {
    const pwaBarHeight = pwaBar.offsetHeight;
    document.querySelectorAll('*').forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        if (computedStyle.position === 'absolute') {
            const currentTop = parseInt(computedStyle.top, 10) || 0;
            element.style.top = `${currentTop + pwaBarHeight}px`;
        }
    });
}

function hideModal() {
    const modal = document.getElementById('modal');
    modal.style.display = 'none';
}

function openModal(content, id = "modal") {
    if (content === "" || !content) content = document.getElementById(id);
    const modal = document.getElementById('modal');
    const modalContent = document.querySelector('#modal .modal-content');
    if (typeof content === 'object') content = content.innerHTML;
    modalContent.innerHTML = content;
    modal.style.display = 'block';
    return modal;
}
/**
 * Call this whenever you add some html with a language key to the DOM.
 * @param {boolean} update - Whether to update the language file if it is already loaded. Should almost always be false.
 */
function loadLanguage(update = false) {
    const language = (localStorage.getItem('language') || navigator.language || navigator.userLanguage).split('-')[0];
    if (localStorage.getItem('language') !== language || localStorage.getItem('languageFile') == null) {
        fetchLanguageFile(language);
    }
    else {
        //console.log('Loading language from local storage');
        applyLanguage(JSON.parse(localStorage.getItem('languageFile')));
        if (!update) {
            fetchLanguageFile(language);
        }
    }
}

function fetchLanguageFile(language, redraw = false) {
    //console.log('Loading language file for ' + language);
    const languageFile = `/languages/${language}.json`;
    fetch(languageFile)
        .then(response => response.json())
        .then(data => {
            if (redraw && (localStorage.getItem('languageFile') != JSON.stringify(data))) {
                console.log('Language file changed. Redrawing');
                applyLanguage(data, true);
                localStorage.setItem('languageFile', JSON.stringify(data));
                return;
            }
            else if (!redraw) {
                console.log('Applying language');
                applyLanguage(data);
            }

            localStorage.setItem('language', language);

            if (localStorage.getItem('languageFile') === null || localStorage.getItem('languageFile') !== data) {
                localStorage.setItem('languageFile', JSON.stringify(data));
                applyLanguage(data, true);
            }

            if (language === 'elv') {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = '/css/languages/elvish.css';
                document.head.appendChild(link);
            } else if (language === 'dwa') {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = '/css/languages/dwarvish.css';
                document.head.appendChild(link);
            }
        })
        .catch(error => {
            console.log('Could not load requested language file ' + languageFile);
            console.error(error);
            console.log("Loading default language file");
            if (language !== 'de') {
                fetchLanguageFile('de');
            }
            else {
                console.error('Could not load default language file');
            }
        });
}

let convertedItems = [];
function applyLanguage(languageFile, redraw = false) {
    if (redraw) {
        convertedItems = [];
    }
    let totalChanges = 0;

    function applyLanguageToString(query, input) {
        const elements = Array.from(document.querySelectorAll("[" + query + "]")).filter(element => !convertedItems.includes(element));
        totalChanges += elements.length;
        elements.forEach(element => {
            const key = element.getAttribute(query);
            if (key === "none") return;
            if (key === "") return;
            const dirs = key.split(' ');
            let json = languageFile
            try {
                dirs.forEach(dir => {
                    json = json[dir];
                });

                const arguments = element.getAttribute(`data-lang-arguments`);
                if (arguments) {
                    try {
                        const args = JSON.parse(arguments);
                        Object.keys(args).forEach(arg => {
                            json = json.replace(`{${arg}}`, args[arg]);
                        });
                    } catch (e) {
                        console.warn(`Could not parse language arguments for ${key} \n ${e}`);
                    }
                }

                if (json) {
                    element[input] = json;
                } else {
                    console.warn(`Could not find language content for: "${key}"`);
                }
            }
            catch (e) {
                console.warn(`Could not find language content for: "${key}"`);
            }

            convertedItems.push(element);
        });

        //console.log(`Applied ${totalChanges} language changes`);
    }

    applyLanguageToString("data-lang-content", "textContent");
    applyLanguageToString("data-lang-content-value", "value");
    applyLanguageToString("data-lang-content-placeholder", "placeholder");
}

function resolveLanguageContent(key) {
    let languageFile = JSON.parse(localStorage.getItem('languageFile'));
    if (!languageFile) {
        console.warn('No language file found');
        return;
    }

    const dirs = key.split(' ');
    let json = languageFile
    try {
        dirs.forEach(dir => {
            json = json[dir];
        });
    }
    catch (e) {
        console.warn(`Could not find language content for ${key}`);
    }
    return json;
}

const isInStandaloneMode = () =>
    (window.matchMedia('(display-mode: standalone)').matches) || (window.navigator.standalone) || document.referrer.includes('android-app://');

function setupModal() {
    var modal = document.getElementById('modal');

    if (modal) {

        window.onclick = function (event) {
            if (event.target == modal) {
                hideModal();
            }
        }

        window.ontouchstart = function (event) {
            if (event.target == modal) {
                hideModal();
            }
        }

        document.getElementById("modalClose").addEventListener("click", () => {
            hideModal();
        });
    }
}

function utf8ToBase64(str) {
    const utf8Bytes = new TextEncoder().encode(str);
    let binaryString = '';
    for (let i = 0; i < utf8Bytes.length; i++) {
        binaryString += String.fromCharCode(utf8Bytes[i]);
    }
    return btoa(binaryString);
}

function registerServiceWorker() {
    if (loggedIn === true) {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                if (registrations.length === 0) {
                    navigator.serviceWorker.register('/serviceworker.js')
                        .then(() => {
                            console.log('Service Worker registered');
                        })
                        .catch(error => {
                            console.error('Service Worker registration failed:', error);
                        });
                } else {
                    registrations.forEach(registration => {
                        registration.update();
                        registration.onupdatefound = () => {
                            console.log('Service Worker updating');
                            location.reload();
                            return;
                        };
                        if (loggedIn === true) {
                            registration.active.postMessage({ type: 'loaded' });
                        }
                    });
                }
            }).catch(error => {
                console.error('Error checking Service Worker registrations:', error);
            });

            navigator.serviceWorker.addEventListener('message', async (event) => {
                console.log('Service Worker message received:', event.data);
                if (event.data.type === 'updateContent') {
                    console.log('Service Worker updating content');
                    if (typeof reloadContent === 'function') {
                        reloadContent();
                    }
                    else {
                        console.warn('No content reload function found');
                        window.location.reload();
                    }
                }
            });
        }
        else {
            console.warn('Service Worker not supported');
        }
    }
}

function updateCache(url, callbackType) {
    const serviceWorker = navigator.serviceWorker.controller;
    if (serviceWorker) {
        serviceWorker.postMessage({ type: 'updateCache', url: url, callbackType: callbackType });
    }
}

function checkVersion() {
    if (typeof version !== 'undefined' && localStorage.getItem('version') !== version.toString()) {
        localStorage.setItem('version', version.toString());
        cacheBust();
    }
}

function checkOnline() {
    //dont go offline when testing on localhost
    if (window.location.hostname == "localhost") {
        return;
    }

    if (navigator.onLine) {
        document.body.classList.remove('offline');
    } else {
        document.body.classList.add('offline');
    }

    window.addEventListener('online', () => {
        document.body.classList.remove('offline');
        if (typeof reloadContent === 'function') {
            reloadContent();
        }
    });

    window.addEventListener('offline', () => {
        document.body.classList.add('offline');
    });
}

console.time('Base JS load time');
let envVariables;
document.addEventListener('DOMContentLoaded', async () => {
    envVariables = Object.fromEntries(performance.getEntriesByType("navigation")?.[0]?.serverTiming?.map?.(({name, description}) => ([name, description])) ?? [])
    checkOnline();
    checkVersion();
    loadLanguage();
    if (isInStandaloneMode()) {
        addPWABar();
    }

    if (loggedIn) makeDiscoverable();
    registerServiceWorker();

    setupModal();

    //iosPWASplash('/images/splashScreen.png', '#ffffff');
    console.timeEnd('Base JS load time');
});

window.addEventListener("focus", () => {
    if (typeof ws !== 'undefined' && ws.readyState === WebSocket.CLOSED) {
        if (loggedIn) makeDiscoverable();
    }
});

function toggleVisibility(id, setVis = null) {
    const element = document.getElementById(id);
    if (setVis === null) {
        element.style.display = element.style.display === 'none' ? element.style.display = '' : element.style.display = 'none'
    } else {
        element.style.display = setVis ? element.style.display = '' : element.style.display = 'none'
    }
}