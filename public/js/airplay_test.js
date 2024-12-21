const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('video');

let stream;

document.addEventListener('DOMContentLoaded', async () => {

    const captureDiv = document.getElementById('capture');

    document.getElementById('captureButton').addEventListener('click', async () => {
        await getStream(captureDiv);
    });

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
    const stream = canvas.captureStream(30);
    const isSupported = MediaRecorder.isTypeSupported('video/webm;codecs=vp9');
    const mimeType = isSupported ? 'video/webm;codecs=vp9' : 'video/mp4;codecs=avc1';
    const recorder = new MediaRecorder(stream, { mimeType });
    const mediaSource = new MediaSource();


    // Set up the video to use MediaSource
    video.src = URL.createObjectURL(mediaSource);
    video.play();


    let sourceBuffer;
    let queue = []; // To queue buffers if sourceBuffer is not ready
    let sourceOpen = false;

    mediaSource.addEventListener('sourceopen', () => {
        mediaSource.duration = 99999;
        sourceBuffer = mediaSource.addSourceBuffer(mimeType);
        sourceBuffer.duration = 99999;
        sourceBuffer.mode = 'sequence';
        sourceBuffer.changeType('video/webm; codecs="vp9"');
        sourceOpen = true;

        // If we had queued up any data before the source opened:
        while (queue.length > 0) {
            appendBuffer(sourceBuffer, queue.shift());
        }
    });

    function appendBuffer(sb, buffer) {
        if (sb.updating) {
            sb.addEventListener('updateend', function handler() {
                sb.removeEventListener('updateend', handler);
                appendBuffer(sb, buffer);
            });
        } else {
            sb.appendBuffer(buffer);
        }
    }

    recorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
            const arrayBuffer = await e.data.arrayBuffer();
            if (sourceOpen && !sourceBuffer.updating) {
                // Append directly if ready
                appendBuffer(sourceBuffer, arrayBuffer);
            } else {
                // Queue if SourceBuffer isn't ready yet
                queue.push(arrayBuffer);
            }
        }
    };

    recorder.start(500); // Get a data chunk every second

    // Update the canvas regularly
    setInterval(() => {
        reziseCanvas(div);
        getImageFromDiv(div);
    }, 1000 / 10);
}