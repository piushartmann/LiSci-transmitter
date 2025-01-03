const { Router } = require('express');
const path = require('path');
const fs = require('fs');
const { MongoConnector } = require('../server/MongoConnector');
const { lang } = require('bing-translate-api');
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

        if (req.session.userID) {
            return res.render('index', {currentPage: currentPage, prank: prank, pages: pages});
        } else {
            return res.render('landing');
        }
    });

    router.get('/create', async (req, res) => {
        if (!req.session.userID) return res.render('notLoggedIn');
        const permissions = await db.getUserPermissions(req.session.userID);
        if (!permissions.includes("admin") && !permissions.includes("canPost")) return res.status(403).send("You cannot create a new Post");

        return res.render('create', {
            isCreatePage: true, canCreateNews: (permissions.includes("admin") || permissions.includes("writer"))
        });
    });

    router.get('/edit/:postID', async (req, res) => {
        if (!req.session.userID) return res.render('notLoggedIn');
        const permissions = await db.getUserPermissions(req.session.userID);
        if (!permissions.includes("admin") && !permissions.includes("canPost")) return res.status(403).send("You cannot create a new Post");

        const postID = req.params.postID;
        const post = await db.getPost(postID);

        if (!post) return res.status(404).send("Post not found");

        return res.render('create', {
            isCreatePage: true, post: post, canCreateNews: (permissions.includes("admin") || permissions.includes("writer"))
        });
    });

    router.get('/citations', async (req, res) => {
        if (!req.session.userID) return res.render('notLoggedIn');
        const permissions = await db.getUserPermissions(req.session.userID);
        const currentPage = req.query.page || 1;
        const pages = Math.ceil(await db.getCitationNumber() / citationsPageSize);
        if (!(permissions.includes("classmate"))) return res.status(403).send("You cannot view this page");

        return res.render('citations', {
            currentPage: currentPage, pages: pages
        });
    });

    router.get('/settings', async (req, res) => {
        if (!req.session.userID) return res.render('notLoggedIn');
        const permissions = await db.getUserPermissions(req.session.userID);
        const pushEnabled = typeof await db.getSubscription(req.session.userID) != "undefined";

        return res.render('settings', {
            isSettingsPage: true, apiKey: await db.getUserData(req.session.userID, 'apiKey'), isAdmin: permissions.includes("admin"), enabledPush: pushEnabled, possiblePermissions: config.permissions,
            languages: config.languages.manuallyTranslated.concat(config.languages.aiTranslated)
        });
    });

    router.get('/chat', async (req, res) => {
        if (!req.session.userID) return res.render('notLoggedIn');
        const permissions = await db.getUserPermissions(req.session.userID);
        if (!(permissions.includes("classmate"))) return res.status(403).send("You cannot view this page");

        return res.render('chat');
    });

    router.get('/airplay_test', async (req, res) => {
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        return res.render('airplay_test');
    });

    router.get('/about', async (req, res) => {
        return res.render('about');
    });

    router.get('/homework', async (req, res) => {
        if (!req.session.userID) return res.render('notLoggedIn');
        const permissions = await db.getUserPermissions(req.session.userID);
        if (!(permissions.includes("classmate"))) return res.status(403).send("You cannot view this page");
        
        return res.render('homework');
    });

    return router;
}
