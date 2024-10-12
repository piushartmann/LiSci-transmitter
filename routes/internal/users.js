const { Router } = require('express');
const { MongoConnector } = require('../../MongoConnector');
const sanitizeHtml = require('sanitize-html');
const router = Router();

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @param {multer} s3Client - The s3 client instance.
 * @returns {Router} The router instance.
 */

sanitizeHtmlAllowedTags = sanitizeHtml.defaults.allowedTags.concat(['img', 'embed', 'iframe']);

module.exports = (db, s3Client) => {

    router.post('/pushSubscribe', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        const subscription = req.body;
        if (!subscription) return res.status(400).send("Missing parameters");
        if (typeof subscription !== "object") return res.status(400).send("Invalid parameters");
        if (!subscription.endpoint || !subscription.keys || !subscription.keys.auth || !subscription.keys.p256dh) return res.status(400).send("Invalid parameters");

        await db.setSubscription(req.session.userID, subscription);
        return res.status(200).send("Success");
    });

    router.post('/setProfilePictureColor', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        const { color } = req.body;

        const valid = /^#[0-9A-F]{6}$/i.test(color);

        if (!valid) return res.status(400).send("Invalid color");

        await db.setPreference(req.session.userID, 'profilePic', { "type": "default", "content": color });
        return res.status(200).send("Success");
    });

    router.get('/getAllUsers', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        if (!(req.session.permissions.includes("admin"))) return res.status(403).send("You cannot get this data");

        const users = await db.getAllUsers();
        return res.status(200).send(users);
    });

    return router;
};