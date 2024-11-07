const { Router } = require('express');
const path = require('path');
const fs = require('fs');
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
    const version = process.env.VERSION;
    const basePrefetches = [
        "/css/headers.css",
        "/css/colors.css",
        "/images/splashScreen.png",
        "/images/appIcon.jpg"
    ];

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
            res.locals.additionalPrefetches = basePrefetches.concat([

            ])
            return res.render('index', {
                loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: permissions, profilePic: await db.getPreference(req.session.userID, 'profilePic'), version: version,
                currentPage: currentPage, prank: prank, pages: pages
            });
        } else {
            res.locals.additionalPrefetches = basePrefetches.concat([

            ])
            return res.render('loggedOut', {
                loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: permissions, profilePic: await db.getPreference(req.session.userID, 'profilePic'), version: version,
            });
        }

    });

    router.get('/create', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = await db.getUserPermissions(req.session.userID);
        if (!permissions.includes("admin") && !permissions.includes("canPost")) return res.status(403).send("You cannot create a new Post");
        
        res.locals.additionalPrefetches = basePrefetches.concat([
                
        ])
        return res.render('create', {
            loggedIn: true, username: req.session.username, usertype: permissions, profilePic: await db.getPreference(req.session.userID, 'profilePic'), version: version,
            isCreatePage: true, canCreateNews: (permissions.includes("admin") || permissions.includes("writer"))
        });
    });

    router.get('/edit/:postID', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = await db.getUserPermissions(req.session.userID);
        if (!permissions.includes("admin") && !permissions.includes("canPost")) return res.status(403).send("You cannot create a new Post");

        const postID = req.params.postID;
        const post = await db.getPost(postID);
        
        res.locals.additionalPrefetches = basePrefetches.concat([
                
        ])
        return res.render('create', {
            loggedIn: true, username: req.session.username, usertype: permissions, profilePic: await db.getPreference(req.session.userID, 'profilePic'), version: version,
            isCreatePage: true, post: post, canCreateNews: (permissions.includes("admin") || permissions.includes("writer"))
        });
    });

    router.get('/post/:id', async (req, res) => {
        const permissions = await db.getUserPermissions(req.session.userID);

        res.locals.additionalPrefetches = basePrefetches.concat([
                
        ])
        return res.render('postFullscreen', {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: permissions || [], profilePic: await db.getPreference(req.session.userID, 'profilePic'), version: version,
            postID: req.params.id
        });
    });

    router.get('/citations', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = await db.getUserPermissions(req.session.userID);
        const currentPage = req.query.page || 1;
        const pages = Math.ceil(await db.getCitationNumber() / citationsPageSize);
        if (!(permissions.includes("classmate"))) return res.status(403).send("You cannot view this page");

        res.locals.additionalPrefetches = basePrefetches.concat([
                
        ])
        return res.render('citations', {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: permissions, profilePic: await db.getPreference(req.session.userID, 'profilePic'), version: version,
            currentPage: currentPage, pages: pages

        });
    });

    router.get('/settings', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = await db.getUserPermissions(req.session.userID);
        const pushEnabled = typeof await db.getSubscription(req.session.userID) != "undefined";

        res.locals.additionalPrefetches = basePrefetches.concat([
                
        ])
        return res.render('settings', {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: permissions, profilePic: await db.getPreference(req.session.userID, 'profilePic'), version: version,
            isSettingsPage: true, apiKey: await db.getUserData(req.session.userID, 'apiKey', isAdmin = permissions.includes("admin"), enabledPush = pushEnabled), preferences: await db.getPreferences(req.session.userID)
        });
    });

    router.get('/archive', async (req, res) => {
        return res.send("Das Archiv kommt bald!");
    });

    router.get('/about', async (req, res) => {
        const permissions = await db.getUserPermissions(req.session.userID);

        res.locals.additionalPrefetches = basePrefetches.concat([
                
        ])
        return res.render('about', {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: permissions, profilePic: await db.getPreference(req.session.userID, 'profilePic'), version: version
        });
    });

    router.get('/noInternet', async (req, res) => {
        const permissions = await db.getUserPermissions(req.session.userID);

        res.locals.additionalPrefetches = basePrefetches.concat([
                
        ])
        return res.render('noInternet', {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: permissions, profilePic: await db.getPreference(req.session.userID, 'profilePic'), version: version
        });
    });

    return router;
}
