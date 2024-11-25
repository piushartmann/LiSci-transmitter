let currentPage = 1;
let previousAuthors = [];

document.addEventListener("DOMContentLoaded", async function () {
    previousAuthors = await loadPreviousAuthors();
    addNewContext();
});

function addNewContext() {
    const citationBox = document.getElementById("newCitationBox");
    const baseStructure = document.getElementById("baseStructure");

    const sentence = document.createElement("div");
    sentence.className = "sentenceStructure";
    sentence.innerHTML = baseStructure.innerHTML;

    const author = sentence.querySelector(".author textarea");
    autocomplete(author, previousAuthors);

    citationBox.appendChild(sentence);
    //loadLanguage(true);
}

window.onload = function () {

    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page') || 1;

    loadCitations(page);
    currentPage = page;
}

let hasMorePages = true;

async function loadCitations(page) {
    if (!hasMorePages) return;

    let response = await fetch(`internal/getCitations?page=${page}`);
    let data = await response.json();

    if (data.length === 0) {
        hasMorePages = false; // No more pages to load
        return;
    }

    const citationBox = document.getElementById("citationBox");
    const citations = [];
    data.forEach(citation => {
        citation = buildCitation(citation);
        citations.push(citation);
    });

    citationBox.append(...citations);
    //loadLanguage(true);
}

const reloadContent = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page') || 1;

    const citationBox = document.getElementById("citationBox");
    citationBox.innerHTML = "";

    loadCitations(page, (citations) => {
        citationBox.replaceChildren(...citations);
    });
};

async function loadPreviousAuthors() {
    const previousAuthors = await fetch('internal/getPreviousAuthors')
    return await previousAuthors.json();
}

function buildCitation(citation) {
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
            authorDiv.innerText = contextItem.author + ":";

            let contentDiv = document.createElement("div");
            contentDiv.className = "context-content";
            contentDiv.innerText = contextItem.content;

            contextItemDiv.appendChild(authorDiv);
            contextItemDiv.appendChild(contentDiv);
            contextDiv.appendChild(contextItemDiv);
        });

    } else {

        if (citation.context && citation.context.length > 0) {
            const context = citation.context[0];
            var content = context.content;
            var author = context.author;

        } else {
            var content = citation.content;
            var author = citation.author;
        }

        sectionDiv = document.createElement("div");
        sectionDiv.className = "content";
        sectionDiv.innerHTML = `<p>"${content}"</p>`;

        authorDiv = document.createElement("div");
        authorDiv.className = "author";
        authorDiv.innerHTML = `<p>-${author}</p>`;
    }


    let buttonRow = document.createElement("div");
    buttonRow.className = "button-row";

    let interactionButtons = document.createElement("div");
    interactionButtons.className = "interaction-buttons";

    let editButtons = document.createElement("div");
    editButtons.className = "edit-buttons";

    interactionButtons.appendChild(buildLikeButton("/internal/likeCitation", citation._id, citation.liked, citation.likes.length, loggedIn));

    if (citation.canEdit) {
        let deleteButton = buildButton("/icons/delete.svg", "Delete", () => deleteCitation(citation._id), "interaction delete");
        let editButton = buildButton("/icons/edit.svg", "Edit", () => editCitation(citation._id), "interaction edit");

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

    return citationContainer;
}

function updateCitations() {

    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page') || 1;

    const url = `/internal/getCitations?page=${page}`

    updateCache(url, "reloadContent");
}

function submitCitation() {
    console.log("Submit citation");
    const authorElements = Array.from(document.querySelectorAll(".sentenceStructure .author textarea"));
    const contentElements = Array.from(document.querySelectorAll(".sentenceStructure .content textarea"));

    function checkChar(char) {
        bannedChars = ['"', '„', '“']
        return bannedChars.includes(char);
    }

    console.log(authorElements);
    console.log(contentElements);

    if (authorElements.length !== contentElements.length) return;

    const context = authorElements.map((authorElement, index) => {
        let content = contentElements[index].value;
        let author = authorElement.value;
        if (checkChar(content.charAt(0))) {
            content = content.substring(1);
        }
        if (checkChar(content.charAt(content.length - 1))) {
            content = content.substring(0, content.length - 1);
        }

        if (content.length === 0 || author.length === 0) return;

        return {
            author: author,
            content: content
        }
    });

    console.log(context);

    fetch('internal/createCitation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            context: context
        }),
    })
        .then(response => {
            if (response.status === 200) {
                authorElements.forEach(authorElement => {
                    authorElement.value = "";
                }
                );
                contentElements.forEach(contentElement => {
                    contentElement.value = "";
                }
                );
                updateCitations();
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
                updateCitations();
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

    let saveButton = buildButton("/icons/save.svg", "Save", () => saveCitation(id), "interaction save");

    buttonRow.appendChild(saveButton);

    let cancelButton = buildButton("/icons/cancel.svg", "Cancel", () => cancelEditCitation(id, contentText, authorText), "interaction cancel");

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
                updateCitations();
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

    let deleteButton = buildButton("/icons/delete.svg", "Delete", () => deleteCitation(id), "interaction delete");

    buttonRow.appendChild(deleteButton);

    let editButton = buildButton("/icons/edit.svg", "Edit", () => editCitation(id), "interaction edit");

    buttonRow.appendChild(editButton);
}

let scrollTimeout;

let isLoading = false;

window.addEventListener('scroll', () => {
    if (isLoading) return; // Prevent multiple triggers if already loading.

    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 300) {
        isLoading = true; // Set loading state
        currentPage++;
        loadCitations(currentPage).then(() => {
            isLoading = false; // Reset loading state once done
        });
    }
});
