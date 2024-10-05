sections = [];

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
        const extension = mimeString.split('/')[1];

        const result = await uploadFile(blob, `image.${extension}`);
        return `https://storage.liscitransmitter.live/${result}`;
    }
    else {
        return imageSource;
    }
}

async function uploadFile(file, name, endpoint) {
    const formData = new FormData();
    formData.append('upload', file, name);
    const response = await fetch(`/internal${endpoint}`, {
        method: 'POST',
        body: formData,
        enctype: 'multipart/x-www-form-urlencoded',
    });
    return await response.text();
}

async function uploadAllFiles() {
    for (const section of sections) {
        if (section.type == 'img' && section.content) {
            section.content = await uploadFile(section.content, section.content.name, "/uploadImage");
        }
        else if (section.type == 'file' && section.content) {
            section.content = await uploadFile(section.content, section.content.name, "/uploadFile");
        }
    }
}


async function submitPost() {
    await uploadAllFiles();
    const title = document.getElementById('title').value;
    const teachersafe = document.getElementById('teachersafe').checked;

    const formData = new URLSearchParams();
    formData.append('title', title);
    formData.append('sections', JSON.stringify(sections));
    formData.append('permissions', teachersafe);

    await fetch('/internal/createPost', {
        method: 'POST',
        body: formData,
        enctype: 'multipart/x-www-form-urlencoded',
    });

    window.location.href = '/';

}

function addTextSection() {
    section = document.createElement('div');
    section.className = 'section';
    section.innerHTML = `<label for="content">Artikel</label>
        <section contenteditable="true" id="value" class="text-editable" onchange="" required></section>`;
    document.getElementById('section-container').appendChild(section);
    section.id = sections.length;
    console.log(section.id);
    section.addEventListener('input', function () {
        console.log(this.id);
        sections[this.id] = { type: 'text', content: this.querySelector('#value').innerHTML };
    });
    sections[section.id] = { type: 'text', content: section.querySelector('#value').innerHTML };
}

function addImageSection() {
    section = document.createElement('div');
    section.className = 'section';
    section.innerHTML = `<label for="upload">Upload Image (Optional)</label>
          <input type="file" id="value" accept="image/*">
          <img id="preview" style="display:none; max-width: 100%; height: auto;" />`;
    document.getElementById('section-container').appendChild(section);
    section.id = sections.length;
    console.log(section.id);
    section.querySelector('#value').addEventListener('change', function () {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const preview = section.querySelector('#preview');
                preview.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
            sections[section.id] = { type: 'img', content: file };
        }
    });
    sections[section.id] = { type: 'img', content: section.querySelector('#value').files[0] };
}

function addFileSection() {
    section = document.createElement('div');
    section.className = 'section';
    section.innerHTML = `<label for="upload">Upload File (Optional)</label>
          <input type="file" id="value" accept=".pdf,image/*">`;
    document.getElementById('section-container').appendChild(section);
    section.id = sections.length;
    console.log(section.id);
    section.addEventListener('change', function () {
        console.log(this.id);
        sections[this.id] = { type: 'file', content: this.querySelector('#value').files[0] };
    });
    sections[section.id] = { type: 'file', content: section.querySelector('#value').files[0] };
}

document.addEventListener('DOMContentLoaded', () => {
    addTextSection();
    addTextSection();
    addImageSection();
});