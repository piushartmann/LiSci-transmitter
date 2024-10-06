function buildPost(post) {
    console.log(post);
    postBox = document.getElementById("postBox");
    let postContainer = document.createElement("div");
    postContainer.className = "post";
    postContainer.appendChild(buildHeader(post));

    let sectionContainer = document.createElement("div");
    sectionContainer.className = "section-container";
    postContainer.appendChild(sectionContainer);

    post.sections.forEach(section => {
        let sectionDiv = document.createElement("div");
        sectionDiv.className = "section";
        switch (section.type) {
            case "text":
                sectionDiv.innerHTML = `<p>${section.content}</p>`;
                break;
            case "file":
                sectionDiv.innerHTML = `<embed src="https://storage.liscitransmitter.live/${section.content}" width="500" height="375" type="application/pdf">`;
                break;
            case "img":
                sectionDiv.innerHTML = `<img src="https://storage.liscitransmitter.live/${section.content}" alt="${post.title}" style="max-width: 100%; height: ${section.size + "px" || "auto"}">`;
                break;
            case "markdown":
                sectionDiv.innerHTML = marked.parse(section.content);
                break;
            default:
                console.error("Unknown section type");
                break;
        }
        sectionContainer.appendChild(sectionDiv);
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