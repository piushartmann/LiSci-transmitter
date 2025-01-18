const { Router } = require('express');
const router = Router();

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @returns {Router} The router instance.
 */


module.exports = (db) => {

    // limit this route to only admin and classmates
    router.get('*', async (req, res, next) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = await db.getUserPermissions(req.session.userID);
        if (!(permissions.includes("admin") && permissions.includes("classmate"))) return res.status(403).send("You do not have permission to access this page");
        next();
    });

    router.get('/mostCitations', async (req, res) => {
        const timespan = req.query.timespan || "";
        const mostCitations = await db.getMostCitationsByUser(timespan);
        return res.json(mostCitations);
    });

    router.get('/mostCited', async (req, res) => {
        const timespan = req.query.timespan || "";
        const mostCited = await db.getMostCitationsByCitiated(timespan);
        return res.json(mostCited);
    });

    router.get('/citationsOverTime', async (req, res) => {
        const user = req.query.user;
        const timespan = req.query.timespan || "";
        const citationsOverTime = await db.getCitationsOverTime(user, timespan);
        if (!citationsOverTime) return res.status(404).send("User not found");
        return res.json(citationsOverTime);
    });

    return router;
};