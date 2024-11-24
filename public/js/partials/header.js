function showLoginPopup() {
    document.getElementById("loginPopup").style.display = "block";
}

function hideLoginPopup() {
    document.getElementById("loginPopup").style.display = "none";
}

function logout() {
    fetch('internal/logout', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => {
            console.log(response);
            if (response.status === 200) {
                window.location.reload();
            }
        });
}

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('internal/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username, password: password }),
    })
        .then(response => {
            if (response.status === 200) {
                window.location.reload();
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