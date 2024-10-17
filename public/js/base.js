function buildButton(icon, label, onclick, short) {
    let button = document.createElement("button");
    button.className = "button";
    button.onclick = onclick;

    let buttonIcon = document.createElement("img");
    buttonIcon.className = "icon";
    buttonIcon.src = icon;

    let buttonLabel = document.createElement("p");
    buttonLabel.className = "label";
    buttonLabel.textContent = label;

    button.appendChild(buttonIcon);
    button.appendChild(buttonLabel);
    
    if (typeof short !== "undefined") {
        let shortLabel = document.createElement("p");
        shortLabel.className = "short-label";
        shortLabel.textContent = short;
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

    if (loggedIn) {
        likeIcon = liked ? "/icons/like-filled.svg" : "/icons/like-unfilled.svg";
    }
    else {
        likeIcon = "/icons/like-locked.svg";
    }

    let likeButton = buildButton(likeIcon, `${likes} Likes`, () => { }, likes);

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
                likeButton.label.textContent = `${likes + 1} Likes`;
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
                likeButton.label.textContent = `${likes - 1} Likes`;
                likeButton.short.textContent = likes - 1;
                likes--;
                likeButton.icon.src = "/icons/like-unfilled.svg";
                liked = false;
            }
        }
    }
    return likeButton;
}

function iosPWASplash(t, e="white") {
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
    o.onerror = function() {
        throw Error("Failed to load icon image")
    }
    ,
    o.src = t,
    o.onload = function() {
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
