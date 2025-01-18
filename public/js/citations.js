let currentPage = 1;
let previousAuthors = [];
let endReached = false;
let loadedCitations = [];

document.addEventListener("DOMContentLoaded", async function () {
    const urlParams = new URLSearchParams(window.location.search);
    let query = urlParams.get('q');

    if (query) {
        const filterAuthor = document.getElementById("filterAuthor");
        filterAuthor.value = query;
    }

    loadCitations(1);

    currentPage = 1;

    previousAuthors = await loadPreviousAuthors();
    addNewContext(true);

    document.addEventListener('keydown', async (e) => {
        if (e.ctrlKey && (e.keyCode == 70 || e.keyCode == 102)) {
            e.preventDefault();
            const checkbox = document.getElementById('filterCheckbox');
            checkbox.checked = true;
            toggleVisibility('filterBody', true);
            document.getElementById('filterAuthor').select();
        }
    })
});

function textAreaOnInput(textarea) {
    textarea.value = textarea.value.replace(/[\n]/g, "");
    textarea.style.height = "";
    textarea.style.height = textarea.scrollHeight + "px";
}

function addNewContext(first = false) {
    const newCitationBox = document.getElementById("newCitationBox");
    const baseStructure = document.getElementById("baseStructure");

    const sentence = document.createElement("div");
    sentence.className = "sentenceStructure";
    sentence.innerHTML = baseStructure.innerHTML;

    const author = sentence.querySelector(".author textarea");
    autocomplete(author, previousAuthors, () => {
        textAreaOnInput(author, true);
    });

    if (!first) {
        const deleteButton = buildButton("/icons/delete.svg", "", () => sentence.remove());
        deleteButton.style.border = "none";
        sentence.appendChild(deleteButton);
    }

    newCitationBox.appendChild(sentence);
    loadLanguage(true);
}

async function loadCitations(page, callback, reloading = false) {

    let { filter, sortObj } = getFilterSettings();

    filterBase64 = utf8ToBase64(JSON.stringify(filter));
    sortBase64 = utf8ToBase64(JSON.stringify(sortObj));

    let headers = {};
    if (reloading) {
        headers = {
            'cache-refresh': 'true'
        }
    }

    let response = await fetch(`internal/getCitations?page=${page}&f=${filterBase64 || {}}&s=${sortBase64 || {}}`, {
        headers: headers
    });

    response = await response.json()
    const citationData = response.citations;

    const totalElements = document.getElementById("totalElements");
    if (totalElements) {
        totalElements.innerText = response.totalCitations === -1 ? 0 : response.totalCitations;
    }

    const filterAuthor = document.getElementById("filterAuthor");
    if (filterAuthor) {
        if (response.totalCitations === -1) {
            filterAuthor.style.color = "red";
        } else {
            filterAuthor.style.color = "black";
        }
    }

    const citationBox = document.getElementById("citationBox");
    const citations = [];
    citationData.forEach(citation => {
        citation = buildCitation(citation);
        citations.push(citation);
    });
    loadedCitations.push(...citationData);
    if (callback) {
        callback(citations);
    }
    else {
        citationBox.append(...citations);
    }

    loadLanguage(true);
    response.totalCitations == citationBox.children.length ? endReached = true : endReached = false;

    return citations;
}

