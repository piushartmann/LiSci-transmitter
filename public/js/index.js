function loadPosts(page) {
    fetch(`internal/getPosts?page=${page}`)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            data.forEach(post => {
                buildPost(post);
            });
        });
}

window.onload = function () {

    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page') || 1;

    loadPosts(page);
};