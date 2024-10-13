function showLoginPopup() {
    document.getElementById("loginPopup").style.display = "block";
}

function hideLoginPopup() {
    document.getElementById("loginPopup").style.display = "none";
}

function logout() {
    window.location.href = '/internal/logout';
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