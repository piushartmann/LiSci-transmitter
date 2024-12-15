const { Router } = require('express');
const path = require('path');
const fs = require('fs');
const { MongoConnector } = require('../server/MongoConnector');
const { lang } = require('bing-translate-api');
const router = Router();
const helperModule = require('./helper')

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @returns {Router} The router instance.
 */

module.exports = (db) => {
    const config = require('../config.json');
    const postsPageSize = config.postsPageSize;
    const citationsPageSize = config.citationsPageSize;
    const { renderView } = helperModule(db);

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
            return await renderView(req, res, 'index', {
                currentPage: currentPage, prank: prank, pages: pages
            },
                [
                    "/icons/like-locked.svg",
                ]);
        } else {
            return await renderView(req, res, 'landing');
        }
    });

    router.get('/create', async (req, res) => {
        if (!req.session.userID) return await renderView(req, res, 'notLoggedIn');
        const permissions = await db.getUserPermissions(req.session.userID);
        if (!permissions.includes("admin") && !permissions.includes("canPost")) return res.status(403).send("You cannot create a new Post");

        return await renderView(req, res, 'create', {
            isCreatePage: true, canCreateNews: (permissions.includes("admin") || permissions.includes("writer"))
        },
            [
                "/icons/add-section.svg",
            ]);
    });

    router.get('/edit/:postID', async (req, res) => {
        if (!req.session.userID) return await renderView(req, res, 'notLoggedIn');
        const permissions = await db.getUserPermissions(req.session.userID);
        if (!permissions.includes("admin") && !permissions.includes("canPost")) return res.status(403).send("You cannot create a new Post");

        const postID = req.params.postID;
        const post = await db.getPost(postID);

        if (!post) return res.status(404).send("Post not found");

        return await renderView(req, res, 'create', {
            isCreatePage: true, post: post, canCreateNews: (permissions.includes("admin") || permissions.includes("writer"))
        });
    });

    router.get('/citations', async (req, res) => {
        if (!req.session.userID) return await renderView(req, res, 'notLoggedIn');
        const permissions = await db.getUserPermissions(req.session.userID);
        const currentPage = req.query.page || 1;
        const pages = Math.ceil(await db.getCitationNumber() / citationsPageSize);
        if (!(permissions.includes("classmate"))) return res.status(403).send("You cannot view this page");

        return await renderView(req, res, 'citations', {
            currentPage: currentPage, pages: pages
        },
            [
                "/icons/add-section.svg",
            ]);
    });

    router.get('/settings', async (req, res) => {
        if (!req.session.userID) return await renderView(req, res, 'notLoggedIn');
        const permissions = await db.getUserPermissions(req.session.userID);
        const pushEnabled = typeof await db.getSubscription(req.session.userID) != "undefined";

        return await renderView(req, res, 'settings', {
            isSettingsPage: true, apiKey: await db.getUserData(req.session.userID, 'apiKey'), isAdmin: permissions.includes("admin"), enabledPush: pushEnabled, possiblePermissions: config.permissions,
            languages: config.languages.manuallyTranslated.concat(config.languages.aiTranslated)
        });
    });

    router.get('/chat', async (req, res) => {
        if (!req.session.userID) return await renderView(req, res, 'notLoggedIn');

        return await renderView(req, res, 'chat');
    });

    router.get('/about', async (req, res) => {
        return await renderView(req, res, 'about');
    });

    return router;
}
