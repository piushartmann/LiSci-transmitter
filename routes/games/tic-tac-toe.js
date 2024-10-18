const { Router } = require('express');
const router = Router();


module.exports = (db) => {

    router.get('/', async (req, res) => {

        const permissions = await db.getUserPermissions(req.session.userID);

        return res.render('games/tic-tac-toe', {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: permissions, profilePic: await db.getPreference(req.session.userID, 'profilePic'),
        });
    });

    router.post('/move', async (req, res) => {

        const { board } = req.body;

        let attempts = 0;
        newPosition = Math.floor(Math.random() * 9);
        while (board[newPosition] !== "" && attempts < 8) {
            newPosition = Math.floor(Math.random() * 9);
            attempts++;
        }

        return res.status(200).send(JSON.stringify({ square: newPosition }));

    });

    return router;
}