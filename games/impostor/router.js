const { Router } = require('express');
const router = Router();

let connections = [];

module.exports = (db) => {

    router.ws('/:gameID', async (ws, req) => {
        const { gameID } = req.params;
        let game = await db.getGame(gameID);
        if (!game) return ws.close();

        let anonymous = false;
        if (!game.players.includes(req.session.userID)) {
            if (req.session.inviteGameID && req.session.inviteGameID === gameID) {
                anonymous = true;
            } else {
                return ws.close();
            }
        }

        const userID = anonymous ? req.session.inviteID : req.session.userID;
        connections.push({ userID, ws });

        ws.on('message', async (msg) => {
            const message = JSON.parse(msg);
            if (message.type === 'vote') {
                let game = await db.getGame(gameID);
                game.gameState.votes[userID] = message.target;
                await db.updateGameState(gameID, game.gameState);

                const counts = {};
                Object.values(game.gameState.votes).forEach(v => counts[v] = (counts[v] || 0) + 1);
                const majority = Object.entries(counts).find(([p, c]) => c > game.players.length / 2);
                if (majority) {
                    const winner = majority[0] === game.gameState.impostor ? 'crew' : 'impostor';
                    game.gameState.finished = true;
                    game.gameState.winner = winner;
                    await db.updateGameState(gameID, game.gameState);
                    game.players.forEach(player => {
                        const c = connections.find(con => con.userID === player.toString());
                        if (c) c.ws.send(JSON.stringify({ type: 'end', winner, impostor: game.gameState.impostor }));
                    });
                }
            } else if (message.type === 'guess') {
                let game = await db.getGame(gameID);
                if (userID !== game.gameState.impostor || game.gameState.finished) return;
                if (message.word && message.word.toLowerCase() === game.gameState.word.toLowerCase()) {
                    game.gameState.finished = true;
                    game.gameState.winner = 'impostor';
                    await db.updateGameState(gameID, game.gameState);
                    game.players.forEach(player => {
                        const c = connections.find(con => con.userID === player.toString());
                        if (c) c.ws.send(JSON.stringify({ type: 'end', winner: 'impostor', impostor: game.gameState.impostor }));
                    });
                }
            }
        });

        ws.on('close', () => {
            connections = connections.filter(c => c.ws !== ws);
        });

        const role = userID === game.gameState.impostor ? 'impostor' : 'crew';
        const word = role === 'crew' ? game.gameState.word : null;
        const players = game.players.map(p => p.toString());
        ws.send(JSON.stringify({ type: 'start', role, word, players }));
    });

    return router;
};
