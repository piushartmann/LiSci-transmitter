let invited = [];
let invites = [];
let discoveredUsers = [];
let discoverGame = null;

function buildDiscoveryList() {
    const playerConnections = getModal('multiplayerModal').querySelector('.modal-content #playerConnections');
    playerConnections.innerHTML = '';
    discoveredUsers.forEach(player => {
        const playerElement = buildButton("icons/games/connect.svg", player.username, () => {
            if (invited.includes(player.userID)) {
                playerElement.classList.remove('invited');
                invited = invited.filter(p => p !== player.userID);
                uninvitePlayer(discoverGame, player.userID);
            }
            else {
                playerElement.classList.add('invited');
                invited.push(player.userID);
                invitePlayer(discoverGame, player.userID);
            }
        });

        if (invited.includes(player.userID)) {
            playerElement.classList.add('invited');
        }

        playerElement.classList.add('player');
        playerElement.dataset.userid = player.userID;
        playerConnections.appendChild(playerElement);
    });
}

function inviteDeclined(userID) {
    const player = document.querySelector(`.player[data-userid="${userID}"]`);
    console.log(player);
    if (player) {
        invited = invited.filter(p => p !== userID);
        player.classList.remove('invited');
    }
}

function playSinglePlayer(game) {
    console.log("Playing single player");
    console.log(game);

    fetch(`/games/${game}/startGame`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    }).then(async (res) => {
        if (res.ok) {
            const data = await res.json();
            window.location.href = `/games/${game}/${data.gameID}`;
        }
    });
}

function playSinglePlayerWithDifficulties(game, difficulties) {
    difficulties = JSON.parse(difficulties);

    const modal = openModal('difficultiesModal');
    difficultiesElement = modal.querySelector('#difficulties');

    difficultiesElement.innerHTML = '';
    for (const difficulty of difficulties) {
        const difficultyElement = buildButton("", difficulty, () => {
            fetch(`/games/${game}/startGame`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ difficulty: difficulty })
            }).then(async (res) => {
                if (res.ok) {
                    const data = await res.json();
                    window.location.href = `/games/${game}/${data.gameID}`;
                }
            });
        });
        difficultiesElement.appendChild(difficultyElement);
    }
}

function invitePlayer(game, player) {
    console.log("Playing multiplayer");
    console.log(game);
    console.log(player);

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'invite', "user": player, "game": game }));
    }
    else {
        console.log("Websocket not open");
    }
}

function uninvitePlayer(game, player) {
    console.log("Uninviting player");
    console.log(game);
    console.log(player);

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'uninvite', "user": player, "game": game }));
    }
    else {
        console.log("Websocket not open");
    }
}

function discoverOtherPlayers(game) {
    console.log("Discovering other players");

    openModal('multiplayerModal');

    buildDiscoveryList();

    discoverGame = game;

    const createInviteButton = document.getElementById('createInviteButton');
    createInviteButton.onclick = () => {
        createInviteLink(game);
    }
}

function hideDiscovery() {
    hideModal();
    discoverGame = null;
}

function createInviteLink(game) {
    console.log("Creating invite link");

    fetch(`/games/${game}/newInviteLink`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    }).then(async (res) => {
        if (res.ok) {
            const data = await res.json();
            console.log(data);
            const inviteLink = document.getElementById('inviteLink');
            const copyLink = document.getElementById('copyLink');
            inviteLink.value = data.invite;
            inviteLink.style.display = 'block';
            copyLink.style.display = 'block';
            copyLink.onclick = async () => {
                shareData = { url: data.invite }
                if (navigator.share && navigator.canShare(shareData)) {
                    try {
                        await navigator.share(shareData);
                        console.log("Data was shared successfully");
                    } catch (err) {
                        alert("Error: " + err);
                    }
                } else {
                    inviteLink.select();
                    document.execCommand('copy');
                    copyLink.innerText = "Copied!";
                }
            }
            loadLanguage(true);
        }
    });
}