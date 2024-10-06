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
            }, 1000);
        }, Math.floor(Math.random() * 30000) + 500);

    }
    showPrank();
}