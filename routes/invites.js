const { Router } = require('express');
const { MongoConnector } = require('../server/MongoConnector');
const router = Router();

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @param {Array} gameConfigs - The game configuration array
 * @returns {Router} The router instance.
*/

module.exports = (db, gameConfigs, connectedUsers) => {

    router.get('/:inviteID', async (req, res) => {
        const inviteID = req.params.inviteID;
        const invite = await db.getInvite(inviteID);
        if (!invite) return res.status(404).send("Invite not found");
        const user = await db.getUserByID(invite.from);
        if (!user) return res.status(404).send("User not found");

        return res.render('invitePage', {
            gameUrl: invite.gameInfo.url,
            gameName: invite.gameInfo.name,
            gameDescription: invite.gameInfo.description,
            username: user.username,
        });
    });

    router.get('/:inviteID/accept', async (req, res) => {
        const inviteID = req.params.inviteID;
        const invite = await db.getInvite(inviteID);
        if (!invite) return res.status(404).send("Invite not found");

        // Create a new game if one isnt already attached to the invite
        let gameID = invite.gameID || await createGame(invite, inviteID, gameConfigs);

        const inviter = connectedUsers.find(u => {
            return u.user.id.toString() === invite.from.toString();
        });

        // Only send if websocket is in OPEN state
        if (inviter && inviter.ws.readyState === 1) {
            const acceptMessage = JSON.stringify({ 
                "type": "accept", 
                "game": invite.gameInfo.url, 
                "gameID": gameID 
            });
            
            try {
                inviter.ws.send(acceptMessage);
                console.log("Message sent successfully to", inviter.user.username);
            } catch (err) {
                console.error("Failed to send message:", err);
            }
        } else {
            console.log("Inviter not found or websocket not ready:", 
                inviter ? `WS State: ${inviter.ws.readyState}` : "Inviter not found");
        }

        if (!req.session.userID) {
            req.session.inviteID = inviteID;
            req.session.inviteGameID = gameID;
        }

        console.log("Successfully accepted invite " + inviteID);
        return res.status(200).send(JSON.stringify({ url: `/games/${invite.gameInfo.url}/${gameID}` }));
    });

    async function createGame(invite, inviteID, gameConfigs) {
        const gameConfig = gameConfigs.find(g => g.url === invite.gameInfo.url);
        const gameID = gameConfig.logicInstance.newGame(db, [invite.from, inviteID]);
        if (!gameID) return null;
        await db.setInviteGameID(invite._id, gameID);
        return gameID;
    }

    return router;
};