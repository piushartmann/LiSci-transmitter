const { Router } = require('express');
const sanitizeHtml = require('sanitize-html');
const router = Router();

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @returns {Router} The router instance.
 */

sanitizeHtmlAllowedTags = sanitizeHtml.defaults.allowedTags.concat(['img', 'embed', 'iframe']);

// TODO: Add Homework server Code here note: only for internal api things the /homework route is defined in the base.js file
module.exports = (db) => {

    router.get('/', (req, res) => {
        res.send("Internal Homework API");
    });

    return router;
};