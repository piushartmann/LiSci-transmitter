const { Router } = require('express');
const router = Router();
const helperModule = require('../../server/helper');

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @returns {Router} The router instance.
 */


module.exports = (db) => {

    const { renderView } = helperModule(db);

    router.get('/', async (req, res) => {
        console.log("Statistics page");
        return await renderView(req, res, 'statistics');
    });

    router.get('/internal/mostCitations', async (req, res) => {
        const timespan = req.query.timespan || "";
        const mostCitations = await db.getMostCitationsByUser(timespan);
        return res.json(mostCitations);
    });

    router.get('/internal/mostCited', async (req, res) => {
        const timespan = req.query.timespan || "";
        const mostCited = await db.getMostCitationsByCitiated(timespan);
        return res.json(mostCited);
    });

    router.get('/internal/citationsOverTime', async (req, res) => {
        const user = req.query.user;
        const timespan = req.query.timespan || "";
        const citationsOverTime = await db.getCitationsOverTime(user, timespan);
        if (!citationsOverTime) return res.status(404).send("User not found");
        return res.json(citationsOverTime);
    });

    return router;
};