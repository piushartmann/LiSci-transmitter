const { Router } = require('express');
const router = Router();

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @returns {Router} The router instance.
 */


module.exports = (db) => {
    const config = require('../../config.json');
    const untis = require('../../server/untis'); 

    router.get('/', async (req, res) => {
        const untisClasses = await db.getPreference(req.session.userID, 'untisClasses');

        return res.render('homework', {
            untisClasses: untisClasses
        });
    });

    router.post('/internal/getTimetable', async (req, res) => {
        let { weekOffset } = req.body;
        if (!weekOffset) weekOffset = 0;
        if (typeof weekOffset !== "number") return res.status(400).send("Invalid parameters");
        const timetable = await untis.getTimetable(weekOffset);
        return res.json(timetable);
    });

    return router;
};