function loadPosts(page) {
    filter = document.getElementById("onlyNews").checked ? "news" : "all";
    fetch(`internal/getPosts?page=${page}&filter=${filter}`)
        .then(response => response.json())
        .then(data => {
            data.forEach(post => {
                buildPost(post);
            });
        });
}

document.addEventListener('DOMContentLoaded', async () => {

    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page') || 1;

    loadPosts(page);

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

    document.getElementById("onlyNews").addEventListener("change", () => {
        const onlyNews = document.getElementById("onlyNews").checked;
        const postBox = document.getElementById("postBox");
        postBox.innerHTML = "";
        loadPosts(1);
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