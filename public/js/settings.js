let registration = null;

document.addEventListener('DOMContentLoaded', async () => {
    await registerServiceWorker();
    button = document.getElementById('enablePush');
    if (button) button.addEventListener('click', enablePush);

    const profilePictureColorPicker = document.getElementById('profilePictureColorPicker');
    const profilePicturePreview = document.getElementById('profilePicturePreview');
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
}

async function registerServiceWorker() {
    // A service worker must be registered in order to send notifications on iOS
    if ('serviceWorker' in navigator) {
        registration = await navigator.serviceWorker.register(
            "push/serviceworker.js",
            {
                scope: "push/",
            }
        );
    } else {
        button = document.getElementById('enablePush');
        button.disabled = true;
    }
    console.log("Service Worker registered with scope: ", registration);
}

async function enablePush() {
    const result = await window.Notification.requestPermission();

    if (result === "granted") {
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