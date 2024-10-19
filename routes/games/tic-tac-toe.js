const { Router } = require('express');
const router = Router();
const tttAI = require('../../games/ttt-ai');

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
            ws.on('message', async (msg) => {
                const message = JSON.parse(msg);
                if (message.type === "move") {
                    let game = await db.getGame(gameID);

                    let board = game.gameState;
                    let index = message.index;
                    if (!index) return;

                    board = tttAI.do_game_selection(board, (Math.floor(index / 9)))
                    board = tttAI.do_square_selection(board, index % 9)

                    board = tttAI.find_best_move(board);

                    await db.updateGameState(gameID, board);

                    ws.send(JSON.stringify({ type: "board", board: board, player: game.players.indexOf(req.session.userID) }));
                }
            });
        }
        else {
            ws.on('message', async (msg) => {
                const message = JSON.parse(msg);
                if (message.type === "move") {
                    let game = await db.getGame(gameID);

                    let board = game.gameState;
                    let index = message.index;
                    if (!index) return;

                    console.log("Move: " + index);

                    board = tttAI.do_game_selection(board, (Math.floor(index / 9)))
                    board = tttAI.do_square_selection(board, index % 9)

                    await db.updateGameState(gameID, board);

                    game.players.forEach(player => {
                        let playerWS = connections.find(c => c.userID === player.toString());
                        if (playerWS) {
                            playerWS.ws.send(JSON.stringify({ type: "board", board: board, player: game.players.indexOf(player) }));
                        }
                    });
                }
            });
        }

        ws.on('close', () => {
            connections = connections.filter(c => c.ws !== ws);
        });

        ws.send(JSON.stringify({ type: "board", board: game.gameState, player: game.players.indexOf(req.session.userID) }));
    });

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