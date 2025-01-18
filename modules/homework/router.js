const { Router } = require('express');
const router = Router();

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @returns {Router} The router instance.
 */


module.exports = (db) => {
    const config = require('../../config.json');
    const timetable = require('../../server/untis/timetable.json');

    router.get('/', async (req, res) => {
        return res.render('homework');
    });

    router.get('/internal/getTimetable', async (req, res) => {
        return res.json(timetable);
    })

    return router;
};