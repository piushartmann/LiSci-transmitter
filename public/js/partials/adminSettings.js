let allUsers = [];
const allPermissions = ['admin', 'classmate', 'writer', 'push'];

document.addEventListener('DOMContentLoaded', async () => {
    const userAutoComplete = document.getElementById('userAutoComplete');

    allUsers = await fetch('internal/getAllUsers')
        .then(response => response.json());
    const allUsernames = allUsers.map(user => user.username);
    autocomplete(userAutoComplete, allUsernames);

    const addUserButton = document.getElementById('createUserSubmit');

    addUserButton.onclick = async () => {
        const username = document.getElementById('createUserUsername').value;
        const password = document.getElementById('createUserPasswort').value;

        fetch('internal/settings/createUser', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                password: password,
            }),
        }).then((data) => data.ok ? window.location.reload() : console.log('Failed to create user'));

    };
});

function selectUser(username) {
    document.getElementById('userAutoComplete').value = '';
    const user = allUsers.find(user => user.username === username);
    const editUserSetting = document.getElementById('setUserPermissions');
    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay) {
        editUserSetting.removeChild(userDisplay);
    }
    editUserSetting.appendChild(buildUserDisplay(user));
}

function buildUserDisplay(user) {
    const userDisplay = document.createElement('div');
    userDisplay.className = 'userDisplay';
    userDisplay.id = "userDisplay"

    const usernameLabel = document.createElement('h3');
    usernameLabel.textContent = 'Username';
    usernameLabel.className = 'setting-label';

    const permissionsLabel = document.createElement('h3');
    permissionsLabel.textContent = 'Permissions';
    permissionsLabel.className = 'setting-label';

    const newPasswordLabel = document.createElement('h3');
    newPasswordLabel.textContent = 'New Password';
    newPasswordLabel.className = 'setting-label';

    const preferencesLabel = document.createElement('h3');
    preferencesLabel.textContent = 'Preferences';
    preferencesLabel.className = 'setting-label';

    const usernameEdit = document.createElement('input');
    usernameEdit.type = 'checkbox';
    usernameLabel.appendChild(usernameEdit);
    usernameEdit.onchange = () => {
        if (usernameEdit.checked) {
            username.disabled = false;
        } else {
            username.disabled = true;
        }
    };

    const permissionsEdit = document.createElement('input');
    permissionsEdit.type = 'checkbox';
    permissionsLabel.appendChild(permissionsEdit);
    permissionsEdit.onchange = () => {
        if (permissionsEdit.checked) {
            permissions.querySelectorAll('input').forEach(input => input.disabled = false);
        } else {
            permissions.querySelectorAll('input').forEach(input => input.disabled = true);
        }
    };

    const newPasswordEdit = document.createElement('input');
    newPasswordEdit.type = 'checkbox';
    newPasswordLabel.appendChild(newPasswordEdit);
    newPasswordEdit.onchange = () => {
        if (newPasswordEdit.checked) {
            newPassword.disabled = false;
        } else {
            newPassword.disabled = true;
        }
    }

    const preferencesEdit = document.createElement('input');
    preferencesEdit.type = 'checkbox';
    preferencesLabel.appendChild(preferencesEdit);
    preferencesEdit.onchange = () => {
        if (preferencesEdit.checked) {
            preferences.querySelectorAll('input').forEach(input => input.disabled = false);
        } else {
            preferences.querySelectorAll('input').forEach(input => input.disabled = true);
        }
    }

    const username = document.createElement('input');
    username.type = 'text';
    username.value = user.username;
    username.disabled = true;
    userDisplay.appendChild(username);

    const permissions = document.createElement('div');
    permissions.className = 'permissions';

    allPermissions.forEach(permission => {
        const permissionDiv = document.createElement('div');
        permissionDiv.className = 'permission';

        const permissionLabel = document.createElement('label');
        permissionLabel.textContent = permission;
        permissionDiv.appendChild(permissionLabel);

        const permissionCheckbox = document.createElement('input');
        permissionCheckbox.type = 'checkbox';
        permissionCheckbox.disabled = true;
        permissionCheckbox.checked = user.permissions.includes(permission);
        permissionCheckbox.onchange = () => {
            if (permissionCheckbox.checked) {
                user.permissions.push(permission);
            } else {
                user.permissions = user.permissions.filter(p => p !== permission);
            }
        }
        permissionDiv.appendChild(permissionCheckbox);

        permissions.appendChild(permissionDiv);
    });

    const newPassword = document.createElement('input');
    newPassword.type = 'password';
    newPassword.placeholder = 'New Password';
    newPassword.disabled = true;

    const preferences = document.createElement('div');
    preferences.className = 'preferences';
    if (user.preferences) {

        user.preferences.forEach(preference => {
            const preferenceDiv = document.createElement('div');
            preferenceDiv.className = 'preference';

            const preferenceLabel = document.createElement('label');
            preferenceLabel.textContent = preference.key;
            preferenceDiv.appendChild(preferenceLabel);

            if (typeof preference.value === 'object') {
                for (const key in preference.value) {
                    if (preference.value.hasOwnProperty(key)) {
                        const subPreferenceDiv = document.createElement('div');
                        subPreferenceDiv.className = 'sub-preference';

                        const subPreferenceLabel = document.createElement('label');
                        subPreferenceLabel.textContent = key;
                        subPreferenceDiv.appendChild(subPreferenceLabel);

                        const subPreferenceInput = document.createElement('input');
                        subPreferenceInput.type = 'text';
                        subPreferenceInput.disabled = true;
                        subPreferenceInput.value = preference.value[key];
                        subPreferenceInput.onchange = () => {
                            preference.value[key] = subPreferenceInput.value;
                        }
                        subPreferenceDiv.appendChild(subPreferenceInput);

                        preferenceDiv.appendChild(subPreferenceDiv);
                    }
                }
            } else {
                const preferenceInput = document.createElement('input');
                preferenceInput.type = 'text';
                preferenceInput.disabled = true;
                preferenceInput.value = preference.value;
                preferenceInput.onchange = () => {
                    preference.value = preferenceInput.value;
                }
                preferenceDiv.appendChild(preferenceInput);
            }

            preferences.appendChild(preferenceDiv);
        });
    }

    const submitButton = document.createElement('button');
    submitButton.textContent = 'Submit';
    submitButton.onclick = async () => {
        console.log(user);
        await fetch('internal/settings/updateUserData', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: user._id,
                username: usernameEdit.checked ? username.value : undefined,
                password: newPasswordEdit.checked ? (newPassword.value ? newPassword.value : undefined) : undefined,
                permissions: permissionsEdit.checked ? user.permissions : undefined,
                preferences: preferencesEdit.checked ? user.preferences : undefined,
            }),
        });
        window.location.reload();
    };

    userDisplay.appendChild(usernameLabel);
    userDisplay.appendChild(username);
    userDisplay.appendChild(permissionsLabel);
    userDisplay.appendChild(permissions);
    userDisplay.appendChild(newPasswordLabel);
    userDisplay.appendChild(newPassword);
    userDisplay.appendChild(preferencesLabel);
    userDisplay.appendChild(preferences);
    userDisplay.appendChild(submitButton);

    return userDisplay;
}