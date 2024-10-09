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
        const pages = Math.ceil(await db.getPostNumber(req.session.type === "teacher") / pageSize);
        const prank = req.session.username == "merlin" ? '<img src="/images/pigeon.png" alt="Pigeon" class="pigeon" id="prank">' : "";
        return res.render('index', {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: req.session.type,
            currentPage: currentPage, prank: prank, pages: pages
        });
    });

    router.get('/create', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        if (req.session.type !== "admin" && req.session.type !== "writer") return res.status(403).send("You cannot create a post");
        return res.render('create', {
            loggedIn: true, username: req.session.username, usertype: req.session.type,
            isCreatePage: true
        });
    });

    router.get('/post/:id', async (req, res) => {
        return res.render('postFullscreen', {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: req.session.type,
            postID: req.params.id
        });
    });

    router.get('/citations', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        if (req.session.type == "teacher") return res.status(403).send("You cannot view this page");

        return res.render('citations', {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: req.session.type,

        });
    });

    router.get('/settings', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        return res.render('settings', {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: req.session.type,
            isSettingsPage: true
        });
    });

    router.get('/archive', async (req, res) => {
        return res.send("Das Archiv kommt bald!");
    });

    return router;
}