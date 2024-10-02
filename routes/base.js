const { Router } = require('express');
const { MongoConnector } = require('../MongoConnector');
const router = Router();

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @returns {Router} The router instance.
 */

module.exports = (db) => {
    router.get('/', (req, res) => {
        req.session.views = (req.session.views || 0) + 1;
        res.render('helloworld', { views: req.session.views });
    });

    return router;
}