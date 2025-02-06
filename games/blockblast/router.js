const { Router } = require('express');
const router = Router();
const logic = require('./logic.js');
const blockblast = require('./engine.js');
const path = require('path');

let connections = [];

function sendBoard(ws, game) {
    ws.send(JSON.stringify({
        type: "board",
        board: game,
        bodies: game[blockblast.availableBodiesIndex],
        score: game[blockblast.scoreIndex],
    }));
}

module.exports = (db) => {

    router.ws('/:gameID', async (ws, req) => {
        const { gameID } = req.params;
        let game = await db.getGame(gameID);
        if (!game) return ws.close();
        if (!game.players.includes(req.session.userID)) return ws.close();
        let board = game.gameState;

        connections.push({ userID: req.session.userID, ws: ws });

        ws.on('message', async (msg) => {
            const message = JSON.parse(msg);
            if (message.type === "move") {
                var status = blockblast.doMove(board, message.index, [message.x, message.y]);

                let playerWS = connections.find(c => c.userID === game.players[0].toString());
                sendBoard(playerWS.ws, board);
            }
            if (message.type === "clear") {
                board = blockblast.emptyBoard();

                let playerWS = connections.find(c => c.userID === game.players[0].toString());
                sendBoard(playerWS.ws, board);
            }
            // handle incoming messages from client
        });

        ws.on('close', () => {
            connections = connections.filter(c => c.ws !== ws);
        });

        //handle first message to player
        sendBoard(ws, board);
    });

    return router
}