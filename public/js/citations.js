let currentPage = 1;
let previousAuthors = [];
let endReached = false;

document.addEventListener("DOMContentLoaded", async function () {
    previousAuthors = await loadPreviousAuthors();
    addNewContext(true);
});

function addNewContext(first = false) {
    const citationBox = document.getElementById("newCitationBox");
    const baseStructure = document.getElementById("baseStructure");

    const sentence = document.createElement("div");
    sentence.className = "sentenceStructure";
    sentence.innerHTML = baseStructure.innerHTML;

    const author = sentence.querySelector(".author textarea");
    autocomplete(author, previousAuthors);

    if (!first) {
        const deleteButton = buildButton("/icons/delete.svg", "", () => sentence.remove());
        deleteButton.style.border = "none";
        sentence.appendChild(deleteButton);
    }

    citationBox.appendChild(sentence);
    loadLanguage(true);
}

window.onload = function () {

    const { page } = getSearchParams();

    loadCitations(page);

    currentPage = page;
}

function getSearchParams() {
    const urlParams = new URLSearchParams(window.location.search);
    let page = urlParams.get('page');

    page ? page : 1;

    return { page };
}

function utf8ToBase64(str) {
    const utf8Bytes = new TextEncoder().encode(str);
    let binaryString = '';
    for (let i = 0; i < utf8Bytes.length; i++) {
        binaryString += String.fromCharCode(utf8Bytes[i]);
    }
    return btoa(binaryString);
}

async function loadCitations(page, callback) {

    let { filter, sortObj } = getFilterSettings();

    filterBase64 = utf8ToBase64(JSON.stringify(filter));
    sortBase64 = utf8ToBase64(JSON.stringify(sortObj));

    let response = await fetch(`internal/getCitations?page=${page}&f=${filterBase64 || {}}&s=${sortBase64 || {}}`);
    response = await response.json()
    const citationData = response.citations;
    console.log(response.totalCitations);

    const totalElements = document.getElementById("totalElements");
    if (totalElements) {
        totalElements.innerText = response.totalCitations;
    }

    const citationBox = document.getElementById("citationBox");
    const citations = [];
    citationData.forEach(citation => {
        citation = buildCitation(citation);
        citations.push(citation);
    });
    if (callback) {
        callback(citations);
    }
    else {
        citationBox.append(...citations);
    }

    loadLanguage(true);
    response.totalCitations <= citationBox.children.length ? endReached = true : endReached = false;

    return citations;
}

const reloadContent = async () => {
    const { page } = getSearchParams();

    const body = document.querySelector("body");

    const citationBox = document.getElementById("citationBox");

    loadCitations(page, (citations) => {
        const bodyHeight = window.getComputedStyle(body).height;
        body.style.height = bodyHeight;
        citationBox.innerHTML = "";
        citationBox.replaceChildren(...citations);
        body.style.height = "auto";
        endReached = false;
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
    let metaDiv = document.createElement("div");
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

    metaDiv.className = "meta-info";
    let date = new Date(citation.timestamp);
    let dateDiv = document.createElement("div");
    dateDiv.className = "date";
    dateDiv.innerText = timeSince(date);
    let dateTooltip = document.createElement("span");
    dateTooltip.className = "tooltip";
    dateTooltip.innerText = date.toLocaleString();
    dateDiv.appendChild(dateTooltip);

    metaDiv.appendChild(dateDiv);

    citationContainer.appendChild(contextDiv);
    citationContainer.appendChild(sectionDiv);
    citationContainer.appendChild(authorDiv);
    citationContainer.appendChild(userDiv);
    citationContainer.appendChild(buttonRow);
    citationContainer.appendChild(metaDiv);
    buttonRow.appendChild(interactionButtons);
    buttonRow.appendChild(editButtons);

    return citationContainer;
}

function timeSince(date) {
    let seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;

    if (interval > 1) {
        return Math.floor(interval) + " years ago";
    }

    interval = seconds / 2592000;
    if (interval > 1) {
        return Math.floor(interval) + " months ago";
    }

    interval = seconds / 86400;
    if (interval > 1) {
        return Math.floor(interval) + " days ago";
    }

    interval = seconds / 3600;
    if (interval > 1) {
        return Math.floor(interval) + " hours ago";
    }

    interval = seconds / 60;
    if (interval > 1) {
        return Math.floor(interval) + " minutes ago";
    }

    return Math.floor(seconds) + " seconds ago";
}

function updateCitations() {

    const { page } = getSearchParams();
    let { filter, sortObj } = getFilterSettings();

    filterBase64 = utf8ToBase64(JSON.stringify(filter));
    sortBase64 = utf8ToBase64(JSON.stringify(sortObj));

    const url = `internal/getCitations?page=${page}&f=${filterBase64 || {}}&s=${sortBase64 || {}}`

    updateCache(url, "reloadContent");

    endReached = false;
}

function submitCitation() {
    console.log("Submit citation");
    const authorElements = Array.from(document.querySelectorAll(".sentenceStructure .author textarea"));
    const contentElements = Array.from(document.querySelectorAll(".sentenceStructure .content textarea"));

    function checkChar(char) {
        bannedChars = ['"', '„', '“']
        return bannedChars.includes(char);
    }

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
    if (isLoading || endReached) return; // Prevent multiple triggers if already loading or end is reached.

    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
        isLoading = true; // Set loading state
        currentPage++;
        loadCitations(currentPage).then((citations) => {
            isLoading = false; // Reset loading state once done
            console.log(citations);
            if (typeof citations === "undefined" || citations.length === 0) {
            }
        });
    }
});

function getFilterSettings() {
    const filters = Array.from(document.querySelectorAll(".filter input, .filter select"));
    const sort = Array.from(document.querySelectorAll(".sortBox input, .sortBox select"));

    let filter = {};
    let sortObj = {};

    filters.forEach(filterElement => {
        if (filterElement.id === "filterAuthor") {
            filter.text = filterElement.value;
        }
        else if (filterElement.id === "filterDateFrom") {
            filter.fromDate = filterElement.value;
        }
        else if (filterElement.id === "filterDateTo") {
            filter.toDate = filterElement.value;
        }
    });

    sort.forEach(sortElement => {
        if (sortElement.id === "sortDate") {
            sortObj.time = sortElement.value;
        }
    });

    return { filter, sortObj };
}

function updateFilter() {
    reloadContent();
}