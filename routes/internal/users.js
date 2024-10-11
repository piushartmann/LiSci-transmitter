const { Router } = require('express');
const multer = require("multer");
const multerS3 = require("multer-s3");
const { MongoConnector } = require('../../MongoConnector');
const sanitizeHtml = require('sanitize-html');
const router = Router();
const oneDay = 24 * 3600 * 1000

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @param {multer} s3Client - The s3 client instance.
 * @returns {Router} The router instance.
 */

sanitizeHtmlAllowedTags = sanitizeHtml.defaults.allowedTags.concat(['img', 'embed', 'iframe']);

module.exports = (db, s3Client) => {
    const config = require('../../config.json');
    const postsPageSize = config.postsPageSize;
    const citationsPageSize = config.citationsPageSize;

    router.get('/checkLogin', async (req, res) => { //for testing
        if (!req.session.userID) {
            return res.status(401).send("Not logged in");
        }
        return res.status(200).send("Logged in");
    });

    router.post('/pushSubscribe', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        const subscription = req.body;
        console.log(subscription);

        await db.setSubscription(req.session.userID, subscription);
        return res.status(200).send("Success");
    });

    router.post('/setProfilePictureColor', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        const { color } = req.body;
        req.session.profilePic = { "type": "default", "content": color };
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).send("Internal Server Error");
            }
        });

        await db.setPreference(req.session.userID, 'profilePic', { "type": "default", "content": color });
        return res.status(200).send("Success");
    });

    return router;
};