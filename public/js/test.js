const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('video');

document.addEventListener('DOMContentLoaded', async () => {

    const captureDiv = document.getElementById('capture');

    const captureButton = document.getElementById('captureButton');

    captureButton.onclick = () => {
        const stream = getStream(captureDiv);
        video.srcObject = stream;
        video.play();
    }

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
    const width = div.clientWidth;
    const height = div.clientHeight;
    const pngDataUrl = await domtoimage.toPng(div, { width, height });
    const img = new Image(width, height);
    img.src = pngDataUrl;
    ctx.drawImage(img, 0, 0);
    return img;
}

function getStream(div, fps = 10) {

    canvas.style.width = div.clientWidth + "px";
    canvas.style.height = div.clientHeight + "px";

    canvas.width = div.clientWidth;
    canvas.height = div.clientHeight;

    const stream = canvas.captureStream();

    // Run getImageFromDiv every frame
    setInterval(async () => {
        await getImageFromDiv(div);
    }, 1000 / fps); //set fps

    return stream;
}