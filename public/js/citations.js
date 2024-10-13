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


document.addEventListener("DOMContentLoaded", async function () {
    const previousAuthors = await loadPreviousAuthors();
    const author = document.getElementById("author");
    autocomplete(author, previousAuthors);
});

window.onload = function () {

    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page') || 1;

    loadCitations(page);
}

function loadCitations(page) {
    fetch(`internal/getCitations?page=${page}`)
        .then(response => response.json())
        .then(data => {
            data.forEach(citation => {
                buildCitation(citation);
            });
        });
}

async function loadPreviousAuthors() {
    const previousAuthors = await fetch('internal/getPreviousAuthors')
    return await previousAuthors.json();
}

function buildCitation(citation) {
    citationBox = document.getElementById("citationBox");
    let citationContainer = document.createElement("div");
    citationContainer.className = "citation";
    citationContainer.setAttribute("data-id", citation._id);

    let sectionDiv = document.createElement("div");
    sectionDiv.className = "content";
    sectionDiv.innerHTML = `<p>"${citation.content}"</p>`;
    citationContainer.appendChild(sectionDiv);

    let authorDiv = document.createElement("div");
    authorDiv.className = "author";
    authorDiv.innerHTML = `<p>-${citation.author}</p>`;
    citationContainer.appendChild(authorDiv);

    let userDiv = document.createElement("div");
    userDiv.className = "username";
    citationContainer.appendChild(userDiv);

    const profilePic = citation.userID.profilePic
    if (profilePic.type === "default") {
        let authorDiv = document.createElement("div");
        authorDiv.className = "author-info";

        let authorName = document.createElement("p");
        authorName.textContent = citation.userID.username;
        authorName.style = "margin-left: 10px;";
        authorName.className = "author-name";

        let authorProfilePic = document.createElement("p");
        authorProfilePic.className = "defaultProfilePicture author-profile-pic";
        authorProfilePic.style = `background-color: ${profilePic.content};`;
        authorProfilePic.textContent = citation.userID.username.charAt(0).toUpperCase();

        let authorProfilePicName = document.createElement("span");
        authorProfilePicName.textContent = citation.userID.username;
        authorProfilePicName.className = "author-name-tooltip";
        authorProfilePic.appendChild(authorProfilePicName);

        authorDiv.appendChild(authorName);
        authorDiv.appendChild(authorProfilePic);

        userDiv.appendChild(authorDiv);
    }
    else if (profilePic.type === "custom") {
        let authorDiv = document.createElement("div");
        authorDiv.className = "author-info";

        let authorName = document.createElement("p");
        authorName.textContent = citation.userID.username;
        authorName.style = "margin-left: 10px;";

        let authorProfilePic = document.createElement("img");
        authorProfilePic.className = "profilePicture";
        authorProfilePic.src = `https://storage.liscitransmitter.live/${profilePic.content}`;
        authorProfilePic.alt = citation.userID.username;
        headerDiv.appendChild(authorProfilePic);

        authorDiv.appendChild(authorName);
        authorDiv.appendChild(authorProfilePic);

        userDiv.appendChild(authorDiv);
    }

    let buttonRow = document.createElement("div");
    buttonRow.className = "button-row";
    citationContainer.appendChild(buttonRow);

    let interactionButtons = document.createElement("div");
    interactionButtons.className = "interaction-buttons";
    buttonRow.appendChild(interactionButtons);

    let editButtons = document.createElement("div");
    editButtons.className = "edit-buttons";
    buttonRow.appendChild(editButtons);

    let liked = citation.liked;
    let likes = citation.likes.length;

    let likeButton = buildButton(liked ? "/icons/like-unfilled.svg" : "/icons/like-unfilled.svg", "Like", () => {});

    likeButton.onclick = async () => {
        if (!liked) {
            await fetch("/internal/likeCitation", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ citationID: citation._id }),
            });
            likeButton.label.textContent = `${likes + 1} Likes`;
            likes++;
            likeButton.icon.src = "/icons/like-filled.svg";
            liked = true;
        }
        else {
            await fetch("/internal/likeCitation", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ citationID: citation._id }),
            });
            likeButton.label.textContent = `${likes - 1} Likes`;
            likes--;
            likeButton.icon.src = "/icons/like-unfilled.svg";
            liked = false;
        }
    }

    interactionButtons.appendChild(likeButton);

    if (citation.canEdit) {

        let deleteButton = buildButton("/icons/delete.svg", "Delete", () => deleteCitation(citation._id));

        let editButton = buildButton("/icons/edit.svg", "Edit", () => editCitation(citation._id));

        editButtons.appendChild(deleteButton);
        editButtons.appendChild(editButton);
    }

    citationBox.appendChild(citationContainer);
}

