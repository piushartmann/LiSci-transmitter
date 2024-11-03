const { Router } = require('express');
const router = Router();
const logic = require('./logic.js');
const path = require('path');

let connections = [];

module.exports = (db) => {

    router.ws('/:gameID', async (ws, req) => {
        const { gameID } = req.params;
        let game = await db.getGame(gameID);
        if (!game) return ws.close();
        if (!game.players.includes(req.session.userID)) return ws.close();

        connections.push({ userID: req.session.userID, ws: ws });

        ws.on('message', async (msg) => {
            const message = JSON.parse(msg);
            // handle incoming messages from client
        });

        ws.on('close', () => {
            connections = connections.filter(c => c.ws !== ws);
        });

        //handle first message to player
    });

    return router
}