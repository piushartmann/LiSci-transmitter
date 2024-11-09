function buildPost(post) {
    const postBox = document.getElementById("postBox");
    let postContainer = document.createElement("div");
    postContainer.className = "post";
    postContainer.dataset.id = post._id;
    const header = buildHeader(post);
    postContainer.appendChild(header);

    let title = document.createElement("h2");
    title.textContent = post.title;
    title.className = "post-title";
    header.prepend(title);

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
                let titleFallback = "View File";
                if (localStorage.getItem('languageFile')) {
                    const languageFile = JSON.parse(localStorage.getItem('languageFile'));
                    titleFallback = languageFile["posts file_view_fallback"];
                }
                const fileButton = buildButton("/icons/view.svg", section.title ? section.title : titleFallback, () => window.open(`https://storage.liscitransmitter.live/${section.content}`, '_blank'));
                fileButton.label.classList.add("file-label");
                sectionDiv.appendChild(fileButton);
                break;
            case "img":
                const img = document.createElement("img");
                img.className = "post-image";
                img.src = `https://storage.liscitransmitter.live/${section.content}`;
                img.alt = post.title;
                img.style = `max-width: 100%; height: ${section.size * document.documentElement.clientWidth + "px" || "auto"}`;
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
    headerDiv.appendChild(buildProfilePic(profilePic, post.userID.username));

    return headerDiv;
}

function buildFooter(post) {
    let footerDiv = document.createElement("div");
    footerDiv.className = "post-footer flex";

    let iteractionButtons = document.createElement("div");
    iteractionButtons.className = "flex";

    let commentLabel = resolveLanguageContent("interaction comments") || "Comments";

    let commentButton = buildButton(post.comments.length > 0 ? "/icons/comment-filled.svg" : "/icons/comment-unfilled.svg", `${post.comments.length} ${commentLabel}`, () => renderComments(post), `${post.comments.length} ${commentLabel}`, `${post.comments.length}`, true);

    iteractionButtons.appendChild(buildLikeButton("/internal/likePost", post._id, post.liked, post.likes.length, loggedIn));
    iteractionButtons.appendChild(commentButton);

    footerDiv.appendChild(iteractionButtons);

    if (post.canEdit) {
        let buttonRow = document.createElement("div");
        buttonRow.className = "flex";

        let editButton = buildButton("/icons/edit.svg", "Edit", () => window.location.href = `/edit/${post._id}`, "interaction edit");
        editButton.classList.add("online-only");

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
        }, "interaction delete");
        deleteButton.classList.add("online-only");

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