function buildPost(post) {
    postBox = document.getElementById("postBox");
    let postContainer = document.createElement("div");
    postContainer.className = "post";
    postContainer.dataset.id = post._id;
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
    postContainer.appendChild(buildFooter(post));
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

function buildFooter(post) {
    let footerDiv = document.createElement("div");
    footerDiv.className = "post-footer";

    let likeCounter = document.createElement("p");
    likeCounter.className = "like-counter";
    likeCounter.textContent = `${post.likes.length} Likes`;

    let likeButton = document.createElement("button");
    likeButton.className = "like-button";
    likeButton.textContent = "Like";
    likeButton.onclick = async () => {
        await fetch("/internal/likePost", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ postID: post._id }),
        });
        likeCounter.textContent = `${post.likes.length + 1} Likes`;
    }
    
    if (post.canEdit) {
        let editButton = document.createElement("button");
        editButton.className = "edit-button";
        editButton.textContent = "Edit";
        editButton.onclick = () => window.location.href = `/edit/${post._id}`;
        footerDiv.appendChild(editButton);

        let deleteButton = document.createElement("button");
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Delete";
        deleteButton.onclick = async () => {
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
        };
        footerDiv.appendChild(deleteButton);
    }

    return footerDiv;
}