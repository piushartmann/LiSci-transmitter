async function removeImagesFromHTML(htmlString) {
    // Create a new DOM parser
    const parser = new DOMParser();
    // Parse the HTML string into a document
    const doc = parser.parseFromString(htmlString, 'text/html');

    // Get all image elements
    const images = doc.querySelectorAll('img');

    // Iterate through each image, extract the src, and remove it from the document
    for (const img of images) {
        if (img.src) {
            img.src = await handleInlineImages(img.src);
        }
    }

    // Return an object with the cleaned HTML and the array of image sources
    return doc.body.innerHTML;
}

async function handleInlineImages(imageSource) {
    if (imageSource.startsWith('data:image')) {
        const byteString = atob(imageSource.split(',')[1]);
        const mimeString = imageSource.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        const formData = new FormData();
        const extension = mimeString.split('/')[1];
        formData.append('upload', blob, `image.${extension}`);
        const response = await fetch('/internal/uploadImage', {
            method: 'POST',
            body: formData,
            enctype: 'multipart/x-www-form-urlencoded',
        });
        const result = await response.text();
        return `https://storage.liscitransmitter.live/${result}`;
    }
    else {
        return imageSource;
    }
}


async function submitPost() {
    const title = document.getElementById('title').value;
    const content = await removeImagesFromHTML(document.getElementById('content-editable').innerHTML);
    const upload = document.getElementById('upload').files[0];
    const teachersafe = document.getElementById('teachersafe').checked;

    const formData = new URLSearchParams();
    formData.append('title', title);
    formData.append('content', content);
    if (upload) {
        formData.append('upload', upload);
    }
    formData.append('teachersafe', teachersafe);

    try {
        const response = await fetch('internal/createPost', {
            method: 'POST',
            body: formData,
            enctype: 'multipart/x-www-form-urlencoded',
        });

        if (response.ok) {
            window.location.replace('/');
        } else {
            alert('Failed to create post.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while creating the post.');
    }
}