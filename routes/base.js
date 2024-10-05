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
        const currentPage = req.query.page || 1;
        req.session.views = (req.session.views || 0) + 1;
        const pages = Math.ceil(await db.getPostNumber(req.session.type === "teacher")/pageSize);
        return res.render('index', { loggedIn: typeof req.session.username != "undefined", username: req.session.username, pages: pages, usertype: req.session.type, currentPage: currentPage });
    });

    router.get('/create', async (req, res) => {
        if (!req.session.userID) {
            return res.redirect('/');
        }
        if (req.session.type !== "admin" && req.session.type !== "writer") {
            return res.redirect('/');
        }
        return res.render('create', { username: req.session.username, loggedIn: true, usertype: req.session.type, isCreatePage: true });
    });

    return router;
}