const reloadContent = async () => {
    const body = document.querySelector("body");

    const citationBox = document.getElementById("citationBox");

    loadedCitations = [];

    loadCitations(1, (citations) => {
        const bodyHeight = window.getComputedStyle(body).height;
        body.style.height = bodyHeight;
        citationBox.innerHTML = "";
        citationBox.append(...citations);
        body.style.height = "auto";
        endReached = false;
    }, true);
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
    if (citation.context && citation.context.length > 1) {
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

    interactionButtons.appendChild(buildLikeButton("/internal/likeCitation", citation._id, citation.liked, citation.likes.length));

    if (citation.canEdit) {
        let deleteButton = buildButton("/icons/delete.svg", "Delete", () => deleteCitation(citation._id), "interaction delete", "");
        let editButton = buildButton("/icons/edit.svg", "Edit", () => editCitation(citation._id), "interaction edit", "");

        interactionButtons.appendChild(deleteButton);
        interactionButtons.appendChild(editButton);
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
    metaDiv.appendChild(userDiv);
    if (citation.context && citation.context.length > 1) {
        citationContainer.appendChild(contextDiv);
    }
    citationContainer.appendChild(sectionDiv);
    citationContainer.appendChild(authorDiv);
    citationContainer.appendChild(buttonRow);
    buttonRow.appendChild(interactionButtons);
    buttonRow.appendChild(metaDiv);

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

    let { filter, sortObj } = getFilterSettings();

    filterBase64 = utf8ToBase64(JSON.stringify(filter));
    sortBase64 = utf8ToBase64(JSON.stringify(sortObj));

    const url = `internal/getCitations?page=${1}&f=${filterBase64 || {}}&s=${sortBase64 || {}}`

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
                const citationBox = document.getElementById("newCitationBox");
                citationBox.innerHTML = "";
                addNewContext(true);
                updateCitations();
            }
        });
}

function deleteCitation(id) {
    if (confirm("Bist du sicher, dass du dieses Zitat löschen möchtest?")) {
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
}

function editCitation(id) {
    const citationBox = document.getElementById("newCitationBox");
    const citation = loadedCitations.find(citation => citation._id === id);
    if (!citation) return;
    if (!citation.canEdit) return;

    if (!citation.context || citation.context.length === 0) {
        citation.context = [{
            author: citation.author,
            content: citation.content
        }];
    }

    citationBox.innerHTML = "";

    citation.context.forEach(context => {
        const sentence = document.createElement("div");
        sentence.className = "sentenceStructure";
        sentence.innerHTML = document.getElementById("baseStructure").innerHTML;

        const author = sentence.querySelector(".author textarea");
        author.value = context.author;

        const content = sentence.querySelector(".content textarea");
        content.value = context.content;

        const deleteButton = buildButton("/icons/delete.svg", "", () => sentence.remove());
        deleteButton.style.border = "none";
        sentence.appendChild(deleteButton);

        citationBox.appendChild(sentence);
    });

    const submitButton = document.getElementById('citationSubmit');
    submitButton.style.display = "none";

    const submitButtons = document.getElementById('submitButtons');
    submitButtons.style.display = "flex";

    const saveButton = document.getElementById('citationSave');

    saveButton.onclick = () => saveCitation(id);

    window.scrollTo(0, 0);
}

//let saveButton = buildButton("/icons/save.svg", "Save", () => saveCitation(id), "interaction save");

//let cancelButton = buildButton("/icons/cancel.svg", "Cancel", () => endEditCitation(id, contentText, authorText), "interaction cancel");

function saveCitation(id) {
    const contextInput = Array.from(document.querySelectorAll(".sentenceStructure")).map(sentence => {
        return { author: sentence.querySelector(".author textarea"), content: sentence.querySelector(".content textarea") };
    });

    if (contextInput.length === 0) return;

    const newContext = contextInput.map(context => {
        return { author: context.author.value, content: context.content.value };
    });

    fetch('internal/updateCitation', {
        method: 'POST',
        body: JSON.stringify({ citationID: id, context: newContext }),
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (response.status === 200) {
                updateCitations();
                endEditCitation();
            }
        });
}

function endEditCitation() {
    const citationBox = document.getElementById("newCitationBox");
    citationBox.innerHTML = "";
    addNewContext(true);
    const submitButton = document.getElementById('citationSubmit');
    submitButton.style.display = "block";

    const submitButtons = document.getElementById('submitButtons');
    submitButtons.style.display = "none";
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
            const [key, value] = sortElement.value.split("-")
            console.log(key, value);
            sortObj[key] = value;
        }
    });
    console.log(sortObj);
    return { filter, sortObj };
}

function updateFilter() {
    endReached = false;
    reloadContent();
}