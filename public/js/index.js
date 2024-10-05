function loadPosts(page) {
    fetch(`internal/getPosts?page=${page}`)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            data.forEach(post => {
                buildPost(post);
            });
        });
}

function buildPost(post) {
    postBox = document.getElementById("postBox");
    let postContainer = document.createElement("div");
    postContainer.className = "post";
    postContainer.appendChild(buildHeader(post));

    post.sections.forEach(section => {
        let sectionContainer = document.createElement("div");
        sectionContainer.className = "section";
        switch (section.type) {
            case "text":
                sectionContainer.innerHTML = `<p>${section.content}</p>`;
                break;
            case "pdf":
                sectionContainer.innerHTML = `<embed src="https://storage.liscitransmitter.live/${section.content}" width="500" height="375" type="application/pdf">`;
                break;
            case "img":
                sectionContainer.innerHTML = `<img src="https://storage.liscitransmitter.live/${section.content}" alt="${post.title}" style="max-width: 100%; height: auto;">`;
                break;
            default:
                console.error("Unknown section type");
                break;
        }
        postContainer.appendChild(sectionContainer);
    });

    postBox.appendChild(postContainer);
}

function buildHeader(post) {
    let headerDiv = document.createElement("div");
    headerDiv.className = "post-header";
    headerDiv.innerHTML = `
    <h1 style="display: inline;">${post.title}</h1>
    <p style="display: inline; margin-left: 10px;">Von ${post.userID.username}</p>
    `;
    return headerDiv;
}

function displayText(post) {
    let textDiv = document.createElement("div");
    textDiv.className = "text";
    textDiv.innerHTML = `
    <p>${post.content}</p>
    `;
    postContainer.appendChild(textDiv);
}

function displayPDF(post) {
    let pdfDiv = document.createElement("div");
    pdfDiv.className = "pdf";
    pdfDiv.innerHTML = `
    <embed src="https://storage.liscitransmitter.live/${post.mediaPath}" width="500" height="375" type="application/pdf">
    <p>${post.content}</p>`;
    postContainer.appendChild(pdfDiv);
}

function displayImage(post) {
    let imageDiv = document.createElement("div");
    imageDiv.className = "image";
    imageDiv.innerHTML = `
    <img src="https://storage.liscitransmitter.live/${post.mediaPath}" alt="${post.title}" style="max-width: 100%; height: auto;">
    <p>${post.content}</p>`;
    postContainer.appendChild(imageDiv);
}

window.onload = function () {

    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page') || 1;

    loadPosts(page);
};