const { Router } = require('express');
const { MongoConnector } = require('../MongoConnector');
const router = Router();

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @param {multer} s3Client - The s3 client instance.
 * @returns {Router} The router instance.
 */

module.exports = (db, s3Client, webpush) => {

    router.get('*', async (req, res, next) => {
        if (req.session.userID) {
            const permissions = await db.getUserPermissions(req.session.userID);
            if (!permissions.includes("games")) res.redirect('/');
            next();
        } else {
            res.redirect('/login');
        }
    });

    router.get('/', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = await db.getUserPermissions(req.session.userID);
        
        //later games list will be pulled from db

        const games = [
            {"name": "Tic Tac Toe", "description": "Tic Tac Toe Solo or with Friends", "url": "/games/tic-tac-toe"},
            {"name": "Connect Four", "description": "Connect Four with Friends", "url": "/games/connect-four"},
            {"name": "Chess", "description": "Chess with Friends", "url": "/games/chess"},
            {"name": "Checkers", "description": "Checkers with Friends", "url": "/games/checkers"},
            {"name": "Battleship", "description": "Battleship with Friends", "url": "/games/battleship"},
        ];

        return res.render('games/games', {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: permissions, profilePic: await db.getPreference(req.session.userID, 'profilePic'),
            games: games
        });
    });

    //include all game routes
    router.use('/tic-tac-toe', require('./games/tic-tac-toe.js')(db));

    return router;
}
