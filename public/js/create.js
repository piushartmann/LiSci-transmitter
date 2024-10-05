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
    section.innerHTML = `<label for="content">Text</label>
        <section contenteditable="true" id="value" class="text-editable" onchange="" required></section>`;
    document.getElementById('section-container').appendChild(section);
    section.id = sections.length;
    console.log(section.id);
    section.addEventListener('input', function () {
        console.log(this.id);
        sections[this.id] = { type: 'text', content: this.querySelector('#value').innerHTML };
    });
    sections[section.id] = { type: 'text', content: section.querySelector('#value').innerHTML };
    section.appendChild(addSectionFooter(section));
    closePopup();
}

function addImageSection() {
    section = document.createElement('div');
    section.className = 'section';
    section.innerHTML = `<label for="upload">Upload Image</label>
          <input type="file" id="value" accept="image/*"></input>
          <img id="preview" class="image-preview" /></img>
          <div class="reziseHandle"></div>`;
    document.getElementById('section-container').appendChild(section);
    section.id = sections.length;
    console.log(section.id);
    imgRezise(section);
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
            sections[section.id] = { type: 'img', content: file, size: section.querySelector('#preview').clientHeight };
        }
    });
    const observer = new ResizeObserver(() => {
        sections[section.id] = { type: 'img', content: section.querySelector('#value').files[0], size: section.querySelector('#preview').clientHeight };
    });
    observer.observe(section.querySelector('#preview'));
    sections[section.id] = { type: 'img', content: section.querySelector('#value').files[0], size: section.querySelector('#preview').clientHeight };
    
    section.appendChild(addSectionFooter(section));
    closePopup();
}

function addFileSection() {
    section = document.createElement('div');
    section.className = 'section';
    section.innerHTML = `<label for="upload">Upload File</label>
          <input type="file" id="value" accept=".pdf,image/*">`;
    document.getElementById('section-container').appendChild(section);
    section.id = sections.length;
    console.log(section.id);
    section.addEventListener('change', function () {
        console.log(this.id);
        sections[this.id] = { type: 'file', content: this.querySelector('#value').files[0] };
    });
    sections[section.id] = { type: 'file', content: section.querySelector('#value').files[0] };
    section.appendChild(addSectionFooter(section));
    closePopup();
}

function addSectionFooter(section) {
    const footer = document.createElement('div');
    footer.className = 'section-footer';
    footer.innerHTML = `<button onclick="removeSection(${section.id})" class="remove-section">Remove Section</button>`;
    return footer;
}

function removeSection(id) {
    document.getElementById('section-container').removeChild(document.getElementById(id));
    sections = sections.filter((section, index) => index != id);
}

function selectSection() {
    document.getElementById('popup').classList.remove('hidden');
}

function closePopup() {
    document.getElementById('popup').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    addTextSection();
});

function imgRezise(element) {

    let pos = 0;
    let elementBeforeHeight;
    let previewBeforeHeight;

    const reziseHandle = element.querySelector('.reziseHandle');
    reziseHandle.addEventListener('mousedown', imgReziseMouseDown);
    reziseHandle.addEventListener('touchstart', imgReziseTouchStart);

    function imgReziseMouseDown(e) {
        e.preventDefault();

        pos = e.clientY;
        elementBeforeHeight = element.clientHeight;
        previewBeforeHeight = element.querySelector('#preview').clientHeight;
        mouseBeforeY = e.clientY;

        document.onmouseup = imgReziseMouseUp;
        document.onmousemove = imgReziseMouseMove;

        padding = parseInt(window.getComputedStyle(element).getPropertyValue('padding-top')) + parseInt(window.getComputedStyle(element).getPropertyValue('padding-bottom'));
    }

    function imgReziseMouseUp() {
        document.onmouseup = null;
        document.onmousemove = null;
    }

    function imgReziseMouseMove(e) {
        e.preventDefault();
        mouseMoved = e.clientY - mouseBeforeY;
        const preview = element.querySelector('#preview');
        const newElementHeight = elementBeforeHeight + mouseMoved - (padding);
        const newPreviewHeight = previewBeforeHeight + mouseMoved;

        if (newElementHeight > 0) {
            element.style.height = newElementHeight + 'px';
            preview.style.height = newPreviewHeight + 'px';
        }
    }

    function imgReziseTouchStart(e) {
        e.preventDefault();

        pos = e.touches[0].clientY;
        elementBeforeHeight = element.clientHeight;
        previewBeforeHeight = element.querySelector('#preview').clientHeight;
        touchBeforeY = e.touches[0].clientY;

        document.ontouchend = imgReziseTouchEnd;
        document.ontouchmove = imgReziseTouchMove;

        padding = parseInt(window.getComputedStyle(element).getPropertyValue('padding-top')) + parseInt(window.getComputedStyle(element).getPropertyValue('padding-bottom'));
    }

    function imgReziseTouchEnd() {
        document.ontouchend = null;
        document.ontouchmove = null;
    }

    function imgReziseTouchMove(e) {
        e.preventDefault();
        touchMoved = e.touches[0].clientY - touchBeforeY;
        const preview = element.querySelector('#preview');
        const newElementHeight = elementBeforeHeight + touchMoved - (padding);
        const newPreviewHeight = previewBeforeHeight + touchMoved;

        if (newElementHeight > 0) {
            element.style.height = newElementHeight + 'px';
            preview.style.height = newPreviewHeight + 'px';
        }
    }
}