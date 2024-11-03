const { Router } = require('express');
const router = Router();
const logic = require('./logic.js');
const path = require('path');

let connections = [];

module.exports = (db) => {

    router.ws('/:gameID', async (ws, req) => {
        const { gameID } = req.params;
        let game = await db.getGame(gameID);
        if (!game) return ws.close();
        if (!game.players.includes(req.session.userID)) return ws.close();

        connections.push({ userID: req.session.userID, ws: ws });

        ws.on('message', async (msg) => {
            const message = JSON.parse(msg);
            if (message.type === "move") {
                let game = await db.getGame(gameID);
                receiveMove(game, message.index, message.value);
            }
        });

        ws.on('close', () => {
            connections = connections.filter(c => c.ws !== ws);
        });
        const playerIndex = game.players.indexOf(req.session.userID) === 0 ? 1 : -1;
        ws.send(JSON.stringify({ type: "board", board: game.gameState.board, originalBoard: game.gameState.originalBoard, player: playerIndex }));
    });

    function receiveMove(game, index, value) {
        const originalValue = game.gameState.originalBoard[index[0]][index[1]];
        
        if (originalValue !== 0) return;

        // Check if the value is valid
        if (value === null || isNaN(value) || value < 0 || value > 9) value = 0;

        let newBoard = game.gameState.board;

        newBoard[index[0]][index[1]] = value;

        db.updateGameState(game._id, { board: newBoard, originalBoard: game.gameState.originalBoard, solvedBoard: game.gameState.solvedBoard });
    }

    return router
}