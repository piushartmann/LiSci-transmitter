function buildButton(icon, label, onclick) {
    let button = document.createElement("button");
    button.className = "button";
    button.onclick = onclick;

    let buttonIcon = document.createElement("img");
    buttonIcon.className = "icon";
    buttonIcon.src = icon;

    let buttonLabel = document.createElement("p");
    buttonLabel.className = "button-label";
    buttonLabel.textContent = label;

    button.appendChild(buttonIcon);
    button.appendChild(buttonLabel);

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

    let likeButton = buildButton(likeIcon, `${likes} Likes`, () => { });

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
                likes--;
                likeButton.icon.src = "/icons/like-unfilled.svg";
                liked = false;
            }
        }
    }
    return likeButton;
}