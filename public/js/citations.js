let currentPage = 1;

document.addEventListener("DOMContentLoaded", async function () {
    const previousAuthors = await loadPreviousAuthors();
    const author = document.getElementById("author");
    autocomplete(author, previousAuthors);
});

window.onload = function () {

    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page') || 1;

    loadCitations(page);
    currentPage = page;
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

    let userDiv = document.createElement("div");
    userDiv.className = "username";

    const profilePic = citation.userID.profilePic;
    userDiv.appendChild(buildProfilePic(profilePic, citation.userID.username));

    let sectionDiv = document.createElement("div");
    let authorDiv = document.createElement("div");
    let contextDiv = document.createElement("div");
    if (citation.context.length > 1) {
        contextDiv = document.createElement("div");
        contextDiv.className = "context";
        citation.context.forEach(contextItem => {
            let contextItemDiv = document.createElement("div");
            contextItemDiv.className = "context-item";
            let authorDiv = document.createElement("div");
            authorDiv.className = "context-author";
            authorDiv.innerText = contextItem.author+":";

            let contentDiv = document.createElement("div");
            contentDiv.className = "context-content";
            contentDiv.innerText = contextItem.content;

            contextItemDiv.appendChild(authorDiv);
            contextItemDiv.appendChild(contentDiv);
            contextDiv.appendChild(contextItemDiv);
        });

    } else {
        sectionDiv = document.createElement("div");
        sectionDiv.className = "content";
        sectionDiv.innerHTML = `<p>"${citation.content}"</p>`;

        authorDiv = document.createElement("div");
        authorDiv.className = "author";
        authorDiv.innerHTML = `<p>-${citation.author}</p>`;
    }


    let buttonRow = document.createElement("div");
    buttonRow.className = "button-row";

    let interactionButtons = document.createElement("div");
    interactionButtons.className = "interaction-buttons";

    let editButtons = document.createElement("div");
    editButtons.className = "edit-buttons";

    interactionButtons.appendChild(buildLikeButton("/internal/likeCitation", citation._id, citation.liked, citation.likes.length, loggedIn));

    if (citation.canEdit) {
        let deleteButton = buildButton("/icons/delete.svg", "Delete", () => deleteCitation(citation._id), "citation_delete");
        let editButton = buildButton("/icons/edit.svg", "Edit", () => editCitation(citation._id), "citation_edit");

        editButtons.appendChild(deleteButton);
        editButtons.appendChild(editButton);
    }

    citationContainer.appendChild(contextDiv);
    citationContainer.appendChild(sectionDiv);
    citationContainer.appendChild(authorDiv);
    citationContainer.appendChild(userDiv);
    citationContainer.appendChild(buttonRow);
    buttonRow.appendChild(interactionButtons);
    buttonRow.appendChild(editButtons);

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

    let saveButton = buildButton("/icons/save.svg", "Save", () => saveCitation(id), "citation_save");

    buttonRow.appendChild(saveButton);

    let cancelButton = buildButton("/icons/cancel.svg", "Cancel", () => cancelEditCitation(id, contentText, authorText), "citation_cancel");

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

    let deleteButton = buildButton("/icons/delete.svg", "Delete", () => deleteCitation(id), "citation_delete");

    buttonRow.appendChild(deleteButton);

    let editButton = buildButton("/icons/edit.svg", "Edit", () => editCitation(id), "citation_edit");

    buttonRow.appendChild(editButton);
}

function selectUser(user) {
    const author = document.getElementById("author");
    author.value = user;
}

let scrollTimeout;

window.addEventListener('scroll', () => {
    if (scrollTimeout) {
        clearTimeout(scrollTimeout);
    }

    scrollTimeout = setTimeout(() => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 300) {
            currentPage++;
            loadCitations(currentPage);
        }
    }, 50);
});