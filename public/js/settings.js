debug = false;

document.addEventListener('DOMContentLoaded', async () => {
    button = document.getElementById('enablePush');
    if (button) button.addEventListener('click', enablePush);

    const profilePictureColorPicker = document.getElementById('profilePictureColorPicker');
    const profilePicturePreview = document.getElementById('profilePictureColorPreview');
    profilePictureColorPicker.addEventListener('input', () => {
        profilePicturePreview.style.backgroundColor = profilePictureColorPicker.value;
    });

    profilePicturePreview.addEventListener('click', () => {
        profilePictureColorPicker.focus();
        profilePictureColorPicker.click();
    });

    const profilePictureColorSubmit = document.getElementById('profilePictureColorSubmit');
    profilePictureColorSubmit.addEventListener('click', async () => {
        const color = profilePictureColorPicker.value;
        await fetch('internal/setProfilePictureColor', {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ color: color }),
        });
        window.location.reload();
    });

    const newsPushCheckbox = document.getElementById('newsPushCheckbox');
    newsPushCheckbox.addEventListener('change', () => {
        changePushPreference('newsNotifications', newsPushCheckbox.checked);
    });
    const postsPushCheckbox = document.getElementById('postsPushCheckbox');
    postsPushCheckbox.addEventListener('change', () => {
        changePushPreference('postNotifications', postsPushCheckbox.checked);
    });
    const citationPushCheckbox = document.getElementById('citationsPushCheckbox');
    citationPushCheckbox.addEventListener('change', () => {
        changePushPreference('citationNotifications', citationPushCheckbox.checked);
    });
    const commentPushCheckbox = document.getElementById('commentsPushCheckbox');
    commentPushCheckbox.addEventListener('change', () => {
        changePushPreference('commentNotifications', commentPushCheckbox.checked);
    });

    const languageSelect = document.getElementById('language');
    languageSelect.addEventListener('change', async () => {
        if (localStorage.getItem('language') !== languageSelect.value) {
            localStorage.setItem('language', languageSelect.value);
            await fetch('internal/settings/setLanguage', {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ language: languageSelect.value }),
            });
            updateCache('/settings');
            window.location.reload();
        }
    });

});

function changePushPreference(type, value) {
    fetch('internal/settings/setPushPreference', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, value }),
    });
    updateCache('/settings');
}

async function enablePush() {
    const result = await window.Notification.requestPermission();

    if (result === "granted") {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
            applicationServerKey:
                "BA6ytZNJcaQnbML4C9w17snFJ_S5KmOzQamZddcchIPuyVPMfDBhNNvzCVkyUMxraUa-mfi8wBHP1gkyCDl50QA",
            userVisibleOnly: true,
        });

        await fetch("internal/pushSubscribe", {
            method: "post",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(subscription),
        });

        window.location.reload();
    }
}

function onProfilePictureChange(element) {
    console.log('profilePicture changed');
    const file = element.files[0];
    const localUrl = URL.createObjectURL(file);
    const preview = document.getElementById('profilePicturePreview');
    preview.src = localUrl;
    preview.classList.remove('hidden');
    preview.addEventListener('load', () => {
        preview.dataset.originalWidth = preview.clientWidth;
        preview.dataset.originalHeight = preview.clientHeight;
        preview.dataset.originalLeft = preview.offsetLeft;
        preview.dataset.originalTop = preview.offsetTop;
        preview.dataset.maxScale = Math.max(preview.naturalWidth / preview.clientWidth, preview.naturalHeight / preview.clientHeight) * 4;
        preview.dataset.scale = 1;
        document.getElementById('scaleSlider').max = preview.dataset.maxScale;
        computeBounds(element.parentElement, preview);
        if (debug === true) drawDebugRect();
    });
};

function computeBounds(parent, preview, imgScale = 1, parentScale = 10) {
    const xBigger = (preview.dataset.originalWidth * imgScale - parent.clientWidth * parentScale) / 2;
    const yBigger = (preview.dataset.originalHeight * imgScale - parent.clientHeight * parentScale) / 2;
    draggable(preview, { top: yBigger, left: xBigger, right: xBigger, bottom: yBigger });
}

function onScaleChange(element) {
    const scale = element.value;
    const preview = document.getElementById('profilePicturePreview');
    const parent = preview.parentElement.children[0];
    scalePreview(preview, scale);
    preview.dataset.scale = scale;

    computeBounds(parent, preview, scale);
    if (debug === true) drawDebugRect();
}

function scalePreview(preview, scale) {
    // TODO: dont reset position on scale change

    preview.style.width = `${preview.dataset.originalWidth * scale}px`;
    preview.style.height = `${preview.dataset.originalHeight * scale}px`;

    preview.style.left = "unset";
    preview.style.top = "unset";
}

