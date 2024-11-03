function buildButton(icon, fallback, onclick, languageContent, languageContentShort, counter) {

    let button = document.createElement("button");
    button.className = "button";
    button.onclick = onclick;

    let buttonIcon = document.createElement("img");
    buttonIcon.className = "icon";
    buttonIcon.src = icon;

    let buttonLabel = document.createElement("p");
    buttonLabel.className = "label";
    if (!counter) {
        buttonLabel.textContent = fallback;
        if (typeof languageContentShort !== "undefined") {
            buttonLabel.dataset.langContent = languageContentShort;
        }
    } else {
        buttonLabel.textContent = languageContent;
    }

    button.appendChild(buttonIcon);
    button.appendChild(buttonLabel);

    if (typeof languageContentShort !== "undefined") {
        let shortLabel = document.createElement("p");
        shortLabel.className = "short-label";
        if (!counter) {
            if (typeof languageContentShort !== "undefined") {
                shortLabel.dataset.langContent = languageContentShort;
            } else {
                if (typeof languageContent !== "undefined") {
                    shortLabel.dataset.langContent = languageContent;
                }
                else {
                    shortLabel.textContent = fallback;
                }
            }
        } else {
            shortLabel.textContent = languageContentShort;
        }

        button.appendChild(shortLabel);
        button.short = shortLabel;
    }

    button.icon = buttonIcon;
    button.label = buttonLabel;

    return button;
}

function buildProfilePic(profilePic, username) {
    let authorDiv = document.createElement("div");
    if (profilePic.type === "default") {
        authorDiv.className = "author-info";

        let authorName = document.createElement("p");
        authorName.textContent = username;
        authorName.style = "margin-left: 10px;";
        authorName.className = "author-name";

        let authorProfilePic = document.createElement("p");
        authorProfilePic.className = "defaultProfilePicture author-profile-pic";
        authorProfilePic.style = `background-color: ${profilePic.content};`;
        authorProfilePic.textContent = username.charAt(0).toUpperCase();

        let authorProfilePicName = document.createElement("span");
        authorProfilePicName.textContent = username;
        authorProfilePicName.className = "author-name-tooltip";
        authorProfilePic.appendChild(authorProfilePicName);

        authorDiv.appendChild(authorName);
        authorDiv.appendChild(authorProfilePic);
    }
    else if (profilePic.type === "custom") {
        authorDiv.className = "author-info";

        let authorName = document.createElement("p");
        authorName.textContent = username;
        authorName.style = "margin-left: 10px;";

        let authorProfilePic = document.createElement("img");
        authorProfilePic.className = "profilePicture";
        authorProfilePic.src = `https://storage.liscitransmitter.live/${profilePic.content}`;
        authorProfilePic.alt = username;
        headerDiv.appendChild(authorProfilePic);

        authorDiv.appendChild(authorName);
        authorDiv.appendChild(authorProfilePic);
    }

    return authorDiv;
}

