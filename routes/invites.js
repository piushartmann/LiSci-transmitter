const { Router } = require('express');
const { MongoConnector } = require('../server/MongoConnector');
const router = Router();

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @param {Array} gameConfigs - The game configuration array
 * @returns {Router} The router instance.
*/

module.exports = (db, gameConfigs, discoverUsers) => {

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

        if (invite.gameID) {
            return res.status(200).send(JSON.stringify({ url: `/games/${invite.gameInfo.url}/${invite.gameID}` }));
        }
        console.log("Accepting invite " + inviteID);

        const gameConfig = gameConfigs.find(g => g.url === invite.gameInfo.url);
        const gameID = await gameConfig.logicInstance.newGame(db, [invite.from, inviteID]);
        if (!gameID) return res.status(500).send("Failed to create game");

        await db.setInviteGameID(inviteID, gameID);

        const player = discoverUsers.find(u => u.user.id === invite.from.toString());
        if (!player) return res.status(404).send("Inviting Player not found");
        player.ws.send(JSON.stringify({ "type": "accept", "game": invite.gameInfo.url, "gameID": gameID }));

        if (!req.session.userID) {
            req.session.inviteID = inviteID;
            req.session.inviteGameID = gameID;
        }

        return res.status(200).send(JSON.stringify({ url: `/games/${invite.gameInfo.url}/${gameID}` }));
    });

    return router;
};