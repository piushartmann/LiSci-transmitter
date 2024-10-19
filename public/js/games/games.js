let ws = null;
let invited = [];
let invites = [];
let users = [];

document.addEventListener('DOMContentLoaded', async () => {

    var modal = document.getElementById('connectionModal');

    window.onclick = function (event) {
        if (event.target == modal) {
            hideDiscovery();
        }
    }

    window.ontouchstart = function (event) {
        if (event.target == modal) {
            hideDiscovery();
        }
    }

    document.getElementById("modalClose").addEventListener("click", () => {
        hideDiscovery();
    });
});

function discoverPlayer(game) {
    ws = new WebSocket(window.location.origin.replace(/^http/, 'ws') + `/games/discover`);
    ws.onopen = () => {
        console.log('Connected to server');
    }
    ws.onmessage = (event) => {
        data = JSON.parse(event.data);
        if (data.type === 'discover') {
            users = data.users;
            buildDiscoveryList(users, game);
        }
        else if (data.type === 'gameInvite') {
            invites.push({ "user": data.user, "game": data.gameID });
            buildDiscoveryList(users, game);
        }
        else if (data.type === 'gameUninvite') {
            invites = invites.filter(i => i.user !== data.user);
            buildDiscoveryList(users, game);
        }
        else if (data.type === 'gameAccept') {
            console.log('Game accept received');
            console.log(data);
            if (invited.includes(data.user)) {
                window.location.href = `/games/${data.game}/${data.gameID}`;
            }
        }
    }
    ws.onclose = () => {
        console.log('Disconnected from server');
        const playerConnections = document.getElementById('playerConnections');
        playerConnections.innerHTML = '';
    }
    return ws;
}

function buildDiscoveryList(players, game) {
    const playerConnections = document.getElementById('playerConnections');
    playerConnections.innerHTML = '';
    players.forEach(player => {
        const playerElement = buildButton("icons/games/connect.svg", player.username, () => {
            if (invited.includes(player.userID)) {
                playerElement.classList.remove('invited');
                invited = invited.filter(p => p !== player.userID);
                uninvitePlayer(game, player.userID);
            }
            else {
                if (invites.find(i => i.user === player.userID)) {
                    acceptInvite(game, player.userID);
                } else {
                    playerElement.classList.add('invited');
                    invited.push(player.userID);
                    invitePlayer(game, player.userID);
                }
            }

        }, player.username);

        if (invited.includes(player.userID)) {
            playerElement.classList.add('invited');
        }

        if (invites.find(i => i.user === player.userID)) {
            playerElement.classList.add('invitedBy');
        }

        playerElement.classList.add('player');
        playerElement.type = 'button';
        playerConnections.appendChild(playerElement);
    });
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

function invitePlayer(game, player) {
    console.log("Playing multiplayer");
    console.log(game);
    console.log(player);

    ws.send(JSON.stringify({ type: 'invite', "user": player, "game": game }));
}

function uninvitePlayer(game, player) {
    console.log("Uninviting player");
    console.log(game);
    console.log(player);

    ws.send(JSON.stringify({ type: 'uninvite', "user": player, "game": game }));
}

function discoverOtherPlayers(game) {
    console.log("Discovering other players");
    discoverPlayer(game);

    const connectionModal = document.getElementById('connectionModal');
    connectionModal.style.display = 'block';

}

function hideDiscovery() {
    const connectionModal = document.getElementById('connectionModal');
    connectionModal.style.display = 'none';

    ws.close();
}