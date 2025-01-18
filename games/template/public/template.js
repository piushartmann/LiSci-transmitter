document.addEventListener('DOMContentLoaded', async () => {

    const urlParts = window.location.pathname.split('/');
    gameID = urlParts[urlParts.length - 1];

    const ws = connectToWS(gameID);

    window.addEventListener("focus", () => {
        if (typeof ws !== 'undefined') return;
        ws.connect();
    });
});

function connectToWS(gameID) {
    //replace 'template' with the name of the game
    const gameWS = new WebSocket(window.location.origin.replace(/^http/, 'ws') + `/games/template/${gameID}`);
    gameWS.onopen = () => {
        console.log('Connected to server');
    }
    gameWS.onmessage = (event) => {
        data = JSON.parse(event.data);
        //handle incoming data from websocket
    }
    gameWS.onclose = () => {
        console.log('Disconnected from server');
    }
    return gameWS;
}