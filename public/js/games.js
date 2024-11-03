let gamesWS = null;
let invited = [];
let invites = [];
let users = [];
let discoverGame = null;

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

function buildDiscoveryList(players) {
    const playerConnections = document.getElementById('playerConnections');
    playerConnections.innerHTML = '';
    players.forEach(player => {
        const playerElement = buildButton("icons/games/connect.svg", player.username, () => {
            if (invited.includes(player.userID)) {
                playerElement.classList.remove('invited');
                invited = invited.filter(p => p !== player.userID);
                uninvitePlayer(discoverGame, player.userID);
            }
            else {
                if (invites.find(i => i.user === player.userID)) {
                    acceptInvite(discoverGame, player.userID);
                } else {
                    playerElement.classList.add('invited');
                    invited.push(player.userID);
                    invitePlayer(discoverGame, player.userID);
                }
            }
        });

        if (invited.includes(player.userID)) {
            playerElement.classList.add('invited');
        }

        if (invites.find(i => i.user === player.userID)) {
            playerElement.classList.add('invitedBy');
        }

        playerElement.classList.add('player');
        playerElement.type = 'button';
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

    discoverGame = game;
}

function hideDiscovery() {
    const connectionModal = document.getElementById('connectionModal');
    connectionModal.style.display = 'none';

    discoverGame = null;
}