/**
 * 
 * function scalePreview(preview, scale) {
    // TODO: dont reset position on scale change

    preview.style.width = `${preview.dataset.originalWidth * scale}px`;
    preview.style.height = `${preview.dataset.originalHeight * scale}px`;

    const lastRelativeXOffset = (preview.dataset.originalWidth * (preview.dataset.scale - 1) / 2 - preview.dataset.originalLeft) * -1;
    const lastRelativeYOffset = (preview.dataset.originalHeight * (preview.dataset.scale - 1) / 2 - preview.dataset.originalTop) * -1;

    const relativeXOffset = (preview.dataset.originalWidth * (scale - 1) / 2 - preview.dataset.originalLeft) * -1;
    const relativeYOffset = (preview.dataset.originalHeight * (scale - 1) / 2 - preview.dataset.originalTop) * -1;

    const xOffsetDiff = preview.offsetLeft - lastRelativeXOffset;
    const yOffsetDiff = preview.offsetTop - lastRelativeYOffset;

    preview.style.left = Math.round(relativeXOffset + xOffsetDiff) + "px";
    preview.style.top = Math.round(relativeYOffset + yOffsetDiff) + "px";

    console.log(scale, preview.offsetLeft, relativeXOffset, lastRelativeXOffset, xOffsetDiff);
}
 */

function debugSetScale(scale) {
    document.getElementById('scaleSlider').value = scale;
    onScaleChange(document.getElementById('scaleSlider'));
}

function draggable(element, constraints = { top: null, left: null, right: null, bottom: null }) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    element.onmousedown = dragMouseDown;

    //make constraints relative current position
    constraints.top = constraints.top !== null ? element.offsetTop - constraints.top : null;
    constraints.left = constraints.left !== null ? element.offsetLeft - constraints.left : null;
    constraints.right = constraints.right !== null ? element.offsetLeft + constraints.right : null;
    constraints.bottom = constraints.bottom !== null ? element.offsetTop + constraints.bottom : null;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        let newTop = element.offsetTop - pos2;
        let newLeft = element.offsetLeft - pos1;

        // Apply constraints
        if (newTop <= constraints.top && constraints.top != null) newTop = constraints.top;
        if (newLeft <= constraints.left && constraints.left != null) newLeft = constraints.left;
        if (newTop >= constraints.bottom && constraints.bottom != null) newTop = constraints.bottom;
        if (newLeft >= constraints.right && constraints.right != null) newLeft = constraints.right;

        element.style.top = newTop + "px";
        element.style.left = newLeft + "px";

        if (debug === true) drawDebugRect();
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function getPositionOfPreviewWithoutScale() {
    const preview = document.getElementById('profilePicturePreview');
    const relativeX = Math.abs(preview.dataset.originalLeft - preview.offsetLeft) / preview.dataset.originalWidth / preview.dataset.scale;
    const relativeY = Math.abs(preview.dataset.originalTop - preview.offsetTop) / preview.dataset.originalHeight / preview.dataset.scale;

    return { x: relativeX, y: relativeY, scale: preview.dataset.scale };
}

function drawDebugRect() {
    const { x, y, scale } = getPositionOfPreviewWithoutScale();

    const preview = document.getElementById('profilePicturePreview');

    if (document.getElementById('debugCanvas')) {
        document.getElementById('debugCanvas').remove();
    }
    const canvas = document.createElement('canvas');
    canvas.id = 'debugCanvas';
    canvas.width = preview.dataset.originalWidth / scale;
    canvas.height = preview.dataset.originalHeight / scale;
    canvas.style.position = 'absolute';
    canvas.style.top = `${x * preview.dataset.originalHeight}px`;
    canvas.style.left = `${y * preview.dataset.originalWidth}px`;
    canvas.style.background = "red";
    canvas.style.zIndex = 1000;
    document.body.appendChild(canvas);

    if (document.getElementById('debugCanvas2')) {
        document.getElementById('debugCanvas2').remove();
    }
    const canvas2 = document.createElement('canvas');
    canvas2.id = 'debugCanvas2';
    canvas2.width = preview.dataset.originalWidth;
    canvas2.height = preview.dataset.originalHeight;
    canvas2.style.position = 'absolute';
    canvas2.style.background = "green";
    canvas2.style.top = 0;
    canvas2.style.left = 0;
    canvas2.style.zIndex = 999;
    document.body.appendChild(canvas2);
}

function submitProfilePicture() {
    const { x, y, scale } = getPositionOfPreviewWithoutScale();

    console.log(x, y, scale);

    const formData = new FormData();
    formData.append('x', x);
    formData.append('y', y);
    formData.append('scale', scale);
    formData.append('file', document.getElementById('profilePicture').files[0]);

    fetch('internal/uploadProfilePicture', {
        method: 'post',
        body: formData,
    }).then(() => {
        console.log("Profile picture uploaded");
        window.location.reload();
    }).catch((error) => {
        console.error("Error uploading profile picture:", error);
    });
}

function resetProfilePicture() {
    const preview = document.getElementById('profilePicturePreview');
    preview.classList.add('hidden');
    preview.src = '';
    preview.style.width = '';
    preview.style.height = '';
    preview.style.left = '';
    preview.style.top = '';

    fetch('internal/resetProfilePicture', {
        method: 'post',
    }).then(() => {
        console.log("Profile picture reset");
        window.location.reload();
    }).catch((error) => {
        console.error("Error resetting profile picture:", error);
    });
}