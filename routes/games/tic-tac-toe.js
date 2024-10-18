const { Router } = require('express');
const router = Router();
const tttAI = require('../../games/ttt-ai');

module.exports = (db) => {

    router.get('/', async (req, res) => {

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
        const board = tttAI.generate_empty_board();
        const game = await db.createGame(players, 'tic-tac-toe', board);
        if (!game) {
            return res.status(400).send("Error creating game");
        }
        return res.status(200).send(JSON.stringify({ gameID: game._id }));
    });

    router.post('/move', async (req, res) => {

        const { gameID, index } = req.body;

        if (!gameID || !index) return res.status(400).send("Missing parameters");
        const game = await db.getGame(gameID);
        if (!game) return res.status(404).send("Game not found");
        if (!game.players.includes(req.session.userID)) return res.status(403).send("You are not in this game");

        let board = game.gameState;

        console.log("Game: ", (Math.floor(index / 9)) + 1)
        console.log("Square: ", (index % 9) + 1)

        board = tttAI.do_game_selection(board, (Math.floor(index / 9)))
        board = tttAI.do_square_selection(board, index % 9)

        board = tttAI.find_best_move(board);

        await db.updateGameState(gameID, board);

        return res.status(200).send(JSON.stringify({ board: board }));

    });

    return router;
}