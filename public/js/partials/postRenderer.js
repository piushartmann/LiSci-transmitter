function buildPost(post) {
    const postBox = document.getElementById("postBox");
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
    footerDiv.className = "post-footer flex";
    let liked = post.liked === true;
    let likes = post.likes.length;

    let iteractionButtons = document.createElement("div");
    iteractionButtons.className = "flex";



    let likeButton = document.createElement("button");
    likeButton.className = "button";

    let likeIcon = document.createElement("img");
    likeIcon.className = "icon";
    likeIcon.src = liked ? "/icons/like-filled.svg" : "/icons/like-unfilled.svg";

    let likeCounter = document.createElement("p");
    likeCounter.className = "counter";
    likeCounter.textContent = `${likes} Likes`;

    likeButton.appendChild(likeIcon);
    likeButton.appendChild(likeCounter);



    let commentButton = document.createElement("button");
    commentButton.className = "button";
    commentButton.onclick = () => renderComments(post);

    let commentIcon = document.createElement("img");
    commentIcon.className = "icon";
    commentIcon.src = post.comments.length > 0 ? "/icons/comment-filled.svg" : "/icons/comment-unfilled.svg";

    let commentCounter = document.createElement("p");
    commentCounter.className = "counter";
    commentCounter.textContent = `${post.comments.length} Comments`;

    commentButton.appendChild(commentIcon);
    commentButton.appendChild(commentCounter);



    iteractionButtons.appendChild(likeButton);
    iteractionButtons.appendChild(commentButton);

    footerDiv.appendChild(iteractionButtons);

    likeButton.onclick = async () => {
        if (!liked) {
            await fetch("/internal/likePost", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ postID: post._id }),
            });
            likeCounter.textContent = `${likes + 1} Likes`;
            likes++;
            likeIcon.src = "/icons/like-filled.svg";
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
            likeCounter.textContent = `${likes - 1} Likes`;
            likes--;
            likeIcon.src = "/icons/like-unfilled.svg";
            liked = false;
        }
    }

    if (post.canEdit) {
        let editButtons = document.createElement("div");
        editButtons.className = "flex";

        let editButton = document.createElement("button");
        editButton.className = "edit-button";
        editButton.textContent = "Edit";
        editButton.onclick = () => window.location.href = `/edit/${post._id}`;
        editButtons.appendChild(editButton);

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
        editButtons.appendChild(deleteButton);
        footerDiv.appendChild(editButtons);
    }

    return footerDiv;
}

document.addEventListener('DOMContentLoaded', async () => {
    var modal = document.getElementById('commentModal');

    window.onclick = function (event) {
        if (event.target == modal) {
            hideComments();
        }
    }

    window.ontouchstart = function (event) {
        if (event.target == modal) {
            hideComments();
        }
    }

    document.getElementById("modalClose").addEventListener("click", () => {
        hideComments();
    });
});