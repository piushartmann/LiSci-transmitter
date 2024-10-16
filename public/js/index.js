async function loadPosts(page, filter) {
    return await fetch(`internal/getPosts?page=${page}&filter=${filter}`);
}

document.addEventListener('DOMContentLoaded', async () => {

    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page') || 1;
    const onlyNewsFilter = urlParams.get('onlyNews') == "true" || false;

    const posts = await (await loadPosts(page, onlyNewsFilter ? "news" : "all")).json();
    posts.forEach(post => {
        buildPost(post);
    });

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

    const onlyNews = document.getElementById("onlyNews");
    onlyNews.checked = onlyNewsFilter;

    onlyNews.addEventListener("change", async () => {
        const params = new URLSearchParams(window.location.search);
        params.set('onlyNews', onlyNews.checked);
        params.set('page', 1);
        window.location.href = `${window.location.pathname}?${params.toString()}`;
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

function changePage(page){
    const params = new URLSearchParams(window.location.search);
    params.set('page', page);
    window.location.href = `${window.location.pathname}?${params.toString()}`;
}