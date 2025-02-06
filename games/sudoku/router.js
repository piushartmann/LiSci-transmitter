const { Router } = require('express');
const router = Router();
const logic = require('./logic.js');
const path = require('path');

let connections = [];

module.exports = (db, logic) => {

    router.post('/startGame', async (req, res) => {
        const { opponent, difficulty } = req.body;

        let players;
        if (!opponent) {
            players = [req.session.userID];
        }
        else {
            players = [req.session.userID, opponent];
        }

        console.log("Starting Sudoku with difficulty: " + difficulty);

        const gameID = await logic.newGame(db, players, difficulty);

        return res.status(200).send(JSON.stringify({ gameID: gameID }));
    });

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
            else if (message.type === "preferences") {
                let game = await db.getGame(gameID);
                let preferences = message.preferences;
                if (!"showErrors" in preferences || typeof preferences["showErrors"] !== "boolean") return;
                if (!"preventErrors" in preferences || typeof preferences["preventErrors"] !== "boolean") return;
                game.gameState.preferences = preferences;
                await db.updateGameState(game._id, { board: game.gameState.board, originalBoard: game.gameState.originalBoard, solvedBoard: game.gameState.solvedBoard, preferences: game.gameState.preferences });
                console.log("Updated preferences");
            }
        });

        ws.on('close', () => {
            connections = connections.filter(c => c.ws !== ws);
        });

        ws.send(JSON.stringify({ type: "board", board: game.gameState.board, originalBoard: game.gameState.originalBoard, preferences: game.gameState.preferences }));
    });

    function receiveMove(game, index, value) {
        const originalValue = game.gameState.originalBoard[index[0]][index[1]];

        if (originalValue !== 0) return;

        // Check if the value is valid
        if (value === null || isNaN(value) || value < 0 || value > 9) value = 0;

        let newBoard = game.gameState.board;

        newBoard[index[0]][index[1]] = value;

        db.updateGameState(game._id, { board: newBoard, originalBoard: game.gameState.originalBoard, solvedBoard: game.gameState.solvedBoard, preferences: game.gameState.preferences });
    }

    return router
}