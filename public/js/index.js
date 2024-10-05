let postContainer;

function loadPosts(page) {
    fetch(`internal/getPosts?page=${page}`)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            data.forEach(post => {
                if (post.type === "text") {
                    displayText(post);
                } else if (post.type === "pdf") {
                    displayPDF(post);
                }
                else if (post.type === "img") {
                    displayImage(post);
                }
            });
        });
}

function displayText(post) {
    let textDiv = document.createElement("div");
    textDiv.className = "text";
    textDiv.innerHTML = `
    <h3>${post.title}</h3>
    <p>${post.content}</p>
    `;
    postContainer.appendChild(textDiv);
}

function displayPDF(post) {
    let pdfDiv = document.createElement("div");
    pdfDiv.className = "pdf";
    pdfDiv.innerHTML = `
    <h3>${post.title}</h3>
    <embed src="https://storage.liscitransmitter.live/${post.mediaPath}" width="500" height="375" type="application/pdf">
    <p>${post.content}</p>`;
    postContainer.appendChild(pdfDiv);
}

function displayImage(post) {
    let imageDiv = document.createElement("div");
    imageDiv.className = "image";
    imageDiv.innerHTML = `
    <h3>${post.title}</h3>
    <img src="https://storage.liscitransmitter.live/${post.mediaPath}" alt="${post.title}" style="max-width: 100%; height: auto;">
    <p>${post.content}</p>`;
    postContainer.appendChild(imageDiv);
}

window.onload = function () {
    postContainer = document.getElementById("postBox");

    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page') || 1;

    loadPosts(page);
};