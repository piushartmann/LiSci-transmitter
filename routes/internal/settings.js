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

    router.post('/updateUserData', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = await db.getUserPermissions(req.session.userID);
        if (!permissions.includes("admin")) return res.status(403).send("You cannot update a user");

        const { userID, username, password, permissions: postPermissions, preferences } = req.body;
        if (!userID) return res.status(400).send("Missing parameters");
        if (typeof userID !== "string") return res.status(400).send("Invalid parameters");

        if (username && typeof username !== "string") return res.status(400).send("Invalid parameters");
        if (password && typeof password !== "string") return res.status(400).send("Invalid parameters");
        if (postPermissions && typeof postPermissions !== "object") return res.status(400).send("Invalid parameters");
        if (preferences && typeof preferences !== "object") return res.status(400).send("Invalid parameters");

        await db.updateUserData(userID, username, password, postPermissions, preferences);
        return res.status(200).send("Success");
    });

    router.post('/createUser', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = await db.getUserPermissions(req.session.userID);
        if (!permissions.includes("admin")) return res.status(403).send("You cannot create a user");

        const { username, password } = req.body;
        
        if (!username || !password) return res.status(400).send("Missing parameters");
        if (typeof username !== "string" || typeof password !== "string") return res.status(400).send("Invalid parameters");

        await db.createUser(username, password, []);
        return res.status(200).send("Success");
    });

    return router;
};