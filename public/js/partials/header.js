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
    const background = document.getElementById("menuBackground");
    const menu = document.getElementById("userMenu");
    menu.classList.remove('menuHidden');
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            hideMenu();
            background.style.display = "none";
        }
    });
    background.style.display = "block";
}

function hideMenu() {
    document.getElementById("userMenu").classList.add('menuHidden');
}

function preventDefault(e) {
    e.preventDefault();
}

function toggleMobileMenu() {
    const background = document.getElementById("mobileMenuBackground");
    const menu = document.getElementById("mobileMenu");
    menu.classList.remove('menuHidden');
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            hideMobileMenu();
            background.style.display = "none";
        }
    });
    background.style.display = "block";

    window.addEventListener('touchmove', preventDefault, { passive: false });
}

function hideMobileMenu() {
    document.getElementById("mobileMenu").classList.add('menuHidden');
    window.removeEventListener('touchmove', preventDefault);
}

let isMobile = false;
function updateMobileStatus() {
    if (window.innerWidth < 768) {
        if (isMobile) return;
        isMobile = true;
        document.addEventListener('touchstart', swipeEventListener);
        document.addEventListener('dragstart', swipeEventListener);
    }
    else {
        if (!isMobile) return;
        isMobile = false;
        document.removeEventListener('touchstart', swipeEventListener);
        document.removeEventListener('dragstart', swipeEventListener);
    }
};

function swipeEventListener(event) {
    const touch = event.touches[0];
    const startX = touch.clientX;

    function preventDefault(e) {
        e.preventDefault();
    }

    function handleTouchMove(e) {
        const moveTouch = e.touches[0];
        const moveX = moveTouch.clientX;

        if (startX > window.innerWidth - 50 && moveX < startX - 30) {
            toggleMobileMenu();
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            document.removeEventListener('touchmove', handleTouchMove);

            function disableScroll() {
                window.addEventListener('touchmove', preventDefault, { passive: false });
            }
            disableScroll();
        }
    }
    
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', () => {
        document.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchmove', preventDefault, { passive: false });
    }, { once: true });
}

document.addEventListener('DOMContentLoaded', () => {
    updateMobileStatus();
    window.addEventListener('resize', updateMobileStatus);

    const background = document.getElementById("menuBackground");
    background.addEventListener('click', () => {
        background.style.display = "none";
        hideMenu();
    });
    const mobileBackground = document.getElementById("mobileMenuBackground");
    mobileBackground.addEventListener('click', () => {
        mobileBackground.style.display = "none";
        hideMobileMenu();
    });
})