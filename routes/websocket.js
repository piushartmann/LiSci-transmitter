const { Router } = require('express');
const router = Router();

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @returns {Router} The router instance.
 */

module.exports = (db, connectedUsers, gameConfigs, addReloadCallback) => {

    let invites = [];

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

    function sendMessage(ws, message) {
        if (ws.readyState === 1) { // 1 = OPEN
            try {
                ws.send(message);
                return true;
            } catch (err) {
                console.error("WebSocket send error:", err);
                return false;
            }
        }
        return false;
    }

    router.ws('/', async (ws, req) => {
        if (!req.session.userID) return ws.close();
        const user = await db.getUser(req.session.username);
        if (!user) return ws.close();

        connectedUsers.push({ "user": user, "ws": ws });

        sendDiscoveryUpdate();

        ws.on('message', async (msg) => {
            const message = JSON.parse(msg);

            if (message.type === "invite") {
                const player = connectedUsers.find(u => u.user.id === message.user);

                const invitation = { "game": message.game, "user": req.session.userID, "to": message.user };
                invites.push(invitation);

                if (!player) return;
                sendMessage(player.ws, JSON.stringify({ "type": "invite", "user": req.session.userID, "game": message.game, "username": user.username }));
            }
            else if (message.type === "uninvite") {
                const player = connectedUsers.find(u => u.user.id === message.user);

                const invitation = { "game": message.game, "user": req.session.userID, "to": message.user };
                invites = invites.filter(i => i !== invitation);

                if (!player) return;
                sendMessage(player.ws, JSON.stringify({ "type": "uninvite", "user": req.session.userID, "game": message.game }));
            }

            else if (message.type === "accept") {

                const invitation = { "game": message.game, "user": message.user, "to": req.session.userID };
                invites = invites.filter(i => i !== invitation);

                if (!invites.find(i => i.user === message.user && i.to === req.session.userID)) return;

                const game = await startGame(message.game, [req.session.userID, message.user]);

                console.log("Game: " + game)

                const otherPlayer = connectedUsers.find(u => u.user.id === message.user);
                if (!otherPlayer) return;
                sendMessage(otherPlayer.ws, JSON.stringify({ "type": "accept", "game": message.game, "gameID": game }));

                const player = connectedUsers.find(u => u.user.id === req.session.userID);
                if (!player) return;
                sendMessage(player.ws, JSON.stringify({ "type": "accept", "game": message.game, "gameID": game }));
            }
            else if (message.type === "decline") {

                const invitation = { "game": message.game, "user": message.user, "to": req.session.userID };
                invites = invites.filter(i => i !== invitation);

                if (!invites.find(i => i.user === message.user && i.to === req.session.userID)) return;

                const otherPlayer = connectedUsers.find(u => u.user.id === message.user);
                if (!otherPlayer) return;
                sendMessage(otherPlayer.ws, JSON.stringify({ "type": "decline", "user": req.session.userID }));
            }
        });

        ws.on('close', () => {
            // Replace array reassignment with splice/filter in place
            const index = connectedUsers.findIndex(u => u.ws === ws);
            if (index > -1) connectedUsers.splice(index, 1);
            
            const userInvites = invites.filter(i => i.user === req.session.userID || i.to === req.session.userID);
            userInvites.forEach(invitation => {
                const player = connectedUsers.find(u => u.user.id === (invitation.user === req.session.userID ? invitation.to : invitation.user));
                if (player) {
                    player.ws.send(JSON.stringify({ "type": "uninvite", "user": req.session.userID, "game": invitation.game }));
                }
            });
            invites = invites.filter(i => i.user !== req.session.userID && i.to !== req.session.userID);
            sendDiscoveryUpdate();
        });
    });

    function sendDiscoveryUpdate() {
        connectedUsers.forEach(user => {
            // send the list of users to each user. Dont send the users own name
            sendMessage(user.ws, JSON.stringify({ "type": "discover", "users": connectedUsers.map(u => ({ "username": u.user.username, "userID": u.user.id })).filter(u => u.username !== user.user.username) }));
        });
    }

    function sendToEveryone(message) {
        connectedUsers.forEach(user => {
            sendMessage(user.ws, message);
        });
    }

    function sendToUserID(userID, message) {
        const user = connectedUsers.find(u => u.user.id === userID);
        if (user) sendMessage(user.ws, message);
    }

    function sendToUser(username, message) {
        const user = connectedUsers.find(u => u.user.username === username);
        if (user) sendMessage(user.ws, message);
    }

    function reload() {
        sendToEveryone(JSON.stringify({ "type": "reload" }));
    }

    addReloadCallback(reload);

    // Add the functions to the router object
    const functions = {};
    functions.sendToEveryone = sendToEveryone;
    functions.sendToUserID = sendToUserID;
    functions.sendToUser = sendToUser
    functions.reloadContent = () => sendToEveryone(JSON.stringify({ "type": "reloadContent" }));
    functions.reload = reload;

    return {router, functions};
};