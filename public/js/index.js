async function loadPosts(page, filter) {
    return await fetch(`internal/getPosts?page=${page}&filter=${filter}`);
}

const urlParams = new URLSearchParams(window.location.search);
const page = urlParams.get('page') || 1;
const postsRequest = loadPosts(page, "all");
const newsRequest = loadPosts(page, "news");

let posts = [];
let news = [];

const reloadContent = async () => {
    const onlyNewsFilter = document.getElementById("onlyNews").checked;

    const postsRequest = loadPosts(page, "all");
    const newsRequest = loadPosts(page, "news");

    const newsJson = await (await newsRequest).json();
    const postsJson = await (await postsRequest).json();

    news = newsJson.posts;
    posts = postsJson.posts;

    const selectedPosts = onlyNewsFilter ? news : posts;
    renderPosts(selectedPosts);
};

async function renderPosts(selectedPosts) {
    const postBox = document.getElementById("postBox");

    if (selectedPosts instanceof Promise) {
        selectedPosts = await selectedPosts;
    }
    console.log(selectedPosts);
    postBox.innerHTML = "";
    selectedPosts.forEach(post => {
        buildPost(post)
    });

    loadLanguage(true);
}

function buildPageSelector(page, totalPages, newsPages, postsPages) {
    const onlyNewsCheckbox = document.getElementById("onlyNews");
    const pageSelector = document.getElementById("pageSelector");
    pageSelector.innerHTML = "";

    if (totalPages <= 1) {
        return;
    }
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement("a");
        pageButton.className = i == page ? "active" : "";
        pageButton.innerText = i;
        pageButton.onclick = () => changePage(i, newsPages, postsPages, onlyNewsCheckbox.checked);
        pageSelector.appendChild(pageButton);
    }

    return;
}

document.addEventListener('DOMContentLoaded', async () => {
    const onlyNewsFilter = urlParams.get('onlyNews') == "true" || false;
    const onlyNewsCheckbox = document.getElementById("onlyNews");

    onlyNewsCheckbox.checked = onlyNewsFilter;

    const newsJson = await (await newsRequest).json();
    const postsJson = await (await postsRequest).json();

    news = newsJson.posts;
    posts = postsJson.posts;

    const newsPages = Math.ceil(newsJson.totalPosts / newsJson.pageSize);
    const postsPages = Math.ceil(postsJson.totalPosts / postsJson.pageSize);

    const selectedPosts = onlyNewsFilter ? news : posts;
    const totalPages = onlyNewsCheckbox.checked ? newsPages : postsPages;
    renderPosts(selectedPosts);

    buildPageSelector(page, totalPages, newsPages, postsPages);

    if (document.getElementById("prank")) {
        prank();
    }


    var modal = document.getElementById('commentModal');

    window.onclick = function (event) {
        if (event.target == modal) {
            hideComments();
        }
    }

    window.ontouchstart = function (event) {
        if (event.target == modal) {
            hideComments();
        }
    }

    document.getElementById("modalClose").addEventListener("click", () => {
        hideComments();
    });

    onlyNewsCheckbox.addEventListener("change", async () => {
        const page = urlParams.get('page') || 1;
        changePage(page, newsPages, postsPages, onlyNewsCheckbox.checked);
    });
});


function prank() {
    function showPrank() {
        setTimeout(() => {
            document.getElementById("prank").style.display = "block";

            setTimeout(() => {
                document.getElementById("prank").style.display = "none";
                showPrank();
            }, 5000);
        }, Math.floor(Math.random() * 1000 * 60 * 5) + 5000);

    }
    showPrank();
}

async function changePage(page, newsPages, postsPages) {
    const params = new URLSearchParams(window.location.search);
    params.set('page', page);
    params.set('onlyNews', document.getElementById("onlyNews").checked);
    if (history.pushState) {
        var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?' + params.toString();
        window.history.pushState({ path: newurl }, '', newurl);

        const onlyNewsCheckbox = document.getElementById("onlyNews");
        const totalPages = onlyNewsCheckbox.checked ? newsPages : postsPages;

        if (page > totalPages) {
            console.log("Page out of bounds");
            changePage(totalPages, totalPages);
            return;
        }
        const onlyNewsFilter = onlyNewsCheckbox.checked;

        const postsRequest = loadPosts(page, "all");
        const newsRequest = loadPosts(page, "news");

        const newsJson = await (await newsRequest).json();
        const postsJson = await (await postsRequest).json();

        news = newsJson.posts;
        posts = postsJson.posts;

        const selectedPosts = onlyNewsFilter ? news : posts;
        renderPosts(selectedPosts);

        buildPageSelector(page, totalPages, newsPages, postsPages);
    } else {
        window.location.search = params.toString();
    }
}