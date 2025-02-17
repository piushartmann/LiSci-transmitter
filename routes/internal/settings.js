const { Router } = require('express');
const { MongoConnector } = require('../../server/MongoConnector');
const untis = require('../../server/untis');
const sanitizeHtml = require('sanitize-html');
const router = Router();

const config = require('../../config.json');

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @returns {Router} The router instance.
 */

sanitizeHtmlAllowedTags = sanitizeHtml.defaults.allowedTags.concat(['img', 'embed', 'iframe']);

module.exports = (db) => {

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

    router.post('/getPossiblePermissions', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = await db.getUserPermissions(req.session.userID);
        if (!permissions.includes("admin")) return res.status(403).send("You cannot get possible permissions");

        return res.status(200).send(config.permissions);
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

    router.post('/setPushPreference', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        const { type, value } = req.body;

        const valueBool = value == "true" || value == true;

        if (typeof value == "undefined") return res.status(400).send("Missing parameters");
        if (typeof type !== "string") return res.status(400).send("Invalid parameters");

        const allowedValues = ["newsNotifications", "postNotifications", "citationNotifications", "commentNotifications"];

        if (!allowedValues.includes(type)) return res.status(400).send("Invalid parameters");

        await db.setPreference(req.session.userID, type, valueBool);
        return res.status(200).send("Success");
    });

    router.post('/setLanguage', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        const { language } = req.body;

        if (typeof language == "undefined") return res.status(400).send("Missing parameters");
        if (typeof language !== "string") return res.status(400).send("Invalid parameters");

        await db.setPreference(req.session.userID, "language", language);
        return res.status(200).send("Success");
    });

    router.post('/setUntisClasses', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        const { classes } = req.body;

        classes.map((element) => {
            if (typeof element !== "string") return res.status(400).send("Invalid parameters");
            element = sanitizeHtml(element);
        });

        console.log(classes);

        if (typeof classes == "undefined") return res.status(400).send("Missing parameters");
        if (!Array.isArray(classes)) return res.status(400).send("Invalid parameters");

        await db.setPreference(req.session.userID, "untisClasses", classes);
        return res.status(200).send("Success");
    });

    /**
     * @name POST/internal/settings/getOwnTimetable
     * @description Set the own timetable as preference
     * @path {POST} /internal/settings/getOwnTimetable
     * @body {string} username - The username of the user.
     * @body {string} password - The password of the user.
     * @response {string} 200 - Success
     * @response {string} 400 - Invalid parameters
     * @response {string} 401 - Not logged in
     * @response {string} 500 - Internal server error
     * @example {
     *     "username": "username",
     *    "password": "password"
     * }
     */
    router.post('/getOwnTimetable', async (req, res) => {
        // get arguments from request
        const {username, password} = req.body;
        // check if arguments are valid
        if (!username || !password) return res.status(400).send("Invalid parameters");
        if (typeof username !== "string" || typeof password !== "string") return res.status(400).send("Invalid parameters");
        // get timetable from server/untis.js -> webuntis library
        const classes = await untis.getUntisClassesForUser(username, password);
        // check if classes are valid
        if (!classes) return res.status(500).send("Internal server error");
        if (!Array.isArray(classes)) return res.status(500).send("Internal server error");
        // if user is valid, set classes as preference
        const userID = req.session.userID;
        if (!userID) return res.status(401).send("Not logged in");
        await db.setPreference(userID, "untisClasses", classes);
        // return success
        return res.status(200).send("Success");
    });

    return router;
};