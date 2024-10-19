let gamesWS = null;
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
    gamesWS = new WebSocket(window.location.origin.replace(/^http/, 'ws') + `/games/discover`);
    gamesWS.onopen = () => {
        console.log('Connected to server');
    }
    gamesWS.onmessage = (event) => {
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
    gamesWS.onclose = () => {
        console.log('Disconnected from server');
        const playerConnections = document.getElementById('playerConnections');
        playerConnections.innerHTML = '';
    }
    return gamesWS;
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

    gamesWS.send(JSON.stringify({ type: 'invite', "user": player, "game": game }));
}

function uninvitePlayer(game, player) {
    console.log("Uninviting player");
    console.log(game);
    console.log(player);

    gamesWS.send(JSON.stringify({ type: 'uninvite', "user": player, "game": game }));
}

function discoverOtherPlayers(game) {
    console.log("Discovering other players");

    const connectionModal = document.getElementById('connectionModal');
    connectionModal.style.display = 'block';

}

function hideDiscovery() {
    const connectionModal = document.getElementById('connectionModal');
    connectionModal.style.display = 'none';

    gamesWS.close();
}