const { Router } = require('express');
const router = Router();
const tttAI = require('./ai.js');
const logic = require('./logic.js');
const path = require('path');

let connections = [];

const viewsDir = path.join(__dirname, 'views')

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
                let board = game.gameState;
                let index = message.index;

                if (!index) return;

                // Check if the game is over and the player is trying to make a move (shouldn't happen)
                if (board[tttAI.STATUS_INDEX] !== tttAI.STATUS_ONGOING) return;

                const gameIndex = Math.floor(index / 9);
                const squareIndex = index % 9;
                const playerIndex = game.players.indexOf(req.session.userID) === 0 ? 1 : -1;

                if (!checkIsPlayersTurn(board, playerIndex) || !checkGameIsLegal(board, gameIndex)) return;

                board = tttAI.do_game_selection(board, gameIndex);
                if (!checkSquareIsLegal(board, squareIndex)) return;

                board = tttAI.do_square_selection(board, squareIndex);
                board = correctGameChoiceIndex(board);

                await db.updateGameState(gameID, board);

                // send the updated board to the players
                game.players.forEach(player => {
                    let playerWS = connections.find(c => c.userID === player.toString());
                    const playerIndex = game.players.indexOf(player) === 0 ? 1 : -1;
                    if (playerWS) {
                        playerWS.ws.send(JSON.stringify({ type: "board", board: board, player: playerIndex, nextGame: board[tttAI.NEXT_GAME_INDEX] }));
                    }
                });

                if (game.players.length === 1) {
                    board = tttAI.get_best_move(board);
                    board = correctGameChoiceIndex(board);
                    await db.updateGameState(gameID, board);

                    ws.send(JSON.stringify({ type: "board", board: board, player: playerIndex, nextGame: board[tttAI.NEXT_GAME_INDEX] }));
                }
            }
        });

        ws.on('close', () => {
            connections = connections.filter(c => c.ws !== ws);
        });
        const playerIndex = game.players.indexOf(req.session.userID) === 0 ? 1 : -1;
        ws.send(JSON.stringify({ type: "board", board: game.gameState, player: playerIndex, nextGame: game.gameState[tttAI.NEXT_GAME_INDEX] }));
    });

    function checkIsPlayersTurn(board, playerIndex) {
        // Check if it is the player's turn
        if (board[tttAI.TURN_INDEX] !== playerIndex) {
            console.log("Not your turn");
            return false;
        }
        return true;
    }

    function checkGameIsLegal(board, gameIndex) {
        // Check if the game selection is valid
        if (!tttAI.is_board_expecting_game_selection(board)) {
            if (board[tttAI.NEXT_GAME_INDEX] !== gameIndex) {
                console.log("Invalid game selection");
                return false;
            }
        }
        return true;
    }

    function checkSquareIsLegal(board, squareIndex) {
        // Check if the square selection is valid
        if (!tttAI.square_selection_possibilities(board).includes(squareIndex)) {
            console.log("Invalid square selection");
            return false;
        }
        return true;
    }

    function correctGameChoiceIndex(board) {
        // Correct the game choice index if it is invalid
        if (!tttAI.is_board_expecting_game_selection(board)) {
            const possibilities = tttAI.game_selection_possibilities(board);
            if (!possibilities.includes(board[tttAI.NEXT_GAME_INDEX])) {
                board[tttAI.NEXT_GAME_INDEX] = -1;
            }
        }
        return board;
    }

    return router;
}