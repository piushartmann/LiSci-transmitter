function loadPosts(page) {
    fetch(`internal/getPosts?page=${page}`)
        .then(response => response.json())
        .then(data => {
            data.forEach(post => {
                buildPost(post);
            });
        });
}

window.onload = function () {

    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page') || 1;

    loadPosts(page);

    if (document.getElementById("prank")) {
        prank();
    }

};

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