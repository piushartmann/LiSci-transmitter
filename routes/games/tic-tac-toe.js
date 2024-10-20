const { Router } = require('express');
const router = Router();
const tttAI = require('../../games/ttt-ai');
const base = require('../base');

let connections = [];

module.exports = (db) => {

    router.get('/:gameID', async (req, res) => {
        const permissions = await db.getUserPermissions(req.session.userID);

        return res.render('games/tic-tac-toe', {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: permissions, profilePic: await db.getPreference(req.session.userID, 'profilePic'),
        });
    });

    router.post('/startGame', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const { opponent } = req.body;

        let players;
        if (!opponent) {
            players = [req.session.userID];
        }
        else {
            players = [req.session.userID, opponent];
        }

        const ongoingGame = await db.getGamesFromUsers(players);
        if (ongoingGame[0]) {

            return res.status(200).send(JSON.stringify({ gameID: ongoingGame[0]._id }));
        }

        const board = tttAI.generate_empty_board();
        const game = await db.createGame(players, 'tic-tac-toe', board);
        if (!game) {
            return res.status(400).send("Error creating game");
        }

        return res.status(200).send(JSON.stringify({ gameID: game._id }));
    });

    router.ws('/:gameID', async (ws, req) => {
        const { gameID } = req.params;
        let game = await db.getGame(gameID);
        if (!game) return ws.close();
        if (!game.players.includes(req.session.userID)) return ws.close();

        connections.push({ userID: req.session.userID, ws: ws });

        if (game.players.length === 1) {
            //singleplayer
            ws.on('message', async (msg) => {
                const message = JSON.parse(msg);
                if (message.type === "move") {

                    console.log(board);

                    let game = await db.getGame(gameID);

                    let board = game.gameState;
                    let index = message.index;

                    const gameIndex = Math.floor(index / 9);
                    const squareIndex = index % 9;
                    const playerIndex = game.players.indexOf(req.session.userID) === 0 ? 1 : -1;

                    //make players move
                    if (!index) return;

                    //if game is over do nothing
                    if (board[tttAI.STATUS_INDEX] == -1) return;

                    if (!checkIsPlayersTurn(board, playerIndex)) return;

                    if (!checkGameIsLegal(board, gameIndex)) return;

                    board = tttAI.do_game_selection(board, gameIndex)

                    if (!checkSquareIsLegal(board, squareIndex)) return;

                    board = tttAI.do_square_selection(board, squareIndex)

                    board = correctGameChoiceIndex(board);

                    // make AI move
                    board = tttAI.get_best_move(board);

                    board = correctGameChoiceIndex(board);
                    
                    await db.updateGameState(gameID, board);

                    ws.send(JSON.stringify({ type: "board", board: board, player: playerIndex, nextGame: board[tttAI.NEXT_GAME_INDEX] }));
                }
            });
        }
        else {
            //multiplayer
            ws.on('message', async (msg) => {
                const message = JSON.parse(msg);
                if (message.type === "move") {

                    console.log(board);

                    let game = await db.getGame(gameID);

                    let board = game.gameState;
                    let index = message.index;

                    const gameIndex = Math.floor(index / 9);
                    const squareIndex = index % 9;

                    //make PLayers move
                    if (!index) return;

                     //if game is over do nothing
                     if (board[tttAI.STATUS_INDEX] == -1) return;

                    if (!checkIsPlayersTurn(board, playerIndex)) return;

                    if (!checkGameIsLegal(board, gameIndex)) return;

                    board = tttAI.do_game_selection(board, gameIndex)

                    if (!checkSquareIsLegal(board, squareIndex)) return;

                    board = tttAI.do_square_selection(board, squareIndex)

                    board = correctGameChoiceIndex(board);

                    await db.updateGameState(gameID, board);

                    game.players.forEach(player => {
                        let playerWS = connections.find(c => c.userID === player.toString());
                        const playerIndex = game.players.indexOf(player) === 0 ? 1 : -1;
                        if (playerWS) {
                            playerWS.ws.send(JSON.stringify({ type: "board", board: board, player: playerIndex, nextGame: board[tttAI.NEXT_GAME_INDEX] }));
                        }
                    });
                }
            });
        }

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

    router.post('/deleteGame', async (req, res) => {
        const { gameID } = req.body;
        if (!gameID) return res.status(400).send("Missing parameters");
        const game = await db.getGame(gameID);
        if (!game) return res.status(404).send("Game not found");
        if (!game.players.includes(req.session.userID)) return res.status(403).send("You are not in this game");

        await db.deleteGame(gameID);
        return res.status(200).send("Game deleted");
    });

    return router;
}