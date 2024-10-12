const { Router } = require('express');
const { MongoConnector } = require('../MongoConnector');
const router = Router();

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @returns {Router} The router instance.
 */

module.exports = (db) => {
    const config = require('../config.json');
    const postsPageSize = config.postsPageSize;
    const citationsPageSize = config.citationsPageSize;

    router.get('/', async (req, res) => {
        const currentPage = req.query.page || 1;
        req.session.views = (req.session.views || 0) + 1;
        const permissions = req.session.permissions || [];
        const pages = Math.ceil(await db.getPostNumber(!(permissions.includes("classmate"))) / postsPageSize);
        const prank = req.session.username == "Merlin" ? '<img src="/images/pigeon.png" alt="Pigeon" class="pigeon" id="prank">' : "";
        return res.render('index', {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: req.session.permissions || [], profilePic: await db.getPreference(req.session.userID, 'profilePic'),
            currentPage: currentPage, prank: prank, pages: pages
        });
    });

    router.get('/create', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        if (!req.session.permissions.includes("admin") && !req.session.permissions.includes("writer")) return res.status(403).send("You cannot create a new Post");

        return res.render('create', {
            loggedIn: true, username: req.session.username, usertype: req.session.permissions || [], profilePic: await db.getPreference(req.session.userID, 'profilePic'),
            isCreatePage: true
        });
    });

    router.get('/edit/:postID', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        if (!req.session.permissions.includes("admin") && !req.session.permissions.includes("writer")) return res.status(403).send("You cannot create a new Post");

        const postID = req.params.postID;
        const post = await db.getPost(postID);

        return res.render('create', {
            loggedIn: true, username: req.session.username, usertype: req.session.permissions || [], profilePic: await db.getPreference(req.session.userID, 'profilePic'),
            isCreatePage: true, post: post
        });
    });

    router.get('/post/:id', async (req, res) => {
        return res.render('postFullscreen', {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: req.session.permissions || [], profilePic: await db.getPreference(req.session.userID, 'profilePic'),
            postID: req.params.id
        });
    });

    router.get('/citations', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = req.session.permissions || []
        const currentPage = req.query.page || 1;
        const pages = Math.ceil(await db.getCitationNumber() / citationsPageSize);
        if (!(permissions.includes("classmate"))) return res.status(403).send("You cannot view this page");

        return res.render('citations', {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: permissions, profilePic: await db.getPreference(req.session.userID, 'profilePic'),
            currentPage: currentPage, pages: pages

        });
    });

    router.get('/settings', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        return res.render('settings', {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: req.session.permissions, profilePic: await db.getPreference(req.session.userID, 'profilePic'),
            isSettingsPage: true, apiKey: await db.getUserData(req.session.userID, 'apiKey', isAdmin = req.session.permissions.includes("admin"))
        });
    });

    router.get('/archive', async (req, res) => {
        return res.send("Das Archiv kommt bald!");
    });

    return router;
}