function buildLikeButton(route, id, liked, likes, loggedIn) {

    let likeIcon;

    let likeLabel = resolveLanguageContent("counter_likes") || "Likes";

    if (loggedIn) {
        likeIcon = liked ? "/icons/like-filled.svg" : "/icons/like-unfilled.svg";
    }
    else {
        likeIcon = "/icons/like-locked.svg";
    }

    let likeButton = buildButton(likeIcon, `${likes} ${likeLabel}`, () => { }, `${likes} ${likeLabel}`, `${likes}`, true);

    if (loggedIn) {
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

function makeDiscoverable() {
    gamesWS = new WebSocket(window.location.origin.replace(/^http/, 'ws') + `/games/discover`);
    gamesWS.onopen = () => {
        console.log('Connected to server');
    }
    gamesWS.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'invite') {
            console.log('Game invite received');
            document.body.appendChild(buildGameRequest(gamesWS, data.game, data.user, data.username));
        }
        else if (data.type === 'uninvite') {
            console.log('Game uninvite received');
            const gameRequests = Array.from(document.getElementsByClassName('game-request'));
            for (let i = 0; i < gameRequests.length; i++) {
                gameRequests[i].remove();
            }
        }
        else if (data.type === 'accept') {
            console.log('Game accept received');
            console.log(data);
            window.location.href = `/games/${data.game}/${data.gameID}`;
        }
        else if (data.type === 'decline') {
            console.log('Game decline received');
            if (typeof inviteDeclined === 'function') {
                inviteDeclined(data.user);
            }
        }
        else if (data.type === 'discover') {
            if (typeof buildDiscoveryList === 'function') {
                buildDiscoveryList(data.users, data.game);
            }
        }
    }
    gamesWS.onclose = () => {
        console.log('Disconnected from server');
    }

    function buildGameRequest(ws, game, user, username) {
        let gameRequest = document.createElement('div');
        gameRequest.className = 'game-request';

        let gameRequestHeader = document.createElement('div');
        gameRequestHeader.className = 'game-request-header';

        let gameRequestTitle = document.createElement('p');
        gameRequestTitle.className = 'game-request-title';
        gameRequestTitle.textContent = 'Spiel Einladung';

        gameRequestHeader.appendChild(gameRequestTitle);

        let gameRequestContent = document.createElement('div');
        gameRequestContent.className = 'game-request-content';

        let gameRequestText = document.createElement('p');
        gameRequestText.className = 'game-request-text';
        gameRequestText.textContent = `${username} hat dich zu einem Spiel ${game} eingeladen.`;

        let gameRequestButtons = document.createElement('div');
        gameRequestButtons.className = 'game-request-buttons';

        let gameRequestAccept = buildButton('/icons/check.svg', 'Accept', () => {
            gameRequest.remove();

            ws.send(JSON.stringify({ type: 'accept', "user": user, "game": game }));

        }, 'game_request_accept');

        let gameRequestDecline = buildButton('/icons/close.svg', 'Decline', () => {
            ws.send(JSON.stringify({ type: 'decline', "user": user }));
            gameRequest.remove();
        }, 'game_request_decline');

        gameRequestButtons.appendChild(gameRequestAccept);
        gameRequestButtons.appendChild(gameRequestDecline);

        gameRequestContent.appendChild(gameRequestText);
        gameRequestContent.appendChild(gameRequestButtons);

        gameRequest.appendChild(gameRequestHeader);
        gameRequest.appendChild(gameRequestContent);

        return gameRequest;
    }

    return gamesWS;
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
    const commentModal = document.getElementById('modal');
    const commentContainer = document.getElementById('modal-content');
    commentModal.style.display = 'none';
}

function openModal(content) {
    const commentModal = document.getElementById('modal');
    const commentContainer = document.getElementById('modal-content');
    if (typeof content === 'string') {
        commentContainer.innerHTML = content;
    }
    commentModal.style.display = 'block';
}

function loadLanguage() {
    const language = (localStorage.getItem('language') || navigator.language || navigator.userLanguage).split('-')[0];
    //TODO: remove true to force reload
    if (localStorage.getItem('language') !== language || localStorage.getItem('languageFile') == null) {
        fetchLanguageFile(language);
    }
    else {
        console.log('Loading language from local storage');
        applyLanguage(JSON.parse(localStorage.getItem('languageFile')));
        fetchLanguageFile(language, true);
    }
}

function fetchLanguageFile(language, redraw = false) {
    console.log('Loading language file for ' + language);
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
    const langContent = Array.from(document.querySelectorAll('[data-lang-content]')).filter(element => !convertedItems.includes(element));
    totalChanges += langContent.length;
    langContent.forEach(element => {
        const key = element.getAttribute('data-lang-content');
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
        element.textContent = json;
        convertedItems.push(element);
    });

    const langContentValue = Array.from(document.querySelectorAll('[data-lang-content-value]')).filter(element => !convertedItems.includes(element));
    totalChanges += langContentValue.length;
    langContentValue.forEach(element => {
        const key = element.getAttribute('data-lang-content-value');
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
        element.value = json;
        convertedItems.push(element);
    });

    const langContentPlaceholder = Array.from(document.querySelectorAll('[data-lang-content-placeholder]')).filter(element => !convertedItems.includes(element));
    totalChanges += langContentPlaceholder.length;
    langContentPlaceholder.forEach(element => {
        const key = element.getAttribute('data-lang-content-placeholder');
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
        element.placeholder = json;
        convertedItems.push(element);
    });

    console.log(`Applied ${totalChanges} language changes`);
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

document.addEventListener('DOMContentLoaded', async () => {
    loadLanguage();

    makeDiscoverable();
    if (isInStandaloneMode()) {
        addPWABar();
    }

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
});

window.addEventListener("focus", () => {
    if (typeof gamesWS !== 'undefined') return;
    gamesWS.connect();
});