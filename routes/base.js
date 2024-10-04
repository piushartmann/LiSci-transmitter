const { Router } = require('express');
const { MongoConnector } = require('../MongoConnector');
const router = Router();

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @param {number} pageSize - The number of posts per page.
 * @returns {Router} The router instance.
 */

module.exports = (db, pageSize) => {
    router.get('/', async (req, res) => {
        req.session.views = (req.session.views || 0) + 1;
        const pages = Math.ceil(await db.getPostNumber(req.session.type === "teacher")/pageSize);
        res.render('helloworld', { views: req.session.views, username: req.session.username, pages: pages});
    });

    return router;
}