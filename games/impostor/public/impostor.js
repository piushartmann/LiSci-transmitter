let ws;
let gameID;

document.addEventListener('DOMContentLoaded', () => {
    const parts = window.location.pathname.split('/');
    gameID = parts[parts.length - 1];
    connect();

    document.getElementById('voteBtn').addEventListener('click', sendVote);
    document.getElementById('guessBtn').addEventListener('click', sendGuess);
});

function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    ws = new WebSocket(protocol + window.location.host + '/games/impostor/' + gameID);
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'start') {
            document.getElementById('role').innerText = data.role === 'impostor' ? 'Du bist der Betrüger!' : 'Finde den Betrüger';
            if (data.word) {
                document.getElementById('wordContainer').style.display = 'block';
                document.getElementById('word').innerText = data.word;
            } else {
                document.getElementById('guessSection').style.display = 'block';
            }
            const select = document.getElementById('voteTarget');
            data.players.forEach(p => {
                const option = document.createElement('option');
                option.value = p;
                option.textContent = p;
                select.appendChild(option);
            });
        } else if (data.type === 'end') {
            document.getElementById('status').innerText = `Spielende: ${data.winner} gewinnen. Impostor war ${data.impostor}`;
        }
    };
}

function sendVote() {
    const target = document.getElementById('voteTarget').value;
    ws.send(JSON.stringify({ type: 'vote', target }));
}

function sendGuess() {
    const word = document.getElementById('guessWord').value;
    ws.send(JSON.stringify({ type: 'guess', word }));
}
