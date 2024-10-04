function showLoginPopup() {
    document.getElementById("loginPopup").style.display = "block";
}

function hideLoginPopup() {
    document.getElementById("loginPopup").style.display = "none";
}

function logout() {
    window.location.href = '/internal/logout';
}