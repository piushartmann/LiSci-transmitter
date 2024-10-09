let registration = null;

document.addEventListener('DOMContentLoaded', async () => {
    await registerServiceWorker();
    button = document.getElementById('enablePush');
    button.addEventListener('click', enablePush);
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
        console.log("Service Worker registered with scope: ", registration);
    } else {
        console.log("Service Worker API is not supported in this browser.");
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

        await fetch("/pushSubscribe", {
            method: "post",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(subscription),
        });

        window.location.reload();
    }
}