function likeCitation(id) {
    
}

function submitCitation() {
    author = document.getElementById("author").value;
    content = document.getElementById("content").value;

    function checkChar(char) {
        bannedChars = ['"', '„', '“']
        return bannedChars.includes(char);
    }

    if (checkChar(content.charAt(0))) {
        content = content.substring(1);
    }
    if (checkChar(content.charAt(content.length - 1))) {
        content = content.substring(0, content.length - 1);
    }

    console.log(content);

    fetch('internal/createCitation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            author: author,
            content: content
        }),
    })
        .then(response => {
            if (response.status === 200) {
                window.location.href = "/citations";
            }
        });
}

function deleteCitation(id) {
    fetch('internal/deleteCitation', {
        method: 'POST',
        body: new URLSearchParams({ citationID: id }),
        enctype: 'x-www-form-urlencoded',
    })
        .then(response => {
            if (response.status === 200) {
                window.location.href = "/citations";
            }
        });
}

function editCitation(id) {
    let citationContainer = document.querySelector(`.citation[data-id='${id}']`);
    let contentDiv = citationContainer.querySelector('.content');
    let authorDiv = citationContainer.querySelector('.author');

    let contentText = contentDiv.innerText.replace(/"/g, '');
    let authorText = authorDiv.innerText.replace('-', '');

    contentDiv.innerHTML = `<textarea class="edit-content">${contentText}</textarea>`;
    authorDiv.innerHTML = `<input type="text" class="edit-author" value="${authorText}">`;

    let buttonRow = citationContainer.querySelector('.edit-buttons');
    buttonRow.innerHTML = '';

    let saveButton = buildButton("/icons/save.svg", "Save", () => saveCitation(id));

    buttonRow.appendChild(saveButton);

    let cancelButton = buildButton("/icons/cancel.svg", "Cancel", () => cancelEditCitation(id, contentText, authorText));

    buttonRow.appendChild(cancelButton);
}

function saveCitation(id) {
    let citationContainer = document.querySelector(`.citation[data-id='${id}']`);
    let newContent = citationContainer.querySelector('.edit-content').value;
    let newAuthor = citationContainer.querySelector('.edit-author').value;

    fetch('internal/updateCitation', {
        method: 'POST',
        body: JSON.stringify({ citationID: id, content: newContent, author: newAuthor }),
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (response.status === 200) {
                window.location.href = "/citations";
            }
        });
}

function cancelEditCitation(id, originalContent, originalAuthor) {
    let citationContainer = document.querySelector(`.citation[data-id='${id}']`);
    let contentDiv = citationContainer.querySelector('.content');
    let authorDiv = citationContainer.querySelector('.author');

    contentDiv.innerHTML = `<p>"${originalContent}"</p>`;
    authorDiv.innerHTML = `<p>-${originalAuthor}</p>`;

    let buttonRow = citationContainer.querySelector('.edit-buttons');
    buttonRow.innerHTML = '';

    let deleteButton = buildButton("/icons/delete.svg", "Delete", () => deleteCitation(id));

    buttonRow.appendChild(deleteButton);

    let editButton = buildButton("/icons/edit.svg", "Edit", () => editCitation(id));

    buttonRow.appendChild(editButton);
}

function selectUser(user){
    const author = document.getElementById("author");
    author.value = user;
}