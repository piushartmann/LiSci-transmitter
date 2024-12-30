const { Router } = require('express');
const { MongoConnector } = require('../server/MongoConnector');
const { GetBucketPolicyStatusCommand } = require('@aws-sdk/client-s3');
const router = Router();

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @returns {Router} The router instance.
*/

module.exports = (db, gameConfigs, connectedUsers) => {

    const { renderView } = require('./helper')(db);

    router.get('*', async (req, res, next) => {
        // always allow access to the invite page
        if (req.path.startsWith("/invite/")) return next();

        if (req.session.inviteID && req.session.inviteGameID) {
            const invite = await db.getInvite(req.session.inviteID);
            if (invite) {
                if (req.path.endsWith(req.session.inviteGameID) || (req.path.endsWith(req.session.inviteGameID) + "/.websocket")) {
                    return next();
                }
            }
        }

        if (req.session.userID) {
            const permissions = await db.getUserPermissions(req.session.userID);
            if (!permissions.includes("games")) return res.redirect('/');
            return next();
        } else {
            return res.redirect('/');
        }
    });

    router.get('/', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = await db.getUserPermissions(req.session.userID);

        const prefetches = [
            "/css/games.css",
            "/js/games.js",
        ];

        await renderView(req, res, 'games', {
            games: gameConfigs
        }, prefetches);
    });

    router.get('/:game/newInviteLink', async (req, res) => {
        const gameURL = req.params.game;
        const gameConfig = gameConfigs.find(g => g.url === gameURL);
        if (!gameConfig) return res.status(404).send("Game not found");

        const invite = await db.newInvite({ url: gameConfig.url, name: gameConfig.name, description: gameConfig.description }, req.session.userID);

        const inviteLink = req.protocol + '://' + req.get('host') + '/games/invite/' + invite._id;

        return res.status(200).send(JSON.stringify({ invite: inviteLink }));
    });

    gameConfigs.forEach(game => {
        try {
            game.relativePath = "../games/" + game.url + "/"
            game.logicInstance = require(game.relativePath + (game.logic || 'logic.js'))
            game.routerInstance = require(game.relativePath + (game.router || 'router.js'))(db, game.logicInstance)
        } catch (error) {
            console.error("Error getting Router or Logic instances for Game: '" + game.name + "'\n" + error.message + "\n" + error.stack.split("\n")[1])
        }
    });

    gameConfigs.forEach(gameConfig => {

        if (!gameConfig.routerInstance) return;

        gameConfig.routerInstance.get('/:gameID', async (req, res) => {
            const permissions = await db.getUserPermissions(req.session.userID);

            return await renderView(req, res, 'game', {
                title: gameConfig.name, gameEjs: (gameConfig.ejs || gameConfig.url + '.ejs'), css: "/" + gameConfig.url + "/" + (gameConfig.css || gameConfig.url + ".css"), js: "/" + gameConfig.url + "/" + (gameConfig.js || gameConfig.url + ".js")
            });
        });

        gameConfig.routerInstance.post('/startGame', async (req, res) => {
            const { opponent } = req.body;

            let players;
            if (!opponent) {
                players = [req.session.userID];
            }
            else {
                players = [req.session.userID, opponent];
            }

            const gameID = await gameConfig.logicInstance.newGame(db, players)

            return res.status(200).send(JSON.stringify({ gameID: gameID }));
        });

        gameConfig.routerInstance.post('/deleteGame', async (req, res) => {
            const { gameID } = req.body;
            if (!gameID) return res.status(400).send("Missing parameters");
            const game = await db.getGame(gameID);
            if (!game) return res.status(404).send("Game not found");
            if (!game.players.includes(req.session.userID)) return res.status(403).send("You are not in this game");

            gameConfig.logicInstance.deleteGame(db, gameID)

            return res.status(200).send("Game deleted");
        });
    })

    //include all game routes
    gameConfigs.forEach(gameConfig => {
        if (!gameConfig.routerInstance) return;
        router.use("/" + gameConfig.url, gameConfig.routerInstance);
    });

    //include invite routes
    router.use('/invite', require('./invites')(db, gameConfigs, connectedUsers));

    return router;
}
