function renderComments(post) {
    const commentModal = document.getElementById('commentModal');
    commentModal.style.display = 'block';

    const commentButton = document.getElementById('commentButton');
    commentButton.onclick = () => submitComment(post);

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            hideComments();
        }
    });

    const comments = post.comments;

    comments.forEach(comment => {
        buildComment(comment);
    });

    const textarea = document.getElementById('commentTextarea');
    if (!loggedIn){
        textarea.disabled = true;
        textarea.placeholder = "Please log in to comment";
    }
}

function hideComments() {
    const commentModal = document.getElementById('commentModal');
    const commentContainer = document.getElementById('commentContainer');
    commentContainer.innerHTML = '';
    commentModal.style.display = 'none';
}

async function submitComment(post) {
    const textarea = document.getElementById('commentTextarea');
    const content = textarea.value;
    await fetch('internal/createComment', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postID: post._id, content: content, permissions: post.permissions }),
    });
    window.location.reload();
}

function buildComment(comment) {
    const commentContainer = document.getElementById('commentContainer');
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment';
    commentDiv.dataset.id = comment._id;

    let contentContainer = document.createElement('div');
    contentContainer.className = 'content-container';

    let content = document.createElement("div");
    content.className = "content";
    content.innerHTML = `<p>${comment.content}</p>`;
    contentContainer.appendChild(content);

    let userDiv = document.createElement("div");
    userDiv.className = "username";
    contentContainer.appendChild(userDiv);

    const profilePic = comment.userID.profilePic
    if (profilePic.type === "default") {
        let authorDiv = document.createElement("div");
        authorDiv.className = "author-info";

        let authorName = document.createElement("p");
        authorName.textContent = comment.userID.username;
        authorName.style = "margin-left: 10px;";

        let authorProfilePic = document.createElement("p");
        authorProfilePic.className = "defaultProfilePicture";
        authorProfilePic.style = `background-color: ${profilePic.content};`;
        authorProfilePic.textContent = comment.userID.username.charAt(0).toUpperCase();

        authorDiv.appendChild(authorName);
        authorDiv.appendChild(authorProfilePic);

        userDiv.appendChild(authorDiv);
    }
    else if (profilePic.type === "custom") {
        let authorDiv = document.createElement("div");
        authorDiv.className = "author-info";

        let authorName = document.createElement("p");
        authorName.textContent = comment.userID.username;
        authorName.style = "margin-left: 10px;";
        
        let authorProfilePic = document.createElement("img");
        authorProfilePic.className = "profilePicture";
        authorProfilePic.src = `https://storage.liscitransmitter.live/${profilePic.content}`;
        authorProfilePic.alt = comment.userID.username;
        headerDiv.appendChild(authorProfilePic);

        authorDiv.appendChild(authorName);
        authorDiv.appendChild(authorProfilePic);

        userDiv.appendChild(authorDiv);
    }

    let buttonRow = document.createElement("div");
    buttonRow.className = "button-row";

    commentDiv.appendChild(contentContainer);
    commentDiv.appendChild(buttonRow);

    if (comment.canEdit) {
        let editButton = document.createElement("button");
        editButton.className = "edit-button button";
        editButton.type = "button";
        editButton.onclick = () => editComment(comment._id);

        let editIcon = document.createElement("img");
        editIcon.className = "icon";
        editIcon.src = "/icons/edit.svg";

        let editLabel = document.createElement("p");
        editLabel.className = "button-label";
        editLabel.textContent = "Edit";

        editButton.appendChild(editIcon);
        editButton.appendChild(editLabel);
        
        buttonRow.appendChild(editButton);

        let deleteButton = document.createElement("button");
        deleteButton.className = "delete-button button";
        editButton.type = "button";
        deleteButton.onclick = () => deleteComment(comment._id);
        let deleteIcon = document.createElement("img");
        deleteIcon.className = "icon";
        deleteIcon.src = "/icons/delete.svg";

        let deleteLabel = document.createElement("p");
        deleteLabel.className = "button-label";
        deleteLabel.textContent = "Delete";

        deleteButton.appendChild(deleteIcon);
        deleteButton.appendChild(deleteLabel);

        buttonRow.appendChild(deleteButton);
    }


    commentContainer.appendChild(commentDiv);
}

function deleteComment(commentID) {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    fetch('internal/deleteComment', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ commentID }),
    });
    window.location.reload();
}

function editComment(commentID) {
    const commentDiv = document.querySelector(`[data-id="${commentID}"]`);
    const content = commentDiv.querySelector('.content');
    const contentText = content.textContent;
    const contentInput = document.createElement('input');
    contentInput.value = contentText;
    contentInput.className = 'content';
    contentInput.id = 'contentInput';

    content.replaceWith(contentInput);

    const buttonRow = commentDiv.querySelector('.button-row');
    const editButton = buttonRow.querySelector('.edit-button');
    editButton.innerHTML = 'Save';
    editButton.onclick = () => saveComment(commentID);
}

async function saveComment(commentID) {
    const commentDiv = document.querySelector(`[data-id="${commentID}"]`);
    const contentInput = commentDiv.querySelector('.content');
    const content = contentInput.value;

    await fetch('internal/updateComment', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ commentID, content }),
    });
    window.location.reload();
}