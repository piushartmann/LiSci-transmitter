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

function buildPost(post) {
    const postBox = document.getElementById("postBox");
    let postContainer = document.createElement("div");
    postContainer.className = "post";
    postContainer.dataset.id = post._id;
    postContainer.appendChild(buildHeader(post));

    let sectionContainer = document.createElement("div");
    sectionContainer.className = "section-container";
    postContainer.appendChild(sectionContainer);

    const footer = buildFooter(post);

    post.sections.forEach(section => {
        let sectionDiv = document.createElement("div");
        sectionDiv.className = "section";
        switch (section.type) {
            case "text":
                const text = document.createElement("p");
                text.innerHTML = section.content;
                sectionDiv.appendChild(text);
                break;
            case "file":
                if (window.location.pathname === "/") {
                    if (!document.getElementById("viewButton")) {
                        const viewButton = buildButton("/icons/view.svg", "View", () => window.location.href = `/post/${post._id}`);
                        viewButton.id = "viewButton";
                        footer.firstChild.appendChild(viewButton);
                    }
                    break;
                } else {
                    const fileContainer = document.createElement("div");
                    fileContainer.className = "file";
                    const url = `https://storage.liscitransmitter.live/${section.content}`;
                    sectionDiv.appendChild(fileContainer);
                    renderPDF(url, fileContainer, 2);
                    break;
                }
            case "img":
                const img = document.createElement("img");
                img.className = "post-image";
                img.src = `https://storage.liscitransmitter.live/${section.content}`;
                img.alt = post.title;
                img.style = `max-width: 100%; height: ${section.size * document.documentElement.clientWidth + "px" || "auto"}`;
                console.log(section.size * document.documentElement.clientWidth);
                sectionDiv.appendChild(img);
                break;
            case "markdown":
                const markdown = document.createElement("div");
                markdown.innerHTML = marked.parse(section.content);
                sectionDiv.appendChild(markdown);
                break;
            default:
                console.error("Unknown section type");
                break;
        }
        sectionContainer.appendChild(sectionDiv);
    });
    postContainer.appendChild(footer);
    postBox.appendChild(postContainer);
}

function buildHeader(post) {
    let headerDiv = document.createElement("div");
    headerDiv.className = "post-header";
    const profilePic = post.userID.profilePic
    if (profilePic.type === "default") {
        let authorDiv = document.createElement("div");
        authorDiv.className = "author-info";

        let authorName = document.createElement("p");
        authorName.className = "author-name";
        authorName.textContent = post.userID.username;
        authorName.style = "margin-left: 10px;";

        let authorProfilePic = document.createElement("p");
        authorProfilePic.className = "defaultProfilePicture author-profile-pic";
        authorProfilePic.style = `background-color: ${profilePic.content};`;
        authorProfilePic.textContent = post.userID.username.charAt(0).toUpperCase();

        let authorProfilePicName = document.createElement("span");
        authorProfilePicName.textContent = post.userID.username;
        authorProfilePicName.className = "author-name-tooltip";
        authorProfilePic.appendChild(authorProfilePicName);

        authorDiv.appendChild(authorName);
        authorDiv.appendChild(authorProfilePic);

        let titleDiv = document.createElement("h1");
        titleDiv.className = "post-title";
        titleDiv.textContent = post.title;

        headerDiv.appendChild(titleDiv);
        headerDiv.appendChild(authorDiv);
    }
    else if (profilePic.type === "custom") {
        let authorDiv = document.createElement("div");
        authorDiv.className = "author-info";

        let authorName = document.createElement("p");
        authorName.textContent = post.userID.username;
        authorName.style = "margin-left: 10px;";

        let authorProfilePic = document.createElement("img");
        authorProfilePic.className = "profilePicture";
        authorProfilePic.src = `https://storage.liscitransmitter.live/${profilePic.content}`;
        authorProfilePic.alt = post.userID.username;
        headerDiv.appendChild(authorProfilePic);

        authorDiv.appendChild(authorName);
        authorDiv.appendChild(authorProfilePic);

        let titleDiv = document.createElement("h1");
        titleDiv.textContent = post.title;
        titleDiv.style = "display: inline;";

        headerDiv.appendChild(titleDiv);
        headerDiv.appendChild(authorDiv);
    }

    return headerDiv;
}

function buildFooter(post) {
    let footerDiv = document.createElement("div");
    footerDiv.className = "post-footer flex";
    let liked = post.liked === true;
    let likes = post.likes.length;

    let iteractionButtons = document.createElement("div");
    iteractionButtons.className = "flex";

    let likeIcon = null;

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
                await fetch("/internal/likePost", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ postID: post._id }),
                });
                likeButton.label.textContent = `${likes + 1} Likes`;
                likes++;
                likeButton.icon.src = "/icons/like-filled.svg";
                liked = true;
            }
            else {
                await fetch("/internal/likePost", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ postID: post._id }),
                });
                likeButton.label.textContent = `${likes - 1} Likes`;
                likes--;
                likeButton.icon.src = "/icons/like-unfilled.svg";
                liked = false;
            }
        }
    }

    let commentButton = buildButton(post.comments.length > 0 ? "/icons/comment-filled.svg" : "/icons/comment-unfilled.svg", `${post.comments.length} Comments`, () => renderComments(post));

    iteractionButtons.appendChild(likeButton);
    iteractionButtons.appendChild(commentButton);

    footerDiv.appendChild(iteractionButtons);

    if (post.canEdit) {
        let buttonRow = document.createElement("div");
        buttonRow.className = "flex";

        let editButton = buildButton("/icons/edit.svg", "Edit", () => window.location.href = `/edit/${post._id}`);

        buttonRow.appendChild(editButton);

        let deleteButton = buildButton("/icons/delete.svg", "Delete", async () => {
            if (confirm("Are you sure you want to delete this post?")) {
                await fetch(`/internal/deletePost`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ postID: post._id }),
                });
                console.log(`Post ${post._id} deleted`);
            }
            window.location.reload();
        });

        buttonRow.appendChild(deleteButton);

        footerDiv.appendChild(buttonRow);
    }

    return footerDiv;
}

async function renderPDF(url, container, scale) {
    const pdf = await loadPDF(url);
    const numPages = pdf.numPages;
    for (let i = 1; i <= numPages; i++) {
        const canvas = document.createElement("canvas");
        container.appendChild(canvas);
        await renderPDFPage(pdf, canvas, i, scale);
    }
}

async function renderPDFPage(pdf, canvas, pageNumber, scale) {
    const page = await pdf.getPage(pageNumber);
    var viewport = page.getViewport({ scale: scale });

    var context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    var renderContext = {
        canvasContext: context,
        viewport: viewport
    };
    await page.render(renderContext).promise;
    return;
}

async function loadPDF(url) {
    var { pdfjsLib } = globalThis;

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.worker.mjs';

    var pdf = await pdfjsLib.getDocument(url).promise;
    console.log("PDF loaded");
    return pdf;
}