document.addEventListener("DOMContentLoaded", function () {
    loadCitations();
});

function loadCitations() {
    fetch(`internal/getCitations`)
        .then(response => response.json())
        .then(data => {
            data.forEach(citation => {
                buildCitation(citation);
            });
        });
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

        let authorProfilePic = document.createElement("p");
        authorProfilePic.className = "defaultProfilePicture";
        authorProfilePic.style = `background-color: ${profilePic.content};`;
        authorProfilePic.textContent = citation.userID.username.charAt(0).toUpperCase();

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

    if (citation.canEdit) {
        let deleteButton = document.createElement("button");
        deleteButton.className = "delete-button";
        deleteButton.innerHTML = "Delete";
        deleteButton.onclick = () => deleteCitation(citation._id);
        buttonRow.appendChild(deleteButton);

        let editButton = document.createElement("button");
        editButton.className = "edit-button";
        editButton.innerHTML = "Edit";
        editButton.onclick = () => editCitation(citation._id);
        buttonRow.appendChild(editButton);
    }

    citationBox.appendChild(citationContainer);
}

function submitCitation() {
    author = document.getElementById("author").value;
    content = document.getElementById("content").value;

    fetch('internal/createCitation', {
        method: 'POST',
        body: JSON.stringify({ author, content }),
        enctype: 'x-www-form-urlencoded',
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

    let buttonRow = citationContainer.querySelector('.button-row');
    buttonRow.innerHTML = '';

    let saveButton = document.createElement("button");
    saveButton.className = "save-button";
    saveButton.innerHTML = "Save";
    saveButton.onclick = () => saveCitation(id);
    buttonRow.appendChild(saveButton);

    let cancelButton = document.createElement("button");
    cancelButton.className = "cancel-button";
    cancelButton.innerHTML = "Cancel";
    cancelButton.onclick = () => cancelEditCitation(id, contentText, authorText);
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

    let buttonRow = citationContainer.querySelector('.button-row');
    buttonRow.innerHTML = '';

    let deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.innerHTML = "Delete";
    deleteButton.onclick = () => deleteCitation(id);
    buttonRow.appendChild(deleteButton);

    let editButton = document.createElement("button");
    editButton.className = "edit-button";
    editButton.innerHTML = "Edit";
    editButton.onclick = () => editCitation(id);
    buttonRow.appendChild(editButton);
}