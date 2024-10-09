let registration = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await run();
    } catch (error) {
        await log(error);
    }
});

async function run() {
    // A service worker must be registered in order to send notifications on iOS
    if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register(
            "push/serviceworker.js",
            {
                scope: "push/",
            }
        );
        log("Service Worker registered with scope: ", registration);
    } else {
        log("Service Worker API is not supported in this browser.");
    }
    console.log("Service Worker registered with scope: ", registration);

    const button = document.getElementById("enablePush");

    button.addEventListener("click", async () => {
        const result = await window.Notification.requestPermission();

        if (result === "granted") {
            const subscription = await registration.pushManager.subscribe({
                applicationServerKey:
                    "BA6ytZNJcaQnbML4C9w17snFJ_S5KmOzQamZddcchIPuyVPMfDBhNNvzCVkyUMxraUa-mfi8wBHP1gkyCDl50QA",
                userVisibleOnly: true,
            });

            await fetch("/save-subscription", {
                method: "post",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(subscription),
            });

            window.location.reload();
        }
    });
}

async function log(message) {
    const response = await fetch('/internal/log', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: message.toString(), type: typeof message })
    });
    console.log('Log response:', response);
}