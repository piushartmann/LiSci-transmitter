const { Router } = require('express');
const { MongoConnector } = require('../MongoConnector');
const { GetBucketPolicyStatusCommand } = require('@aws-sdk/client-s3');
const router = Router();

const tttAI = require('../games/ttt-ai.js');

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @param {multer} s3Client - The s3 client instance.
 * @returns {Router} The router instance.
*/

module.exports = (db, s3Client, webpush) => {
    
    let discoverUsers = [];
    let invites = [];

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

                const player = discoverUsers.find(u => u.user.id === message.user);
                if (!player) return;
                player.ws.send(JSON.stringify({ "type": "accept", "game": message.game, "gameID": game }));

                const otherPlayer = discoverUsers.find(u => u.user.id === req.session.userID);
                if (!otherPlayer) return;
                otherPlayer.ws.send(JSON.stringify({ "type": "accept", "game": message.game, "gameID": game }));
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

    function startGame(game, players){
        switch(game){
            case "tic-tac-toe":
                return startTTT(players);
            default:
                return null;
        }
    }

    async function startTTT(players){
        
        const ongoingGame = await db.getGamesFromUsers(players);
        if (ongoingGame[0]) {
            return ongoingGame[0]._id;
        }

        const board = tttAI.generate_empty_board();
        const game = await db.createGame(players, 'tic-tac-toe', board);
        if (!game) {
            return null;
        }

        return game._id;
    }

    //include all game routes
    router.use('/tic-tac-toe', require('./games/tic-tac-toe.js')(db));

    return router;
}
