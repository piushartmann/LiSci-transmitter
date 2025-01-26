function renderComments(post) {
    const commentModal = openModal('commentModal', true)

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
    if (!loggedIn) {
        textarea.disabled = true;
        textarea.placeholder = "Please log in to comment";
    }

    loadLanguage(true);
}

function hideComments() {
    const commentModal = hideModal('commentModal');
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
    userDiv.appendChild(buildProfilePic(profilePic, comment.userID.username));

    let buttonRow = document.createElement("div");
    buttonRow.className = "button-row";

    commentDiv.appendChild(contentContainer);
    commentDiv.appendChild(buttonRow);

    if (comment.canEdit) {

        let editButton = buildButton('/icons/edit.svg', 'Edit', () => editComment(comment._id), 'interaction edit');
        editButton.className = 'edit-button button online-only';

        buttonRow.appendChild(editButton);

        let deleteButton = buildButton('/icons/delete.svg', 'Delete', () => deleteComment(comment._id), 'interaction delete');
        deleteButton.className = 'delete-button button online-only';

        buttonRow.appendChild(deleteButton);
    }

    commentContainer.prepend(commentDiv);
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

    let buttonRow = commentDiv.querySelector('.button-row');
    let editButton = buttonRow.querySelector('.edit-button');
    let deleteButton = buttonRow.querySelector('.delete-button');
    editButton.remove();
    deleteButton.remove();

    let saveButton = buildButton('/icons/save.svg', 'Save', () => saveComment(commentID), 'interaction save');
    saveButton.className = 'save-button button';
    buttonRow.appendChild(saveButton);

    let cancelButton = buildButton('/icons/cancel.svg', 'Cancel', () => cancelEditComment(commentID, contentText), 'interaction cancel');
    cancelButton.className = 'cancel-button button';
    buttonRow.appendChild(cancelButton);
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

async function cancelEditComment(commentID, contentText) {
    const commentDiv = document.querySelector(`[data-id="${commentID}"]`);
    const contentInput = commentDiv.querySelector('.content');
    contentInput.replaceWith(contentText);

    let buttonRow = commentDiv.querySelector('.button-row');
    let saveButton = buttonRow.querySelector('.save-button');
    let cancelButton = buttonRow.querySelector('.cancel-button');
    saveButton.remove();
    cancelButton.remove();

    let editButton = buildButton('/icons/edit.svg', 'Edit', () => editComment(commentID), 'interaction edit');
    buttonRow.appendChild(editButton);

    let deleteButton = buildButton('/icons/delete.svg', 'Delete', () => deleteComment(commentID), 'interaction delete');
    buttonRow.appendChild(deleteButton);
    window.location.reload();
}