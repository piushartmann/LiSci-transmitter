let registration = null;

document.addEventListener('DOMContentLoaded', async () => {
    await registerServiceWorker();
    button = document.getElementById('enablePush');
    button.addEventListener('click', enablePush);

    const profilePictureColorPicker = document.getElementById('profilePictureColorPicker');
    const profilePicturePreview = document.getElementById('profilePicturePreview');
    profilePictureColorPicker.addEventListener('input', () => {
        profilePicturePreview.style.backgroundColor = profilePictureColorPicker.value;
    });

    profilePicturePreview.addEventListener('click', () => {
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
});

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