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
            { "name": "Tic Tac Toe", "description": "Tic Tac Toe Solo or with Friends", "url": "/games/tic-tac-toe" },
            { "name": "Connect Four", "description": "Connect Four with Friends", "url": "/games/connect-four" },
            { "name": "Chess", "description": "Chess with Friends", "url": "/games/chess" },
            { "name": "Checkers", "description": "Checkers with Friends", "url": "/games/checkers" },
            { "name": "Battleship", "description": "Battleship with Friends", "url": "/games/battleship" },
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

        ws.on('close', () => {
            discoverUsers = discoverUsers.filter(u => u.ws !== ws);
            sendDiscoveryUpdate();
        });
    });

    function sendDiscoveryUpdate() {
        discoverUsers.forEach(user => {
            user.ws.send(JSON.stringify({ "type": "discover", "users": discoverUsers.map(u => u.user.username).filter(u => u !== user.user.username) }));
        });
    }

    //include all game routes
    router.use('/tic-tac-toe', require('./games/tic-tac-toe.js')(db));

    return router;
}
