function logout() {
    fetch('/internal/logout', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => {
            console.log(response);
            if (response.status === 200) {
                window.location.href = '/';
            }
        });
}

function toggleMenu() {
    const menu = document.getElementById("userMenu");
    if (menu.style.display === "none") {
        menu.style.display = "block";

    } else {
        menu.style.display = "none";
    }
}

function hideMenu() {
    document.getElementById("userMenu").style.display = "none";
}

function toggleMobileMenu() {
    const menu = document.getElementById("mobileMenu");
    if (menu.style.display === "none") {
        menu.style.display = "block";
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                hideMenu();
            }
        });

    } else {
        menu.style.display = "none";
    }
}

function hideMobileMenu() {
    document.getElementById("mobileMenu").style.display = "none";
}