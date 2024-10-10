function renderComments(post) {
    const commentModal = document.getElementById('commentModal');
    commentModal.style.display = 'block';

    const commentButton = document.getElementById('commentButton');
    commentButton.onclick = () => submitComment(post);

    const comments = post.comments;

    comments.forEach(comment => {
        buildComment(comment);
    });
}

function hideComments() {
    const commentModal = document.getElementById('commentModal');
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
    console.log(comment);

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
    userDiv.innerHTML = `<p>Von ${comment.userID.username}</p>`;
    contentContainer.appendChild(userDiv);

    let buttonRow = document.createElement("div");
    buttonRow.className = "button-row";

    commentDiv.appendChild(contentContainer);
    commentDiv.appendChild(buttonRow);

    if (comment.canEdit) {
        let deleteButton = document.createElement("button");
        deleteButton.className = "delete-button";
        deleteButton.innerHTML = "Delete";
        deleteButton.onclick = () => deleteComment(comment._id);
        buttonRow.appendChild(deleteButton);

        let editButton = document.createElement("button");
        editButton.className = "edit-button";
        editButton.innerHTML = "Edit";
        editButton.onclick = () => editComment(comment._id);
        buttonRow.appendChild(editButton);
    }


    commentContainer.appendChild(commentDiv);
}

function deleteComment(commentID) {
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