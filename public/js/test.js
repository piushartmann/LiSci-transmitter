const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('video');

let stream;

document.addEventListener('DOMContentLoaded', async () => {

    const captureDiv = document.getElementById('capture');

    getStream(captureDiv);

    setInterval(async () => {
        const counter = document.getElementById('counter');
        counter.innerText = parseInt(counter.innerText) + 1;
    }, 1000);

    var airPlay = document.getElementById('airplay');

    // Airplay
    if (window.WebKitPlaybackTargetAvailabilityEvent) {
        video.addEventListener('webkitplaybacktargetavailabilitychanged', function (event) {
            switch (event.availability) {
                case "available":
                    airPlay.style.display = 'block';
                    break;
                default:
                    airPlay.style.display = 'none';
            }
            airPlay.addEventListener('click', function () {
                video.webkitShowPlaybackTargetPicker();
            });
        });
    } else {
        airPlay.style.display = 'none';
    }

});

document.addEventListener('focus', async () => {

    video.play();

});

async function getImageFromDiv(div) {
    const width = video.clientWidth;
    const height = video.clientHeight;
    const pngDataUrl = await domtoimage.toPng(div, { width, height });
    const img = new Image(width, height);
    img.src = pngDataUrl;
    ctx.drawImage(img, 0, 0);
    return img;
}

function reziseCanvas(div) {

    if (canvas.style.width != div.clientWidth + "px" || canvas.style.height != div.clientHeight + "px" || canvas.width != div.clientWidth || canvas.height != div.clientHeight) {
        canvas.style.width = div.clientWidth + "px";
        canvas.style.height = div.clientHeight + "px";
        canvas.width = div.clientWidth;
        canvas.height = div.clientHeight;
        video.width = div.clientWidth;
        video.height = div.clientHeight;
        video.style.width = div.clientWidth + "px";
        video.style.height = div.clientHeight + "px";
    }
}


async function getStream(div) {
    // Capture the canvas stream at 30 FPS
    const stream = canvas.captureStream(30);

    // Assign stream to the video element
    video.srcObject = stream;
    video.muted = true; // Mute to prevent audio feedback

    // Update canvas regularly
    setInterval(() => {
        reziseCanvas(div);
        getImageFromDiv(div);
    }, 1000 / 30);

    video.play();

    return stream;
}

async function startWebRTCStream(div) {
    reziseCanvas(div);

    const stream = canvas.captureStream(30); // 30 FPS

    // Continuously render the div to the canvas
    setInterval(async () => {
        await getImageFromDiv(div);
        reziseCanvas(div);
    }, 1000 / 30);

    // Create a WebRTC PeerConnection
    const peerConnection = new RTCPeerConnection();

    // Add canvas stream to the connection
    stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

    // Generate SDP offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // Mock receiving the SDP answer (normally requires a signaling server)
    // Simulating a loopback for local testing
    peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    console.log('WebRTC stream started.');

    return stream;
}