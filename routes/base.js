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
        let currentPage = req.query.page || 1;
        req.session.views = (req.session.views || 0) + 1;
        const permissions = await db.getUserPermissions(req.session.userID);
        const onlyNews = req.query.onlyNews == "true" || false;

        let pages;
        if (onlyNews) {
            pages = Math.ceil(await db.getNewsNumber(!(permissions.includes("classmate"))) / postsPageSize);
        } else {
            pages = Math.ceil(await db.getPostNumber(!(permissions.includes("classmate"))) / postsPageSize);
        }

        if (currentPage > pages) currentPage = 1;
        const prank = req.session.username == "Merlin" ? '<img src="/images/pigeon.png" alt="Pigeon" class="pigeon" id="prank">' : "";
        const prefetches = [
            "/icons/view.svg",
            "/icons/edit.svg",
            "/icons/delete.svg",
            "/icons/comment-unfilled.svg",
            "/icons/comment-filled.svg",
            "/css/sections.css",
            "/js/partials/commentRenderer.js",
            "/js/partials/postRenderer.js",
            "js/index.js"
        ];
        return res.render('index', {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: permissions, profilePic: await db.getPreference(req.session.userID, 'profilePic'),
            currentPage: currentPage, prank: prank, pages: pages, prefetches: prefetches
        });
    });

    router.get('/create', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = await db.getUserPermissions(req.session.userID);
        if (!permissions.includes("admin") && !permissions.includes("canPost")) return res.status(403).send("You cannot create a new Post");

        return res.render('create', {
            loggedIn: true, username: req.session.username, usertype: permissions, profilePic: await db.getPreference(req.session.userID, 'profilePic'),
            isCreatePage: true, canCreateNews: (permissions.includes("admin") || permissions.includes("writer"))
        });
    });

    router.get('/edit/:postID', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = await db.getUserPermissions(req.session.userID);
        if (!permissions.includes("admin") && !permissions.includes("canPost")) return res.status(403).send("You cannot create a new Post");

        const postID = req.params.postID;
        const post = await db.getPost(postID);

        return res.render('create', {
            loggedIn: true, username: req.session.username, usertype: permissions, profilePic: await db.getPreference(req.session.userID, 'profilePic'),
            isCreatePage: true, post: post, canCreateNews: (permissions.includes("admin") || permissions.includes("writer"))
        });
    });

    router.get('/post/:id', async (req, res) => {
        const permissions = await db.getUserPermissions(req.session.userID);
        return res.render('postFullscreen', {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: permissions || [], profilePic: await db.getPreference(req.session.userID, 'profilePic'),
            postID: req.params.id
        });
    });

    router.get('/citations', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = await db.getUserPermissions(req.session.userID);
        const currentPage = req.query.page || 1;
        const pages = Math.ceil(await db.getCitationNumber() / citationsPageSize);
        if (!(permissions.includes("classmate"))) return res.status(403).send("You cannot view this page");

        const prefetches = [
            "/css/citations.css",
            "/css/autocomplete.css",
            "/js/citations.js",
            "/js/partials/autocomplete.js"
        ];
        return res.render('citations', {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: permissions, profilePic: await db.getPreference(req.session.userID, 'profilePic'),
            currentPage: currentPage, pages: pages, prefetches: prefetches

        });
    });

    router.get('/settings', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = await db.getUserPermissions(req.session.userID);
        const pushEnabled = typeof await db.getSubscription(req.session.userID) != "undefined";

        const prefetches = [
            "/css/settings.css",
            "/js/settings.js",
        ];

        if (permissions.includes("admin")) {
            prefetches.push("/css/adminSettings.css");
            prefetches.push("/js/adminSettings.js");
        }

        return res.render('settings', {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: permissions, profilePic: await db.getPreference(req.session.userID, 'profilePic'),
            isSettingsPage: true, apiKey: await db.getUserData(req.session.userID, 'apiKey', isAdmin = permissions.includes("admin"), enabledPush = pushEnabled), preferences: await db.getPreferences(req.session.userID), prefetches: prefetches
        });
    });

    router.get('/archive', async (req, res) => {
        return res.send("Das Archiv kommt bald!");
    });

    router.get('/about', async (req, res) => {
        const permissions = await db.getUserPermissions(req.session.userID);
        return res.render('about', {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: permissions, profilePic: await db.getPreference(req.session.userID, 'profilePic')
        });
    });

    router.get('/noInternet', async (req, res) => {
        const permissions = await db.getUserPermissions(req.session.userID);
        return res.render('noInternet', {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: permissions, profilePic: await db.getPreference(req.session.userID, 'profilePic')
        });
    });

    return router;
}
