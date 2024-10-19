const { Router } = require('express');
const { MongoConnector } = require('../MongoConnector');
const router = Router();

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @param {multer} s3Client - The s3 client instance.
 * @returns {Router} The router instance.
 */

module.exports = (db, s3Client, webpush) => {

    let discoverUsers = [];

    router.get('*', async (req, res, next) => {
        if (req.session.userID) {
            const permissions = await db.getUserPermissions(req.session.userID);
            if (!permissions.includes("games")) return res.redirect('/');
            next();
        } else {
            return res.redirect('/');
        }
    });

    router.get('/', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = await db.getUserPermissions(req.session.userID);

        //later games list will be pulled from db

        const games = [
            { "title": "Tic Tac Toe", "description": "Tic Tac Toe Solo or with Friends", "name": "tic-tac-toe", "multiplayer": true, "singleplayer": true },
        ];

        return res.render('games/games', {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: permissions, profilePic: await db.getPreference(req.session.userID, 'profilePic'),
            games: games
        });
    });

    router.ws('/discover/:game', async (ws, req) => {
        if (!req.session.userID) return ws.close();
        const user = await db.getUser(req.session.username);
        if (!user) return ws.close();

        const game = req.params.game;

        discoverUsers.push({ "user": user, "ws": ws, "game": game });

        sendDiscoveryUpdate(game);

        ws.on('close', () => {
            discoverUsers = discoverUsers.filter(u => u.ws !== ws);
            sendDiscoveryUpdate(game);
        });
    });

    router.post('/invitePlayer', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const { game: gameName, player } = req.body;

        const opponent = await db.getUserByID(player);
        if (!opponent) return res.status(400).send("Player not found");

        const user = await db.getUserByID(req.session.userID);
        if (!user) return res.status(400).send("Game User not found");


        const playerWS = discoverUsers.find(u => u.user.id === player);
        if (!playerWS) return res.status(400).send("Player not online");

        playerWS.ws.send(JSON.stringify({ "type": "gameInvite", "user": req.session.userID, "game": gameName, "gameID": "1234" }));

        return res.status(200).send("Invite sent");
    });

    router.post('/uninvitePlayer', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const { game: gameName, player } = req.body;

        const opponent = await db.getUserByID(player);
        if (!opponent) return res.status(400).send("Player not found");

        const user = await db.getUserByID(req.session.userID);

        const playerWS = discoverUsers.find(u => u.user.id === player);

        if (!playerWS) return res.status(400).send("Player not online");

        playerWS.ws.send(JSON.stringify({ "type": "gameUninvite", "user": req.session.userID, "game": gameName }));
    });

    router.post('/acceptInvite', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const { game, player, gameID } = req.body;

        const opponent = await db.getUserByID(player);
        if (!opponent) return res.status(400).send("Player not found");

        const user = await db.getUserByID(req.session.userID);

        const playerWS = discoverUsers.find(u => u.user.id === player);

        if (!playerWS) return res.status(400).send("Player not online");

        playerWS.ws.send(JSON.stringify({ "type": "gameAccept", "user": req.session.userID, "game": game, "gameID": gameID }));
    });

    function sendDiscoveryUpdate(game) {
        discoverUsers.forEach(user => {
            user.ws.send(JSON.stringify({ "type": "discover", "users": discoverUsers.filter(u => u.game === game).map(u => ({ "username": u.user.username, "userID": u.user.id })).filter(u => u.username !== user.user.username) }));
        });
    }

    //include all game routes
    router.use('/tic-tac-toe', require('./games/tic-tac-toe.js')(db));

    return router;
}
