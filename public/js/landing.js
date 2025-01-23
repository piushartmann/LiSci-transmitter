async function login() {
    const username = document.getElementById('username');
    const password = document.getElementById('password');

    response = await fetch('/internal/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username.value, password: password.value }),
    })

    console.log(response.status);

    if (response.status === 200) {
        //window.location.href = '/';
    } else {
        password.value = "";
        document.getElementById('login-form').classList.add('invalid');
        password.focus();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const username = document.getElementById('username');
    const password = document.getElementById('password');

    username.addEventListener('keypress', (e) => {
        if (e.key == "Enter") {
            if (username.value === ""){
                password.focus();
                return;
            }
            if (password.value !== "") {
                login();
            } else {
                password.focus();
            }
        }
    })

    password.addEventListener('keypress', (e) => {
        if (e.key == "Enter") {
            if (password.value === ""){
                username.focus();
                return;
            }
            if (username.value !== "") {
                login();
            } else {
                username.focus();
            }
        }
    })
}) 
