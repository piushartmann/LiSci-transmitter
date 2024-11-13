const { Router } = require('express');
const { MongoConnector } = require('../server/MongoConnector');
const { GetBucketPolicyStatusCommand } = require('@aws-sdk/client-s3');
const router = Router();

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @param {multer} s3Client - The s3 client instance.
 * @returns {Router} The router instance.
*/

module.exports = (db, s3Client, webpush, gameConfigs) => {

    let discoverUsers = [];
    let invites = [];

    router.get('*', async (req, res, next) => {
        // always allow access to the invite page
        if (req.path.startsWith("/invite/")) return next();

        if (req.session.inviteID && req.session.inviteGameID) {
            const invite = await db.getInvite(req.session.inviteID);
            if (invite) {
                if (req.path.endsWith(req.session.inviteGameID) || (req.path.endsWith(req.session.inviteGameID)+"/.websocket")) {
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

        return res.render('games', {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: permissions, profilePic: await db.getPreference(req.session.userID, 'profilePic'),
            games: gameConfigs, prefetches: prefetches
        });
    });

    router.get('/:game/newInviteLink', async (req, res) => {
        const gameURL = req.params.game;
        const gameConfig = gameConfigs.find(g => g.url === gameURL);
        if (!gameConfig) return res.status(404).send("Game not found");

        const invite = await db.newInvite({ url: gameConfig.url, name: gameConfig.name, description: gameConfig.description }, req.session.userID);

        const inviteLink = req.protocol + '://' + req.get('host') + '/games/invite/' + invite._id;

        return res.status(200).send(JSON.stringify({ invite: inviteLink }));
    });

    router.ws('/discover', async (ws, req) => {
        if (!req.session.userID) return ws.close();
        const user = await db.getUser(req.session.username);
        if (!user) return ws.close();

        discoverUsers.push({ "user": user, "ws": ws });

        sendDiscoveryUpdate();

        ws.on('message', async (msg) => {
            const message = JSON.parse(msg);

            if (message.type === "invite") {
                const player = discoverUsers.find(u => u.user.id === message.user);

                const invitation = { "game": message.game, "user": req.session.userID, "to": message.user };
                invites.push(invitation);

                if (!player) return;
                player.ws.send(JSON.stringify({ "type": "invite", "user": req.session.userID, "game": message.game, "username": user.username }));
            }
            else if (message.type === "uninvite") {
                const player = discoverUsers.find(u => u.user.id === message.user);

                const invitation = { "game": message.game, "user": req.session.userID, "to": message.user };
                invites = invites.filter(i => i !== invitation);

                if (!player) return;
                player.ws.send(JSON.stringify({ "type": "uninvite", "user": req.session.userID, "game": message.game }));
            }

            else if (message.type === "accept") {

                const invitation = { "game": message.game, "user": message.user, "to": req.session.userID };
                invites = invites.filter(i => i !== invitation);

                if (!invites.find(i => i.user === message.user && i.to === req.session.userID)) return;

                const game = await startGame(message.game, [req.session.userID, message.user]);

                console.log("Game: " + game)

                const otherPlayer = discoverUsers.find(u => u.user.id === message.user);
                if (!otherPlayer) return;
                otherPlayer.ws.send(JSON.stringify({ "type": "accept", "game": message.game, "gameID": game }));

                const player = discoverUsers.find(u => u.user.id === req.session.userID);
                if (!player) return;
                player.ws.send(JSON.stringify({ "type": "accept", "game": message.game, "gameID": game }));
            }
            else if (message.type === "decline") {

                const invitation = { "game": message.game, "user": message.user, "to": req.session.userID };
                invites = invites.filter(i => i !== invitation);

                if (!invites.find(i => i.user === message.user && i.to === req.session.userID)) return;

                const otherPlayer = discoverUsers.find(u => u.user.id === message.user);
                if (!otherPlayer) return;
                otherPlayer.ws.send(JSON.stringify({ "type": "decline", "user": req.session.userID }));
            }
        });

        ws.on('close', () => {
            discoverUsers = discoverUsers.filter(u => u.ws !== ws);
            const userInvites = invites.filter(i => i.user === req.session.userID || i.to === req.session.userID);
            userInvites.forEach(invitation => {
                const player = discoverUsers.find(u => u.user.id === (invitation.user === req.session.userID ? invitation.to : invitation.user));
                if (player) {
                    player.ws.send(JSON.stringify({ "type": "uninvite", "user": req.session.userID, "game": invitation.game }));
                }
            });
            invites = invites.filter(i => i.user !== req.session.userID && i.to !== req.session.userID);
            sendDiscoveryUpdate();
        });
    });

    function sendDiscoveryUpdate() {
        discoverUsers.forEach(user => {
            user.ws.send(JSON.stringify({ "type": "discover", "users": discoverUsers.map(u => ({ "username": u.user.username, "userID": u.user.id })).filter(u => u.username !== user.user.username) }));
        });
    }

    async function startGame(game, players) {
        console.log("Starting Game")
        for (const config of gameConfigs) {
            if (config.url == game) {
                console.log("Starting Game: " + config.name)
                const gameID = await config.logicInstance.newGame(db, players);
                return gameID.toString();
            }
        }
        return null;
    }

    gameConfigs.forEach(game => {
        try {
            game.relativePath = "../games/" + game.url + "/"
            game.routerInstance = require(game.relativePath + (game.router || 'router.js'))(db)
            game.logicInstance = require(game.relativePath + (game.logic || 'logic.js'))
        } catch (error) {
            console.error("Error getting Router or Logic instances for Game: '" + game.name + "'\n" + error.message + "\n" + error.stack.split("\n")[1])
        }
    });

    gameConfigs.forEach(gameConfig => {

        if (!gameConfig.routerInstance) return;

        gameConfig.routerInstance.get('/:gameID', async (req, res) => {
            const permissions = await db.getUserPermissions(req.session.userID);

            return res.render("game", {
                loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: permissions, profilePic: await db.getPreference(req.session.userID, 'profilePic'),
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
    router.use('/invite', require('./invites')(db, gameConfigs, discoverUsers));

    return router;
}
