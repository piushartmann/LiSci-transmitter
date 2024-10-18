document.addEventListener('DOMContentLoaded', async () => {
    const playerConnections = document.getElementById('playerConnections');
    connectToWS();
});

function connectToWS(){
    const ws = new WebSocket(window.location.origin.replace(/^http/, 'ws') + '/games/discover');
    ws.onopen = () => {
        console.log('Connected to server');
    }
    ws.onmessage = (event) => {
        data = JSON.parse(event.data);
        if (data.type === 'discover') {
            buildDiscoveryList(data.users);
        }
    }
    ws.onclose = () => {
        console.log('Disconnected from server');
    }
    return ws;
}

function buildDiscoveryList(players) {
    const playerConnections = document.getElementById('playerConnections');
    playerConnections.innerHTML = '';
    players.forEach(player => {
        const playerElement = document.createElement('div');
        playerElement.className = 'player';
        playerElement.textContent = player;
        playerElement.addEventListener('click', () => {
            connectToPlayer(player);
        });
        playerConnections.appendChild(playerElement);
    });
}