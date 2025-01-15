const { Router } = require('express');
const router = Router();

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @returns {Router} The router instance.
 */


module.exports = (db) => {

    router.get('/', async (req, res) => {
        return res.render('homework');
    });

    return router;
};